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
import type { ExpertConsensusEntry } from "@/lib/fantasypros/weeklyConsensus";
import { getByeWeekForTeam } from "@/lib/sportsdata/byes";
import { getActivePlayerById, getAllPlayers, getAnyPlayerById } from "@/lib/sportsdata/players";
import { getMatchupContext, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getPlayerSeasonStat } from "@/lib/sportsdata/seasonStats";
import { isSkillPosition } from "@/lib/sportsdata/types";
import { getRecentGameStatsForPlayer } from "@/lib/sportsdata/weeklyStats";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { RECENT_WEEK_COUNT } from "./config";
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
  expertConsensusByNormalizedName: Map<string, ExpertConsensusEntry> = new Map()
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

  // In-season, the recent-form window is the last few calendar weeks — the
  // behavior the backtest validates, where a recently-injured player is
  // often still limited the next week, so those games genuinely predict it.
  // In the OFFSEASON, we're projecting a future season's Week 1 off last
  // season's tail: a recent injury there is long healed and its half-games
  // are stale noise, so instead take the player's last RECENT_WEEK_COUNT
  // games actually PLAYED over a wider lookback — backfilling past the
  // injury with real pre-absence games (e.g. Lamar Jackson: out/limited
  // weeks 15-18, whose calendar window was three half-games at ~13 pass
  // attempts, tanking the volume signal). Gated on isInSeason so it can
  // only change the offseason regime the backtest can't represent.
  const offseasonBackfill = !context.isInSeason;
  const recentLookbackStart = Math.max(1, context.lastCompletedWeek - RECENT_WEEK_COUNT * 2 + 1);
  const recentLookbackWeeks = Array.from(
    { length: context.lastCompletedWeek - recentLookbackStart + 1 },
    (_, i) => recentLookbackStart + i
  );
  const recentWeeksForGames = offseasonBackfill ? recentLookbackWeeks : context.recentWeeks;
  const recentGamesLimit = offseasonBackfill ? RECENT_WEEK_COUNT : undefined;

  const [seasonStat, recentGames, byeWeek, allPlayers] = await Promise.all([
    getPlayerSeasonStat(context.lastCompletedSeason, playerId).catch(() => null),
    getRecentGameStatsForPlayer(
      context.lastCompletedApiSeason,
      recentWeeksForGames,
      playerId,
      recentGamesLimit
    ).catch(() => []),
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
  };

  const normalizedName = normalizePlayerName(`${player.FirstName} ${player.LastName}`);

  const priorSeasonPprAvg =
    recentGames.length === 0 && seasonStat == null
      ? (priorSeasonPprAvgByNormalizedName.get(normalizedName) ?? null)
      : null;

  // Live counterpart to buildBacktestComparisonInput's per-week lookup —
  // there's no week dimension here, just "what does the consensus say
  // right now" (see fantasypros/weeklyConsensus.ts's
  // getCurrentExpertConsensusByNormalizedName).
  const expertConsensusR2pPts = expertConsensusByNormalizedName.get(normalizedName)?.r2pPts ?? null;

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
