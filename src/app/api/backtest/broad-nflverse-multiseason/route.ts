import { BASELINE_LABELS } from "@/lib/backtest/baselines";
import { parsePositionsParam, parseWeeksParam } from "@/lib/backtest/params";
import { runBroadBacktestNflverseOnlyMultiSeason } from "@/lib/backtest/runBacktestNflverseOnly";

// Heaviest route in the app: loads N full seasons sequentially, each with
// its own play-by-play parse (see loadRunNflverseOnly.ts/client.ts) — see
// runBroadBacktestNflverseOnlyMultiSeason's doc comment for why this is
// sequential rather than concurrent.
export const maxDuration = 300;

const DEFAULT_SEASONS = [2022, 2023, 2024, 2025];

function parseSeasonsParam(raw: string | null): number[] {
  if (!raw) return DEFAULT_SEASONS;
  const seasons = raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1999 && n <= 2100);
  return seasons.length > 0 ? Array.from(new Set(seasons)).sort((a, b) => a - b) : DEFAULT_SEASONS;
}

/**
 * Pools the nflverse-only backtest pipeline across several seasons (default
 * 2022-2025) into one combined sample — a bigger, more robust base for
 * weight tuning than any single season, and specifically built to re-check
 * candidate signals previously rejected for looking thin on sample size
 * alone (QB goal-line rushing, high-wind WR — see CLAUDE.md "Backtesting &
 * Tuning History"). See runBacktestNflverseOnly.ts's
 * runBroadBacktestNflverseOnlyMultiSeason for the full rationale, including
 * why 2025 is run through this pipeline too rather than mixing in the
 * SportsDataIO pipeline's own numbers.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const seasons = parseSeasonsParam(url.searchParams.get("seasons"));
  const weeks = parseWeeksParam(url.searchParams.get("weeks"), 18);
  const positions = parsePositionsParam(url.searchParams.get("positions"));

  if (weeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested range." }, { status: 400 });
  }

  try {
    const { bySeason, byPosition, overall, baselineSummaries, confidenceBreakdown } =
      await runBroadBacktestNflverseOnlyMultiSeason(seasons, weeks, positions);

    return Response.json({
      bySeason,
      byPosition,
      overall,
      baselineSummaries,
      baselineLabels: BASELINE_LABELS,
      confidenceBreakdown,
      context: {
        seasons,
        weeks,
        positions,
        source: "nflverse-only (pooled across seasons)",
      },
    });
  } catch (err) {
    console.error("Failed to run pooled multi-season nflverse-only backtest:", err);
    return Response.json(
      { error: "Something went wrong running the pooled multi-season backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
