import "server-only";
import { REVALIDATE, sportsDataFetch } from "./client";
import { seasonYearFromApiSeason, usesV3 } from "./seasonRouting";
import { getFantasyPoints, type PlayerGameStat, type ScoringFormat } from "./types";

/**
 * SportsDataIO's own weekly point projections — the engine's consensus
 * signal since it replaced the FantasyPros scrape.
 *
 * These are genuine PREGAME projections, not backfilled actuals: across 350
 * played players in a spot-checked week, zero matched their actual score,
 * with real misses in both directions. That's what makes them backtestable,
 * which the FantasyPros feed only was via a git-history archive.
 *
 * Season-routed like every other reader (item 158): 2025 and earlier come
 * from the legacy fantasy host, 2026+ from the v3 projections package.
 */
export async function getPlayerGameProjectionsByWeek(
  apiSeason: string,
  week: number
): Promise<PlayerGameStat[]> {
  const v3 = usesV3(seasonYearFromApiSeason(apiSeason));
  return sportsDataFetch<PlayerGameStat[]>(
    `/PlayerGameProjectionStatsByWeek/${apiSeason}/${week}`,
    { revalidate: REVALIDATE.projections, ...(v3 ? { base: "projectionsV3" as const } : {}) }
  );
}

/** Season-long projections — the offseason stand-in, when no upcoming week exists. */
export async function getPlayerSeasonProjections(season: number): Promise<PlayerGameStat[]> {
  return sportsDataFetch<PlayerGameStat[]>(`/PlayerSeasonProjectionStats/${season}`, {
    revalidate: REVALIDATE.projections,
    ...(usesV3(season) ? { base: "projectionsV3" as const } : {}),
  });
}

/** playerId -> projected points for a single week. */
export function projectionMapFromRows(
  rows: PlayerGameStat[],
  format: ScoringFormat
): Map<number, number> {
  const out = new Map<number, number>();
  for (const row of rows) {
    const points = getFantasyPoints(row, format);
    if (points > 0) out.set(row.PlayerID, points);
  }
  return out;
}
