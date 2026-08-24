import { REVALIDATE, sportsDataFetch } from "./client";
import { usesV3 } from "./seasonRouting";
import type { ByeWeek } from "./types";

/** Season-routed — see weeklyStats.ts. Identical field shape on both hosts. */
export async function getByes(season: number): Promise<ByeWeek[]> {
  return sportsDataFetch<ByeWeek[]>(`/Byes/${season}`, {
    revalidate: REVALIDATE.byes,
    ...(usesV3(season) ? { base: "scoresV3" as const } : {}),
  });
}

export async function getByeWeekForTeam(season: number, team: string): Promise<number | null> {
  const byes = await getByes(season);
  return byes.find((b) => b.Team === team)?.Week ?? null;
}
