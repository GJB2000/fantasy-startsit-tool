import type { GameWeather } from "@/lib/nflverse/schedules";
import type { NflverseWeekStat } from "@/lib/nflverse/weekTable";
import type { TeamDefenseGameStat } from "@/lib/sportsdata/defense";
import { buildPositionDefenseTableFromRows, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { buildSeasonToDatePlayerStatsFromRows } from "@/lib/sportsdata/seasonToDatePlayerStats";
import { buildTeamPaceTableFromRows, type TeamPace } from "@/lib/sportsdata/teamGameStats";
import type { PlayerGameStat, PlayerSeasonStat, ScoringFormat, TeamGameStat } from "@/lib/sportsdata/types";

export interface BacktestWeekSlice {
  targetWeek: number;
  targetWeekRows: PlayerGameStat[];
  positionDefenseTable: PositionDefenseTable;
  seasonToDateTable: Map<number, PlayerSeasonStat>;
  teamPaceTable: Map<string, TeamPace>;
  recentGamesByPlayer: (playerId: number) => PlayerGameStat[];
  recentNflverseByPlayer: (playerId: number) => NflverseWeekStat[];
  /** Direct (non-averaged) lookup for a specific week — for facts like injury status that are current-week, not a trailing usage tendency to average over. */
  nflverseStatForWeek: (playerId: number, week: number) => NflverseWeekStat | undefined;
  /**
   * Whether any OTHER player at this team+position (drawn from the
   * "who's ever recorded a stat here" roster set, built from weeks
   * strictly BEFORE targetWeek — same no-hindsight discipline as
   * positionDefenseTable/seasonToDateTable) has an Out/Doubtful
   * injury-report status for `week` (a current-week, pregame-knowable
   * fact — see nflverseStatForWeek). Backs the "handcuff" candidate
   * signal — see CLAUDE.md's unused-data-audit follow-up.
   */
  hasLimitedTeammate: (team: string, position: string, playerId: number, week: number) => boolean;
  /** `${team}/${week}` -> that game's weather (nflverse schedules release). Empty unless the nflverse-only pipeline supplied it (see loadRunNflverseOnly.ts) — backs the WR-only pickByWind baseline; absent for the primary SportsDataIO pipeline. */
  teamWeatherByTeamWeek: Map<string, GameWeather>;
  /** PlayerID -> week -> depth-chart role (1=starter, 2=backup, ...). Empty unless the nflverse-only pipeline supplied it for a 2022-2024 season (see loadRunNflverseOnly.ts/nflverse/depthCharts.ts) — backs the RB/WR-only pickByDepthChart baseline; absent for the primary SportsDataIO pipeline and for 2025 even within the nflverse-only one. */
  depthChartByPlayerIdWeek: Map<number, Map<number, number>>;
  /** This target week's D/ST box scores (all 32 teams, minus whoever's on bye) — empty on the nflverse-only pipeline, which has no D/ST support (see loadRun.ts). */
  targetWeekDefenseRows: TeamDefenseGameStat[];
  /** All of a team's D/ST games strictly BEFORE targetWeek — the season-to-date basis for pairing/scoring, same no-hindsight discipline as seasonToDateTable. */
  dstSeasonGamesByTeam: (team: string) => TeamDefenseGameStat[];
  /** Same recentWeekCount window as recentGamesByPlayer, for a team's D/ST games. */
  recentDefenseGamesByTeam: (team: string) => TeamDefenseGameStat[];
  /**
   * All of a player's games strictly BEFORE targetWeek, regardless of
   * position — unlike seasonToDateTable (built by
   * buildSeasonToDatePlayerStatsFromRows), this does NOT filter to skill
   * positions, since it also needs to work for kickers. Skill positions
   * already have seasonToDateTable for this purpose; this exists
   * specifically so K's backtest scorer/pairing has a season-average
   * basis too.
   */
  seasonGamesByPlayer: (playerId: number) => PlayerGameStat[];
  /** `${nflverseTeam}/${week}` -> Vegas-implied point total — see loadRun.ts. Empty on the nflverse-only pipeline. */
  impliedTotalsByTeamWeek: Map<string, number>;
}

const LIMITED_INJURY_STATUSES = new Set(["Out", "Doubtful"]);

/**
 * Pure, synchronous per-target-week slice of a full-season batch
 * (see loadRun.ts). Position-defense and season-to-date tables are
 * built only from weeks strictly BEFORE targetWeek — never the target
 * week itself — which is what guarantees the backtest can't see
 * hindsight-biased future/current-week data. Team pace uses the same
 * recent-weeks window as player recent-form (rather than full
 * season-to-date) since team tendencies (pace, pass rate) can shift
 * meaningfully within a season and a recent window is more responsive.
 */
export function sliceWeekData(
  allWeeklyRows: PlayerGameStat[][],
  targetWeek: number,
  recentWeekCount: number,
  allTeamWeeklyRows: TeamGameStat[][] = [],
  nflversePlayerWeekTable: Map<number, Map<number, NflverseWeekStat>> = new Map(),
  teamWeatherByTeamWeek: Map<string, GameWeather> = new Map(),
  depthChartByPlayerIdWeek: Map<number, Map<number, number>> = new Map(),
  format: ScoringFormat = "ppr",
  allDefenseWeeklyRows: TeamDefenseGameStat[][] = [],
  impliedTotalsByTeamWeek: Map<string, number> = new Map()
): BacktestWeekSlice {
  const priorRows = allWeeklyRows.slice(0, targetWeek - 1); // weeks 1..targetWeek-1
  const targetWeekRows = allWeeklyRows[targetWeek - 1] ?? [];

  const positionDefenseTable = buildPositionDefenseTableFromRows(priorRows, format);
  const seasonToDateTable = buildSeasonToDatePlayerStatsFromRows(priorRows);

  const recentStart = Math.max(1, targetWeek - recentWeekCount);
  const recentRows = allWeeklyRows.slice(recentStart - 1, targetWeek - 1); // weeks recentStart..targetWeek-1
  const recentTeamRows = allTeamWeeklyRows.slice(recentStart - 1, targetWeek - 1);

  const teamPaceTable = buildTeamPaceTableFromRows(recentTeamRows);

  function recentGamesByPlayer(playerId: number): PlayerGameStat[] {
    return recentRows
      .flatMap((rows) => rows.filter((r) => r.PlayerID === playerId && r.Played === 1))
      .sort((a, b) => a.Week - b.Week);
  }

  function recentNflverseByPlayer(playerId: number): NflverseWeekStat[] {
    const byWeek = nflversePlayerWeekTable.get(playerId);
    if (!byWeek) return [];
    const result: NflverseWeekStat[] = [];
    for (let week = recentStart; week < targetWeek; week++) {
      const stat = byWeek.get(week);
      if (stat) result.push(stat);
    }
    return result.sort((a, b) => a.week - b.week);
  }

  function nflverseStatForWeek(playerId: number, week: number): NflverseWeekStat | undefined {
    return nflversePlayerWeekTable.get(playerId)?.get(week);
  }

  function seasonGamesByPlayer(playerId: number): PlayerGameStat[] {
    return priorRows
      .flatMap((rows) => rows.filter((r) => r.PlayerID === playerId && r.Played === 1))
      .sort((a, b) => a.Week - b.Week);
  }

  const priorDefenseRows = allDefenseWeeklyRows.slice(0, targetWeek - 1);
  const targetWeekDefenseRows = allDefenseWeeklyRows[targetWeek - 1] ?? [];
  const recentDefenseRows = allDefenseWeeklyRows.slice(recentStart - 1, targetWeek - 1);

  function dstSeasonGamesByTeam(team: string): TeamDefenseGameStat[] {
    return priorDefenseRows.flatMap((rows) => rows.filter((r) => r.Team === team)).sort((a, b) => a.Week - b.Week);
  }

  function recentDefenseGamesByTeam(team: string): TeamDefenseGameStat[] {
    return recentDefenseRows.flatMap((rows) => rows.filter((r) => r.Team === team)).sort((a, b) => a.Week - b.Week);
  }

  const rosterCandidatesByTeamPosition = new Map<string, Set<number>>();
  for (const weekRows of priorRows) {
    for (const row of weekRows) {
      if (row.Played !== 1) continue;
      const key = `${row.Team}/${row.Position}`;
      const set = rosterCandidatesByTeamPosition.get(key) ?? new Set<number>();
      set.add(row.PlayerID);
      rosterCandidatesByTeamPosition.set(key, set);
    }
  }

  function hasLimitedTeammate(team: string, position: string, playerId: number, week: number): boolean {
    const candidates = rosterCandidatesByTeamPosition.get(`${team}/${position}`);
    if (!candidates) return false;
    for (const teammateId of candidates) {
      if (teammateId === playerId) continue;
      const status = nflverseStatForWeek(teammateId, week)?.injuryStatus;
      if (status && LIMITED_INJURY_STATUSES.has(status)) return true;
    }
    return false;
  }

  return {
    targetWeek,
    targetWeekRows,
    positionDefenseTable,
    seasonToDateTable,
    teamPaceTable,
    recentGamesByPlayer,
    recentNflverseByPlayer,
    nflverseStatForWeek,
    hasLimitedTeammate,
    teamWeatherByTeamWeek,
    depthChartByPlayerIdWeek,
    targetWeekDefenseRows,
    dstSeasonGamesByTeam,
    recentDefenseGamesByTeam,
    seasonGamesByPlayer,
    impliedTotalsByTeamWeek,
  };
}
