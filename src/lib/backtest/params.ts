import {
  EXTENDED_POSITIONS,
  SKILL_POSITIONS,
  isExtendedPosition,
  isSkillPosition,
  type ExtendedPosition,
  type SkillPosition,
} from "@/lib/sportsdata/types";
import { MAX_BACKTEST_WEEK } from "./config";

/** Accepts a "1-18" range or a "3,5,9" comma list; clamps to 1..maxWeek. */
export function parseWeeksParam(raw: string | null, maxWeek: number = MAX_BACKTEST_WEEK): number[] {
  if (!raw) return Array.from({ length: maxWeek }, (_, i) => i + 1);

  const trimmed = raw.trim();
  const rangeMatch = trimmed.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = Math.max(1, parseInt(rangeMatch[1], 10));
    const end = Math.min(maxWeek, parseInt(rangeMatch[2], 10));
    if (start > end) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  const weeks = trimmed
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= maxWeek);

  return Array.from(new Set(weeks)).sort((a, b) => a - b);
}

export function parsePositionsParam(raw: string | null): SkillPosition[] {
  if (!raw) return [...SKILL_POSITIONS];

  const requested = raw.split(",").map((s) => s.trim().toUpperCase());
  const valid = requested.filter(isSkillPosition);
  return valid.length > 0 ? valid : [...SKILL_POSITIONS];
}

/**
 * DST/K-aware version, used only by /api/backtest/broad — the one
 * route with real D/ST and K backtest support (see loadRun.ts/
 * runBacktest.ts). Deliberately NOT used by the nflverse-only
 * (*-nflverse*) or trade-backtest routes, which stay skill-only
 * (parsePositionsParam above) since neither pipeline has D/ST/K
 * data or scoring wired in.
 */
export function parseExtendedPositionsParam(raw: string | null): ExtendedPosition[] {
  if (!raw) return [...EXTENDED_POSITIONS];

  const requested = raw.split(",").map((s) => s.trim().toUpperCase());
  const valid = requested.filter(isExtendedPosition);
  return valid.length > 0 ? valid : [...EXTENDED_POSITIONS];
}
