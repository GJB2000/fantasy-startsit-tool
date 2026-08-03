import { fetchNflverseCsv } from "./client";
import { getGsisIdToDisplayName } from "./players";
import { normalizePlayerName } from "./playerMatch";

const REVALIDATE_SECONDS = 24 * 60 * 60;
const OFFENSE_SKILL_POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

/**
 * Current depth-chart rank (1 = starter, 2 = backup, ...) per player, from
 * the LATEST snapshot of nflverse's `depth_charts` release — for the live
 * tool's "is this a starter or a backup" signal. Uses the 2025+
 * ESPN-scrape schema (keyed by `dt`/`pos_abb`/`pos_rank`) that
 * getDepthChartByNormalizedNameWeek above deliberately can't use: that one
 * needs to map snapshots to specific past weeks (a leakage-prone inference
 * problem — item 37), but "who's the starter right now" needs no such
 * mapping — it's just the most recent snapshot, a genuine current fact.
 * Scoped to offensive skill positions; a player's rank is the best (lowest)
 * slot they appear at. Returns `normalizedName -> rank`. Confirmed live:
 * the latest 2025 snapshot correctly has Lamar Jackson at BAL QB1, star
 * RB/WR/TEs at rank 1, and deep backups (e.g. journeyman 4th-string QBs)
 * absent entirely — so "not on the chart" is itself a meaningful
 * backup/scrub signal.
 *
 * Only the current season carries this ESPN-scrape schema; a season <2025
 * uses the older week-based format and returns empty here (its data is
 * available via getDepthChartByNormalizedNameWeek instead).
 */
export async function getCurrentDepthChartRankByNormalizedName(season: number): Promise<Map<string, number>> {
  const byName = new Map<string, number>();
  if (season < 2025) return byName;

  const rows = await fetchNflverseCsv("depth_charts", `depth_charts_${season}.csv`, REVALIDATE_SECONDS, [
    "dt",
    "player_name",
    "pos_abb",
    "pos_rank",
  ]);

  let latest = "";
  for (const r of rows) if (r.dt > latest) latest = r.dt;
  if (!latest) return byName;

  for (const r of rows) {
    if (r.dt !== latest || !OFFENSE_SKILL_POSITIONS.has(r.pos_abb)) continue;
    const rank = Number(r.pos_rank);
    if (!Number.isFinite(rank)) continue;
    const name = normalizePlayerName(r.player_name);
    const existing = byName.get(name);
    if (existing == null || rank < existing) byName.set(name, rank);
  }
  return byName;
}

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
