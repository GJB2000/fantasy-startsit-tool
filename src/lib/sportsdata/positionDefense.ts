import { getPlayerGameStatsByWeek } from "./weeklyStats";
import { SKILL_POSITIONS, isSkillPosition, type PlayerGameStat, type SkillPosition } from "./types";

type TeamPositionTotals = Record<string, Record<SkillPosition, number>>;

export interface PositionDefenseTable {
  perGameAllowed: TeamPositionTotals;
  leagueAverage: Record<SkillPosition, number>;
  rank: TeamPositionTotals;
}

function emptyPositionRecord(): Record<SkillPosition, number> {
  return { QB: 0, RB: 0, WR: 0, TE: 0 };
}

/**
 * Pure aggregation over already-fetched weekly rows — used by both the
 * live fetch-based getPositionDefenseTable below and the backtest layer,
 * which pre-fetches all weeks once and slices from memory to avoid
 * redundant network calls across many weeks/pairs.
 */
export function buildPositionDefenseTableFromRows(
  weeklyRows: PlayerGameStat[][]
): PositionDefenseTable {
  const totalAllowed: TeamPositionTotals = {};
  const gamesPlayed: Record<string, number> = {};

  for (const rows of weeklyRows) {
    const teamsThisWeek = new Set<string>();

    for (const row of rows) {
      if (row.Played !== 1 || !isSkillPosition(row.Position)) continue;

      teamsThisWeek.add(row.Opponent);
      totalAllowed[row.Opponent] ??= emptyPositionRecord();
      totalAllowed[row.Opponent][row.Position] += row.FantasyPointsPPR;
    }

    for (const team of teamsThisWeek) {
      gamesPlayed[team] = (gamesPlayed[team] ?? 0) + 1;
    }
  }

  const perGameAllowed: TeamPositionTotals = {};
  for (const team of Object.keys(totalAllowed)) {
    perGameAllowed[team] = emptyPositionRecord();
    for (const position of SKILL_POSITIONS) {
      const games = gamesPlayed[team] ?? 0;
      perGameAllowed[team][position] = games > 0 ? totalAllowed[team][position] / games : 0;
    }
  }

  const teams = Object.keys(perGameAllowed);
  const leagueAverage = emptyPositionRecord();
  for (const position of SKILL_POSITIONS) {
    const sum = teams.reduce((acc, team) => acc + perGameAllowed[team][position], 0);
    leagueAverage[position] = teams.length > 0 ? sum / teams.length : 0;
  }

  const rank: TeamPositionTotals = {};
  for (const team of teams) rank[team] = emptyPositionRecord();
  for (const position of SKILL_POSITIONS) {
    const sorted = [...teams].sort(
      (a, b) => perGameAllowed[b][position] - perGameAllowed[a][position]
    );
    sorted.forEach((team, index) => {
      rank[team][position] = index + 1;
    });
  }

  return { perGameAllowed, leagueAverage, rank };
}

/**
 * Builds a league-wide "PPR fantasy points allowed per game, by position"
 * table by fetching and aggregating every completed week's box scores for
 * the season. Reuses the same per-week fetch (and its cache) as recent-form
 * lookups — no separate endpoint or cache layer needed.
 */
export async function getPositionDefenseTable(
  apiSeason: string,
  throughWeek: number
): Promise<PositionDefenseTable> {
  const weeks = Array.from({ length: throughWeek }, (_, i) => i + 1);
  const weeklyRows = await Promise.all(weeks.map((week) => getPlayerGameStatsByWeek(apiSeason, week)));
  return buildPositionDefenseTableFromRows(weeklyRows);
}

export interface MatchupContext {
  opponentTeam: string;
  position: SkillPosition;
  pprAllowedPerGame: number;
  leagueAverage: number;
  rank: number;
  teamCount: number;
  diffFromAverage: number;
}

export function getMatchupContext(
  table: PositionDefenseTable,
  opponentTeam: string,
  position: SkillPosition
): MatchupContext | null {
  const perGame = table.perGameAllowed[opponentTeam];
  if (!perGame) return null;

  const pprAllowedPerGame = perGame[position];
  const leagueAverage = table.leagueAverage[position];
  return {
    opponentTeam,
    position,
    pprAllowedPerGame,
    leagueAverage,
    rank: table.rank[opponentTeam][position],
    teamCount: Object.keys(table.perGameAllowed).length,
    diffFromAverage: pprAllowedPerGame - leagueAverage,
  };
}
