import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { comparePlayers } from "@/lib/recommendation/engine";
import type { SkillPosition } from "@/lib/sportsdata/types";
import { gradeWeek, summarize, type BacktestSummary, type WeekGradeResult } from "./grading";
import { loadBacktestRunData } from "./loadRun";
import { buildAllPairsForWeek } from "./pairing";
import { sliceWeekData } from "./weekData";

export async function runPairBacktest(
  playerIds: [number, number],
  season: number,
  apiSeason: string,
  weeks: number[]
): Promise<{ weekResults: WeekGradeResult[]; summary: BacktestSummary }> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadBacktestRunData(season, apiSeason, maxWeek);
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));

  const weekResults = weeks.map((week) => {
    const weekSlice = sliceWeekData(runData.allWeeklyRows, week, RECENT_WEEK_COUNT);
    const inputs = playerIds.map((id) =>
      buildBacktestComparisonInput(id, anyPlayerById.get(id) ?? null, week, weekSlice, runData.byesByTeam)
    );
    const result = comparePlayers(inputs);
    return gradeWeek(week, result, playerIds, weekSlice.targetWeekRows);
  });

  return { weekResults, summary: summarize(weekResults) };
}

export interface BroadBacktestResult {
  byWeek: Record<number, BacktestSummary>;
  byPosition: Record<string, BacktestSummary>;
  overall: BacktestSummary;
}

export async function runBroadBacktest(
  season: number,
  apiSeason: string,
  weeks: number[],
  positions: SkillPosition[]
): Promise<BroadBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadBacktestRunData(season, apiSeason, maxWeek);
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));

  const byWeekResults: Record<number, WeekGradeResult[]> = {};
  const byPositionResults: Record<string, WeekGradeResult[]> = {};
  const allResults: WeekGradeResult[] = [];

  for (const week of weeks) {
    const weekSlice = sliceWeekData(runData.allWeeklyRows, week, RECENT_WEEK_COUNT);
    const pairs = buildAllPairsForWeek(weekSlice, positions);

    const weekResults: WeekGradeResult[] = [];
    for (const pair of pairs) {
      const inputs = pair.playerIds.map((id) =>
        buildBacktestComparisonInput(id, anyPlayerById.get(id) ?? null, week, weekSlice, runData.byesByTeam)
      );
      const result = comparePlayers(inputs);
      const graded = gradeWeek(week, result, pair.playerIds, weekSlice.targetWeekRows);
      weekResults.push(graded);
      allResults.push(graded);
      (byPositionResults[pair.position] ??= []).push(graded);
    }
    byWeekResults[week] = weekResults;
  }

  const byWeek: Record<number, BacktestSummary> = {};
  for (const [week, results] of Object.entries(byWeekResults)) {
    byWeek[Number(week)] = summarize(results);
  }

  const byPosition: Record<string, BacktestSummary> = {};
  for (const [position, results] of Object.entries(byPositionResults)) {
    byPosition[position] = summarize(results);
  }

  return { byWeek, byPosition, overall: summarize(allResults) };
}
