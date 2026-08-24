import "server-only";

/**
 * The two SportsDataIO subscriptions this app holds cover DISJOINT seasons:
 * the legacy key serves 2025 and earlier on the legacy hosts, the 2026 key
 * serves 2026 on the v3 hosts, and each 401s on the other's seasons. So
 * every season-scoped reader dispatches on the season rather than the app
 * having a single "current" host family.
 *
 * This exists to avoid a flag day: the app runs on 2025 today and will move
 * to 2026 by itself the moment 2026 week 1 completes (getSeasonContext()
 * follows the last COMPLETED season), with no redeploy required.
 */
export const V3_MIN_SEASON = 2026;

/** Season-scoped calls for this season use the v3 hosts + the 2026 key. */
export function usesV3(season: number): boolean {
  return season >= V3_MIN_SEASON;
}

/**
 * SportsDataIO's week endpoints take a season-with-type string ("2025REG",
 * "2026PRE"); the season endpoints take a bare year. Both host families use
 * the same convention, so routing just needs the numeric year back out.
 */
export function seasonYearFromApiSeason(apiSeason: string): number {
  const year = Number.parseInt(apiSeason.slice(0, 4), 10);
  if (Number.isNaN(year)) {
    throw new Error(`Unrecognized apiSeason: ${apiSeason}`);
  }
  return year;
}
