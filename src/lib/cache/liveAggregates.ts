import "server-only";
import { unstable_cache } from "next/cache";
import { getInjuryReports } from "@/lib/nflverse/injuries";
import { getNgsPassing, getNgsReceiving, getNgsRushing } from "@/lib/nflverse/nextGenStats";
import { getRedZoneTouches } from "@/lib/nflverse/playByPlay";
import { getPlayerWeekStats } from "@/lib/nflverse/playerStats";
import { getSnapCounts } from "@/lib/nflverse/snapCounts";
import { getCurrentDepthChartRankByNormalizedName } from "@/lib/nflverse/depthCharts";
import {
  getGameWeatherByTeamWeek,
  getImpliedTeamTotalsByTeamWeek,
  getRemainingOpponentsByTeam,
  type GameWeather,
  type RemainingGame,
} from "@/lib/nflverse/schedules";
import { getPositionDefenseTable, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import type { ScoringFormat } from "@/lib/sportsdata/types";

/**
 * Persistent read-through cache for the live tools' slow-changing,
 * expensive-to-parse data, backed by Next.js's Data Cache (unstable_cache)
 * — which, unlike the per-process in-memory Map in client.ts, is shared
 * across serverless cold starts on Vercel. This is the item-125 latency
 * fix: the underlying getters parse multi-MB nflverse files (~10-13s cold
 * for the play-by-play and depth-chart releases); their AGGREGATED outputs
 * are small, so caching the output makes every request after the first
 * post-revalidate one fast, everywhere.
 *
 * ACCURACY-NEUTRAL by construction: this only caches the exact same values
 * the getters already return (verified byte-identical), and the data is
 * finalized/immutable once a week's games are played. The backtest never
 * calls these wrappers (it uses its own loaders), so backtested accuracy
 * is untouched. Deliberately does NOT wrap the game-day-volatile sources
 * (injuries, FantasyPros consensus) — those stay live for freshness.
 *
 * 24h revalidate matches the getters' own in-process TTL; Vercel serves
 * the stale value while refreshing in the background, so users effectively
 * never eat the cold parse after the first population.
 */
const REVALIDATE = 24 * 60 * 60;

type Row = Record<string, unknown>;
interface Columnar {
  k: string[];
  r: unknown[][];
}

/** Columnar encoding — keys once + rows as value-arrays — so a large array
 * of uniform objects serializes well under Next's ~2MB Data Cache entry
 * limit (repeating JSON keys per row is what pushes stats_player /
 * snap_counts just over 2MB otherwise). */
function encode(rows: object[]): Columnar {
  if (rows.length === 0) return { k: [], r: [] };
  const k = Object.keys(rows[0]);
  return { k, r: rows.map((row) => k.map((key) => (row as Row)[key])) };
}
function decode<T>(enc: Columnar): T[] {
  return enc.r.map((vals) => {
    const o: Row = {};
    enc.k.forEach((key, i) => (o[key] = vals[i]));
    return o as T;
  });
}

/** Wrap a season-keyed array getter with a columnar-encoded persistent cache. */
function cachedArray<T extends object>(prefix: string, getter: (season: number) => Promise<T[]>) {
  const enc = unstable_cache(async (season: number) => encode(await getter(season)), [`agg:${prefix}`], {
    revalidate: REVALIDATE,
  });
  return async (season: number): Promise<T[]> => decode<T>(await enc(season));
}

/** Wrap a season-keyed Map getter (entries survive JSON; Map does not). */
function cachedMap<V>(prefix: string, getter: (season: number) => Promise<Map<string, V>>) {
  const enc = unstable_cache(async (season: number) => [...(await getter(season)).entries()], [`agg:${prefix}`], {
    revalidate: REVALIDATE,
  });
  return async (season: number): Promise<Map<string, V>> => new Map<string, V>(await enc(season));
}

// --- Cached variants used by the live routes (see nflverseLive.ts / the API routes). ---

export const getRedZoneTouchesCached = cachedArray("redZone", getRedZoneTouches);
export const getPlayerWeekStatsCached = cachedArray("playerWeekStats", getPlayerWeekStats);
export const getSnapCountsCached = cachedArray("snapCounts", getSnapCounts);
export const getNgsPassingCached = cachedArray("ngsPassing", getNgsPassing);
export const getNgsReceivingCached = cachedArray("ngsReceiving", getNgsReceiving);
export const getNgsRushingCached = cachedArray("ngsRushing", getNgsRushing);

export const getDepthChartRankCached = cachedMap<number>("depthRank", getCurrentDepthChartRankByNormalizedName);
export const getGameWeatherCached = cachedMap<GameWeather>("weather", getGameWeatherByTeamWeek);
export const getImpliedTotalsCached = cachedMap<number>("impliedTotals", getImpliedTeamTotalsByTeamWeek);

const _remainingOpponents = unstable_cache(
  async (season: number, fromWeek: number) => [...(await getRemainingOpponentsByTeam(season, fromWeek)).entries()],
  ["agg:remainingOpponents"],
  { revalidate: REVALIDATE }
);
export async function getRemainingOpponentsCached(season: number, fromWeek: number): Promise<Map<string, RemainingGame[]>> {
  return new Map(await _remainingOpponents(season, fromWeek));
}

const _positionDefense = unstable_cache(
  (apiSeason: string, throughWeek: number, format: ScoringFormat) =>
    getPositionDefenseTable(apiSeason, throughWeek, format),
  ["agg:positionDefense"],
  { revalidate: REVALIDATE }
);
export function getPositionDefenseTableCached(
  apiSeason: string,
  throughWeek: number,
  format: ScoringFormat
): Promise<PositionDefenseTable> {
  return _positionDefense(apiSeason, throughWeek, format);
}

// Re-exported live (uncached) — game-day volatile, kept fresh deliberately.
export { getInjuryReports };
