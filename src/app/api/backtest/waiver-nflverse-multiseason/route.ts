import { runWaiverBacktest } from "@/lib/backtest/waiverBacktest";
import { parseScoringFormat } from "@/lib/sportsdata/types";

// Loads and slices four full nflverse season game logs; the first (cold)
// run parses each ~2-3MB CSV before caching, so give it room.
export const maxDuration = 60;

/**
 * Validation-only route (no UI, same precedent as the other
 * *-nflverse-multiseason backtest routes): grades the Waiver Wire ranking
 * against real forward production, pooled 2022-2025, and A/Bs the gap vs.
 * residual ranking plus naive baselines. See lib/backtest/waiverBacktest.ts.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  try {
    const result = await runWaiverBacktest(format);
    return Response.json(result);
  } catch (err) {
    console.error("Waiver backtest failed:", err);
    return Response.json({ error: "Waiver backtest failed. Try again shortly." }, { status: 502 });
  }
}
