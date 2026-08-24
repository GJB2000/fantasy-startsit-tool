import "server-only";
import { getAllPlayers } from "../sportsdata/players";
import { getPlayerSeasonStats } from "../sportsdata/seasonStats";
import { getFantasyPoints, type PlayerGameStat, type PlayerSeasonStat, type ScoringFormat } from "../sportsdata/types";
import { getLeaderboardAdvanced } from "./leaderboardAdvanced";
import type { LeaderboardRow, StatTotals, StatsPosition } from "./types";

/**
 * Pulls the counting stats off a SportsDataIO row. The scoring/efficiency
 * fields are optional on the interface because rows built from nflverse and
 * the synthetic D/ST rows have no equivalent (see sportsdata/types.ts), so
 * everything defaults to 0 rather than leaking undefined into the UI.
 */
export function toStatTotals(row: PlayerSeasonStat | PlayerGameStat): StatTotals {
  return {
    passAttempts: row.PassingAttempts ?? 0,
    passCompletions: row.PassingCompletions ?? 0,
    passYards: row.PassingYards ?? 0,
    passTouchdowns: row.PassingTouchdowns ?? 0,
    passInterceptions: row.PassingInterceptions ?? 0,
    rushAttempts: row.RushingAttempts ?? 0,
    rushYards: row.RushingYards ?? 0,
    rushTouchdowns: row.RushingTouchdowns ?? 0,
    targets: row.ReceivingTargets ?? 0,
    receptions: row.Receptions ?? 0,
    receivingYards: row.ReceivingYards ?? 0,
    receivingTouchdowns: row.ReceivingTouchdowns ?? 0,
    fumblesLost: row.FumblesLost ?? 0,
    fieldGoalsMade: row.FieldGoalsMade ?? 0,
    fieldGoalsAttempted: row.FieldGoalsAttempted ?? 0,
    fieldGoalsMade50Plus: row.FieldGoalsMade50Plus ?? 0,
    extraPointsMade: row.ExtraPointsMade ?? 0,
    extraPointsAttempted: row.ExtraPointsAttempted ?? 0,
  };
}

/**
 * Every player at a position who logged a game this season, ranked by total
 * fantasy points in the requested format.
 *
 * One `PlayerSeasonStats` call carries the totals AND each row's position and
 * team, so the only join is onto the player list for full display names —
 * season rows abbreviate them ("C.McCaffrey").
 */
export async function getStatsLeaderboard(
  season: number,
  position: StatsPosition,
  format: ScoringFormat
): Promise<LeaderboardRow[]> {
  const [seasonStats, players, advanced] = await Promise.all([
    getPlayerSeasonStats(season),
    getAllPlayers(),
    // Supplementary: a nflverse hiccup should cost the advanced columns,
    // not the whole table.
    getLeaderboardAdvanced(season).catch(() => new Map()),
  ]);
  const byId = new Map(players.map((p) => [p.PlayerID, p]));

  return seasonStats
    .filter((row) => row.Position === position && row.Played > 0)
    .map((row) => {
      const player = byId.get(row.PlayerID);
      const points = getFantasyPoints(row, format);
      const adv = advanced.get(row.PlayerID);
      return {
        ...toStatTotals(row),
        snapShare: adv?.snapShare ?? null,
        targetShare: adv?.targetShare ?? null,
        airYardsShare: adv?.airYardsShare ?? null,
        playerId: row.PlayerID,
        name: player ? `${player.FirstName} ${player.LastName}`.trim() : `Player ${row.PlayerID}`,
        team: row.Team ?? player?.Team ?? null,
        position: row.Position,
        games: row.Played,
        started: row.Started,
        points,
        pointsPerGame: row.Played > 0 ? points / row.Played : 0,
      };
    })
    .sort((a, b) => b.points - a.points);
}

/** Position rank by total points, for the player detail header. */
export async function getPositionRank(
  season: number,
  playerId: number,
  position: StatsPosition,
  format: ScoringFormat
): Promise<{ rank: number | null; count: number }> {
  const rows = await getStatsLeaderboard(season, position, format);
  const index = rows.findIndex((r) => r.playerId === playerId);
  return { rank: index >= 0 ? index + 1 : null, count: rows.length };
}
