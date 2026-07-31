import "server-only";

const BASE = "https://api.the-odds-api.com/v4";

export class OddsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "OddsApiError";
    this.status = status;
  }
}

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

// In-process TTL cache — same pattern as sportsdata/nflverse clients, but
// here it's doing double duty as quota protection: The Odds API free tier
// is only 500 requests/month, and event-level prop requests cost several
// credits each, so a warm cache is the difference between the feature
// being usable and burning the monthly quota in an afternoon. Keyed on
// the path only (never the API key).
const cache = new Map<string, CacheEntry>();

/**
 * GET one JSON resource from The Odds API, appending the key from
 * `ODDS_API_KEY` (never committed — same discipline as SPORTSDATA_API_KEY).
 * Throws OddsApiError when the key is unset or the request fails, so every
 * caller can fail open (no props) rather than breaking the page — betting
 * lines are display-only context, never load-bearing.
 */
export async function oddsApiGet<T>(path: string, revalidateSeconds: number): Promise<T> {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new OddsApiError("ODDS_API_KEY not set");

  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;

  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}apiKey=${key}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    throw new OddsApiError(`Network error calling The Odds API: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!res.ok) {
    throw new OddsApiError(`The Odds API returned ${res.status}`, res.status);
  }

  const data = (await res.json()) as T;
  cache.set(path, { data, expiresAt: Date.now() + revalidateSeconds * 1000 });
  return data;
}
