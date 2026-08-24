import { getLiveProjectedPointsByPlayerId } from "@/lib/sportsdata/liveProjections";
import { getPriorSeasonPprAveragesByNormalizedName } from "@/lib/nflverse/priorSeasonAverage";
import { parseSlotsParam } from "@/lib/lineup/rosterSlots";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { type RemainingGame } from "@/lib/nflverse/schedules";
import {
  getGameWeatherCached,
  getImpliedTotalsCached,
  getPositionDefenseTableCached,
  getRemainingOpponentsCached,
  COLD_FETCH_TIMEOUT_MS,
} from "@/lib/cache/liveAggregates";
import { resolveSleeperRoster } from "@/lib/sleeper/resolveRoster";
import { getSeasonProjectionMap } from "@/lib/sportsdata/seasonProjectionMap";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";
import { suggestLeagueTrade } from "@/lib/trade/suggestLeagueTrade";

// Same margin as /api/lineup/waivers/trade — a cold nflverse cache means
// aggregating the full play-by-play release (~5-7s) on top of scoring
// your roster plus a bounded set of candidates from other real rosters.
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const leagueId = url.searchParams.get("leagueId");
  const userId = url.searchParams.get("userId");
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));
  const slotCounts = parseSlotsParam(url.searchParams.get("slots"));

  if (!leagueId || !userId) {
    return Response.json({ error: "Connect a Sleeper league to see trade suggestions." }, { status: 400 });
  }

  try {
    const [context, resolved] = await Promise.all([getSeasonContext(), resolveSleeperRoster(leagueId, userId)]);

    const [
      positionDefenseTable,
      nflversePlayerWeekTable,
      firstAttempt,
      projectedPointsByPlayerId,
      priorSeasonPprAvgByNormalizedName,
    ] = await Promise.all([
      getPositionDefenseTableCached(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
      getLiveNflversePlayerWeekTable(context.lastCompletedSeason, { redZoneTimeoutMs: COLD_FETCH_TIMEOUT_MS }),
      getRemainingOpponentsCached(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
        () => new Map<string, RemainingGame[]>()
      ),
      getLiveProjectedPointsByPlayerId(context, format).catch(() => new Map<number, number>()),
      // Prior-season per-game average — fallback for a rostered player with
      // zero games this season (see buildInput.ts / scorePlayer's fallback).
      getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason - 1, format).catch(
        () => new Map<string, number>()
      ),
    ]);

    // Same season-rollforward pattern as /api/compare, /api/trade, /api/lineup.
    let scheduleSeason = context.lastCompletedSeason;
    let remainingOpponentsByTeam = firstAttempt;
    if (remainingOpponentsByTeam.size === 0) {
      scheduleSeason = context.lastCompletedSeason + 1;
      remainingOpponentsByTeam = await getRemainingOpponentsCached(scheduleSeason, 1).catch(
        () => new Map<string, RemainingGame[]>()
      );
    }
    const [teamWeatherByTeamWeek, impliedTotalsByTeamWeek, seasonProjections] = await Promise.all([
      getGameWeatherCached(scheduleSeason).catch(() => new Map()),
      getImpliedTotalsCached(scheduleSeason).catch(() => new Map()),
      getSeasonProjectionMap(scheduleSeason, format).catch(() => new Map()),
    ]);

    const yourPlayerIds = resolved.players.map((p) => p.playerId);

    const result = await suggestLeagueTrade(
      yourPlayerIds,
      resolved.otherTeams,
      slotCounts,
      context,
      format,
      positionDefenseTable,
      nflversePlayerWeekTable,
      remainingOpponentsByTeam,
      teamWeatherByTeamWeek,
      impliedTotalsByTeamWeek,
      projectedPointsByPlayerId,
      priorSeasonPprAvgByNormalizedName,
      seasonProjections
    );

    return Response.json({
      ...result,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        contextNote: context.isInSeason
          ? `Values reflect current form through Week ${context.lastCompletedWeek} of the ${context.lastCompletedSeason} season, projected across each player's remaining schedule.`
          : `The ${context.lastCompletedSeason + 1} season hasn't started yet — based on the completed ${context.lastCompletedSeason} season.`,
      },
    });
  } catch (err) {
    console.error("Failed to build trade suggestion:", err);
    return Response.json(
      { error: "Something went wrong pulling league/matchup data. Try again shortly." },
      { status: 502 }
    );
  }
}
