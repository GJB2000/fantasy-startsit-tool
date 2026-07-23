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
}
