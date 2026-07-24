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
 *
 * Re-checked against the pooled 2022-2025 sample (n=2437) as part of a
 * broader re-check of every already-shipped blend weight — confirmed,
 * not changed: pooled accuracy climbs to a plateau across 0.85-1.0
 * (55.6-56.1%), with 0.9 (55.8%) sitting inside it, close behind the
 * nominal peak at 0.95 (56.1%) and ahead of the 1.0 boundary (55.9%).
 * See CLAUDE.md's four-season re-sweep (which also caught and fixed a
 * real bug in the first version of that re-sweep's harness — see there
 * for what it was).
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
 * in 0.1 steps against the full 2025-only backtest (RB accuracy): 0.1 ->
 * 58.1%, **0.2 -> 58.6% (peak)**, 0.3 -> 58.1%, 0.4 -> 56.7%, 0.5 ->
 * 55.7%, 0.6 -> 56.2%, 0.7 -> 57.1%, 0.8 -> 56.2% — 0.2 sat in the middle
 * of a genuine 0.1-0.3 plateau, not an isolated spike (see "Backtesting &
 * Tuning History" item 20 in CLAUDE.md for the full table).
 *
 * Re-swept against the pooled 2022-2025 sample (n=812) as part of a
 * broader re-check of every already-shipped blend weight — see CLAUDE.md's
 * four-season re-sweep. Unlike TE snap-share/WR drop-rate's re-sweeps
 * (both confirmed near-optimal unchanged), this one is a genuine
 * surprise: pooled accuracy is actually HIGHEST at w=0 (56.5%, i.e. no
 * red-zone-touches term at all) and declines through the shipped 0.2
 * (55.7%) down to a low around 0.4 (54.2%) before a partial recovery at
 * higher weights. By season, only 2025 favors the shipped weight (0→0.2:
 * 56.2%→59.1%); 2022/2023/2024 all do WORSE at 0.2 than at 0 (-2.0 to
 * -2.5pp each) — the opposite of the "every season improves" shape this
 * constant's original 2025-only tuning found. Deliberately left at 0.2
 * rather than resolved unilaterally — this interacts with
 * RB_EPA_BLEND_WEIGHT below (both apply to RB, sequentially), which
 * shows the same pattern, so a proper answer likely needs a joint
 * re-sweep of both together, not two independent one-at-a-time checks.
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
 * small pool (~100 pairs/season) makes this a much noisier curve than
 * VOLUME_BLEND_WEIGHT's — full 0.05-step sweep against the 2025-only
 * backtest bounced between 52.5-58.4% with no clean monotonic climb,
 * including a boundary peak at w=0.95-1.0 (58.4%) that would mean
 * discarding the existing blended score entirely for TE. Originally
 * settled on 0.4 (the middle of a two-point plateau at 0.35-0.4, 56.4%
 * on 2025 alone) rather than chase that boundary spike.
 *
 * Re-swept against the pooled 2022-2025 sample (n=405, ~4x the original)
 * as part of a broader re-check of every already-shipped blend weight —
 * see CLAUDE.md's four-season re-sweep. Confirmed, not changed: 0.4 is
 * now the genuine pooled peak (57.5%, up from 54.8-56.5% on either side —
 * 0.35 gives 57.0%, 0.45 gives 56.3%), a cleaner result than the original
 * 2025-only sweep found. Reasonably solid across seasons too (2022 56.4%,
 * 2023 54.9%, 2024 57.4%, 2025 61.4%).
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
 *
 * Re-swept against the pooled 2022-2025 sample (n=812) as part of a
 * broader re-check of every already-shipped blend weight — see CLAUDE.md's
 * four-season re-sweep. Same surprise as REDZONE_BLEND_WEIGHT_RB above:
 * pooled accuracy is highest at w=0 (56.2%) and declines steadily through
 * the shipped 0.3 (55.7%) down to 52.8% by w=0.6. By season, 2024/2025
 * still favor the shipped weight over 0 (roughly matching the original
 * out-of-sample finding), but 2022/2023 now do WORSE at 0.3 than at 0.
 * Deliberately left at 0.3 rather than resolved unilaterally — see
 * REDZONE_BLEND_WEIGHT_RB's comment for why this likely needs a joint
 * re-sweep with that weight rather than two independent checks.
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
 * POINTS_PER_DROP_RATE_UNIT) carries against the running WR score
 * (post-volume-blend; TE is exempted from this modifier entirely — see
 * engine.ts). Originally set to 0.2 from a two-season (2025/2024) sweep
 * — see CLAUDE.md item 33.
 *
 * Re-swept against the pooled 2022-2025 sample (n=812 WR pairs) as part
 * of a broader re-check of every already-shipped blend weight — see
 * CLAUDE.md's four-season re-sweep. Confirmed, not changed: 0.2 sits at
 * a genuine local peak (54.1%), backed by a real neighborhood (0.15
 * gives 53.9%, 0.25 gives 53.7%) rather than an isolated spike.
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

