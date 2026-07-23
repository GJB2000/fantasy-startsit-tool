import type { NflverseWeekStat } from "@/lib/nflverse/weekTable";
import { getVolumeStat } from "@/lib/recommendation/volume";
import type { BacktestWeekSlice } from "./weekData";

export type BaselineId =
  | "priorWeek"
  | "seasonAvg"
  | "recentVolume"
  | "gameScript"
  | "snapShare"
  | "targetShare"
  | "airYardsShare"
  | "cpoe"
  | "aggressiveness"
  | "separation"
  | "yacAboveExpectation"
  | "rushYoe"
  | "receivingComposite"
  | "injuryStatus"
  | "redZoneTouches"
  | "qbRushingAttempts";

export const BASELINE_LABELS: Record<BaselineId, string> = {
  priorWeek: "Prior week's points",
  seasonAvg: "Season-to-date average",
  recentVolume: "Recent volume (targets/touches/attempts)",
  gameScript: "Team pace/game script (recent pass or rush rate)",
  snapShare: "Snap share (offensive snap %, nflverse)",
  targetShare: "Target share (nflverse)",
  airYardsShare: "Air yards share (nflverse)",
  cpoe: "Completion % above expectation (NextGen Stats, QB)",
  aggressiveness: "Aggressiveness — % of throws into tight coverage (NextGen Stats, QB)",
  separation: "Average separation from nearest defender (NextGen Stats, receivers)",
  yacAboveExpectation: "YAC above expectation (NextGen Stats, receivers)",
  rushYoe: "Rush yards over expected per attempt (NextGen Stats, RB)",
  receivingComposite: "Target share + separation, combined by agreement",
  injuryStatus: "Avoid the more injured player (nflverse weekly injury report)",
  redZoneTouches: "Red zone touches (rush attempts + targets inside the 20, nflverse play-by-play)",
  qbRushingAttempts: "Recent rushing attempts (QB only)",
};

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Naive baseline: pick whoever scored more PPR points in the single
 * most recent prior week. Null (no pick) if either player has no game
 * in that window yet, or if they're tied — same "no signal" handling
 * the real engine uses for insufficient data, so baseline and engine
 * are graded by identical rules.
 */
