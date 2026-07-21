import { DEFAULT_BACKTEST_API_SEASON, DEFAULT_BACKTEST_SEASON, MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { parseWeeksParam } from "@/lib/backtest/params";
import { runPairBacktest } from "@/lib/backtest/runBacktest";

export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length !== 2) {
    return Response.json({ error: "Select exactly two players to backtest." }, { status: 400 });
  }

  const season = Number(url.searchParams.get("season") ?? DEFAULT_BACKTEST_SEASON);
  const apiSeason = url.searchParams.get("apiSeason") ?? DEFAULT_BACKTEST_API_SEASON;
  const weeks = parseWeeksParam(url.searchParams.get("weeks"), MAX_BACKTEST_WEEK);

  if (weeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested range." }, { status: 400 });
  }

  try {
    const { weekResults, summary } = await runPairBacktest(
      [ids[0], ids[1]],
      season,
      apiSeason,
      weeks
    );

    return Response.json({
      weekResults,
      summary,
      context: {
        season,
        apiSeason,
        weeks,
        injuryCaveat:
          "Historical injury status can't be reconstructed for this data source (archived records only ever show None/Out/Probable, never Questionable/Doubtful, and Out is indistinguishable from simply not playing). This backtest evaluates the recent-form and matchup-difficulty logic only — not the injury-flagging behavior the live tool uses.",
      },
    });
  } catch (err) {
    console.error("Failed to run pair backtest:", err);
    return Response.json(
      { error: "Something went wrong running the backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
