import { getInjuryReports } from "@/lib/nflverse/injuries";
import { getNgsPassing, getNgsReceiving, getNgsRushing } from "@/lib/nflverse/nextGenStats";
import { getRedZoneTouches } from "@/lib/nflverse/playByPlay";
import { buildSdioPlayerIdByNormalizedName } from "@/lib/nflverse/playerMatch";
import { getPlayerWeekStats } from "@/lib/nflverse/playerStats";
import type { GameWeather } from "@/lib/nflverse/schedules";
import { getSnapCounts } from "@/lib/nflverse/snapCounts";
import { buildNflversePlayerWeekTable, type NflverseWeekStat } from "@/lib/nflverse/weekTable";
import { getByes } from "@/lib/sportsdata/byes";
import { getAllPlayers } from "@/lib/sportsdata/players";
import { getTeamGameStatsByWeek } from "@/lib/sportsdata/teamGameStats";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";
import type { Player, PlayerGameStat, TeamGameStat } from "@/lib/sportsdata/types";

export interface BacktestRunData {
  season: number;
  apiSeason: string;
  /** Index 0 = week 1, index N-1 = week N. */
  allWeeklyRows: PlayerGameStat[][];
  /** Index 0 = week 1, index N-1 = week N. */
  allTeamWeeklyRows: TeamGameStat[][];
  byesByTeam: Map<string, number>;
  allPlayers: Player[];
  /** PlayerID -> week -> snap share/target share/air yards share/NextGen Stats/injury status/red zone touches, joined from nflverse by name (see lib/nflverse/). */
  nflversePlayerWeekTable: Map<number, Map<number, NflverseWeekStat>>;
  /** Only set by loadRunNflverseOnly.ts's nflverse-only pipeline — the synthetic-ID name map from gameLog.ts, needed to resolve a SportsDataIO player selection into this pipeline's own ID space (see runBacktestNflverseOnly.ts's runPairBacktestNflverseOnly). Unset (and unused) for the primary SportsDataIO pipeline. */
  gameLogPlayerIdByNormalizedName?: Map<string, number>;
  /**
   * `${team}/${week}` -> that game's weather, from nflverse's schedules
   * release. Only set by loadRunNflverseOnly.ts — the primary SportsDataIO
   * pipeline has no weather data of its own and doesn't share nflverse's
   * team-code conventions closely enough to join onto directly (see
   * CLAUDE.md's wind re-test). Backs the WR-only pickByWind baseline
   * (baselines.ts); degrades to no_pick when unset, same as every other
   * optional signal.
   */
  teamWeatherByTeamWeek?: Map<string, GameWeather>;
}

/**
 * The only network I/O in the entire backtest feature — fetches every
 * week's box scores up to maxWeek (already individually cached 24h by
 * getPlayerGameStatsByWeek/getTeamGameStatsByWeek), plus byes and the
 * full player list, exactly once per request. Everything downstream
 * (position-defense aggregation, season-to-date aggregation, team pace
 * aggregation, recent-game slicing, scoring, grading, and broad-mode
 * pairing across many weeks/pairs) reads from this one batch in memory
 * — no matter how many weeks or pairs are evaluated.
 */
export async function loadBacktestRunData(
  season: number,
  apiSeason: string,
  maxWeek: number
): Promise<BacktestRunData> {
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  // nflverse is an external, third-party data source (unlike SportsDataIO,
  // the project's primary source) being trialed for these signals — a fetch
  // failure there shouldn't take down the whole backtest, just leave the
  // new nflverse-backed baselines with no data (they'll report no_pick).
  function loadNflverse<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
    return load().catch((err) => {
      console.error(`Failed to load nflverse ${label}:`, err);
      return [];
    });
  }

  const [
    allWeeklyRows,
    allTeamWeeklyRows,
    byes,
    allPlayers,
    snapCounts,
    playerWeekStats,
    ngsPassing,
    ngsReceiving,
    ngsRushing,
    injuryReports,
    redZoneTouches,
  ] = await Promise.all([
    Promise.all(weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week))),
    Promise.all(weeks.map((week) => getTeamGameStatsByWeek(apiSeason, week))),
    getByes(season),
    getAllPlayers(),
    loadNflverse("snap counts", () => getSnapCounts(season)),
    loadNflverse("player week stats", () => getPlayerWeekStats(season)),
    loadNflverse("NGS passing", () => getNgsPassing(season)),
    loadNflverse("NGS receiving", () => getNgsReceiving(season)),
    loadNflverse("NGS rushing", () => getNgsRushing(season)),
    loadNflverse("injury reports", () => getInjuryReports(season)),
    loadNflverse("red zone touches", () => getRedZoneTouches(season)),
  ]);

  const byesByTeam = new Map<string, number>(byes.map((b) => [b.Team, b.Week]));
  const nflversePlayerWeekTable = buildNflversePlayerWeekTable(
    {
      snapRows: snapCounts,
      statRows: playerWeekStats,
      ngsPassingRows: ngsPassing,
      ngsReceivingRows: ngsReceiving,
      ngsRushingRows: ngsRushing,
      injuryRows: injuryReports,
      redZoneRows: redZoneTouches,
    },
    buildSdioPlayerIdByNormalizedName(allPlayers)
  );

  return {
    season,
    apiSeason,
    allWeeklyRows,
    allTeamWeeklyRows,
    byesByTeam,
    allPlayers,
    nflversePlayerWeekTable,
  };
}
