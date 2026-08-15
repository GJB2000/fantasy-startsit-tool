import {
  getInjuryReports,
  getNgsPassingCached,
  getNgsReceivingCached,
  getNgsRushingCached,
  getPlayerWeekStatsCached,
  getRedZoneTouchesCached,
  getSnapCountsCached,
  withColdTimeout,
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
 *
 * `redZoneTimeoutMs` (set by the Start/Sit compare route) timeout-guards the
 * single heaviest fetch here — the full play-by-play parse for red-zone
 * touches — so a cold cache doesn't block the request on it; the real parse
 * finishes in the background and warms the cache (see withColdTimeout). If it
 * times out, the table is built without the play-by-play signals (WR drop-rate
 * and the already-zero-weighted red-zone/EPA terms), degrading exactly like a
 * red-zone fetch failure already does.
 */
export async function getLiveNflversePlayerWeekTable(
  season: number,
  opts?: { redZoneTimeoutMs?: number }
): Promise<NflversePlayerWeekTable> {
  function load<T>(label: string, fetch: () => Promise<T[]>): Promise<T[]> {
    return fetch().catch((err) => {
      console.error(`Failed to load nflverse ${label} (live):`, err);
      return [];
    });
  }

  const redZoneRaw = load("red zone touches", () => getRedZoneTouchesCached(season));
  const redZonePromise =
    opts?.redZoneTimeoutMs != null
      ? withColdTimeout(redZoneRaw, opts.redZoneTimeoutMs, [] as Awaited<typeof redZoneRaw>)
      : redZoneRaw;

  const [allPlayers, snapCounts, playerWeekStats, ngsPassing, ngsReceiving, ngsRushing, injuryReports, redZoneTouches] =
    await Promise.all([
      getAllPlayers(),
      load("snap counts", () => getSnapCountsCached(season)),
      load("player week stats", () => getPlayerWeekStatsCached(season)),
      load("NGS passing", () => getNgsPassingCached(season)),
      load("NGS receiving", () => getNgsReceivingCached(season)),
      load("NGS rushing", () => getNgsRushingCached(season)),
      load("injury reports", () => getInjuryReports(season)),
      redZonePromise,
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
