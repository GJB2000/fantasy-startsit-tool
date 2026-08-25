import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";
import { getLiveProjectedPointsByPlayerId } from "@/lib/sportsdata/liveProjections";
import { getPriorSeasonPprAveragesByNormalizedName } from "@/lib/nflverse/priorSeasonAverage";
import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { compareBreakdowns } from "@/lib/recommendation/engine";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import {
  COLD_FETCH_TIMEOUT_MS,
  getDepthChartRankCached,
  getGameWeatherCached,
  getImpliedTotalsCached,
  getPositionDefenseTableCached,
  getRemainingOpponentsCached,
  withColdTimeout,
} from "@/lib/cache/liveAggregates";
import { type RemainingGame } from "@/lib/nflverse/schedules";

// A cold nflverse cache means aggregating the full play-by-play release
// for red-zone touches (~5-7s) on top of everything else this route
// already does — same 30s margin the backtest routes use.
export const maxDuration = 30;

// On a cold cache (every Vercel deploy wipes the persistent Data Cache), the
// two heaviest parses — the depth-chart file (confidence floor only, never the
// pick) and the play-by-play red-zone aggregate (WR drop-rate only) — are
// timeout-guarded (COLD_FETCH_TIMEOUT_MS) so the first comparison returns fast;
// the real parse finishes in the background and warms the cache for the next
// request (see withColdTimeout).

export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  if (ids.length < 2) {
    return Response.json(
      { error: "Select at least two players to compare." },
      { status: 400 }
    );
  }

  try {
    const context = await getSeasonContext();
    const [
      positionDefenseTable,
      nflversePlayerWeekTable,
      firstAttempt,
      projectedPointsByPlayerId,
      depthRankByName,
      priorSeasonPprAvgByNormalizedName,
    ] = await Promise.all([
      getPositionDefenseTableCached(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
      getLiveNflversePlayerWeekTable(context.lastCompletedSeason, { redZoneTimeoutMs: COLD_FETCH_TIMEOUT_MS }),
      getRemainingOpponentsCached(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
        () => new Map<string, RemainingGame[]>()
      ),
      getLiveProjectedPointsByPlayerId(context, format).catch(() => new Map<number, number>()),
      withColdTimeout(
        getDepthChartRankCached(context.lastCompletedSeason).catch(() => new Map<string, number>()),
        COLD_FETCH_TIMEOUT_MS,
        new Map<string, number>()
      ),
      // Fallback for a player with zero games this season (week 1, a rookie
      // call-up, or a return from a long absence) — the prior season's own
      // per-game average, used only when recent + season-to-date are both
      // empty (see buildInput.ts / scorePlayer's blendedScore fallback).
      getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason - 1, format).catch(
        () => new Map<string, number>()
      ),
    ]);

    // Same season-rollforward pattern as /api/trade — try continuing the
    // season lastCompletedWeek belongs to first; if it has no games left,
    // roll forward to the next season's full schedule. Deliberately NOT
    // keyed off `isInSeason` — see trade/route.ts's comment for why.
    let scheduleSeason = context.lastCompletedSeason;
    let remainingOpponentsByTeam = firstAttempt;
    if (remainingOpponentsByTeam.size === 0) {
      scheduleSeason = context.lastCompletedSeason + 1;
      remainingOpponentsByTeam = await getRemainingOpponentsCached(scheduleSeason, 1).catch(
        () => new Map<string, RemainingGame[]>()
      );
    }
    const [teamWeatherByTeamWeek, impliedTotalsByTeamWeek] = await Promise.all([
      getGameWeatherCached(scheduleSeason).catch(() => new Map()),
      getImpliedTotalsCached(scheduleSeason).catch(() => new Map()),
    ]);

    const breakdowns = await Promise.all(
      ids.map((id) =>
        scoreExtendedPlayer(
          id,
          context,
          format,
          positionDefenseTable,
          nflversePlayerWeekTable,
          remainingOpponentsByTeam,
          teamWeatherByTeamWeek,
          impliedTotalsByTeamWeek,
          projectedPointsByPlayerId,
          priorSeasonPprAvgByNormalizedName
        )
      )
    );

    // Resolve current depth-chart rank onto each scored player, for the
    // depth-chart confidence floor (a listed starter over a clear backup).
    const depthRankByPlayerId = new Map<number, number>();
    for (const b of breakdowns) {
      if (b.playerId == null) continue;
      const rank = depthRankByName.get(normalizePlayerName(b.displayName));
      if (rank != null) depthRankByPlayerId.set(b.playerId, rank);
    }

    const result = compareBreakdowns(breakdowns, depthRankByPlayerId);

    // Betting lines (display-only) are fetched separately by the client via
    // /api/props after this verdict renders, so that round-trip never
    // delays the comparison.
    return Response.json({
      result,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedApiSeason: context.lastCompletedApiSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        isInSeason: context.isInSeason,
        contextNote: context.isInSeason
          ? `Based on Week ${context.lastCompletedWeek} of the ${context.lastCompletedSeason} season.`
          : `The ${context.lastCompletedSeason + 1} season hasn't started yet — this comparison is based on the completed ${context.lastCompletedSeason} season, through Week ${context.lastCompletedWeek}.`,
      },
    });
  } catch (err) {
    console.error("Failed to build comparison:", err);
    return Response.json(
      { error: "Something went wrong pulling matchup data. Try again shortly." },
      { status: 502 }
    );
  }
}
