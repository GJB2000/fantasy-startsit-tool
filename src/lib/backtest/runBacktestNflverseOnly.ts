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
  type BacktestOutcome,
  type BacktestSummary,
  type ConfidenceBreakdown,
  type WeekGradeResult,
} from "./grading";
import type { BacktestRunData } from "./loadRun";
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

interface SeasonCollection {
  allResults: WeekGradeResult[];
  byPositionResults: Record<string, WeekGradeResult[]>;
  baselineOutcomes: Record<BaselineId, BacktestOutcome[]>;
}

/**
 * The per-season week/pair walk shared by runBroadBacktestNflverseOnly
 * (single season) and runBroadBacktestNflverseOnlyMultiSeason (pools
 * several seasons) — extracted so pooling across seasons doesn't require
 * a second copy of this loop.
 */
function collectBroadResultsForSeason(
  runData: BacktestRunData,
  weeks: number[],
  positions: SkillPosition[]
): SeasonCollection {
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
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek
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

  return { allResults, byPositionResults, baselineOutcomes };
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
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek
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
  const { allResults, byPositionResults, baselineOutcomes } = collectBroadResultsForSeason(runData, weeks, positions);

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

export interface NflverseOnlyMultiSeasonBroadBacktestResult {
  /** Per-season breakdown, so any one season's behavior is visible directly rather than averaged away — see CLAUDE.md's joint-model item for why that matters. */
  bySeason: Record<number, { overall: BacktestSummary; byPosition: Record<string, BacktestSummary> }>;
  byPosition: Record<string, BacktestSummary>;
  overall: BacktestSummary;
  baselineSummaries: Record<BaselineId, BacktestSummary>;
  confidenceBreakdown: ConfidenceBreakdown;
}

/**
 * Pools the nflverse-only pipeline across several seasons (e.g. 2022-2025)
 * into one combined sample — built to get a larger, more robust base for
 * weight tuning than any single season offers, and specifically to
 * re-check candidate signals that were previously rejected for looking
 * thin on sample size alone (QB goal-line rushing, high-wind WR) rather
 * than for a wrong underlying idea. Runs every requested season through
 * this SAME nflverse-only pipeline — including 2025, even though the
 * SportsDataIO pipeline is the one actually shipped — so every pooled
 * season is paired/scored by identical plumbing; item 24 already found
 * the two pipelines agree within ~0.15pp on 2025 in aggregate, so this
 * doesn't trade away meaningful accuracy for that consistency.
 *
 * Seasons are loaded and collected sequentially, not via Promise.all: each
 * season's load includes a full play-by-play parse, and firing several of
 * those concurrently would reproduce the peak-memory reliability problem
 * item 27 already fixed for the single-season case.
 */
export async function runBroadBacktestNflverseOnlyMultiSeason(
  seasons: number[],
  weeks: number[],
  positions: SkillPosition[]
): Promise<NflverseOnlyMultiSeasonBroadBacktestResult> {
  const maxWeek = Math.max(...weeks);

  const pooledAllResults: WeekGradeResult[] = [];
  const pooledByPositionResults: Record<string, WeekGradeResult[]> = {};
  const pooledBaselineOutcomes = emptyBaselineOutcomes();
  const bySeason: Record<number, { overall: BacktestSummary; byPosition: Record<string, BacktestSummary> }> = {};

  for (const season of seasons) {
    const runData: BacktestRunData = await loadNflverseOnlyRunData(season, maxWeek);
    const { allResults, byPositionResults, baselineOutcomes } = collectBroadResultsForSeason(runData, weeks, positions);

    pooledAllResults.push(...allResults);
    for (const [position, results] of Object.entries(byPositionResults)) {
      (pooledByPositionResults[position] ??= []).push(...results);
    }
    for (const id of BASELINE_IDS) pooledBaselineOutcomes[id].push(...(baselineOutcomes[id] as BacktestOutcome[]));

    const seasonByPosition: Record<string, BacktestSummary> = {};
    for (const [position, results] of Object.entries(byPositionResults)) {
      seasonByPosition[position] = summarize(results);
    }
    bySeason[season] = { overall: summarize(allResults), byPosition: seasonByPosition };
  }

  const byPosition: Record<string, BacktestSummary> = {};
  for (const [position, results] of Object.entries(pooledByPositionResults)) {
    byPosition[position] = summarize(results);
  }

  return {
    bySeason,
    byPosition,
    overall: summarize(pooledAllResults),
    baselineSummaries: summarizeBaselineOutcomes(pooledBaselineOutcomes),
    confidenceBreakdown: summarizeByCloseCall(pooledAllResults),
  };
}
