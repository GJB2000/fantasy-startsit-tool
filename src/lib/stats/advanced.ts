import type { AdvancedPlayerGame } from "../sportsdata/advancedMetrics";
import type { StatsPosition } from "./types";

export type MetricFormat = "int" | "rate" | "pct";

export interface AdvancedMetric {
  label: string;
  value: number | null;
  format: MetricFormat;
  /** Set when the number is a mean of per-game rates rather than a season-wide ratio. */
  isAverage?: boolean;
}

export interface AdvancedGameColumn {
  key: keyof AdvancedPlayerGame;
  label: string;
  format: MetricFormat;
}

type Field = keyof AdvancedPlayerGame;

function sum(rows: AdvancedPlayerGame[], field: Field): number {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

/**
 * Mean of a per-game rate. Only correct for team-share style metrics
 * (snap share, target share) where the denominator is that game's team
 * total and we never see it — everything with visible components is
 * derived from season sums instead, which is why `ratio` exists below.
 */
function averageRate(rows: AdvancedPlayerGame[], field: Field): number | null {
  const played = rows.filter((row) => (Number(row.Snaps) || 0) > 0 && row[field] != null);
  if (played.length === 0) return null;
  return played.reduce((total, row) => total + Number(row[field]), 0) / played.length;
}

/** A season-wide ratio from summed components — always preferable to averaging per-game rates. */
function ratio(rows: AdvancedPlayerGame[], numerator: Field, denominator: Field, scale = 1): number | null {
  const bottom = sum(rows, denominator);
  if (bottom === 0) return null;
  return (sum(rows, numerator) / bottom) * scale;
}

function count(rows: AdvancedPlayerGame[], field: Field): number | null {
  const total = sum(rows, field);
  return total === 0 && !rows.some((row) => row[field] != null) ? null : total;
}

/**
 * Season-level advanced summary, per position. Each position gets the
 * usage and efficiency measures its own game is judged by — snap and route
 * volume, how much of the offense runs through the player, and what happens
 * near the end zone.
 */
export function buildAdvancedSummary(
  position: StatsPosition,
  rows: AdvancedPlayerGame[]
): AdvancedMetric[] {
  if (rows.length === 0) return [];
  const snapShare: AdvancedMetric = {
    label: "Snap share",
    value: averageRate(rows, "SnapShare"),
    format: "pct",
    isAverage: true,
  };

  switch (position) {
    case "QB":
      return [
        snapShare,
        { label: "Comp %", value: ratio(rows, "Completions", "PassingAttempts", 100), format: "pct" },
        { label: "Yds / att", value: ratio(rows, "PassingYards", "PassingAttempts"), format: "rate" },
        { label: "Deep attempts", value: count(rows, "DeepBallAttempts"), format: "int" },
        { label: "Deep comps", value: count(rows, "DeepBallCompletions"), format: "int" },
        { label: "Hurries", value: count(rows, "Hurries"), format: "int" },
        { label: "Red-zone att", value: count(rows, "RedZoneAttempts"), format: "int" },
        { label: "Inside-5 att", value: count(rows, "PassAttemptsInside5"), format: "int" },
        { label: "Carries", value: count(rows, "Carries"), format: "int" },
      ];
    case "RB":
      return [
        snapShare,
        { label: "Opp share", value: averageRate(rows, "OpportunityShare"), format: "pct", isAverage: true },
        { label: "Opportunities", value: count(rows, "Opportunities"), format: "int" },
        { label: "Routes run", value: count(rows, "RoutesRun"), format: "int" },
        { label: "RZ touches", value: count(rows, "RedZoneTouches"), format: "int" },
        { label: "Inside-10 car", value: count(rows, "CarriesInside10"), format: "int" },
        { label: "Evaded tackles", value: count(rows, "EvadedTackles"), format: "int" },
        { label: "Yards created", value: count(rows, "YardsCreated"), format: "int" },
        { label: "Yds / touch", value: ratio(rows, "TotalYards", "TotalTouches"), format: "rate" },
      ];
    case "WR":
    case "TE":
      return [
        snapShare,
        { label: "Target share", value: averageRate(rows, "TargetShare"), format: "pct", isAverage: true },
        { label: "Routes run", value: count(rows, "RoutesRun"), format: "int" },
        { label: "Hog rate", value: averageRate(rows, "HogRate"), format: "pct", isAverage: true },
        { label: "Catch rate", value: ratio(rows, "Receptions", "Targets", 100), format: "pct" },
        { label: "Contested tgt", value: count(rows, "ContestedTargets"), format: "int" },
        { label: "Deep targets", value: count(rows, "DeepBallAttempts"), format: "int" },
        { label: "End-zone tgt", value: count(rows, "EndZoneTargets"), format: "int" },
        { label: "Yds / target", value: ratio(rows, "ReceivingYards", "Targets"), format: "rate" },
      ];
    case "K":
      // The feed carries nothing meaningful for kickers.
      return [];
  }
}

/** Advanced columns for the week-by-week log, kept short so the table stays readable. */
export const ADVANCED_GAME_COLUMNS: Record<StatsPosition, AdvancedGameColumn[]> = {
  QB: [
    { key: "SnapShare", label: "SNAP%", format: "pct" },
    { key: "PassingAttempts", label: "ATT", format: "int" },
    { key: "CompletionPercentage", label: "CMP%", format: "pct" },
    { key: "DeepBallAttempts", label: "DEEP", format: "int" },
    { key: "Hurries", label: "HUR", format: "int" },
    { key: "RedZoneAttempts", label: "RZ ATT", format: "int" },
    { key: "Carries", label: "CAR", format: "int" },
  ],
  RB: [
    { key: "SnapShare", label: "SNAP%", format: "pct" },
    { key: "OpportunityShare", label: "OPP%", format: "pct" },
    { key: "RoutesRun", label: "RTS", format: "int" },
    { key: "RedZoneTouches", label: "RZ TCH", format: "int" },
    { key: "CarriesInside10", label: "IN-10", format: "int" },
    { key: "EvadedTackles", label: "EVD", format: "int" },
    { key: "YardsCreated", label: "YDS CR", format: "int" },
  ],
  WR: [
    { key: "SnapShare", label: "SNAP%", format: "pct" },
    { key: "TargetShare", label: "TGT%", format: "pct" },
    { key: "RoutesRun", label: "RTS", format: "int" },
    { key: "HogRate", label: "HOG%", format: "pct" },
    { key: "ContestedTargets", label: "CTST", format: "int" },
    { key: "DeepBallAttempts", label: "DEEP", format: "int" },
    { key: "RedZoneTargets", label: "RZ TGT", format: "int" },
  ],
  TE: [
    { key: "SnapShare", label: "SNAP%", format: "pct" },
    { key: "TargetShare", label: "TGT%", format: "pct" },
    { key: "RoutesRun", label: "RTS", format: "int" },
    { key: "HogRate", label: "HOG%", format: "pct" },
    { key: "ContestedTargets", label: "CTST", format: "int" },
    { key: "EndZoneTargets", label: "EZ TGT", format: "int" },
    { key: "RedZoneTargets", label: "RZ TGT", format: "int" },
  ],
  K: [],
};

export function formatMetric(value: number | null | undefined, format: MetricFormat): string {
  if (value == null) return "—";
  switch (format) {
    case "int":
      return String(Math.round(value));
    case "rate":
      return value.toFixed(1);
    case "pct":
      return `${value.toFixed(1)}%`;
  }
}
