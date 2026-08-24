import type { StatTotals, StatsPosition } from "./types";

export interface StatColumn {
  key: keyof StatTotals;
  label: string;
}

/**
 * The stat line each position is actually measured by. Shared by the
 * leaderboard and the game log so the two can't drift apart — a table that
 * showed every column for every position would be mostly zeros (a WR has no
 * pass attempts, a kicker has no targets).
 */
export const STAT_COLUMNS: Record<StatsPosition, StatColumn[]> = {
  QB: [
    { key: "passCompletions", label: "CMP" },
    { key: "passAttempts", label: "ATT" },
    { key: "passYards", label: "PASS YDS" },
    { key: "passTouchdowns", label: "TD" },
    { key: "passInterceptions", label: "INT" },
    { key: "rushAttempts", label: "RUSH" },
    { key: "rushYards", label: "RUSH YDS" },
    { key: "rushTouchdowns", label: "RUSH TD" },
  ],
  RB: [
    { key: "rushAttempts", label: "ATT" },
    { key: "rushYards", label: "RUSH YDS" },
    { key: "rushTouchdowns", label: "RUSH TD" },
    { key: "targets", label: "TGT" },
    { key: "receptions", label: "REC" },
    { key: "receivingYards", label: "REC YDS" },
    { key: "receivingTouchdowns", label: "REC TD" },
    { key: "fumblesLost", label: "FL" },
  ],
  WR: [
    { key: "targets", label: "TGT" },
    { key: "receptions", label: "REC" },
    { key: "receivingYards", label: "YDS" },
    { key: "receivingTouchdowns", label: "TD" },
    { key: "rushAttempts", label: "RUSH" },
    { key: "rushYards", label: "RUSH YDS" },
    { key: "fumblesLost", label: "FL" },
  ],
  TE: [
    { key: "targets", label: "TGT" },
    { key: "receptions", label: "REC" },
    { key: "receivingYards", label: "YDS" },
    { key: "receivingTouchdowns", label: "TD" },
    { key: "fumblesLost", label: "FL" },
  ],
  K: [
    { key: "fieldGoalsMade", label: "FGM" },
    { key: "fieldGoalsAttempted", label: "FGA" },
    { key: "fieldGoalsMade50Plus", label: "50+" },
    { key: "extraPointsMade", label: "XPM" },
    { key: "extraPointsAttempted", label: "XPA" },
  ],
};

export function formatStat(value: number, decimals = 0) {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

// ---------------------------------------------------------------------------
// Table columns for the leaderboard.
//
// A column is a function of the row rather than a plain key, so derived rates
// (catch %, yards per target) sit alongside stored ones without a second
// mechanism — and sorting works on both because it reads through the same
// accessor.
// ---------------------------------------------------------------------------

import type { LeaderboardRow } from "./types";

export interface TableColumn {
  id: string;
  label: string;
  value: (row: LeaderboardRow) => number | null;
  decimals?: number;
  suffix?: string;
}

/** Guarded division — a zero denominator is "no data", not zero. */
const per = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : null;
const pct = (numerator: number, denominator: number) =>
  denominator > 0 ? (numerator / denominator) * 100 : null;

const SHARE_COLUMNS: Record<"snap" | "target" | "air", TableColumn> = {
  snap: { id: "snapShare", label: "SNAP%", value: (r) => r.snapShare, decimals: 1, suffix: "%" },
  target: { id: "targetShare", label: "TGT%", value: (r) => r.targetShare, decimals: 1, suffix: "%" },
  air: { id: "airYardsShare", label: "AY%", value: (r) => r.airYardsShare, decimals: 1, suffix: "%" },
};

const LEAD: TableColumn[] = [
  { id: "points", label: "PTS", value: (r) => r.points, decimals: 1 },
  { id: "pointsPerGame", label: "PPG", value: (r) => r.pointsPerGame, decimals: 1 },
  { id: "games", label: "G", value: (r) => r.games },
];

export function standardColumns(position: StatsPosition): TableColumn[] {
  return [
    ...LEAD,
    ...STAT_COLUMNS[position].map((col) => ({
      id: col.key,
      label: col.label,
      value: (row: LeaderboardRow) => row[col.key],
    })),
  ];
}

/**
 * Usage shares (nflverse) plus efficiency rates derived from the counting
 * stats already on the row — the second half needs no extra data, it just
 * isn't worth showing next to the raw totals.
 */
export function advancedColumns(position: StatsPosition): TableColumn[] {
  switch (position) {
    case "QB":
      return [
        ...LEAD,
        SHARE_COLUMNS.snap,
        { id: "cmpPct", label: "CMP%", value: (r) => pct(r.passCompletions, r.passAttempts), decimals: 1, suffix: "%" },
        { id: "ypa", label: "Y/A", value: (r) => per(r.passYards, r.passAttempts), decimals: 2 },
        { id: "tdPct", label: "TD%", value: (r) => pct(r.passTouchdowns, r.passAttempts), decimals: 1, suffix: "%" },
        { id: "intPct", label: "INT%", value: (r) => pct(r.passInterceptions, r.passAttempts), decimals: 1, suffix: "%" },
        { id: "rushYpc", label: "RUSH Y/C", value: (r) => per(r.rushYards, r.rushAttempts), decimals: 2 },
      ];
    case "RB":
      return [
        ...LEAD,
        SHARE_COLUMNS.snap,
        SHARE_COLUMNS.target,
        { id: "ypc", label: "Y/CAR", value: (r) => per(r.rushYards, r.rushAttempts), decimals: 2 },
        {
          id: "ypt",
          label: "Y/TCH",
          value: (r) => per(r.rushYards + r.receivingYards, r.rushAttempts + r.receptions),
          decimals: 2,
        },
        { id: "catchPct", label: "CATCH%", value: (r) => pct(r.receptions, r.targets), decimals: 1, suffix: "%" },
        { id: "totalTd", label: "TOT TD", value: (r) => r.rushTouchdowns + r.receivingTouchdowns },
      ];
    case "WR":
    case "TE":
      return [
        ...LEAD,
        SHARE_COLUMNS.snap,
        SHARE_COLUMNS.target,
        SHARE_COLUMNS.air,
        { id: "catchPct", label: "CATCH%", value: (r) => pct(r.receptions, r.targets), decimals: 1, suffix: "%" },
        { id: "ypTarget", label: "Y/TGT", value: (r) => per(r.receivingYards, r.targets), decimals: 2 },
        { id: "ypRec", label: "Y/REC", value: (r) => per(r.receivingYards, r.receptions), decimals: 2 },
      ];
    case "K":
      // No snap or target share for kickers; the rates are what matter.
      return [
        ...LEAD,
        { id: "fgPct", label: "FG%", value: (r) => pct(r.fieldGoalsMade, r.fieldGoalsAttempted), decimals: 1, suffix: "%" },
        { id: "xpPct", label: "XP%", value: (r) => pct(r.extraPointsMade, r.extraPointsAttempted), decimals: 1, suffix: "%" },
        { id: "fg50", label: "50+", value: (r) => r.fieldGoalsMade50Plus },
        { id: "fgaPerGame", label: "FGA/G", value: (r) => per(r.fieldGoalsAttempted, r.games), decimals: 2 },
      ];
  }
}

export function formatColumn(value: number | null, column: TableColumn): string {
  if (value == null) return "—";
  const base = column.decimals ? value.toFixed(column.decimals) : String(Math.round(value));
  return column.suffix ? `${base}${column.suffix}` : base;
}
