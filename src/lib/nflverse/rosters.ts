import { fetchNflverseCsv } from "./client";
import type { RosterStatusRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;
const COLUMNS = ["season", "week", "game_type", "team", "full_name", "status"] as const;

/**
 * Weekly roster status ("RES" = reserve/injured, among others — ACT,
 * DEV, INA, CUT, RET, TRD, TRC, EXE) from nflverse's `weekly_rosters`
 * release. Filters to `status === "RES"` only: this is what closes the
 * gap the weekly injury report (injuries.ts) structurally can't — a
 * player on longer-term injured reserve typically drops off the
 * practice-participation-based injury report entirely (no
 * `report_status` row at all), but IR moves are public roster
 * transactions announced days before kickoff, so this is a genuine,
 * non-leaky pregame fact, not hindsight. Confirmed live standalone
 * before integration (backtest-only, quantified against an
 * unprotected/no-Played-filter pool to simulate Single Pair mode's
 * exposure — see CLAUDE.md's item on this): +4.8 to +7.3pp on top of
 * the already-shipped weekly injury report, across all three scoring
 * formats, on 82-87 exposed pairs in the 2025 season alone.
 *
 * Deliberately does NOT surface "INA" (game-day inactive) — that
 * designation is typically announced ~90 minutes before kickoff, close
 * enough to game time that treating it as a pregame-knowable fact the
 * same way RES/IR moves are (days in advance) would be a meaningfully
 * different, murkier leakage question, not tested here.
 */
export async function getReserveStatusReports(season: number): Promise<RosterStatusRow[]> {
  const rows = await fetchNflverseCsv("weekly_rosters", `roster_weekly_${season}.csv`, REVALIDATE_SECONDS, COLUMNS);

  return rows
    .filter((r) => r.game_type === "REG" && r.status === "RES")
    .map((r) => ({
      season: Number(r.season),
      week: Number(r.week),
      playerDisplayName: r.full_name,
      team: r.team,
      status: r.status,
    }));
}
