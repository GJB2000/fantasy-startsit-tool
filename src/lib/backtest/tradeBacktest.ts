import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { scorePlayer } from "@/lib/recommendation/engine";
import { blendRestOfSeason, sumProjectedPoints, type SeasonProjectionMap } from "@/lib/recommendation/restOfSeason";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getFantasyPoints, type PlayerGameStat, type ScoringFormat, type SkillPosition } from "@/lib/sportsdata/types";
import { type BacktestOutcome, type BacktestSummary, summarizeOutcomes } from "./grading";
import type { BacktestRunData } from "./loadRun";
import { loadNflverseOnlyRunData } from "./loadRunNflverseOnly";
import { buildAllPairsForWeek } from "./pairing";
import { sliceWeekData } from "./weekData";

export interface TradeBacktestPlayerResult {
  playerId: number;
  displayName: string;
  projectedTotal: number | null;
  actualTotal: number | null;
}

export interface TradeGradeResult {
  position: SkillPosition;
  give: TradeBacktestPlayerResult;
  get: TradeBacktestPlayerResult;
  predictedWinnerId: number | null;
  outcome: BacktestOutcome;
}

export interface TradeBacktestResult {
  overall: BacktestSummary;
  byPosition: Record<string, BacktestSummary>;
  results: TradeGradeResult[];
}

/**
 * Team -> week -> opponent, read directly off already-played historical
 * box scores (any row for a team that week reveals its real opponent) —
 * unlike live mode's projectRestOfSeason (restOfSeason.ts), backtest needs
 * no external schedule fetch: every remaining week is already history.
 * Everything here is already in SportsDataIO team codes (both pipelines —
 * see loadRunNflverseOnly.ts's design note that downstream code is
 * written against the shared PlayerGameStat interface, not against
 * SportsDataIO specifically), so unlike the live version, no LAR/LA-style
 * translation is needed.
 */
export function buildOpponentsByTeamWeek(
  allWeeklyRows: PlayerGameStat[][],
  fromWeek: number
): Map<string, string[]> {
  // A week's rows are one-per-PLAYER, not one-per-team — every skill
  // player on a team shares the same real Opponent that week, so this
  // must dedupe to exactly one opponent per (team, week) or a team's
  // remaining-opponent list balloons to ~15-20x too many entries (one per
  // teammate who recorded a stat that week).
  const byTeamWeek = new Map<string, Map<number, string>>();
  for (let week = fromWeek; week <= allWeeklyRows.length; week++) {
    for (const row of allWeeklyRows[week - 1] ?? []) {
      const weekMap = byTeamWeek.get(row.Team) ?? new Map<number, string>();
      weekMap.set(week, row.Opponent);
      byTeamWeek.set(row.Team, weekMap);
    }
  }

  const byTeam = new Map<string, string[]>();
  for (const [team, weekMap] of byTeamWeek) {
    byTeam.set(team, [...weekMap.values()]);
  }
  return byTeam;
}

export function projectFromHistory(
  breakdown: PlayerScoreBreakdown,
  opponentsByTeamWeek: Map<string, string[]>,
  positionDefenseTable: PositionDefenseTable,
  /** Blended in exactly as live mode does — omit for pure extrapolation. */
  seasonProjections: SeasonProjectionMap = new Map()
): number | null {
  const position = breakdown.position;
  if (breakdown.finalScore == null || !breakdown.team || !position) return null;

  const opponents = opponentsByTeamWeek.get(breakdown.team);
  if (!opponents || opponents.length === 0) return null;

  const baseRate = breakdown.finalScore - breakdown.matchupModifier;
  const extrapolated = sumProjectedPoints(baseRate, opponents, position, positionDefenseTable);
  return blendRestOfSeason(
    extrapolated,
    opponents.length,
    breakdown.playerId != null ? seasonProjections.get(breakdown.playerId) : undefined
  );
}

