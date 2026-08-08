import {
  getInjuryReports,
  getNgsPassingCached,
  getNgsReceivingCached,
  getNgsRushingCached,
  getPlayerWeekStatsCached,
  getRedZoneTouchesCached,
  getSnapCountsCached,
} from "@/lib/cache/liveAggregates";
import { buildSdioPlayerIdByNormalizedName } from "@/lib/nflverse/playerMatch";
import { buildNflversePlayerWeekTable, type NflverseWeekStat } from "@/lib/nflverse/weekTable";
import { getAllPlayers } from "@/lib/sportsdata/players";

export type NflversePlayerWeekTable = Map<number, Map<number, NflverseWeekStat>>;

/**
 * Live-mode equivalent of backtest/loadRun.ts's nflverse fetch — builds
 * the same PlayerID -> week -> stat table for the current season,
 * fetched once per request and shared across every player in a
 * comparison (mirrors how positionDefenseTable is fetched once in the
 * route and passed to each buildComparisonInput call). A source failure
 * degrades to an empty table (all-null nflverse signals) rather than
 * failing the whole comparison — nflverse is a third-party trial
 * source, not the primary data path (see Data Source Notes).
 */
export async function getLiveNflversePlayerWeekTable(season: number): Promise<NflversePlayerWeekTable> {
  function load<T>(label: string, fetch: () => Promise<T[]>): Promise<T[]> {
    return fetch().catch((err) => {
      console.error(`Failed to load nflverse ${label} (live):`, err);
      return [];
    });
  }

  const [allPlayers, snapCounts, playerWeekStats, ngsPassing, ngsReceiving, ngsRushing, injuryReports, redZoneTouches] =
    await Promise.all([
      getAllPlayers(),
      load("snap counts", () => getSnapCountsCached(season)),
      load("player week stats", () => getPlayerWeekStatsCached(season)),
      load("NGS passing", () => getNgsPassingCached(season)),
      load("NGS receiving", () => getNgsReceivingCached(season)),
      load("NGS rushing", () => getNgsRushingCached(season)),
      load("injury reports", () => getInjuryReports(season)),
      load("red zone touches", () => getRedZoneTouchesCached(season)),
    ]);

  return buildNflversePlayerWeekTable(
    {
      snapRows: snapCounts,
      statRows: playerWeekStats,
      ngsPassingRows: ngsPassing,
      ngsReceivingRows: ngsReceiving,
      ngsRushingRows: ngsRushing,
      injuryRows: injuryReports,
      redZoneRows: redZoneTouches,
    },
    buildSdioPlayerIdByNormalizedName(allPlayers)
  );
}
