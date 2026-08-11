import type { ExpertConsensusEntry } from "@/lib/fantasypros/weeklyConsensus";
import { getSeasonRedraftRankByKey, type SeasonRedraftEntry } from "@/lib/fantasypros/seasonProjections";
import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { REPLACEMENT_PER_GAME } from "@/lib/recommendation/config";
import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { toSdioTeam } from "@/lib/recommendation/restOfSeason";
import { getRecentWindow } from "@/lib/recommendation/recentWindow";
import { scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import type { DataQuality, PlayerScoreBreakdown } from "@/lib/recommendation/types";
import { getFantasyDefenseByWeek } from "@/lib/sportsdata/defense";
import { getAllDstPlayers } from "@/lib/sportsdata/defenseTeams";
import { getActiveExtendedPlayers, getActivePlayers } from "@/lib/sportsdata/players";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getPlayerSeasonStats } from "@/lib/sportsdata/seasonStats";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import { isSkillPosition, type ExtendedPosition, type Player, type ScoringFormat } from "@/lib/sportsdata/types";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";

export interface LegitRankingEntry extends PlayerScoreBreakdown {
  /** 1 = best-projected player at this position, after blending in FantasyPros' season-long consensus (see computeLegitScores). */
  positionRank: number;
  /** 1-100 — a blend of this week's engine snapshot and FantasyPros' season-long redraft consensus, normalized within this position's own pool. See computeLegitScores for the method and why. */
  legitScore: number;
  /** FantasyPros' current season-long consensus rank at this position, or null if this player wasn't found in their redraft rankings (e.g. a very deep bench player FantasyPros doesn't publish a rank for). Purely informational — already folded into legitScore above. */
  fantasyProsPositionRank: number | null;
}

// A player needs at least this many played games in the recent-form
// window to be worth ranking at all — the same kind of "real, relevant
// role" gate rankCandidates.ts's waiver scan uses (MIN_RECENT_GAMES),
// just more permissive (1 vs. 2) since rankings are meant to cover more
// depth than a waiver-gap scan, not just startable-tier players. This
// keeps the pool to players who've actually taken the field recently —
// rosters otherwise carry a lot of camp-body/IR dead weight that would
// both slow the scan down and clutter the list with meaningless entries.
const MIN_RECENT_GAMES = 1;

// Computed rankings are expensive (a full engine pass over every
// rankable player at a position), so the RESULT itself is cached, not
// just the underlying source data every other route already caches —
// a new pattern for this app, but the same in-process TTL-Map shape as
// every other cache here (sportsdata/client.ts, nflverse/client.ts,
// sleeper/client.ts). 30 minutes: long enough that switching between
// position tabs or reloading the page doesn't recompute from scratch,
// short enough to pick up a mid-week injury/status change reasonably
// promptly.
const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { data: LegitRankingEntry[]; expiresAt: number }>();

// How many players to actually show per position — a real rankings page
// shouldn't run all the way down to replacement-level noise. Only the
// four skill positions are capped (by request); D/ST (32 teams) and K
// (~30 active) are already small, naturally-bounded pools with no
// equivalent "how deep is worth showing" question. Applied AFTER
// computeLegitScores, not before: the Legit Score itself still reflects
// each player's standing against the FULL rankable pool (so, e.g., the
// 10th-ranked QB's score isn't artificially compressed toward 1 just
// because he's last in a truncated top-10 list) — this only trims which
// rows get returned, not what "100" or "1" means.
const RANKING_LIMIT: Partial<Record<ExtendedPosition, number>> = {
  QB: 10,
  RB: 20,
  WR: 25,
  TE: 10,
};

/**
 * The only positions Legit Rankings actually covers — D/ST and K were
 * dropped by request (their "this week vs. season rank" streaming shape
 * never fit this tool's "who's actually good" framing as naturally as
 * the four skill positions do). Exported so both the API route and the
 * UI's position tabs read from one source of truth rather than each
 * hand-maintaining their own list.
 */
export const RANKABLE_POSITIONS: readonly ExtendedPosition[] = ["QB", "RB", "WR", "TE"];

