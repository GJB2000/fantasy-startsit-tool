import { DEFAULT_BACKTEST_API_SEASON, DEFAULT_BACKTEST_SEASON, MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { loadBacktestRunData } from "@/lib/backtest/loadRun";
import { parsePositionsParam } from "@/lib/backtest/params";
import { runTradeBacktest } from "@/lib/backtest/tradeBacktest";

export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);

  const season = Number(url.searchParams.get("season") ?? DEFAULT_BACKTEST_SEASON);
  const apiSeason = url.searchParams.get("apiSeason") ?? DEFAULT_BACKTEST_API_SEASON;
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
    const runData = await loadBacktestRunData(season, apiSeason, MAX_BACKTEST_WEEK);
    const { overall, byPosition, results } = runTradeBacktest(runData, asOfWeek, positions);

    return Response.json({
      overall,
      byPosition,
      results,
      context: {
        season,
        apiSeason,
        asOfWeek,
        positions,
        caveat:
          "Synthetic 1-for-1 trades only (adjacent-rank pairs, same methodology as broad-mode start/sit backtesting) — grades the trade analyzer's rest-of-season projection against what each player actually scored, summed, over the real remaining weeks of the season.",
      },
    });
  } catch (err) {
    console.error("Failed to run trade backtest:", err);
    return Response.json(
      { error: "Something went wrong running the trade backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
