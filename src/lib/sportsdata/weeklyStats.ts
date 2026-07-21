import { REVALIDATE, sportsDataFetch } from "./client";
import type { PlayerGameStat } from "./types";

export async function getPlayerGameStatsByWeek(
  apiSeason: string,
  week: number
): Promise<PlayerGameStat[]> {
  return sportsDataFetch<PlayerGameStat[]>(`/PlayerGameStatsByWeek/${apiSeason}/${week}`, {
    revalidate: REVALIDATE.weeklyStats,
  });
}

export async function getRecentGameStatsForPlayer(
  apiSeason: string,
  weeks: number[],
  playerId: number
): Promise<PlayerGameStat[]> {
  const weeklyRows = await Promise.all(
    weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week))
  );

  return weeklyRows
    .flatMap((rows) => rows.filter((r) => r.PlayerID === playerId && r.Played === 1))
    .sort((a, b) => a.Week - b.Week);
}
