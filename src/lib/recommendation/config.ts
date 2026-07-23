// Tunable weights for the rules-based recommendation engine.
// Adjust these as the recommendation logic gets tuned over time.

/** Base weight given to recent-4-week form vs. season average, before scaling by sample size. */
export const RECENT_WEIGHT_BASE = 0.35;

/** Additional weight per available recent game, up to the 4-game cap (0.35 + 4*0.075 = 0.65). */
export const RECENT_WEIGHT_PER_GAME = 0.075;

/** Max weight recent form can carry, even with a full 4-game sample. */
export const RECENT_WEIGHT_MAX = 0.65;

/** How many PPR points the matchup modifier swings per 100% deviation from league-average points allowed. */
export const MATCHUP_MODIFIER_SCALE = 6;

/** Cap on the matchup modifier's swing, so it nudges the score rather than dominating it. */
export const MATCHUP_MODIFIER_CAP = 2.5;

/** Absolute point gap at or below which two players are called a "close call". */
export const CLOSE_CALL_ABS_POINTS = 1.5;

/** Relative point gap (as a fraction of the higher score) at or below which two players are a "close call". */
export const CLOSE_CALL_RELATIVE_PCT = 0.08;

/** Number of recent weeks of game logs used for the "recent performance" signal. */
export const RECENT_WEEK_COUNT = 4;

/**
 * Empirically-derived PPR points scored per unit of recent volume, by
 * position (points/game ÷ volume/game across every played game of the
 * 2025 season) — this is what makes VOLUME_BLEND_WEIGHT below a real,
 * unit-consistent blend rather than mixing points with raw target/touch
 * counts. QB: points per pass attempt. RB: points per touch (rushing
 * attempts + targets). WR/TE: points per target.
 *
 * QB was tried as pass+rush "touches" at several blend weights after
 * item 24's 2024 validation exposed a real gap for rushing QBs — see
 * CLAUDE.md item 25. Reverted: no tested weight was a clean win.
 */
export const POINTS_PER_VOLUME_UNIT: Record<"QB" | "RB" | "WR" | "TE", number> = {
  QB: 0.511,
  RB: 0.808,
  WR: 1.729,
  TE: 1.817,
};

/**
 * How much weight recent volume (converted to points via
 * POINTS_PER_VOLUME_UNIT) carries against the recent/season PPR blend:
 * finalScore = (1 - w) * blendedScore + w * expectedPointsFromVolume
 * + matchupModifier. w=0 is pure points (pre-volume engine behavior),
 * w=1 is pure volume. Superseded an earlier "distance from a static
 * reference point" modifier (VOLUME_REFERENCE/PER_UNIT/CAP) that mixed
 * raw volume units with points inconsistently.
 *
 * Swept in 0.05-0.25 steps against the full backtest (overall accuracy):
 * 0 -> 50.3%, 0.25 -> 50.7%, 0.5 -> 52.8%, 0.75 -> 53.9%, 0.85 -> 54.6%,
 * 0.9 -> 55.4% (peak), 0.95 -> 55.1%, 1.0 -> 54.6%. Accuracy climbs
 * steadily as volume gets more weight and stays in a well-behaved
 * 54.6-55.4% plateau across 0.85-1.0 (every position moves consistently
 * across that range, unlike the erratic single-position swings seen
 * when overtuning the old capped-modifier version) — 0.9 sits in the
 * middle of that plateau rather than being an isolated spike. See
 * "Backtesting & Tuning History" in CLAUDE.md for the full table.
 */
export const VOLUME_BLEND_WEIGHT = 0.9;

/**
 * Empirically-derived PPR points per red-zone touch for RB (rush
 * attempts + targets inside the opponent's 20-yard line, summed across
 * every played RB game-week of the 2025 season, divided by total
 * red-zone touches over the same set — same "ratio of sums" method as
 * POINTS_PER_VOLUME_UNIT). Red-zone touches convert to points at a much
 * higher rate than touches in general (4.797 vs. 0.808) since they're
 * disproportionately touchdown chances. Backtested standalone at 58.2%
 * for RB before integration — see CLAUDE.md item 19.
 */
export const POINTS_PER_REDZONE_TOUCH_RB = 4.797;

/**
 * How much weight red-zone touches (converted to points via
 * POINTS_PER_REDZONE_TOUCH_RB) carry against the running RB score
 * (post-volume-blend), same blend shape as VOLUME_BLEND_WEIGHT. Swept
 * in 0.1 steps against the full backtest (RB accuracy): 0.1 -> 58.1%,
 * **0.2 -> 58.6% (peak)**, 0.3 -> 58.1%, 0.4 -> 56.7%, 0.5 -> 55.7%,
 * 0.6 -> 56.2%, 0.7 -> 57.1%, 0.8 -> 56.2% — 0.2 sits in the middle of a
 * genuine 0.1-0.3 plateau, not an isolated spike (see "Backtesting &
 * Tuning History" item 20 in CLAUDE.md for the full table).
 */
export const REDZONE_BLEND_WEIGHT_RB = 0.2;

/**
 * Empirically-derived PPR points per 100% offensive-snap-share
 * equivalent for TE (total PPR points across every played TE game-week
 * with snap data, divided by total snap share over the same set — same
 * method as POINTS_PER_VOLUME_UNIT/POINTS_PER_REDZONE_TOUCH_RB).
 * Backtested standalone at 57.7% for TE before integration — the best
 * standalone signal found for TE, the engine's weakest position — see
 * CLAUDE.md item 14.
 */
export const POINTS_PER_SNAP_SHARE_UNIT_TE = 9.607;

