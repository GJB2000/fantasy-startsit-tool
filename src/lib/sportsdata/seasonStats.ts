import { REVALIDATE, sportsDataFetch } from "./client";
import type { PlayerSeasonStat } from "./types";

export async function getPlayerSeasonStats(season: number): Promise<PlayerSeasonStat[]> {
  return sportsDataFetch<PlayerSeasonStat[]>(`/PlayerSeasonStats/${season}`, {
    revalidate: REVALIDATE.seasonStats,
  });
}

export async function getPlayerSeasonStat(
  season: number,
  playerId: number
): Promise<PlayerSeasonStat | null> {
  const stats = await getPlayerSeasonStats(season);
  return stats.find((s) => s.PlayerID === playerId) ?? null;
}
