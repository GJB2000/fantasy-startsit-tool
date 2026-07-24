import { getDepthChartByNormalizedNameWeek } from "@/lib/nflverse/depthCharts";
import { getNflverseGameLog } from "@/lib/nflverse/gameLog";
import { getInjuryReports } from "@/lib/nflverse/injuries";
import { getNgsPassing, getNgsReceiving, getNgsRushing } from "@/lib/nflverse/nextGenStats";
import { getRedZoneTouches } from "@/lib/nflverse/playByPlay";
import { getPlayerWeekStats } from "@/lib/nflverse/playerStats";
import { getGameWeatherByTeamWeek, getNflverseByes } from "@/lib/nflverse/schedules";
import { getSnapCounts } from "@/lib/nflverse/snapCounts";
import { buildNflversePlayerWeekTable } from "@/lib/nflverse/weekTable";
import type { BacktestRunData } from "./loadRun";

/**
 * nflverse-only equivalent of loadRun.ts's loadBacktestRunData — same
 * BacktestRunData shape, but every field is sourced from nflverse instead
 * of SportsDataIO. Exists specifically to validate the tuned engine
 * weights (RB red-zone, TE snap-share, WR composite — see config.ts)
 * against seasons SportsDataIO won't serve on this plan (2024 and
 * earlier; see CLAUDE.md "Backtesting & Tuning History"). Since
 * everything downstream of this loader (weekData.ts, pairing.ts,
 * grading.ts, buildBacktestInput.ts, engine.ts) is written against the
 * `PlayerGameStat`/`Player` interfaces rather than against
 * SportsDataIO specifically, none of that code needed to change — only
 * the loading layer, plus a thin orchestration duplicate (see
 * runBacktestNflverseOnly.ts) since runBacktest.ts's two entry points
 * call loadBacktestRunData directly rather than accepting a pre-loaded
 * batch.
 *
 * `allTeamWeeklyRows` is always empty here — nothing in the shipped
 * engine uses team-level data (only the never-shipped gameScript
 * baseline does), so it wasn't worth building a second team-stats
 * source just to keep that one reference baseline populated for this
 * validation; it'll just report no_pick for every pair, same as it
 * would with no data in the SportsDataIO pipeline.
 *
 * Fetches in three stages rather than one big Promise.all, specifically
 * to fix a real reliability problem: this route used to crash the dev
 * server on roughly half its cold-cache requests (see CLAUDE.md item
 * 24), from firing every source concurrently — including a fresh parse
 * of the full play-by-play release (red-zone touches) alongside several
 * other multi-MB fetches at once. Sequencing trades a few seconds of
 * extra cold-start latency for a much lower peak memory footprint: (1)
 * the game log alone first, since several other sources join against
 * its player-ID map and `getPlayerWeekStats` reads the *same* underlying
 * file — fetching it first means that one warms the shared cache instead
 * of both firing a redundant concurrent fetch of the same multi-MB CSV;
 * (2) the remaining small/medium sources together; (3) red-zone touches
 * (by far the heaviest single fetch) alone, after everything else has
 * already resolved and been freed. See client.ts's parseCsv/
 * fetchNflverseCsv and playByPlay.ts's column filter for the other half
 * of this fix — reducing what pbp's ~192-column rows retain in memory
 * once parsed, not just when they're fetched.
 */
export async function loadNflverseOnlyRunData(season: number, maxWeek: number): Promise<BacktestRunData> {
  function loadNflverse<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
    return load().catch((err) => {
      console.error(`Failed to load nflverse ${label} (${season} nflverse-only backtest):`, err);
      return [];
    });
  }

  const gameLog = await getNflverseGameLog(season, maxWeek);

  const [
    byesByTeam,
    teamWeatherByTeamWeek,
    depthChartByNormalizedNameWeek,
    snapCounts,
    playerWeekStats,
    ngsPassing,
    ngsReceiving,
    ngsRushing,
    injuryReports,
  ] = await Promise.all([
    getNflverseByes(season, maxWeek),
    // Same underlying schedules/games.csv fetch as getNflverseByes above —
    // shares client.ts's in-process cache, so this doesn't add a second
    // network request.
    getGameWeatherByTeamWeek(season),
    getDepthChartByNormalizedNameWeek(season).catch((err) => {
      console.error(`Failed to load nflverse depth charts (${season} nflverse-only backtest):`, err);
      return new Map<string, Map<number, number>>();
    }),
    loadNflverse("snap counts", () => getSnapCounts(season)),
    loadNflverse("player week stats", () => getPlayerWeekStats(season)),
    loadNflverse("NGS passing", () => getNgsPassing(season)),
    loadNflverse("NGS receiving", () => getNgsReceiving(season)),
    loadNflverse("NGS rushing", () => getNgsRushing(season)),
    loadNflverse("injury reports", () => getInjuryReports(season)),
  ]);

  const redZoneTouches = await loadNflverse("red zone touches", () => getRedZoneTouches(season));

  // Resolve depth_charts' own normalized-name keys onto this pipeline's
  // synthetic PlayerIDs — same join gameLog.playerIdByNormalizedName
  // already does for nflversePlayerWeekTable below, just done here
  // instead since depth charts aren't part of that shared table's shape.
  const depthChartByPlayerIdWeek = new Map<number, Map<number, number>>();
  for (const [normalizedName, byWeek] of depthChartByNormalizedNameWeek) {
    const playerId = gameLog.playerIdByNormalizedName.get(normalizedName);
    if (playerId == null) continue;
    depthChartByPlayerIdWeek.set(playerId, byWeek);
  }

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
    gameLog.playerIdByNormalizedName
  );

  return {
    season,
    apiSeason: `${season}REG`,
    allWeeklyRows: gameLog.allWeeklyRows,
    allTeamWeeklyRows: [],
    byesByTeam,
    allPlayers: gameLog.players,
    nflversePlayerWeekTable,
    gameLogPlayerIdByNormalizedName: gameLog.playerIdByNormalizedName,
    teamWeatherByTeamWeek,
    depthChartByPlayerIdWeek,
  };
}