/**
 * How much weight snap share (converted to points via
 * POINTS_PER_SNAP_SHARE_UNIT_TE) carries against the running TE score
 * (post-volume-blend), same blend shape as VOLUME_BLEND_WEIGHT. TE's
 * small pool (~100 pairs) makes this a much noisier curve than
 * VOLUME_BLEND_WEIGHT's — full 0.05-step sweep against the backtest
 * (TE accuracy) bounced between 52.5-58.4% with no clean monotonic
 * climb, including a boundary peak at w=0.95-1.0 (58.4%) that would
 * mean discarding the existing blended score entirely for TE.
 * Deliberately did NOT take that peak — same "don't chase an isolated
 * spike" discipline as VOLUME_BLEND_WEIGHT and the old capped-volume-
 * modifier's CAP=30 rejection. Settled on **0.4**, the middle of a
 * genuine two-point plateau at 0.35-0.4 (56.4%) that keeps the blend
 * meaningfully anchored to both signals rather than replacing one
 * outright. See "Backtesting & Tuning History" item 20 in CLAUDE.md for
 * the full table and the caveat about this weight's sample size.
 */
export const SNAP_SHARE_BLEND_WEIGHT_TE = 0.4;

/**
 * Empirically-derived PPR points per QB rushing attempt (total QB PPR
 * points across every played QB game-week of the 2025 season, divided
 * by total QB rushing attempts over the same set — same "ratio of
 * sums" method as POINTS_PER_VOLUME_UNIT/POINTS_PER_REDZONE_TOUCH_RB;
 * cross-checked by recomputing POINTS_PER_VOLUME_UNIT.QB's 0.511 the
 * same way from the same data pull and getting an identical value).
 * Rush attempts convert to points at roughly 7.7x the rate of pass
 * attempts (3.929 vs. 0.511) — rarer but disproportionately high-value
 * touches (designed runs/scrambles, goal-line work). A standalone
 * "more recent rush attempts wins" baseline backtested unstably across
 * seasons (46.8% in 2025, 63.0% in 2024 — see CLAUDE.md item 26) before
 * this was attempted as its own additive term rather than blended into
 * the existing pass-attempts-only POINTS_PER_VOLUME_UNIT.QB (item 25's
 * blended attempt was reverted) — see item 30 for the full story.
 */
export const POINTS_PER_QB_RUSH_ATTEMPT = 3.929;

/**
 * How much weight QB rushing volume (converted to points via
 * POINTS_PER_QB_RUSH_ATTEMPT) carries against the running QB score
 * (post-volume-blend), same additive-stack shape as
 * REDZONE_BLEND_WEIGHT_RB/SNAP_SHARE_BLEND_WEIGHT_TE. Unlike those two,
 * this is NOT a free win at any weight — swept in 0.1 steps against
 * BOTH 2025 (SportsDataIO) and 2024 (nflverse-only) QB accuracy: every
 * nonzero weight makes 2025 worse than the w=0 baseline (56.9%) while
 * 2024 climbs from 42.2% toward a 64.7% peak at w=0.7. 0.3 is the
 * deliberately-chosen balance point (52.9%/55.9% — both clearly above
 * chance, roughly matched) rather than either season's individual
 * optimum, on the explicit judgment that cross-season stability matters
 * more than peak single-season accuracy. See CLAUDE.md item 30 for the
 * full two-season sweep table and the tradeoff this represents.
 */
export const QB_RUSH_BLEND_WEIGHT = 0.3;

/**
 * Empirically-derived PPR points per QB goal-line rush attempt
 * (yardline_100<=5, vs. red zone's <=20 — same "ratio of sums" method:
 * total QB PPR points ÷ total QB goal-line rush attempts across every
 * played QB game-week of the 2025 season). Much larger than the red-
 * zone/total-attempt factors (64.5 vs. 4.797/3.929) simply because
 * goal-line rush attempts are rare (138 total across the entire 2025
 * season, all QBs) — same numerator, much smaller denominator. Tested
 * as a candidate replacement for QB_RUSH_BLEND_WEIGHT/
 * POINTS_PER_QB_RUSH_ATTEMPT above after that signal (and the red-zone-
 * only variant, <=20) both showed unstable cross-season standalone
 * accuracy (46.8%→63% and 49.5%→63%); this one was notably *stable*
 * standalone (53.3% 2025, 52.7% 2024). Ultimately NOT shipped
 * (QB_GOAL_LINE_BLEND_WEIGHT below stays at 0) despite finding a real
 * "both seasons improve" region (w~0.08-0.22) — the underlying signal is
 * too thin (138 total plays across the whole 2025 season) to trust,
 * and its best 2024 result only reaches a bare coin flip (52%), nowhere
 * near fixing the gap. Kept as a documented, deliberately-rejected
 * finding — see CLAUDE.md item 30 follow-up for the full sweep.
 */
export const POINTS_PER_QB_GOAL_LINE_RUSH = 64.543;

/**
 * How much weight QB goal-line rush attempts (converted to points via
 * POINTS_PER_QB_GOAL_LINE_RUSH) carry against the running QB score
 * (post-volume-blend, stacked alongside QB_RUSH_BLEND_WEIGHT's term).
 * Kept at 0 (no-op) — deliberately not shipped despite a promising
 * standalone/sweep result, since the underlying signal is too thin
 * (138 plays across all of 2025) to trust over a total-attempts signal
 * that, while a bigger tradeoff, is at least backed by a much larger
 * sample (2267 attempts). Code kept in place, documented, and gated
 * off rather than deleted, so this isn't re-discovered from scratch if
 * revisited with a future season's data. See CLAUDE.md item 30
 * follow-up for the full two-season sweep.
 */
export const QB_GOAL_LINE_BLEND_WEIGHT = 0;
