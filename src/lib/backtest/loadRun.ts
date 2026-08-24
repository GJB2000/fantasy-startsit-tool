import { getInjuryReports } from "@/lib/nflverse/injuries";
import { getReserveStatusReports } from "@/lib/nflverse/rosters";
import { getNgsPassing, getNgsReceiving, getNgsRushing } from "@/lib/nflverse/nextGenStats";
import { getRedZoneTouches } from "@/lib/nflverse/playByPlay";
import { buildSdioPlayerIdByNormalizedName } from "@/lib/nflverse/playerMatch";
import { getPlayerWeekStats } from "@/lib/nflverse/playerStats";
import { getImpliedTeamTotalsByTeamWeek, type GameWeather } from "@/lib/nflverse/schedules";
import { getSnapCounts } from "@/lib/nflverse/snapCounts";
import { buildNflversePlayerWeekTable, type NflverseWeekStat } from "@/lib/nflverse/weekTable";
import { getByes } from "@/lib/sportsdata/byes";
import { getFantasyDefenseByWeek, type TeamDefenseGameStat } from "@/lib/sportsdata/defense";
import { getAllDstPlayers } from "@/lib/sportsdata/defenseTeams";
import { getAllPlayers } from "@/lib/sportsdata/players";
import { getTeamGameStatsByWeek } from "@/lib/sportsdata/teamGameStats";
import { getPlayerGameProjectionsByWeek, getPlayerSeasonProjections } from "@/lib/sportsdata/projections";
import type { SeasonProjectionMap } from "@/lib/recommendation/restOfSeason";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";
import { getFantasyPoints, type Player, type PlayerGameStat, type TeamGameStat } from "@/lib/sportsdata/types";

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
  /**
   * PlayerID -> week -> depth-chart role (1=starter, 2=backup, ...), from
   * nflverse's `depth_charts` release, already resolved from its native
   * normalized-name join onto this pipeline's own synthetic PlayerIDs
   * (via gameLog.ts's playerIdByNormalizedName — same resolution step
   * nflversePlayerWeekTable itself goes through). Only set by
   * loadRunNflverseOnly.ts, and only ever populated for 2022-2024 — 2025
   * uses an incompatible schema (see nflverse/depthCharts.ts) and the
   * primary SportsDataIO pipeline doesn't carry this data at all. Backs
   * the RB/WR-only `pickByDepthChart` baseline (baselines.ts); degrades
   * to no_pick when unset, same as every other optional signal.
   */
  depthChartByPlayerIdWeek?: Map<number, Map<number, number>>;
  /**
   * Index 0 = week 1, index N-1 = week N — team-level D/ST fantasy stats
   * (FantasyDefenseByGame), a separate endpoint/shape from
   * allWeeklyRows/allTeamWeeklyRows since SportsDataIO models team
   * defense as its own stat family, not a player. Only set by the
   * primary SportsDataIO pipeline (loadRun.ts) — D/ST/K backtest support
   * doesn't (yet) extend to the nflverse-only 2022-2024 pipeline, since
   * that's not where D/ST/K's live scoring was tuned/validated (see
   * CLAUDE.md's D/ST & K backtest item). Absent/undefined for
   * loadRunNflverseOnly.ts, same optionality pattern as
   * teamWeatherByTeamWeek/depthChartByPlayerIdWeek above.
   */
  allDefenseWeeklyRows?: TeamDefenseGameStat[][];
  /** Team (SportsDataIO code) -> synthetic D/ST PlayerID, resolved once at load time so pairing/scoring stay synchronous rather than re-fetching /Teams per lookup. Only set alongside allDefenseWeeklyRows. */
  dstPlayerIdByTeam?: Map<string, number>;
  /** Synthetic D/ST Player entries (see sportsdata/defenseTeams.ts) — merged into runBacktest.ts's anyPlayerById alongside allPlayers so scoreExtendedPlayerBacktest can resolve a D/ST synthetic ID's team the same uniform way it resolves a real player's. */
  dstPlayers?: Player[];
  /**
   * `${nflverseTeam}/${week}` -> Vegas-implied point total, from
   * nflverse's schedules release — the shared matchup signal behind both
   * scoreDefense.ts's and scoreKicker.ts's backtest scorers. For a past
   * (already-played) week this is the real closing pregame line, a
   * legitimate non-leaky historical fact, not a forecast. Only set by
   * the primary pipeline, same scope note as allDefenseWeeklyRows above
   * (K's own backtest scoring also depends on this, even though K's raw
   * game rows already live in allWeeklyRows). Empty/absent on a fetch
   * failure or on the nflverse-only pipeline, degrading D/ST's and K's
   * matchup modifier to 0 rather than crashing.
   */
  impliedTotalsByTeamWeek?: Map<string, number>;
  /**
   * PlayerID -> week -> FantasyPros weekly consensus rank + dynastyprocess's
   * rank-to-points estimate, reconstructed from dynastyprocess/data's git
   * history (see lib/fantasypros/weeklyConsensus.ts for why this needs
   * git-history mining rather than a normal CSV fetch). Unlike
   * teamWeatherByTeamWeek/depthChartByPlayerIdWeek above, this one IS set
   * by both pipelines — item 53's ensemble investigation established that
   * any signal touching a large fraction of the whole score needs a real
   * primary-pipeline check before shipping, not just nflverse-only
   * validation, so loadBacktestRunData fetches and resolves this too
   * (via buildSdioPlayerIdByNormalizedName, the same join direction every
   * other primary-pipeline nflverse signal uses). Backs the
   * `pickByExpertConsensus` baseline (baselines.ts) on both pipelines,
   * and (as of item 70) `EXPERT_CONSENSUS_BLEND_WEIGHT`'s additive
   * modifier in engine.ts. Degrades to an empty map on fetch failure,
   * same as every other optional signal.
   */
  expertConsensusByPlayerIdWeek?: Map<number, Map<number, { rank: number; r2pPts: number | null }>>;
  /** Season-long projections, blended into rest-of-season trade value. Absent for seasons SportsDataIO does not serve projections for. */
  seasonProjections?: SeasonProjectionMap;
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
    allDefenseWeeklyRows,
    byes,
    allPlayers,
    dstPlayers,
    snapCounts,
    playerWeekStats,
    ngsPassing,
    ngsReceiving,
    ngsRushing,
    injuryReports,
    redZoneTouches,
    reserveStatusReports,
    impliedTotalsByTeamWeek,
  ] = await Promise.all([
    Promise.all(weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week))),
    Promise.all(weeks.map((week) => getTeamGameStatsByWeek(apiSeason, week))),
    Promise.all(weeks.map((week) => getFantasyDefenseByWeek(apiSeason, week))),
    getByes(season),
    getAllPlayers(),
    getAllDstPlayers(),
    loadNflverse("snap counts", () => getSnapCounts(season)),
    loadNflverse("player week stats", () => getPlayerWeekStats(season)),
    loadNflverse("NGS passing", () => getNgsPassing(season)),
    loadNflverse("NGS receiving", () => getNgsReceiving(season)),
    loadNflverse("NGS rushing", () => getNgsRushing(season)),
    loadNflverse("injury reports", () => getInjuryReports(season)),
    loadNflverse("red zone touches", () => getRedZoneTouches(season)),
    loadNflverse("reserve status reports", () => getReserveStatusReports(season)),
    getImpliedTeamTotalsByTeamWeek(season).catch((err) => {
      console.error("Failed to load implied team totals:", err);
      return new Map<string, number>();
    }),
  ]);

  const dstPlayerIdByTeam = new Map<string, number>(
    dstPlayers.filter((p): p is Player & { Team: string } => p.Team != null).map((p) => [p.Team, p.PlayerID])
  );

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
      rosterRows: reserveStatusReports,
    },
    buildSdioPlayerIdByNormalizedName(allPlayers)
  );

  // SportsDataIO's own weekly projections are the consensus source here,
  // replacing the FantasyPros scrape (see CLAUDE.md item 161). Keyed by the
  // same PlayerID as everything else, so there is no name join and no
  // coverage gap — 1224/1224 pool player-weeks vs FantasyPros' 1203.
  //
  // The nflverse-only pipeline still reads FantasyPros: SportsDataIO's
  // projections 401 for 2022-2024 on this subscription, and that pipeline's
  // whole job is the multi-season check. Each pipeline uses the only source
  // it can actually get for its seasons — see loadRunNflverseOnly.ts.
  const expertConsensusByPlayerIdWeek = new Map<number, Map<number, { rank: number; r2pPts: number | null }>>();
  for (let week = 1; week <= maxWeek; week += 1) {
    let rows: PlayerGameStat[];
    try {
      rows = await getPlayerGameProjectionsByWeek(apiSeason, week);
    } catch (err) {
      console.error(`Failed to load SportsDataIO projections for week ${week}:`, err);
      continue;
    }
    const byPosition = new Map<string, PlayerGameStat[]>();
    for (const row of rows) {
      const list = byPosition.get(row.Position);
      if (list) list.push(row);
      else byPosition.set(row.Position, [row]);
    }
    for (const list of byPosition.values()) {
      // Rank within position by projected points — the `rank` field is what
      // the standalone consensus baseline reads; the engine uses r2pPts.
      list.sort((a, b) => getFantasyPoints(b, "ppr") - getFantasyPoints(a, "ppr"));
      list.forEach((row, index) => {
        const points = getFantasyPoints(row, "ppr");
        if (points <= 0) return;
        const byWeek = expertConsensusByPlayerIdWeek.get(row.PlayerID) ?? new Map();
        byWeek.set(week, { rank: index + 1, r2pPts: points });
        expertConsensusByPlayerIdWeek.set(row.PlayerID, byWeek);
      });
    }
  }

  const seasonProjections: SeasonProjectionMap = new Map();
  try {
    for (const row of await getPlayerSeasonProjections(season)) {
      const games = row.Played ?? 0;
      const points = getFantasyPoints(row, "ppr");
      if (games > 0 && points > 0) seasonProjections.set(row.PlayerID, { points, games });
    }
  } catch (err) {
    // Only 2025 is served on this subscription; earlier seasons 401. The
    // trade projection falls back to pure extrapolation without it.
    console.error("Failed to load SportsDataIO season projections:", err);
  }

  return {
    season,
    apiSeason,
    seasonProjections,
    allWeeklyRows,
    allTeamWeeklyRows,
    byesByTeam,
    allPlayers,
    nflversePlayerWeekTable,
    allDefenseWeeklyRows,
    dstPlayerIdByTeam,
    dstPlayers,
    impliedTotalsByTeamWeek,
    expertConsensusByPlayerIdWeek,
  };
}
