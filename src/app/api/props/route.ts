import { getPlayerPropsByPlayerId } from "@/lib/sportsdata/playerProps";
import { getScorablePlayerById } from "@/lib/sportsdata/players";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";

// Display-only betting lines, fetched separately from /api/compare so the
// Start/Sit verdict renders immediately rather than waiting on a second
// network round-trip. Fails open to {} — a betting-lines panel is not worth
// failing a comparison over.
export const maxDuration = 15;

/**
 * The week a claim would actually be graded on: the next one to be played.
 *
 * Keyed off lastCompletedWeek rather than isInSeason, deliberately. isInSeason
 * flips true a few days before the first week of a season completes (see
 * CLAUDE.md item 47), and during that window lastCompletedSeason still trails
 * by a year — asking it directly would point at week 19 of a finished season.
 */
function upcomingWeek(context: { lastCompletedSeason: number; lastCompletedWeek: number }) {
  return context.lastCompletedWeek >= 18
    ? { season: context.lastCompletedSeason + 1, week: 1 }
    : { season: context.lastCompletedSeason, week: context.lastCompletedWeek + 1 };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (ids.length === 0) {
    return Response.json({ propsByPlayerId: {} });
  }

  try {
    const context = await getSeasonContext();
    const { season, week } = upcomingWeek(context);
    const players = await Promise.all(ids.map((id) => getScorablePlayerById(id)));
    const inputs = players
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({ playerId: p.PlayerID, position: p.Position }));
    const propsByPlayerId = await getPlayerPropsByPlayerId(season, week, inputs).catch(() => ({}));
    return Response.json({ propsByPlayerId });
  } catch (err) {
    console.error("Failed to fetch betting props:", err);
    return Response.json({ propsByPlayerId: {} });
  }
}
