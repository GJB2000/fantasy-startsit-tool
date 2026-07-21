import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { comparePlayers } from "@/lib/recommendation/engine";
import type { PlayerGameStat, SkillPosition } from "@/lib/sportsdata/types";
import { BASELINE_PICKERS, type BaselineId } from "./baselines";
import {
  gradeOutcome,
  gradeWeek,
  summarize,
  summarizeByCloseCall,
  summarizeOutcomes,
  type BacktestOutcome,
  type BacktestSummary,
  type ConfidenceBreakdown,
  type WeekGradeResult,
} from "./grading";
import { loadBacktestRunData } from "./loadRun";
import { buildAllPairsForWeek } from "./pairing";
import { sliceWeekData, type BacktestWeekSlice } from "./weekData";

const BASELINE_IDS = Object.keys(BASELINE_PICKERS) as BaselineId[];

function emptyBaselineOutcomes(): Record<BaselineId, BacktestOutcome[]> {
  const outcomes = {} as Record<BaselineId, BacktestOutcome[]>;
  for (const id of BASELINE_IDS) outcomes[id] = [];
  return outcomes;
}

/** Grades each naive baseline's pick for one pair/week against the same actual outcomes the engine is graded against. */
function gradeBaselinesForPair(
  weekSlice: BacktestWeekSlice,
  playerIds: [number, number],
  targetWeekRows: PlayerGameStat[]
): Record<BaselineId, BacktestOutcome> {
  const outcomes = {} as Record<BaselineId, BacktestOutcome>;
  for (const id of BASELINE_IDS) {
    const pick = BASELINE_PICKERS[id](weekSlice, playerIds);
    outcomes[id] = gradeOutcome(pick, playerIds, targetWeekRows).outcome;
  }
  return outcomes;
}

function summarizeBaselineOutcomes(
  collected: Record<BaselineId, BacktestOutcome[]>
): Record<BaselineId, BacktestSummary> {
  const summaries = {} as Record<BaselineId, BacktestSummary>;
  for (const id of BASELINE_IDS) {
    summaries[id] = summarizeOutcomes(collected[id]);
  }
  return summaries;
}

export interface PairBacktestResult {
  weekResults: WeekGradeResult[];
  summary: BacktestSummary;
  baselineSummaries: Record<BaselineId, BacktestSummary>;
  confidenceBreakdown: ConfidenceBreakdown;
}

export async function runPairBacktest(
  playerIds: [number, number],
  season: number,
  apiSeason: string,
  weeks: number[]
): Promise<PairBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadBacktestRunData(season, apiSeason, maxWeek);
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));

  const baselineOutcomes = emptyBaselineOutcomes();

  const weekResults = weeks.map((week) => {
    const weekSlice = sliceWeekData(runData.allWeeklyRows, week, RECENT_WEEK_COUNT, runData.allTeamWeeklyRows);
    const inputs = playerIds.map((id) =>
      buildBacktestComparisonInput(id, anyPlayerById.get(id) ?? null, week, weekSlice, runData.byesByTeam)
    );
    const result = comparePlayers(inputs);
    const graded = gradeWeek(week, result, playerIds, weekSlice.targetWeekRows);

    const baselineGrades = gradeBaselinesForPair(weekSlice, playerIds, weekSlice.targetWeekRows);
    for (const id of BASELINE_IDS) baselineOutcomes[id].push(baselineGrades[id]);

    return graded;
  });

  return {
    weekResults,
    summary: summarize(weekResults),
    baselineSummaries: summarizeBaselineOutcomes(baselineOutcomes),
    confidenceBreakdown: summarizeByCloseCall(weekResults),
  };
}

export interface BroadBacktestResult {
  byWeek: Record<number, BacktestSummary>;
  byPosition: Record<string, BacktestSummary>;
  overall: BacktestSummary;
  baselineSummaries: Record<BaselineId, BacktestSummary>;
  confidenceBreakdown: ConfidenceBreakdown;
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
  const baselineOutcomes = emptyBaselineOutcomes();

  for (const week of weeks) {
    const weekSlice = sliceWeekData(runData.allWeeklyRows, week, RECENT_WEEK_COUNT, runData.allTeamWeeklyRows);
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

      const baselineGrades = gradeBaselinesForPair(weekSlice, pair.playerIds, weekSlice.targetWeekRows);
      for (const id of BASELINE_IDS) baselineOutcomes[id].push(baselineGrades[id]);
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

  return {
    byWeek,
    byPosition,
    overall: summarize(allResults),
    baselineSummaries: summarizeBaselineOutcomes(baselineOutcomes),
    confidenceBreakdown: summarizeByCloseCall(allResults),
  };
}
