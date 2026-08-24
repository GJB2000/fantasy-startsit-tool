import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { RECENT_WEEK_COUNT, REPLACEMENT_PER_GAME } from "@/lib/recommendation/config";
import { scorePlayer } from "@/lib/recommendation/engine";
import { isSkillPosition, type Player, type ScoringFormat, type SkillPosition } from "@/lib/sportsdata/types";
import { type BacktestOutcome, type BacktestSummary, summarizeOutcomes } from "./grading";
import type { BacktestRunData } from "./loadRun";
import { loadNflverseOnlyRunData } from "./loadRunNflverseOnly";
import { buildRankedPoolForWeek } from "./pairing";
import { actualRestOfSeasonTotal, buildOpponentsByTeamWeek, projectFromHistory } from "./tradeBacktest";
import type { BacktestWeekSlice } from "./weekData";
import { sliceWeekData } from "./weekData";

/**
 * Multi-player trade backtest (Open Item #5) — extends the 1-for-1 trade
 * backtest (tradeBacktest.ts) to the two canonical multi-player shapes,
 * 2-for-1 (consolidation) and 2-for-2 (balanced swap), CROSS-POSITION,
 * mirroring how the live Trade Analyzer is actually used (any players on
 * either side, values summed).
 *
 * Grading is the direct generalization of the 1-for-1 case: a side's value
 * is the SUM of its players' rest-of-season projections (or actuals), and
 * the predicted-winner side is graded against the side that actually scored
 * more over the real remaining games. No new leakage: projection uses the
 * same finalScore-minus-matchup re-projection the live tool uses, and the
 * only hindsight is on participation (Played===1 pool eligibility, inherited
 * from buildRankedPoolForWeek).
 *
 * The genuine design problem here is CONSTRUCTION — generating realistic,
 * value-balanced synthetic trades. An unbalanced synthetic trade (a star
 * for two scrubs) would just re-measure "can we tell a good player from a
 * bad one," which is trivial. So sides are balanced by SEASON-TO-DATE value
 * (the same neutral basis adjacent-rank pairing uses — deliberately NOT the
 * projection being graded, which would leak).
 *
 * CRITICAL CAVEAT, surfaced by this backtest (see CLAUDE.md item 90): for
 * UNEVEN-count trades (2-for-1), summed-total grading is confounded by the
 * count asymmetry — the side with more players tends to accumulate more
 * total points regardless of quality. So every result also reports a naive
 * "pick the side with more players" baseline (naiveMorePlayers), which the
 * engine barely beats on 2-for-1; the even-count 2-for-2 result (where that
 * confound cancels) is the clean measure of projection skill.
 */

type TradeShape = "2for1" | "2for2";

const SKILL_POSITIONS: SkillPosition[] = ["QB", "RB", "WR", "TE"];

/**
 * A 2-for-1's two-player side must sum to within this fraction of the
 * single anchor's season-to-date average, or the trade is dropped as too
 * unbalanced to be realistic. A test-set construction knob (like the
 * adjacent-rank pairing methodology itself), NOT a tuned engine weight —
 * it shapes which synthetic trades exist, not how any player is scored.
 */
const BALANCE_TOLERANCE = 0.2;

interface PooledEntry {
  playerId: number;
  position: SkillPosition;
  avg: number;
}

interface SyntheticTrade {
  shape: TradeShape;
  sideA: number[];
  sideB: number[];
}

/**
 * One cross-position ranking of every startable skill player by
 * season-to-date average (through the prior week), pooling the four
 * per-position pools buildRankedPoolForWeek already produces. Points are
 * directly comparable across positions, so a single value ranking is
 * well-defined; the known caveat is that raw points don't capture
 * positional replacement value (QBs score more per game), so the pooled
 * ranking skews high-scoring positions toward the top — acceptable here,
 * since this is a PREDICTION backtest (which side scores more), not a
 * trade-fairness one.
 */
