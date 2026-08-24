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

interface AdvancedPlayerInfo {
  PlayerID: number;
  Name: string;
  Position: string;
  AdvancedPlayerGames?: AdvancedPlayerGame[];
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
