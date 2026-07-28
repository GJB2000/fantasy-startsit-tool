import { getWeekStartDates } from "@/lib/nflverse/schedules";
import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { fetchCommitHistory, fetchSnapshotAtCommit, type CommitInfo } from "./client";

const PAGE_TO_POSITION: Record<string, string> = {
  qb: "QB",
  "ppr-rb": "RB",
  "ppr-wr": "WR",
  "ppr-te": "TE",
};

export interface ExpertConsensusEntry {
  /** Position rank as of that week's snapshot (1 = top-ranked at the position). */
  rank: number;
  /** dynastyprocess's own rank-to-points conversion — FantasyPros' site doesn't publish a raw point projection on every page type, so this is their derived point estimate from the consensus rank. Null when the source row didn't have one. */
  r2pPts: number | null;
}

/**
 * FantasyPros' weekly positional consensus rankings, reconstructed for a
 * historical week — dynastyprocess/data's `fp_latest_weekly.csv` is a
 * "daily overwrite" file (each commit replaces it with that day's
 * snapshot, no accumulating history in the file itself), so the only way
 * to get a PAST week's rankings is to fetch the file's content at
 * whichever commit was current just before that week's games started —
 * git history as a de facto time-series archive. Confirmed live this
 * covers 2022-2025 at a roughly-daily cadence (item 55 had checked a
 * DIFFERENT file in this same repo that really did stop updating in Aug
 * 2025 — this one didn't).
 *
 * Returns `${normalizedName} -> week -> {rank, r2pPts}`, same
 * normalized-name join key every other nflverse/external source in this
 * app uses (see nflverse/playerMatch.ts) — callers resolve it into
 * whichever PlayerID space they're working in.
 *
 * Degrades to an empty map on any fetch failure (a third-party source
 * being trialed, not the app's primary data path — same discipline as
 * every other optional nflverse/external signal here) rather than
 * failing the whole backtest run. Fetches sequentially, one week at a
 * time (not Promise.all) — politeness toward raw.githubusercontent.com
 * for what can be an 18-request burst, and consistent with this
 * project's own precedent (see CLAUDE.md item 27) of avoiding
 * concurrent-fetch memory/connection pressure for multi-request loaders.
 */
export async function getExpertConsensusByNormalizedNameWeek(
  season: number,
  maxWeek: number
): Promise<Map<string, Map<number, ExpertConsensusEntry>>> {
  const result = new Map<string, Map<number, ExpertConsensusEntry>>();

  let commits: CommitInfo[];
  let weekStarts: Map<number, string>;
  try {
    [commits, weekStarts] = await Promise.all([fetchCommitHistory(), getWeekStartDates(season)]);
  } catch {
    return result;
  }
  if (commits.length === 0) return result;

  // Commits come back newest-first from the GitHub API; sort explicitly
  // rather than relying on that ordering.
  const sorted = [...commits].sort((a, b) => (a.date < b.date ? 1 : -1));

  function findCommitBefore(dateStr: string): CommitInfo | null {
    const targetMs = new Date(`${dateStr}T00:00:00Z`).getTime();
    for (const c of sorted) {
      if (new Date(c.date).getTime() < targetMs) return c;
    }
    return null;
  }

  for (let week = 1; week <= maxWeek; week++) {
    const startDate = weekStarts.get(week);
    if (!startDate) continue;
    const commit = findCommitBefore(startDate);
    if (!commit) continue;

    let rows: Record<string, string>[];
    try {
      rows = await fetchSnapshotAtCommit(commit.sha);
    } catch {
      continue; // one week's snapshot failing shouldn't drop the rest
    }

    for (const row of rows) {
      const position = PAGE_TO_POSITION[row.page];
      if (!position) continue;

      const rank = Number(row.rank);
      if (!Number.isFinite(rank)) continue;

      const r2pRaw = row.r2p_pts;
      const r2pPts = r2pRaw && r2pRaw !== "NA" ? Number(r2pRaw) : null;

      const normalizedName = normalizePlayerName(row.player_name);
      let byWeek = result.get(normalizedName);
      if (!byWeek) {
        byWeek = new Map();
        result.set(normalizedName, byWeek);
      }
      byWeek.set(week, { rank, r2pPts: r2pPts != null && Number.isFinite(r2pPts) ? r2pPts : null });
    }
  }

  return result;
}
