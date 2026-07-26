import { MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { loadNflverseOnlyRunData } from "@/lib/backtest/loadRunNflverseOnly";
import { parsePositionsParam } from "@/lib/backtest/params";
import { runTradeBacktest } from "@/lib/backtest/tradeBacktest";

// Same heavier cold path as /api/backtest/broad-nflverse — box scores and
// the play-by-play red-zone aggregation are both fetched fresh here.
export const maxDuration = 60;

/**
 * nflverse-only equivalent of /api/backtest/trade, for seasons SportsDataIO
 * won't serve on this plan (2022-2024). Same runTradeBacktest core, just a
 * different loader — see loadRunNflverseOnly.ts's design note on why that's
 * enough (everything downstream is written against shared interfaces).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const season = Number(url.searchParams.get("season") ?? "2024");
  const asOfWeek = Number(url.searchParams.get("asOfWeek") ?? 8);
  const positions = parsePositionsParam(url.searchParams.get("positions"));

  if (!Number.isFinite(asOfWeek) || asOfWeek < 1 || asOfWeek >= MAX_BACKTEST_WEEK) {
    return Response.json(
      {
        error: `"As of week" must be between 1 and ${MAX_BACKTEST_WEEK - 1}, so there's at least one remaining week to grade the projection against.`,
      },
      { status: 400 }
    );
  }

  try {
    const runData = await loadNflverseOnlyRunData(season, MAX_BACKTEST_WEEK);
    const { overall, byPosition, results } = runTradeBacktest(runData, asOfWeek, positions);

    return Response.json({
      overall,
      byPosition,
      results,
      context: {
        season,
        asOfWeek,
        positions,
        source: "nflverse-only",
        caveat:
          "Synthetic 1-for-1 trades only (adjacent-rank pairs, same methodology as broad-mode start/sit backtesting) — grades the trade analyzer's rest-of-season projection against what each player actually scored, summed, over the real remaining weeks of the season.",
      },
    });
  } catch (err) {
    console.error("Failed to run nflverse-only trade backtest:", err);
    return Response.json(
      { error: "Something went wrong running the trade backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
