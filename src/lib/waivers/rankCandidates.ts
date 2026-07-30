import { getVolumeStat } from "@/lib/recommendation/volume";
import { getPlayerSeasonStats } from "@/lib/sportsdata/seasonStats";
import { getActivePlayers } from "@/lib/sportsdata/players";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import {
  getFantasyPoints,
  SKILL_POSITIONS,
  type PlayerGameStat,
  type PlayerSeasonStat,
  type ScoringFormat,
  type SkillPosition,
} from "@/lib/sportsdata/types";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";

const MIN_RECENT_GAMES = 2;
const CANDIDATES_PER_POSITION = 6;
// A candidate needs at least this fraction of the position's own
// FULL-SEASON efficiency baseline to qualify — see getEfficiencyStat's
// doc comment. Two cheaper baselines were tried and rejected first: a
// rank-based floor ("exclude the bottom quartile") only guarantees
// relative ordering, not an actual quality floor, and a mean computed
// from just the recent (~4-week) candidate pool can itself be dragged
// down by a real week with many backups getting spot duty — exactly
// when this filter matters most, and exactly when it failed on a real
// case (two backup QBs late in a season many teams were resting
// starters). A full-season, ratio-of-sums baseline (hundreds of
// attempts per position, not ~20 recent ones) stays stable through any
// single bad week.
const EFFICIENCY_FLOOR_RATIO = 0.75;

export interface WaiverCandidateRank {
  playerId: number;
  position: SkillPosition;
  team: string | null;
  recentVolumeAvg: number;
  recentPprAvg: number;
  gamesUsedForRecent: number;
  /** 1 = most recent volume at the position. */
  volumeRank: number;
  /** 1 = most recent points at the position. */
  pointsRank: number;
  /** pointsRank - volumeRank; positive means opportunity is ahead of production. */
  gapScore: number;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Per-game real-football efficiency (yards per unit of volume), NOT
 * fantasy points — deliberately a different axis than the volume/points
 * gap this ranking is otherwise built on. Added after a real false
 * positive: a backup QB forced into extended action can rank highly on
 * "opportunity outpacing production" while genuinely just being bad
 * (low yards/attempt), not unlucky — raw points can't tell the two
 * apart, since both look like "high volume, low points." QB: yards per
 * pass attempt. RB: yards per touch (rush attempts + receptions). WR/TE:
 * yards per target (folds in catch rate, not just yards-when-caught).
 */
function getEfficiencyStat(row: PlayerGameStat, position: SkillPosition): number | null {
  switch (position) {
    case "QB":
      return row.PassingAttempts > 0 ? row.PassingYards / row.PassingAttempts : null;
    case "RB": {
      const touches = row.RushingAttempts + row.Receptions;
      return touches > 0 ? (row.RushingYards + row.ReceivingYards) / touches : null;
    }
    case "WR":
    case "TE":
      return row.ReceivingTargets > 0 ? row.ReceivingYards / row.ReceivingTargets : null;
    default:
      return null;
  }
}

/** Same volume/yards pairing as getEfficiencyStat, over a player's season totals rather than one game. */
function getSeasonUnitsAndYards(stat: PlayerSeasonStat, position: SkillPosition): { units: number; yards: number } {
  switch (position) {
    case "QB":
      return { units: stat.PassingAttempts, yards: stat.PassingYards };
    case "RB":
      return { units: stat.RushingAttempts + stat.Receptions, yards: stat.RushingYards + stat.ReceivingYards };
    case "WR":
    case "TE":
      return { units: stat.ReceivingTargets, yards: stat.ReceivingYards };
  }
}

/**
 * Position-wide "typical efficiency this season" baseline for
 * EFFICIENCY_FLOOR_RATIO — a real ratio-of-sums across every skill
 * player's full-season totals (the same "ratio of sums" method this
 * app's other empirically-derived conversion factors use, e.g.
 * POINTS_PER_VOLUME_UNIT), not this ranking's own thin recent-week
 * candidate pool.
 */
function computeSeasonEfficiencyBaseline(seasonStats: PlayerSeasonStat[]): Record<SkillPosition, number | null> {
  const result = {} as Record<SkillPosition, number | null>;
  for (const position of SKILL_POSITIONS) {
    let totalUnits = 0;
    let totalYards = 0;
    for (const stat of seasonStats) {
      if (stat.Position !== position) continue;
      const { units, yards } = getSeasonUnitsAndYards(stat, position);
      totalUnits += units;
      totalYards += yards;
    }
    result[position] = totalUnits > 0 ? totalYards / totalUnits : null;
  }
  return result;
}

/**
 * Bulk ranking pass across the whole active skill-player pool —
 * deliberately NOT running the full buildComparisonInput/scorePlayer
 * pipeline here (that's reserved for the handful of top candidates
 * actually surfaced, see buildWaiverReport.ts), since this needs to scan
 * every active player cheaply rather than the few players a normal
 * comparison touches.
 *
 * Ranks by the GAP between a player's recent-volume rank and their
 * recent-points rank at the same position: a player getting
 * starter-level opportunity while still producing replacement-level
 * points is exactly the "opportunity outpacing production" profile a
 * waiver add is looking for. This is a ranking composition of one
 * already-validated primitive (recent volume level beats recent points
 * as a forward signal — the strongest standalone predictor found across
 * this whole app's backtesting history), not an independent predictive
 * claim of its own.
 *
 * Explicitly NOT a trend/delta signal: a real backtest of "opportunity
 * TREND vs. points TREND" (recent-N-games vs. a prior baseline window,
 * swept across window sizes and baseline definitions) came back
 * statistically indistinguishable from chance-level noise and clearly
 * weaker than just using absolute recent volume level — see CLAUDE.md's
 * waiver-wire investigation for the full sweep. This ranking uses
 * absolute LEVEL only, per that finding.
 */
export async function rankWaiverCandidates(
  context: SeasonContext,
  format: ScoringFormat,
  excludePlayerIds: Set<number>
): Promise<Record<SkillPosition, WaiverCandidateRank[]>> {
  const [activePlayers, weeklyRows, seasonStats] = await Promise.all([
    getActivePlayers(),
    Promise.all(context.recentWeeks.map((week) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, week))),
    getPlayerSeasonStats(context.lastCompletedSeason),
  ]);
  const seasonEfficiencyBaseline = computeSeasonEfficiencyBaseline(seasonStats);

