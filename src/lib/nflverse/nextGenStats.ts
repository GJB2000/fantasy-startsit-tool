import { fetchNflverseCsv } from "./client";
import type { NgsPassingRow, NgsReceivingRow, NgsRushingRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;

// nflverse's nextgen_stats release ships one all-years .csv.gz per stat
// type (2016-present), not one file per season like snap_counts/stats_player
// — so every read filters down to the requested season here. Week 0 rows
// are season-aggregate totals, not a real week, and are excluded.

/** QB passing NextGen Stats: completion% above expectation (CPOE) and aggressiveness (% of throws into tight coverage). */
export async function getNgsPassing(season: number): Promise<NgsPassingRow[]> {
  const rows = await fetchNflverseCsv("nextgen_stats", "ngs_passing.csv.gz", REVALIDATE_SECONDS);

  return rows
    .filter((r) => r.season_type === "REG" && Number(r.season) === season && Number(r.week) > 0)
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      playerDisplayName: r.player_display_name,
      team: r.team_abbr,
      completionPercentageAboveExpectation:
        r.completion_percentage_above_expectation === "" ? null : Number(r.completion_percentage_above_expectation),
      aggressiveness: r.aggressiveness === "" ? null : Number(r.aggressiveness),
    }));
}

/** Receiving NextGen Stats: average separation from nearest defender and YAC above expectation. */
export async function getNgsReceiving(season: number): Promise<NgsReceivingRow[]> {
  const rows = await fetchNflverseCsv("nextgen_stats", "ngs_receiving.csv.gz", REVALIDATE_SECONDS);

  return rows
    .filter((r) => r.season_type === "REG" && Number(r.season) === season && Number(r.week) > 0)
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      playerDisplayName: r.player_display_name,
      team: r.team_abbr,
      avgSeparation: r.avg_separation === "" ? null : Number(r.avg_separation),
      avgYacAboveExpectation: r.avg_yac_above_expectation === "" ? null : Number(r.avg_yac_above_expectation),
    }));
}

/** Rushing NextGen Stats: rush yards over expected per attempt (efficiency vs. blocking/box count expectation). */
export async function getNgsRushing(season: number): Promise<NgsRushingRow[]> {
  const rows = await fetchNflverseCsv("nextgen_stats", "ngs_rushing.csv.gz", REVALIDATE_SECONDS);

  return rows
    .filter((r) => r.season_type === "REG" && Number(r.season) === season && Number(r.week) > 0)
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      playerDisplayName: r.player_display_name,
      team: r.team_abbr,
      rushYardsOverExpectedPerAtt:
        r.rush_yards_over_expected_per_att === "" ? null : Number(r.rush_yards_over_expected_per_att),
    }));
}
