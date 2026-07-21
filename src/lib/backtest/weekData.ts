import { buildPositionDefenseTableFromRows, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { buildSeasonToDatePlayerStatsFromRows } from "@/lib/sportsdata/seasonToDatePlayerStats";
import { buildTeamPaceTableFromRows, type TeamPace } from "@/lib/sportsdata/teamGameStats";
import type { PlayerGameStat, PlayerSeasonStat, TeamGameStat } from "@/lib/sportsdata/types";

export interface BacktestWeekSlice {
  targetWeek: number;
  targetWeekRows: PlayerGameStat[];
  positionDefenseTable: PositionDefenseTable;
  seasonToDateTable: Map<number, PlayerSeasonStat>;
  teamPaceTable: Map<string, TeamPace>;
  recentGamesByPlayer: (playerId: number) => PlayerGameStat[];
}

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
  allTeamWeeklyRows: TeamGameStat[][] = []
): BacktestWeekSlice {
  const priorRows = allWeeklyRows.slice(0, targetWeek - 1); // weeks 1..targetWeek-1
  const targetWeekRows = allWeeklyRows[targetWeek - 1] ?? [];

  const positionDefenseTable = buildPositionDefenseTableFromRows(priorRows);
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

  return {
    targetWeek,
    targetWeekRows,
    positionDefenseTable,
    seasonToDateTable,
    teamPaceTable,
    recentGamesByPlayer,
  };
}
