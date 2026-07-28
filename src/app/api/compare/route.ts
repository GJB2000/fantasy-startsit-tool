import { getPositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";
import { compareBreakdowns } from "@/lib/recommendation/engine";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import {
  getGameWeatherByTeamWeek,
  getImpliedTeamTotalsByTeamWeek,
  getRemainingOpponentsByTeam,
  type RemainingGame,
} from "@/lib/nflverse/schedules";

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
    const [positionDefenseTable, nflversePlayerWeekTable, firstAttempt] = await Promise.all([
      getPositionDefenseTable(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
      getLiveNflversePlayerWeekTable(context.lastCompletedSeason),
      getRemainingOpponentsByTeam(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
        () => new Map<string, RemainingGame[]>()
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
      remainingOpponentsByTeam = await getRemainingOpponentsByTeam(scheduleSeason, 1).catch(
        () => new Map<string, RemainingGame[]>()
      );
    }
    const [teamWeatherByTeamWeek, impliedTotalsByTeamWeek] = await Promise.all([
      getGameWeatherByTeamWeek(scheduleSeason).catch(() => new Map()),
      getImpliedTeamTotalsByTeamWeek(scheduleSeason).catch(() => new Map()),
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
          impliedTotalsByTeamWeek
        )
      )
    );

    const result = compareBreakdowns(breakdowns);

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
