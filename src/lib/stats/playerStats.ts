import "server-only";
import { getAnyExtendedPlayerById } from "../sportsdata/players";
import { getPlayerSeasonStat } from "../sportsdata/seasonStats";
import { getPlayerGameStatsByWeek } from "../sportsdata/weeklyStats";
import { getFantasyPoints, type PlayerGameStat, type ScoringFormat } from "../sportsdata/types";
import { getPositionRank, toStatTotals } from "./leaderboard";
import { isStatsPosition, type GameLogRow, type PlayerStatsDetail, type StatTotals } from "./types";

/** Weeks fetched at once. Bounded because each week is a multi-MB payload and
 *  firing all 18 concurrently is the memory-pressure shape that took the dev
 *  server down in CLAUDE.md item 27. */
const WEEK_BATCH = 4;

const EMPTY_TOTALS: StatTotals = {
  passAttempts: 0,
  passCompletions: 0,
  passYards: 0,
  passTouchdowns: 0,
  passInterceptions: 0,
  rushAttempts: 0,
  rushYards: 0,
  rushTouchdowns: 0,
  targets: 0,
  receptions: 0,
  receivingYards: 0,
  receivingTouchdowns: 0,
  fumblesLost: 0,
  fieldGoalsMade: 0,
  fieldGoalsAttempted: 0,
  fieldGoalsMade50Plus: 0,
  extraPointsMade: 0,
  extraPointsAttempted: 0,
};

function sumTotals(rows: StatTotals[]): StatTotals {
  return rows.reduce<StatTotals>((acc, r) => {
    const out = { ...acc };
    for (const key of Object.keys(EMPTY_TOTALS) as (keyof StatTotals)[]) out[key] += r[key];
    return out;
  }, { ...EMPTY_TOTALS });
}

/** One player's week-by-week rows for a season. */
async function getGameLog(
  apiSeason: string,
  lastWeek: number,
  playerId: number,
  format: ScoringFormat
): Promise<GameLogRow[]> {
  const weeks = Array.from({ length: lastWeek }, (_, i) => i + 1);
  const found: PlayerGameStat[] = [];

  for (let i = 0; i < weeks.length; i += WEEK_BATCH) {
    const batch = await Promise.all(
      weeks.slice(i, i + WEEK_BATCH).map(async (week) => {
        try {
          const rows = await getPlayerGameStatsByWeek(apiSeason, week);
          return rows.find((r) => r.PlayerID === playerId) ?? null;
        } catch {
          // A single unavailable week shouldn't blank the whole game log.
          return null;
        }
      })
    );
    for (const row of batch) if (row) found.push(row);
  }

  return found
    .sort((a, b) => a.Week - b.Week)
    .map((row) => ({
      ...toStatTotals(row),
      week: row.Week,
      opponent: row.Opponent ?? null,
      homeOrAway: row.HomeOrAway ?? null,
      played: row.Played === 1,
      started: row.Started === 1,
      points: getFantasyPoints(row, format),
    }));
}

export async function getPlayerStatsDetail(
  playerId: number,
  season: number,
  apiSeason: string,
  lastWeek: number,
  format: ScoringFormat
): Promise<PlayerStatsDetail | null> {
  const player = await getAnyExtendedPlayerById(playerId);
  if (!player) return null;

  const [seasonRow, gameLog] = await Promise.all([
    getPlayerSeasonStat(season, playerId),
    getGameLog(apiSeason, lastWeek, playerId, format),
  ]);

  // Prefer the season endpoint's own totals; fall back to summing the game log
  // for a player the season feed hasn't got a row for yet.
  const played = gameLog.filter((g) => g.played);
  const totals = seasonRow ? toStatTotals(seasonRow) : sumTotals(played);
  const games = seasonRow?.Played ?? played.length;
  const points = seasonRow ? getFantasyPoints(seasonRow, format) : played.reduce((s, g) => s + g.points, 0);

  const position = player.Position;
  const { rank, count } = isStatsPosition(position)
    ? await getPositionRank(season, playerId, position, format)
    : { rank: null, count: 0 };

  return {
    player: {
      playerId: player.PlayerID,
      name: `${player.FirstName} ${player.LastName}`.trim(),
      team: player.Team,
      position,
      photoUrl: player.PhotoUrl,
      byeWeek: player.ByeWeek,
      injuryStatus: player.InjuryStatus,
    },
    season,
    format,
    totals: {
      ...totals,
      games,
      started: seasonRow?.Started ?? played.filter((g) => g.started).length,
      points,
      pointsPerGame: games > 0 ? points / games : 0,
    },
    gameLog,
    positionRank: rank,
    positionCount: count || null,
  };
}
