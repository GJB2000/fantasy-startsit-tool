import "server-only";
import { getPlayerSeasonProjections } from "./projections";
import type { SeasonProjectionMap } from "@/lib/recommendation/restOfSeason";
import { getFantasyPoints, type ScoringFormat } from "./types";

/**
 * Season-long projections keyed by PlayerID, for rest-of-season trade
 * valuation (see REST_OF_SEASON_PROJECTION_BLEND).
 *
 * Uses the season the schedule lookup resolved to, so it matches whichever
 * season's remaining games are being projected — in the offseason that's the
 * upcoming season, not the completed one.
 *
 * Fails open to an empty map: the blend falls back to pure extrapolation,
 * which is exactly the behaviour before this was wired in.
 */
export async function getSeasonProjectionMap(
  season: number,
  format: ScoringFormat
): Promise<SeasonProjectionMap> {
  const rows = await getPlayerSeasonProjections(season);
  const out: SeasonProjectionMap = new Map();
  for (const row of rows) {
    const games = row.Played ?? 0;
    const points = getFantasyPoints(row, format);
    if (games > 0 && points > 0) out.set(row.PlayerID, { points, games });
  }
  return out;
}