function countPlayedGames(rows: { PlayerID: number; Played: number }[][]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const weekRows of rows) {
    for (const row of weekRows) {
      if (row.Played !== 1) continue;
      counts.set(row.PlayerID, (counts.get(row.PlayerID) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Pool selection + pre-warming, one position at a time (see
 * getLegitRankingsForPosition below for why this isn't done for every
 * position in one request). Mirrors rankExtendedWaiverCandidates.ts's
 * own pre-warm discipline exactly: fetch every week's data ONCE,
 * sequenced ahead of the per-player fan-out, rather than letting
 * dozens-to-hundreds of concurrent scoreExtendedPlayer calls race each
 * other on the same cold cache (the exact stampede bug item 27/62
 * already found and fixed for the backtest pipeline and the waiver
 * D/ST-and-K scan).
 */
async function getEligiblePlayerIds(position: ExtendedPosition, context: SeasonContext): Promise<number[]> {
  if (position === "DST") {
    const allWeeks = Array.from({ length: context.lastCompletedWeek }, (_, i) => i + 1);
    await Promise.all(allWeeks.map((w) => getFantasyDefenseByWeek(context.lastCompletedApiSeason, w)));
    await Promise.all(allWeeks.map((w) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, w)));
    const dstPlayers = await getAllDstPlayers();
    return dstPlayers.map((p) => p.PlayerID);
  }

  if (position === "K") {
    // K's own comparison input needs every week for its season average
    // (see scoreKicker.ts), but "worth ranking" is still judged on the
    // recent-form window alone — fetching allWeeks first pre-warms the
    // cache either way, so the recentWeeks fetch just below is a free
    // cache hit, not a second network round-trip.
    const allWeeks = Array.from({ length: context.lastCompletedWeek }, (_, i) => i + 1);
    await Promise.all(allWeeks.map((w) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, w)));
    const allExtended = await getActiveExtendedPlayers();
    const kickers = allExtended.filter((p) => p.Position === "K");
    return filterByRecentGames(kickers, context);
  }

  // Skill positions: pre-warm the season-aggregate endpoint once (every
  // buildComparisonInput call reads it via getPlayerSeasonStat) before
  // the per-player fan-out, same reasoning as above.
  await getPlayerSeasonStats(context.lastCompletedSeason);
  const active = await getActivePlayers();
  const atPosition = active.filter((p) => p.Position === position);
  return filterByRecentGames(atPosition, context);
}

async function filterByRecentGames(players: Player[], context: SeasonContext): Promise<number[]> {
  // Use the same recent-form window the scoring path does (getRecentWindow):
  // in the offseason that's a wider lookback, so a player who last played
  // 5-8 weeks before season end (an injury they've since recovered from)
  // isn't dropped from the rankings entirely for having no game in the
  // narrow last-4-weeks window. The limit doesn't matter for a >= 1-game
  // eligibility count, so only the weeks are widened.
  const { weeks } = getRecentWindow(context);
  const weeklyRows = await Promise.all(
    weeks.map((w) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, w))
  );
  const counts = countPlayedGames(weeklyRows);
  return players.filter((p) => (counts.get(p.PlayerID) ?? 0) >= MIN_RECENT_GAMES).map((p) => p.PlayerID);
}

// How much the engine's OWN this-week snapshot counts toward the blend,
// vs. FantasyPros' season-long redraft consensus — split by dataQuality
// rather than one flat weight, since the real problem this blend exists
// to fix is specifically small-sample noise: a player with only 1-2
// games in the engine's recent-form window (dataQuality "limited"/
// "insufficient") can swing wildly on a single tough matchup or cold
// game, while FantasyPros' preseason consensus reflects a full season's
// worth of scouting/opinion and doesn't have that problem. When the
// engine DOES have a full recent sample, it's trusted more heavily —
// it's this app's own validated, backtested signal — but even then
// FantasyPros still gets real weight, since a season-long expectation is
// inherently more stable than any single-week snapshot regardless of
// sample size. Not independently backtested (there's no "was this
// blend right" ground truth the way pick accuracy has one) — a
// reasoned, transparent default, not a tuned weight.
//
// limited/insufficient were originally both 0.4 — re-tuned lower after a
// real case (Lamar Jackson, "limited") showed 0.4 still wasn't enough:
// his only 3 usable recent games included one where Baltimore clearly
// rested/limited him in a lost season (12 and 10 pass attempts across
// two of them, vs. his normal 20-35), tanking the engine's own snapshot
// even though FantasyPros still had him at a real, well-earned QB2 —
// confirmed directly against SportsDataIO's real weekly stats before
// concluding this wasn't a data or engine bug. A thin sample is
// EXACTLY the scenario where a single meaningless/limited-role game can
// dominate the engine's recent-form window, so "insufficient" (even
// less data than "limited") now trusts FantasyPros' stable consensus
// more than "limited" does, rather than treating them the same.
const ENGINE_WEIGHT: Record<DataQuality, number> = {
  full: 0.65,
  limited: 0.15,
  insufficient: 0.05,
};

// FantasyPros' redraft files rank WAY more players than are ever
// "relevant" — e.g. redraft-wr has 239 rows, most of them deep-bench
// names nobody would start. Normalizing a rank against that FULL pool
// (as an earlier version of this function did) badly inflates mediocre
// ranks: WR46 normalized against a 239-deep scale lands near 80/100,
// reading as "elite" when it's really just "startable WR3/flex" — which
// let a "limited"-data bench player with a so-so FP rank (but a hot
// recent game or two) outscore a "full"-data star having a merely-good
// stretch, a real case caught live (Justin Jefferson, real FP WR6,
// initially ranked BELOW Quentin Johnston, real FP WR46, once Johnston's
// mediocre rank got inflated by this same distortion). Capping the
// normalization denominator to roughly "how deep does a real rankings
// conversation go" fixes this at the source, rather than further
// tweaking ENGINE_WEIGHT to compensate for a scale that was wrong to
// begin with. Chosen as roughly 3x this file's own RANKING_LIMIT per
// position — generous enough to still differentiate real WR2/3/4-tier
// talent, not so deep that a mediocre rank reads as good.
const FP_NORMALIZATION_CAP: Partial<Record<ExtendedPosition, number>> = {
  QB: 30,
  RB: 60,
  WR: 75,
  TE: 30,
};

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 100;
  return Math.min(100, Math.max(1, 1 + 99 * ((value - min) / (max - min))));
}

