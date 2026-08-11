import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";
import { getLiveExpertConsensusByNormalizedName } from "@/lib/fantasypros/liveConsensus";
import { getPriorSeasonPprAveragesByNormalizedName } from "@/lib/nflverse/priorSeasonAverage";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectExtendedRestOfSeason, scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import { type RemainingGame } from "@/lib/nflverse/schedules";
import {
  getGameWeatherCached,
  getImpliedTotalsCached,
  getPositionDefenseTableCached,
  getRemainingOpponentsCached,
} from "@/lib/cache/liveAggregates";
import { evaluateTrade, toTradePlayerResult, type TradePlayerResult } from "@/lib/trade/evaluateTrade";

// Same margin as /api/compare — a cold nflverse cache means aggregating
// the full play-by-play release (~5-7s) on top of everything else.
export const maxDuration = 30;

function parseIds(param: string | null): number[] {
  return (param ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const giveIds = parseIds(url.searchParams.get("give"));
  const getIds = parseIds(url.searchParams.get("get"));
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  if (giveIds.length === 0 || getIds.length === 0) {
    return Response.json(
      { error: "Add at least one player to each side of the trade." },
      { status: 400 }
    );
  }

  try {
    const context = await getSeasonContext();

    const [
      positionDefenseTable,
      nflversePlayerWeekTable,
      firstAttempt,
      expertConsensusByNormalizedName,
      priorSeasonPprAvgByNormalizedName,
    ] = await Promise.all([
      getPositionDefenseTableCached(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
      getLiveNflversePlayerWeekTable(context.lastCompletedSeason),
      getRemainingOpponentsCached(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
        () => new Map<string, RemainingGame[]>()
      ),
      getLiveExpertConsensusByNormalizedName(context).catch(() => new Map()),
      // Prior-season per-game average — fallback for a player with zero games
      // this season (see buildInput.ts / scorePlayer's blendedScore fallback).
      getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason - 1, format).catch(
        () => new Map<string, number>()
      ),
    ]);

    // Try continuing the season lastCompletedWeek belongs to first; if it
    // has no games left, roll forward to the next season's full schedule.
    // Deliberately NOT keyed off `isInSeason` — that flag can flip true a
    // few days before `lastCompletedWeek` itself advances (kickoff week is
    // already "in season" before its own timeframe has an EndDate in the
    // past), which would otherwise misresolve to a stale, already-finished
    // season for that narrow window every year.
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

    const scoreFor = async (id: number): Promise<TradePlayerResult> => {
      const breakdown = await scoreExtendedPlayer(
        id,
        context,
        format,
        positionDefenseTable,
        nflversePlayerWeekTable,
        remainingOpponentsByTeam,
        teamWeatherByTeamWeek,
        impliedTotalsByTeamWeek,
        expertConsensusByNormalizedName,
        priorSeasonPprAvgByNormalizedName
      );
      const projection = projectExtendedRestOfSeason(
        breakdown,
        remainingOpponentsByTeam,
        impliedTotalsByTeamWeek,
        positionDefenseTable
      );
      return toTradePlayerResult(breakdown, projection);
    };

    const [give, get] = await Promise.all([Promise.all(giveIds.map(scoreFor)), Promise.all(getIds.map(scoreFor))]);

    const evaluation = evaluateTrade(give, get);

    return Response.json({
      evaluation,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedApiSeason: context.lastCompletedApiSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        isInSeason: context.isInSeason,
        contextNote:
          scheduleSeason === context.lastCompletedSeason
            ? `Values reflect current form (through Week ${context.lastCompletedWeek} of the ${context.lastCompletedSeason} season), projected across each player's remaining schedule this season.`
            : `The ${scheduleSeason} season hasn't started yet — current form is based on the completed ${context.lastCompletedSeason} season, projected across each player's full ${scheduleSeason} schedule.`,
      },
    });
  } catch (err) {
    console.error("Failed to evaluate trade:", err);
    return Response.json(
      { error: "Something went wrong pulling matchup data. Try again shortly." },
      { status: 502 }
    );
  }
}