function buildPooledRanking(weekSlice: BacktestWeekSlice, format: ScoringFormat): PooledEntry[] {
  const entries: PooledEntry[] = [];
  for (const position of SKILL_POSITIONS) {
    for (const entry of buildRankedPoolForWeek(weekSlice, position, format)) {
      entries.push({ playerId: entry.playerId, position, avg: entry.avgPoints });
    }
  }
  return entries.sort((a, b) => b.avg - a.avg);
}

/**
 * Balanced swaps: non-overlapping groups of four adjacent players in the
 * value ranking, split {rank1, rank4} vs {rank2, rank3}. This is the exact
 * generalization of adjacent-rank pairing (a 1-for-1 is {rank1} vs
 * {rank2}) — the outer-vs-inner split makes the two sides' combined value
 * near-identical for free, so every trade is genuinely close.
 */
function build2for2Trades(ranked: PooledEntry[]): SyntheticTrade[] {
  const trades: SyntheticTrade[] = [];
  for (let i = 0; i + 3 < ranked.length; i += 4) {
    trades.push({
      shape: "2for2",
      sideA: [ranked[i].playerId, ranked[i + 3].playerId],
      sideB: [ranked[i + 1].playerId, ranked[i + 2].playerId],
    });
  }
  return trades;
}

/**
 * Consolidation: one higher-valued anchor for two lower-valued players
 * whose combined season-to-date value is closest to the anchor's. Walks
 * anchors top-down and consumes players, so trades are non-overlapping
 * (independent observations, same discipline as the non-overlapping
 * adjacent pairs in buildPairsForWeek). A trade is only emitted if the best
 * available two-player bundle lands within BALANCE_TOLERANCE of the anchor.
 */
function build2for1Trades(ranked: PooledEntry[]): SyntheticTrade[] {
  const used = new Set<number>();
  const trades: SyntheticTrade[] = [];

  for (let i = 0; i < ranked.length; i++) {
    if (used.has(i)) continue;
    const anchorVal = ranked[i].avg;

    let bestJ = -1;
    let bestK = -1;
    let bestDiff = Infinity;
    for (let j = i + 1; j < ranked.length; j++) {
      if (used.has(j)) continue;
      for (let k = j + 1; k < ranked.length; k++) {
        if (used.has(k)) continue;
        const diff = Math.abs(anchorVal - (ranked[j].avg + ranked[k].avg));
        if (diff < bestDiff) {
          bestDiff = diff;
          bestJ = j;
          bestK = k;
        }
      }
    }

    if (bestJ !== -1 && bestDiff <= BALANCE_TOLERANCE * anchorVal) {
      used.add(i);
      used.add(bestJ);
      used.add(bestK);
      trades.push({
        shape: "2for1",
        sideA: [ranked[i].playerId],
        sideB: [ranked[bestJ].playerId, ranked[bestK].playerId],
      });
    }
  }

  return trades;
}

function projectPlayer(
  playerId: number,
  anyPlayerById: Map<number, Player>,
  targetWeek: number,
  weekSlice: BacktestWeekSlice,
  runData: BacktestRunData,
  opponentsByTeamWeek: Map<string, string[]>,
  format: ScoringFormat
): number | null {
  const input = buildBacktestComparisonInput(
    playerId,
    anyPlayerById.get(playerId) ?? null,
    targetWeek,
    weekSlice,
    runData.byesByTeam
  );
  const breakdown = scorePlayer(input, format);
  return projectFromHistory(breakdown, opponentsByTeamWeek, weekSlice.positionDefenseTable, runData.seasonProjections);
}

interface TradeOutcomes {
  engine: BacktestOutcome;
  /** Naive "pick the side with more players" — no_pick on even-count trades (2-for-2), where it's a tie. The count-confound baseline for 2-for-1. */
  naiveMorePlayers: BacktestOutcome;
}

