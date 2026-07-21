import { REVALIDATE, sportsDataFetch } from "./client";
import type { ByeWeek } from "./types";

export async function getByes(season: number): Promise<ByeWeek[]> {
  return sportsDataFetch<ByeWeek[]>(`/Byes/${season}`, {
    revalidate: REVALIDATE.byes,
  });
}

export async function getByeWeekForTeam(season: number, team: string): Promise<number | null> {
  const byes = await getByes(season);
  return byes.find((b) => b.Team === team)?.Week ?? null;
}
