import { MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { parsePositionsParam, parseWeeksParam } from "@/lib/backtest/params";
import { runTradeBacktestMultiSeason } from "@/lib/backtest/tradeBacktest";

// Same heaviest-route shape as /api/backtest/broad-nflverse-multiseason:
// loads N full seasons sequentially, each with its own play-by-play parse,
// times however many "as of week" cutoffs are requested per season.
export const maxDuration = 300;

const DEFAULT_SEASONS = [2022, 2023, 2024, 2025];
// Default cutoff range deliberately stops well short of MAX_BACKTEST_WEEK-1
// (17): a cutoff late in the season (e.g. week 16) only has 1-2 remaining
// weeks to project/grade against, which barely tests the "sum across a
// real remaining schedule" idea this feature exists to check — it
// degenerates toward ordinary single-week grading. Capping at 12 keeps
// every pooled cutoff testing a genuinely multi-week projection (at least
// 6 remaining weeks).
const DEFAULT_AS_OF_WEEKS = "1-12";

function parseSeasonsParam(raw: string | null): number[] {
  if (!raw) return DEFAULT_SEASONS;
  const seasons = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1999 && n <= 2100);
  return seasons.length > 0 ? Array.from(new Set(seasons)).sort((a, b) => a - b) : DEFAULT_SEASONS;
}

/**
 * Pools the trade analyzer's backtest across several "as of week" cutoffs
 * AND several seasons (default 2022-2025) into one combined sample — see
 * runTradeBacktestMultiSeason for the full rationale, including why 2025
 * runs through this nflverse-only pipeline too rather than mixing in the
 * SportsDataIO pipeline's own numbers (same deliberate precedent as
 * broad-nflverse-multiseason). No UI for this route, by the same precedent
 * that route already set — it's a validation tool, not an interactive
 * mode.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const seasons = parseSeasonsParam(url.searchParams.get("seasons"));
  const asOfWeeks = parseWeeksParam(url.searchParams.get("asOfWeeks") ?? DEFAULT_AS_OF_WEEKS, MAX_BACKTEST_WEEK - 1);
  const positions = parsePositionsParam(url.searchParams.get("positions"));

  if (asOfWeeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested asOfWeeks range." }, { status: 400 });
  }

  try {
    const { bySeason, byPosition, overall, tradeCount } = await runTradeBacktestMultiSeason(
      seasons,
      asOfWeeks,
      positions
    );

    return Response.json({
      bySeason,
      byPosition,
      overall,
      tradeCount,
      context: {
        seasons,
        asOfWeeks,
        positions,
        source: "nflverse-only (pooled across seasons and as-of-week cutoffs)",
      },
    });
  } catch (err) {
    console.error("Failed to run pooled multi-season trade backtest:", err);
    return Response.json(
      { error: "Something went wrong running the pooled trade backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
