import { getPropsForPlayers } from "@/lib/oddsapi/props";
import { getScorablePlayerById } from "@/lib/sportsdata/players";

// Display-only betting lines, fetched separately from /api/compare so the
// Start/Sit verdict renders immediately. The Odds API call is a network
// round-trip (cached hard to protect the free-tier quota, but a cold cache
// shouldn't block the comparison). Fails open to {} — and is empty in the
// offseason before books post props.
export const maxDuration = 15;

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
    const players = await Promise.all(ids.map((id) => getScorablePlayerById(id)));
    const inputs = players
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map((p) => ({
        playerId: p.PlayerID,
        name: `${p.FirstName} ${p.LastName}`.trim(),
        team: p.Team,
        position: p.Position,
      }));
    const propsByPlayerId = await getPropsForPlayers(inputs).catch(() => ({}));
    return Response.json({ propsByPlayerId });
  } catch (err) {
    console.error("Failed to fetch betting props:", err);
    return Response.json({ propsByPlayerId: {} });
  }
}
