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
import { getByeWeekForTeam } from "@/lib/sportsdata/byes";
import { getActivePlayerById, getAllPlayers, getAnyPlayerById } from "@/lib/sportsdata/players";
import { getMatchupContext, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getPlayerSeasonStat } from "@/lib/sportsdata/seasonStats";
import { isSkillPosition } from "@/lib/sportsdata/types";
import { getRecentGameStatsForPlayer } from "@/lib/sportsdata/weeklyStats";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { NflversePlayerWeekTable } from "./nflverseLive";
import { EMPTY_NFLVERSE_SIGNALS, type PlayerComparisonInput } from "./types";

const LIMITED_INJURY_STATUSES = new Set(["Out", "Doubtful"]);

export async function buildComparisonInput(
  playerId: number,
  context: SeasonContext,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable
): Promise<PlayerComparisonInput> {
  const player = await getActivePlayerById(playerId).catch(() => null);

  if (!player) {
    const anyPlayer = await getAnyPlayerById(playerId).catch(() => null);
    const playerLabel = anyPlayer ? `${anyPlayer.FirstName} ${anyPlayer.LastName}` : null;
    return {
      requestedPlayerId: playerId,
      player: null,
      playerLabel,
      seasonStat: null,
      recentGames: [],
      byeWeek: null,
      isOnByeThisWeek: false,
      matchupContext: null,
      nflverse: EMPTY_NFLVERSE_SIGNALS,
      hasLimitedTeammate: false,
    };
  }

  const [seasonStat, recentGames, byeWeek, allPlayers] = await Promise.all([
    getPlayerSeasonStat(context.lastCompletedSeason, playerId).catch(() => null),
    getRecentGameStatsForPlayer(context.lastCompletedApiSeason, context.recentWeeks, playerId).catch(
      () => []
    ),
    player.Team
      ? getByeWeekForTeam(context.lastCompletedSeason, player.Team).catch(() => null)
      : Promise.resolve(null),
    getAllPlayers().catch(() => []),
  ]);

  const hasLimitedTeammate = allPlayers.some(
    (p) =>
      p.PlayerID !== playerId &&
      p.Team === player.Team &&
      p.Position === player.Position &&
      p.InjuryStatus != null &&
      LIMITED_INJURY_STATUSES.has(p.InjuryStatus)
  );

  const isOnByeThisWeek = byeWeek !== null && byeWeek === context.lastCompletedWeek;

  let matchupContext = null;
  const lastGame = recentGames.at(-1);
  if (lastGame && isSkillPosition(player.Position)) {
    matchupContext = getMatchupContext(positionDefenseTable, lastGame.Opponent, player.Position);
  }

  const byWeek = nflversePlayerWeekTable.get(playerId);
  const recentNflverseStats = byWeek
    ? context.recentWeeks.map((week) => byWeek.get(week)).filter((stat): stat is NonNullable<typeof stat> => stat != null)
    : [];
  const nflverse = {
    snapShare: averageSnapShare(recentNflverseStats),
    targetShare: averageTargetShare(recentNflverseStats),
    separation: averageSeparation(recentNflverseStats),
    redZoneTouches: averageRedZoneTouches(recentGames, (week) => byWeek?.get(week), player.Position),
    goalLineTouches: averageGoalLineTouches(recentGames, (week) => byWeek?.get(week), player.Position),
    successRate: averageSuccessRate(recentNflverseStats, player.Position),
    epaPerPlay: averageEpaPerPlay(recentNflverseStats, player.Position),
    dropRate: averageDropRate(recentNflverseStats, player.Position),
    qbRushEpaPerPlay: averageQbRushEpa(recentNflverseStats, player.Position),
  };

  return {
    requestedPlayerId: playerId,
    player,
    playerLabel: `${player.FirstName} ${player.LastName}`,
    seasonStat,
    recentGames,
    byeWeek,
    isOnByeThisWeek,
    matchupContext,
    nflverse,
    hasLimitedTeammate,
  };
}
