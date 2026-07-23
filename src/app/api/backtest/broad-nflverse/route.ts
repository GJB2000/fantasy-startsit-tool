import { BASELINE_LABELS } from "@/lib/backtest/baselines";
import { parsePositionsParam, parseWeeksParam } from "@/lib/backtest/params";
import { runBroadBacktestNflverseOnly } from "@/lib/backtest/runBacktestNflverseOnly";

// Heavier cold path than /api/backtest/broad: on top of the same
// play-by-play aggregation for red-zone touches, the primary box scores
// themselves (stats_player_week) are also being fetched fresh here
// rather than reused from an already-cached SportsDataIO call.
export const maxDuration = 60;

/**
 * Out-of-sample validation route — same shape as /api/backtest/broad,
 * but every field is sourced from nflverse instead of SportsDataIO, so
 * it can run against seasons (2024 and earlier) SportsDataIO won't
 * serve on this plan. See CLAUDE.md "Backtesting & Tuning History" for
 * why this exists and loadRunNflverseOnly.ts for how it's built.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const season = Number(url.searchParams.get("season") ?? "2024");
  const weeks = parseWeeksParam(url.searchParams.get("weeks"), 18);
  const positions = parsePositionsParam(url.searchParams.get("positions"));

  if (weeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested range." }, { status: 400 });
  }

  try {
    const { byPosition, overall, baselineSummaries, confidenceBreakdown } = await runBroadBacktestNflverseOnly(
      season,
      weeks,
      positions
    );

    return Response.json({
      byPosition,
      overall,
      baselineSummaries,
      baselineLabels: BASELINE_LABELS,
      confidenceBreakdown,
      context: {
        season,
        weeks,
        positions,
        source: "nflverse-only",
        caveat:
          "This route validates the already-tuned engine config (config.ts) against a season SportsDataIO can't serve on this plan — team pace/game-script data isn't available here, and historical injury status is treated as unknown, same as the primary backtest.",
      },
    });
  } catch (err) {
    console.error("Failed to run nflverse-only broad backtest:", err);
    return Response.json(
      { error: "Something went wrong running the nflverse-only backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
