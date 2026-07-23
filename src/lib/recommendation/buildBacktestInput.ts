import { averageRedZoneTouches, averageSeparation, averageSnapShare, averageTargetShare } from "@/lib/nflverse/aggregate";
import { getMatchupContext } from "@/lib/sportsdata/positionDefense";
import { isSkillPosition, type Player } from "@/lib/sportsdata/types";
import type { BacktestWeekSlice } from "@/lib/backtest/weekData";
import { EMPTY_NFLVERSE_SIGNALS, type PlayerComparisonInput } from "./types";

/**
 * Builds a PlayerComparisonInput for a historical (apiSeason, targetWeek)
 * prediction, using ONLY data that would have been known before that
 * week's games. Fully synchronous — `weekSlice` is pre-fetched/pre-sliced
 * by the caller (see lib/backtest/weekData.ts).
 *
 * Deliberately does NOT read `InjuryStatus` from the target week's own
 * game row, even though that field exists in the archive: it only ever
 * contains None/Out/Probable and Out correlates 1:1 with that week's
 * Played===0, meaning using it would be circular with the very outcome
 * this backtest grades against, not a genuine pregame signal. Historical
 * pregame injury uncertainty (Questionable/Doubtful) simply isn't
 * preserved in this data source, so injury status is always modeled as
 * unknown here — see the plan's Context section for the full rationale.
 */
export function buildBacktestComparisonInput(
  playerId: number,
  anyPlayer: Player | null,
  targetWeek: number,
  weekSlice: BacktestWeekSlice,
  byesByTeam: Map<string, number>
): PlayerComparisonInput {
  if (!anyPlayer) {
    return {
      requestedPlayerId: playerId,
      player: null,
      playerLabel: null,
      seasonStat: null,
      recentGames: [],
      byeWeek: null,
      isOnByeThisWeek: false,
      matchupContext: null,
      nflverse: EMPTY_NFLVERSE_SIGNALS,
    };
  }

  const weekRow = weekSlice.targetWeekRows.find((r) => r.PlayerID === playerId);

  // Team/position as of the target week (schedule/roster facts, not stat
  // leakage) rather than the player's current/live team, which can be
  // stale relative to a historical week (trades, retirement, etc.).
  const team = weekRow?.Team ?? anyPlayer.Team;
  const position = weekRow?.Position ?? anyPlayer.Position;

  const player: Player = {
    PlayerID: anyPlayer.PlayerID,
    Team: team,
    FirstName: anyPlayer.FirstName,
    LastName: anyPlayer.LastName,
    Position: position,
    Status: anyPlayer.Status,
    PhotoUrl: anyPlayer.PhotoUrl,
    ByeWeek: anyPlayer.ByeWeek,
    InjuryStatus: null,
  };

  const seasonStat = weekSlice.seasonToDateTable.get(playerId) ?? null;
  const recentGames = weekSlice.recentGamesByPlayer(playerId);

  const byeWeek = team ? (byesByTeam.get(team) ?? null) : null;
  const isOnByeThisWeek = byeWeek !== null && byeWeek === targetWeek;

  let matchupContext = null;
  if (weekRow && isSkillPosition(position)) {
    matchupContext = getMatchupContext(weekSlice.positionDefenseTable, weekRow.Opponent, position);
  }

  const recentNflverseStats = weekSlice.recentNflverseByPlayer(playerId);
  const nflverse = {
    snapShare: averageSnapShare(recentNflverseStats),
    targetShare: averageTargetShare(recentNflverseStats),
    separation: averageSeparation(recentNflverseStats),
    redZoneTouches: averageRedZoneTouches(
      recentGames,
      (week) => weekSlice.nflverseStatForWeek(playerId, week),
      position
    ),
  };

  return {
    requestedPlayerId: playerId,
    player,
    playerLabel: `${anyPlayer.FirstName} ${anyPlayer.LastName}`,
    seasonStat,
    recentGames,
    byeWeek,
    isOnByeThisWeek,
    matchupContext,
    nflverse,
  };
}
