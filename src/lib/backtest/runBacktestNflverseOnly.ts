import { resolveSdioNameToNflverseId } from "@/lib/nflverse/playerMatch";
import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { comparePlayers } from "@/lib/recommendation/engine";
import { getAnyPlayerById } from "@/lib/sportsdata/players";
import type { SkillPosition } from "@/lib/sportsdata/types";
import { type BaselineId } from "./baselines";
import {
  gradeWeek,
  summarize,
  summarizeByCloseCall,
  type BacktestSummary,
  type ConfidenceBreakdown,
  type WeekGradeResult,
} from "./grading";
import { loadNflverseOnlyRunData } from "./loadRunNflverseOnly";
import { buildAllPairsForWeek } from "./pairing";
import { BASELINE_IDS, emptyBaselineOutcomes, gradeBaselinesForPair, summarizeBaselineOutcomes } from "./runBacktest";
import { sliceWeekData } from "./weekData";

export interface NflverseOnlyBroadBacktestResult {
  byPosition: Record<string, BacktestSummary>;
  overall: BacktestSummary;
  baselineSummaries: Record<BaselineId, BacktestSummary>;
  confidenceBreakdown: ConfidenceBreakdown;
}

export interface NflverseOnlyPairBacktestResult {
  weekResults: WeekGradeResult[];
  summary: BacktestSummary;
  baselineSummaries: Record<BaselineId, BacktestSummary>;
  confidenceBreakdown: ConfidenceBreakdown;
}

/** Thrown when a SportsDataIO player can't be matched into nflverse's 2024 name space — surfaced by the route as a clear user-facing message rather than a silent wrong-player substitution. */
export class PlayerNotInNflverseSeasonError extends Error {
  constructor(public readonly displayName: string) {
    super(`Couldn't find "${displayName}" in nflverse's 2024 data.`);
  }
}

/**
 * nflverse-only equivalent of runBacktest.ts's runPairBacktest. The
 * single-pair UI only ever searches SportsDataIO's player list (see
 * PlayerSearchInput.tsx), so the two requested IDs are SportsDataIO
 * PlayerIDs — resolved here to nflverse's synthetic 2024 IDs by name
 * (playerMatch.ts's reverse join) before running, so the same search box
 * works for both pipelines without a parallel 2024-specific search UI.
 * A genuine name-mismatch miss (~1% of players, per playerMatch.ts)
 * throws PlayerNotInNflverseSeasonError rather than silently comparing
 * the wrong player or a null one.
 */
export async function runPairBacktestNflverseOnly(
  sdioPlayerIds: [number, number],
  season: number,
  weeks: number[]
): Promise<NflverseOnlyPairBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const [runData, sdioPlayers] = await Promise.all([
    loadNflverseOnlyRunData(season, maxWeek),
    Promise.all(sdioPlayerIds.map((id) => getAnyPlayerById(id))),
  ]);
  // Always set by loadNflverseOnlyRunData — see BacktestRunData's doc comment.
  const nameMap = runData.gameLogPlayerIdByNormalizedName ?? new Map<string, number>();

  const playerIds = sdioPlayerIds.map((sdioId, i) => {
    const sdioPlayer = sdioPlayers[i];
    if (!sdioPlayer) throw new PlayerNotInNflverseSeasonError(`player ${sdioId}`);
    const displayName = `${sdioPlayer.FirstName} ${sdioPlayer.LastName}`;
    const nflverseId = resolveSdioNameToNflverseId(displayName, nameMap);
    if (nflverseId == null) throw new PlayerNotInNflverseSeasonError(displayName);
    return nflverseId;
  }) as [number, number];

  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));
  const baselineOutcomes = emptyBaselineOutcomes();

  const weekResults = weeks.map((week) => {
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      week,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable
    );
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

/**
 * nflverse-only equivalent of runBacktest.ts's runBroadBacktest — same
 * per-week/per-pair loop (sliceWeekData -> buildAllPairsForWeek ->
 * buildBacktestComparisonInput -> comparePlayers -> gradeWeek), but
 * sourced from loadRunNflverseOnly.ts instead of loadRun.ts, so it can
 * validate the *already-tuned, unchanged* engine weights (config.ts)
 * against a season SportsDataIO won't serve on this plan. Deliberately
 * doesn't retune anything here — that would defeat the point of an
 * out-of-sample check. See CLAUDE.md "Backtesting & Tuning History".
 *
 * Reuses runBacktest.ts's baseline-grading helpers directly (rather
 * than duplicating them) so the same BaselineId set, graded by the
 * identical gradeOutcome rules, produces directly comparable numbers
 * for both seasons — see item 26.
 */
export async function runBroadBacktestNflverseOnly(
  season: number,
  weeks: number[],
  positions: SkillPosition[]
): Promise<NflverseOnlyBroadBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadNflverseOnlyRunData(season, maxWeek);
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));

  const byPositionResults: Record<string, WeekGradeResult[]> = {};
  const allResults: WeekGradeResult[] = [];
  const baselineOutcomes = emptyBaselineOutcomes();

  for (const week of weeks) {
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      week,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable
    );
    const pairs = buildAllPairsForWeek(weekSlice, positions);

    for (const pair of pairs) {
      const inputs = pair.playerIds.map((id) =>
        buildBacktestComparisonInput(id, anyPlayerById.get(id) ?? null, week, weekSlice, runData.byesByTeam)
      );
      const result = comparePlayers(inputs);
      const graded = gradeWeek(week, result, pair.playerIds, weekSlice.targetWeekRows);
      allResults.push(graded);
      (byPositionResults[pair.position] ??= []).push(graded);

      const baselineGrades = gradeBaselinesForPair(weekSlice, pair.playerIds, weekSlice.targetWeekRows);
      for (const id of BASELINE_IDS) baselineOutcomes[id].push(baselineGrades[id]);
    }
  }

  const byPosition: Record<string, BacktestSummary> = {};
  for (const [position, results] of Object.entries(byPositionResults)) {
    byPosition[position] = summarize(results);
  }

  return {
    byPosition,
    overall: summarize(allResults),
    baselineSummaries: summarizeBaselineOutcomes(baselineOutcomes),
    confidenceBreakdown: summarizeByCloseCall(allResults),
  };
}
