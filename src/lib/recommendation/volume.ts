import type { PlayerGameStat } from "@/lib/sportsdata/types";

/**
 * Position-specific "volume" (opportunity) for one game log row — a more
 * stable fantasy signal than raw points, which are inflated by touchdown
 * variance. QB: pass attempts only (rushing production is already
 * reflected in points). RB: rushing attempts + targets ("touches").
 * WR/TE: targets only. Other positions have no defined signal.
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
