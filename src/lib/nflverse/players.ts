import { fetchNflverseCsv } from "./client";

const REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * nflverse's all-time player crosswalk (`players` release). Play-by-play
 * rows identify players by `gsis_id`, not by name — this maps that ID to
 * a display name so red-zone touches (see playByPlay.ts) can be joined
 * onto SportsDataIO PlayerIDs the same way every other nflverse source
 * is (by normalized name, via playerMatch.ts).
 */
export async function getGsisIdToDisplayName(): Promise<Map<string, string>> {
  const rows = await fetchNflverseCsv("players", "players.csv", REVALIDATE_SECONDS);

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.gsis_id && row.display_name) map.set(row.gsis_id, row.display_name);
  }
  return map;
}
