import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { scorePlayer } from "@/lib/recommendation/engine";
import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { getFantasyPoints, type ScoringFormat, type SkillPosition } from "@/lib/sportsdata/types";
import { loadBacktestRunData } from "./loadRun";
import { buildRankedPoolForWeek } from "./pairing";
import { summarizeProjectionErrors, type ProjectionGradeResult, type ProjectionSummary } from "./projectionGrading";
import { sliceWeekData } from "./weekData";

export interface PlayerProjectionSummary {
  playerId: number;
  displayName: string;
  position: string;
  team: string | null;
  summary: ProjectionSummary;
}

export interface ProjectionBacktestResult {
  /** The engine's own finalScore, graded as a point projection. */
  overall: ProjectionSummary;
  byPosition: Record<string, ProjectionSummary>;
  /** Naive "season-to-date average" projection, graded the identical way, on the identical player-weeks — the baseline the engine's own projection has to beat to be worth trusting as a point estimate, not just a ranking. */
  baselineOverall: ProjectionSummary;
  baselineByPosition: Record<string, ProjectionSummary>;
  /** Same engine-projection error, broken out per player rather than pooled — sorted worst (highest MAE) first, so the players the model struggles most with are the first thing visible, not buried in a position-level average. */
  byPlayer: PlayerProjectionSummary[];
}

/**
 * How good is the engine's finalScore as an actual POINT PROJECTION,
 * not just a ranking signal? Every other backtest in this app grades
 * pairwise pick accuracy (did we recommend the higher scorer) — this is
 * a genuinely different, magnitude-sensitive question that pick
 * accuracy can't answer: a model can correctly rank two players while
 * being off by 10 points on both, and pairwise grading would never
 * notice. Deliberately scoped simple for a first pass, per direct
 * request: 2025 season only (the primary, tuned pipeline), one scoring
 * format, skill positions only (QB/RB/WR/TE — D/ST/K excluded for now,
 * see CLAUDE.md Open Items).
 *
 * Reuses the exact same "realistic startable pool" (buildRankedPoolForWeek)
 * broad-mode pick-accuracy grading already established, rather than
 * testing the full player universe — projecting a replacement-level
 * player's points is a noisier, less meaningful test than this app's
 * pick-accuracy backtests would suggest testing on, for the same reason
 * BROAD_MODE_POOL_SIZE exists at all.
 */
export async function runProjectionBacktest(
  season: number,
  apiSeason: string,
  weeks: number[],
  positions: SkillPosition[],
  format: ScoringFormat = "ppr"
): Promise<ProjectionBacktestResult> {
  const maxWeek = Math.max(...weeks);
  const runData = await loadBacktestRunData(season, apiSeason, maxWeek);
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));

  const byPositionResults: Record<string, ProjectionGradeResult[]> = {};
  const byPositionBaseline: Record<string, ProjectionGradeResult[]> = {};
  const allResults: ProjectionGradeResult[] = [];
  const allBaseline: ProjectionGradeResult[] = [];
  const byPlayerResults = new Map<number, ProjectionGradeResult[]>();
  const playerMeta = new Map<number, { displayName: string; position: string; team: string | null }>();

  for (const week of weeks) {
    const weekSlice = sliceWeekData(
      runData.allWeeklyRows,
      week,
      RECENT_WEEK_COUNT,
      runData.allTeamWeeklyRows,
      runData.nflversePlayerWeekTable,
      runData.teamWeatherByTeamWeek,
      runData.depthChartByPlayerIdWeek,
      format
    );

    for (const position of positions) {
      const ranked = buildRankedPoolForWeek(weekSlice, position, format);

      for (const entry of ranked) {
        const weekRow = weekSlice.targetWeekRows.find((r) => r.PlayerID === entry.playerId);
        if (!weekRow) continue; // guaranteed by buildRankedPoolForWeek's own Played===1 filter, but keep the lookup honest
        const actual = getFantasyPoints(weekRow, format);

        const input = buildBacktestComparisonInput(
          entry.playerId,
          anyPlayerById.get(entry.playerId) ?? null,
          week,
          weekSlice,
          runData.byesByTeam
        );
        const breakdown = scorePlayer(input, format);
        if (breakdown.finalScore != null) {
          const graded: ProjectionGradeResult = {
            week,
            playerId: entry.playerId,
            position,
            predicted: breakdown.finalScore,
            actual,
            error: breakdown.finalScore - actual,
          };
          (byPositionResults[position] ??= []).push(graded);
          allResults.push(graded);
          if (!byPlayerResults.has(entry.playerId)) byPlayerResults.set(entry.playerId, []);
          byPlayerResults.get(entry.playerId)!.push(graded);
          playerMeta.set(entry.playerId, { displayName: breakdown.displayName, position, team: breakdown.team });
        }

        const baselineGraded: ProjectionGradeResult = {
          week,
          playerId: entry.playerId,
          position,
          predicted: entry.avgPoints,
          actual,
          error: entry.avgPoints - actual,
        };
        (byPositionBaseline[position] ??= []).push(baselineGraded);
        allBaseline.push(baselineGraded);
      }
    }
  }

  const byPosition: Record<string, ProjectionSummary> = {};
  for (const [position, results] of Object.entries(byPositionResults)) {
    byPosition[position] = summarizeProjectionErrors(results);
  }
  const baselineByPosition: Record<string, ProjectionSummary> = {};
  for (const [position, results] of Object.entries(byPositionBaseline)) {
    baselineByPosition[position] = summarizeProjectionErrors(results);
  }

  const byPlayer: PlayerProjectionSummary[] = [];
  for (const [playerId, results] of byPlayerResults) {
    const meta = playerMeta.get(playerId)!;
    byPlayer.push({
      playerId,
      displayName: meta.displayName,
      position: meta.position,
      team: meta.team,
      summary: summarizeProjectionErrors(results),
    });
  }
  byPlayer.sort((a, b) => (b.summary.mae ?? 0) - (a.summary.mae ?? 0));

  return {
    overall: summarizeProjectionErrors(allResults),
    byPosition,
    baselineOverall: summarizeProjectionErrors(allBaseline),
    baselineByPosition,
    byPlayer,
  };
}
