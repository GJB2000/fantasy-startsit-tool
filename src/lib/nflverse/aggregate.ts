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
