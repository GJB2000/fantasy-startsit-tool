import {
  averageDropRate,
  averageEpaPerPlay,
  averageGoalLineTouches,
  averageQbRushEpa,
  averageRedZoneTouches,
  averageSeparation,
  averageSnapShare,
  averageSuccessRate,
  averageTargetShare,
} from "@/lib/nflverse/aggregate";
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
 * Deliberately does NOT read `InjuryStatus` from SportsDataIO's own
 * target-week game row: that field only ever contains None/Out/Probable
 * archived retroactively, and `Out` correlates 1:1 with that week's
 * `Played===0` — using it would be circular with the very outcome this
 * backtest grades against, not a genuine pregame signal.
 *
 * Instead reads the real weekly injury report from nflverse's `injuries`
 * release (`weekSlice.nflverseStatForWeek`) — actual pregame
 * Questionable/Doubtful/Out designations, published days before kickoff,
 * so this is a legitimate historical fact rather than leakage (unlike
 * `Played`/points, which are only known after the game). This was
 * previously wired into the backtest harness only as a standalone
 * diagnostic baseline (`pickByInjuryStatus`) — see CLAUDE.md item 18 —
 * never into the actual recommendation engine, so a player already
 * ruled out days before their game would still get recommended,
 * something even a naive human with that week's injury report wouldn't
 * do. `comparePlayers` already excludes `Out`/`Doubtful` candidates when
 * a healthy alternative exists (see engine.ts) — this just gives that
 * existing filter real, non-leaky data to work with in backtest mode too.
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
      nextOpponent: null,
      nextGameWeather: null,
      nflverse: EMPTY_NFLVERSE_SIGNALS,
      hasLimitedTeammate: false,
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
    InjuryStatus: weekSlice.nflverseStatForWeek(playerId, targetWeek)?.injuryStatus ?? null,
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
    goalLineTouches: averageGoalLineTouches(
      recentGames,
      (week) => weekSlice.nflverseStatForWeek(playerId, week),
      position
    ),
    successRate: averageSuccessRate(recentNflverseStats, position),
    epaPerPlay: averageEpaPerPlay(recentNflverseStats, position),
    dropRate: averageDropRate(recentNflverseStats, position),
    qbRushEpaPerPlay: averageQbRushEpa(recentNflverseStats, position),
  };

  const hasLimitedTeammate = team ? weekSlice.hasLimitedTeammate(team, position, playerId, targetWeek) : false;

  return {
    requestedPlayerId: playerId,
    player,
    playerLabel: `${anyPlayer.FirstName} ${anyPlayer.LastName}`,
    seasonStat,
    recentGames,
    byeWeek,
    isOnByeThisWeek,
    matchupContext,
    nextOpponent: null,
    nextGameWeather: null,
    nflverse,
    hasLimitedTeammate,
  };
}
