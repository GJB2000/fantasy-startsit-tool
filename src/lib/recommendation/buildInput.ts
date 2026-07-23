import { averageRedZoneTouches, averageSeparation, averageSnapShare, averageTargetShare } from "@/lib/nflverse/aggregate";
import { getByeWeekForTeam } from "@/lib/sportsdata/byes";
import { getActivePlayerById, getAnyPlayerById } from "@/lib/sportsdata/players";
import { getMatchupContext, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getPlayerSeasonStat } from "@/lib/sportsdata/seasonStats";
import { isSkillPosition } from "@/lib/sportsdata/types";
import { getRecentGameStatsForPlayer } from "@/lib/sportsdata/weeklyStats";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { NflversePlayerWeekTable } from "./nflverseLive";
import { EMPTY_NFLVERSE_SIGNALS, type PlayerComparisonInput } from "./types";

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
    };
  }

  const [seasonStat, recentGames, byeWeek] = await Promise.all([
    getPlayerSeasonStat(context.lastCompletedSeason, playerId).catch(() => null),
    getRecentGameStatsForPlayer(context.lastCompletedApiSeason, context.recentWeeks, playerId).catch(
      () => []
    ),
    player.Team
      ? getByeWeekForTeam(context.lastCompletedSeason, player.Team).catch(() => null)
      : Promise.resolve(null),
  ]);

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
  };
}
