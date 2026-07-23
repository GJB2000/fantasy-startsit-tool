import type { PlayerGameStat } from "@/lib/sportsdata/types";

/**
 * Position-specific "volume" (opportunity) for one game log row — a more
 * stable fantasy signal than raw points, which are inflated by touchdown
 * variance. QB: pass attempts only (rushing production is already
 * reflected in points). RB: rushing attempts + targets ("touches").
 * WR/TE: targets only. Other positions have no defined signal.
 *
 * Tried adding rush attempts to QB's volume (blended at several weights)
 * after item 24's 2024 validation exposed a real gap for rushing QBs —
 * see CLAUDE.md "Backtesting & Tuning History" item 25 for the full
 * sweep. Reverted: every tested weight traded meaningful 2025 accuracy
 * for a 2024 improvement that stayed below chance regardless — not a
 * clean win at any point tested.
 */
export function getVolumeStat(row: PlayerGameStat): number | null {
  switch (row.Position) {
    case "QB":
      return row.PassingAttempts;
    case "RB":
      return row.RushingAttempts + row.ReceivingTargets;
    case "WR":
    case "TE":
      return row.ReceivingTargets;
    default:
      return null;
  }
}

/**
 * QB rushing attempts only, kept separate from getVolumeStat's
 * pass-attempts-only QB signal so it can be scored as its own additive
 * term (see QB_RUSH_BLEND_WEIGHT in config.ts) rather than blended into
 * the already-validated pass-attempts number — see CLAUDE.md item 30.
 */
export function getQbRushAttemptStat(row: PlayerGameStat): number | null {
  return row.Position === "QB" ? row.RushingAttempts : null;
}
