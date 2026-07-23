import { getInjuryReports } from "@/lib/nflverse/injuries";
import { getNgsPassing, getNgsReceiving, getNgsRushing } from "@/lib/nflverse/nextGenStats";
import { getRedZoneTouches } from "@/lib/nflverse/playByPlay";
import { buildSdioPlayerIdByNormalizedName } from "@/lib/nflverse/playerMatch";
import { getPlayerWeekStats } from "@/lib/nflverse/playerStats";
import { getSnapCounts } from "@/lib/nflverse/snapCounts";
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
      load("snap counts", () => getSnapCounts(season)),
      load("player week stats", () => getPlayerWeekStats(season)),
      load("NGS passing", () => getNgsPassing(season)),
      load("NGS receiving", () => getNgsReceiving(season)),
      load("NGS rushing", () => getNgsRushing(season)),
      load("injury reports", () => getInjuryReports(season)),
      load("red zone touches", () => getRedZoneTouches(season)),
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
