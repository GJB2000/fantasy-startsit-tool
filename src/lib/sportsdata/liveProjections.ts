import "server-only";
import { getPlayerGameProjectionsByWeek, getPlayerSeasonProjections, projectionMapFromRows } from "./projections";
import type { SeasonContext } from "./timeframes";
import { getFantasyPoints, type ScoringFormat } from "./types";

/**
 * The live consensus signal: SportsDataIO's projected points per player for
 * the game being decided, keyed by PlayerID.
 *
 * Offseason-aware, the same way the FantasyPros path it replaced was (item
 * 103): in-season this is the upcoming week's projection, but between
 * seasons there IS no upcoming week, so it falls back to the coming
 * season's season-long projection divided by projected games. Without that,
 * every player's consensus term would be null all offseason and the engine
 * would silently lose its largest input.
 *
 * Fails open to an empty map — the engine treats a missing projection as
 * "no consensus for this player" and scores on its own signals.
 */
export async function getLiveProjectedPointsByPlayerId(
  context: SeasonContext,
  format: ScoringFormat
): Promise<Map<number, number>> {
  const upcomingWeek = context.lastCompletedWeek + 1;
  if (context.isInSeason && upcomingWeek <= 18) {
    const rows = await getPlayerGameProjectionsByWeek(context.lastCompletedApiSeason, upcomingWeek);
    const map = projectionMapFromRows(rows, format);
    if (map.size > 0) return map;
  }

  // Offseason (or a season with no week left): the coming season, per game.
  const rows = await getPlayerSeasonProjections(context.lastCompletedSeason + 1);
  const perGame = new Map<number, number>();
  for (const row of rows) {
    const games = row.Played ?? 0;
    if (games <= 0) continue;
    const points = getFantasyPoints(row, format) / games;
    if (points > 0) perGame.set(row.PlayerID, points);
  }
  return perGame;
}
