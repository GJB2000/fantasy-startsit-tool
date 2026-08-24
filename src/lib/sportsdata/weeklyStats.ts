import { getBoxScoreSlices } from "./boxScores";
import { REVALIDATE, sportsDataFetch } from "./client";
import { seasonYearFromApiSeason, usesV3 } from "./seasonRouting";
import type { PlayerGameStat } from "./types";

/**
 * Season-routed (item 156): 2025 and earlier come from the legacy
 * PlayerGameStatsByWeek endpoint on the legacy key; 2026+ come from the v3
 * Box Score [Final] feed, whose PlayerGames array is a field superset. The
 * two subscriptions cover disjoint seasons, so this dispatch is what lets the
 * app move to 2026 on its own without a redeploy. See seasonRouting.ts.
 */
export async function getPlayerGameStatsByWeek(
  apiSeason: string,
  week: number
): Promise<PlayerGameStat[]> {
  if (usesV3(seasonYearFromApiSeason(apiSeason))) {
    return (await getBoxScoreSlices(apiSeason, week)).playerGames;
  }
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
