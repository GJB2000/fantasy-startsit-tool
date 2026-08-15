import { getLiveExpertConsensusByNormalizedName } from "@/lib/fantasypros/liveConsensus";
import { type RemainingGame } from "@/lib/nflverse/schedules";
import {
  getGameWeatherCached,
  getImpliedTotalsCached,
  getPositionDefenseTableCached,
  getRemainingOpponentsCached,
  COLD_FETCH_TIMEOUT_MS,
} from "@/lib/cache/liveAggregates";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { getLegitRankingsForPosition, getLegitRankingsOverall, RANKABLE_POSITIONS } from "@/lib/rankings/buildRankings";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat, type ExtendedPosition } from "@/lib/sportsdata/types";

// Same margin as every other live route — a cold nflverse cache means
// aggregating the full play-by-play release (~5-7s) on top of scoring
// every rankable player at one position. Results are cached in-process
// after the first computation (see buildRankings.ts), so only a cold
// cache actually needs this much headroom.
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const positionParam = url.searchParams.get("position") ?? "";
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  const isOverall = positionParam === "OVERALL";
  const isRankable = (RANKABLE_POSITIONS as readonly string[]).includes(positionParam);
  if (!isOverall && !isRankable) {
    return Response.json({ error: "Pick a valid position to rank." }, { status: 400 });
  }

  try {
    const context = await getSeasonContext();

    const [positionDefenseTable, nflversePlayerWeekTable, firstAttempt, expertConsensusByNormalizedName] =
      await Promise.all([
        getPositionDefenseTableCached(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
        getLiveNflversePlayerWeekTable(context.lastCompletedSeason, { redZoneTimeoutMs: COLD_FETCH_TIMEOUT_MS }),
        getRemainingOpponentsCached(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
          () => new Map<string, RemainingGame[]>()
        ),
        // Offseason-aware consensus (item 103): weekly in-season, but the
        // current season-long REDRAFT consensus in the offseason. Legit
        // Rankings previously used the frozen weekly snapshot here, which
        // in the offseason is stuck at last season's final week — where an
        // elite player who was hurt at season's end (e.g. Lamar Jackson) is
        // simply absent, so his engine snapshot got NO consensus support and
        // his injury-tanked recent games dominated his (mislabeled "full")
        // score, ranking him far below his real value. See buildRankings.ts.
        getLiveExpertConsensusByNormalizedName(context).catch(() => new Map()),
      ]);

    // Same season-rollforward pattern as every other live route.
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

    const rankings = isOverall
      ? await getLegitRankingsOverall(
          context,
          format,
          positionDefenseTable,
          nflversePlayerWeekTable,
          remainingOpponentsByTeam,
          teamWeatherByTeamWeek,
          impliedTotalsByTeamWeek,
          expertConsensusByNormalizedName
        )
      : await getLegitRankingsForPosition(
          positionParam as ExtendedPosition,
          context,
          format,
          positionDefenseTable,
          nflversePlayerWeekTable,
          remainingOpponentsByTeam,
          teamWeatherByTeamWeek,
          impliedTotalsByTeamWeek,
          expertConsensusByNormalizedName
        );

    return Response.json({
      rankings,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        contextNote: context.isInSeason
          ? `Ranked on current form through Week ${context.lastCompletedWeek} of the ${context.lastCompletedSeason} season.`
          : `The ${context.lastCompletedSeason + 1} season hasn't started yet — ranked on current form from the completed ${context.lastCompletedSeason} season.`,
      },
    });
  } catch (err) {
    console.error("Failed to build Legit Rankings:", err);
    return Response.json(
      { error: "Something went wrong pulling matchup data. Try again shortly." },
      { status: 502 }
    );
  }
}
