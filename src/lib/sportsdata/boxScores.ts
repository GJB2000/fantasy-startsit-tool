import "server-only";
import { REVALIDATE, sportsDataFetch } from "./client";
import type { TeamDefenseGameStat } from "./defense";
import type { PlayerGameStat, TeamGameStat } from "./types";

/**
 * Box Score [Final] — the Final-Only equivalent of PlayerGameStatsByWeek.
 *
 * The 2026 subscription is a "Final Only" tier and PlayerGameStatsByWeek is
 * marked "Live & Final", which is why that endpoint 401s (item 156). This is
 * the sanctioned replacement, and it's strictly richer: one call returns the
 * per-player rows AND the team-defense rows AND the team rows, so it replaces
 * three separate legacy readers (weeklyStats / defense / teamGameStats).
 * Field shapes are supersets of the legacy ones — verified field-by-field
 * against real 2026 preseason games, zero missing fields.
 *
 * MEMORY: the raw response is ~12MB per week (vs ~3MB for the legacy weekly
 * stats), and the backtest loads a whole season. So the raw response is
 * fetched with the shared cache BYPASSED, trimmed to the three arrays the app
 * actually reads, and only the trimmed slices are cached — the same
 * "don't retain what you don't read" fix item 27 applied to play-by-play.
 */
interface BoxScoreFinal {
  PlayerGames?: PlayerGameStat[];
  FantasyDefenseGames?: TeamDefenseGameStat[];
  TeamGames?: TeamGameStat[];
}

export interface WeekBoxScoreSlices {
  playerGames: PlayerGameStat[];
  fantasyDefenseGames: TeamDefenseGameStat[];
  teamGames: TeamGameStat[];
}

interface CacheEntry {
  data: WeekBoxScoreSlices;
  expiresAt: number;
}
const sliceCache = new Map<string, CacheEntry>();

export async function getBoxScoreSlices(
  apiSeason: string,
  week: number
): Promise<WeekBoxScoreSlices> {
  const cacheKey = `${apiSeason}:${week}`;
  const cached = sliceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const games = await sportsDataFetch<BoxScoreFinal[]>(
    `/BoxScoresFinal/${apiSeason}/${week}`,
    { revalidate: REVALIDATE.weeklyStats, base: "statsV3", skipCache: true }
  );

  const slices: WeekBoxScoreSlices = {
    playerGames: games.flatMap((g) => g.PlayerGames ?? []),
    fantasyDefenseGames: games.flatMap((g) => g.FantasyDefenseGames ?? []),
    teamGames: games.flatMap((g) => g.TeamGames ?? []),
  };

  sliceCache.set(cacheKey, {
    data: slices,
    expiresAt: Date.now() + REVALIDATE.weeklyStats * 1000,
  });
  return slices;
}
