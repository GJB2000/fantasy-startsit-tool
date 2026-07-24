import { BASELINE_LABELS } from "@/lib/backtest/baselines";
import { parseWeeksParam } from "@/lib/backtest/params";
import { PlayerNotInNflverseSeasonError, runPairBacktestNflverseOnly } from "@/lib/backtest/runBacktestNflverseOnly";

// Same heavier cold path as /api/backtest/broad-nflverse (fresh
// stats_player_week fetch plus play-by-play aggregation for red-zone
// touches), just for a single pair instead of the full pool.
export const maxDuration = 60;

/**
 * nflverse-only equivalent of /api/backtest/pair — resolves the two
 * requested SportsDataIO PlayerIDs into nflverse's 2024 name space (see
 * runBacktestNflverseOnly.ts) before running, so the same player search
 * box used for 2025 also works here without a parallel 2024-specific
 * search UI. Fills the gap flagged in CLAUDE.md's open items: Single
 * pair mode was SportsDataIO/2025-only, Broad mode was the only one with
 * a 2024 equivalent.
 */
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

  const season = Number(url.searchParams.get("season") ?? "2024");
  const weeks = parseWeeksParam(url.searchParams.get("weeks"), 18);

  if (weeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested range." }, { status: 400 });
  }

  try {
    const { weekResults, summary, baselineSummaries, confidenceBreakdown } = await runPairBacktestNflverseOnly(
      [ids[0], ids[1]],
      season,
      weeks
    );

    return Response.json({
      weekResults,
      summary,
      baselineSummaries,
      baselineLabels: BASELINE_LABELS,
      confidenceBreakdown,
      context: {
        season,
        weeks,
        source: "nflverse-only",
        caveat:
          "This route validates the already-tuned engine config (config.ts) against a season SportsDataIO can't serve on this plan — team pace/game-script data isn't available here, and historical injury status is treated as unknown, same as the primary backtest.",
      },
    });
  } catch (err) {
    if (err instanceof PlayerNotInNflverseSeasonError) {
      return Response.json({ error: err.message }, { status: 404 });
    }
    console.error("Failed to run nflverse-only pair backtest:", err);
    return Response.json(
      { error: "Something went wrong running the nflverse-only backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
