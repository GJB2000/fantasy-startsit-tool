import { resolveSleeperRoster } from "@/lib/sleeper/resolveRoster";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const leagueId = url.searchParams.get("leagueId");
  const userId = url.searchParams.get("userId");

  if (!leagueId || !userId) {
    return Response.json({ error: "Missing leagueId or userId." }, { status: 400 });
  }

  try {
    const resolved = await resolveSleeperRoster(leagueId, userId);
    return Response.json(resolved);
  } catch (err) {
    console.error("Failed to resolve Sleeper roster:", err);
    return Response.json({ error: "Couldn't reach Sleeper. Try again shortly." }, { status: 502 });
  }
}
