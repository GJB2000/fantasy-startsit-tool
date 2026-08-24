import "server-only";

/**
 * The two legacy hosts this app is built on, each paired with the env var
 * that supplies its key. SportsDataIO issues a key per subscription, and
 * keys are NOT interchangeable across host families: the 2026 subscription
 * (`SPORTSDATA_API_KEY`) authenticates against the newer
 * `api.sportsdata.io/v3/nfl/{package}/json` hosts and returns 401 here,
 * while the legacy key works on these and covers the 2025 season the app
 * currently runs on.
 *
 * Falls back to `SPORTSDATA_API_KEY` when the legacy var is unset, so this
 * is a no-op for any environment that hasn't been given a legacy key.
 *
 * When the v3 migration happens, add bases here with
 * `keyEnv: "SPORTSDATA_API_KEY"` rather than swapping these over.
 */
const API_BASES = {
  fantasy: {
    url: "https://api.sportsdata.io/api/nfl/fantasy/json",
    keyEnv: "SPORTSDATA_LEGACY_API_KEY",
  },
  odds: {
    url: "https://api.sportsdata.io/api/nfl/odds/json",
    keyEnv: "SPORTSDATA_LEGACY_API_KEY",
  },
  /**
   * The modern v3 hosts, served by the 2026 subscription
   * (`SPORTSDATA_API_KEY`). Used only for seasons >= V3_MIN_SEASON — the
   * legacy key 401s on 2026 and this key 401s on 2025, so neither host
   * family can serve both and every season-scoped reader dispatches on
   * season. See seasonRouting.ts.
   */
  scoresV3: {
    url: "https://api.sportsdata.io/v3/nfl/scores/json",
    keyEnv: "SPORTSDATA_API_KEY",
  },
  statsV3: {
    url: "https://api.sportsdata.io/v3/nfl/stats/json",
    keyEnv: "SPORTSDATA_API_KEY",
  },
  /**
   * NFL Advanced Metrics — a separate subscription with its own key, and
   * absent from SportsDataIO's public catalogue. Unlike the other v3 hosts
   * this one DOES serve 2025 through the per-player AdvancedPlayerInfo
   * endpoint, even though its season-scoped endpoints 401 for 2025 (see
   * CLAUDE.md item 155). Header auth is confirmed working here, so it needs
   * no special-casing; item 155 had only ever tested `?key=`.
   */
  advancedV3: {
    url: "https://api.sportsdata.io/v3/nfl/advanced-metrics/json",
    keyEnv: "SPORTSDATA_ADVANCED_API_KEY",
  },
} as const;

export const REVALIDATE = {
  players: 60 * 60,
  timeframes: 12 * 60 * 60,
  seasonStats: 6 * 60 * 60,
  weeklyStats: 24 * 60 * 60,
  byes: 24 * 60 * 60,
  teamStats: 24 * 60 * 60,
  advancedMetrics: 24 * 60 * 60,
} as const;

export class SportsDataError extends Error {
  status?: number;
  endpoint?: string;

  constructor(message: string, status?: number, endpoint?: string) {
    super(message);
    this.name = "SportsDataError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

/**
 * Next.js's built-in fetch Data Cache rejects entries over 2MB, and several
 * SportsDataIO endpoints (Players, PlayerSeasonStats, PlayerGameStatsByWeek)
 * routinely return 4-6MB payloads — it silently never caches them, so every
 * call was re-hitting the live API regardless of `revalidate`. This simple
 * in-process TTL cache replaces that for all endpoints (works for small and
 * large payloads alike) rather than relying on Next's Data Cache here.
 * It resets on cold starts, which is an acceptable tradeoff at this app's
 * scale rather than adding real cache infrastructure.
 */
const memoryCache = new Map<string, CacheEntry>();

export async function sportsDataFetch<T>(
  path: string,
  opts: {
    revalidate: number;
    base?: keyof typeof API_BASES;
    /**
     * Skip the shared response cache. For very large payloads whose caller
     * immediately trims them down (see boxScores.ts, ~12MB/week raw), caching
     * the RAW response would hold far more memory than the data actually
     * used — the same memory-pressure problem item 27 fixed for play-by-play.
     */
    skipCache?: boolean;
  }
): Promise<T> {
  const base = opts.base ?? "fantasy";
  const { url: baseUrl, keyEnv } = API_BASES[base];
  const key = process.env[keyEnv] ?? process.env.SPORTSDATA_API_KEY;
  if (!key) {
    throw new SportsDataError(`Missing ${keyEnv} environment variable`, undefined, path);
  }

  const cacheKey = `${base}:${path}`;

  if (!opts.skipCache) {
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
  }

  const url = `${baseUrl}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SportsDataError(`Network error calling ${path}: ${message}`, undefined, path);
  }

  if (!res.ok) {
    throw new SportsDataError(`SportsDataIO returned ${res.status} for ${path}`, res.status, path);
  }

  const data = (await res.json()) as T;
  if (!opts.skipCache) {
    memoryCache.set(cacheKey, { data, expiresAt: Date.now() + opts.revalidate * 1000 });
  }
  return data;
}
