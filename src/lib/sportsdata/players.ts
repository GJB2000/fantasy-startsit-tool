import { REVALIDATE, sportsDataFetch } from "./client";
import { getAllDstPlayers, getDstPlayerById } from "./defenseTeams";
import { isSkillPosition, type Player } from "./types";

/** Unfiltered — includes historical/retired/inactive players. */
export async function getAllPlayers(): Promise<Player[]> {
  return sportsDataFetch<Player[]>("/Players", {
    revalidate: REVALIDATE.players,
  });
}

export async function getActivePlayers(): Promise<Player[]> {
  const all = await getAllPlayers();
  return all.filter((p) => p.Status === "Active" && isSkillPosition(p.Position));
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
  const [all, dstPlayers] = await Promise.all([getAllPlayers(), getAllDstPlayers()]);
  const skillAndK = all.filter((p) => p.Status === "Active" && (isSkillPosition(p.Position) || p.Position === "K"));
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