export function actualRestOfSeasonTotal(
  playerId: number,
  allWeeklyRows: PlayerGameStat[][],
  fromWeek: number,
  format: ScoringFormat = "ppr"
): number {
  let total = 0;
  for (let week = fromWeek; week <= allWeeklyRows.length; week++) {
    const row = (allWeeklyRows[week - 1] ?? []).find((r) => r.PlayerID === playerId && r.Played === 1);
    if (row) total += getFantasyPoints(row, format);
  }
  return total;
}

interface TradeSeasonCollection {
  results: TradeGradeResult[];
  byPositionOutcomes: Record<string, BacktestOutcome[]>;
}

/**
 * The per-(asOfWeek, pair) walk shared by runTradeBacktest (single cutoff)
 * and runTradeBacktestMultiSeason (pools many cutoffs and seasons) —
 * extracted so pooling doesn't require a second copy of this loop, same
 * precedent as collectBroadResultsForSeason in runBacktestNflverseOnly.ts.
 * Generates synthetic 1-for-1 "trades" the same way broad mode generates
 * start/sit comparisons — adjacent-rank pairs at a given position, ranked
 * as of each `asOfWeek` (see pairing.ts) — then, for each pair, projects
 * both players' rest-of-season value using the exact same
 * matchup-reprojection logic the live trade analyzer uses
 * (restOfSeason.ts's sumProjectedPoints), and grades the predicted winner
 * against who *actually* scored more, summed, over the real remaining
 * games of that season.
 */
function collectTradeResultsForSeason(
  runData: BacktestRunData,
  asOfWeeks: number[],
  positions: SkillPosition[],
  format: ScoringFormat = "ppr"
): TradeSeasonCollection {
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));
  const results: TradeGradeResult[] = [];
  const byPositionOutcomes: Record<string, BacktestOutcome[]> = {};

  for (const asOfWeek of asOfWeeks) {
    const targetWeek = asOfWeek + 1;
    // Full slice, matching runBroadBacktest. The 7-argument version this
    // replaced silently dropped `format` (so a Half-PPR/Standard run sliced
    // in PPR) and, more importantly, `expertConsensusByPlayerIdWeek` — which
    // meant the trade backtest graded an engine WITHOUT its largest signal
    // while /api/trade runs with it. See CLAUDE.md item 163.
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      targetWeek,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek,
      format,
      runData.allDefenseWeeklyRows,
      runData.impliedTotalsByTeamWeek,
      runData.expertConsensusByPlayerIdWeek
    );
    const opponentsByTeamWeek = buildOpponentsByTeamWeek(runData.allWeeklyRows, targetWeek);
    const pairs = buildAllPairsForWeek(weekSlice, positions, format);

    for (const pair of pairs) {
      const [giveId, getId] = pair.playerIds;
      const breakdowns = pair.playerIds.map((id) => {
        const input = buildBacktestComparisonInput(
          id,
          anyPlayerById.get(id) ?? null,
          targetWeek,
          weekSlice,
          runData.byesByTeam
        );
        return scorePlayer(input, format);
      });

      const projected = breakdowns.map((b) =>
        projectFromHistory(b, opponentsByTeamWeek, weekSlice.positionDefenseTable, runData.seasonProjections)
      );
      const actual = pair.playerIds.map((id) => actualRestOfSeasonTotal(id, runData.allWeeklyRows, targetWeek, format));

      let predictedWinnerId: number | null = null;
      if (projected[0] != null && projected[1] != null && projected[0] !== projected[1]) {
        predictedWinnerId = projected[0] > projected[1] ? giveId : getId;
      }

      let outcome: BacktestOutcome;
      if (predictedWinnerId == null) {
        outcome = "no_pick";
      } else if (actual[0] === actual[1]) {
        outcome = "push";
      } else {
        const actualWinnerId = actual[0] > actual[1] ? giveId : getId;
        outcome = predictedWinnerId === actualWinnerId ? "correct" : "incorrect";
      }

      results.push({
        // CandidatePair.position is ExtendedPosition (pairing.ts also
        // produces "DST"/"K" pairs for the broad-mode backtest), but
        // buildAllPairsForWeek above was only ever called with
        // SkillPosition[], so its output is guaranteed to be one too —
        // the trade backtest doesn't support D/ST/K (see CLAUDE.md's
        // D/ST & K backtest item).
        position: pair.position as SkillPosition,
        give: { playerId: giveId, displayName: breakdowns[0].displayName, projectedTotal: projected[0], actualTotal: actual[0] },
        get: { playerId: getId, displayName: breakdowns[1].displayName, projectedTotal: projected[1], actualTotal: actual[1] },
        predictedWinnerId,
        outcome,
      });

      (byPositionOutcomes[pair.position] ??= []).push(outcome);
    }
  }

  return { results, byPositionOutcomes };
}

