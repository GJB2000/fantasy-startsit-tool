import {
  CLOSE_CALL_ABS_POINTS,
  CLOSE_CALL_RELATIVE_PCT,
  MATCHUP_MODIFIER_CAP,
  MATCHUP_MODIFIER_SCALE,
  RECENT_WEEK_COUNT,
  RECENT_WEIGHT_BASE,
  RECENT_WEIGHT_MAX,
  RECENT_WEIGHT_PER_GAME,
  VOLUME_MODIFIER_CAP,
  VOLUME_MODIFIER_PER_UNIT,
  VOLUME_REFERENCE,
} from "./config";
import type {
  ComparisonResult,
  DataQuality,
  PlayerComparisonInput,
  PlayerScoreBreakdown,
} from "./types";
import { getVolumeStat } from "./volume";

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
  if (position && position in VOLUME_REFERENCE) {
    const volumeValues = input.recentGames.map(getVolumeStat).filter((v): v is number => v != null);
    if (volumeValues.length > 0) {
      recentVolumeAvg = average(volumeValues);
      const reference = VOLUME_REFERENCE[position as keyof typeof VOLUME_REFERENCE];
      const diff = recentVolumeAvg - reference;
      volumeModifier = clamp(diff * VOLUME_MODIFIER_PER_UNIT, -VOLUME_MODIFIER_CAP, VOLUME_MODIFIER_CAP);
      const unitLabel = position === "QB" ? "pass attempts" : position === "RB" ? "touches" : "targets";
      const direction = diff >= 0 ? "more" : "fewer";
      notes.push(
        `Averaging ${recentVolumeAvg.toFixed(1)} ${unitLabel}/game over their last ${volumeValues.length} game${volumeValues.length === 1 ? "" : "s"} — ${Math.abs(diff).toFixed(1)} ${direction} than a typical starter's workload.`
      );
    }
  }

  const finalScore = blendedScore == null ? null : blendedScore + matchupModifier + volumeModifier;

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

  const winner = ranked[0];
  const wasOverridden = candidates.length < found.length;

  if (winner.finalScore == null) {
    return {
      players: breakdowns,
      recommendedPlayerId: null,
      isCloseCall: false,
      headline: "Not enough data to make a confident call here.",
      reasoning: [
        ...overrideNotes,
        "None of the remaining players have enough recent or season data to compare.",
      ],
    };
  }

  let isCloseCall = false;
  if (ranked.length >= 2 && ranked[1].finalScore != null) {
    const gap = Math.abs(winner.finalScore - ranked[1].finalScore);
    const threshold = Math.max(
      CLOSE_CALL_ABS_POINTS,
      CLOSE_CALL_RELATIVE_PCT * Math.max(winner.finalScore, ranked[1].finalScore)
    );
    isCloseCall = gap <= threshold || winner.dataQuality !== "full" || ranked[1].dataQuality !== "full";
  }

  let headline: string;
  if (wasOverridden) {
    headline =
      ranked.length === 1
        ? `Start ${winner.displayName} — nobody else in this comparison is currently available.`
        : `Start ${winner.displayName}.`;
  } else if (isCloseCall) {
    headline = `Close call — lean ${winner.displayName}, but it's not a lock.`;
  } else {
    headline = `Start ${winner.displayName}.`;
  }

  const reasoning = buildReasoning(breakdowns, overrideNotes, isCloseCall, wasOverridden);

  return {
    players: breakdowns,
    recommendedPlayerId: winner.playerId,
    isCloseCall,
    headline,
    reasoning,
  };
}