  const recentGamesByPlayer = new Map<number, PlayerGameStat[]>();
  for (const rows of weeklyRows) {
    for (const row of rows) {
      if (row.Played !== 1) continue;
      const list = recentGamesByPlayer.get(row.PlayerID);
      if (list) list.push(row);
      else recentGamesByPlayer.set(row.PlayerID, [row]);
    }
  }
  for (const list of recentGamesByPlayer.values()) list.sort((a, b) => a.Week - b.Week);

  const byPosition = {} as Record<SkillPosition, WaiverCandidateRank[]>;

  for (const position of SKILL_POSITIONS) {
    type RawCandidate = Omit<WaiverCandidateRank, "volumeRank" | "pointsRank" | "gapScore">;
    const raw: RawCandidate[] = [];

    const efficiencyByPlayerId = new Map<number, number>();

    for (const player of activePlayers) {
      if (player.Position !== position || excludePlayerIds.has(player.PlayerID)) continue;
      const games = recentGamesByPlayer.get(player.PlayerID) ?? [];
      if (games.length < MIN_RECENT_GAMES) continue;

      const volumeValues = games.map(getVolumeStat).filter((v): v is number => v != null);
      if (volumeValues.length === 0) continue;

      const efficiencyValues = games.map((g) => getEfficiencyStat(g, position)).filter((v): v is number => v != null);
      if (efficiencyValues.length > 0) {
        efficiencyByPlayerId.set(player.PlayerID, average(efficiencyValues));
      }

      raw.push({
        playerId: player.PlayerID,
        position,
        team: player.Team,
        recentVolumeAvg: average(volumeValues),
        recentPprAvg: average(games.map((g) => getFantasyPoints(g, format))),
        gamesUsedForRecent: games.length,
      });
    }

    const volumeRankById = new Map(
      [...raw].sort((a, b) => b.recentVolumeAvg - a.recentVolumeAvg).map((p, i) => [p.playerId, i + 1])
    );
    const pointsRankById = new Map(
      [...raw].sort((a, b) => b.recentPprAvg - a.recentPprAvg).map((p, i) => [p.playerId, i + 1])
    );
    // Self-relative floor, not a guessed absolute cutoff: only rank
    // within the top half of the position's own recent-volume
    // distribution — a gap score is meaningless noise for a player with
    // a token, one-off role.
    const volumeFloorRank = Math.max(1, Math.ceil(raw.length / 2));

    // A candidate must convert volume to yards at least reasonably well
    // relative to this season's real position-wide baseline — see
    // EFFICIENCY_FLOOR_RATIO. A missing efficiency reading (no valid
    // game) never excludes a player on its own — this only filters
    // players proven bad, not players we lack data on.
    const seasonBaseline = seasonEfficiencyBaseline[position];
    const efficiencyMinimum = seasonBaseline != null ? seasonBaseline * EFFICIENCY_FLOOR_RATIO : null;

    byPosition[position] = raw
      .map((p) => {
        const volumeRank = volumeRankById.get(p.playerId)!;
        const pointsRank = pointsRankById.get(p.playerId)!;
        return { ...p, volumeRank, pointsRank, gapScore: pointsRank - volumeRank };
      })
      .filter((p) => {
        const efficiency = efficiencyByPlayerId.get(p.playerId);
        return (
          p.volumeRank <= volumeFloorRank &&
          p.gapScore > 0 &&
          (efficiency == null || efficiencyMinimum == null || efficiency >= efficiencyMinimum)
        );
      })
      .sort((a, b) => b.gapScore - a.gapScore)
      .slice(0, CANDIDATES_PER_POSITION);
  }

  return byPosition;
}
