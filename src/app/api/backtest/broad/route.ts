import { BASELINE_LABELS } from "@/lib/backtest/baselines";
import { DEFAULT_BACKTEST_API_SEASON, DEFAULT_BACKTEST_SEASON, MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { parsePositionsParam, parseWeeksParam } from "@/lib/backtest/params";
import { runBroadBacktest } from "@/lib/backtest/runBacktest";

export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);

  const season = Number(url.searchParams.get("season") ?? DEFAULT_BACKTEST_SEASON);
  const apiSeason = url.searchParams.get("apiSeason") ?? DEFAULT_BACKTEST_API_SEASON;
  const weeks = parseWeeksParam(url.searchParams.get("weeks"), MAX_BACKTEST_WEEK);
  const positions = parsePositionsParam(url.searchParams.get("positions"));

  if (weeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested range." }, { status: 400 });
  }

  try {
    const { byWeek, byPosition, overall, baselineSummaries, confidenceBreakdown } = await runBroadBacktest(
      season,
      apiSeason,
      weeks,
      positions
    );

    return Response.json({
      byWeek,
      byPosition,
      overall,
      baselineSummaries,
      baselineLabels: BASELINE_LABELS,
      confidenceBreakdown,
      context: {
        season,
        apiSeason,
        weeks,
        positions,
        injuryCaveat:
          "Historical injury status can't be reconstructed for this data source (archived records only ever show None/Out/Probable, never Questionable/Doubtful, and Out is indistinguishable from simply not playing). This backtest evaluates the recent-form and matchup-difficulty logic only — not the injury-flagging behavior the live tool uses.",
      },
    });
  } catch (err) {
    console.error("Failed to run broad backtest:", err);
    return Response.json(
      { error: "Something went wrong running the backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
