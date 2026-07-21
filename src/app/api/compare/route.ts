import { getPositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { buildComparisonInput } from "@/lib/recommendation/buildInput";
import { comparePlayers } from "@/lib/recommendation/engine";

export async function GET(request: Request) {
  const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length < 2) {
    return Response.json(
      { error: "Select at least two players to compare." },
      { status: 400 }
    );
  }

  try {
    const context = await getSeasonContext();
    const positionDefenseTable = await getPositionDefenseTable(
      context.lastCompletedApiSeason,
      context.lastCompletedWeek
    );

    const inputs = await Promise.all(
      ids.map((id) => buildComparisonInput(id, context, positionDefenseTable))
    );

    const result = comparePlayers(inputs);

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
