import { REVALIDATE, sportsDataFetch } from "./client";
import type { Player } from "./types";

interface TeamInfo {
  Key: string;
  TeamID: number;
  FullName: string;
  ByeWeek: number | null;
}

async function getTeams(): Promise<TeamInfo[]> {
  return sportsDataFetch<TeamInfo[]>("/Teams", { revalidate: REVALIDATE.players });
}

/**
 * SportsDataIO has no per-player entry for a team defense (confirmed
 * live — `/Players` has zero "DEF"/"DST" rows; team defense is a
 * team-level stat, see sportsdata/defense.ts). This mints a synthetic
 * `Player`-shaped entry per team from `/Teams` so D/ST can flow through
 * the same search/roster/comparison plumbing real players already use,
 * without inventing a second identity system. PlayerIDs are offset by
 * 900000 — deliberately far above any real SportsDataIO PlayerID range
 * (confirmed live: no real player has PlayerID <= 40, even though
 * `/Teams`' own TeamID happens to double as a low-numbered PlayerID
 * field on team-level stat rows) rather than trusting that coincidence
 * to never collide with a real player ID in the future.
 */
const DST_ID_OFFSET = 900000;

export function dstPlayerId(teamId: number): number {
  return DST_ID_OFFSET + teamId;
}

export function isDstPlayerId(playerId: number): boolean {
  return playerId >= DST_ID_OFFSET && playerId < DST_ID_OFFSET + 1000;
}

export async function getAllDstPlayers(): Promise<Player[]> {
  const teams = await getTeams();
  return teams.map((t) => ({
    PlayerID: dstPlayerId(t.TeamID),
    Team: t.Key,
    FirstName: "",
    LastName: `${t.FullName} D/ST`,
    Position: "DST",
    Status: "Active",
    PhotoUrl: null,
    ByeWeek: t.ByeWeek,
    InjuryStatus: null,
  }));
}

export async function getDstPlayerById(playerId: number): Promise<Player | null> {
  if (!isDstPlayerId(playerId)) return null;
  const teamId = playerId - DST_ID_OFFSET;
  const teams = await getTeams();
  const team = teams.find((t) => t.TeamID === teamId);
  if (!team) return null;
  return {
    PlayerID: playerId,
    Team: team.Key,
    FirstName: "",
    LastName: `${team.FullName} D/ST`,
    Position: "DST",
    Status: "Active",
    PhotoUrl: null,
    ByeWeek: team.ByeWeek,
    InjuryStatus: null,
  };
}

export async function getDstPlayerByTeam(team: string): Promise<Player | null> {
  const teams = await getTeams();
  const found = teams.find((t) => t.Key === team);
  if (!found) return null;
  return getDstPlayerById(dstPlayerId(found.TeamID));
}
