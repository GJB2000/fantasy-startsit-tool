import { sleeperFetch } from "./client";
import type { SleeperLeague, SleeperLeagueUser, SleeperPlayer, SleeperRoster, SleeperUser } from "./types";

const REVALIDATE = {
  user: 60 * 60,
  leagues: 60 * 60,
  rosters: 5 * 60,
  users: 60 * 60,
  // Sleeper's own docs ask callers not to hit this endpoint more than
  // once a day — it's a ~5MB dump of every NFL player in their database.
  players: 24 * 60 * 60,
} as const;

/**
 * Resolves a Sleeper username to a user object. Sleeper returns HTTP 200
 * with a JSON `null` body for a username that doesn't exist (confirmed
 * live against the real API, not documented behavior taken on faith) —
 * so this returns null for that case rather than throwing, letting the
 * caller show a clear "username not found" message instead of a 502.
 */
export async function getSleeperUser(username: string): Promise<SleeperUser | null> {
  const user = await sleeperFetch<SleeperUser | null>(`/user/${encodeURIComponent(username)}`, REVALIDATE.user);
  return user ?? null;
}

/** A user's NFL leagues for one season — empty array if they're in none that season (also confirmed live, not a 404). */
export async function getSleeperLeagues(userId: string, season: number): Promise<SleeperLeague[]> {
  return sleeperFetch<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`, REVALIDATE.leagues);
}

export async function getSleeperRosters(leagueId: string): Promise<SleeperRoster[]> {
  return sleeperFetch<SleeperRoster[]>(`/league/${leagueId}/rosters`, REVALIDATE.rosters);
}

/** Every member of a league — used to resolve a roster's owner_id into a real team/display name for the trade-suggestion widget (see resolveRoster.ts). */
export async function getSleeperLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
  return sleeperFetch<SleeperLeagueUser[]>(`/league/${leagueId}/users`, REVALIDATE.users);
}

/** The full Sleeper player database, keyed by Sleeper player_id — see REVALIDATE.players for why this is cached hard. */
export async function getSleeperPlayers(): Promise<Record<string, SleeperPlayer>> {
  return sleeperFetch<Record<string, SleeperPlayer>>("/players/nfl", REVALIDATE.players);
}
