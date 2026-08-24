import { optimizeLineup } from "@/lib/lineup/optimizeLineup";
import { SLOT_ELIGIBILITY, type SlotType } from "@/lib/lineup/rosterSlots";
import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectExtendedRestOfSeason, scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import type { SeasonProjectionMap } from "@/lib/recommendation/restOfSeason";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import type { OtherLeagueTeam } from "@/lib/sleeper/resolveRoster";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ExtendedPosition, ScoringFormat } from "@/lib/sportsdata/types";
import { evaluateTrade, toTradePlayerResult, type TradeEvaluation, type TradePlayerResult } from "./evaluateTrade";

export interface LeagueTradeSuggestion {
  otherTeamName: string;
  evaluation: TradeEvaluation;
}

export interface LeagueTradeResult {
  suggestion: LeagueTradeSuggestion | null;
  /** Set (and suggestion null) whenever no trade is surfaced — an honest reason, never a silent empty result, same discipline as WaiverResult's "no standout gaps" message. */
  reason: string | null;
}

// How many of the closest-by-value upgrade candidates to actually check
// for mutual fairness before giving up — bounds the number of extra
// scoreExtendedPlayer calls this makes on top of the initial candidate
// scan, rather than checking every candidate found. A bit more generous
// than a single-candidate check since only "fair" (roughly matched
// value) trades are ever proposed now, a narrower bar than "any upgrade."
const MAX_CANDIDATES_TO_CHECK = 8;

/**
 * Finds a single, real, two-sided 1-for-1 trade: your best bench player
 * (a genuine surplus — outscoring itself relative to what your own
 * lineup already starts) for another real team's player at whichever
 * position your own lineup needs most. Deliberately Sleeper-only — this
 * needs real per-team roster data (who else is on which team), which
 * only exists for a connected league; there's no equivalent for a
 * manually-built roster.
 *
 * Two real checks gate a suggestion, not just "would this help you":
 * 1. It has to be a genuine upgrade over what you're currently missing
 *    (an empty slot) or already starting (your weakest starter) at that
 *    position, by rest-of-season projected value — the same currency
 *    the real Trade Analyzer already grades every trade in.
 * 2. It has to plausibly interest the OTHER team too: your surplus
 *    player's own position has to be a real, comparatively weak spot on
 *    their roster (checked directly against their own players there),
 *    not just something you're happy to be rid of. A trade this app
 *    would only recommend one side of isn't a real suggestion.
 *
 * Bounded cost, matching this app's existing "cheap scan, then full
 * engine for the few candidates that matter" discipline (see
 * rankCandidates.ts/buildWaiverReport.ts): only players who already
 * share the needed position are ever scored via the full engine, and
 * the mutual-fairness check only runs for the top few candidates by
 * projected value, not the whole league.
 */
