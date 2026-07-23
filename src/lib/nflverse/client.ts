import "server-only";
import { gunzipSync } from "zlib";

const RELEASE_BASE = "https://github.com/nflverse/nflverse-data/releases/download";

export class NflverseError extends Error {
  status?: number;
  url?: string;

  constructor(message: string, status?: number, url?: string) {
    super(message);
    this.name = "NflverseError";
    this.status = status;
    this.url = url;
  }
}

interface CacheEntry {
  data: Record<string, string>[];
  expiresAt: number;
}

// Same rationale as sportsdata/client.ts: these CSVs run several MB, well
// past what Next's fetch Data Cache will store, so a simple in-process TTL
// cache stands in for it. Resets on cold starts — accepted at this scale.
const memoryCache = new Map<string, CacheEntry>();

/**
 * Minimal RFC4180-style CSV parser. A naive split(",") breaks on this data —
 * e.g. every row's headshot_url embeds an unquoted-looking comma
 * ("f_auto,q_auto") inside a quoted field — so quotes must be honored.
 *
 * Single-pass: builds each row's Record directly as it's parsed, rather
 * than materializing a full string[][] for the whole file and then
 * mapping it to objects (two full copies of the data alive at once).
 * That mattered in practice — the `pbp` release is ~587k rows and this
 * dev server was crashing on roughly half its cold-cache requests to the
 * 2024 out-of-sample validation route before this fix (see CLAUDE.md
 * "Backtesting & Tuning History" item 24/27).
 *
 * `onlyColumns`, if given, drops every other column while building each
 * row's Record — a row still has to be split in full (CSV columns are
 * positional), but nothing outside the given set is retained. `pbp` has
 * 192 columns; `playByPlay.ts` reads 8 of them, so this is a ~24x cut to
 * what stays alive in the 24h in-process cache for that source.
 */
function parseCsv(text: string, onlyColumns?: ReadonlySet<string>): Record<string, string>[] {
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
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        if (!onlyColumns || onlyColumns.has(key)) obj[key] = row[i];
      }
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

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
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

/**
 * Fetches and parses one CSV asset from a nflverse-data GitHub release
 * (e.g. tag "snap_counts", file "snap_counts_2025.csv"). No API key —
 * these are public release assets.
 *
 * `onlyColumns`, if given, is threaded into parseCsv (see there) and also
 * folded into the cache key, since it changes the shape of what's cached
 * under this tag/filename — irrelevant today (only playByPlay.ts's pbp
 * reads use it, always with the same fixed column set) but wrong to
 * ignore.
 */
export async function fetchNflverseCsv(
  tag: string,
  filename: string,
  revalidateSeconds: number,
  onlyColumns?: readonly string[]
): Promise<Record<string, string>[]> {
  const columnsSuffix = onlyColumns ? `:${[...onlyColumns].sort().join(",")}` : "";
  const cacheKey = `${tag}/${filename}${columnsSuffix}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `${RELEASE_BASE}/${tag}/${filename}`;
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new NflverseError(`Network error calling ${url}: ${message}`, undefined, url);
  }

  if (!res.ok) {
    throw new NflverseError(`nflverse-data returned ${res.status} for ${url}`, res.status, url);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const text = filename.endsWith(".gz") ? gunzipSync(buffer).toString("utf-8") : buffer.toString("utf-8");
  const data = parseCsv(text, onlyColumns ? new Set(onlyColumns) : undefined);
  memoryCache.set(cacheKey, { data, expiresAt: Date.now() + revalidateSeconds * 1000 });
  return data;
}
