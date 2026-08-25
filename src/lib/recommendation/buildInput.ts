import {
  averageAirYardsShare,
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
import { getScorablePlayerById, getAllPlayers, getAnyPlayerById } from "@/lib/sportsdata/players";
import { getMatchupContext, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getPlayerSeasonStat } from "@/lib/sportsdata/seasonStats";
import { isSkillPosition } from "@/lib/sportsdata/types";
import { getRecentGameStatsForPlayer } from "@/lib/sportsdata/weeklyStats";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { getRecentWindow } from "./recentWindow";
import type { NflversePlayerWeekTable } from "./nflverseLive";
import { toNflverseTeam, toSdioTeam } from "./restOfSeason";
import { EMPTY_NFLVERSE_SIGNALS, type NextOpponent, type PlayerComparisonInput } from "./types";

const LIMITED_INJURY_STATUSES = new Set(["Out", "Doubtful"]);

export async function buildComparisonInput(
  playerId: number,
  context: SeasonContext,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]> = new Map(),
  teamWeatherByTeamWeek: Map<string, GameWeather> = new Map(),
  priorSeasonPprAvgByNormalizedName: Map<string, number> = new Map(),
  projectedPointsByPlayerId: Map<number, number> = new Map()
): Promise<PlayerComparisonInput> {
  const player = await getScorablePlayerById(playerId).catch(() => null);

  if (!player) {
    const anyPlayer = await getAnyPlayerById(playerId).catch(() => null);
    const playerLabel = anyPlayer ? `${anyPlayer.FirstName} ${anyPlayer.LastName}` : null;
    return {
      requestedPlayerId: playerId,
      player: null,
      playerLabel,
      seasonStat: null,
      recentGames: [],
      priorSeasonPprAvg: null,
      expertConsensusR2pPts: null,
      byeWeek: null,
      isOnByeThisWeek: false,
      matchupContext: null,
      nextOpponent: null,
      nextGameWeather: null,
      nflverse: EMPTY_NFLVERSE_SIGNALS,
      hasLimitedTeammate: false,
    };
  }

  // Recent-form window: in-season the last few calendar weeks; in the
  // offseason the last N games actually PLAYED over a wider lookback, so a
  // healed-months-ago injury doesn't leave a thin/poisoned sample for the
  // 0.9-weight volume signal to tank. See getRecentWindow's doc comment.
  const recentWindow = getRecentWindow(context);

  const [seasonStat, recentGames, byeWeek, allPlayers] = await Promise.all([
    getPlayerSeasonStat(context.lastCompletedSeason, playerId).catch(() => null),
    getRecentGameStatsForPlayer(
      context.lastCompletedApiSeason,
      recentWindow.weeks,
      playerId,
      recentWindow.limit ?? undefined
    ).catch(() => []),
    player.Team
      ? getByeWeekForTeam(context.lastCompletedSeason, player.Team).catch(() => null)
      : Promise.resolve(null),
    getAllPlayers().catch(() => []),
  ]);

  const hasLimitedTeammate =
    player.Team != null &&
    allPlayers.some(
      (p) =>
        p.PlayerID !== playerId &&
        p.Team === player.Team &&
        p.Position === player.Position &&
        p.InjuryStatus != null &&
        LIMITED_INJURY_STATUSES.has(p.InjuryStatus)
    );

  const isOnByeThisWeek = byeWeek !== null && byeWeek === context.lastCompletedWeek;

  // Next scheduled opponent from the real schedule. nflverse team codes
  // throughout remainingOpponentsByTeam/teamWeatherByTeamWeek, so translate
  // both directions around the lookup (toNflverseTeam/toSdioTeam handle the
  // one known mismatch, LAR/LA — see restOfSeason.ts).
  let nextOpponent: NextOpponent | null = null;
  let nextGameWeather: GameWeather | null = null;
  let nextOpponentSdioTeam: string | null = null;
  if (player.Team) {
    const nflverseTeam = toNflverseTeam(player.Team);
    const nextGame = remainingOpponentsByTeam.get(nflverseTeam)?.[0] ?? null;
    if (nextGame) {
      nextOpponentSdioTeam = toSdioTeam(nextGame.opponent);
      nextOpponent = { team: nextOpponentSdioTeam, week: nextGame.week };
      nextGameWeather = teamWeatherByTeamWeek.get(`${nflverseTeam}/${nextGame.week}`) ?? null;
    }
  }

  // Matchup rating uses the NEXT scheduled opponent — the game the player is
  // about to play — which matches backtest, where the matchup is always the
  // target week's opponent (buildBacktestInput.ts). Live previously used the
  // last *completed* opponent here, a real mismatch with the validated
  // methodology. Falls back to the most recent completed opponent only when
  // the schedule has no upcoming game, so a rating still shows. Skill
  // positions only (positionDefenseTable is skill-only; D/ST and K score
  // matchup off Vegas-implied totals instead).
  let matchupContext = null;
  if (isSkillPosition(player.Position)) {
    const matchupOpponent = nextOpponentSdioTeam ?? recentGames.at(-1)?.Opponent ?? null;
    if (matchupOpponent) {
      matchupContext = getMatchupContext(positionDefenseTable, matchupOpponent, player.Position);
    }
  }

  // Align the nflverse recent window to the exact games recentGames used
  // (so the offseason backfill's older games carry their nflverse signals
  // too, and the two windows never diverge). A no-op in-season for a
  // healthy player: their played weeks ARE context.recentWeeks.
  const byWeek = nflversePlayerWeekTable.get(playerId);
  const recentNflverseStats = byWeek
    ? recentGames
        .map((game) => byWeek.get(game.Week))
        .filter((stat): stat is NonNullable<typeof stat> => stat != null)
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
    airYardsShare: averageAirYardsShare(recentNflverseStats, player.Position),
  };

  const normalizedName = normalizePlayerName(`${player.FirstName} ${player.LastName}`);

  const priorSeasonPprAvg =
    recentGames.length === 0 && seasonStat == null
      ? (priorSeasonPprAvgByNormalizedName.get(normalizedName) ?? null)
      : null;

  // Live counterpart to buildBacktestComparisonInput's per-week lookup —
  // there's no week dimension here, just "what does the consensus say
  // right now" (see sportsdata/liveProjections.ts's
  // getLiveProjectedPointsByPlayerId, which is offseason-aware).
  const expertConsensusR2pPts = projectedPointsByPlayerId.get(playerId) ?? null;

  return {
    requestedPlayerId: playerId,
    player,
    playerLabel: `${player.FirstName} ${player.LastName}`,
    seasonStat,
    recentGames,
    priorSeasonPprAvg,
    expertConsensusR2pPts,
    byeWeek,
    isOnByeThisWeek,
    matchupContext,
    nextOpponent,
    nextGameWeather,
    nflverse,
    hasLimitedTeammate,
  };
}
