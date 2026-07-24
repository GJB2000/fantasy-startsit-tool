import { fetchNflverseCsv } from "./client";

const REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * Bye weeks per team for a season, derived from nflverse's `schedules`
 * release (a flat list of every game, all seasons) rather than fetched
 * directly — nflverse has no dedicated byes endpoint. A team's bye is
 * whichever week in the season's actual week range it has no game (home
 * or away) at all.
 */
export async function getNflverseByes(season: number, maxWeek: number): Promise<Map<string, number>> {
  const rows = await fetchNflverseCsv("schedules", "games.csv", REVALIDATE_SECONDS);
  const regSeasonRows = rows.filter((r) => Number(r.season) === season && r.game_type === "REG");

  const weeksByTeam = new Map<string, Set<number>>();
  for (const r of regSeasonRows) {
    const week = Number(r.week);
    for (const team of [r.home_team, r.away_team]) {
      const weeks = weeksByTeam.get(team) ?? new Set<number>();
      weeks.add(week);
      weeksByTeam.set(team, weeks);
    }
  }

  const byesByTeam = new Map<string, number>();
  for (const [team, weeks] of weeksByTeam) {
    for (let week = 1; week <= maxWeek; week++) {
      if (!weeks.has(week)) {
        byesByTeam.set(team, week);
        break;
      }
    }
  }
  return byesByTeam;
}

export interface GameWeather {
  roof: string;
  temp: number | null;
  wind: number | null;
}

/**
 * Per-team, per-week game weather (roof/temp/wind), from the same
 * `schedules` release games.csv reads. Keyed by team so either side of a
 * matchup resolves to the same game's conditions. Domes/closed roofs
 * generally have no wind reading at all (blank in the source, not a real
 * zero) — left null rather than coerced to 0, so callers can distinguish
 * "no wind" from "no data."
 */
export async function getGameWeatherByTeamWeek(season: number): Promise<Map<string, GameWeather>> {
  const rows = await fetchNflverseCsv("schedules", "games.csv", REVALIDATE_SECONDS);
  const regSeasonRows = rows.filter((r) => Number(r.season) === season && r.game_type === "REG");

  const weatherByTeamWeek = new Map<string, GameWeather>();
  for (const r of regSeasonRows) {
    const week = Number(r.week);
    const weather: GameWeather = {
      roof: r.roof,
      temp: r.temp === "" ? null : Number(r.temp),
      wind: r.wind === "" ? null : Number(r.wind),
    };
    weatherByTeamWeek.set(`${r.home_team}/${week}`, weather);
    weatherByTeamWeek.set(`${r.away_team}/${week}`, weather);
  }
  return weatherByTeamWeek;
}
