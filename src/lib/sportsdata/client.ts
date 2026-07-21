import "server-only";

const API_BASES = {
  fantasy: "https://api.sportsdata.io/api/nfl/fantasy/json",
  odds: "https://api.sportsdata.io/api/nfl/odds/json",
} as const;

export const REVALIDATE = {
  players: 60 * 60,
  timeframes: 12 * 60 * 60,
  seasonStats: 6 * 60 * 60,
  weeklyStats: 24 * 60 * 60,
  byes: 24 * 60 * 60,
  teamStats: 24 * 60 * 60,
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
  opts: { revalidate: number; base?: keyof typeof API_BASES }
): Promise<T> {
  const key = process.env.SPORTSDATA_API_KEY;
  if (!key) {
    throw new SportsDataError("Missing SPORTSDATA_API_KEY environment variable", undefined, path);
  }

  const base = opts.base ?? "fantasy";
  const cacheKey = `${base}:${path}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const url = `${API_BASES[base]}${path}`;
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
  memoryCache.set(cacheKey, { data, expiresAt: Date.now() + opts.revalidate * 1000 });
  return data;
}
