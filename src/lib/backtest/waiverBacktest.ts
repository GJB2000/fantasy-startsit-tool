import { BROAD_MODE_POOL_SIZE } from "@/lib/backtest/config";
import { getNflverseGameLog } from "@/lib/nflverse/gameLog";
import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import {
  computeEfficiencyBaseline,
  scoreWaiverPool,
  selectWaiverCandidates,
  type WaiverCandidateRank,
} from "@/lib/waivers/rankCandidates";
import {
  getFantasyPoints,
  SKILL_POSITIONS,
  type PlayerGameStat,
  type ScoringFormat,
  type SkillPosition,
} from "@/lib/sportsdata/types";

/**
 * Backtest for the Waiver Wire ranking (CLAUDE.md's long-standing waiver
 * open item). Every prior waiver work validated only the UNDERLYING
 * primitive (recent volume beats recent points as a forward signal); the
 * RANKING heuristic itself — "biggest volume-vs-points gap" — was never
 * graded as a ranking. This grades it directly, and A/Bs it against the
 * residual-points alternative plus the naive baselines that matter most:
 * does the gap ranking beat simply picking the highest-VOLUME eligible
 * players (the exact question the open item poses), and does anything beat
 * blindly picking a random eligible candidate.
 *
 * Method, for each (season, cutoff week W): rank waiver candidates using
 * ONLY data through week W (via the real shipped ranking core,
 * scoreWaiverPool/selectWaiverCandidates — not a reimplementation), then
 * measure each surfaced candidate's ACTUAL forward production (average PPG
 * over the next FORWARD_WINDOW weeks). A strategy's score is the mean
 * forward PPG of the players it surfaces — higher means its picks really
 * did produce going forward.
 *
 * Runs on the nflverse-only pipeline (getNflverseGameLog), so it pools
 * 2022-2025 rather than the single SportsDataIO season — same rigor as
 * every other multi-season backtest here. The nflverse game-log rows carry
 * every field the ranking reads (volume, yards, points), so this grades
 * the genuine ranking logic on real historical data.
 *
 * Honest caveats: forward PPG averages over PLAYED games in the window
 * (a candidate with zero forward games is dropped, equally across every
 * strategy, so injury noise doesn't favor one), and the efficiency
 * baseline is computed strictly from weeks <= W (leak-free), unlike the
 * live tool's full-season baseline.
 */

const SEASONS = [2022, 2023, 2024, 2025];
const CUTOFF_WEEKS = [5, 6, 7, 8, 9, 10, 11, 12, 13];
const FORWARD_WINDOW = 4;
const CANDIDATES_PER_POSITION = 6;
const MAX_WEEK = 18;

export type WaiverStrategyId = "gap" | "residual" | "volumeOnly" | "pointsOnly" | "blindPool";

export const WAIVER_STRATEGY_IDS: WaiverStrategyId[] = ["gap", "residual", "volumeOnly", "pointsOnly", "blindPool"];

interface Accumulator {
  totalForwardPpg: number;
  count: number;
}

function emptyAcc(): Accumulator {
  return { totalForwardPpg: 0, count: 0 };
}

function mean(acc: Accumulator): number {
  return acc.count > 0 ? acc.totalForwardPpg / acc.count : 0;
}

/** Per-strategy accumulators for one pool variant (full vs. waiver-tier). */
interface Variant {
  pooled: Map<WaiverStrategyId, Accumulator>;
  byPosition: Map<WaiverStrategyId, Record<SkillPosition, Accumulator>>;
  bySeason: Map<WaiverStrategyId, Map<number, Accumulator>>;
}

function newVariant(seasons: number[]): Variant {
  const pooled = new Map<WaiverStrategyId, Accumulator>();
  const byPosition = new Map<WaiverStrategyId, Record<SkillPosition, Accumulator>>();
  const bySeason = new Map<WaiverStrategyId, Map<number, Accumulator>>();
  for (const id of WAIVER_STRATEGY_IDS) {
    pooled.set(id, emptyAcc());
    byPosition.set(id, { QB: emptyAcc(), RB: emptyAcc(), WR: emptyAcc(), TE: emptyAcc() });
    bySeason.set(id, new Map(seasons.map((s) => [s, emptyAcc()])));
  }
  return { pooled, byPosition, bySeason };
}

