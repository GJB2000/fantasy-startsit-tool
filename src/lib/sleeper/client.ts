import "server-only";

const BASE = "https://api.sleeper.app/v1";

export class SleeperError extends Error {
  status?: number;
  endpoint?: string;

  constructor(message: string, status?: number, endpoint?: string) {
    super(message);
    this.name = "SleeperError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

// Same in-process TTL cache pattern as sportsdata/client.ts and
// nflverse/client.ts — Sleeper's API is free/no-auth, but the player
// dump (see getSleeperPlayers in api.ts) is several MB, well past what
// Next's fetch Data Cache will store, and Sleeper's own docs ask callers
// not to hit that endpoint more than once a day.
const memoryCache = new Map<string, CacheEntry>();

/**
 * Sleeper returns HTTP 200 with a JSON `null` body for a user that
 * doesn't exist (confirmed live — not a 404), so callers can't rely on
 * `res.ok` alone to detect "not found"; they need to check the parsed
 * body too. This fetch only handles the HTTP-error case — "found but
 * null" is each caller's own concern (see api.ts's getSleeperUser).
 */
export async function sleeperFetch<T>(path: string, revalidateSeconds: number): Promise<T> {
  const cached = memoryCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SleeperError(`Network error calling ${url}: ${message}`, undefined, path);
  }

  if (!res.ok) {
    throw new SleeperError(`Sleeper API returned ${res.status} for ${path}`, res.status, path);
  }

  const data = (await res.json()) as T;
  memoryCache.set(path, { data, expiresAt: Date.now() + revalidateSeconds * 1000 });
  return data;
}
