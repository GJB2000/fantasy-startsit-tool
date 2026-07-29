import { getSleeperLeagues, getSleeperUser } from "@/lib/sleeper/api";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username")?.trim();
  if (!username) {
    return Response.json({ error: "Enter a Sleeper username." }, { status: 400 });
  }

  try {
    const user = await getSleeperUser(username);
    if (!user) {
      return Response.json({ error: `No Sleeper user found for "${username}".` }, { status: 404 });
    }

    const context = await getSeasonContext();
    // Query both the last completed season and the upcoming one — during
    // the offseason a redraft league may not have reset yet (still shows
    // under lastCompletedSeason), while a dynasty/keeper league may
    // already exist for the next one. Same "don't guess, check both"
    // approach as this app's other season-rollforward logic
    // (recommendation/restOfSeason.ts).
    const seasons = [context.lastCompletedSeason, context.lastCompletedSeason + 1];
    const leaguesBySeason = await Promise.all(seasons.map((season) => getSleeperLeagues(user.user_id, season)));

    const leagues = leaguesBySeason
      .flat()
      .map((l) => ({ leagueId: l.league_id, name: l.name, season: l.season, rosterPositions: l.roster_positions }));

    return Response.json({
      userId: user.user_id,
      username: user.username,
      displayName: user.display_name,
      leagues,
    });
  } catch (err) {
    console.error("Failed to load Sleeper leagues:", err);
    return Response.json({ error: "Couldn't reach Sleeper. Try again shortly." }, { status: 502 });
  }
}
