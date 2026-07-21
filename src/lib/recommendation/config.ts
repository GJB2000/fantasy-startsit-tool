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
 * Rough "average starter" volume/game per position — the reference point
 * the volume modifier compares each player against. Static v1
 * approximation (not computed from a league table). Backtest-validated:
 * a standalone "higher recent volume wins" baseline hit ~56.6% accuracy
 * on adjacent-rank pairs, vs. the engine's pre-volume ~50.3% and the
 * next-best baseline's ~52.9% — clearly the strongest available signal.
 * Revisit with a dynamic per-week league average if further tuning is
 * warranted.
 */
export const VOLUME_REFERENCE: Record<"QB" | "RB" | "WR" | "TE", number> = {
  QB: 32, // pass attempts/game
  RB: 14, // rushing attempts + targets ("touches")/game
  WR: 7, // targets/game
  TE: 5, // targets/game
};

/**
 * Points the volume modifier swings per unit of volume above/below
 * VOLUME_REFERENCE for that position. Empirically tuned via backtest,
 * not guessed: an initial conservative value (0.1, capped at 2) barely
 * moved the needle because top-N "startable" players cluster tightly
 * above VOLUME_REFERENCE for every position, leaving little room to
 * differentiate — it actually made overall accuracy slightly worse
 * (49.5%). Scaling up moved accuracy from 50.3% (no modifier) -> 53.4%
 * (0.5/8) -> 54.6% (1.0/15, chosen here) -> 55.1% (2.0/30, but with
 * uneven per-position effects — WR dipped while TE jumped sharply,
 * suggesting overfitting to this one backtest sample rather than a
 * genuine improvement). 1.0/15 was kept as the more conservative,
 * broadly-consistent choice instead of chasing the single-run peak.
 */
export const VOLUME_MODIFIER_PER_UNIT = 1.0;

/** Cap on the volume modifier's swing, so it nudges the score rather than dominating it. */
export const VOLUME_MODIFIER_CAP = 15;
