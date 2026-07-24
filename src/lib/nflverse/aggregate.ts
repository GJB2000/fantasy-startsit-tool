import type { PlayerGameStat } from "@/lib/sportsdata/types";
import type { NflverseWeekStat } from "./weekTable";

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function averageStat(stats: NflverseWeekStat[], key: keyof Omit<NflverseWeekStat, "week">): number | null {
  const values = stats.map((s) => s[key]).filter((v): v is number => v != null);
  return values.length > 0 ? average(values) : null;
}

/** Average offensive snap share over a set of recent-week nflverse stats. */
export function averageSnapShare(stats: NflverseWeekStat[]): number | null {
  return averageStat(stats, "offensePct");
}

/** Average target share over a set of recent-week nflverse stats. */
export function averageTargetShare(stats: NflverseWeekStat[]): number | null {
  return averageStat(stats, "targetShare");
}

/** Average separation from the nearest defender over a set of recent-week nflverse stats. */
export function averageSeparation(stats: NflverseWeekStat[]): number | null {
  return averageStat(stats, "avgSeparation");
}

/**
 * Success rate (a binary, down/distance-adjusted "did this play succeed"
 * flag), role-scoped by position (dropbacks for QB, rush attempts for
 * RB, targets for WR/TE — mirrors volume.ts's getVolumeStat). Already a
 * per-week rate (see playByPlay.ts), so this is a simple mean across
 * recent weeks like snap share/target share, not a raw-count average
 * like red-zone/goal-line touches. See CLAUDE.md's unused-data-audit
 * follow-up (item 31).
 */
export function averageSuccessRate(stats: NflverseWeekStat[], position: string | null): number | null {
  if (position === "QB") return averageStat(stats, "qbSuccessRate");
  if (position === "RB") return averageStat(stats, "rushSuccessRate");
  if (position === "WR" || position === "TE") return averageStat(stats, "recSuccessRate");
  return null;
}

/**
 * Same shape as averageSuccessRate, using EPA-per-play instead of the
 * binary success flag. See CLAUDE.md item 31.
 */
export function averageEpaPerPlay(stats: NflverseWeekStat[], position: string | null): number | null {
  if (position === "QB") return averageStat(stats, "qbEpaPerDropback");
  if (position === "RB") return averageStat(stats, "rushEpaPerPlay");
  if (position === "WR" || position === "TE") return averageStat(stats, "recEpaPerTarget");
  return null;
}

/**
 * FTN Charting drop rate, target-scoped (WR/TE only — no meaningful
 * denominator for other positions). See CLAUDE.md item 32.
 */
export function averageDropRate(stats: NflverseWeekStat[], position: string | null): number | null {
  if (position === "WR" || position === "TE") return averageStat(stats, "dropRate");
  return null;
}

/**
 * QB's own rushing EPA-per-play — reads the same `rushEpaPerPlay` field
 * RB's shipped EPA signal uses (averageEpaPerPlay above), just for a QB's
 * own carries rather than a RB's. Distinct from averageEpaPerPlay's QB
 * mapping, which reads qbEpaPerDropback (a passing-EPA signal already
 * tested and rejected — see CLAUDE.md item 31). See CLAUDE.md's
 * QB-rushing-EPA follow-up to item 40 for why this one shipped where
 * every prior QB-rushing signal didn't: notably more stable across all
 * four backtest seasons (49.5-59.4%, never below chance) than volume,
 * red-zone-only, goal-line-only, or NextGen rushYoe ever were.
 */
export function averageQbRushEpa(stats: NflverseWeekStat[], position: string | null): number | null {
  if (position !== "QB") return null;
  return averageStat(stats, "rushEpaPerPlay");
}

/**
 * Red-zone touches (rush attempts for RB, red-zone rush attempts for
 * QB, targets for WR/TE — mirrors volume.ts's getVolumeStat)
 * averaged over a player's actually-played recent games. Unlike the
 * share/rate stats above, a real zero is meaningful here (played, but
 * no red-zone role that game), so this walks the played games
 * directly and defaults a missing nflverse row to 0 rather than
 * excluding that game from the average.
 */
export function averageRedZoneTouches(
  games: PlayerGameStat[],
  statForWeek: (week: number) => NflverseWeekStat | undefined,
  position: string | null
): number | null {
  if (games.length === 0) return null;

  const values = games
    .map((game) => {
      const stat = statForWeek(game.Week);
      const rush = stat?.redZoneRushAttempts ?? 0;
      const targets = stat?.redZoneTargets ?? 0;
      if (position === "RB") return rush + targets;
      if (position === "QB") return rush;
      if (position === "WR" || position === "TE") return targets;
      return null;
    })
    .filter((v): v is number => v != null);

  return values.length > 0 ? average(values) : null;
}

/**
 * Same shape as averageRedZoneTouches, tighter yardline_100<=5 cutoff —
 * tested standalone as a candidate QB-rushing signal (see CLAUDE.md
 * item 30 follow-up) before deciding whether it's worth wiring into the
 * engine.
 */
export function averageGoalLineTouches(
  games: PlayerGameStat[],
  statForWeek: (week: number) => NflverseWeekStat | undefined,
  position: string | null
): number | null {
  if (games.length === 0) return null;

  const values = games
    .map((game) => {
      const stat = statForWeek(game.Week);
      const rush = stat?.goalLineRushAttempts ?? 0;
      const targets = stat?.goalLineTargets ?? 0;
      if (position === "RB") return rush + targets;
      if (position === "QB") return rush;
      if (position === "WR" || position === "TE") return targets;
      return null;
    })
    .filter((v): v is number => v != null);

  return values.length > 0 ? average(values) : null;
}
