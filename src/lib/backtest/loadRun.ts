import { getByes } from "@/lib/sportsdata/byes";
import { getAllPlayers } from "@/lib/sportsdata/players";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";
import type { Player, PlayerGameStat } from "@/lib/sportsdata/types";

export interface BacktestRunData {
  season: number;
  apiSeason: string;
  /** Index 0 = week 1, index N-1 = week N. */
  allWeeklyRows: PlayerGameStat[][];
  byesByTeam: Map<string, number>;
  allPlayers: Player[];
}

/**
 * The only network I/O in the entire backtest feature — fetches every
 * week's box scores up to maxWeek (already individually cached 24h by
 * getPlayerGameStatsByWeek), plus byes and the full player list, exactly
 * once per request. Everything downstream (position-defense aggregation,
 * season-to-date aggregation, recent-game slicing, scoring, grading, and
 * broad-mode pairing across many weeks/pairs) reads from this one batch
 * in memory — no matter how many weeks or pairs are evaluated.
 */
export async function loadBacktestRunData(
  season: number,
  apiSeason: string,
  maxWeek: number
): Promise<BacktestRunData> {
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  const [allWeeklyRows, byes, allPlayers] = await Promise.all([
    Promise.all(weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week))),
    getByes(season),
    getAllPlayers(),
  ]);

  const byesByTeam = new Map<string, number>(byes.map((b) => [b.Team, b.Week]));

  return { season, apiSeason, allWeeklyRows, byesByTeam, allPlayers };
}
