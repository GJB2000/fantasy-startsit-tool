import type { ComparisonResult } from "@/lib/recommendation/types";
import type { PlayerGameStat } from "@/lib/sportsdata/types";

export type BacktestOutcome = "correct" | "incorrect" | "push" | "no_pick";

export interface ActualScore {
  pprPoints: number;
  played: boolean;
}

export interface WeekGradeResult {
  week: number;
  result: ComparisonResult;
  actualScores: Record<number, ActualScore>;
  outcome: BacktestOutcome;
}

function getActualScore(playerId: number, targetWeekRows: PlayerGameStat[]): ActualScore {
  const row = targetWeekRows.find((r) => r.PlayerID === playerId && r.Played === 1);
  return row ? { pprPoints: row.FantasyPointsPPR, played: true } : { pprPoints: 0, played: false };
}

export interface OutcomeGrade {
  actualScores: Record<number, ActualScore>;
  outcome: BacktestOutcome;
}

/**
 * The reusable grading core: given a pick (or null) and what actually
 * happened, decide correct/incorrect/push/no_pick. Used both for the
 * real engine's picks (via gradeWeek below) and for naive baseline
 * picks (see baselines.ts), so engine and baselines are graded by the
 * exact same rules against the exact same outcomes.
 *
 * recommendedPlayerId===null is "no_pick", not "incorrect": for the
 * engine this is an expected early-season "insufficient data" state;
 * for baselines it means the baseline itself had no signal to pick
 * with (e.g. no prior-week game yet) or a tie.
 */
export function gradeOutcome(
  recommendedPlayerId: number | null,
  playerIds: number[],
  targetWeekRows: PlayerGameStat[]
): OutcomeGrade {
  const actualScores: Record<number, ActualScore> = {};
  for (const id of playerIds) {
    actualScores[id] = getActualScore(id, targetWeekRows);
  }

  let outcome: BacktestOutcome;
  if (recommendedPlayerId == null) {
    outcome = "no_pick";
  } else {
    const recommendedScore = actualScores[recommendedPlayerId]?.pprPoints ?? 0;
    const otherScores = playerIds
      .filter((id) => id !== recommendedPlayerId)
      .map((id) => actualScores[id]?.pprPoints ?? 0);
    const maxOther = otherScores.length > 0 ? Math.max(...otherScores) : -Infinity;

    if (recommendedScore > maxOther) outcome = "correct";
    else if (recommendedScore === maxOther) outcome = "push";
    else outcome = "incorrect";
  }

  return { actualScores, outcome };
}

export function gradeWeek(
  week: number,
  result: ComparisonResult,
  playerIds: number[],
  targetWeekRows: PlayerGameStat[]
): WeekGradeResult {
  const { actualScores, outcome } = gradeOutcome(result.recommendedPlayerId, playerIds, targetWeekRows);
  return { week, result, actualScores, outcome };
}

export interface BacktestSummary {
  correct: number;
  incorrect: number;
  push: number;
  noPick: number;
  accuracyPct: number | null;
}

/** accuracyPct excludes push/no_pick from its denominator so it stays meaningful. */
export function summarizeOutcomes(outcomes: BacktestOutcome[]): BacktestSummary {
  const summary: BacktestSummary = { correct: 0, incorrect: 0, push: 0, noPick: 0, accuracyPct: null };

  for (const outcome of outcomes) {
    if (outcome === "correct") summary.correct++;
    else if (outcome === "incorrect") summary.incorrect++;
    else if (outcome === "push") summary.push++;
    else summary.noPick++;
  }

  const denom = summary.correct + summary.incorrect;
  summary.accuracyPct = denom > 0 ? (summary.correct / denom) * 100 : null;
  return summary;
}

export function summarize(results: WeekGradeResult[]): BacktestSummary {
  return summarizeOutcomes(results.map((r) => r.outcome));
}

export interface ConfidenceBreakdown {
  confident: BacktestSummary;
  limitedData: BacktestSummary;
  closeCall: BacktestSummary;
}

/**
 * Splits already-graded engine results into three buckets by the
 * engine's own isCloseCall/hasLimitedData flags, so we can check
 * whether those self-reported signals actually correlate with being
 * right more or less often. Originally one combined flag (confident vs.
 * close call) — split into three after backtesting showed a genuinely
 * close score gap (closeCall) and limited/insufficient recent data
 * (limitedData) behave completely differently: the former is close to
 * a coin flip, the latter is historically *more* reliable than a plain
 * "confident" pick. Blending them into one flag was masking that. See
 * CLAUDE.md "Backtesting & Tuning History" items 21-22.
 */
export function summarizeByCloseCall(results: WeekGradeResult[]): ConfidenceBreakdown {
  const confident = results.filter((r) => !r.result.isCloseCall && !r.result.hasLimitedData);
  const limitedData = results.filter((r) => !r.result.isCloseCall && r.result.hasLimitedData);
  const closeCall = results.filter((r) => r.result.isCloseCall);
  return { confident: summarize(confident), limitedData: summarize(limitedData), closeCall: summarize(closeCall) };
}
