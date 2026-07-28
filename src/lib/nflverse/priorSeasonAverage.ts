import { getFantasyPoints, type ScoringFormat } from "@/lib/sportsdata/types";
import { fetchNflverseCsv } from "./client";
import { normalizePlayerName } from "./playerMatch";

const REVALIDATE_SECONDS = 24 * 60 * 60;
const COLUMNS = ["season_type", "player_display_name", "fantasy_points", "fantasy_points_ppr", "receptions"] as const;

/**
 * Full prior-season per-game scoring average, by normalized player name —
 * a fallback for the one case blendedScore has no answer for at all: a
 * player with zero games in BOTH the current season's recent-window and
 * season-to-date data (week 1 of a season, most commonly, but also a
 * rookie call-up or a player returning from a long absence at any point
 * in-season). SportsDataIO has no accessible season before the current
 * one on this plan (see Data Source Notes), so this reads nflverse's
 * `stats_player` release instead — the same source and name-based join
 * (playerMatch.ts) already used throughout backtest mode and the live
 * tool's supplementary signals.
 *
 * Degrades to an empty map, not a throw, if the prior season's file
 * doesn't exist (e.g. requesting a prior season older than nflverse's own
 * coverage) — same "optional signal, fail open" discipline as every other
 * nflverse fetch in this app (see CLAUDE.md Data Source Notes).
 */
export async function getPriorSeasonPprAveragesByNormalizedName(
  priorSeason: number,
  format: ScoringFormat
): Promise<Map<string, number>> {
  let rows;
  try {
    rows = await fetchNflverseCsv("stats_player", `stats_player_week_${priorSeason}.csv`, REVALIDATE_SECONDS, COLUMNS);
  } catch {
    return new Map();
  }

  const totals = new Map<string, { sum: number; games: number }>();
  for (const r of rows) {
    if (r.season_type !== "REG") continue;
    const points = getFantasyPoints(
      {
        FantasyPoints: r.fantasy_points === "" ? 0 : Number(r.fantasy_points),
        FantasyPointsPPR: r.fantasy_points_ppr === "" ? 0 : Number(r.fantasy_points_ppr),
        Receptions: r.receptions === "" ? 0 : Number(r.receptions),
      },
      format
    );
    const name = normalizePlayerName(r.player_display_name);
    const existing = totals.get(name);
    if (existing) {
      existing.sum += points;
      existing.games += 1;
    } else {
      totals.set(name, { sum: points, games: 1 });
    }
  }

  const result = new Map<string, number>();
  for (const [name, { sum, games }] of totals) {
    result.set(name, sum / games);
  }
  return result;
}
