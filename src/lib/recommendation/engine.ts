import {
  CLOSE_CALL_ABS_POINTS,
  CLOSE_CALL_RELATIVE_PCT,
  DEPTH_STARTER_CONFIDENCE,
  DROP_RATE_BLEND_WEIGHT,
  ENSEMBLE_VOLUME_BLEND_RATIO,
  AIR_YARDS_SHARE_BLEND_WEIGHT,
  POINTS_PER_AIR_YARDS_SHARE_UNIT_WR,
  EXPERT_CONSENSUS_BLEND_WEIGHT,
  FINAL_SCORE_DEVIATION_CAP,
  GAP_CONFIDENCE_CURVE,
  MATCHUP_MODIFIER_CAP,
  MATCHUP_MODIFIER_SCALE,
  POINTS_PER_DROP_RATE_UNIT,
  POINTS_PER_QB_GOAL_LINE_RUSH,
  POINTS_PER_QB_RUSH_ATTEMPT,
  POINTS_PER_QB_RUSH_EPA,
  POINTS_PER_REDZONE_TOUCH_RB,
  POINTS_PER_SNAP_SHARE_UNIT_TE,
  POINTS_PER_SUCCESS_RATE_UNIT_QB,
  POINTS_PER_TEAMMATE_OUT_BUMP_WR,
  POINTS_PER_VOLUME_UNIT,
  QB_GOAL_LINE_BLEND_WEIGHT,
  QB_RUSH_BLEND_WEIGHT,
  QB_RUSH_EPA_BLEND_WEIGHT,
  QB_RUSH_MIN_ATTEMPTS_THRESHOLD,
  QB_SUCCESS_RATE_BLEND_WEIGHT,
  RB_EPA_BLEND_WEIGHT,
  RB_EPA_PPR_AT_ZERO,
  RB_EPA_REGRESSION_SLOPE,
  RECENT_WEEK_COUNT,
  RECENT_WEIGHT_BASE,
  RECENT_WEIGHT_MAX,
  RECENT_WEIGHT_PER_GAME,
  REDZONE_BLEND_WEIGHT_RB,
  SEASON_GAP_GUARDRAIL_ABS,
  SEASON_GAP_GUARDRAIL_RATIO,
  SNAP_SHARE_BLEND_WEIGHT_TE,
  TEAMMATE_OUT_BUMP_WEIGHT_WR,
  VOLUME_BLEND_WEIGHT,
} from "./config";
import type {
  ComparisonResult,
  DataQuality,
  PlayerComparisonInput,
  PlayerScoreBreakdown,
} from "./types";
import { getQbRushAttemptStat, getVolumeStat } from "./volume";
import type { MatchupContext } from "@/lib/sportsdata/positionDefense";
import { getFantasyPoints, type ScoringFormat } from "@/lib/sportsdata/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Maps a points gap between the pick and the field to a calibrated
 * confidence (real historical pick accuracy %) — piecewise-linear over
 * GAP_CONFIDENCE_CURVE, clamped at both ends. See the curve's doc comment.
 */
