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