function accumulate(
  variant: Variant,
  strategy: WaiverStrategyId,
  position: SkillPosition,
  season: number,
  fwd: number
): void {
  const p = variant.pooled.get(strategy)!;
  p.totalForwardPpg += fwd;
  p.count += 1;
  const pos = variant.byPosition.get(strategy)![position];
  pos.totalForwardPpg += fwd;
  pos.count += 1;
  const seas = variant.bySeason.get(strategy)!.get(season)!;
  seas.totalForwardPpg += fwd;
  seas.count += 1;
}

export interface WaiverStrategySummary {
  strategy: WaiverStrategyId;
  /** Mean forward PPG of every surfaced candidate, pooled across all seasons/cutoffs/positions. */
  meanForwardPpg: number;
  /** Number of graded candidate-instances behind meanForwardPpg. */
  n: number;
  byPosition: Record<SkillPosition, { meanForwardPpg: number; n: number }>;
  bySeason: Record<number, { meanForwardPpg: number; n: number }>;
}

function summarize(variant: Variant, seasons: number[]): WaiverStrategySummary[] {
  return WAIVER_STRATEGY_IDS.map((id) => {
    const posRecord = variant.byPosition.get(id)!;
    const seasonMap = variant.bySeason.get(id)!;
    return {
      strategy: id,
      meanForwardPpg: Number(mean(variant.pooled.get(id)!).toFixed(2)),
      n: variant.pooled.get(id)!.count,
      byPosition: Object.fromEntries(
        SKILL_POSITIONS.map((pos) => [
          pos,
          { meanForwardPpg: Number(mean(posRecord[pos]).toFixed(2)), n: posRecord[pos].count },
        ])
      ) as Record<SkillPosition, { meanForwardPpg: number; n: number }>,
      bySeason: Object.fromEntries(
        seasons.map((s) => [
          s,
          { meanForwardPpg: Number(mean(seasonMap.get(s)!).toFixed(2)), n: seasonMap.get(s)!.count },
        ])
      ),
    };
  });
}

export interface WaiverBacktestResult {
  seasons: number[];
  cutoffWeeks: number[];
  forwardWindow: number;
  candidatesPerPosition: number;
  /** Every eligible player (post volume/efficiency floors), studs included. */
  full: WaiverStrategySummary[];
  /**
   * Realistic waiver pool: the startable/rostered tier (top BROAD_MODE_POOL_SIZE
   * by season-to-date points through the cutoff) is excluded, so the
   * baselines can't win just by surfacing studs no one can actually add.
   */
  waiverTier: WaiverStrategySummary[];
}

/** Selects a strategy's top-N from a scored eligible pool for one position. */
function selectForStrategy(
  strategy: WaiverStrategyId,
  pool: WaiverCandidateRank[]
): WaiverCandidateRank[] {
  switch (strategy) {
    case "gap":
    case "residual":
      return selectWaiverCandidates(pool, strategy, CANDIDATES_PER_POSITION);
    case "volumeOnly":
      return [...pool].sort((a, b) => b.recentVolumeAvg - a.recentVolumeAvg).slice(0, CANDIDATES_PER_POSITION);
    case "pointsOnly":
      return [...pool].sort((a, b) => b.recentPprAvg - a.recentPprAvg).slice(0, CANDIDATES_PER_POSITION);
    case "blindPool":
      // The null floor: the whole eligible pool, not a top-N — "what does a
      // random eligible waiver candidate produce going forward."
      return pool;
  }
}

