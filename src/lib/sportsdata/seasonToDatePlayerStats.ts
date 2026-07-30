import { getPlayerGameStatsByWeek } from "./weeklyStats";
import { isSkillPosition, type PlayerGameStat, type PlayerSeasonStat } from "./types";

interface RunningTotal {
  points: number;
  pointsPPR: number;
  receptions: number;
  played: number;
  started: number;
  team: string;
  position: string;
  season: number;
  passingAttempts: number;
  passingYards: number;
  rushingAttempts: number;
  rushingYards: number;
  receivingTargets: number;
  receivingYards: number;
}

/**
 * Pure aggregation of already-fetched weekly rows into a running,
 * point-in-time season-to-date total per player — the backtest analog
 * of `PlayerSeasonStat`, but built only from weeks actually passed in
 * (the caller controls the cutoff, e.g. weeks 1..W-1 for a week-W
 * prediction) rather than the full-season hindsight totals that
 * `getPlayerSeasonStats` returns.
 *
 * `.FantasyPoints`/`.FantasyPointsPPR`/`.Receptions`/`.Played` on the
 * resulting `PlayerSeasonStat` feed `getFantasyPoints()` for
 * scoring-format-aware ranking and averages — `Team`/`Position`/`Started`
 * are carried through for completeness but not consulted for this
 * synthetic row.
 */
export function buildSeasonToDatePlayerStatsFromRows(
  weeklyRows: PlayerGameStat[][]
): Map<number, PlayerSeasonStat> {
  const totals = new Map<number, RunningTotal>();

  for (const rows of weeklyRows) {
    for (const row of rows) {
      if (row.Played !== 1 || !isSkillPosition(row.Position)) continue;

      const existing = totals.get(row.PlayerID);
      if (existing) {
        existing.points += row.FantasyPoints;
        existing.pointsPPR += row.FantasyPointsPPR;
        existing.receptions += row.Receptions;
        existing.played += 1;
        existing.started += row.Started;
        existing.team = row.Team;
        existing.position = row.Position;
        existing.season = row.Season;
        existing.passingAttempts += row.PassingAttempts;
        existing.passingYards += row.PassingYards;
        existing.rushingAttempts += row.RushingAttempts;
        existing.rushingYards += row.RushingYards;
        existing.receivingTargets += row.ReceivingTargets;
        existing.receivingYards += row.ReceivingYards;
      } else {
        totals.set(row.PlayerID, {
          points: row.FantasyPoints,
          pointsPPR: row.FantasyPointsPPR,
          receptions: row.Receptions,
          played: 1,
          started: row.Started,
          team: row.Team,
          position: row.Position,
          season: row.Season,
          passingAttempts: row.PassingAttempts,
          passingYards: row.PassingYards,
          rushingAttempts: row.RushingAttempts,
          rushingYards: row.RushingYards,
          receivingTargets: row.ReceivingTargets,
          receivingYards: row.ReceivingYards,
        });
      }
    }
  }

  const result = new Map<number, PlayerSeasonStat>();
  for (const [playerId, total] of totals) {
    result.set(playerId, {
      PlayerID: playerId,
      Season: total.season,
      Team: total.team,
      Position: total.position,
      Played: total.played,
      Started: total.started,
      FantasyPoints: total.points,
      FantasyPointsPPR: total.pointsPPR,
      Receptions: total.receptions,
      PassingAttempts: total.passingAttempts,
      PassingYards: total.passingYards,
      RushingAttempts: total.rushingAttempts,
      RushingYards: total.rushingYards,
      ReceivingTargets: total.receivingTargets,
      ReceivingYards: total.receivingYards,
    });
  }
  return result;
}

export async function getSeasonToDatePlayerStats(
  apiSeason: string,
  throughWeek: number
): Promise<Map<number, PlayerSeasonStat>> {
  const weeks = Array.from({ length: throughWeek }, (_, i) => i + 1);
  const weeklyRows = await Promise.all(weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week)));
  return buildSeasonToDatePlayerStatsFromRows(weeklyRows);
}
