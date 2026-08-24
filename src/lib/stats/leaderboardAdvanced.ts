import "server-only";
import { getPlayerWeekStatsCached, getSnapCountsCached } from "../cache/liveAggregates";
import { buildSdioPlayerIdByNormalizedName, normalizePlayerName } from "../nflverse/playerMatch";
import { getAllPlayers } from "../sportsdata/players";

export interface LeaderboardAdvanced {
  /** Per-game averages, as percentages (0-100). Null when the player has no rows. */
  snapShare: number | null;
  targetShare: number | null;
  airYardsShare: number | null;
}

interface Accumulator {
  snapSum: number;
  snapCount: number;
  targetSum: number;
  targetCount: number;
  airSum: number;
  airCount: number;
}

function blank(): Accumulator {
  return { snapSum: 0, snapCount: 0, targetSum: 0, targetCount: 0, airSum: 0, airCount: 0 };
}

/**
 * Season snap share, target share and air-yards share for EVERY skill player,
 * keyed by SportsDataIO PlayerID.
 *
 * Sourced from nflverse rather than SportsDataIO's advanced-metrics feed,
 * which the player detail page uses. That feed only reaches 2025 through its
 * per-player endpoint — every bulk and season-scoped path 401s on this
 * subscription — so filling a 250-row leaderboard from it would mean 250 HTTP
 * calls per page load. nflverse serves the whole league in two cached CSVs,
 * and needs no play-by-play parse for these three.
 *
 * The tradeoff is a name-based join (~99% match on skill positions), so a
 * player whose name doesn't normalize cleanly shows "—" rather than a wrong
 * number. Shares are per-game averages: the team totals they divide against
 * aren't in these rows, so they can't be re-derived across a season.
 */
export async function getLeaderboardAdvanced(
  season: number
): Promise<Map<number, LeaderboardAdvanced>> {
  const [players, snapCounts, weekStats] = await Promise.all([
    getAllPlayers(),
    getSnapCountsCached(season),
    getPlayerWeekStatsCached(season),
  ]);

  const idByName = buildSdioPlayerIdByNormalizedName(players);
  const acc = new Map<number, Accumulator>();
  const entry = (id: number) => {
    const existing = acc.get(id);
    if (existing) return existing;
    const created = blank();
    acc.set(id, created);
    return created;
  };

  for (const row of snapCounts) {
    if (!row.player || row.offensePct <= 0) continue;
    const id = idByName.get(normalizePlayerName(row.player));
    if (id == null) continue;
    const target = entry(id);
    target.snapSum += row.offensePct;
    target.snapCount += 1;
  }

  for (const row of weekStats) {
    if (!row.playerDisplayName) continue;
    const id = idByName.get(normalizePlayerName(row.playerDisplayName));
    if (id == null) continue;
    const target = entry(id);
    if (row.targetShare != null) {
      target.targetSum += row.targetShare;
      target.targetCount += 1;
    }
    if (row.airYardsShare != null) {
      target.airSum += row.airYardsShare;
      target.airCount += 1;
    }
  }

  // nflverse stores all three as fractions (0-1); the UI shows percentages.
  const asPercent = (sum: number, count: number) => (count > 0 ? (sum / count) * 100 : null);

  const out = new Map<number, LeaderboardAdvanced>();
  for (const [id, a] of acc) {
    out.set(id, {
      snapShare: asPercent(a.snapSum, a.snapCount),
      targetShare: asPercent(a.targetSum, a.targetCount),
      airYardsShare: asPercent(a.airSum, a.airCount),
    });
  }
  return out;
}
