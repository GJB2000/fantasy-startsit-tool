import { normalizePlayerName, buildSdioPlayerIdByNormalizedName } from "@/lib/nflverse/playerMatch";
import { getAllPlayers } from "@/lib/sportsdata/players";
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
 * SportsDataIO either), reusing the exact same normalization
 * (`normalizePlayerName`/`buildSdioPlayerIdByNormalizedName`) already
 * proven against nflverse's own name join rather than a second
 * hand-rolled scheme. Team-defense and kicker slots are skipped (this
 * app has no D/ST or K support). Every roster is resolved once and
 * reused for both outputs, rather than resolving the user's own roster
 * a second time separately.
 */
export async function resolveSleeperRoster(leagueId: string, userId: string): Promise<ResolvedSleeperRoster> {
  const [rosters, sleeperPlayers, allSdioPlayers] = await Promise.all([
    getSleeperRosters(leagueId),
    getSleeperPlayers(),
    getAllPlayers(),
  ]);

  const sdioIdByNormalizedName = buildSdioPlayerIdByNormalizedName(allSdioPlayers);
  const sdioPlayerById = new Map(allSdioPlayers.map((p) => [p.PlayerID, p]));

  function resolveTeam(sleeperIds: string[]): ResolvedTeam {
    const matched: PlayerSummary[] = [];
    const unmatched: string[] = [];
    const seenPlayerIds = new Set<number>();

    for (const sleeperId of sleeperIds) {
      const sleeperPlayer = sleeperPlayers[sleeperId];
      const fullName = sleeperPlayer?.full_name;
      if (!fullName || sleeperPlayer.position === "DEF" || sleeperPlayer.position === "K") continue;

      const sdioId = sdioIdByNormalizedName.get(normalizePlayerName(fullName));
      const sdioPlayer = sdioId != null ? sdioPlayerById.get(sdioId) : undefined;
      if (!sdioPlayer) {
        unmatched.push(fullName);
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
