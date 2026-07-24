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
 *
 * Re-swept once 2022/2023 nflverse data extended the pooled sample to
 * four seasons (592 goal-line plays / 408 QB pairs, vs. 138/~100 on 2025
 * alone) — recomputed pooled conversion factor: 59.80 (close to this
 * single-season 64.543, not re-derived here to avoid disturbing the
 * shipped constant). Conclusion unchanged: still not shipped — see
 * QB_GOAL_LINE_BLEND_WEIGHT below.
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
 *
 * Re-swept against a four-season pooled sample (2022-2025, 408 QB pairs)
 * once 2022/2023 nflverse data became available: pooled accuracy moved
 * from 57.1% (w=0) to a shallow, noisy 56.1-57.8% across w=0-0.5, with
 * NO clean plateau — by-season breakdown showed 2022 improving sharply
 * at every nonzero weight (+5-9pp) while 2023 got steadily *worse*
 * (-6pp by w=0.3) and 2024/2025 stayed roughly flat. A 4x bigger sample
 * didn't resolve the instability that kept this unshipped in the first
 * place — it confirmed the instability is a real property of this
 * narrow a signal, not just an artifact of too little data. Still not
 * shipped. See CLAUDE.md's four-season extension writeup.
 */
export const QB_GOAL_LINE_BLEND_WEIGHT = 0;

/**
 * Empirically-derived PPR points per unit of QB success rate (a binary,
 * down/distance-adjusted "did this play succeed" flag, averaged to a
 * per-dropback rate — see playByPlay.ts), same "ratio of sums" method as
 * every other rate-based factor (total QB PPR points ÷ total QB success
 * rate summed across every played QB game-week of 2025). Standalone-
 * tested at a modest but *stable* 53.0% (2025) / 52.0% (2024) — the
 * first QB signal in this whole investigation that didn't flip
 * direction between seasons (see CLAUDE.md items 25/26/30/30a for the
 * three QB-rushing variants that all failed that test). See item 33 for
 * the integration/sweep story.
 */
export const POINTS_PER_SUCCESS_RATE_UNIT_QB = 31.93;

/**
 * How much weight QB success rate (converted to points via
 * POINTS_PER_SUCCESS_RATE_UNIT_QB) carries against the running QB score
 * (post-volume-blend, stacked after the rushing terms above). See
 * CLAUDE.md item 33 for the two-season sweep.
 */
export const QB_SUCCESS_RATE_BLEND_WEIGHT = 0;

/**
 * RB EPA-per-rush is NOT scored via the usual "ratio of sums" method —
 * unlike every volume/share/rate signal above, raw rushing EPA sums to a
 * NEGATIVE total across the season (rushing plays average negative EPA
 * leaguewide, a well-known fact — see nflverse's own advstats docs).
 * Dividing total points by a negative sum flips the sign, which would
 * make BETTER RBs by EPA score LOWER — backwards. Caught this before
 * shipping it (not assumed correct): computed both ways and compared.
 * Used a simple linear regression instead (PPR points ~ EPA-per-rush,
 * ordinary least squares across every played RB game-week of 2025),
 * which handles a rate centered away from zero correctly. Slope: 5.772
 * points per unit of EPA. Because EPA doesn't naturally pass through
 * the origin the way volume/share metrics do (0 EPA means "league-
 * average," not "no production"), the regression's intercept is also
 * needed — RB_EPA_PPR_AT_ZERO below — unlike every other conversion
 * factor in this file, which implicitly assume 0 rate = 0 points.
 */
export const RB_EPA_REGRESSION_SLOPE = 5.772;

/** Regression intercept — predicted PPR points at exactly 0 EPA-per-rush (league-average efficiency). Paired with RB_EPA_REGRESSION_SLOPE above; see that comment for why RB EPA needs an intercept term when nothing else in this file does. */
export const RB_EPA_PPR_AT_ZERO = 9.749;

/**
 * How much weight RB EPA-per-rush (converted to points via
 * expectedPoints = RB_EPA_PPR_AT_ZERO + epaPerPlay * RB_EPA_REGRESSION_SLOPE)
 * carries against the running RB score (post-volume-blend, post-red-
 * zone). Standalone-tested positive in both seasons and *improving*
 * out-of-sample (52.2% 2025 → 57.2% 2024) — see CLAUDE.md item 33 for
 * the two-season sweep.
 */
export const RB_EPA_BLEND_WEIGHT = 0.3;

/**
 * Empirically-derived PPR points LOST per unit of drop rate (FTN
 * Charting, target-scoped WR/TE — see playByPlay.ts/ftnCharting.ts),
 * same "ratio of sums" method as every other rate factor (total
 * receiver PPR points ÷ total drop rate summed across every played
 * WR/TE game-week of 2025 with charted-target coverage). Unlike every
 * other signal in this file, this is a "lower is better" metric —
 * applied with a NEGATIVE sign in engine.ts (a higher drop rate
 * SUBTRACTS expected points, it doesn't add them). Standalone-tested
 * modest but stable across both positions and both seasons (WR
 * 52.4%→53.1%, TE 50.0%→54.8%) — see CLAUDE.md item 33 for the
 * integration/sweep story.
 */
export const POINTS_PER_DROP_RATE_UNIT = 182.75;

/**
 * How much weight drop rate (converted to a point PENALTY via
 * POINTS_PER_DROP_RATE_UNIT) carries against the running WR/TE score
 * (post-volume-blend, post-snap-share for TE). See CLAUDE.md item 33
 * for the two-season sweep.
 */
export const DROP_RATE_BLEND_WEIGHT = 0.2;

/**
 * Empirically-derived PPR point bonus for WR when a same-position
 * teammate is currently Out/Doubtful ("handcuff" bump) — within-player
 * average PPR points in teammate-out weeks minus their own average in
 * normal weeks, across every played WR game-week of the 2025 season.
 * Unlike every other conversion factor in this file, this backs a
 * BOOLEAN flag, not a continuous rate/count, so the shape is different:
 * modifier = hasLimitedTeammate ? weight * POINTS_PER_TEAMMATE_OUT_BUMP_WR
 * : 0 (a flat bonus when true, not a blend toward an absolute estimate
 * — blending toward a fixed value would incorrectly pull every
 * non-flagged player's score toward it as weight increases). A
 * standalone effect-size check found WR's target-share bump is modest
 * (+1.7pp both seasons) but stable — see CLAUDE.md's unused-data-audit
 * follow-up for the full investigation, including why RB's much larger
 * touch-share bump (+8pp) didn't translate to a useful signal.
 */
export const POINTS_PER_TEAMMATE_OUT_BUMP_WR = 1.014;

/**
 * How much of the empirical bonus above to actually apply — see that
 * comment for the flat-bonus shape (not the usual blend-toward-estimate
 * pattern). Kept at 0 (no-op) — swept 0.1-1.0 against both seasons and
 * every nonzero weight made BOTH 2025 (58.3%→57.4%) and 2024
 * (59.5%→58.5%) worse, not a tradeoff to negotiate like QB rushing/WR
 * drop rate, just a clean rejection: the real, stable standalone effect
 * (item 33 follow-up) adds nothing once blended into an already-tuned
 * WR score — same failure mode as QB success rate. Code kept, not
 * deleted, same precedent as every other rejected signal in this file.
 */
export const TEAMMATE_OUT_BUMP_WEIGHT_WR = 0;
