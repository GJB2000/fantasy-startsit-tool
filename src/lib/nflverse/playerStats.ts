import { fetchNflverseCsv } from "./client";
import type { PlayerWeekStatRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;

/** Per-player, per-game target share and air yards share, from nflverse's `stats_player` release (nflfastR play-by-play derived). */
export async function getPlayerWeekStats(season: number): Promise<PlayerWeekStatRow[]> {
  const rows = await fetchNflverseCsv("stats_player", `stats_player_week_${season}.csv`, REVALIDATE_SECONDS);

  return rows
    .filter((r) => r.season_type === "REG")
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      playerDisplayName: r.player_display_name,
      position: r.position,
      team: r.team,
      targets: r.targets === "" ? 0 : Number(r.targets),
      targetShare: r.target_share === "" ? null : Number(r.target_share),
      airYardsShare: r.air_yards_share === "" ? null : Number(r.air_yards_share),
    }));
}
