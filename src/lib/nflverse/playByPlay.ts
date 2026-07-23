import { fetchNflverseCsv } from "./client";
import { getGsisIdToDisplayName } from "./players";
import type { RedZoneTouchRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;
const RED_ZONE_YARDLINE = 20;

// pbp has ~192 columns; this is every one actually read below. Passed to
// fetchNflverseCsv so the other ~184 are never retained in the 24h cache
// — see client.ts's parseCsv for why that mattered for reliability.
const PBP_COLUMNS = [
  "season_type",
  "season",
  "week",
  "yardline_100",
  "rush_attempt",
  "rusher_player_id",
  "pass_attempt",
  "receiver_player_id",
] as const;

/**
 * Red-zone touches (rush attempts + targets inside the opponent's
 * 20-yard line) per player per game, aggregated from nflverse's full
 * play-by-play (`pbp` release) — there's no pre-aggregated red-zone file
 * in nflverse, unlike snap share/target share/NextGen Stats, so this is
 * the one signal in the family that needs real play-level aggregation
 * (deliberately held for later — see "Backtesting & Tuning History").
 * Play-by-play identifies players by `gsis_id`; resolved to a display
 * name via the `players` crosswalk release before returning, so the
 * caller can join it the same way as every other nflverse source (by
 * normalized name — see playerMatch.ts).
 */
export async function getRedZoneTouches(season: number): Promise<RedZoneTouchRow[]> {
  const [rows, gsisIdToName] = await Promise.all([
    fetchNflverseCsv("pbp", `play_by_play_${season}.csv.gz`, REVALIDATE_SECONDS, PBP_COLUMNS),
    getGsisIdToDisplayName(),
  ]);

  const totals = new Map<string, RedZoneTouchRow>();

  function add(gsisId: string, week: number, field: "redZoneRushAttempts" | "redZoneTargets") {
    const name = gsisIdToName.get(gsisId);
    if (!name) return;
    const key = `${gsisId}/${week}`;
    const existing = totals.get(key);
    if (existing) {
      existing[field] += 1;
    } else {
      totals.set(key, {
        season,
        week,
        playerDisplayName: name,
        redZoneRushAttempts: field === "redZoneRushAttempts" ? 1 : 0,
        redZoneTargets: field === "redZoneTargets" ? 1 : 0,
      });
    }
  }

  for (const row of rows) {
    if (row.season_type !== "REG" || Number(row.season) !== season) continue;
    const yardline = Number(row.yardline_100);
    if (!Number.isFinite(yardline) || yardline > RED_ZONE_YARDLINE) continue;

    const week = Number(row.week);
    if (row.rush_attempt === "1" && row.rusher_player_id) {
      add(row.rusher_player_id, week, "redZoneRushAttempts");
    }
    if (row.pass_attempt === "1" && row.receiver_player_id) {
      add(row.receiver_player_id, week, "redZoneTargets");
    }
  }

  return Array.from(totals.values());
}