export function pickPriorWeek(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const scores = playerIds.map((id) => weekSlice.recentGamesByPlayer(id).at(-1)?.FantasyPointsPPR ?? null);
  if (scores[0] == null || scores[1] == null || scores[0] === scores[1]) return null;
  return scores[0] > scores[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever has the higher season-to-date PPR
 * average (through the prior week only — same point-in-time rule the
 * real engine follows, never full-season hindsight).
 */
export function pickSeasonAvg(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const avgs = playerIds.map((id) => {
    const stat = weekSlice.seasonToDateTable.get(id);
    return stat && stat.Played > 0 ? stat.FantasyPointsPPR / stat.Played : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever has averaged more recent volume
 * (targets/touches/attempts, position-specific — see volume.ts) over
 * the same recent-weeks window the engine uses. Volume is a more
 * stable predictor than raw points, which are inflated by touchdown
 * variance.
 */
export function pickByRecentVolume(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const avgs = playerIds.map((id) => {
    const values = weekSlice
      .recentGamesByPlayer(id)
      .map(getVolumeStat)
      .filter((v): v is number => v != null);
    return values.length > 0 ? average(values) : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever's team offers more of the play type
 * relevant to their position — recent pass plays/game (playsPerGame *
 * passRate) for QB/WR/TE, recent rush plays/game (playsPerGame *
 * (1 - passRate)) for RB. Team/position are read from the player's own
 * most recent game row (schedule/roster facts, not stat leakage), pace
 * is computed only from prior weeks (see weekData.ts). Tests the
 * hypothesis that a team's play-calling tendency/pace is a legitimate,
 * non-leaky proxy for opportunity independent of any one player's
 * individual usage.
 */
export function pickByGameScript(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const scores = playerIds.map((id) => {
    const lastGame = weekSlice.recentGamesByPlayer(id).at(-1);
    if (!lastGame) return null;
    const pace = weekSlice.teamPaceTable.get(lastGame.Team);
    if (!pace) return null;
    const relevantRate = lastGame.Position === "RB" ? 1 - pace.passRate : pace.passRate;
    return pace.playsPerGame * relevantRate;
  });
  if (scores[0] == null || scores[1] == null || scores[0] === scores[1]) return null;
  return scores[0] > scores[1] ? playerIds[0] : playerIds[1];
}

function positionOf(weekSlice: BacktestWeekSlice, playerId: number): string | null {
  return weekSlice.recentGamesByPlayer(playerId).at(-1)?.Position ?? null;
}

/**
 * Shared shape for the nflverse-backed baselines below: average a given
 * per-week stat (snap share, target share, a NextGen Stats metric, ...)
 * over the same recent-weeks window recentGamesByPlayer uses, then pick
 * whoever's higher. Nulls (bye weeks, unjoined players, weeks nflverse
 * has no value for — e.g. target_share is only meaningful for
 * pass-catcher routes) are filtered out rather than treated as zero.
 *
 * `skipPositions` opts a position out entirely (returns null/no_pick for
 * any pair involving it), for stats that are structurally meaningless
 * there rather than just noisy — e.g. two starting QBs split ~100% of
 * their team's dropbacks/snaps in a narrow band, so target share and
 * snap share rarely separate them at all (validated in backtesting: QB
 * pairs were ~90% no_pick on target share). Encodes that as a real rule
 * instead of leaving it as an emergent side effect of tie-filtering.
 */
function pickByNflverseStat(
  weekSlice: BacktestWeekSlice,
  playerIds: [number, number],
  statKey: keyof Omit<NflverseWeekStat, "week">,
  skipPositions?: readonly string[]
): number | null {
  if (skipPositions) {
    const positions = playerIds.map((id) => positionOf(weekSlice, id));
    if (positions.some((p) => p != null && skipPositions.includes(p))) return null;
  }

  const avgs = playerIds.map((id) => {
    const values = weekSlice
      .recentNflverseByPlayer(id)
      .map((stat) => stat[statKey])
      .filter((v): v is number => v != null);
    return values.length > 0 ? average(values) : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

/** Naive baseline: pick whoever has averaged a higher offensive snap share over the recent-weeks window (nflverse). Doesn't apply to QB — see pickByNflverseStat. */
export function pickBySnapShare(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "offensePct", ["QB"]);
}

/** Naive baseline: pick whoever has averaged a higher target share over the recent-weeks window (nflverse). Doesn't apply to QB — see pickByNflverseStat. */
export function pickByTargetShare(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "targetShare", ["QB"]);
}

/** Naive baseline: pick whoever has averaged a higher share of their team's air yards over the recent-weeks window (nflverse). */
export function pickByAirYardsShare(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "airYardsShare");
}

/** Naive baseline: pick whoever has averaged a higher completion % above expectation (NextGen Stats CPOE) — a QB accuracy signal independent of raw completion rate or scheme. */
export function pickByCpoe(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "completionPercentageAboveExpectation");
}

/** Naive baseline: pick whoever has averaged a higher "aggressiveness" (NextGen Stats: % of throws into tight coverage) — a QB risk-taking signal. */
export function pickByAggressiveness(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "aggressiveness");
}

/** Naive baseline: pick whoever has averaged more separation from their nearest defender (NextGen Stats) — a receiver route-running/coverage-beating signal. */
export function pickBySeparation(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "avgSeparation");
}

/** Naive baseline: pick whoever has averaged more yards-after-catch above expectation (NextGen Stats) — a receiver playmaking signal. */
export function pickByYacAboveExpectation(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "avgYacAboveExpectation");
}

/** Naive baseline: pick whoever has averaged more rush yards over expected per attempt (NextGen Stats) — a RB efficiency signal net of blocking/box count. */
export function pickByRushYoe(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  return pickByNflverseStat(weekSlice, playerIds, "rushYardsOverExpectedPerAtt");
}

/**
 * Naive baseline: combine target share and separation — the two
 * standalone signals that beat chance for pass-catchers (see
 * "Backtesting & Tuning History" items 14/16) — by requiring agreement
 * rather than averaging two differently-scaled metrics (a share
 * fraction vs. yards of separation has no natural common unit without
 * inventing one). Picks whoever both signals favor; falls back to
 * whichever one has data when only one does (this is how RB pairs
 * naturally resolve to target-share-only, since separation has no RB
 * rows at all — not a special case, just what falls out of the
 * fallback); returns null if they disagree or neither has data. Tests
 * whether requiring agreement trades coverage for precision, the same
 * question a confidence/close-call flag asks.
 */
export function pickByReceivingComposite(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const targetPick = pickByTargetShare(weekSlice, playerIds);
  const separationPick = pickBySeparation(weekSlice, playerIds);
  if (targetPick == null) return separationPick;
  if (separationPick == null) return targetPick;
  return targetPick === separationPick ? targetPick : null;
}

const INJURY_SEVERITY: Record<string, number> = { Questionable: 1, Doubtful: 2, Out: 3 };

/**
 * Naive baseline: pick whoever's LESS injured per the current week's
 * actual NFL injury report (nflverse `injuries` release) — a real
 * pregame Questionable/Doubtful/Out designation, not the post-hoc
 * Played/Out inference SportsDataIO's archived data is limited to (see
 * Data Source Notes). Unlike every other nflverse-backed baseline
 * above, this is a current-week fact, not a trailing usage tendency —
 * looked up directly via nflverseStatForWeek at targetWeek rather than
 * averaged over the recent-weeks window. No pick when severities are
 * equal, including "both healthy" (most pairs).
 */
export function pickByInjuryStatus(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const severities = playerIds.map((id) => {
    const status = weekSlice.nflverseStatForWeek(id, weekSlice.targetWeek)?.injuryStatus;
    return status ? INJURY_SEVERITY[status] ?? 0 : 0;
  });
  if (severities[0] === severities[1]) return null;
  return severities[0] < severities[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever has averaged more red-zone touches
 * (rush attempts inside the 20 for RB, targets inside the 20 for
 * WR/TE, red-zone rush attempts for QB — position-specific, mirroring
 * volume.ts's getVolumeStat) over the recent-weeks window. Unlike the
 * share/rate nflverse metrics above, a real zero here is meaningful
 * (played, but no red-zone role that game) — so this walks the
 * player's actually-played weeks (recentGamesByPlayer) and defaults to
 * 0 when nflverse has no red-zone row for that week, rather than
 * filtering the week out the way pickByNflverseStat treats missing
 * share/rate data (there, "no row" more often means "not applicable").
 */
export function pickByRedZoneTouches(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const avgs = playerIds.map((id) => {
    const games = weekSlice.recentGamesByPlayer(id);
    if (games.length === 0) return null;
    const position = games.at(-1)!.Position;
    const values = games
      .map((game) => {
        const stat = weekSlice.nflverseStatForWeek(id, game.Week);
        const rush = stat?.redZoneRushAttempts ?? 0;
        const targets = stat?.redZoneTargets ?? 0;
        if (position === "RB") return rush + targets;
        if (position === "QB") return rush;
        if (position === "WR" || position === "TE") return targets;
        return null;
      })
      .filter((v): v is number => v != null);
    return values.length > 0 ? average(values) : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

/**
 * Naive baseline: pick whoever has averaged more recent rushing
 * attempts — QB only. Tests rushing volume as its own, standalone
 * signal, distinct from `pickByRecentVolume` (pass attempts only for
 * QB, per volume.ts) rather than blended into it — item 25 tried
 * blending rushing into the pass-attempts signal at several weights and
 * reverted every one, since a single blend weight couldn't represent
 * pocket passers and dual-threat QBs at once. This tests the
 * alternative floated there: a second, separate additive signal,
 * mirroring exactly how red-zone touches (RB) and snap share (TE) were
 * proven standalone before ever touching the engine.
 */
export function pickByQbRushingAttempts(weekSlice: BacktestWeekSlice, playerIds: [number, number]): number | null {
  const positions = playerIds.map((id) => positionOf(weekSlice, id));
  if (positions.some((p) => p !== "QB")) return null;

  const avgs = playerIds.map((id) => {
    const games = weekSlice.recentGamesByPlayer(id);
    return games.length > 0 ? average(games.map((g) => g.RushingAttempts)) : null;
  });
  if (avgs[0] == null || avgs[1] == null || avgs[0] === avgs[1]) return null;
  return avgs[0] > avgs[1] ? playerIds[0] : playerIds[1];
}

export const BASELINE_PICKERS: Record<
  BaselineId,
  (weekSlice: BacktestWeekSlice, playerIds: [number, number]) => number | null
> = {
  priorWeek: pickPriorWeek,
  seasonAvg: pickSeasonAvg,
  recentVolume: pickByRecentVolume,
  gameScript: pickByGameScript,
  snapShare: pickBySnapShare,
  targetShare: pickByTargetShare,
  airYardsShare: pickByAirYardsShare,
  cpoe: pickByCpoe,
  aggressiveness: pickByAggressiveness,
  separation: pickBySeparation,
  yacAboveExpectation: pickByYacAboveExpectation,
  rushYoe: pickByRushYoe,
  receivingComposite: pickByReceivingComposite,
  injuryStatus: pickByInjuryStatus,
  redZoneTouches: pickByRedZoneTouches,
  qbRushingAttempts: pickByQbRushingAttempts,
};
