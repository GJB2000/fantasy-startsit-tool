import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { scorePlayer } from "@/lib/recommendation/engine";
import { RECENT_WEEK_COUNT } from "@/lib/recommendation/config";
import { getPriorSeasonPprAveragesByNormalizedName } from "@/lib/nflverse/priorSeasonAverage";
import { getFantasyPoints, type ScoringFormat } from "@/lib/sportsdata/types";
import { loadBacktestRunData } from "./loadRun";
import { summarizeProjectionErrors, type ProjectionSummary } from "./projectionGrading";
import { sliceWeekData } from "./weekData";

export interface PlayerWeekProjection {
  week: number;
  predicted: number | null;
  actual: number | null;
  /** predicted - actual; null whenever either side is unavailable (no score yet, bye, didn't play). */
  diff: number | null;
  played: boolean;
}

export interface PlayerProjectionDetail {
  playerId: number;
  displayName: string;
  position: string | null;
  team: string | null;
  weeks: PlayerWeekProjection[];
  /** Computed only over weeks with both a real prediction and a real actual score. */
  summary: ProjectionSummary;
}

/**
 * Week-by-week projected-vs-actual detail for specific, user-searched
 * players — the individual-player counterpart to
 * runProjectionBacktest.ts's pooled position-level aggregate.
 * Deliberately NOT restricted to that function's "realistic startable
 * pool" (BROAD_MODE_POOL_SIZE): a user searching for one player wants
 * that exact player's history, whether or not they'd have ranked
 * inside the pool in every given week. Skill-only for now, same scope
 * limit as the rest of "Projection accuracy" mode (see CLAUDE.md Open
 * Items) — a D/ST or K search degrades gracefully (buildBacktestComparisonInput
 * already returns a "not found" shape for any ID outside allPlayers)
 * rather than crashing, but won't produce a meaningful projection.
 *
 * Unlike runProjectionBacktest.ts's pool (which requires season-to-date
 * data to exist at all, structurally excluding week 1 from ever being
 * pool-eligible), this lookup walks every requested week directly — so
 * week 1 (and any other week where a player genuinely has zero games yet
 * this season) is real, reachable territory here. That's exactly the gap
 * priorSeasonPprAvg (see buildBacktestComparisonInput/engine.ts) fills.
 */
export async function runPlayerProjectionLookup(
  playerIds: number[],
  season: number,
  apiSeason: string,
  weeks: number[],
  format: ScoringFormat = "ppr"
): Promise<PlayerProjectionDetail[]> {
  const maxWeek = Math.max(...weeks);
  const [runData, priorSeasonPprAvgByNormalizedName] = await Promise.all([
    loadBacktestRunData(season, apiSeason, maxWeek),
    getPriorSeasonPprAveragesByNormalizedName(season - 1, format),
  ]);
  const anyPlayerById = new Map(runData.allPlayers.map((p) => [p.PlayerID, p]));

  const weeksByPlayer = new Map<number, PlayerWeekProjection[]>(playerIds.map((id) => [id, []]));
  const metaByPlayer = new Map<number, { displayName: string; position: string | null; team: string | null }>();

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

    for (const playerId of playerIds) {
      const weekRow = weekSlice.targetWeekRows.find((r) => r.PlayerID === playerId && r.Played === 1);
      const actual = weekRow ? getFantasyPoints(weekRow, format) : null;

      const input = buildBacktestComparisonInput(
        playerId,
        anyPlayerById.get(playerId) ?? null,
        week,
        weekSlice,
        runData.byesByTeam,
        priorSeasonPprAvgByNormalizedName
      );
      const breakdown = scorePlayer(input, format);
      // A player who didn't play that week (bye, inactive, etc.) has
      // nothing to project against — scorePlayer() will still compute a
      // finalScore from their recent form regardless, since it has no
      // notion of "there's no game this week," but showing that number
      // next to an "actual" of Bye/DNP reads as a real, gradeable
      // projection when it isn't one. Suppressing it here doesn't change
      // any MAE/RMSE/bias number — those already require both predicted
      // AND actual to be non-null, and actual was already null here.
      const predicted = weekRow ? breakdown.finalScore : null;

      metaByPlayer.set(playerId, {
        displayName: breakdown.displayName,
        position: breakdown.position,
        team: breakdown.team,
      });

      weeksByPlayer.get(playerId)!.push({
        week,
        predicted,
        actual,
        diff: predicted != null && actual != null ? predicted - actual : null,
        played: weekRow != null,
      });
    }
  }

  return playerIds.map((playerId) => {
    const weekRows = weeksByPlayer.get(playerId)!;
    const meta = metaByPlayer.get(playerId)!;
    const gradedForSummary = weekRows
      .filter((w) => w.predicted != null && w.actual != null)
      .map((w) => ({
        week: w.week,
        playerId,
        position: meta.position ?? "",
        predicted: w.predicted!,
        actual: w.actual!,
        error: w.diff!,
      }));

    return {
      playerId,
      displayName: meta.displayName,
      position: meta.position,
      team: meta.team,
      weeks: weekRows,
      summary: summarizeProjectionErrors(gradedForSummary),
    };
  });
}
