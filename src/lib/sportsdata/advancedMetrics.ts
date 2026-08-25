import "server-only";
import { REVALIDATE, sportsDataFetch } from "./client";

/**
 * A single game's advanced row. The endpoint returns 83 fields per game;
 * these are the ones the stat pages surface, all optional because which are
 * populated depends entirely on position (a WR has no PassingAttempts, a QB
 * has no TargetShare).
 *
 * Deliberately omitted: the defensive/coverage fields (FantasyPointsAllowed,
 * TargetsAllowed, Burns, PrimaryCorner, WRMatchup...). They're for corner
 * matchup analysis, and on a skill player's row they carry meaningless
 * values — PrimaryCorner comes back as e.g. -9454.
 */
export interface AdvancedPlayerGame {
  PlayerID: number;
  Season: number;
  SeasonType: number;
  Week: number;
  Snaps?: number;
  SnapShare?: number;
  TargetShare?: number;
  OpportunityShare?: number;
  Opportunities?: number;
  RoutesRun?: number;
  HogRate?: number;
  JukeRate?: number;
  CatchRate?: number;
  EvadedTackles?: number;
  YardsCreated?: number;
  ContestedTargets?: number;
  ContestedCatches?: number;
  DeepBallAttempts?: number;
  DeepBallCompletions?: number;
  EndZoneTargets?: number;
  RedZoneTargets?: number;
  RedZoneTouches?: number;
  RedZoneCarries?: number;
  RedZoneAttempts?: number;
  CarriesInside10?: number;
  CarriesInside5?: number;
  PassAttemptsInside10?: number;
  PassAttemptsInside5?: number;
  Hurries?: number;
  Completions?: number;
  CompletionPercentage?: number;
  PassingAttempts?: number;
  PassingYards?: number;
  Targets?: number;
  Receptions?: number;
  ReceivingYards?: number;
  Carries?: number;
  RushingYards?: number;
  TotalTouches?: number;
  TotalYards?: number;
}

/**
 * A season row. The endpoint returns ~445 fields; these are the ones worth
 * having, and they exist ONLY at season level — there is no per-week
 * equivalent, which is why they can't feed the week-by-week engine or be
 * backtested (see CLAUDE.md item 160) and why Legit Rankings, a season-value
 * ranking with no pick ground truth, is where they fit.
 */
export interface AdvancedPlayerSeason {
  PlayerID: number;
  Season: number;
  SeasonType: number;
  /** Games played. Load-bearing: every counting field here is a season TOTAL. */
  Games?: number;
  /** What this player's usage was WORTH — an opportunity-quality model output, in fantasy points. The headline field: it strips the touchdown luck that raw points carry. */
  ExpectedFantasyPoints?: number;
  /** Volume weighted by the value of each opportunity (a carry at the 2 counts for more than one at midfield). */
  WeightedOpportunities?: number;
  /** Share of the team's total opportunities (carries + targets). */
  OpportunityShare?: number;
  RouteParticipation?: number;
  YardsPerRouteRun?: number;
  SnapShare?: number;
  TargetShare?: number;
}

interface AdvancedPlayerInfo {
  PlayerID: number;
  Name: string;
  Position: string;
  AdvancedPlayerGames?: AdvancedPlayerGame[];
  AdvancedPlayerSeasons?: AdvancedPlayerSeason[];
}

/**
 * One player's advanced game rows for a season, regular season only.
 *
 * One HTTP call per player, keyed by the same PlayerID everything else in
 * the app uses — no name join, and no play-by-play parse for the red-zone
 * numbers, which is what this costs through nflverse.
 *
 * Throws like any other reader; callers treat advanced metrics as optional
 * and fail open, because this rides on a separate evaluation subscription
 * (SPORTSDATA_ADVANCED_API_KEY) that may not be renewed — see Open Item #35.
 */
export async function getAdvancedPlayerGames(
  playerId: number,
  season: number
): Promise<AdvancedPlayerGame[]> {
  const info = await sportsDataFetch<AdvancedPlayerInfo[]>(
    `/AdvancedPlayerInfo/${playerId}`,
    { revalidate: REVALIDATE.advancedMetrics, base: "advancedV3" }
  );
  const games = info?.[0]?.AdvancedPlayerGames ?? [];
  return games
    .filter((g) => g.Season === season && g.SeasonType === 1)
    .sort((a, b) => a.Week - b.Week);
}

/**
 * One player's SEASON advanced row, regular season only, or null if the feed
 * doesn't cover them.
 *
 * Same one-call-per-player shape as getAdvancedPlayerGames above (it's the
 * same endpoint and the same cached response, so asking for both costs one
 * request). Callers must fail open — this rides on a separate evaluation
 * subscription that may not be renewed, see Open Item #35.
 */
export async function getAdvancedPlayerSeason(
  playerId: number,
  season: number
): Promise<AdvancedPlayerSeason | null> {
  const info = await sportsDataFetch<AdvancedPlayerInfo[]>(
    `/AdvancedPlayerInfo/${playerId}`,
    { revalidate: REVALIDATE.advancedMetrics, base: "advancedV3" }
  );
  const seasons = info?.[0]?.AdvancedPlayerSeasons ?? [];
  return seasons.find((r) => r.Season === season && r.SeasonType === 1) ?? null;
}

/** Below this, a per-game rate is too thin to be worth trusting — matches the engine's own recent-form window. */
const MIN_GAMES_FOR_RATE = 4;

/**
 * Expected fantasy points PER GAME for a shortlist of players, keyed by
 * PlayerID.
 *
 * Per game, not the season total the feed returns, and that distinction is
 * load-bearing rather than cosmetic: a total punishes a player for games he
 * missed, which is precisely the injury-shortened-season case a
 * forward-looking ranking must not get wrong (Brock Bowers' 2025 is 151.6
 * expected points over 12 games — poor as a total, a healthy 12.6 a game).
 *
 * Deliberately takes a SHORTLIST rather than a whole position pool: this is
 * one HTTP call per player, and a ranking pool runs to hundreds. Any player
 * the feed misses, anyone under MIN_GAMES_FOR_RATE, or a whole-feed outage,
 * is simply absent from the map and the caller degrades to its non-advanced
 * score.
 */
export async function getExpectedPointsPerGameByPlayerId(
  playerIds: number[],
  season: number
): Promise<Map<number, number>> {
  const rows = await Promise.all(
    playerIds.map((id) =>
      getAdvancedPlayerSeason(id, season)
        .then((row) => [id, row] as const)
        .catch(() => [id, null] as const)
    )
  );
  const out = new Map<number, number>();
  for (const [id, row] of rows) {
    const points = row?.ExpectedFantasyPoints;
    const games = row?.Games;
    if (points != null && points > 0 && games != null && games >= MIN_GAMES_FOR_RATE) {
      out.set(id, points / games);
    }
  }
  return out;
}
