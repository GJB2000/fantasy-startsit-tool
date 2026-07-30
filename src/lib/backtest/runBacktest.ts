import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { compareBreakdowns } from "@/lib/recommendation/engine";
import { scoreExtendedPlayerBacktest } from "@/lib/recommendation/scoreExtendedBacktest";
import { isDstPlayerId } from "@/lib/sportsdata/defenseTeams";
import type { TeamDefenseGameStat } from "@/lib/sportsdata/defense";
import type { ExtendedPosition, Player, PlayerGameStat, ScoringFormat } from "@/lib/sportsdata/types";
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
import { buildAllExtendedPairsForWeek } from "./pairing";
import { sliceWeekData, type BacktestWeekSlice } from "./weekData";

/**
 * D/ST has no row in allWeeklyRows (SportsDataIO models it as a team
 * stat, not a player — see loadRun.ts), so gradeOutcome/getActualScore's
 * PlayerGameStat-based lookup can't grade it directly. Rather than widen
 * that well-tested, widely-shared grading code, this builds a small,
 * request-scoped array of PlayerGameStat-SHAPED rows from that week's
 * real D/ST box scores (synthetic PlayerID via dstPlayerIdByTeam,
 * FantasyPoints copied into both the PPR and standard fields since D/ST
 * doesn't vary by scoring format) — just enough for gradeWeek to work
 * completely unchanged. Never merged into allWeeklyRows/seasonToDateTable
 * itself, which stay skill-position-only by design.
 */
function toDstActualRows(defenseRows: TeamDefenseGameStat[], dstPlayerIdByTeam: Map<string, number>): PlayerGameStat[] {
  const rows: PlayerGameStat[] = [];
  for (const r of defenseRows) {
    const playerId = dstPlayerIdByTeam.get(r.Team);
    if (playerId == null) continue;
    rows.push({
      PlayerID: playerId,
      Season: r.Season,
      Week: r.Week,
      Team: r.Team,
      Opponent: r.Opponent,
      Position: "DST",
      Played: 1,
      Started: 1,
      FantasyPoints: r.FantasyPoints,
      FantasyPointsPPR: r.FantasyPoints,
      InjuryStatus: null,
      ReceivingTargets: 0,
      RushingAttempts: 0,
      PassingAttempts: 0,
      Receptions: 0,
      PassingYards: 0,
      RushingYards: 0,
      ReceivingYards: 0,
    });
  }
  return rows;
}

function buildAnyPlayerById(allPlayers: Player[], dstPlayers: Player[] | undefined): Map<number, Player> {
  const map = new Map(allPlayers.map((p) => [p.PlayerID, p]));
  for (const p of dstPlayers ?? []) map.set(p.PlayerID, p);
  return map;
}

export const BASELINE_IDS = Object.keys(BASELINE_PICKERS) as BaselineId[];

export function emptyBaselineOutcomes(): Record<BaselineId, BacktestOutcome[]> {
  const outcomes = {} as Record<BaselineId, BacktestOutcome[]>;
  for (const id of BASELINE_IDS) outcomes[id] = [];
  return outcomes;
}

/**
 * Grades each naive baseline's pick for one pair/week against the same
 * actual outcomes the engine is graded against. Shared with
 * runBacktestNflverseOnly.ts, so both pipelines' baseline numbers are
 * directly comparable. `format` defaults to "ppr" for callers that
 * haven't been made format-aware (the trade backtest doesn't use
 * baselines at all, so it never calls this).
 */
export function gradeBaselinesForPair(
  weekSlice: BacktestWeekSlice,
  playerIds: [number, number],
  targetWeekRows: PlayerGameStat[],
  format: ScoringFormat = "ppr"
): Record<BaselineId, BacktestOutcome> {
  const outcomes = {} as Record<BaselineId, BacktestOutcome>;
  for (const id of BASELINE_IDS) {
    const pick = BASELINE_PICKERS[id](weekSlice, playerIds, format);
    outcomes[id] = gradeOutcome(pick, playerIds, targetWeekRows, format).outcome;
  }
  return outcomes;
}

