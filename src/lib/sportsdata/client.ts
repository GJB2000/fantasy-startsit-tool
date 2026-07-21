import "server-only";

const FANTASY_BASE = "https://api.sportsdata.io/api/nfl/fantasy/json";

export const REVALIDATE = {
  players: 60 * 60,
  timeframes: 12 * 60 * 60,
  seasonStats: 6 * 60 * 60,
  weeklyStats: 24 * 60 * 60,
  byes: 24 * 60 * 60,
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

export async function sportsDataFetch<T>(
  path: string,
  opts: { revalidate: number }
): Promise<T> {
  const key = process.env.SPORTSDATA_API_KEY;
  if (!key) {
    throw new SportsDataError("Missing SPORTSDATA_API_KEY environment variable", undefined, path);
  }

  const url = `${FANTASY_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "Ocp-Apim-Subscription-Key": key },
      next: { revalidate: opts.revalidate },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new SportsDataError(`Network error calling ${path}: ${message}`, undefined, path);
  }

  if (!res.ok) {
    throw new SportsDataError(`SportsDataIO returned ${res.status} for ${path}`, res.status, path);
  }

  return res.json() as Promise<T>;
}
