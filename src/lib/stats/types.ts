import type { AdvancedPlayerGame } from "../sportsdata/advancedMetrics";
import type { ScoringFormat } from "../sportsdata/types";
import type { AdvancedMetric } from "./advanced";

/**
 * Positions the stat pages cover. D/ST is excluded: SportsDataIO models a
 * team defence as a team stat with no player row, so it has no game log of
 * the shape everything here assumes (the same reason Legit Rankings excludes
 * it — see CLAUDE.md item 78).
 */
export const STATS_POSITIONS = ["QB", "RB", "WR", "TE", "K"] as const;
export type StatsPosition = (typeof STATS_POSITIONS)[number];

export function isStatsPosition(value: string): value is StatsPosition {
  return (STATS_POSITIONS as readonly string[]).includes(value);
}

/** Counting stats, shared by season totals and single-game rows. */
export interface StatTotals {
  passAttempts: number;
  passCompletions: number;
  passYards: number;
  passTouchdowns: number;
  passInterceptions: number;
  rushAttempts: number;
  rushYards: number;
  rushTouchdowns: number;
  targets: number;
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  fumblesLost: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalsMade50Plus: number;
  extraPointsMade: number;
  extraPointsAttempted: number;
}

export interface LeaderboardRow extends StatTotals {
  playerId: number;
  name: string;
  team: string | null;
  position: string;
  games: number;
  started: number;
  /** Total fantasy points in the requested scoring format. */
  points: number;
  pointsPerGame: number;
}

export interface GameLogRow extends StatTotals {
  week: number;
  opponent: string | null;
  /** "HOME" | "AWAY" where known. */
  homeOrAway: string | null;
  played: boolean;
  started: boolean;
  points: number;
}

export interface PlayerStatsDetail {
  player: {
    playerId: number;
    name: string;
    team: string | null;
    position: string;
    photoUrl: string | null;
    byeWeek: number | null;
    injuryStatus: string | null;
  };
  season: number;
  format: ScoringFormat;
  totals: StatTotals & { games: number; started: number; points: number; pointsPerGame: number };
  gameLog: GameLogRow[];
  /**
   * Advanced usage/efficiency, when available. Null when the player has no
   * advanced rows, or when the separate advanced-metrics subscription this
   * rides on is unavailable — the page renders without the section rather
   * than failing (see Open Item #35).
   */
  advanced: {
    summary: AdvancedMetric[];
    byWeek: Record<number, AdvancedPlayerGame>;
  } | null;
  /** Rank among players at the same position by total points, 1-based. */
  positionRank: number | null;
  positionCount: number | null;
}

export interface LeaderboardResponse {
  season: number;
  format: ScoringFormat;
  position: StatsPosition;
  rows: LeaderboardRow[];
}
