import { getVolumeStat } from "@/lib/recommendation/volume";
import type { BacktestWeekSlice } from "./weekData";

export type BaselineId = "priorWeek" | "seasonAvg" | "recentVolume" | "gameScript";

export const BASELINE_LABELS: Record<BaselineId, string> = {
  priorWeek: "Prior week's points",
  seasonAvg: "Season-to-date average",
  recentVolume: "Recent volume (targets/touches/attempts)",
  gameScript: "Team pace/game script (recent pass or rush rate)",
};

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Naive baseline: pick whoever scored more PPR points in the single
 * most recent prior week. Null (no pick) if either player has no game
 * in that window yet, or if they're tied — same "no signal" handling
 * the real engine uses for insufficient data, so baseline and engine
 * are graded by identical rules.
 */
export function pickPriorWeek(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const scores = playerIds.map((id) => weekSlice.recentGamesByPlayer(id).at(-1)?.FantasyPointsPPR ?? null);
  if (scores[0] == null || scores[1] == null || scores[0] === scores[1]) return null;
  return scores[0] > scores[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever has the higher season-to-date PPR
 * average (through the prior week only — same point-in-time rule the
 * real engine follows, never full-season hindsight).
 */
export function pickSeasonAvg(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const avgs = playerIds.map((id) => {
    const stat = weekSlice.seasonToDateTable.get(id);
    return stat && stat.Played > 0 ? stat.FantasyPointsPPR / stat.Played : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever has averaged more recent volume
 * (targets/touches/attempts, position-specific — see volume.ts) over
 * the same recent-weeks window the engine uses. Volume is a more
 * stable predictor than raw points, which are inflated by touchdown
 * variance.
 */
export function pickByRecentVolume(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const avgs = playerIds.map((id) => {
    const values = weekSlice
      .recentGamesByPlayer(id)
      .map(getVolumeStat)
      .filter((v): v is number => v != null);
    return values.length > 0 ? average(values) : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever's team offers more of the play type
 * relevant to their position — recent pass plays/game (playsPerGame *
 * passRate) for QB/WR/TE, recent rush plays/game (playsPerGame *
 * (1 - passRate)) for RB. Team/position are read from the player's own
 * most recent game row (schedule/roster facts, not stat leakage), pace
 * is computed only from prior weeks (see weekData.ts). Tests the
 * hypothesis that a team's play-calling tendency/pace is a legitimate,
 * non-leaky proxy for opportunity independent of any one player's
 * individual usage.
 */
export function pickByGameScript(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const scores = playerIds.map((id) => {
    const lastGame = weekSlice.recentGamesByPlayer(id).at(-1);
    if (!lastGame) return null;
    const pace = weekSlice.teamPaceTable.get(lastGame.Team);
    if (!pace) return null;
    const relevantRate = lastGame.Position === "RB" ? 1 - pace.passRate : pace.passRate;
    return pace.playsPerGame * relevantRate;
  });
  if (scores[0] == null || scores[1] == null || scores[0] === scores[1]) return null;
  return scores[0] > scores[1] ? playerIds[0] : playerIds[1];
}

export const BASELINE_PICKERS: Record<
  BaselineId,
  (weekSlice: BacktestWeekSlice, playerIds: [number, number]) => number | null
> = {
  priorWeek: pickPriorWeek,
  seasonAvg: pickSeasonAvg,
  recentVolume: pickByRecentVolume,
  gameScript: pickByGameScript,
};
