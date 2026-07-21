import { REVALIDATE, sportsDataFetch } from "./client";
import type { TeamGameStat } from "./types";

export async function getTeamGameStatsByWeek(apiSeason: string, week: number): Promise<TeamGameStat[]> {
  return sportsDataFetch<TeamGameStat[]>(`/TeamGameStats/${apiSeason}/${week}`, {
    revalidate: REVALIDATE.teamStats,
    base: "odds",
  });
}

export interface TeamPace {
  playsPerGame: number;
  passRate: number;
}

/**
 * Pure aggregation of already-fetched weekly team rows into a
 * point-in-time "recent pace" table — plays/game and pass-rate
 * (pass attempts as a share of all offensive plays) per team, over
 * only the weeks passed in. Mirrors positionDefense.ts's/
 * seasonToDatePlayerStats.ts's pattern: caller controls the cutoff
 * (e.g. weeks 1..W-1 for a week-W prediction), never full-season
 * hindsight.
 */
export function buildTeamPaceTableFromRows(weeklyRows: TeamGameStat[][]): Map<string, TeamPace> {
  const totals = new Map<string, { plays: number; passAttempts: number; rushAttempts: number; games: number }>();

  for (const rows of weeklyRows) {
    for (const row of rows) {
      const existing = totals.get(row.Team);
      if (existing) {
        existing.plays += row.OffensivePlays;
        existing.passAttempts += row.PassingAttempts;
        existing.rushAttempts += row.RushingAttempts;
        existing.games += 1;
      } else {
        totals.set(row.Team, {
          plays: row.OffensivePlays,
          passAttempts: row.PassingAttempts,
          rushAttempts: row.RushingAttempts,
          games: 1,
        });
      }
    }
  }

  const table = new Map<string, TeamPace>();
  for (const [team, t] of totals) {
    const totalAttempts = t.passAttempts + t.rushAttempts;
    table.set(team, {
      playsPerGame: t.plays / t.games,
      passRate: totalAttempts > 0 ? t.passAttempts / totalAttempts : 0,
    });
  }
  return table;
}

export async function getTeamPaceTable(apiSeason: string, throughWeek: number): Promise<Map<string, TeamPace>> {
  const weeks = Array.from({ length: throughWeek }, (_, i) => i + 1);
  const weeklyRows = await Promise.all(weeks.map((week) => getTeamGameStatsByWeek(apiSeason, week)));
  return buildTeamPaceTableFromRows(weeklyRows);
}
