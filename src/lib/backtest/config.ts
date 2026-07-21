import type { SkillPosition } from "@/lib/sportsdata/types";

// 2025 is the only fully completed NFL season currently available from
// SportsDataIO's Discovery Lab tier — bump these once a later season completes.
export const DEFAULT_BACKTEST_SEASON = 2025;
export const DEFAULT_BACKTEST_API_SEASON = "2025REG";
export const MAX_BACKTEST_WEEK = 18;

/** Broad-mode "startable" pool depth per position, mirroring realistic 12-team-league roster relevance. */
export const BROAD_MODE_POOL_SIZE: Record<SkillPosition, number> = {
  QB: 12,
  RB: 24,
  WR: 24,
  TE: 12,
};
