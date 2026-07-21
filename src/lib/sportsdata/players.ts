import { REVALIDATE, sportsDataFetch } from "./client";
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
