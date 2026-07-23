import { fetchNflverseCsv } from "./client";
import type { InjuryReportRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * Weekly injury reports (pregame Questionable/Doubtful/Out designations
 * plus practice participation), from nflverse's `injuries` release. This
 * is what SportsDataIO's archived data can't reconstruct — see Data
 * Source Notes — since it's the actual weekly NFL injury report, not a
 * post-hoc Played/Out inference.
 *
 * Filters on `game_type`, not `season_type` — nflverse's own schema for
 * this release isn't consistent across seasons (2024's file has no
 * `season_type` column at all, only `game_type`; 2025's has both).
 * `game_type` is present in every season checked and carries the same
 * REG/POST(/WC/DIV/CON/SB) values either way, so it's the safe column to
 * filter on. Found via the 2024 out-of-sample validation (item 24):
 * `season_type` being silently `undefined` meant this filter matched
 * zero rows for 2024, and the `injuryStatus` baseline reported n=0
 * rather than an error — see CLAUDE.md item 26.
 */
export async function getInjuryReports(season: number): Promise<InjuryReportRow[]> {
  const rows = await fetchNflverseCsv("injuries", `injuries_${season}.csv`, REVALIDATE_SECONDS);

  return rows
    .filter((r) => r.game_type === "REG" && r.report_status !== "")
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      playerDisplayName: r.full_name,
      team: r.team,
      reportStatus: r.report_status,
    }));
}
