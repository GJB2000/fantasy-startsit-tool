import { fetchNflverseCsv } from "./client";
import { getGsisIdToDisplayName } from "./players";
import { normalizePlayerName } from "./playerMatch";

const REVALIDATE_SECONDS = 24 * 60 * 60;
const OFFENSE_SKILL_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

/**
 * nflverse's `depth_charts` release — official weekly starter/backup
 * role designation (`depth_team`: 1=starter, 2=backup, 3=third string,
 * ...), scoped to offensive skill positions. A current-week role fact,
 * not a trailing performance stat — same category as injury status/game
 * weather (see injuries.ts/schedules.ts's getGameWeatherByTeamWeek).
 *
 * Only usable for 2022-2024: confirmed live that those three seasons
 * share the same clean `season`/`week`/`game_type`/`depth_team` schema,
 * but 2025's file uses a completely different ESPN-scrape/timestamp
 * format (keyed by `dt`, no `week` column at all) — see CLAUDE.md item
 * 37. Reliably mapping 2025's snapshots to weeks would be its own
 * leakage-prone inference problem, deliberately not attempted here —
 * this reader simply returns an empty map for any season it doesn't
 * recognize as using the clean schema, rather than silently
 * misinterpreting the ESPN format.
 *
 * Returns `${normalizedName} -> week -> depthTeam` — same
 * normalized-name join key every other nflverse source uses (see
 * playerMatch.ts), so callers resolve it into whichever PlayerID space
 * they're working in (SportsDataIO's or the nflverse-only pipeline's
 * synthetic IDs) the same way they already resolve every other source.
 */
export async function getDepthChartByNormalizedNameWeek(season: number): Promise<Map<string, Map<number, number>>> {
  const byNormalizedName = new Map<string, Map<number, number>>();
  if (season >= 2025) return byNormalizedName;

  const [rows, gsisIdToName] = await Promise.all([
    fetchNflverseCsv("depth_charts", `depth_charts_${season}.csv`, REVALIDATE_SECONDS),
    getGsisIdToDisplayName(),
  ]);

  for (const row of rows) {
    if (row.game_type !== "REG") continue;
    if (row.formation !== "Offense") continue;
    if (!OFFENSE_SKILL_POSITIONS.has(row.position)) continue;

    const name = gsisIdToName.get(row.gsis_id);
    if (!name) continue;

    const week = Number(row.week);
    const depthTeam = Number(row.depth_team);
    if (!Number.isFinite(week) || !Number.isFinite(depthTeam)) continue;

    const normalizedName = normalizePlayerName(name);
    let byWeek = byNormalizedName.get(normalizedName);
    if (!byWeek) {
      byWeek = new Map();
      byNormalizedName.set(normalizedName, byWeek);
    }
    const existing = byWeek.get(week);
    if (existing == null || depthTeam < existing) byWeek.set(week, depthTeam);
  }

  return byNormalizedName;
}
