import { isSkillPosition, type Player } from "@/lib/sportsdata/types";

/**
 * nflverse has no ID shared with SportsDataIO, so player rows have to be
 * joined by name. Lowercasing, stripping punctuation, and dropping
 * Jr./Sr./II-V suffixes (SportsDataIO folds these into LastName, e.g.
 * "Cook III"; nflverse's display name omits them) resolves ~99% of
 * skill-position players — validated against the full 2025 season
 * roster. Remaining misses are real full-name/nickname mismatches (e.g.
 * "Nate Carter" vs. SDIO's "Nathan Carter") and are rare enough to drop
 * silently rather than hand-maintain an alias table.
 */
export function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Maps normalized name -> SportsDataIO PlayerID, restricted to skill
 * positions (QB/RB/WR/TE) on both sides of the join. When a normalized
 * name collides across multiple SDIO players (rare — one case in the
 * full 2025 roster), prefers whichever candidate has a current team,
 * since the ambiguous ones are almost always retired/inactive entries.
 */
export function buildSdioPlayerIdByNormalizedName(allPlayers: Player[]): Map<string, number> {
  const grouped = new Map<string, Player[]>();

  for (const player of allPlayers) {
    if (!isSkillPosition(player.Position)) continue;
    const norm = normalizePlayerName(`${player.FirstName} ${player.LastName}`);
    const existing = grouped.get(norm);
    if (existing) existing.push(player);
    else grouped.set(norm, [player]);
  }

  const result = new Map<string, number>();
  for (const [norm, players] of grouped) {
    const active = players.find((p) => p.Team != null) ?? players[0];
    result.set(norm, active.PlayerID);
  }
  return result;
}

/**
 * Resolves a SportsDataIO player's display name to nflverse's synthetic
 * PlayerID for a given season (see gameLog.ts) — the reverse direction
 * of buildSdioPlayerIdByNormalizedName's join, needed so the single-pair
 * backtest UI (which only ever searches SportsDataIO's player list) can
 * also target the nflverse-only 2024 pipeline. Returns null on a genuine
 * name-mismatch miss (same ~1% miss rate documented on
 * normalizePlayerName) — the caller is expected to surface that as a
 * clear "couldn't find this player in 2024 data" message, not silently
 * substitute a different player.
 */
export function resolveSdioNameToNflverseId(
  displayName: string,
  playerIdByNormalizedName: Map<string, number>
): number | null {
  return playerIdByNormalizedName.get(normalizePlayerName(displayName)) ?? null;
}
