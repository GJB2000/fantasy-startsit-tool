import { fetchNflverseCsv } from "./client";
import type { SnapCountRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;

/** Offensive snap share per player per game, from nflverse's `snap_counts` release (sourced from Pro-Football-Reference). */
export async function getSnapCounts(season: number): Promise<SnapCountRow[]> {
  const rows = await fetchNflverseCsv("snap_counts", `snap_counts_${season}.csv`, REVALIDATE_SECONDS);

  return rows
    .filter((r) => r.game_type === "REG")
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      player: r.player,
      position: r.position,
      team: r.team,
      offensePct: r.offense_pct === "" ? 0 : Number(r.offense_pct),
    }));
}
