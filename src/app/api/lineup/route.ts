import { getPositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";
import { getCurrentExpertConsensusByNormalizedName } from "@/lib/fantasypros/weeklyConsensus";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import {
  getGameWeatherByTeamWeek,
  getImpliedTeamTotalsByTeamWeek,
  getRemainingOpponentsByTeam,
  type RemainingGame,
} from "@/lib/nflverse/schedules";
import { optimizeLineup } from "@/lib/lineup/optimizeLineup";
import { parseSlotsParam } from "@/lib/lineup/rosterSlots";

// Same margin as /api/compare and /api/trade — a cold nflverse cache
// means aggregating the full play-by-play release (~5-7s) on top of
// scoring the whole roster at once.
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));
  const slotCounts = parseSlotsParam(url.searchParams.get("slots"));

  if (ids.length === 0) {
    return Response.json({ error: "Add at least one player to your roster." }, { status: 400 });
  }

  try {
    const context = await getSeasonContext();
    const [positionDefenseTable, nflversePlayerWeekTable, firstAttempt, expertConsensusByNormalizedName] =
      await Promise.all([
        getPositionDefenseTable(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
        getLiveNflversePlayerWeekTable(context.lastCompletedSeason),
        getRemainingOpponentsByTeam(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
          () => new Map<string, RemainingGame[]>()
        ),
        getCurrentExpertConsensusByNormalizedName().catch(() => new Map()),
      ]);

    // Same season-rollforward pattern as /api/compare and /api/trade.
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
          impliedTotalsByTeamWeek,
          expertConsensusByNormalizedName
        )
      )
    );

    const { slots, bench } = optimizeLineup(breakdowns, slotCounts);

    return Response.json({
      slots,
      bench,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        contextNote: context.isInSeason
          ? `Based on current form through Week ${context.lastCompletedWeek} of the ${context.lastCompletedSeason} season.`
          : `The ${context.lastCompletedSeason + 1} season hasn't started yet — based on the completed ${context.lastCompletedSeason} season, through Week ${context.lastCompletedWeek}.`,
      },
    });
  } catch (err) {
    console.error("Failed to build lineup:", err);
    return Response.json(
      { error: "Something went wrong pulling matchup data. Try again shortly." },
      { status: 502 }
    );
  }
}
