import { DEFAULT_BACKTEST_API_SEASON, DEFAULT_BACKTEST_SEASON, MAX_BACKTEST_WEEK } from "@/lib/backtest/config";
import { parsePositionsParam, parseWeeksParam } from "@/lib/backtest/params";
import { runPlayerProjectionLookup } from "@/lib/backtest/playerProjectionLookup";
import { runProjectionBacktest } from "@/lib/backtest/runProjectionBacktest";
import { parseScoringFormat } from "@/lib/sportsdata/types";

export const maxDuration = 30;

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const season = Number(url.searchParams.get("season") ?? DEFAULT_BACKTEST_SEASON);
  const apiSeason = url.searchParams.get("apiSeason") ?? DEFAULT_BACKTEST_API_SEASON;
  const weeks = parseWeeksParam(url.searchParams.get("weeks"), MAX_BACKTEST_WEEK);
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));

  // parsePositionsParam defaults to ALL skill positions when its input is
  // empty/missing (the right behavior for every other backtest route,
  // where "no positions specified" means "give me everything"). This
  // route is the one place that distinction matters — an empty
  // `positions` param here means the user is doing a player-only lookup
  // and genuinely wants zero pool positions, not "all of them" — so the
  // raw query value is checked directly before deciding whether to call
  // the parser at all.
  const positionsRaw = url.searchParams.get("positions");
  const positions = positionsRaw ? parsePositionsParam(positionsRaw) : [];
  const playerIds = parseIds(url.searchParams.get("ids"));

  if (weeks.length === 0) {
    return Response.json({ error: "No valid weeks in the requested range." }, { status: 400 });
  }
  if (positions.length === 0 && playerIds.length === 0) {
    return Response.json({ error: "Select at least one position or search for a player." }, { status: 400 });
  }

  try {
    const [poolResult, playerDetail] = await Promise.all([
      positions.length > 0 ? runProjectionBacktest(season, apiSeason, weeks, positions, format) : null,
      playerIds.length > 0 ? runPlayerProjectionLookup(playerIds, season, apiSeason, weeks, format) : null,
    ]);

    return Response.json({
      overall: poolResult?.overall ?? null,
      byPosition: poolResult?.byPosition ?? null,
      baselineOverall: poolResult?.baselineOverall ?? null,
      baselineByPosition: poolResult?.baselineByPosition ?? null,
      byPlayer: poolResult?.byPlayer ?? null,
      playerDetail,
      context: {
        season,
        apiSeason,
        weeks,
        positions,
        scoringFormat: format,
        note: "MAE/RMSE are in fantasy points. Bias is signed (predicted minus actual) — positive means the engine over-projects on average, negative means it under-projects. Pool-based numbers are graded against the same realistic startable pool Broad mode uses; player lookups are for the exact player searched, regardless of pool membership.",
      },
    });
  } catch (err) {
    console.error("Failed to run projection backtest:", err);
    return Response.json(
      { error: "Something went wrong running the projection backtest. Try again shortly." },
      { status: 502 }
    );
  }
}
