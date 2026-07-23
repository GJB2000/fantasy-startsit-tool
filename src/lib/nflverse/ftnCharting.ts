import { fetchNflverseCsv } from "./client";

const REVALIDATE_SECONDS = 24 * 60 * 60;

const FTN_COLUMNS = ["nflverse_game_id", "nflverse_play_id", "is_drop", "is_created_reception"] as const;

export interface FtnChartingEntry {
  isDrop: boolean;
  isCreatedReception: boolean;
}

/**
 * FTN Charting — human-charted, play-level data (drops, contested/created
 * receptions, pressure, personnel) that isn't derivable from raw box-score
 * stats or play-by-play alone. Flagged as a candidate signal family back
 * in item 14, deliberately deprioritized behind red-zone touches, and
 * only picked up now — see CLAUDE.md's unused-data-audit follow-up.
 *
 * Unlike every other nflverse source used so far, this doesn't carry a
 * player ID or name directly — it's keyed by `nflverse_game_id`/
 * `nflverse_play_id`, which match the main `pbp` release's `game_id`/
 * `play_id` exactly (confirmed directly against a real file, not
 * assumed). So the caller (playByPlay.ts) joins this map onto the same
 * pbp rows it's already iterating for red-zone/EPA aggregation, using
 * pbp's own `receiver_player_id` to attribute a charted play to a player
 * — no separate join/lookup pass needed.
 */
export async function getFtnChartingByPlay(season: number): Promise<Map<string, FtnChartingEntry>> {
  const rows = await fetchNflverseCsv("ftn_charting", `ftn_charting_${season}.csv`, REVALIDATE_SECONDS, FTN_COLUMNS);

  const byPlay = new Map<string, FtnChartingEntry>();
  for (const row of rows) {
    const key = `${row.nflverse_game_id}/${row.nflverse_play_id}`;
    byPlay.set(key, {
      isDrop: row.is_drop === "TRUE",
      isCreatedReception: row.is_created_reception === "TRUE",
    });
  }
  return byPlay;
}
