import {
  CLOSE_CALL_ABS_POINTS,
  CLOSE_CALL_RELATIVE_PCT,
  DROP_RATE_BLEND_WEIGHT,
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
  QB_SUCCESS_RATE_BLEND_WEIGHT,
  RB_EPA_BLEND_WEIGHT,
  RB_EPA_PPR_AT_ZERO,
  RB_EPA_REGRESSION_SLOPE,
  RECENT_WEEK_COUNT,
  RECENT_WEIGHT_BASE,
  RECENT_WEIGHT_MAX,
  RECENT_WEIGHT_PER_GAME,
  REDZONE_BLEND_WEIGHT_RB,
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function scorePlayer(input: PlayerComparisonInput): PlayerScoreBreakdown {
  const notes: string[] = [];
  const displayName = input.player
    ? `${input.player.FirstName} ${input.player.LastName}`
    : (input.playerLabel ?? "Selected player");
  const position = input.player?.Position ?? null;
  const team = input.player?.Team ?? null;

  const gamesUsedForRecent = input.recentGames.length;
  const recentPprAvg =
    gamesUsedForRecent > 0 ? average(input.recentGames.map((g) => g.FantasyPointsPPR)) : null;
  const seasonPprAvg = input.seasonStat
    ? input.seasonStat.FantasyPointsPPR / Math.max(input.seasonStat.Played, 1)
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
  }

  if (gamesUsedForRecent > 0 && gamesUsedForRecent < RECENT_WEEK_COUNT) {
    notes.push(
      `Small sample: only ${gamesUsedForRecent} of the last ${RECENT_WEEK_COUNT} weeks available.`
    );
  }

  let matchupModifier = 0;
  if (input.matchupContext) {
    const { leagueAverage, diffFromAverage, opponentTeam, rank, teamCount, position: matchupPosition } =
      input.matchupContext;
    const diffRatio = leagueAverage !== 0 ? diffFromAverage / leagueAverage : 0;
    matchupModifier = clamp(
      diffRatio * MATCHUP_MODIFIER_SCALE,
      -MATCHUP_MODIFIER_CAP,
      MATCHUP_MODIFIER_CAP
    );
    const direction = diffFromAverage >= 0 ? "friendlier" : "tougher";
    notes.push(
      `In their last game (vs ${opponentTeam}), that defense ranked ${rank} of ${teamCount} in PPR points allowed to ${matchupPosition}s — a ${direction}-than-average matchup.`
    );
  } else {
    notes.push("No matchup data available for this player's most recent opponent.");
  }

  let volumeModifier = 0;
  let recentVolumeAvg: number | null = null;
  if (blendedScore != null && position && position in POINTS_PER_VOLUME_UNIT) {
    const volumeValues = input.recentGames.map(getVolumeStat).filter((v): v is number => v != null);
    if (volumeValues.length > 0) {
      recentVolumeAvg = average(volumeValues);
      const pointsPerUnit = POINTS_PER_VOLUME_UNIT[position as keyof typeof POINTS_PER_VOLUME_UNIT];
      const expectedPointsFromVolume = recentVolumeAvg * pointsPerUnit;
      const blendedWithVolume =
        (1 - VOLUME_BLEND_WEIGHT) * blendedScore + VOLUME_BLEND_WEIGHT * expectedPointsFromVolume;
      volumeModifier = blendedWithVolume - blendedScore;
      const unitLabel = position === "QB" ? "pass attempts" : position === "RB" ? "touches" : "targets";
      notes.push(
        `Averaging ${recentVolumeAvg.toFixed(1)} ${unitLabel}/game over their last ${volumeValues.length} game${volumeValues.length === 1 ? "" : "s"} — worth roughly ${expectedPointsFromVolume.toFixed(1)} PPR points at this position's typical rate.`
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
      `Averaging ${redZoneTouchesAvg.toFixed(1)} red-zone touches/game recently — worth roughly ${expectedPointsFromRedZone.toFixed(1)} PPR points at this position's typical rate.`
    );
  }

  let snapShareModifier = 0;
  const snapShareAvg = input.nflverse.snapShare;
  if (blendedScore != null && position === "TE" && snapShareAvg != null) {
    const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier;
    const expectedPointsFromSnapShare = snapShareAvg * POINTS_PER_SNAP_SHARE_UNIT_TE;
    const blendedWithSnapShare =
      (1 - SNAP_SHARE_BLEND_WEIGHT_TE) * runningScore + SNAP_SHARE_BLEND_WEIGHT_TE * expectedPointsFromSnapShare;
    snapShareModifier = blendedWithSnapShare - runningScore;
    notes.push(
      `Snap share of ${(snapShareAvg * 100).toFixed(0)}% recently — worth roughly ${expectedPointsFromSnapShare.toFixed(1)} PPR points at this position's typical rate.`
    );
  }

  let qbRushModifier = 0;
  let recentQbRushAttemptsAvg: number | null = null;
  if (blendedScore != null && position === "QB") {
    const rushValues = input.recentGames.map(getQbRushAttemptStat).filter((v): v is number => v != null);
    if (rushValues.length > 0) {
      recentQbRushAttemptsAvg = average(rushValues);
      const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier;
      const expectedPointsFromQbRush = recentQbRushAttemptsAvg * POINTS_PER_QB_RUSH_ATTEMPT;
      const blendedWithQbRush =
        (1 - QB_RUSH_BLEND_WEIGHT) * runningScore + QB_RUSH_BLEND_WEIGHT * expectedPointsFromQbRush;
      qbRushModifier = blendedWithQbRush - runningScore;
      notes.push(
        `Averaging ${recentQbRushAttemptsAvg.toFixed(1)} rushing attempts/game over their last ${rushValues.length} game${rushValues.length === 1 ? "" : "s"} — worth roughly ${expectedPointsFromQbRush.toFixed(1)} PPR points at this position's typical rate.`
      );
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
      `Averaging ${goalLineTouchesAvg.toFixed(2)} goal-line rush attempts/game recently — worth roughly ${expectedPointsFromGoalLine.toFixed(1)} PPR points at this position's typical rate.`
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
      `Succeeding on ${(successRateAvg * 100).toFixed(0)}% of recent dropbacks (down/distance-adjusted) — worth roughly ${expectedPointsFromSuccessRate.toFixed(1)} PPR points at this position's typical rate.`
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
    const expectedPointsFromQbRushEpa = qbRushEpaAvg * POINTS_PER_QB_RUSH_EPA;
    const blendedWithQbRushEpa =
      (1 - QB_RUSH_EPA_BLEND_WEIGHT) * runningScore + QB_RUSH_EPA_BLEND_WEIGHT * expectedPointsFromQbRushEpa;
    qbRushEpaModifier = blendedWithQbRushEpa - runningScore;
    notes.push(
      `Averaging ${qbRushEpaAvg.toFixed(2)} EPA per rush attempt recently (as a runner) — worth roughly ${expectedPointsFromQbRushEpa.toFixed(1)} PPR points at this position's typical rate.`
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
      `Averaging ${epaPerPlayAvg.toFixed(2)} EPA per rush recently — worth roughly ${expectedPointsFromEpa.toFixed(1)} PPR points at this position's typical rate.`
    );
  }

  let dropRateModifier = 0;
  const dropRateAvg = input.nflverse.dropRate;
  if (blendedScore != null && position === "WR" && dropRateAvg != null) {
    const runningScore = blendedScore + matchupModifier + volumeModifier + redZoneModifier + snapShareModifier;
    const pointsLostFromDrops = dropRateAvg * POINTS_PER_DROP_RATE_UNIT;
    const expectedPointsFromDropRate = runningScore - pointsLostFromDrops;
    const blendedWithDropRate =
      (1 - DROP_RATE_BLEND_WEIGHT) * runningScore + DROP_RATE_BLEND_WEIGHT * expectedPointsFromDropRate;
    dropRateModifier = blendedWithDropRate - runningScore;
    notes.push(
      `Dropping ${(dropRateAvg * 100).toFixed(0)}% of recent charted targets — worth roughly ${pointsLostFromDrops.toFixed(1)} fewer PPR points at this position's typical rate.`
    );
  }

  let teammateOutBumpModifier = 0;
  if (blendedScore != null && position === "WR" && input.hasLimitedTeammate) {
    teammateOutBumpModifier = TEAMMATE_OUT_BUMP_WEIGHT_WR * POINTS_PER_TEAMMATE_OUT_BUMP_WR;
    notes.push(
      `A same-position teammate is listed Out/Doubtful — worth roughly ${teammateOutBumpModifier.toFixed(1)} extra PPR points at this position's typical rate.`
    );
  }

  const finalScore =
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
        teammateOutBumpModifier;

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
    qbRushEpaAvg,
    qbRushEpaModifier,
    teammateOutBumpModifier,
    targetShare: input.nflverse.targetShare,
    separation: input.nflverse.separation,
    finalScore,
    injuryStatus,
    isOnByeThisWeek: input.isOnByeThisWeek,
    matchupContext: input.matchupContext,
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
        `${b.displayName}: averaging ${b.recentPprAvg.toFixed(1)} PPR points over their last ${b.gamesUsedForRecent} game${b.gamesUsedForRecent === 1 ? "" : "s"}${seasonPart}.`
      );
    } else if (b.seasonPprAvg != null) {
      bullets.push(
        `${b.displayName}: no recent games available; averaging ${b.seasonPprAvg.toFixed(1)} PPR points per game this season.`
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

export function comparePlayers(inputs: PlayerComparisonInput[]): ComparisonResult {
  const breakdowns = inputs.map(scorePlayer);

  const found = breakdowns.filter((b) => b.playerId !== null);
  const notFoundNames = breakdowns.filter((b) => b.playerId === null).map((b) => b.displayName);

  if (found.length === 0) {
    return {
      players: breakdowns,
      recommendedPlayerId: null,
      isCloseCall: false,
      hasLimitedData: false,
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
        overrideNotes.push(
          `${composite.displayName} leads both target share and average separation from the defender recently — a strong secondary signal on this close call.`
        );
        winner = composite;
        isCloseCall = false;
        hasLimitedData = false;
      }
    }
  }

  let headline: string;
  if (wasOverridden) {
    headline =
      ranked.length === 1
        ? `Start ${winner.displayName} — nobody else in this comparison is currently available.`
        : `Start ${winner.displayName}.`;
  } else if (isCloseCall) {
    headline = `Close call — lean ${winner.displayName}, but it's not a lock.`;
  } else if (hasLimitedData) {
    headline = `Start ${winner.displayName} — though we have limited recent data on at least one of these players.`;
  } else {
    headline = `Start ${winner.displayName}.`;
  }

  const reasoning = buildReasoning(breakdowns, overrideNotes, isCloseCall, wasOverridden);

  return {
    players: breakdowns,
    recommendedPlayerId: winner.playerId,
    isCloseCall,
    hasLimitedData,
    headline,
    reasoning,
  };
}
