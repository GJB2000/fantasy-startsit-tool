import { MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { runMultiPlayerTradeBacktestMultiSeason } from "@/lib/backtest/multiPlayerTradeBacktest";
import { parseWeeksParam } from "@/lib/backtest/params";
import { parseScoringFormat } from "@/lib/sportsdata/types";

// Same heaviest-route shape as the 1-for-1 trade multiseason route: loads N
// full seasons sequentially, each with its own play-by-play parse, times
// however many "as of week" cutoffs are requested per season.
export const maxDuration = 300;

const DEFAULT_SEASONS = [2022, 2023, 2024, 2025];
// Same cutoff-range rationale as /api/backtest/trade-nflverse-multiseason:
// stop at week 12 so every cutoff still has 6+ remaining weeks to project a
// real rest-of-season total against, rather than degenerating toward
// single-week grading late in the year.
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
 * Pools the MULTI-PLAYER trade backtest (2-for-1 and 2-for-2,
 * cross-position — see multiPlayerTradeBacktest.ts) across several "as of
 * week" cutoffs and seasons (default 2022-2025). Validation-only, no UI —
 * same precedent as the 1-for-1 trade multiseason route and
 * broad-nflverse-multiseason.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const seasons = parseSeasonsParam(url.searchParams.get("seasons"));
  const asOfWeeks = parseWeeksParam(url.searchParams.get("asOfWeeks") ?? DEFAULT_AS_OF_WEEKS, MAX_BACKTEST_WEEK - 1);
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  if (asOfWeeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested asOfWeeks range." }, { status: 400 });
  }

  try {
    const { bySeason, byShape, overall, tradeCount } = await runMultiPlayerTradeBacktestMultiSeason(
      seasons,
      asOfWeeks,
      format
    );

    return Response.json({
      bySeason,
      byShape,
      overall,
      tradeCount,
      context: {
        seasons,
        asOfWeeks,
        scoringFormat: format,
        shapes: ["2for1", "2for2"],
        source: "nflverse-only (pooled across seasons and as-of-week cutoffs), cross-position",
      },
    });
  } catch (err) {
    console.error("Failed to run pooled multi-player trade backtest:", err);
    return Response.json(
      { error: "Something went wrong running the pooled multi-player trade backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
