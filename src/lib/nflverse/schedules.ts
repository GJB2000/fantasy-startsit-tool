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

export interface RemainingGame {
  week: number;
  /** nflverse team code — see restOfSeason.ts for the SportsDataIO code mapping (only LAR/LA differ). */
  opponent: string;
}

/**
 * Every team's remaining regular-season opponents from `fromWeek` on,
 * keyed by nflverse team code. Powers the trade analyzer's rest-of-season
 * projection (see lib/recommendation/restOfSeason.ts) — reuses the same
 * `schedules` release games.csv every other schedule reader here does.
 * A team's bye week simply has no row that week, so it's naturally
 * excluded rather than needing special-case handling. Confirmed live: the
 * `schedules` release already carries the *upcoming* season's full
 * fixture list (opponents known, scores blank) as soon as the NFL
 * publishes it, not just completed seasons.
 */
export async function getRemainingOpponentsByTeam(
  season: number,
  fromWeek: number
): Promise<Map<string, RemainingGame[]>> {
  const rows = await fetchNflverseCsv("schedules", "games.csv", REVALIDATE_SECONDS);
  const regSeasonRows = rows.filter(
    (r) => Number(r.season) === season && r.game_type === "REG" && Number(r.week) >= fromWeek
  );

  const byTeam = new Map<string, RemainingGame[]>();
  for (const r of regSeasonRows) {
    const week = Number(r.week);
    const home = byTeam.get(r.home_team) ?? [];
    home.push({ week, opponent: r.away_team });
    byTeam.set(r.home_team, home);
    const away = byTeam.get(r.away_team) ?? [];
    away.push({ week, opponent: r.home_team });
    byTeam.set(r.away_team, away);
  }
  for (const games of byTeam.values()) games.sort((a, b) => a.week - b.week);
  return byTeam;
}

/**
 * Per-team, per-week implied point total, derived from the `schedules`
 * release's own `spread_line`/`total_line` columns (closing lines) —
 * confirmed live against SportsDataIO's GameOddsByWeek for the same
 * real game (MIN@CLE, 2025 week 5: total 35.5, home spread -3.5 in both
 * sources once sign conventions are reconciled) before trusting the
 * formula. nflverse's convention is `spread_line` = points the HOME
 * team is favored by (positive = home favored, negative = home
 * underdog), so:
 *   home implied = total_line / 2 + spread_line / 2
 *   away implied = total_line / 2 - spread_line / 2
 * Free and multi-season (2022-2025 all 100% populated for completed
 * games, confirmed live) — the only genuinely new *kind* of data this
 * app uses (betting lines), needed for D/ST (opponent implied total)
 * and K (team implied total) candidate signals. Blank for games that
 * haven't had lines set yet (future weeks close to the present).
 */
export async function getImpliedTeamTotalsByTeamWeek(season: number): Promise<Map<string, number>> {
  const rows = await fetchNflverseCsv("schedules", "games.csv", REVALIDATE_SECONDS);
  const regSeasonRows = rows.filter((r) => Number(r.season) === season && r.game_type === "REG");

  const impliedByTeamWeek = new Map<string, number>();
  for (const r of regSeasonRows) {
    if (r.spread_line === "" || r.total_line === "") continue;
    const week = Number(r.week);
    const total = Number(r.total_line);
    const spread = Number(r.spread_line);
    impliedByTeamWeek.set(`${r.home_team}/${week}`, total / 2 + spread / 2);
    impliedByTeamWeek.set(`${r.away_team}/${week}`, total / 2 - spread / 2);
  }
  return impliedByTeamWeek;
}

/**
 * Earliest game date per week, for a season — reuses the same
 * `schedules` release games.csv fetch every other reader here does (free
 * once cached). Used to resolve "which of dynastyprocess/data's daily
 * FantasyPros-rankings commits represents this week's pregame
 * consensus" (see fantasypros/weeklyConsensus.ts) — the latest commit
 * strictly BEFORE a week's earliest kickoff is the correct, non-leaky
 * snapshot to use.
 */
export async function getWeekStartDates(season: number): Promise<Map<number, string>> {
  const rows = await fetchNflverseCsv("schedules", "games.csv", REVALIDATE_SECONDS);
  const regSeasonRows = rows.filter((r) => Number(r.season) === season && r.game_type === "REG");

  const startByWeek = new Map<number, string>();
  for (const r of regSeasonRows) {
    const week = Number(r.week);
    const existing = startByWeek.get(week);
    if (!existing || r.gameday < existing) startByWeek.set(week, r.gameday);
  }
  return startByWeek;
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
