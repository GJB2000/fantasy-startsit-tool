import { buildComparisonInput } from "@/lib/recommendation/buildInput";
import { REPLACEMENT_PER_GAME } from "@/lib/recommendation/config";
import { scorePlayer } from "@/lib/recommendation/engine";
import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ExtendedPosition, ScoringFormat, SkillPosition } from "@/lib/sportsdata/types";
import type { WaiverCandidateRank } from "./rankCandidates";

export interface WaiverCandidate {
  playerId: number;
  displayName: string;
  /** ExtendedPosition, not SkillPosition — see rankExtendedCandidates.ts for the D/ST and K entries this same shape also carries. */
  position: ExtendedPosition;
  team: string | null;
  recentVolumeAvg: number;
  recentPprAvg: number;
  gamesUsedForRecent: number;
  volumeRank: number;
  pointsRank: number;
  /** Ordinal buy-low signal (pointsRank - volumeRank). Absent for D/ST and K (streaming, no volume/points gap). */
  gapScore?: number;
  /** Points-residual buy-low signal (expected points from volume minus points scored). Absent for D/ST and K. See rankCandidates.ts's WaiverRankStrategy. */
  residualScore?: number;
  /** Production is lagging the volume (residualScore > 0) — the "buy-low" tag. Absent/false for D/ST and K. */
  isBuyLow?: boolean;
  /**
   * Cross-position "best pickup" score: the engine's own projection
   * (finalScore) minus the position's replacement level — value over
   * replacement, the same basis the Top 100 and the trade tool use. Comparable
   * ACROSS positions, so the single "top target" isn't QB-biased (a deep,
   * streamable QB has a high replacement level and thus low value).
   *
   * Deliberately NOT the volume-implied estimate this once used
   * (recentVolumeAvg x POINTS_PER_VOLUME_UNIT). That ignored every other
   * signal the engine has — expert consensus, matchup, efficiency, form — and
   * would surface players the engine itself projects BELOW replacement purely
   * for having touches. It also contradicted the engine's own tuning: PPR RBs
   * carry a volume blend weight of 0 precisely because volume adds nothing
   * there beyond form and consensus. Free to compute, since these candidates
   * already have a real breakdown for the drop comparison.
   *
   * Note this is the SPOTLIGHT's basis only — the per-position lists stay
   * ranked by recent volume, which is what the waiver backtest actually
   * validated (see CLAUDE.md item 142). Absent for D/ST and K.
   */
  waiverValue?: number;
  /** e.g. "WR14" — rank by recent volume. */
  positionLabel: string;
  /** e.g. "WR34" — rank by recent points, at the same position. */
  productionLabel: string;
  reasoning: string[];
  injuryStatus: string | null;
  hasLimitedTeammate: boolean;
  /** Carried through for the drop-candidate trade comparison (see suggestDrop.ts) — reuses the exact same breakdown the Trade Analyzer itself works from. */
  breakdown: PlayerScoreBreakdown;
}

const UNIT_LABEL: Record<SkillPosition, string> = {
  QB: "pass attempts",
  RB: "touches",
  WR: "targets",
  TE: "targets",
};

/**
 * Runs the full, already-validated engine pipeline (buildComparisonInput
 * + scorePlayer — the exact same functions the live Start/Sit and Trade
 * Analyzer tools use) for the handful of candidates rankCandidates.ts
 * already narrowed down to, rather than for the whole active player pool.
 * Prepends the "why now" gap framing this feature is actually built
 * around, then reuses the engine's own already-generated notes (volume,
 * snap share, matchup, injury) verbatim — same "one source of truth for
 * reasoning text" discipline as ComparisonResult/TradeResult, which also
 * render scorePlayer's notes wholesale rather than re-deriving copy.
 */
export async function buildWaiverCandidateDetails(
  ranks: WaiverCandidateRank[],
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  projectedPointsByPlayerId: Map<number, number> = new Map()
): Promise<WaiverCandidate[]> {
  const details = await Promise.all(
    ranks.map(async (rank): Promise<WaiverCandidate | null> => {
      const input = await buildComparisonInput(
        rank.playerId,
        context,
        positionDefenseTable,
        nflversePlayerWeekTable,
        undefined,
        undefined,
        undefined,
        projectedPointsByPlayerId
      );
      const breakdown = scorePlayer(input, format);
      if (breakdown.playerId == null || !breakdown.position) return null;

      // Lead with opportunity (recent volume — the ranking's basis, and the
      // strongest forward signal this app has). The "buy-low" observation is
      // appended only when production is actually lagging that volume, since
      // the ranking no longer requires it (see WaiverRankStrategy).
      const isBuyLow = rank.residualScore > 0;
      const reasoning: string[] = [
        `${rank.position}${rank.volumeRank} by recent volume (${rank.recentVolumeAvg.toFixed(1)} ${UNIT_LABEL[rank.position]}/game) — one of the highest-usage players still available.`,
      ];
      if (isBuyLow) {
        reasoning.push(
          `Only your ${rank.position}${rank.pointsRank} by recent points, so the production hasn't caught up to the workload yet — a buy-low.`
        );
      }
      // Written fresh rather than reusing scorePlayer's own handcuff note
      // (WR-only, and always reads "worth roughly 0.0 extra points" since
      // TEAMMATE_OUT_BUMP_WEIGHT_WR is currently zeroed — see CLAUDE.md
      // item 35) — this is a plain roster-context observation, not a
      // restatement of an inert scoring modifier.
      if (input.hasLimitedTeammate) {
        reasoning.push(
          "A same-position teammate is currently listed Out/Doubtful, which may be opening up extra opportunity."
        );
      }
      // Drop scorePlayer's own handcuff note here specifically — it says
      // the same thing as the line just above, but always reads "worth
      // roughly 0.0 extra points" (TEAMMATE_OUT_BUMP_WEIGHT_WR is
      // currently zeroed, CLAUDE.md item 35), which reads as a
      // contradiction sitting directly under this feature's own line
      // about the same fact. Every other note is reused verbatim.
      reasoning.push(...breakdown.notes.filter((note) => !note.startsWith("A same-position teammate is listed")));

      return {
        playerId: breakdown.playerId,
        displayName: breakdown.displayName,
        position: rank.position,
        team: breakdown.team,
        recentVolumeAvg: rank.recentVolumeAvg,
        recentPprAvg: rank.recentPprAvg,
        gamesUsedForRecent: rank.gamesUsedForRecent,
        volumeRank: rank.volumeRank,
        pointsRank: rank.pointsRank,
        gapScore: rank.gapScore,
        residualScore: rank.residualScore,
        isBuyLow,
        waiverValue:
          breakdown.finalScore != null
            ? breakdown.finalScore - REPLACEMENT_PER_GAME[format][rank.position]
            : undefined,
        positionLabel: `${rank.position}${rank.volumeRank}`,
        productionLabel: `${rank.position}${rank.pointsRank}`,
        reasoning,
        injuryStatus: breakdown.injuryStatus,
        hasLimitedTeammate: input.hasLimitedTeammate,
        breakdown,
      };
    })
  );

  return details.filter((d): d is WaiverCandidate => d != null);
}
