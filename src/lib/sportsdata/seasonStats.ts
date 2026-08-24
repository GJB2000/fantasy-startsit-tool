import { REVALIDATE, sportsDataFetch } from "./client";
import { usesV3 } from "./seasonRouting";
import type { PlayerSeasonStat } from "./types";

/** Season-routed — see weeklyStats.ts. v3 field shape is a superset. */
export async function getPlayerSeasonStats(season: number): Promise<PlayerSeasonStat[]> {
  return sportsDataFetch<PlayerSeasonStat[]>(`/PlayerSeasonStats/${season}`, {
    revalidate: REVALIDATE.seasonStats,
    ...(usesV3(season) ? { base: "statsV3" as const } : {}),
  });
}

export async function getPlayerSeasonStat(
  season: number,
  playerId: number
): Promise<PlayerSeasonStat | null> {
  const stats = await getPlayerSeasonStats(season);
  return stats.find((s) => s.PlayerID === playerId) ?? null;
}
