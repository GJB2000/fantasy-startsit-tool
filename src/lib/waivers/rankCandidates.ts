import { POINTS_PER_VOLUME_UNIT } from "@/lib/recommendation/config";
import { getRecentWindow, takeRecentPlayed } from "@/lib/recommendation/recentWindow";
import { getVolumeStat } from "@/lib/recommendation/volume";
import { getPlayerSeasonStats } from "@/lib/sportsdata/seasonStats";
import { getActivePlayers } from "@/lib/sportsdata/players";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import {
  getFantasyPoints,
  SKILL_POSITIONS,
  type Player,
  type PlayerGameStat,
  type ScoringFormat,
  type SkillPosition,
} from "@/lib/sportsdata/types";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";

const MIN_RECENT_GAMES = 2;
const CANDIDATES_PER_POSITION = 10;
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

// The "already rostered / startable" tier to exclude so the board shows
// genuinely-available waiver players, not studs. Ranked by season-to-date
// points; depths mirror the backtest's BROAD_MODE_POOL_SIZE (top-12 QB/TE,
// top-24 RB/WR) — the waiver backtest validated volume-sort specifically on
// this startable-tier-removed pool. Applied on TOP of the user's own
// rostered/league exclusions (for a Sleeper user these studs are usually
// already excluded; for a manual user this is what keeps the board honest).
const STARTABLE_TIER_DEPTH: Record<SkillPosition, number> = { QB: 12, RB: 24, WR: 24, TE: 12 };

/**
 * Which metric drives the ranking.
 * - "volume" (default): rank the eligible pool by recent volume alone —
 *   the highest-opportunity players still available. The waiver backtest
 *   (lib/backtest/waiverBacktest.ts) showed this beats both "gap" and
 *   "residual" on real forward production by ~2 PPG, while the old "gap"
 *   sort was no better than picking a random eligible player. "Buy-low"
 *   (production lagging volume) is now surfaced as a per-candidate tag,
 *   not the sort key.
 * - "residual": expected points from recent volume minus points scored —
 *   the biggest buy-lows first. Beats "gap" every season in the backtest
 *   but still trails plain volume. Kept selectable (rankBy=residual).
 * - "gap": the original ordinal pointsRank - volumeRank difference —
 *   magnitude-blind and pool-composition-dependent; retired as the default
 *   after the backtest. Kept selectable (rankBy=gap) for comparison.
 */
export type WaiverRankStrategy = "volume" | "gap" | "residual";
export const DEFAULT_WAIVER_STRATEGY: WaiverRankStrategy = "volume";

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
  /**
   * Expected points from recent volume (recentVolumeAvg × the position's
   * POINTS_PER_VOLUME_UNIT conversion factor) minus recent points actually
   * scored. Positive = scoring fewer points than this volume typically
   * yields — the same "buy-low" case as gapScore, but in real points and
   * independent of pool composition. The "residual" ranking key; see
   * WaiverRankStrategy.
   */
  residualScore: number;
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

/**
 * Volume/yards pairing for the efficiency baseline, over any object that
 * carries the raw box-score fields (a PlayerGameStat or a PlayerSeasonStat
 * — both share these field names). Same pairing as getEfficiencyStat.
 */
interface UnitsAndYardsSource {
  PassingAttempts: number;
  PassingYards: number;
  RushingAttempts: number;
  RushingYards: number;
  Receptions: number;
  ReceivingYards: number;
  ReceivingTargets: number;
}

export function unitsAndYardsForPosition(
  s: UnitsAndYardsSource,
  position: SkillPosition
): { units: number; yards: number } {
  switch (position) {
    case "QB":
      return { units: s.PassingAttempts, yards: s.PassingYards };
    case "RB":
      return { units: s.RushingAttempts + s.Receptions, yards: s.RushingYards + s.ReceivingYards };
    case "WR":
    case "TE":
      return { units: s.ReceivingTargets, yards: s.ReceivingYards };
  }
}

