import { REVALIDATE, sportsDataFetch } from "./client";

/**
 * Team-level D/ST fantasy game stat — a genuinely different shape from
 * PlayerGameStat (no PlayerID/Position, keyed by Team instead), since
 * SportsDataIO models team defense as a team stat, not a player. No
 * FantasyPointsPPR/Receptions fields exist here at all — D/ST scoring
 * doesn't vary by PPR/Half-PPR/Standard, so `FantasyPoints` is used
 * as-is regardless of the selected scoring format.
 */
export interface TeamDefenseGameStat {
  Team: string;
  Opponent: string;
  Week: number;
  Season: number;
  PointsAllowed: number;
  Sacks: number;
  Interceptions: number;
  FumblesRecovered: number;
  FumblesForced: number;
  DefensiveTouchdowns: number;
  SpecialTeamsTouchdowns: number;
  Safeties: number;
  BlockedKicks: number;
  FantasyPoints: number;
}

export async function getFantasyDefenseByWeek(apiSeason: string, week: number): Promise<TeamDefenseGameStat[]> {
  return sportsDataFetch<TeamDefenseGameStat[]>(`/FantasyDefenseByGame/${apiSeason}/${week}`, {
    revalidate: REVALIDATE.weeklyStats,
  });
}

export async function getRecentDefenseStatsForTeam(
  apiSeason: string,
  weeks: number[],
  team: string
): Promise<TeamDefenseGameStat[]> {
  const weeklyRows = await Promise.all(weeks.map((week) => getFantasyDefenseByWeek(apiSeason, week)));
  return weeklyRows.flatMap((rows) => rows.filter((r) => r.Team === team)).sort((a, b) => a.Week - b.Week);
}
