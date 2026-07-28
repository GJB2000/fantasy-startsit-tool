import "server-only";

// dynastyprocess/data is a free, no-auth, open-data GitHub repo (a
// third-party community project, unaffiliated with FantasyPros itself)
// that scrapes FantasyPros' weekly consensus rankings daily — see
// weeklyConsensus.ts for why this is the source used (item 55's original
// "no 2025 data" rejection checked a DIFFERENT file in this same repo;
// this one is actively maintained and covers 2022-2025+, confirmed live).
const REPO = "dynastyprocess/data";
const WEEKLY_FILE_PATH = "files/fp_latest_weekly.csv";
const COMMITS_API = `https://api.github.com/repos/${REPO}/commits`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}`;

// GitHub requires a User-Agent on API requests, or it 403s.
const HEADERS = { "User-Agent": "fantasy-startsit-tool" };

export class FantasyProsError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "FantasyProsError";
    this.status = status;
    this.url = url;
  }
}

export interface CommitInfo {
  sha: string;
  date: string;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Same in-process TTL cache pattern as nflverse/client.ts and
// sportsdata/client.ts — resets on cold starts, accepted at this app's
// scale. Two different TTLs below: the commit index changes daily (new
// commits keep landing), but a specific commit's file CONTENT is
// immutable by git's own design, so it's safe to cache far longer.
const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

function setCached<T>(key: string, data: T, ttlSeconds: number): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/**
 * Minimal RFC4180-style CSV parser — same quote-handling approach as
 * nflverse/client.ts's parseCsv, duplicated rather than shared since this
 * fetches from a completely different host/URL shape (GitHub's commits
 * API + raw content at a specific commit, not a release asset) and this
 * file is small (hundreds to low thousands of rows) — none of
 * nflverse/client.ts's column-filtering/single-pass-at-scale concerns
 * apply here.
 */
function parseCsv(text: string): Record<string, string>[] {
  let header: string[] | null = null;
  const results: Record<string, string>[] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  function endRow() {
    row.push(field);
    field = "";
    if (!header) {
      header = row;
    } else if (row.length === header.length) {
      const obj: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) obj[header[i]] = row[i];
      results.push(obj);
    }
    row = [];
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();

  return results;
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new FantasyProsError(`Network error calling ${url}: ${message}`, undefined, url);
  }
  if (!res.ok) {
    throw new FantasyProsError(`GitHub API returned ${res.status} for ${url}`, res.status, url);
  }
  return res.json();
}

/**
 * Full commit history for the weekly-rankings file, paginated and
 * cached 24h (new commits land roughly daily during the season). This is
 * the ONE call site that hits GitHub's rate-limited REST API
 * (60 req/hour unauthenticated) — everything else (fetching a specific
 * commit's raw content) goes through raw.githubusercontent.com, which
 * isn't subject to that same limit. Fetching the whole history once and
 * matching dates locally (see weeklyConsensus.ts) means a multi-season
 * backtest run costs a small, fixed number of these calls regardless of
 * how many weeks/seasons it covers, rather than one call per week.
 *
 * Capped at 15 pages (1500 commits) — comfortably covers back through
 * 2021 at this file's roughly-daily commit cadence, confirmed live.
 */
export async function fetchCommitHistory(): Promise<CommitInfo[]> {
  const cacheKey = "commit-history";
  const cached = getCached<CommitInfo[]>(cacheKey);
  if (cached) return cached;

  const all: CommitInfo[] = [];
  for (let page = 1; page <= 15; page++) {
    const url = `${COMMITS_API}?path=${WEEKLY_FILE_PATH}&per_page=100&page=${page}`;
    const data = await fetchJson<{ sha: string; commit: { author: { date: string } } }[]>(url);
    if (data.length === 0) break;
    for (const c of data) all.push({ sha: c.sha, date: c.commit.author.date });
    if (data.length < 100) break;
  }

  setCached(cacheKey, all, 24 * 60 * 60);
  return all;
}

/**
 * Raw file content at a specific commit — immutable by git's design, so
 * cached far longer (30 days) than the commit index itself. Not subject
 * to the api.github.com rate limit (raw.githubusercontent.com is a
 * separate CDN).
 */
export async function fetchSnapshotAtCommit(sha: string): Promise<Record<string, string>[]> {
  const cacheKey = `snapshot/${sha}`;
  const cached = getCached<Record<string, string>[]>(cacheKey);
  if (cached) return cached;

  const url = `${RAW_BASE}/${sha}/${WEEKLY_FILE_PATH}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new FantasyProsError(`Network error calling ${url}: ${message}`, undefined, url);
  }
  if (!res.ok) {
    throw new FantasyProsError(`raw.githubusercontent.com returned ${res.status} for ${url}`, res.status, url);
  }
  const text = await res.text();
  const rows = parseCsv(text);

  setCached(cacheKey, rows, 30 * 24 * 60 * 60);
  return rows;
}
