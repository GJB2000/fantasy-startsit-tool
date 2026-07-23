import { isSkillPosition, type Player, type PlayerGameStat } from "@/lib/sportsdata/types";
import { fetchNflverseCsv } from "./client";
import { normalizePlayerName } from "./playerMatch";

const REVALIDATE_SECONDS = 24 * 60 * 60;

export interface NflverseGameLog {
  /** Index 0 = week 1, index N-1 = week N. Skill positions (QB/RB/WR/TE) only. */
  allWeeklyRows: PlayerGameStat[][];
  /** Synthetic roster built from the season's own rows — one entry per unique player seen. */
  players: Player[];
  /** Same identity space `allWeeklyRows`/`players` use — the join target for buildNflversePlayerWeekTable. */
  playerIdByNormalizedName: Map<string, number>;
}

/**
 * Builds a full game log directly from nflverse's `stats_player` release,
 * shaped exactly like SportsDataIO's PlayerGameStatsByWeek — the whole
 * point being that every downstream consumer (weekData.ts, pairing.ts,
 * grading.ts, buildBacktestInput.ts) is written against the
 * `PlayerGameStat` interface, not against SportsDataIO specifically, so
 * feeding it synthetic rows built from a different source works with zero
 * changes to any of that code. Exists to validate the tuned engine
 * weights against seasons SportsDataIO won't serve on this plan (2024 and
 * earlier) — see CLAUDE.md "Backtesting & Tuning History" for why.
 *
 * "Played" is inferred as "this player has a row for this week at all" —
 * nflverse's `calculate_stats()` only emits a row when a player recorded
 * a snap-worthy stat, so a bye/inactive/healthy-scratch player simply has
 * no row, which is the same practical signal SportsDataIO's Played flag
 * encodes. `Started` isn't tracked by nflverse and isn't read by any
 * scoring logic downstream (only accumulated into PlayerSeasonStat.started,
 * which nothing consumes) — defaulted to match Played. `InjuryStatus` is
 * always null here, matching how the existing backtest already treats
 * historical injury status as unknown by design.
 *
 * PlayerIDs are synthetic (assigned in this function, stable only within
 * one call) since there's no SportsDataIO PlayerID to anchor to — this
 * pipeline never needs one, since every nflverse source it joins against
 * (snap counts, target share, NextGen Stats, red zone) already resolves
 * to the same `player_display_name` convention this file's own rows use.
 */
export async function getNflverseGameLog(season: number, maxWeek: number): Promise<NflverseGameLog> {
  const rows = await fetchNflverseCsv("stats_player", `stats_player_week_${season}.csv`, REVALIDATE_SECONDS);

  const filtered = rows.filter(
    (r) => r.season_type === "REG" && Number(r.week) >= 1 && Number(r.week) <= maxWeek && isSkillPosition(r.position)
  );

  const playerIdByNormalizedName = new Map<string, number>();
  const latestRowByNormalizedName = new Map<string, Record<string, string>>();
  const uniqueNormalizedNames = Array.from(new Set(filtered.map((r) => normalizePlayerName(r.player_display_name))));
  uniqueNormalizedNames.sort();
  uniqueNormalizedNames.forEach((name, i) => playerIdByNormalizedName.set(name, i + 1));

  const allWeeklyRows: PlayerGameStat[][] = Array.from({ length: maxWeek }, () => []);

  for (const r of filtered) {
    const week = Number(r.week);
    const normalizedName = normalizePlayerName(r.player_display_name);
    const playerId = playerIdByNormalizedName.get(normalizedName)!;

    const existingLatest = latestRowByNormalizedName.get(normalizedName);
    if (!existingLatest || Number(existingLatest.week) < week) {
      latestRowByNormalizedName.set(normalizedName, r);
    }

    allWeeklyRows[week - 1].push({
      PlayerID: playerId,
      Season: season,
      Week: week,
      Team: r.team,
      Opponent: r.opponent_team,
      Position: r.position,
      Played: 1,
      Started: 1,
      FantasyPoints: r.fantasy_points === "" ? 0 : Number(r.fantasy_points),
      FantasyPointsPPR: r.fantasy_points_ppr === "" ? 0 : Number(r.fantasy_points_ppr),
      InjuryStatus: null,
      ReceivingTargets: r.targets === "" ? 0 : Number(r.targets),
      RushingAttempts: r.carries === "" ? 0 : Number(r.carries),
      PassingAttempts: r.attempts === "" ? 0 : Number(r.attempts),
    });
  }

  const players: Player[] = uniqueNormalizedNames.map((normalizedName) => {
    const latest = latestRowByNormalizedName.get(normalizedName)!;
    const displayName = latest.player_display_name;
    const nameParts = displayName.trim().split(/\s+/);
    const lastName = nameParts.length > 1 ? nameParts.pop()! : displayName;
    const firstName = nameParts.join(" ") || displayName;

    return {
      PlayerID: playerIdByNormalizedName.get(normalizedName)!,
      Team: latest.team,
      FirstName: firstName,
      LastName: lastName,
      Position: latest.position,
      Status: "Active",
      PhotoUrl: null,
      ByeWeek: null,
      InjuryStatus: null,
    };
  });

  return { allWeeklyRows, players, playerIdByNormalizedName };
}
