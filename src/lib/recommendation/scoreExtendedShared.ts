import { RECENT_WEIGHT_BASE, RECENT_WEIGHT_MAX, RECENT_WEIGHT_PER_GAME } from "./config";
import type { DataQuality, PlayerScoreBreakdown } from "./types";

/** Same "couldn't be matched" shape scorePlayer() produces for a skill-position miss (see buildInput.ts's player-null branch) — used by the D/ST and K routing in /api/compare, /api/trade, /api/waivers so a bad ID degrades the same way regardless of position family. */
export function notFoundBreakdown(label: string): PlayerScoreBreakdown {
  return {
    playerId: null,
    displayName: label,
    position: null,
    team: null,
    recentPprAvg: null,
    recentPprFloor: null,
    recentPprCeiling: null,
    seasonPprAvg: null,
    gamesUsedForRecent: 0,
    blendedScore: null,
    matchupModifier: 0,
    finalScore: null,
    injuryStatus: null,
    isOnByeThisWeek: false,
    nextOpponent: null,
    nextGameWeather: null,
    dataQuality: "insufficient",
    notes: [],
    ...skillFieldDefaults(),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Same recent-vs-season blend shape scorePlayer() uses for skill
 * positions (RECENT_WEIGHT_BASE/PER_GAME/MAX from config.ts) — reused
 * as-is rather than a second, differently-tuned formula, since "how
 * much should recent form outweigh season-long average" isn't a
 * position-specific question.
 */
export function blendRecentAndSeason(
  recentAvg: number | null,
  seasonAvg: number | null,
  gamesUsedForRecent: number
): number | null {
  if (recentAvg != null && seasonAvg != null) {
    const recentWeight = clamp(
      RECENT_WEIGHT_BASE + RECENT_WEIGHT_PER_GAME * gamesUsedForRecent,
      RECENT_WEIGHT_BASE,
      RECENT_WEIGHT_MAX
    );
    return recentWeight * recentAvg + (1 - recentWeight) * seasonAvg;
  }
  return recentAvg ?? seasonAvg ?? null;
}

export function dataQualityFor(blendedScore: number | null, gamesUsedForRecent: number, recentWeekCount: number): DataQuality {
  if (blendedScore == null) return "insufficient";
  return gamesUsedForRecent < recentWeekCount ? "limited" : "full";
}

/**
 * D/ST and K have none of the skill-position signals (volume, snap
 * share, red-zone touches, QB rushing, drop rate, target share/
 * separation, teammate-out bump) — every one of those fields is
 * required on PlayerScoreBreakdown (shared with ComparisonResult.tsx/
 * TradeResult.tsx/WaiverResult.tsx, which already render conditionally
 * on `!= null`), so this fills them all with their inert defaults in
 * one place rather than repeating the same block in both
 * scoreDefense.ts and scoreKicker.ts.
 */
export function skillFieldDefaults(): Omit<
  PlayerScoreBreakdown,
  | "playerId"
  | "displayName"
  | "position"
  | "team"
  | "recentPprAvg"
  | "recentPprFloor"
  | "recentPprCeiling"
  | "seasonPprAvg"
  | "gamesUsedForRecent"
  | "blendedScore"
  | "matchupModifier"
  | "finalScore"
  | "injuryStatus"
  | "isOnByeThisWeek"
  | "nextOpponent"
  | "nextGameWeather"
  | "dataQuality"
  | "notes"
> {
  return {
    seasonTotalPoints: null,
    recentVolumeAvg: null,
    volumeModifier: 0,
    redZoneTouchesAvg: null,
    redZoneModifier: 0,
    snapShareAvg: null,
    snapShareModifier: 0,
    recentQbRushAttemptsAvg: null,
    qbRushModifier: 0,
    goalLineTouchesAvg: null,
    qbGoalLineModifier: 0,
    successRateAvg: null,
    qbSuccessRateModifier: 0,
    epaPerPlayAvg: null,
    rbEpaModifier: 0,
    dropRateAvg: null,
    dropRateModifier: 0,
    airYardsShareAvg: null,
    airYardsModifier: 0,
    qbRushEpaAvg: null,
    qbRushEpaModifier: 0,
    teammateOutBumpModifier: 0,
    expertConsensusR2pPts: null,
    expertConsensusModifier: 0,
    targetShare: null,
    separation: null,
    matchupContext: null,
  };
}