/**
 * Position-wide "typical efficiency" baseline for EFFICIENCY_FLOOR_RATIO —
 * a real ratio-of-sums across every skill player's totals (the same "ratio
 * of sums" method this app's other empirically-derived conversion factors
 * use, e.g. POINTS_PER_VOLUME_UNIT), not this ranking's own thin
 * recent-week candidate pool. Works on any UnitsAndYardsSource rows, so
 * the live path can feed it full-season PlayerSeasonStats while the
 * backtest feeds it every game row strictly before the cutoff week (a
 * leak-free, point-in-time baseline).
 */
export function computeEfficiencyBaseline(
  rows: (UnitsAndYardsSource & { Position: string })[]
): Record<SkillPosition, number | null> {
  const result = {} as Record<SkillPosition, number | null>;
  for (const position of SKILL_POSITIONS) {
    let totalUnits = 0;
    let totalYards = 0;
    for (const row of rows) {
      if (row.Position !== position) continue;
      const { units, yards } = unitsAndYardsForPosition(row, position);
      totalUnits += units;
      totalYards += yards;
    }
    result[position] = totalUnits > 0 ? totalYards / totalUnits : null;
  }
  return result;
}

/**
 * Pure, data-injected core of the waiver ranking — everything except the
 * data fetch. Given each candidate's recent-games window, a position-wide
 * efficiency baseline, and the exclude set, it scores the full ELIGIBLE
 * pool per position (players clearing MIN_RECENT_GAMES, the top-half
 * recent-volume floor, and the efficiency floor) with every ranking
 * metric computed (volumeRank/pointsRank/gapScore/residualScore) — but
 * does NOT apply the strategy-specific underproduction gate or the final
 * slice. Callers pass this pool to selectWaiverCandidates.
 *
 * Split out from the live fetch so both rankWaiverCandidates (live,
 * SportsDataIO data) and the waiver backtest (nflverse historical data)
 * run the identical ranking logic rather than a reimplementation — the
 * backtest is grading the actual shipped ranking, not a copy of it.
 */
