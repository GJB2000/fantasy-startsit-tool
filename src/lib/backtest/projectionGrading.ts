export interface ProjectionGradeResult {
  week: number;
  playerId: number;
  position: string;
  predicted: number;
  actual: number;
  error: number;
}

export interface ProjectionSummary {
  n: number;
  /** Mean absolute error — the headline "how many points off, on average" number. */
  mae: number | null;
  /** Root mean squared error — penalizes large individual misses more than MAE does. */
  rmse: number | null;
  /** Mean signed error (predicted - actual) — positive means the model systematically over-projects, negative means it under-projects. */
  bias: number | null;
}

/**
 * Pure aggregation over already-graded projection results — mirrors
 * grading.ts's summarizeOutcomes shape/discipline (a plain reusable
 * summarizer, not duplicated per call site) but for continuous error
 * instead of correct/incorrect/push/no_pick, since "how good is the
 * model at projecting points" is a magnitude question, not a binary
 * pick-accuracy one.
 */
export function summarizeProjectionErrors(results: ProjectionGradeResult[]): ProjectionSummary {
  const n = results.length;
  if (n === 0) return { n: 0, mae: null, rmse: null, bias: null };

  let sumAbs = 0;
  let sumSquared = 0;
  let sumSigned = 0;
  for (const r of results) {
    sumAbs += Math.abs(r.error);
    sumSquared += r.error * r.error;
    sumSigned += r.error;
  }

  return {
    n,
    mae: sumAbs / n,
    rmse: Math.sqrt(sumSquared / n),
    bias: sumSigned / n,
  };
}
