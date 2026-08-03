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
  playerId: number,
  /**
   * When set, `weeks` is treated as a wider lookback and only the last
   * `limit` games the player actually PLAYED are returned — so a recent
   * injury gap gets backfilled with real games from before the absence
   * rather than leaving a thin sample. Callers that want the plain
   * "everyone who played in these exact weeks" behavior omit it.
   */
  limit?: number
): Promise<PlayerGameStat[]> {
  const weeklyRows = await Promise.all(
    weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week))
  );

  const played = weeklyRows
    .flatMap((rows) => rows.filter((r) => r.PlayerID === playerId && r.Played === 1))
    .sort((a, b) => a.Week - b.Week);

  return limit != null ? played.slice(-limit) : played;
}
