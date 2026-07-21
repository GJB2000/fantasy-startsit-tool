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

/**
 * Grades a comparison against what actually happened that week.
 * recommendedPlayerId===null (engine declined — e.g. insufficient early-
 * season data) is "no_pick", not "incorrect": it's expected and common
 * in the first few weeks of a backtest range, mirroring the live
 * engine's own "insufficient data" path unchanged.
 */
export function gradeWeek(
  week: number,
  result: ComparisonResult,
  playerIds: number[],
  targetWeekRows: PlayerGameStat[]
): WeekGradeResult {
  const actualScores: Record<number, ActualScore> = {};
  for (const id of playerIds) {
    actualScores[id] = getActualScore(id, targetWeekRows);
  }

  let outcome: BacktestOutcome;
  if (result.recommendedPlayerId == null) {
    outcome = "no_pick";
  } else {
    const recommendedScore = actualScores[result.recommendedPlayerId]?.pprPoints ?? 0;
    const otherScores = playerIds
      .filter((id) => id !== result.recommendedPlayerId)
      .map((id) => actualScores[id]?.pprPoints ?? 0);
    const maxOther = otherScores.length > 0 ? Math.max(...otherScores) : -Infinity;

    if (recommendedScore > maxOther) outcome = "correct";
    else if (recommendedScore === maxOther) outcome = "push";
    else outcome = "incorrect";
  }

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
export function summarize(results: WeekGradeResult[]): BacktestSummary {
  const summary: BacktestSummary = { correct: 0, incorrect: 0, push: 0, noPick: 0, accuracyPct: null };

  for (const r of results) {
    if (r.outcome === "correct") summary.correct++;
    else if (r.outcome === "incorrect") summary.incorrect++;
    else if (r.outcome === "push") summary.push++;
    else summary.noPick++;
  }

  const denom = summary.correct + summary.incorrect;
  summary.accuracyPct = denom > 0 ? (summary.correct / denom) * 100 : null;
  return summary;
}
