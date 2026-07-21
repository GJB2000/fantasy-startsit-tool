import { getByes } from "@/lib/sportsdata/byes";
import { getAllPlayers } from "@/lib/sportsdata/players";
import { getTeamGameStatsByWeek } from "@/lib/sportsdata/teamGameStats";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";
import type { Player, PlayerGameStat, TeamGameStat } from "@/lib/sportsdata/types";

export interface BacktestRunData {
  season: number;
  apiSeason: string;
  /** Index 0 = week 1, index N-1 = week N. */
  allWeeklyRows: PlayerGameStat[][];
  /** Index 0 = week 1, index N-1 = week N. */
  allTeamWeeklyRows: TeamGameStat[][];
  byesByTeam: Map<string, number>;
  allPlayers: Player[];
}

/**
 * The only network I/O in the entire backtest feature — fetches every
 * week's box scores up to maxWeek (already individually cached 24h by
 * getPlayerGameStatsByWeek/getTeamGameStatsByWeek), plus byes and the
 * full player list, exactly once per request. Everything downstream
 * (position-defense aggregation, season-to-date aggregation, team pace
 * aggregation, recent-game slicing, scoring, grading, and broad-mode
 * pairing across many weeks/pairs) reads from this one batch in memory
 * — no matter how many weeks or pairs are evaluated.
 */
export async function loadBacktestRunData(
  season: number,
  apiSeason: string,
  maxWeek: number
): Promise<BacktestRunData> {
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  const [allWeeklyRows, allTeamWeeklyRows, byes, allPlayers] = await Promise.all([
    Promise.all(weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week))),
    Promise.all(weeks.map((week) => getTeamGameStatsByWeek(apiSeason, week))),
    getByes(season),
    getAllPlayers(),
  ]);

  const byesByTeam = new Map<string, number>(byes.map((b) => [b.Team, b.Week]));

  return { season, apiSeason, allWeeklyRows, allTeamWeeklyRows, byesByTeam, allPlayers };
}
