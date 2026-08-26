import { getTeamColors } from "@/lib/sportsdata/teamColors";
import { getAllPlayers } from "@/lib/sportsdata/players";

/**
 * Everything the jersey avatars need, in one small lookup: 32 teams' colours
 * and a playerId -> squad number map.
 *
 * A separate endpoint rather than fields threaded through the six responses
 * that render an avatar. Squad number and team colour are cosmetic, and
 * PlayerScoreBreakdown is a scoring type — putting display data on it would
 * spread this across the engine for no benefit. Fetched once per session and
 * shared by every consumer (see useJerseyData).
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const [colors, players] = await Promise.all([getTeamColors(), getAllPlayers()]);
    const numbers: Record<number, number> = {};
    for (const p of players) {
      if (p.Number != null) numbers[p.PlayerID] = p.Number;
    }
    return Response.json({ colors, numbers });
  } catch (err) {
    console.error("Failed to load jersey data:", err);
    // Fails open: the avatars fall back to a neutral shirt rather than the
    // page failing over a decoration.
    return Response.json({ colors: {}, numbers: {} });
  }
}
