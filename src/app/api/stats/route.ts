import { getStatsLeaderboard } from "@/lib/stats/leaderboard";
import { isStatsPosition, STATS_POSITIONS } from "@/lib/stats/types";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";

/** The earliest season this app's subscriptions can serve stats for (see CLAUDE.md's Data Source Notes — anything earlier 401s). */
const MIN_STATS_SEASON = 2025;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const position = url.searchParams.get("position") ?? "QB";
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));
  const seasonParam = Number(url.searchParams.get("season"));

  if (!isStatsPosition(position)) {
    return Response.json(
      { error: `Pick one of: ${STATS_POSITIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const context = await getSeasonContext();
    // Defaults to the last completed season. An explicit season is honoured
    // as long as it's one we can actually serve — the readers are
    // season-routed across two subscriptions (see seasonRouting.ts), so an
    // out-of-range year would just 401 rather than return anything useful.
    const season =
      Number.isFinite(seasonParam) && seasonParam >= MIN_STATS_SEASON && seasonParam <= context.lastCompletedSeason + 1
        ? seasonParam
        : context.lastCompletedSeason;
    const rows = await getStatsLeaderboard(season, position, format);
    return Response.json({
      season,
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
