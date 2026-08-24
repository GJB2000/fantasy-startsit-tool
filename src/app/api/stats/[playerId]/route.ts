import { getPlayerStatsDetail } from "@/lib/stats/playerStats";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat } from "@/lib/sportsdata/types";

// A game log has to be assembled from per-week box scores — SportsDataIO has
// no per-player season endpoint on this plan (both plausible paths 404), so a
// cold cache means walking every completed week.
export const maxDuration = 30;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const { playerId: raw } = await params;
  const playerId = Number(raw);
  if (!Number.isFinite(playerId)) {
    return Response.json({ error: "Unknown player." }, { status: 400 });
  }

  const format = parseScoringFormat(new URL(request.url).searchParams.get("scoringFormat"));

  try {
    const context = await getSeasonContext();
    const detail = await getPlayerStatsDetail(
      playerId,
      context.lastCompletedSeason,
      context.lastCompletedApiSeason,
      context.lastCompletedWeek,
      format
    );
    if (!detail) return Response.json({ error: "We don't have that player." }, { status: 404 });

    return Response.json({ detail, context: { isInSeason: context.isInSeason } });
  } catch (err) {
    console.error("Failed to build player stats:", err);
    return Response.json({ error: "Couldn't load that player's stats." }, { status: 502 });
  }
}
