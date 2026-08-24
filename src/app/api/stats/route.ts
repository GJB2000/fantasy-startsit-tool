import { getStatsLeaderboard } from "@/lib/stats/leaderboard";
import { isStatsPosition, STATS_POSITIONS } from "@/lib/stats/types";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const position = url.searchParams.get("position") ?? "QB";
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  if (!isStatsPosition(position)) {
    return Response.json(
      { error: `Pick one of: ${STATS_POSITIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const context = await getSeasonContext();
    const rows = await getStatsLeaderboard(context.lastCompletedSeason, position, format);
    return Response.json({
      season: context.lastCompletedSeason,
      format,
      position,
      rows,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        isInSeason: context.isInSeason,
      },
    });
  } catch (err) {
    console.error("Failed to build the stats leaderboard:", err);
    return Response.json({ error: "Couldn't load stats. Try again shortly." }, { status: 502 });
  }
}