/**
 * Empirically-derived PPR points per unit of QB rushing EPA-per-play
 * (distinct from POINTS_PER_VOLUME_UNIT.QB/POINTS_PER_QB_RUSH_ATTEMPT,
 * which are about rushing VOLUME — this is about rushing QUALITY, EPA on
 * the QB's own carries). Unlike RB's rushing EPA (RB_EPA_REGRESSION_SLOPE
 * above), QB rushing EPA sums POSITIVE across every season tested
 * (2022-2025 pooled: +772.76 total, never negative in any individual
 * season) — so the plain "ratio of sums" method is safe here, no OLS
 * regression/intercept needed. Computed from the full 2022-2025 pooled
 * sample (35403.4 total QB PPR points ÷ 772.76 total rushing-EPA-summed-
 * by-rush-count), not just 2025 alone, since the whole point of this
 * signal was cross-season stability — see below.
 *
 * Distinct from `epaPerPlay`'s QB mapping (qbEpaPerDropback, a passing-
 * EPA signal already tested and rejected — item 31, 38.0%/44.0%, both
 * worse than chance). This reads the same `rushEpaPerPlay` field RB's
 * shipped EPA signal uses, just for a QB's own rush attempts.
 *
 * Standalone-tested notably more STABLE than every prior QB-rushing
 * signal in this document (total attempts, red-zone-only, goal-line-
 * only, NextGen rushYoe — all of which swung from clearly-below-chance
 * to clearly-above-chance across seasons): 58.6% (2022) / 59.4% (2023) /
 * 49.5% (2024) / 51.5% (2025) — never below chance, a real methodological
 * improvement even though the per-season conversion factor itself is
 * less stable (47.4 / 149.7 / 33.0 / 34.9) than the pick accuracy is.
 */
export const POINTS_PER_QB_RUSH_EPA = 45.814;

/**
 * How much weight QB rushing EPA (converted to points via
 * POINTS_PER_QB_RUSH_EPA) carries against the running QB score (post-
 * volume-blend, stacked alongside the other QB-rushing terms). Swept
 * 0-0.5 against the full 2022-2025 pooled sample: pooled QB accuracy
 * peaked at 58.1% (w=0.2, up from the 57.1% baseline), but 2024 declined
 * MONOTONICALLY at every nonzero weight tested (55.9%→50.0%) while 2022/
 * 2023/2025 improved or held roughly flat. At the whole-model level (all
 * four positions, not just QB) the effect is much smaller — 55.77%→55.93%
 * at w=0.2, since QB is only one of four position pools — and every
 * individual season still beat the simple recentVolume baseline at w=0.2,
 * including 2025 (currently the one season that narrowly loses to it at
 * w=0, and flips to winning at w=0.2). Shipped at 0.2 as a deliberate,
 * user-confirmed judgment call given that whole-model framing — a small
 * but real overall gain, accepting 2024's QB-specific decline as the
 * tradeoff, the same kind of explicit tradeoff decision as
 * QB_RUSH_BLEND_WEIGHT (item 30) and DROP_RATE_BLEND_WEIGHT (item 33).
 * See CLAUDE.md's QB-rushing-EPA follow-up to item 40 for the full sweep.
 */
export const QB_RUSH_EPA_BLEND_WEIGHT = 0.2;