function summarizeByPosition(byPositionOutcomes: Record<string, BacktestOutcome[]>): Record<string, BacktestSummary> {
  const byPosition: Record<string, BacktestSummary> = {};
  for (const [position, outcomes] of Object.entries(byPositionOutcomes)) {
    byPosition[position] = summarizeOutcomes(outcomes);
  }
  return byPosition;
}

/** Single season, single "as of week" cutoff — see collectTradeResultsForSeason for the underlying methodology. Deliberately scoped to 1-for-1 trades only, and no naive-baseline/confidence-breakdown comparisons yet — see CLAUDE.md. */
export function runTradeBacktest(
  runData: BacktestRunData,
  asOfWeek: number,
  positions: SkillPosition[],
  format: ScoringFormat = "ppr"
): TradeBacktestResult {
  const { results, byPositionOutcomes } = collectTradeResultsForSeason(runData, [asOfWeek], positions, format);
  return {
    overall: summarizeOutcomes(results.map((r) => r.outcome)),
    byPosition: summarizeByPosition(byPositionOutcomes),
    results,
  };
}

export interface TradeBacktestMultiSeasonResult {
  bySeason: Record<number, { overall: BacktestSummary; byPosition: Record<string, BacktestSummary>; tradeCount: number }>;
  byPosition: Record<string, BacktestSummary>;
  overall: BacktestSummary;
  tradeCount: number;
}

/**
 * Pools the trade backtest across several "as of week" cutoffs AND several
 * seasons into one combined sample — the single-cutoff/single-season
 * version (36 trades in the first check) is too thin to draw much
 * confidence from on its own. Runs every requested season through the
 * SAME nflverse-only pipeline (including 2025, even though SportsDataIO
 * is the live tool's actual source) so every pooled season is scored by
 * identical plumbing — same deliberate precedent as
 * runBroadBacktestNflverseOnlyMultiSeason, which found the two pipelines
 * agree within ~0.15pp on 2025 in aggregate.
 *
 * Seasons load sequentially, not concurrently, for the same peak-memory
 * reason runBroadBacktestNflverseOnlyMultiSeason does.
 */
export async function runTradeBacktestMultiSeason(
  seasons: number[],
  asOfWeeks: number[],
  positions: SkillPosition[],
  format: ScoringFormat = "ppr"
): Promise<TradeBacktestMultiSeasonResult> {
  const pooledResults: TradeGradeResult[] = [];
  const pooledByPositionOutcomes: Record<string, BacktestOutcome[]> = {};
  const bySeason: TradeBacktestMultiSeasonResult["bySeason"] = {};

  for (const season of seasons) {
    const runData = await loadNflverseOnlyRunData(season, 18);
    const { results, byPositionOutcomes } = collectTradeResultsForSeason(runData, asOfWeeks, positions, format);

    pooledResults.push(...results);
    for (const [position, outcomes] of Object.entries(byPositionOutcomes)) {
      (pooledByPositionOutcomes[position] ??= []).push(...outcomes);
    }

    bySeason[season] = {
      overall: summarizeOutcomes(results.map((r) => r.outcome)),
      byPosition: summarizeByPosition(byPositionOutcomes),
      tradeCount: results.length,
    };
  }

  return {
    bySeason,
    byPosition: summarizeByPosition(pooledByPositionOutcomes),
    overall: summarizeOutcomes(pooledResults.map((r) => r.outcome)),
    tradeCount: pooledResults.length,
  };
}