export async function runWaiverBacktest(
  format: ScoringFormat = "ppr",
  seasons: number[] = SEASONS
): Promise<WaiverBacktestResult> {
  const full = newVariant(seasons);
  const waiverTier = newVariant(seasons);

  // Load seasons sequentially, not concurrently — the same peak-memory
  // discipline the other multi-season nflverse backtests use.
  for (const season of seasons) {
    const { allWeeklyRows, players } = await getNflverseGameLog(season, MAX_WEEK);
    const positionByPlayerId = new Map(players.map((p) => [p.PlayerID, p.Position as SkillPosition]));

    // Forward-production lookup: player -> week -> that week's played row.
    const rowByPlayerWeek = new Map<number, Map<number, PlayerGameStat>>();
    for (const week of allWeeklyRows) {
      for (const row of week) {
        if (row.Played !== 1) continue;
        let byWeek = rowByPlayerWeek.get(row.PlayerID);
        if (!byWeek) {
          byWeek = new Map();
          rowByPlayerWeek.set(row.PlayerID, byWeek);
        }
        byWeek.set(row.Week, row);
      }
    }

    const forwardPpg = (playerId: number, cutoff: number): number | null => {
      const byWeek = rowByPlayerWeek.get(playerId);
      if (!byWeek) return null;
      let total = 0;
      let games = 0;
      for (let w = cutoff + 1; w <= cutoff + FORWARD_WINDOW; w++) {
        const row = byWeek.get(w);
        if (!row) continue;
        total += getFantasyPoints(row, format);
        games++;
      }
      return games > 0 ? total / games : null;
    };

    for (const cutoff of CUTOFF_WEEKS) {
      if (cutoff + FORWARD_WINDOW > MAX_WEEK && cutoff >= MAX_WEEK) continue;

      // In-season recent window: the last RECENT_WEEK_COUNT calendar weeks
      // up to the cutoff, played games only — mirrors the live tool's
      // in-season behavior (getRecentWindow with no per-player limit).
      const windowStart = Math.max(1, cutoff - RECENT_WEEK_COUNT + 1);
      const recentGamesByPlayer = new Map<number, PlayerGameStat[]>();
      for (let w = windowStart; w <= cutoff; w++) {
        for (const row of allWeeklyRows[w - 1] ?? []) {
          if (row.Played !== 1) continue;
          const list = recentGamesByPlayer.get(row.PlayerID);
          if (list) list.push(row);
          else recentGamesByPlayer.set(row.PlayerID, [row]);
        }
      }
      for (const list of recentGamesByPlayer.values()) list.sort((a, b) => a.Week - b.Week);

      const rowsThroughCutoff = allWeeklyRows.slice(0, cutoff).flat();
      // Leak-free efficiency baseline: every game row strictly through the
      // cutoff week (not the full season the live tool uses).
      const efficiencyBaseline = computeEfficiencyBaseline(rowsThroughCutoff);

      // The startable/rostered tier to exclude for the waiver-pool variant:
      // top BROAD_MODE_POOL_SIZE per position by season-to-date points
      // through the cutoff — the players who'd already be rostered, so the
      // baselines can't win by "picking studs off waivers."
      const seasonPointsByPlayer = new Map<number, number>();
      for (const row of rowsThroughCutoff) {
        if (row.Played !== 1) continue;
        seasonPointsByPlayer.set(
          row.PlayerID,
          (seasonPointsByPlayer.get(row.PlayerID) ?? 0) + getFantasyPoints(row, format)
        );
      }
      const startableExclude = new Set<number>();
      for (const position of SKILL_POSITIONS) {
        const ranked = [...seasonPointsByPlayer.entries()]
          .filter(([id]) => positionByPlayerId.get(id) === position)
          .sort((a, b) => b[1] - a[1])
          .slice(0, BROAD_MODE_POOL_SIZE[position]);
        for (const [id] of ranked) startableExclude.add(id);
      }

      const fullPool = scoreWaiverPool(players, recentGamesByPlayer, efficiencyBaseline, new Set(), format);
      const waiverPool = scoreWaiverPool(players, recentGamesByPlayer, efficiencyBaseline, startableExclude, format);

      for (const [variant, pool] of [
        [full, fullPool],
        [waiverTier, waiverPool],
      ] as const) {
        for (const strategy of WAIVER_STRATEGY_IDS) {
          for (const position of SKILL_POSITIONS) {
            for (const candidate of selectForStrategy(strategy, pool[position])) {
              const fwd = forwardPpg(candidate.playerId, cutoff);
              if (fwd == null) continue;
              accumulate(variant, strategy, position, season, fwd);
            }
          }
        }
      }
    }
  }

  return {
    seasons,
    cutoffWeeks: CUTOFF_WEEKS,
    forwardWindow: FORWARD_WINDOW,
    candidatesPerPosition: CANDIDATES_PER_POSITION,
    full: summarize(full, seasons),
    waiverTier: summarize(waiverTier, seasons),
  };
}