function gradeTrade(
  trade: SyntheticTrade,
  anyPlayerById: Map<number, Player>,
  targetWeek: number,
  weekSlice: BacktestWeekSlice,
  runData: BacktestRunData,
  opponentsByTeamWeek: Map<string, string[]>,
  format: ScoringFormat
): TradeOutcomes {
  const project = (id: number) =>
    projectPlayer(id, anyPlayerById, targetWeek, weekSlice, runData, opponentsByTeamWeek, format);
  const actualOf = (id: number) => actualRestOfSeasonTotal(id, runData.allWeeklyRows, targetWeek, format);

  const sumActualA = trade.sideA.reduce((s, id) => s + actualOf(id), 0);
  const sumActualB = trade.sideB.reduce((s, id) => s + actualOf(id), 0);

  // Uneven-trade normalization (item 19): the shorter side frees the extra
  // roster spot(s), credited at replacement level — applied to BOTH the
  // ground-truth actual sums AND the engine's projected sums, so the count
  // confound is removed from what's being graded (see evaluateTrade.ts). The
  // extras are the (diff) lowest-actual-value players on the longer side; the
  // filler uses their positions × the remaining weeks. Even-count (2-for-2)
  // trades get zero filler, so their grading is byte-identical to before.
  const remainingWeeks = runData.allWeeklyRows.length - targetWeek + 1;
  const replacementOf = (id: number) => {
    const pos = anyPlayerById.get(id)?.Position;
    return pos && isSkillPosition(pos) ? REPLACEMENT_PER_GAME[format][pos] * remainingWeeks : 0;
  };
  let fillerA = 0;
  let fillerB = 0;
  if (trade.sideA.length > trade.sideB.length) {
    const diff = trade.sideA.length - trade.sideB.length;
    fillerB = [...trade.sideA]
      .sort((a, b) => actualOf(a) - actualOf(b))
      .slice(0, diff)
      .reduce((s, id) => s + replacementOf(id), 0);
  } else if (trade.sideB.length > trade.sideA.length) {
    const diff = trade.sideB.length - trade.sideA.length;
    fillerA = [...trade.sideB]
      .sort((a, b) => actualOf(a) - actualOf(b))
      .slice(0, diff)
      .reduce((s, id) => s + replacementOf(id), 0);
  }

  const adjActualA = sumActualA + fillerA;
  const adjActualB = sumActualB + fillerB;
  const actualTie = adjActualA === adjActualB;
  const actualAWins = adjActualA > adjActualB;

  // Naive baseline: pick whichever side has more players (a tie on even
  // counts). Graded against the SAME replacement-normalized ground truth, so
  // it no longer wins by default on 2-for-1s just because more bodies
  // accumulate more raw total — the whole point of the normalization.
  let naiveMorePlayers: BacktestOutcome;
  if (trade.sideA.length === trade.sideB.length) {
    naiveMorePlayers = "no_pick";
  } else if (actualTie) {
    naiveMorePlayers = "push";
  } else {
    const predictAWins = trade.sideA.length > trade.sideB.length;
    naiveMorePlayers = predictAWins === actualAWins ? "correct" : "incorrect";
  }

  const projA = trade.sideA.map(project);
  const projB = trade.sideB.map(project);
  let engine: BacktestOutcome;
  if (projA.some((p) => p == null) || projB.some((p) => p == null)) {
    engine = "no_pick";
  } else {
    const sumProjA = projA.reduce((s: number, p) => s + p!, 0) + fillerA;
    const sumProjB = projB.reduce((s: number, p) => s + p!, 0) + fillerB;
    if (sumProjA === sumProjB) engine = "no_pick";
    else if (actualTie) engine = "push";
    else engine = (sumProjA > sumProjB) === actualAWins ? "correct" : "incorrect";
  }

  return { engine, naiveMorePlayers };
}

interface ShapeOutcomes {
  engine: BacktestOutcome[];
  naiveMorePlayers: BacktestOutcome[];
}

function emptyShapeOutcomes(): Record<TradeShape, ShapeOutcomes> {
  return {
    "2for1": { engine: [], naiveMorePlayers: [] },
    "2for2": { engine: [], naiveMorePlayers: [] },
  };
}