function fantasyProsKeyFor(b: PlayerScoreBreakdown, position: ExtendedPosition): string | null {
  if (position === "DST") return b.team ? toSdioTeam(b.team) : null;
  return normalizePlayerName(b.displayName);
}

/**
 * Blends the engine's this-week snapshot with FantasyPros' season-long
 * redraft consensus, each independently normalized to [1, 100] within
 * its own pool, then combined per-player at a dataQuality-dependent
 * weight (see ENGINE_WEIGHT above) — this is what actually fixes cases
 * like a normally-elite QB who happened to play just one noisy recent
 * game: the engine's own snapshot alone would rank him far too low, but
 * FantasyPros' stable season-long view pulls him back to a realistic
 * spot. A player with no FantasyPros match at all (a very deep bench
 * name FantasyPros doesn't publish) falls back to the engine-only score,
 * same honest degrade as every other optional signal in this app.
 *
 * Both pools are min-maxed independently, NOT percentile/rank-based —
 * same reasoning as the original single-signal version of this function:
 * two players with nearly identical values land close together, rather
 * than being spread apart just because they're 3 ranks apart.
 */
function computeLegitScores(
  breakdowns: PlayerScoreBreakdown[],
  fpByKey: Map<string, SeasonRedraftEntry>,
  position: ExtendedPosition
): LegitRankingEntry[] {
  const ranked = breakdowns
    // `finalScore` has no floor for very low-data players (a known,
    // still-open engine gap — see CLAUDE.md's Projection-accuracy/
    // calibration items) and can come back meaningfully negative for a
    // deep-bench player with a near-empty stat line. That's tolerable
    // for every OTHER consumer of this engine, since they only ever use
    // it in a relative pairwise comparison — but a public "rankings"
    // list displays the raw number to everyone, so a real player is
    // never shown a nonsensical "-36 projected points." A negative
    // projection also isn't a meaningful player to rank publicly at
    // all, so this excludes them from the pool entirely rather than
    // clamping the displayed number, which would misrepresent the
    // engine's own (real, if miscalibrated) output.
    .filter((b): b is PlayerScoreBreakdown & { finalScore: number } => b.finalScore != null && b.finalScore >= 0);

  if (ranked.length === 0) return [];

  const engineValues = ranked.map((b) => b.finalScore);
  const engineMin = Math.min(...engineValues);
  const engineMax = Math.max(...engineValues);

  const fpPositionRanks = [...fpByKey.values()].map((v) => v.positionRank);
  const fpBestRank = fpPositionRanks.length > 0 ? Math.min(...fpPositionRanks) : 1;
  const rawFpWorstRank = fpPositionRanks.length > 0 ? Math.max(...fpPositionRanks) : 1;
  const fpWorstRank = Math.min(rawFpWorstRank, FP_NORMALIZATION_CAP[position] ?? rawFpWorstRank);

  const withBlend = ranked.map((b) => {
    const engineNorm = normalize(b.finalScore, engineMin, engineMax);
    const fpKey = fantasyProsKeyFor(b, position);
    const fpEntry = fpKey ? fpByKey.get(fpKey) : undefined;

    if (!fpEntry) {
      return { breakdown: b, blended: engineNorm, fantasyProsPositionRank: null as number | null };
    }

    // Inverted: rank 1 (best) -> 100, the (capped) worst rank -> 1. A
    // real rank deeper than the cap (e.g. WR120) just clamps to 1 via
    // normalize()'s own clamping, rather than going negative.
    const fpNorm = 101 - normalize(fpEntry.positionRank, fpBestRank, fpWorstRank);
    const engineWeight = ENGINE_WEIGHT[b.dataQuality];
    const blended = engineWeight * engineNorm + (1 - engineWeight) * fpNorm;
    return { breakdown: b, blended, fantasyProsPositionRank: fpEntry.positionRank };
  });

  withBlend.sort((a, b) => b.blended - a.blended);

  return withBlend.map((w, i) => ({
    ...w.breakdown,
    positionRank: i + 1,
    legitScore: Math.round(Math.min(100, Math.max(1, w.blended))),
    fantasyProsPositionRank: w.fantasyProsPositionRank,
  }));
}

