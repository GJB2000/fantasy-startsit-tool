export interface SnapCountRow {
  season: number;
  week: number;
  player: string;
  position: string;
  team: string;
  offensePct: number;
}

export interface PlayerWeekStatRow {
  season: number;
  week: number;
  playerDisplayName: string;
  position: string;
  team: string;
  targets: number;
  targetShare: number | null;
  airYardsShare: number | null;
}

export interface NgsPassingRow {
  season: number;
  week: number;
  playerDisplayName: string;
  team: string;
  completionPercentageAboveExpectation: number | null;
  aggressiveness: number | null;
}

export interface NgsReceivingRow {
  season: number;
  week: number;
  playerDisplayName: string;
  team: string;
  avgSeparation: number | null;
  avgYacAboveExpectation: number | null;
}

export interface NgsRushingRow {
  season: number;
  week: number;
  playerDisplayName: string;
  team: string;
  rushYardsOverExpectedPerAtt: number | null;
}

export interface InjuryReportRow {
  season: number;
  week: number;
  playerDisplayName: string;
  team: string;
  /** "Questionable" | "Doubtful" | "Out" — a blank/missing row means the player wasn't on that week's injury report at all. */
  reportStatus: string;
}

export interface RedZoneTouchRow {
  season: number;
  week: number;
  playerDisplayName: string;
  redZoneRushAttempts: number;
  redZoneTargets: number;
  /** Same shape, tighter yardline_100<=5 cutoff — see playByPlay.ts. */
  goalLineRushAttempts: number;
  goalLineTargets: number;
  /**
   * EPA-per-play and success rate, position-scoped by role (rush
   * attempts for RB, dropbacks — passes+sacks+scrambles — for QB,
   * targets for WR/TE), already averaged to a per-week rate (null if the
   * player had no qualifying plays that week) — same shape as every
   * other per-week rate field in NflverseWeekStat, unlike the red/goal
   * zone raw counts above. See playByPlay.ts and CLAUDE.md's unused-data
   * audit follow-up.
   */
  rushEpaPerPlay: number | null;
  rushSuccessRate: number | null;
  qbEpaPerDropback: number | null;
  qbSuccessRate: number | null;
  recEpaPerTarget: number | null;
  recSuccessRate: number | null;
  /** FTN Charting, target-scoped (WR/TE) — see ftnCharting.ts/playByPlay.ts. */
  dropRate: number | null;
  createdReceptionRate: number | null;
}
