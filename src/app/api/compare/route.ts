import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";
import { getLiveExpertConsensusByNormalizedName } from "@/lib/fantasypros/liveConsensus";
import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { compareBreakdowns } from "@/lib/recommendation/engine";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { getPropsForPlayers } from "@/lib/oddsapi/props";
import { scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import {
  getDepthChartRankCached,
  getGameWeatherCached,
  getImpliedTotalsCached,
  getPositionDefenseTableCached,
  getRemainingOpponentsCached,
} from "@/lib/cache/liveAggregates";
import { type RemainingGame } from "@/lib/nflverse/schedules";

// A cold nflverse cache means aggregating the full play-by-play release
// for red-zone touches (~5-7s) on top of everything else this route
// already does — same 30s margin the backtest routes use.
export const maxDuration = 30;

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
    const [positionDefenseTable, nflversePlayerWeekTable, firstAttempt, expertConsensusByNormalizedName, depthRankByName] =
      await Promise.all([
        getPositionDefenseTableCached(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
        getLiveNflversePlayerWeekTable(context.lastCompletedSeason),
        getRemainingOpponentsCached(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
          () => new Map<string, RemainingGame[]>()
        ),
        getLiveExpertConsensusByNormalizedName(context).catch(() => new Map()),
        getDepthChartRankCached(context.lastCompletedSeason).catch(() => new Map<string, number>()),
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
          expertConsensusByNormalizedName
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

    // Display-only betting-line context for the cards (The Odds API,
    // current/upcoming games). Fails open to {} — never blocks the
    // comparison, and empty during the offseason before books post props.
    const propsByPlayerId = await getPropsForPlayers(
      breakdowns
        .filter((b) => b.playerId != null)
        .map((b) => ({ playerId: b.playerId!, name: b.displayName, team: b.team, position: b.position }))
    ).catch(() => ({}));

    return Response.json({
      result,
      propsByPlayerId,
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