export function summarizeBaselineOutcomes(
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
  weeks: number[],
  format: ScoringFormat = "ppr"
): Promise<PairBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadBacktestRunData(season, apiSeason, maxWeek);
  const anyPlayerById = buildAnyPlayerById(runData.allPlayers, runData.dstPlayers);
  const isDstPair = playerIds.some((id) => isDstPlayerId(id));
  // Skip baseline grading for D/ST and K pairs, matching runBroadBacktest
  // below — most baselines read skill-position-only tables (season-to-date,
  // recent volume, nflverse signals) that simply don't cover these two
  // positions, and the few that don't (team pace, prior-week points) would
  // still be grading a team-level or coincidental signal against a kicker/
  // defense, not a meaningful comparison. D/ST additionally has no row in
  // targetWeekRows at all (see toDstActualRows above).
  const skipBaselines = isDstPair || playerIds.some((id) => anyPlayerById.get(id)?.Position === "K");

  const baselineOutcomes = emptyBaselineOutcomes();

  const weekResults = weeks.map((week) => {
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      week,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek,
      format,
      runData.allDefenseWeeklyRows,
      runData.impliedTotalsByTeamWeek,
      runData.expertConsensusByPlayerIdWeek
    );
    const breakdowns = playerIds.map((id) =>
      scoreExtendedPlayerBacktest(id, week, weekSlice, runData.byesByTeam, anyPlayerById, format)
    );
    const result = compareBreakdowns(breakdowns);
    const actualRows = isDstPair
      ? toDstActualRows(weekSlice.targetWeekDefenseRows, runData.dstPlayerIdByTeam ?? new Map())
      : weekSlice.targetWeekRows;
    const graded = gradeWeek(week, result, playerIds, actualRows, format);

    if (!skipBaselines) {
      const baselineGrades = gradeBaselinesForPair(weekSlice, playerIds, weekSlice.targetWeekRows, format);
      for (const id of BASELINE_IDS) baselineOutcomes[id].push(baselineGrades[id]);
    }

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
  positions: ExtendedPosition[],
  format: ScoringFormat = "ppr"
): Promise<BroadBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadBacktestRunData(season, apiSeason, maxWeek);
  const anyPlayerById = buildAnyPlayerById(runData.allPlayers, runData.dstPlayers);
  const dstPlayerIdByTeam = runData.dstPlayerIdByTeam ?? new Map<string, number>();

  const byWeekResults: Record<number, WeekGradeResult[]> = {};
  const byPositionResults: Record<string, WeekGradeResult[]> = {};
  const allResults: WeekGradeResult[] = [];
  const baselineOutcomes = emptyBaselineOutcomes();

  for (const week of weeks) {
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      week,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek,
      format,
      runData.allDefenseWeeklyRows,
      runData.impliedTotalsByTeamWeek,
      runData.expertConsensusByPlayerIdWeek
    );
    const pairs = buildAllExtendedPairsForWeek(weekSlice, positions, format, dstPlayerIdByTeam);
    const dstActualRows = toDstActualRows(weekSlice.targetWeekDefenseRows, dstPlayerIdByTeam);

    const weekResults: WeekGradeResult[] = [];
    for (const pair of pairs) {
      const breakdowns = pair.playerIds.map((id) =>
        scoreExtendedPlayerBacktest(id, week, weekSlice, runData.byesByTeam, anyPlayerById, format)
      );
      const result = compareBreakdowns(breakdowns);
      const actualRows = pair.position === "DST" ? dstActualRows : weekSlice.targetWeekRows;
      const graded = gradeWeek(week, result, pair.playerIds, actualRows, format);
      weekResults.push(graded);
      allResults.push(graded);
      (byPositionResults[pair.position] ??= []).push(graded);

      if (pair.position !== "DST" && pair.position !== "K") {
        const baselineGrades = gradeBaselinesForPair(weekSlice, pair.playerIds, weekSlice.targetWeekRows, format);
        for (const id of BASELINE_IDS) baselineOutcomes[id].push(baselineGrades[id]);
      }
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