export function scoreWaiverPool(
  players: Pick<Player, "PlayerID" | "Position" | "Team">[],
  recentGamesByPlayer: Map<number, PlayerGameStat[]>,
  efficiencyBaseline: Record<SkillPosition, number | null>,
  excludePlayerIds: Set<number>,
  format: ScoringFormat
): Record<SkillPosition, WaiverCandidateRank[]> {
  const byPosition = {} as Record<SkillPosition, WaiverCandidateRank[]>;

  for (const position of SKILL_POSITIONS) {
    type RawCandidate = Omit<WaiverCandidateRank, "volumeRank" | "pointsRank" | "gapScore" | "residualScore">;
    const raw: RawCandidate[] = [];

    const efficiencyByPlayerId = new Map<number, number>();

    for (const player of players) {
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
    // relative to the position-wide baseline — see EFFICIENCY_FLOOR_RATIO.
    // A missing efficiency reading (no valid game) never excludes a player
    // on its own — this only filters players proven bad, not players we
    // lack data on.
    const baseline = efficiencyBaseline[position];
    const efficiencyMinimum = baseline != null ? baseline * EFFICIENCY_FLOOR_RATIO : null;

    const pointsPerVolumeUnit = POINTS_PER_VOLUME_UNIT[format][position];

    byPosition[position] = raw
      .map((p) => {
        const volumeRank = volumeRankById.get(p.playerId)!;
        const pointsRank = pointsRankById.get(p.playerId)!;
        const expectedPointsFromVolume = p.recentVolumeAvg * pointsPerVolumeUnit;
        return {
          ...p,
          volumeRank,
          pointsRank,
          gapScore: pointsRank - volumeRank,
          residualScore: expectedPointsFromVolume - p.recentPprAvg,
        };
      })
      .filter((p) => {
        const efficiency = efficiencyByPlayerId.get(p.playerId);
        return (
          p.volumeRank <= volumeFloorRank &&
          (efficiency == null || efficiencyMinimum == null || efficiency >= efficiencyMinimum)
        );
      });
  }

  return byPosition;
}

/**
 * Applies a strategy's underproduction gate, sort, and top-N slice to a
 * scored eligible pool from scoreWaiverPool. Each strategy gates "is this
 * an underproducer" with the same metric it ranks by, so the surfaced set
 * is internally coherent (gate and sort agree) rather than one strategy's
 * picks being pre-filtered by the other's definition.
 */
export function selectWaiverCandidates(
  pool: WaiverCandidateRank[],
  strategy: WaiverRankStrategy,
  limit: number
): WaiverCandidateRank[] {
  // Volume: the highest-opportunity available players, no underproduction
  // gate (the backtest-winning strategy — see WaiverRankStrategy).
  if (strategy === "volume") {
    return [...pool].sort((a, b) => b.recentVolumeAvg - a.recentVolumeAvg).slice(0, limit);
  }
  // gap/residual: gate on "is this an underproducer" with the same metric
  // the sort uses, so the surfaced set is internally coherent.
  return pool
    .filter((p) => (strategy === "residual" ? p.residualScore > 0 : p.gapScore > 0))
    .sort((a, b) => (strategy === "residual" ? b.residualScore - a.residualScore : b.gapScore - a.gapScore))
    .slice(0, limit);
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
  excludePlayerIds: Set<number>,
  strategy: WaiverRankStrategy = DEFAULT_WAIVER_STRATEGY
): Promise<Record<SkillPosition, WaiverCandidateRank[]>> {
  // Same recent-form window the scoring path uses (getRecentWindow): in
  // the offseason a wider lookback, from which each player keeps only
  // their last N games actually PLAYED — so a candidate whose recent
  // volume/production would otherwise be judged off injury-thinned
  // half-games is ranked on real pre-injury games instead.
  const recentWindow = getRecentWindow(context);
  const [activePlayers, weeklyRows, seasonStats] = await Promise.all([
    getActivePlayers(),
    Promise.all(recentWindow.weeks.map((week) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, week))),
    getPlayerSeasonStats(context.lastCompletedSeason),
  ]);
  const efficiencyBaseline = computeEfficiencyBaseline(seasonStats);

  const recentGamesByPlayer = new Map<number, PlayerGameStat[]>();
  for (const rows of weeklyRows) {
    for (const row of rows) {
      if (row.Played !== 1) continue;
      const list = recentGamesByPlayer.get(row.PlayerID);
      if (list) list.push(row);
      else recentGamesByPlayer.set(row.PlayerID, [row]);
    }
  }
  for (const [playerId, list] of recentGamesByPlayer) {
    list.sort((a, b) => a.Week - b.Week);
    recentGamesByPlayer.set(playerId, takeRecentPlayed(list, recentWindow.limit));
  }

  // Exclude the startable/rostered tier (top by season points per position)
  // on top of the caller's own exclusions — see STARTABLE_TIER_DEPTH.
  const excludeWithStartable = new Set(excludePlayerIds);
  for (const position of SKILL_POSITIONS) {
    const startable = seasonStats
      .filter((s) => s.Position === position)
      .sort((a, b) => getFantasyPoints(b, format) - getFantasyPoints(a, format))
      .slice(0, STARTABLE_TIER_DEPTH[position]);
    for (const s of startable) excludeWithStartable.add(s.PlayerID);
  }

  const pool = scoreWaiverPool(activePlayers, recentGamesByPlayer, efficiencyBaseline, excludeWithStartable, format);

  const byPosition = {} as Record<SkillPosition, WaiverCandidateRank[]>;
  for (const position of SKILL_POSITIONS) {
    byPosition[position] = selectWaiverCandidates(pool[position], strategy, CANDIDATES_PER_POSITION);
  }
  return byPosition;
}
