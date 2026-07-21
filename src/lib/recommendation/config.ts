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