function collectMultiTradeResultsForSeason(
  runData: BacktestRunData,
  asOfWeeks: number[],
  format: ScoringFormat
): Record<TradeShape, ShapeOutcomes> {
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));
  const byShape = emptyShapeOutcomes();

  for (const asOfWeek of asOfWeeks) {
    const targetWeek = asOfWeek + 1;
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      targetWeek,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek
    );
    const opponentsByTeamWeek = buildOpponentsByTeamWeek(runData.allWeeklyRows, targetWeek);
    const ranked = buildPooledRanking(weekSlice, format);

    const trades = [...build2for1Trades(ranked), ...build2for2Trades(ranked)];
    for (const trade of trades) {
      const outcomes = gradeTrade(trade, anyPlayerById, targetWeek, weekSlice, runData, opponentsByTeamWeek, format);
      byShape[trade.shape].engine.push(outcomes.engine);
      byShape[trade.shape].naiveMorePlayers.push(outcomes.naiveMorePlayers);
    }
  }

  return byShape;
}

export interface MultiTradeShapeSummary {
  engine: BacktestSummary;
  naiveMorePlayers: BacktestSummary;
}

function summarizeShape(outcomes: ShapeOutcomes): MultiTradeShapeSummary {
  return {
    engine: summarizeOutcomes(outcomes.engine),
    naiveMorePlayers: summarizeOutcomes(outcomes.naiveMorePlayers),
  };
}

function summarizeAll(byShape: Record<TradeShape, ShapeOutcomes>): MultiTradeShapeSummary {
  return {
    engine: summarizeOutcomes([...byShape["2for1"].engine, ...byShape["2for2"].engine]),
    naiveMorePlayers: summarizeOutcomes([...byShape["2for1"].naiveMorePlayers, ...byShape["2for2"].naiveMorePlayers]),
  };
}

export interface MultiTradeBacktestResult {
  bySeason: Record<
    number,
    { byShape: Record<TradeShape, MultiTradeShapeSummary>; overall: MultiTradeShapeSummary; tradeCount: number }
  >;
  byShape: Record<TradeShape, MultiTradeShapeSummary>;
  overall: MultiTradeShapeSummary;
  tradeCount: number;
}

/**
 * Pools the multi-player trade backtest across several "as of week" cutoffs
 * and seasons — same structure and rationale as
 * runTradeBacktestMultiSeason (tradeBacktest.ts): every season through the
 * one nflverse-only pipeline, loaded sequentially for peak-memory reasons.
 */
export async function runMultiPlayerTradeBacktestMultiSeason(
  seasons: number[],
  asOfWeeks: number[],
  format: ScoringFormat = "ppr"
): Promise<MultiTradeBacktestResult> {
  const pooled = emptyShapeOutcomes();
  const bySeason: MultiTradeBacktestResult["bySeason"] = {};

  for (const season of seasons) {
    const runData = await loadNflverseOnlyRunData(season, 18);
    const byShape = collectMultiTradeResultsForSeason(runData, asOfWeeks, format);

    for (const shape of ["2for1", "2for2"] as TradeShape[]) {
      pooled[shape].engine.push(...byShape[shape].engine);
      pooled[shape].naiveMorePlayers.push(...byShape[shape].naiveMorePlayers);
    }

    const tradeCount = byShape["2for1"].engine.length + byShape["2for2"].engine.length;
    bySeason[season] = {
      byShape: { "2for1": summarizeShape(byShape["2for1"]), "2for2": summarizeShape(byShape["2for2"]) },
      overall: summarizeAll(byShape),
      tradeCount,
    };
  }

  return {
    bySeason,
    byShape: { "2for1": summarizeShape(pooled["2for1"]), "2for2": summarizeShape(pooled["2for2"]) },
    overall: summarizeAll(pooled),
    tradeCount: pooled["2for1"].engine.length + pooled["2for2"].engine.length,
  };
}