function confidenceFromGap(gap: number): number {
  const curve = GAP_CONFIDENCE_CURVE;
  const g = Math.abs(gap);
  if (g <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (g >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    if (g <= curve[i][0]) {
      const [g0, a0] = curve[i - 1];
      const [g1, a1] = curve[i];
      return Math.round(a0 + ((a1 - a0) * (g - g0)) / (g1 - g0));
    }
  }
  return last[1];
}

/**
 * Pure matchup-modifier formula, extracted so it can be reused against a
 * *future* opponent (rest-of-season trade projection, see
 * lib/recommendation/restOfSeason.ts) as well as the "last completed
 * opponent" case scorePlayer() uses below — the formula itself doesn't
 * care which game the MatchupContext came from.
 */
export function computeMatchupModifier(matchupContext: MatchupContext | null): number {
  if (!matchupContext) return 0;
  const { leagueAverage, diffFromAverage } = matchupContext;
  const diffRatio = leagueAverage !== 0 ? diffFromAverage / leagueAverage : 0;
  return clamp(diffRatio * MATCHUP_MODIFIER_SCALE, -MATCHUP_MODIFIER_CAP, MATCHUP_MODIFIER_CAP);
}

export function scorePlayer(input: PlayerComparisonInput, format: ScoringFormat): PlayerScoreBreakdown {
  const notes: string[] = [];
  const displayName = input.player
    ? `${input.player.FirstName} ${input.player.LastName}`
    : (input.playerLabel ?? "Selected player");
  const position = input.player?.Position ?? null;
  const team = input.player?.Team ?? null;

  const gamesUsedForRecent = input.recentGames.length;
  const recentPprValues = input.recentGames.map((g) => getFantasyPoints(g, format));
  const recentPprAvg = gamesUsedForRecent > 0 ? average(recentPprValues) : null;
  const recentPprFloor = gamesUsedForRecent > 0 ? Math.min(...recentPprValues) : null;
  const recentPprCeiling = gamesUsedForRecent > 0 ? Math.max(...recentPprValues) : null;
  const seasonPprAvg = input.seasonStat
    ? getFantasyPoints(input.seasonStat, format) / Math.max(input.seasonStat.Played, 1)
    : null;

  let blendedScore: number | null = null;
  if (recentPprAvg != null && seasonPprAvg != null) {
    const recentWeight = clamp(
      RECENT_WEIGHT_BASE + RECENT_WEIGHT_PER_GAME * gamesUsedForRecent,
      RECENT_WEIGHT_BASE,
      RECENT_WEIGHT_MAX
    );
    blendedScore = recentWeight * recentPprAvg + (1 - recentWeight) * seasonPprAvg;
  } else if (recentPprAvg != null) {
    blendedScore = recentPprAvg;
    notes.push("No season totals available yet — using recent-game average only.");
  } else if (seasonPprAvg != null) {
    blendedScore = seasonPprAvg;
    notes.push("No games in the recent-form window — using season average only.");
  } else if (input.priorSeasonPprAvg != null) {
    // Last resort: no games at all yet this season (week 1, most
    // commonly, but also a rookie call-up or a player back from a long
    // absence). Every modifier below this point still applies normally —
    // matchup, volume, etc. — this only substitutes for the recent/season
    // blend itself, which otherwise has nothing to work with.
    blendedScore = input.priorSeasonPprAvg;
    notes.push("No games played yet this season — using last season's per-game average as a starting point.");
  }

  if (gamesUsedForRecent > 0 && gamesUsedForRecent < RECENT_WEEK_COUNT) {
    notes.push(
      `Small sample: only ${gamesUsedForRecent} of the last ${RECENT_WEEK_COUNT} weeks available.`
    );
  }

  const matchupModifier = computeMatchupModifier(input.matchupContext);
  if (input.matchupContext) {
    const { diffFromAverage, opponentTeam, rank, teamCount, allowedPerGame, leagueAverage, position: matchupPosition } =
      input.matchupContext;
    const direction = diffFromAverage >= 0 ? "friendlier" : "tougher";
    notes.push(
      `Faces ${opponentTeam}, ranked ${rank} of ${teamCount} in points allowed to ${matchupPosition}s (${allowedPerGame.toFixed(1)}/game vs a ${leagueAverage.toFixed(1)} league average) — a ${direction}-than-average matchup.`
    );
  } else {
    notes.push("No matchup data available for this player's most recent opponent.");
  }

  let volumeModifier = 0;
  let recentVolumeAvg: number | null = null;
  if (blendedScore != null && position && position in POINTS_PER_VOLUME_UNIT[format]) {
    const volumeValues = input.recentGames.map(getVolumeStat).filter((v): v is number => v != null);
    if (volumeValues.length > 0) {
      recentVolumeAvg = average(volumeValues);
      const pointsPerUnit = POINTS_PER_VOLUME_UNIT[format][position as keyof (typeof POINTS_PER_VOLUME_UNIT)[ScoringFormat]];
      const expectedPointsFromVolume = recentVolumeAvg * pointsPerUnit;
      const volumeBlendWeight =
        VOLUME_BLEND_WEIGHT[format][position as keyof (typeof VOLUME_BLEND_WEIGHT)[ScoringFormat]];
      const blendedWithVolume =
        (1 - volumeBlendWeight) * blendedScore + volumeBlendWeight * expectedPointsFromVolume;
      volumeModifier = blendedWithVolume - blendedScore;
      const unitLabel = position === "QB" ? "pass attempts" : position === "RB" ? "touches" : "targets";
      notes.push(
        `Averaging ${recentVolumeAvg.toFixed(1)} ${unitLabel}/game over their last ${volumeValues.length} game${volumeValues.length === 1 ? "" : "s"} — worth roughly ${expectedPointsFromVolume.toFixed(1)} points at this position's typical rate.`
      );
    }
  }

  let redZoneModifier = 0;
  const redZoneTouchesAvg = input.nflverse.redZoneTouches;
  if (blendedScore != null && position === "RB" && redZoneTouchesAvg != null) {
    const runningScore = blendedScore + matchupModifier + volumeModifier;
    const expectedPointsFromRedZone = redZoneTouchesAvg * POINTS_PER_REDZONE_TOUCH_RB;
    const blendedWithRedZone =
      (1 - REDZONE_BLEND_WEIGHT_RB) * runningScore + REDZONE_BLEND_WEIGHT_RB * expectedPointsFromRedZone;
    redZoneModifier = blendedWithRedZone - runningScore;
    notes.push(
      `Averaging ${redZoneTouchesAvg.toFixed(1)} red-zone touches/game recently — worth roughly ${expectedPointsFromRedZone.toFixed(1)} points at this position's typical rate.`
    );
  }

  let snapShareModifier = 0;
  const snapShareAvg = input.nflverse.snapShare;
  if (blendedScore != null && position === "TE" && snapShareAvg != null) {
    const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier;
    const expectedPointsFromSnapShare = snapShareAvg * POINTS_PER_SNAP_SHARE_UNIT_TE[format];
    const snapShareBlendWeight = SNAP_SHARE_BLEND_WEIGHT_TE[format];
    const blendedWithSnapShare =
      (1 - snapShareBlendWeight) * runningScore + snapShareBlendWeight * expectedPointsFromSnapShare;
    snapShareModifier = blendedWithSnapShare - runningScore;
    notes.push(
      `Snap share of ${(snapShareAvg * 100).toFixed(0)}% recently — worth roughly ${expectedPointsFromSnapShare.toFixed(1)} points at this position's typical rate.`
    );
  }

  let qbRushModifier = 0;
  let recentQbRushAttemptsAvg: number | null = null;
  if (blendedScore != null && position === "QB") {
    const rushValues = input.recentGames.map(getQbRushAttemptStat).filter((v): v is number => v != null);
    if (rushValues.length > 0) {
      recentQbRushAttemptsAvg = average(rushValues);
      if (recentQbRushAttemptsAvg >= QB_RUSH_MIN_ATTEMPTS_THRESHOLD) {
        const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier;
        const expectedPointsFromQbRush = recentQbRushAttemptsAvg * POINTS_PER_QB_RUSH_ATTEMPT[format];
        const blendedWithQbRush =
          (1 - QB_RUSH_BLEND_WEIGHT) * runningScore + QB_RUSH_BLEND_WEIGHT * expectedPointsFromQbRush;
        qbRushModifier = blendedWithQbRush - runningScore;
        notes.push(
          `Averaging ${recentQbRushAttemptsAvg.toFixed(1)} rushing attempts/game over their last ${rushValues.length} game${rushValues.length === 1 ? "" : "s"} — worth roughly ${expectedPointsFromQbRush.toFixed(1)} points at this position's typical rate.`
        );
      }
    }
  }

  let qbGoalLineModifier = 0;
  const goalLineTouchesAvg = input.nflverse.goalLineTouches;
  if (blendedScore != null && position === "QB" && goalLineTouchesAvg != null) {
    const runningScore =
      blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier + qbRushModifier;
    const expectedPointsFromGoalLine = goalLineTouchesAvg * POINTS_PER_QB_GOAL_LINE_RUSH;
    const blendedWithGoalLine =
      (1 - QB_GOAL_LINE_BLEND_WEIGHT) * runningScore + QB_GOAL_LINE_BLEND_WEIGHT * expectedPointsFromGoalLine;
    qbGoalLineModifier = blendedWithGoalLine - runningScore;
    notes.push(
      `Averaging ${goalLineTouchesAvg.toFixed(2)} goal-line rush attempts/game recently — worth roughly ${expectedPointsFromGoalLine.toFixed(1)} points at this position's typical rate.`
    );
  }

  let qbSuccessRateModifier = 0;
  const successRateAvg = input.nflverse.successRate;
  if (blendedScore != null && position === "QB" && successRateAvg != null) {
    const runningScore =
      blendedScore +
      matchupModifier +
      volumeModifier +
      redZoneModifier +
      snapShareModifier +
      qbRushModifier +
      qbGoalLineModifier;
    const expectedPointsFromSuccessRate = successRateAvg * POINTS_PER_SUCCESS_RATE_UNIT_QB;
    const blendedWithSuccessRate =
      (1 - QB_SUCCESS_RATE_BLEND_WEIGHT) * runningScore + QB_SUCCESS_RATE_BLEND_WEIGHT * expectedPointsFromSuccessRate;
    qbSuccessRateModifier = blendedWithSuccessRate - runningScore;
    notes.push(
      `Succeeding on ${(successRateAvg * 100).toFixed(0)}% of recent dropbacks (down/distance-adjusted) — worth roughly ${expectedPointsFromSuccessRate.toFixed(1)} points at this position's typical rate.`
    );
  }

  let qbRushEpaModifier = 0;
  const qbRushEpaAvg = input.nflverse.qbRushEpaPerPlay;
  if (blendedScore != null && position === "QB" && qbRushEpaAvg != null) {
    const runningScore =
      blendedScore +
      matchupModifier +
      volumeModifier +
      redZoneModifier +
      snapShareModifier +
      qbRushModifier +
      qbGoalLineModifier +
      qbSuccessRateModifier;
    const expectedPointsFromQbRushEpa = qbRushEpaAvg * POINTS_PER_QB_RUSH_EPA[format];
    const blendedWithQbRushEpa =
      (1 - QB_RUSH_EPA_BLEND_WEIGHT) * runningScore + QB_RUSH_EPA_BLEND_WEIGHT * expectedPointsFromQbRushEpa;
    qbRushEpaModifier = blendedWithQbRushEpa - runningScore;
    notes.push(
      `Averaging ${qbRushEpaAvg.toFixed(2)} EPA per rush attempt recently (as a runner) — worth roughly ${expectedPointsFromQbRushEpa.toFixed(1)} points at this position's typical rate.`
    );
  }

  let rbEpaModifier = 0;
  const epaPerPlayAvg = input.nflverse.epaPerPlay;
  if (blendedScore != null && position === "RB" && epaPerPlayAvg != null) {
    const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier;
    const expectedPointsFromEpa = RB_EPA_PPR_AT_ZERO + epaPerPlayAvg * RB_EPA_REGRESSION_SLOPE;
    const blendedWithEpa = (1 - RB_EPA_BLEND_WEIGHT) * runningScore + RB_EPA_BLEND_WEIGHT * expectedPointsFromEpa;
    rbEpaModifier = blendedWithEpa - runningScore;
    notes.push(
      `Averaging ${epaPerPlayAvg.toFixed(2)} EPA per rush recently — worth roughly ${expectedPointsFromEpa.toFixed(1)} points at this position's typical rate.`
    );
  }

  let dropRateModifier = 0;
  const dropRateAvg = input.nflverse.dropRate;
  if (blendedScore != null && position === "WR" && dropRateAvg != null) {
    const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier;
    const pointsLostFromDrops = dropRateAvg * POINTS_PER_DROP_RATE_UNIT[format];
    const expectedPointsFromDropRate = runningScore - pointsLostFromDrops;
    const blendedWithDropRate =
      (1 - DROP_RATE_BLEND_WEIGHT) * runningScore + DROP_RATE_BLEND_WEIGHT * expectedPointsFromDropRate;
    dropRateModifier = blendedWithDropRate - runningScore;
    notes.push(
      `Dropping ${(dropRateAvg * 100).toFixed(0)}% of recent charted targets — worth roughly ${pointsLostFromDrops.toFixed(1)} fewer points at this position's typical rate.`
    );
  }

  let airYardsModifier = 0;
  const airYardsShare = input.nflverse.airYardsShare;
  if (blendedScore != null && position === "WR" && airYardsShare != null) {
    const runningScore =
      blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier + dropRateModifier;
    const expectedPointsFromAirYards = airYardsShare * POINTS_PER_AIR_YARDS_SHARE_UNIT_WR;
    const blendedWithAirYards =
      (1 - AIR_YARDS_SHARE_BLEND_WEIGHT) * runningScore + AIR_YARDS_SHARE_BLEND_WEIGHT * expectedPointsFromAirYards;
    airYardsModifier = blendedWithAirYards - runningScore;
    notes.push(
      `Commanding ${(airYardsShare * 100).toFixed(0)}% of the team's air yards recently — worth roughly ${expectedPointsFromAirYards.toFixed(1)} points at this position's typical rate.`
    );
  }

  let teammateOutBumpModifier = 0;
  if (blendedScore != null && position === "WR" && input.hasLimitedTeammate) {
    teammateOutBumpModifier = TEAMMATE_OUT_BUMP_WEIGHT_WR * POINTS_PER_TEAMMATE_OUT_BUMP_WR;
    notes.push(
      `A same-position teammate is listed Out/Doubtful — worth roughly ${teammateOutBumpModifier.toFixed(1)} extra points at this position's typical rate.`
    );
  }

  // Blends the running score toward FantasyPros' own weekly consensus
  // point estimate — unlike every modifier above, this signal is already
  // points-denominated (no POINTS_PER_X conversion factor needed) and is
  // deliberately position-agnostic (universal across QB/RB/WR/TE), since
  // the standalone pickByExpertConsensus baseline validated strong at
  // every position (57-60% pooled pick accuracy, 2022-2025) rather than
  // needing the usual per-position scoping — see CLAUDE.md item 69/70.
  // Blends the whole running score toward FantasyPros' consensus estimate
  // at a per-position weight (EXPERT_CONSENSUS_BLEND_WEIGHT). Populated in
  // both backtest AND live mode (the live current-snapshot path was wired
  // in later — see CLAUDE.md's live-consensus item), so this has a real
  // effect on the deployed tools, heaviest for QB (weight 0.8).
  let expertConsensusModifier = 0;
  if (blendedScore != null && input.expertConsensusR2pPts != null) {
    const runningScore =
      blendedScore +
      matchupModifier +
      volumeModifier +
      redZoneModifier +
      snapShareModifier +
      qbRushModifier +
      qbGoalLineModifier +
      qbSuccessRateModifier +
      qbRushEpaModifier +
      rbEpaModifier +
      dropRateModifier +
      airYardsModifier +
      teammateOutBumpModifier;
    const expertConsensusWeight =
      (position != null ? EXPERT_CONSENSUS_BLEND_WEIGHT[position as keyof typeof EXPERT_CONSENSUS_BLEND_WEIGHT] : null) ??
      0.5;
    const blendedWithExpertConsensus =
      (1 - expertConsensusWeight) * runningScore + expertConsensusWeight * input.expertConsensusR2pPts;
    expertConsensusModifier = blendedWithExpertConsensus - runningScore;
    notes.push(
      `FantasyPros' weekly consensus projects roughly ${input.expertConsensusR2pPts.toFixed(1)} points this week — blended in at this position's typical rate.`
    );
  }

  const preEnsembleFinalScore =
    blendedScore == null
      ? null
      : blendedScore +
        matchupModifier +
        volumeModifier +
        redZoneModifier +
        snapShareModifier +
        qbRushModifier +
        qbGoalLineModifier +
        qbSuccessRateModifier +
        qbRushEpaModifier +
        rbEpaModifier +
        dropRateModifier +
        airYardsModifier +
        teammateOutBumpModifier +
        expertConsensusModifier;

  // Final ensemble stage: shrink the fully-computed score toward a pure
  // recent-volume estimate — see ENSEMBLE_VOLUME_BLEND_RATIO's comment
  // in config.ts for why this is structurally different from every
  // modifier above (it dilutes all of them proportionally, not just
  // volume) and the CLAUDE.md item documenting the per-position/format
  // sweep behind these ratios.
  let finalScore = preEnsembleFinalScore;
  if (preEnsembleFinalScore != null && position && position in POINTS_PER_VOLUME_UNIT[format]) {
    const skillPosition = position as keyof (typeof POINTS_PER_VOLUME_UNIT)[ScoringFormat];
    const volumeImpliedScore =
      recentVolumeAvg != null ? recentVolumeAvg * POINTS_PER_VOLUME_UNIT[format][skillPosition] : null;
    if (volumeImpliedScore != null) {
      const ratio = ENSEMBLE_VOLUME_BLEND_RATIO[format][skillPosition];
      finalScore = ratio * preEnsembleFinalScore + (1 - ratio) * volumeImpliedScore;
    }
  }

  // Floor and bound the projection. Skill fantasy points are never
  // negative, and no combination of signals should move the estimate more
  // than FINAL_SCORE_DEVIATION_CAP points from the recent/season-form
  // baseline (blendedScore). A no-op for realistic players (see the
  // constant's doc comment) but it clips a real thin-sample pathology the
  // live tool can otherwise expose (a deep player projecting as low as
  // -37 on a fluky drop rate). Skill-only by construction: D/ST and K use
  // their own scorers (scoreDefense/scoreKicker) and can legitimately go
  // negative.
  if (finalScore != null && blendedScore != null) {
    finalScore = clamp(
      finalScore,
      Math.max(0, blendedScore - FINAL_SCORE_DEVIATION_CAP),
      blendedScore + FINAL_SCORE_DEVIATION_CAP
    );
  }

  const injuryStatus = input.player?.InjuryStatus ?? null;
  if (injuryStatus === "Questionable") {
    notes.push("Listed as Questionable — worth watching, but not an automatic bench.");
  } else if (injuryStatus === "Doubtful" || injuryStatus === "Out") {
    notes.push(`Listed as ${injuryStatus} — significant risk of not playing.`);
  }

  if (input.isOnByeThisWeek) {
    notes.push("On a bye — not available to start.");
  }

  const dataQuality: DataQuality =
    blendedScore == null ? "insufficient" : gamesUsedForRecent < RECENT_WEEK_COUNT ? "limited" : "full";

  return {
    playerId: input.player ? input.player.PlayerID : null,
    displayName,
    position,
    team,
    recentPprAvg,
    recentPprFloor,
    recentPprCeiling,
    seasonPprAvg,
    gamesUsedForRecent,
    blendedScore,
    matchupModifier,
    recentVolumeAvg,
    volumeModifier,
    redZoneTouchesAvg,
    redZoneModifier,
    snapShareAvg,
    snapShareModifier,
    recentQbRushAttemptsAvg,
    qbRushModifier,
    goalLineTouchesAvg,
    qbGoalLineModifier,
    successRateAvg,
    qbSuccessRateModifier,
    epaPerPlayAvg,
    rbEpaModifier,
    dropRateAvg,
    dropRateModifier,
    airYardsShareAvg: airYardsShare,
    airYardsModifier,
    qbRushEpaAvg,
    qbRushEpaModifier,
    teammateOutBumpModifier,
    expertConsensusR2pPts: input.expertConsensusR2pPts,
    expertConsensusModifier,
    targetShare: input.nflverse.targetShare,
    separation: input.nflverse.separation,
    finalScore,
    injuryStatus,
    isOnByeThisWeek: input.isOnByeThisWeek,
    matchupContext: input.matchupContext,
    nextOpponent: input.nextOpponent,
    nextGameWeather: input.nextGameWeather,
    dataQuality,
    notes,
  };
}

function buildReasoning(
  breakdowns: PlayerScoreBreakdown[],
  overrideNotes: string[],
  isCloseCall: boolean,
  wasOverridden: boolean
): string[] {
  const bullets: string[] = [...overrideNotes];

  for (const b of breakdowns) {
    if (b.recentPprAvg != null) {
      const seasonPart =
        b.seasonPprAvg != null ? ` (season average ${b.seasonPprAvg.toFixed(1)})` : "";
      bullets.push(
        `${b.displayName}: averaging ${b.recentPprAvg.toFixed(1)} points over their last ${b.gamesUsedForRecent} game${b.gamesUsedForRecent === 1 ? "" : "s"}${seasonPart}.`
      );
    } else if (b.seasonPprAvg != null) {
      bullets.push(
        `${b.displayName}: no recent games available; averaging ${b.seasonPprAvg.toFixed(1)} points per game this season.`
      );
    }
    for (const note of b.notes) {
      bullets.push(`${b.displayName}: ${note}`);
    }
  }

  if (isCloseCall && !wasOverridden) {
    bullets.push("This one's statistically close — trust your gut on the tiebreaker.");
  }

  return bullets;
}

export function comparePlayers(inputs: PlayerComparisonInput[], format: ScoringFormat): ComparisonResult {
  const breakdowns = inputs.map((input) => scorePlayer(input, format));
  return compareBreakdowns(breakdowns);
}

/**
 * The actual comparison/ranking logic, extracted from comparePlayers so
 * D/ST and K (see scoreDefense.ts/scoreKicker.ts) can reuse the exact
 * same close-call/limited-data/headline logic on their own,
 * differently-computed breakdowns — those positions never go through
 * scorePlayer() at all (no volume/snap-share/etc. concept applies to a
 * team defense or a kicker), but the "rank by finalScore, flag close
 * calls, write a headline" logic underneath is genuinely
 * position-agnostic. The WR-only tiebreaker below stays effectively a
 * no-op for D/ST/K, since their breakdowns always have
 * targetShare/separation null.
 */
export function compareBreakdowns(
  breakdowns: PlayerScoreBreakdown[],
  /** Live-only: playerId -> current depth-chart rank (1=starter). Omitted in backtest, so the depth-chart confidence floor never fires there. */
  depthRankByPlayerId?: Map<number, number>
): ComparisonResult {
  const found = breakdowns.filter((b) => b.playerId !== null);
  const notFoundNames = breakdowns.filter((b) => b.playerId === null).map((b) => b.displayName);

  if (found.length === 0) {
    return {
      players: breakdowns,
      recommendedPlayerId: null,
      isCloseCall: false,
      hasLimitedData: false,
      confidence: null,
      headline: "We couldn't find any of the selected players.",
      reasoning: ["Try searching again — none of the selected players matched current data."],
    };
  }

  const overrideNotes: string[] = [];
  if (notFoundNames.length > 0) {
    overrideNotes.push(
      `${notFoundNames.join(", ")} couldn't be matched to current data and ${notFoundNames.length === 1 ? "was" : "were"} excluded from the comparison.`
    );
  }

  let candidates = found;

  const notOnBye = candidates.filter((b) => !b.isOnByeThisWeek);
  if (notOnBye.length > 0 && notOnBye.length < candidates.length) {
    const byeNames = candidates.filter((b) => b.isOnByeThisWeek).map((b) => b.displayName);
    overrideNotes.push(`${byeNames.join(", ")} ${byeNames.length === 1 ? "is" : "are"} on a bye this week.`);
    candidates = notOnBye;
  }

  const healthy = candidates.filter((b) => b.injuryStatus !== "Out" && b.injuryStatus !== "Doubtful");
  if (healthy.length > 0 && healthy.length < candidates.length) {
    const hurtNames = candidates
      .filter((b) => b.injuryStatus === "Out" || b.injuryStatus === "Doubtful")
      .map((b) => `${b.displayName} (${b.injuryStatus})`);
    overrideNotes.push(`${hurtNames.join(", ")} carries real injury risk this week.`);
    candidates = healthy;
  }

  const ranked = [...candidates].sort((a, b) => {
    if (a.finalScore == null && b.finalScore == null) return 0;
    if (a.finalScore == null) return 1;
    if (b.finalScore == null) return -1;
    return b.finalScore - a.finalScore;
  });

  let winner = ranked[0];
  const wasOverridden = candidates.length < found.length;

  if (winner.finalScore == null) {
    return {
      players: breakdowns,
      recommendedPlayerId: null,
      isCloseCall: false,
      hasLimitedData: false,
      confidence: null,
      headline: "Not enough data to make a confident call here.",
      reasoning: [
        ...overrideNotes,
        "None of the remaining players have enough recent or season data to compare.",
      ],
    };
  }

  // isCloseCall and hasLimitedData used to be one combined flag. Splitting
  // them was a deliberate fix, not a cosmetic one: backtesting showed the
  // two triggers behave completely differently — a genuinely close score
  // gap is a real toss-up (51.1% backtested accuracy), while a
  // data-quality gap (limited/insufficient recent data for either player)
  // is actually *more* reliable than "confident" picks (59.5% vs. 54.2%).
  // Blending them meant "close call" was telling users to hedge on picks
  // that were, historically, some of the more trustworthy ones. See
  // CLAUDE.md "Backtesting & Tuning History" items 21-22 for the full
  // numbers. `anyUncertaintyTrigger` (either condition) still gates the
  // WR tiebreaker below, unchanged from its original validated behavior
  // (item 20) — only the user-facing flag/headline split.
  let isCloseCall = false;
  let hasLimitedData = false;
  let anyUncertaintyTrigger = false;
  if (ranked.length >= 2 && ranked[1].finalScore != null) {
    const gap = Math.abs(winner.finalScore - ranked[1].finalScore);
    const threshold = Math.max(
      CLOSE_CALL_ABS_POINTS,
      CLOSE_CALL_RELATIVE_PCT * Math.max(winner.finalScore, ranked[1].finalScore)
    );
    const gapTriggered = gap <= threshold;
    const dataQualityTriggered = winner.dataQuality !== "full" || ranked[1].dataQuality !== "full";
    isCloseCall = gapTriggered && !dataQualityTriggered;
    hasLimitedData = dataQualityTriggered;
    anyUncertaintyTrigger = gapTriggered || dataQualityTriggered;
  }

  // On a close call between two WRs, defer to target share + separation
  // when they independently agree — the strongest signal found in
  // backtesting (59.2% at WR, vs. this comparison's ~55% baseline
  // accuracy), but validated specifically as a close-call tiebreaker,
  // not a general replacement for the score above. See CLAUDE.md
  // "Backtesting & Tuning History" item 17.
  if (anyUncertaintyTrigger && ranked.length >= 2) {
    const [top, second] = ranked;
    if (
      top.position === "WR" &&
      second.position === "WR" &&
      top.targetShare != null &&
      second.targetShare != null &&
      top.separation != null &&
      second.separation != null &&
      top.targetShare !== second.targetShare &&
      top.separation !== second.separation
    ) {
      const targetSharePick = top.targetShare > second.targetShare ? top : second;
      const separationPick = top.separation > second.separation ? top : second;
      if (targetSharePick.playerId === separationPick.playerId) {
        const composite = targetSharePick;
        const winnerIsTop = composite.playerId === top.playerId;
        const winTs = winnerIsTop ? top.targetShare : second.targetShare;
        const loseTs = winnerIsTop ? second.targetShare : top.targetShare;
        const winSep = winnerIsTop ? top.separation : second.separation;
        const loseSep = winnerIsTop ? second.separation : top.separation;
        const otherWr = winnerIsTop ? second : top;
        overrideNotes.push(
          `${composite.displayName} leads ${otherWr.displayName} in both target share (${(winTs * 100).toFixed(0)}% to ${(loseTs * 100).toFixed(0)}%) and average separation (${winSep.toFixed(1)} to ${loseSep.toFixed(1)} yards) — the tiebreaker on this close call.`
        );
        winner = composite;
        isCloseCall = false;
        hasLimitedData = false;
      }
    }
  }

  // Season-gap guardrail (see SEASON_GAP_GUARDRAIL_* in config.ts). A thin
  // recent sample can let a modifier overturn a large season-long talent
  // gap and pick a backup over a star; when another candidate dominates
  // the current pick on season-to-date average AND the comparison involves
  // limited recent data, fall back to the season-long favorite. Runs after
  // the WR tiebreaker so it has the final say on `winner`.
  let seasonGuardrailTriggered = false;
  if (winner.finalScore != null && winner.seasonPprAvg != null && candidates.some((c) => c.dataQuality !== "full")) {
    const winnerSeasonAvg = winner.seasonPprAvg;
    const stronger = ranked.find(
      (c) =>
        c.playerId !== winner.playerId &&
        c.seasonPprAvg != null &&
        c.seasonPprAvg >= winnerSeasonAvg * SEASON_GAP_GUARDRAIL_RATIO &&
        c.seasonPprAvg - winnerSeasonAvg >= SEASON_GAP_GUARDRAIL_ABS
    );
    if (stronger && stronger.seasonPprAvg != null) {
      overrideNotes.push(
        `${stronger.displayName} grades out lower on a small recent sample, but their season-long production (${stronger.seasonPprAvg.toFixed(1)} vs ${winnerSeasonAvg.toFixed(1)} pts/game) is far stronger — with limited recent data here, we lean on the bigger sample.`
      );
      winner = stronger;
      seasonGuardrailTriggered = true;
      isCloseCall = false;
      hasLimitedData = false;
    }
  }

  const runnerUp = ranked.find((c) => c.playerId !== winner.playerId && c.finalScore != null) ?? null;
  const winScore = winner.finalScore;
  const upScore = runnerUp?.finalScore ?? null;
  const fmt1 = (n: number) => n.toFixed(1);

  let headline: string;
  if (runnerUp == null || winScore == null || upScore == null) {
    headline =
      wasOverridden && ranked.length === 1
        ? `Start ${winner.displayName} — the only player in this comparison active this week.`
        : `Start ${winner.displayName}.`;
  } else if (seasonGuardrailTriggered && winner.seasonPprAvg != null && runnerUp.seasonPprAvg != null) {
    headline = `Start ${winner.displayName} over ${runnerUp.displayName} — ${fmt1(winner.seasonPprAvg)} vs ${fmt1(runnerUp.seasonPprAvg)} points per game on the season outweighs a thin recent sample.`;
  } else if (isCloseCall) {
    headline = `Close call — ${winner.displayName} over ${runnerUp.displayName} by just ${fmt1(Math.abs(winScore - upScore))} projected points (${fmt1(winScore)} to ${fmt1(upScore)}).`;
  } else if (hasLimitedData) {
    headline = `Start ${winner.displayName} over ${runnerUp.displayName} — ${fmt1(winScore)} to ${fmt1(upScore)} projected, though the recent sample on at least one player is thin.`;
  } else {
    headline = `Start ${winner.displayName} over ${runnerUp.displayName} — ${fmt1(Math.abs(winScore - upScore))} more projected points (${fmt1(winScore)} to ${fmt1(upScore)}).`;
  }

  const reasoning = buildReasoning(breakdowns, overrideNotes, isCloseCall, wasOverridden);

  // Calibrated confidence from the gap between the pick and the field.
  // For a guardrail pick the finalScore gap favors the OTHER player, so
  // we use the season-long gap that actually drove the call; otherwise the
  // gap between the top-two finalScores. A lone remaining candidate has no
  // contest, so it lands at the curve's ceiling.
  let confidenceGap = Infinity;
  if (seasonGuardrailTriggered && winner.seasonPprAvg != null && ranked[0].seasonPprAvg != null) {
    confidenceGap = winner.seasonPprAvg - ranked[0].seasonPprAvg;
  } else if (ranked.length >= 2 && ranked[0].finalScore != null && ranked[1].finalScore != null) {
    confidenceGap = ranked[0].finalScore - ranked[1].finalScore;
  }
  let confidence = confidenceFromGap(confidenceGap);

  // Depth-chart confidence floor: a listed starter over a clear backup is
  // a much higher-confidence regime than any startable-pool comparison the
  // gap curve is calibrated on (which tops out ~79%). When the pick is a
  // rank-1 starter and the best alternative is a clear backup (3rd string+
  // or not on the chart at all AND well behind on season average — the
  // latter guards against a mere name-match miss looking like a scrub),
  // floor it. Live-only (depthRankByPlayerId is omitted in backtest).
  if (depthRankByPlayerId && winner.playerId != null) {
    const winnerRank = depthRankByPlayerId.get(winner.playerId) ?? null;
    const alt = ranked.find((c) => c.playerId !== winner.playerId);
    const altRank = alt?.playerId != null ? (depthRankByPlayerId.get(alt.playerId) ?? null) : null;
    const winnerIsStarter = winnerRank === 1;
    const altIsClearBackup =
      alt != null &&
      (altRank != null
        ? altRank >= 3
        : winnerIsStarter &&
          winner.seasonPprAvg != null &&
          alt.seasonPprAvg != null &&
          winner.seasonPprAvg - alt.seasonPprAvg >= SEASON_GAP_GUARDRAIL_ABS);
    if (winnerIsStarter && altIsClearBackup) {
      confidence = Math.max(confidence, DEPTH_STARTER_CONFIDENCE);
    }
  }

  return {
    players: breakdowns,
    recommendedPlayerId: winner.playerId,
    isCloseCall,
    hasLimitedData,
    confidence,
    headline,
    reasoning,
  };
}
