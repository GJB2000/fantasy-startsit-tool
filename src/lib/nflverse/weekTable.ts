import { normalizePlayerName } from "./playerMatch";
import type {
  InjuryReportRow,
  NgsPassingRow,
  NgsReceivingRow,
  NgsRushingRow,
  PlayerWeekStatRow,
  RedZoneTouchRow,
  SnapCountRow,
} from "./types";

export interface NflverseWeekStat {
  week: number;
  offensePct: number | null;
  targetShare: number | null;
  airYardsShare: number | null;
  completionPercentageAboveExpectation: number | null;
  aggressiveness: number | null;
  avgSeparation: number | null;
  avgYacAboveExpectation: number | null;
  rushYardsOverExpectedPerAtt: number | null;
  /** "Questionable" | "Doubtful" | "Out" | null (no injury report that week). Not part of the recent-weeks averaging the other fields get — this is a current-week fact, looked up directly via weekData.ts's nflverseStatForWeek(). */
  injuryStatus: string | null;
  /** Real zeros are meaningful here (played, zero red-zone touches) — see playByPlay.ts. Left null only when the player has no PlayerGameStat row for that week at all. */
  redZoneRushAttempts: number | null;
  redZoneTargets: number | null;
}

export interface NflverseSourceRows {
  snapRows: SnapCountRow[];
  statRows: PlayerWeekStatRow[];
  ngsPassingRows: NgsPassingRow[];
  ngsReceivingRows: NgsReceivingRow[];
  ngsRushingRows: NgsRushingRow[];
  injuryRows: InjuryReportRow[];
  redZoneRows: RedZoneTouchRow[];
}

/**
 * Joins every nflverse source onto SportsDataIO PlayerIDs (via the name
 * map from playerMatch.ts) into one PlayerID -> week -> stat table, so
 * the backtest can look up a player's per-week opportunity/efficiency
 * metrics the same way it already looks up PlayerGameStat rows.
 */
export function buildNflversePlayerWeekTable(
  sources: NflverseSourceRows,
  sdioPlayerIdByNormalizedName: Map<string, number>
): Map<number, Map<number, NflverseWeekStat>> {
  const table = new Map<number, Map<number, NflverseWeekStat>>();

  function getOrCreate(playerId: number, week: number): NflverseWeekStat {
    let byWeek = table.get(playerId);
    if (!byWeek) {
      byWeek = new Map();
      table.set(playerId, byWeek);
    }
    let stat = byWeek.get(week);
    if (!stat) {
      stat = {
        week,
        offensePct: null,
        targetShare: null,
        airYardsShare: null,
        completionPercentageAboveExpectation: null,
        aggressiveness: null,
        avgSeparation: null,
        avgYacAboveExpectation: null,
        rushYardsOverExpectedPerAtt: null,
        injuryStatus: null,
        redZoneRushAttempts: null,
        redZoneTargets: null,
      };
      byWeek.set(week, stat);
    }
    return stat;
  }

  function playerIdFor(name: string): number | undefined {
    return sdioPlayerIdByNormalizedName.get(normalizePlayerName(name));
  }

  for (const row of sources.snapRows) {
    const playerId = playerIdFor(row.player);
    if (playerId == null) continue;
    getOrCreate(playerId, row.week).offensePct = row.offensePct;
  }

  for (const row of sources.statRows) {
    const playerId = playerIdFor(row.playerDisplayName);
    if (playerId == null) continue;
    const stat = getOrCreate(playerId, row.week);
    stat.targetShare = row.targetShare;
    stat.airYardsShare = row.airYardsShare;
  }

  for (const row of sources.ngsPassingRows) {
    const playerId = playerIdFor(row.playerDisplayName);
    if (playerId == null) continue;
    const stat = getOrCreate(playerId, row.week);
    stat.completionPercentageAboveExpectation = row.completionPercentageAboveExpectation;
    stat.aggressiveness = row.aggressiveness;
  }

  for (const row of sources.ngsReceivingRows) {
    const playerId = playerIdFor(row.playerDisplayName);
    if (playerId == null) continue;
    const stat = getOrCreate(playerId, row.week);
    stat.avgSeparation = row.avgSeparation;
    stat.avgYacAboveExpectation = row.avgYacAboveExpectation;
  }

  for (const row of sources.ngsRushingRows) {
    const playerId = playerIdFor(row.playerDisplayName);
    if (playerId == null) continue;
    getOrCreate(playerId, row.week).rushYardsOverExpectedPerAtt = row.rushYardsOverExpectedPerAtt;
  }

  for (const row of sources.injuryRows) {
    const playerId = playerIdFor(row.playerDisplayName);
    if (playerId == null) continue;
    getOrCreate(playerId, row.week).injuryStatus = row.reportStatus;
  }

  for (const row of sources.redZoneRows) {
    const playerId = playerIdFor(row.playerDisplayName);
    if (playerId == null) continue;
    const stat = getOrCreate(playerId, row.week);
    stat.redZoneRushAttempts = row.redZoneRushAttempts;
    stat.redZoneTargets = row.redZoneTargets;
  }

  return table;
}
