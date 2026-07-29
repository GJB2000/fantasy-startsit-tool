import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { toSdioTeam } from "@/lib/recommendation/restOfSeason";
import { getActiveExtendedPlayers } from "@/lib/sportsdata/players";
import { toPlayerSummary, type PlayerSummary } from "@/lib/sportsdata/types";
import { getSleeperPlayers, getSleeperRosters } from "./api";

export interface ResolvedSleeperRoster {
  /** The requesting user's own roster. */
  players: PlayerSummary[];
  /** Sleeper full names on the user's OWN roster that couldn't be joined to a SportsDataIO player — surfaced honestly rather than silently dropped, same discipline as nflverse/playerMatch.ts's own ~99% match rate. */
  unmatched: string[];
  /** Every player rostered by ANY team in the league (including the user's own) — a genuine waiver-wire candidate has to be unowned league-wide, not just off the user's own team. IDs only (not full detail) since these are never displayed, only used to exclude candidates. */
  leagueRosteredPlayerIds: number[];
}

interface ResolvedTeam {
  matched: PlayerSummary[];
  unmatched: string[];
}

/**
 * Resolves a Sleeper league + user into (a) the SportsDataIO players on
 * that user's OWN roster and (b) every player rostered by ANY team in
 * the league — a third name-based join (Sleeper has no ID shared with
 * SportsDataIO either), reusing the same normalization (`normalizePlayerName`)
 * already proven against nflverse's own name join rather than a second
 * hand-rolled scheme. Every roster is resolved once and reused for both
 * outputs, rather than resolving the user's own roster a second time
 * separately.
 *
 * D/ST and K are both resolved too (previously both were skipped
 * entirely — see CLAUDE.md's Lineup Optimizer item for why this was
 * fixed alongside that feature). `getActiveExtendedPlayers()` already
 * unions skill + K (real PlayerIDs) + synthetic D/ST rows (no name — a
 * team defense isn't a person, see defenseTeams.ts). K joins by name
 * just like a skill player; the shared `buildSdioPlayerIdByNormalizedName`
 * helper isn't reused here since it's deliberately skill-position-only
 * (other callers depend on that), so this builds its own small
 * skill+K name index instead. D/ST needs its own path entirely: Sleeper
 * represents a team defense as `position: "DEF"`, `full_name: null`,
 * with the team's own abbreviation as its player_id (confirmed live,
 * item 59) — resolved against a small team-code -> PlayerID map, built
 * from the same already-fetched extended pool, not a second fetch.
 * Passed through `toSdioTeam` defensively; confirmed live (not assumed)
 * that Sleeper's own team codes already match SportsDataIO's directly
 * even for the one known mismatch elsewhere in this app (`LAR` for the
 * Rams, not nflverse's `LA`), so this is a safe no-op today rather than
 * a real conversion — kept for the same reason `toSdioTeam` falls back
 * to its input unchanged for any code it doesn't recognize.
 */
export async function resolveSleeperRoster(leagueId: string, userId: string): Promise<ResolvedSleeperRoster> {
  const [rosters, sleeperPlayers, allSdioPlayers] = await Promise.all([
    getSleeperRosters(leagueId),
    getSleeperPlayers(),
    getActiveExtendedPlayers(),
  ]);

  const sdioIdByNormalizedName = new Map<string, number>();
  const dstIdByTeam = new Map<string, number>();
  for (const p of allSdioPlayers) {
    if (p.Position === "DST") {
      if (p.Team) dstIdByTeam.set(p.Team, p.PlayerID);
      continue;
    }
    const norm = normalizePlayerName(`${p.FirstName} ${p.LastName}`);
    if (!sdioIdByNormalizedName.has(norm)) sdioIdByNormalizedName.set(norm, p.PlayerID);
  }
  const sdioPlayerById = new Map(allSdioPlayers.map((p) => [p.PlayerID, p]));

  function resolveTeam(sleeperIds: string[]): ResolvedTeam {
    const matched: PlayerSummary[] = [];
    const unmatched: string[] = [];
    const seenPlayerIds = new Set<number>();

    for (const sleeperId of sleeperIds) {
      const sleeperPlayer = sleeperPlayers[sleeperId];
      if (!sleeperPlayer) continue;

      let sdioId: number | undefined;
      let unmatchedLabel: string | null = null;

      if (sleeperPlayer.position === "DEF") {
        const teamCode = toSdioTeam(sleeperPlayer.team ?? sleeperId);
        sdioId = dstIdByTeam.get(teamCode);
        unmatchedLabel = `${teamCode} D/ST`;
      } else {
        const fullName = sleeperPlayer.full_name;
        if (!fullName) continue;
        sdioId = sdioIdByNormalizedName.get(normalizePlayerName(fullName));
        unmatchedLabel = fullName;
      }

      const sdioPlayer = sdioId != null ? sdioPlayerById.get(sdioId) : undefined;
      if (!sdioPlayer) {
        unmatched.push(unmatchedLabel!);
        continue;
      }
      if (seenPlayerIds.has(sdioPlayer.PlayerID)) continue;
      seenPlayerIds.add(sdioPlayer.PlayerID);
      matched.push(toPlayerSummary(sdioPlayer));
    }

    return { matched, unmatched };
  }

  const leagueRosteredPlayerIds = new Set<number>();
  let myTeam: ResolvedTeam = { matched: [], unmatched: [] };

  for (const roster of rosters) {
    const resolved = resolveTeam(roster.players ?? []);
    for (const p of resolved.matched) leagueRosteredPlayerIds.add(p.playerId);

    const isMine = roster.owner_id === userId || (roster.co_owners ?? []).includes(userId);
    if (isMine) myTeam = resolved;
  }

  return {
    players: myTeam.matched,
    unmatched: myTeam.unmatched,
    leagueRosteredPlayerIds: [...leagueRosteredPlayerIds],
  };
}