/**
 * The Legit Rankings tool's core: every rankable player at ONE position,
 * scored through the exact same engine (scoreExtendedPlayer) every other
 * live tool uses — no new prediction model, just a new presentation of
 * already-validated output — ranked and converted to a 0-100 Legit Score.
 *
 * Deliberately one position per call/cache-entry, not a single
 * all-positions request: ranking every relevant player across all six
 * positions in one request would mean several hundred full-engine scoring
 * calls before returning anything, and a real user only looks at one
 * position tab at a time anyway. Bounding cost to one position also
 * keeps this in line with every other live route's maxDuration budget.
 *
 * Returns the FULL ranked list, unbounded by RANKING_LIMIT — that cap is
 * a display concern for the single-position tabs (applied by
 * getLegitRankingsForPosition below), not something the cached
 * computation itself should bake in, since the "Top 100" view needs the
 * full pool from every position to pick its own top 100 across all of
 * them, not just whatever a single position's own display cap left over.
 */
async function getFullLegitRankingsForPosition(
  position: ExtendedPosition,
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>,
  expertConsensusByNormalizedName: Map<string, ExpertConsensusEntry>
): Promise<LegitRankingEntry[]> {
  const cacheKey = `${position}:${context.lastCompletedSeason}:${context.lastCompletedWeek}:${format}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const [playerIds, fpByKey] = await Promise.all([
    getEligiblePlayerIds(position, context),
    getSeasonRedraftRankByKey(position),
  ]);

  const breakdowns = await Promise.all(
    playerIds.map((id) =>
      scoreExtendedPlayer(
        id,
        context,
        format,
        positionDefenseTable,
        nflversePlayerWeekTable,
        remainingOpponentsByTeam,
        teamWeatherByTeamWeek,
        impliedTotalsByTeamWeek,
        expertConsensusByNormalizedName
      )
    )
  );

  const ranked = computeLegitScores(breakdowns, fpByKey, position);
  cache.set(cacheKey, { data: ranked, expiresAt: Date.now() + CACHE_TTL_MS });
  return ranked;
}

/** The single-position tab's own view: getFullLegitRankingsForPosition, trimmed to RANKING_LIMIT. */
export async function getLegitRankingsForPosition(
  position: ExtendedPosition,
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>,
  expertConsensusByNormalizedName: Map<string, ExpertConsensusEntry> = new Map()
): Promise<LegitRankingEntry[]> {
  const ranked = await getFullLegitRankingsForPosition(
    position,
    context,
    format,
    positionDefenseTable,
    nflversePlayerWeekTable,
    remainingOpponentsByTeam,
    teamWeatherByTeamWeek,
    impliedTotalsByTeamWeek,
    expertConsensusByNormalizedName
  );
  const limit = RANKING_LIMIT[position];
  return limit != null ? ranked.slice(0, limit) : ranked;
}

/** The combined "Top 100" view shows regardless of the four positions' own individual display caps. */
const TOP_100_LIMIT = 100;

/**
 * Cross-position VALUE for the Top 100 sort: the engine's projection minus
 * that player's position replacement level (REPLACEMENT_PER_GAME) — i.e.
 * value over replacement (VORP), the standard way to compare players across
 * positions. `legitScore` alone CANNOT rank across positions: it's
 * normalized WITHIN each position (best TE = 100, exactly like best WR =
 * 100), so sorting the combined list by it puts an elite TE (Trey McBride)
 * right next to an elite WR despite a far lower absolute projection — the
 * thing that read as "why is McBride so high." VOR fixes that, and also
 * correctly drops QBs down the board (elite QB replacement is high in a
 * 1-QB league, so even a top QB nets little value over a streamer — which
 * matches FantasyPros' own overall/redraft board). Skill positions only,
 * which is all RANKABLE_POSITIONS ever contains.
 */
function valueOverReplacement(entry: LegitRankingEntry, format: ScoringFormat): number {
  const projection = entry.finalScore ?? 0;
  const pos = entry.position;
  if (pos != null && isSkillPosition(pos)) return projection - REPLACEMENT_PER_GAME[format][pos];
  return projection;
}

/**
 * The "Top 100" view: every position's FULL (uncapped) ranked list,
 * merged and re-sorted by VALUE OVER REPLACEMENT (see valueOverReplacement)
 * — NOT by legitScore, which is position-relative and can't be compared
 * across positions — then trimmed to the 100 most valuable players. No new
 * scoring pass, just a re-combination of getFullLegitRankingsForPosition's
 * own cached output for each of the four rankable positions. Deliberately
 * reads the uncapped list, not getLegitRankingsForPosition's own tab-
 * display-capped one (QB10/RB20/WR25/TE10, ~65 total) — those caps exist so
 * a single position's tab doesn't run to replacement-level noise, not
 * because there are only 65 players worth showing across all positions.
 *
 * The displayed `legitScore` is RE-NORMALIZED here to the Top 100's own VOR
 * spread (1..100 across the shown players), so the number the UI shows moves
 * monotonically with this value ordering and the gold "elite" tier
 * highlights the genuinely-top-overall players — rather than showing each
 * position's own 1-100 legitScore, which would look scrambled (a TE's 100
 * sitting at rank 9). A player can therefore legitimately show a different
 * score here than on their position tab: the tab answers "how good at your
 * position" (McBride = 100, best TE), the Top 100 answers "how valuable
 * overall" (McBride ~mid-pack). `positionRank` is reassigned to this
 * combined list's own 1..100 order.
 */
export async function getLegitRankingsOverall(
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>,
  expertConsensusByNormalizedName: Map<string, ExpertConsensusEntry> = new Map()
): Promise<LegitRankingEntry[]> {
  const perPosition = await Promise.all(
    RANKABLE_POSITIONS.map((position) =>
      getFullLegitRankingsForPosition(
        position,
        context,
        format,
        positionDefenseTable,
        nflversePlayerWeekTable,
        remainingOpponentsByTeam,
        teamWeatherByTeamWeek,
        impliedTotalsByTeamWeek,
        expertConsensusByNormalizedName
      )
    )
  );

  const withVor = perPosition.flat().map((entry) => ({ entry, vor: valueOverReplacement(entry, format) }));

  // Normalize against the FULL rankable pool's VOR range, NOT the top-100
  // slice's own range: a top-100 player is well above replacement, so
  // scaling only across the top-100 would force the 100th-best player in the
  // NFL to a score of 1 (absurd — they're a solid starter). Anchoring to the
  // whole pool keeps every top-100 player in a high band and only deep
  // waiver-tier players (never shown here) approach 1.
  const allVor = withVor.map((t) => t.vor);
  const minVor = Math.min(...allVor);
  const maxVor = Math.max(...allVor);

  return withVor
    .sort((a, b) => b.vor - a.vor)
    .slice(0, TOP_100_LIMIT)
    .map((t, i) => ({
      ...t.entry,
      positionRank: i + 1,
      legitScore: Math.round(normalize(t.vor, minVor, maxVor)),
    }));
}
