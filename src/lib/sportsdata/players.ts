import { REVALIDATE, sportsDataFetch } from "./client";
import { getAllDstPlayers, getDstPlayerById } from "./defenseTeams";
import { getPlayerSeasonStats } from "./seasonStats";
import { getSeasonContext } from "./timeframes";
import { isSkillPosition, type Player } from "./types";

/** Unfiltered — includes historical/retired/inactive players. */
export async function getAllPlayers(): Promise<Player[]> {
  return sportsDataFetch<Player[]>("/Players", {
    revalidate: REVALIDATE.players,
  });
}

/**
 * SportsDataIO `Status` values that still represent a real, rostered
 * player who will play — beyond plain "Active". PUP and NFI are routine
 * camp/preseason designations and IR keeps a player on the team, so a
 * player with one of these AND a real `Team` (e.g. George Kittle on PUP
 * in August) is rosterable and belongs in the tool. Without this they're
 * silently dropped from EVERY surface — search, comparison, rankings,
 * lineup — as a name-join coverage audit surfaced. An "Inactive" player
 * with no team is an unsigned free agent and stays excluded; in-season
 * startability is handled separately by the engine's Out/Doubtful
 * injury exclusion and thin-data handling, so this isn't offseason-gated.
 */
const ROSTERABLE_INJURY_STATUSES = new Set([
  "Physically Unable to Perform",
  "Injured Reserve",
  "Non Football Injury",
]);

function isRosterable(p: Player): boolean {
  return p.Status === "Active" || (ROSTERABLE_INJURY_STATUSES.has(p.Status) && !!p.Team);
}

/**
 * PlayerIDs who logged at least one game in the last completed season.
 * These are real, relevant players even when their current /Players record
 * shows Status "Inactive" with no Team — a common offseason free-agent
 * state (e.g. Jonnu Smith, a 17-game contributor in 2025, after his
 * contract ended). Since this tool analyzes last-completed-season data,
 * such players belong in search. Degrades to an empty set (roster-only
 * filtering) if the season-stats fetch fails, so search never breaks.
 * Deliberately only used to widen the search-facing pool
 * (getActiveExtendedPlayers), not getActivePlayers — see that function's
 * note on why internal callers need the narrower current-roster set.
 */
async function getPlayedLastSeasonPlayerIds(): Promise<Set<number>> {
  try {
    const context = await getSeasonContext();
    const rows = await getPlayerSeasonStats(context.lastCompletedSeason);
    return new Set(rows.filter((r) => r.Played > 0).map((r) => r.PlayerID));
  } catch {
    return new Set();
  }
}

export async function getActivePlayers(): Promise<Player[]> {
  const all = await getAllPlayers();
  return all.filter((p) => isRosterable(p) && isSkillPosition(p.Position));
}

export async function searchActivePlayers(query: string, limit = 20): Promise<Player[]> {
  const trimmed = query.trim().toLowerCase();
  const players = await getActivePlayers();
  if (!trimmed) return players.slice(0, limit);

  return players
    .filter((p) => `${p.FirstName} ${p.LastName}`.toLowerCase().includes(trimmed))
    .slice(0, limit);
}

export async function getActivePlayerById(id: number): Promise<Player | null> {
  const players = await getActivePlayers();
  return players.find((p) => p.PlayerID === id) ?? null;
}

/**
 * Resolve a player the scoring path should be able to build an input for:
 * currently rosterable OR a real contributor last season (the same widened
 * set search surfaces via getActiveExtendedPlayers). Without this an
 * offseason free agent like Jonnu Smith is searchable but can't actually be
 * scored — getActivePlayerById returns null and the comparison shows
 * "insufficient data".
 */
export async function getScorablePlayerById(id: number): Promise<Player | null> {
  const [all, playedLastSeason] = await Promise.all([getAllPlayers(), getPlayedLastSeasonPlayerIds()]);
  const player = all.find((p) => p.PlayerID === id);
  if (!player) return null;
  return isRosterable(player) || playedLastSeason.has(player.PlayerID) ? player : null;
}

/**
 * Unfiltered lookup used only to produce an honest "not found / inactive"
 * message with a real name instead of a bare "Unknown" placeholder.
 */
export async function getAnyPlayerById(id: number): Promise<Player | null> {
  const all = await getAllPlayers();
  return all.find((p) => p.PlayerID === id) ?? null;
}

/**
 * Skill positions + K + D/ST — deliberately a SEPARATE, additive pool
 * from getActivePlayers() rather than widening that function itself:
 * several internal callers (waivers/rankCandidates.ts's opportunity-gap
 * scan, buildInput.ts's hasLimitedTeammate check) depend on
 * getActivePlayers() staying skill-only, since neither concept (volume
 * rank, a same-position teammate injury bump) has a defined meaning for
 * a kicker or a team defense. Only the player-search surface (used
 * directly by PlayerMultiSelect.tsx, so everywhere a user picks a
 * player) needs the wider pool. K is already in `/Players`, just
 * excluded by isSkillPosition — D/ST has no `/Players` rows at all (see
 * defenseTeams.ts), so its synthetic entries are unioned in here.
 */
export async function getActiveExtendedPlayers(): Promise<Player[]> {
  const [all, dstPlayers, playedLastSeason] = await Promise.all([
    getAllPlayers(),
    getAllDstPlayers(),
    getPlayedLastSeasonPlayerIds(),
  ]);
  // Search also includes players who actually played last season, so
  // offseason free agents with an Inactive/no-team record (e.g. Jonnu
  // Smith) still surface — see getPlayedLastSeasonPlayerIds.
  const skillAndK = all.filter(
    (p) =>
      (isSkillPosition(p.Position) || p.Position === "K") && (isRosterable(p) || playedLastSeason.has(p.PlayerID))
  );
  return [...skillAndK, ...dstPlayers];
}

export async function searchActiveExtendedPlayers(query: string, limit = 20): Promise<Player[]> {
  const trimmed = query.trim().toLowerCase();
  const players = await getActiveExtendedPlayers();
  if (!trimmed) return players.slice(0, limit);

  return players
    .filter((p) => `${p.FirstName} ${p.LastName}`.toLowerCase().includes(trimmed))
    .slice(0, limit);
}

export async function getActiveExtendedPlayerById(id: number): Promise<Player | null> {
  const dst = await getDstPlayerById(id);
  if (dst) return dst;
  const players = await getActiveExtendedPlayers();
  return players.find((p) => p.PlayerID === id) ?? null;
}

/** Extended (D/ST-aware) equivalent of getAnyPlayerById, for an honest "not found" message even for an inactive/mismatched D/ST or K lookup. */
export async function getAnyExtendedPlayerById(id: number): Promise<Player | null> {
  const dst = await getDstPlayerById(id);
  if (dst) return dst;
  return getAnyPlayerById(id);
}