export async function suggestLeagueTrade(
  yourPlayerIds: number[],
  otherTeams: OtherLeagueTeam[],
  slotCounts: Record<SlotType, number>,
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>,
  projectedPointsByPlayerId: Map<number, number> = new Map(),
  priorSeasonPprAvgByNormalizedName: Map<string, number> = new Map(),
  /** Season-long projections blended into rest-of-season value; omit for pure extrapolation. */
  seasonProjections: SeasonProjectionMap = new Map()
): Promise<LeagueTradeResult> {
  if (yourPlayerIds.length === 0) return { suggestion: null, reason: "Your roster is empty." };
  if (otherTeams.length === 0) {
    return { suggestion: null, reason: "No other teams with a resolvable roster were found in this league." };
  }

  async function scoreFor(playerId: number): Promise<PlayerScoreBreakdown> {
    return scoreExtendedPlayer(
      playerId,
      context,
      format,
      positionDefenseTable,
      nflversePlayerWeekTable,
      remainingOpponentsByTeam,
      teamWeatherByTeamWeek,
      impliedTotalsByTeamWeek,
      projectedPointsByPlayerId,
      priorSeasonPprAvgByNormalizedName
    );
  }

  function toResult(breakdown: PlayerScoreBreakdown): TradePlayerResult {
    const projection = projectExtendedRestOfSeason(
      breakdown,
      remainingOpponentsByTeam,
      impliedTotalsByTeamWeek,
      positionDefenseTable,
      seasonProjections
    );
    return toTradePlayerResult(breakdown, projection);
  }

  const yourBreakdowns = await Promise.all(yourPlayerIds.map(scoreFor));
  const { slots, bench } = optimizeLineup(yourBreakdowns, slotCounts);

  // Need: prefer an empty slot's eligible position(s) — a real gap beats
  // any filled starter, however weak — else the filled starter with the
  // lowest rest-of-season projection.
  const emptySlot = slots.find((s) => s.breakdown == null);
  let needPositions: readonly ExtendedPosition[];
  let baselineValue = -Infinity;

  if (emptySlot) {
    needPositions = SLOT_ELIGIBILITY[emptySlot.slotType];
  } else {
    const starterResults = slots
      .filter((s): s is typeof s & { breakdown: PlayerScoreBreakdown } => s.breakdown != null)
      .map((s) => toResult(s.breakdown));
    if (starterResults.length === 0) {
      return { suggestion: null, reason: "Not enough roster data to figure out what your lineup needs." };
    }
    const weakest = starterResults.reduce((min, r) =>
      (r.restOfSeasonTotal ?? Infinity) < (min.restOfSeasonTotal ?? Infinity) ? r : min
    );
    if (!weakest.position) {
      return { suggestion: null, reason: "Not enough roster data to figure out what your lineup needs." };
    }
    needPositions = [weakest.position as ExtendedPosition];
    baselineValue = weakest.restOfSeasonTotal ?? -Infinity;
  }

  // Surplus: your own best bench player by rest-of-season projection —
  // the real trade chip, since it's not currently in your starting lineup.
  if (bench.length === 0) {
    return { suggestion: null, reason: "Your whole roster is already starting — no bench surplus to trade from." };
  }
  const benchResults = bench.map(toResult).filter((r) => r.restOfSeasonTotal != null && r.position != null);
  if (benchResults.length === 0) {
    return { suggestion: null, reason: "Not enough data on your bench players to value a trade right now." };
  }
  const surplus = benchResults.reduce((max, r) => (r.restOfSeasonTotal! > (max.restOfSeasonTotal ?? -Infinity) ? r : max));

  // Cheap scan first: which other teams even have a player at the
  // position you need, before scoring anyone.
  const candidates: { team: OtherLeagueTeam; playerId: number }[] = [];
  for (const team of otherTeams) {
    for (const player of team.players) {
      if ((needPositions as readonly string[]).includes(player.position)) {
        candidates.push({ team, playerId: player.playerId });
      }
    }
  }
  if (candidates.length === 0) {
    return { suggestion: null, reason: "No other team in your league has a player at the position you need most right now." };
  }

  const scoredCandidates = await Promise.all(
    candidates.map(async (c) => ({ team: c.team, result: toResult(await scoreFor(c.playerId)) }))
  );

  // Real upgrades over your current baseline, sorted by CLOSENESS to your
  // surplus player's own value rather than by raw size — since a fair
  // trade (the only kind this function ever proposes, see below) needs
  // roughly-matched value, the candidates most likely to clear that bar
  // are the ones nearest your surplus's projection, not the biggest
  // upgrades available (which would almost always grade "good," i.e.
  // lopsided, for you instead).
  const surplusValue = surplus.restOfSeasonTotal ?? 0;
  const upgrades = scoredCandidates
    .filter((c) => (c.result.restOfSeasonTotal ?? -Infinity) > baselineValue)
    .sort(
      (a, b) =>
        Math.abs((a.result.restOfSeasonTotal ?? Infinity) - surplusValue) -
        Math.abs((b.result.restOfSeasonTotal ?? Infinity) - surplusValue)
    );

  if (upgrades.length === 0) {
    return { suggestion: null, reason: "No other team's roster has a real upgrade at your weakest spot right now." };
  }

  // Check the best few candidates in order for a REAL two-sided match —
  // two separate gates, both required:
  //
  // 1. Positional need: does the OTHER team have a genuine, comparatively
  //    weak spot at your surplus player's position? If they already have
  //    someone there who's at least as good, this team isn't a real
  //    match — move to the next candidate.
  // 2. Value fairness: evaluateTrade's own verdict has to land as "fair"
  //    (roughly even rest-of-season value), not "good" for you. This
  //    isn't a weaker bar than "good" — it's the ONLY bar that can ever
  //    be mutually sensible under one shared valuation model. Since both
  //    sides are graded from the same projections, a trade that's "good"
  //    for you is mathematically always "bad" for them by the identical
  //    margin (their netValue is exactly the negative of yours) — a real
  //    early build of this surfaced exactly that failure mode live (a
  //    backup QB for a top-12 WR, graded "good for you" purely because
  //    the other team's own QB depth was thin, with no check on how
  //    lopsided the underlying value gap actually was). Requiring "fair"
  //    models the realistic case instead: a change-of-scenery trade
  //    where both sides get comparable value, just at a position each
  //    of them needs more.
  for (const candidate of upgrades.slice(0, MAX_CANDIDATES_TO_CHECK)) {
    const theirOtherPlayersAtSurplusPosition = candidate.team.players.filter(
      (p) => p.position === surplus.position && p.playerId !== candidate.result.playerId
    );

    if (theirOtherPlayersAtSurplusPosition.length > 0) {
      const theirResults = await Promise.all(
        theirOtherPlayersAtSurplusPosition.map(async (p) => toResult(await scoreFor(p.playerId)))
      );
      const theirWeakest = theirResults.reduce((min, r) =>
        (r.restOfSeasonTotal ?? Infinity) < (min.restOfSeasonTotal ?? Infinity) ? r : min
      );
      const wouldHelpThem = (surplus.restOfSeasonTotal ?? -Infinity) > (theirWeakest.restOfSeasonTotal ?? -Infinity);
      if (!wouldHelpThem) continue;
    }

    const evaluation = evaluateTrade([surplus], [candidate.result]);
    if (evaluation.verdict === "fair") {
      return { suggestion: { otherTeamName: candidate.team.teamName, evaluation }, reason: null };
    }
  }

  return { suggestion: null, reason: "Found possible targets, but none graded as a fair trade for you right now." };
}
