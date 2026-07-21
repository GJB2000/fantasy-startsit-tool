import { searchActivePlayers } from "@/lib/sportsdata/players";
import { toPlayerSummary } from "@/lib/sportsdata/types";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  try {
    const players = await searchActivePlayers(query, 20);
    return Response.json({ players: players.map(toPlayerSummary) });
  } catch (err) {
    console.error("Failed to load players:", err);
    return Response.json({ error: "Couldn't load players right now. Try again shortly." }, { status: 502 });
  }
}
