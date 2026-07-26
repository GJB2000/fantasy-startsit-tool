import { getPositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { buildComparisonInput } from "@/lib/recommendation/buildInput";
import { scorePlayer } from "@/lib/recommendation/engine";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectRestOfSeason } from "@/lib/recommendation/restOfSeason";
import { getRemainingOpponentsByTeam, type RemainingGame } from "@/lib/nflverse/schedules";
import { evaluateTrade, toTradePlayerResult } from "@/lib/trade/evaluateTrade";

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

  if (giveIds.length === 0 || getIds.length === 0) {
    return Response.json(
      { error: "Add at least one player to each side of the trade." },
      { status: 400 }
    );
  }

  try {
    const context = await getSeasonContext();

    const [positionDefenseTable, nflversePlayerWeekTable, firstAttempt] = await Promise.all([
      getPositionDefenseTable(context.lastCompletedApiSeason, context.lastCompletedWeek),
      getLiveNflversePlayerWeekTable(context.lastCompletedSeason),
      getRemainingOpponentsByTeam(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
        () => new Map<string, RemainingGame[]>()
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
      remainingOpponentsByTeam = await getRemainingOpponentsByTeam(scheduleSeason, 1).catch(
        () => new Map<string, RemainingGame[]>()
      );
    }

    const buildFor = (id: number) =>
      buildComparisonInput(id, context, positionDefenseTable, nflversePlayerWeekTable);

    const [giveInputs, getInputs] = await Promise.all([
      Promise.all(giveIds.map(buildFor)),
      Promise.all(getIds.map(buildFor)),
    ]);

    const toResult = (input: Awaited<ReturnType<typeof buildFor>>) => {
      const breakdown = scorePlayer(input);
      const projection = projectRestOfSeason(breakdown, remainingOpponentsByTeam, positionDefenseTable);
      return toTradePlayerResult(breakdown, projection);
    };

    const give = giveInputs.map(toResult);
    const get = getInputs.map(toResult);

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
