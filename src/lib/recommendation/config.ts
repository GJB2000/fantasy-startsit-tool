// Tunable weights for the rules-based recommendation engine.
// Adjust these as the recommendation logic gets tuned over time.

import type { ExtendedPosition, ScoringFormat, SkillPosition } from "@/lib/sportsdata/types";

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

/**
 * Max points the full modifier stack may move a skill player's projection
 * away from the recent/season-form baseline (blendedScore), in either
 * direction — combined with a hard floor at 0 (skill fantasy points are
 * never negative). A no-op for realistic players: the startable pool
 * never deviates more than ~8 points, so this never touches the backtest.
 * It exists to clip a real thin-sample pathology the live tool can
 * otherwise expose — a deep player with a fluky 1-target drop rate hits
 * the big POINTS_PER_DROP_RATE_UNIT factor and can project as low as -37
 * (the same uncapped-big-factor bug class item 66 fixed for qbRushEpa,
 * invisible to the pool-based projection backtest). 15 sits comfortably
 * above the pool's real range while still bounding the pathologies.
 */
export const FINAL_SCORE_DEVIATION_CAP = 15;

/** Absolute point gap at or below which two players are called a "close call". */
export const CLOSE_CALL_ABS_POINTS = 1.5;

/** Relative point gap (as a fraction of the higher score) at or below which two players are a "close call". */
export const CLOSE_CALL_RELATIVE_PCT = 0.08;

/**
 * Season-gap ranking guardrail (applied in engine.ts's compareBreakdowns).
 * When the recent-form window is thin, a modifier (volume, expert
 * consensus, matchup) can overturn a large season-long talent gap and
 * produce an obviously wrong pick — a backup over a star (the real
 * Lamar-Jackson-vs-Josh-Johnson case). If another candidate beats the
 * finalScore leader by BOTH at least RATIO× and ABS points on
 * season-to-date average, AND the comparison involves limited recent data
 * (so the recent signals that produced the flip aren't trustworthy), the
 * guardrail falls back to the season-long favorite. Cause-agnostic and
 * pairwise — a per-player score can't see the between-player gap. Both
 * conditions (ratio AND absolute) are required so it only fires on a
 * genuine star-vs-scrub gap, never on two comparable starters or two
 * low-scoring backups: this makes it a near-no-op on the adjacent-rank
 * pairs the backtest measures (their season averages are similar by
 * construction), so it targets the lopsided cases it exists for without
 * disturbing the validated close-call population. Not backtest-tunable for
 * that same reason (it doesn't fire on the test set) — a conservative,
 * reasoned safety rail, verified to fix the motivating case and to leave
 * the backtest numbers unchanged. See CLAUDE.md.
 */
export const SEASON_GAP_GUARDRAIL_RATIO = 1.6;
export const SEASON_GAP_GUARDRAIL_ABS = 5;

/**
 * Calibrated confidence: real historical pick accuracy as a function of
 * the |finalScore gap| between the two players, from an all-pairs
 * backtest over each week's startable pool, pooled 2022-2025 (see
 * CLAUDE.md). `[gapPoints, accuracyPercent]`, interpolated piecewise-
 * linearly and clamped at both ends. This supersedes the coarse 3-bucket
 * confidence (item 86, which was measured only on deliberately-close
 * adjacent-rank pairs and so had no "blowout" bucket): accuracy climbs
 * smoothly from a coin flip at gap~0 to ~79% at the largest realistic
 * startable gaps. ~79% is the honest ceiling for two rosterable players —
 * a bigger, obviously-lopsided call (a star vs. a scrub) is handled by the
 * season-gap guardrail, whose confidence feeds the SEASON-long gap through
 * this same curve.
 */
/**
 * Confidence floor when the recommended player is a listed depth-chart
 * starter (rank 1) and the alternative is a clear backup (3rd string or
 * deeper, or not on the chart at all AND well behind on season average).
 * The gap→accuracy curve tops out ~79% because it's calibrated on
 * *startable-pool* pairs (two rosterable players); a genuine starter over
 * a deep backup is a much higher-confidence regime than any startable
 * comparison, so it gets its own floor. A reasoned value (not backtest-
 * calibrated — the backtest never pairs a starter with a scrub), sized to
 * leave real headroom for the starter being injured/rested or a fluke
 * week. Live-only: depth-chart rank isn't populated in backtest mode, so
 * this never fires there. See CLAUDE.md.
 */
export const DEPTH_STARTER_CONFIDENCE = 90;

export const GAP_CONFIDENCE_CURVE: readonly (readonly [number, number])[] = [
  [0.5, 52],
  [1.5, 53],
  [2.5, 57],
  [3.5, 61],
  [5, 65],
  [7.5, 70],
  [11, 76],
  [15, 79],
];

/** Number of recent weeks of game logs used for the "recent performance" signal. */
export const RECENT_WEEK_COUNT = 4;

/**
 * Empirically-derived points scored per unit of recent volume, by
 * position and scoring format (points/game ÷ volume/game across every
 * played game of the 2025 season, using getFantasyPoints() for the
 * chosen format) — this is what makes VOLUME_BLEND_WEIGHT below a real,
 * unit-consistent blend rather than mixing points with raw target/touch
 * counts. QB: points per pass attempt. RB: points per touch (rushing
 * attempts + targets). WR/TE: points per target.
 *
 * QB was tried as pass+rush "touches" at several blend weights after
 * item 24's 2024 validation exposed a real gap for rushing QBs — see
 * CLAUDE.md item 25. Reverted: no tested weight was a clean win.
 *
 * half_ppr/standard recomputed the same "ratio of sums" way, same 2025
 * population, once scoring-format toggles shipped — see CLAUDE.md's
 * scoring-format item. QB barely moves across formats (QBs essentially
 * never record receptions); RB moves moderately (targets are part of
 * "touches"); WR/TE — genuinely reception-driven positions — drop
 * substantially under lower-PPR formats, exactly as expected.
 */
export const POINTS_PER_VOLUME_UNIT: Record<ScoringFormat, Record<"QB" | "RB" | "WR" | "TE", number>> = {
  ppr: { QB: 0.511, RB: 0.808, WR: 1.729, TE: 1.817 },
  half_ppr: { QB: 0.511, RB: 0.73, WR: 1.418, TE: 1.456 },
  standard: { QB: 0.51, RB: 0.653, WR: 1.106, TE: 1.095 },
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
 * not changed for PPR: pooled accuracy climbs to a plateau across
 * 0.85-1.0 (55.6-56.1%), with 0.9 (55.8%) sitting inside it, close
 * behind the nominal peak at 0.95 (56.1%) and ahead of the 1.0 boundary
 * (55.9%). See CLAUDE.md's four-season re-sweep (which also caught and
 * fixed a real bug in the first version of that re-sweep's harness —
 * see there for what it was).
 *
 * Per-format re-sweep (once baseline grading was format-aware
 * everywhere, item 51): Half-PPR's curve is flat/noisy across the whole
 * 0-1 range (54.8-55.5%, no real preference — kept at 0.9). Standard's
 * is genuinely different — accuracy climbs steadily toward the w=1
 * boundary rather than peaking mid-range, and a joint grid search with
 * SNAP_SHARE_BLEND_WEIGHT_TE confirmed w=1.0 as part of a real,
 * every-season-improving optimum for Standard specifically — see
 * CLAUDE.md's per-format weight re-sweep for the full story.
 *
 * Now PER-POSITION (not just per-format), after a dedicated per-position
 * PPR sweep on both pipelines. The broad "volume is redundant now that
 * expert consensus carries the score" hypothesis did NOT transfer: the
 * pooled nflverse pipeline liked low QB/TE weights, but the primary 2025
 * SportsDataIO pipeline (which the live tool uses) CRATERS QB without it
 * (61.8 -> 54.9 at w=0), so QB/WR/TE stay at their format values. Only RB
 * transferred: RB=0 (no volume term) beats 0.9 on BOTH pipelines (primary
 * RB 58.6 -> 59.6, pooled RB 59.0 -> 59.6) and tightens cross-season
 * variance (2022 RB 55.2 -> 58.1) — consistent with item 44 already
 * finding RB "over-signaled" (its red-zone/EPA terms are also zeroed):
 * recent form + consensus already capture RB value.
 *
 * RB=0 is PPR-only, confirmed by a follow-up sweep of Half-PPR and
 * Standard: it does NOT transfer to either — Half-PPR primary RB 52.7 ->
 * 51.2 at w=0 (worse), Standard primary RB 56.9 -> 49.0 (much worse), and
 * Standard wants its full weight on both pipelines. Coherent reason: PPR
 * RB scoring includes receptions (which form + consensus already capture,
 * making raw touch-volume redundant), but in Standard, RB points are
 * yardage/TD-only and noisier, so touch-volume genuinely de-noises and
 * should stay weighted. So Half-PPR RB stays 0.9 and Standard RB stays 1.0.
 * See CLAUDE.md's per-position volume-weight sweep.
 */
export const VOLUME_BLEND_WEIGHT: Record<ScoringFormat, Record<SkillPosition, number>> = {
  ppr: { QB: 0.9, RB: 0, WR: 0.9, TE: 0.9 },
  half_ppr: { QB: 0.9, RB: 0.9, WR: 0.9, TE: 0.9 },
  standard: { QB: 1.0, RB: 1.0, WR: 1.0, TE: 1.0 },
};

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
 * four-season re-sweep. One-at-a-time, pooled accuracy was highest at
 * w=0 (56.5% vs. the then-shipped 0.2's 55.7%) — the opposite of the
 * "every season improves" shape this constant's original 2025-only
 * tuning found. A follow-up joint 2D sweep with RB_EPA_BLEND_WEIGHT
 * confirmed it wasn't a one-at-a-time artifact: the pooled-accuracy
 * surface declines smoothly in both weights from a single (0, 0) peak
 * (57.5%) with no interior optimum anywhere in the grid. By season,
 * 2022/2023/2024 all improve substantially at (0, 0) (+3.0 to +3.9pp
 * each vs. the old 0.2/0.3), while 2025 — the season both signals were
 * originally validated on — declines (-2.9pp for RB alone, though at the
 * whole-model level 2025 was already only marginally beating the naive
 * recentVolume baseline either way, and disabling both flips that one
 * season from a narrow win to a narrow loss against that baseline; every
 * other season's margin over the baseline widens). Whole-model gain:
 * +0.62pp pooled (55.89%→56.50%), the largest single change found in
 * this four-season investigation. **Disabled (set to 0) as a deliberate,
 * user-confirmed judgment call** given that net picture — same
 * "explicit tradeoff, not resolved unilaterally" precedent as
 * QB_RUSH_BLEND_WEIGHT (item 30) and QB_RUSH_EPA_BLEND_WEIGHT (item 41).
 * `POINTS_PER_REDZONE_TOUCH_RB` above is kept, not deleted, same
 * precedent as every other zeroed-out signal in this file.
 */
export const REDZONE_BLEND_WEIGHT_RB = 0;

/**
 * Empirically-derived points per 100% offensive-snap-share equivalent
 * for TE, by scoring format (total points across every played TE
 * game-week with snap data, divided by total snap share over the same
 * set — same method as POINTS_PER_VOLUME_UNIT/POINTS_PER_REDZONE_TOUCH_RB).
 * Backtested standalone at 57.7% for TE before integration — the best
 * standalone signal found for TE, the engine's weakest position — see
 * CLAUDE.md item 14.
 *
 * half_ppr/standard recomputed the same way once scoring-format toggles
 * shipped — TE is a real reception-driven position, so this drops
 * substantially under lower-PPR formats (a TE's snaps translate to
 * fewer catches worth fewer points without the reception bonus).
 */
export const POINTS_PER_SNAP_SHARE_UNIT_TE: Record<ScoringFormat, number> = {
  ppr: 9.607,
  half_ppr: 7.698,
  standard: 5.788,
};

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
 * see CLAUDE.md's four-season re-sweep. Confirmed, not changed for PPR:
 * 0.4 is the genuine pooled peak (57.5%, up from 54.8-56.5% on either
 * side — 0.35 gives 57.0%, 0.45 gives 56.3%), a cleaner result than the
 * original 2025-only sweep found. Reasonably solid across seasons too
 * (2022 56.4%, 2023 54.9%, 2024 57.4%, 2025 61.4%).
 *
 * Per-format re-sweep (item 51's baseline-grading fix made this
 * possible): Half-PPR's TE curve actually declines as this weight
 * increases from 0 (58.5% standalone at w=0, falling to 54.3% by w=0.9)
 * — but TE's pool is thin/noisy (this project's chronic weak spot for
 * clean signals) and the whole-model impact of that shift is under
 * 0.5pp either way, so it was left at 0.4 rather than chased. Standard's
 * curve genuinely prefers a higher point (0.5, not 0.4) — confirmed via
 * a joint grid search with VOLUME_BLEND_WEIGHT as part of a real,
 * every-season-improving combined optimum — see CLAUDE.md's per-format
 * weight re-sweep.
 *
 * PPR LOWERED 0.4 -> 0.2 post-consensus (item 146): once TE's expert-
 * consensus weight went to 0.7 (item 145), snap share at 0.4 became
 * over-weighted (redundant with consensus, the same pattern as RB=0).
 * 0.2 beats 0.4 on BOTH pipelines (primary TE 56.4 -> 57.4, pooled 57.8
 * -> 58.3), cleaner by-season. Half-PPR/Standard left at 0.4/0.5 — the
 * sweep was PPR-only, matching the RB=0 scope.
 */
export const SNAP_SHARE_BLEND_WEIGHT_TE: Record<ScoringFormat, number> = {
  ppr: 0.2,
  half_ppr: 0.4,
  // Standard re-swept per format post-consensus (item 149): 0.5 -> 0.2, a
  // clean both-pipeline win (pooled TE 62.2 -> 63.5, all four seasons >=
  // baseline; primary 2025 TE 70.3 -> 71.3) — the same redundancy pattern
  // items 145/146 found for PPR (0.4 -> 0.2), now confirmed for Standard.
  // Half-PPR stays 0.4 (its sweep was noisy with 0.4 a local peak and the
  // primary pipeline flat — no clean signal to move it).
  standard: 0.2,
};

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
 *
 * half_ppr/standard recomputed once scoring-format toggles shipped —
 * barely move at all (3.929/3.925/3.920), since QBs essentially never
 * record receptions regardless of format.
 */
export const POINTS_PER_QB_RUSH_ATTEMPT: Record<ScoringFormat, number> = {
  ppr: 3.929,
  half_ppr: 3.925,
  standard: 3.92,
};

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
 * Minimum recent rush-attempts/game a QB needs before `qbRushModifier`
 * applies at all — 0 means "no gate, apply to everyone" (the original
 * shipped behavior). Added after a real user report (Matthew Stafford's
 * 2025 projections) traced to the same architectural flaw as the
 * already-fixed `qbRushEpaModifier` bug (item 66), just milder
 * per-instance since this signal uses real attempt counts, not a noisy
 * per-game EPA rate: blending a low-mobility passer's ENTIRE score
 * toward "expected points from rush attempts alone" systematically
 * drags it down, since that implied value is always far below a real
 * passer's actual (passing-driven) worth. Confirmed not
 * Stafford-specific — Baker Mayfield showed the identical pattern.
 * Being swept — see CLAUDE.md item 72 for the sweep and the decision.
 */
export const QB_RUSH_MIN_ATTEMPTS_THRESHOLD = 0;

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
 * four-season re-sweep. Same surprise as REDZONE_BLEND_WEIGHT_RB above,
 * one-at-a-time: pooled accuracy was highest at w=0 (56.2% vs. the
 * then-shipped 0.3's 55.7%). A follow-up joint 2D sweep with
 * REDZONE_BLEND_WEIGHT_RB confirmed both weights together are best at
 * (0, 0) — see that constant's comment for the full grid, by-season
 * breakdown, and the whole-model/baseline framing behind the decision.
 * **Disabled (set to 0) as a deliberate, user-confirmed judgment call**,
 * same precedent as QB_RUSH_BLEND_WEIGHT/QB_RUSH_EPA_BLEND_WEIGHT.
 * `RB_EPA_REGRESSION_SLOPE`/`RB_EPA_PPR_AT_ZERO` above are kept, not
 * deleted, same precedent as every other zeroed-out signal in this file.
 */
export const RB_EPA_BLEND_WEIGHT = 0;

/**
 * Empirically-derived points LOST per unit of drop rate (FTN Charting,
 * target-scoped WR/TE — see playByPlay.ts/ftnCharting.ts), same "ratio
 * of sums" method as every other rate factor (total receiver points ÷
 * total drop rate summed across every played WR/TE game-week of 2025
 * with charted-target coverage). Unlike every other signal in this
 * file, this is a "lower is better" metric — applied with a NEGATIVE
 * sign in engine.ts (a higher drop rate SUBTRACTS expected points, it
 * doesn't add them). Standalone-tested modest but stable across both
 * positions and both seasons (WR 52.4%→53.1%, TE 50.0%→54.8%) — see
 * CLAUDE.md item 33 for the integration/sweep story.
 *
 * half_ppr/standard recomputed once scoring-format toggles shipped —
 * a dropped pass costs meaningfully fewer points without the reception
 * bonus (182.75 → 148.75 → 114.74), the same reception-driven pattern
 * seen in every other WR/TE-scoped constant in this file.
 */
export const POINTS_PER_DROP_RATE_UNIT: Record<ScoringFormat, number> = {
  ppr: 182.75,
  half_ppr: 148.75,
  standard: 114.74,
};

/**
 * How much weight drop rate (converted to a point PENALTY via
 * POINTS_PER_DROP_RATE_UNIT) carries against the running WR score
 * (post-volume-blend; TE is exempted from this modifier entirely — see
 * engine.ts). Originally set to 0.2 from a two-season (2025/2024) sweep
 * — see CLAUDE.md item 33.
 *
 * Re-swept again post-consensus (item 146): raised 0.2 -> 0.3 after a
 * clean both-pipeline gain (primary WR 58.3 -> 59.3, pooled 55.7 -> 56.0).
 * The signal wanted MORE weight, not less — the opposite of the RB=0 /
 * snap-share redundancy findings, and the one real gain for WR (the
 * position the consensus-weight and volume-weight passes both left
 * untouched). Higher weights (0.4-0.6) keep nudging pooled up but start
 * costing 2025 WR, so 0.3 is the balanced peak. (Earlier the pooled
 * 2022-2025 re-sweep — CLAUDE.md item 43 — had confirmed 0.2 as the local
 * peak; the consensus retune since then shifted the optimum.)
 */
export const DROP_RATE_BLEND_WEIGHT: Record<ScoringFormat, number> = {
  ppr: 0.3,
  // Half-PPR re-swept per format (item 149): 0.3 -> 0.4, a clean both-pipeline
  // gain (pooled WR 56.5 -> 57.1, primary 2025 WR 55.2 -> 55.7; 0.4 is a real
  // peak, 0.5+ decline). Standard's own sweep kept 0.3 as the both-pipeline
  // peak, so it's unchanged. Previously a single shared scalar (0.3).
  half_ppr: 0.4,
  standard: 0.3,
};

/**
 * Points scored per full unit of WR air-yards-share, per format — ratio of
 * sums (sum WR format-points / sum WR air-yards-share) over 2022-2025 WR
 * game-weeks. Air yards share is a downfield-role signal, a different axis
 * than target count; validated standalone at ~56.6% for WR (item 14),
 * integrated for PPR in item 148.
 *
 * PPR = 40.43 (item 148, unchanged). Half-PPR/Standard added in item 150
 * (33.16 / 25.87) to fix a latent bug: this was a PPR-only scalar, so the
 * non-PPR air-yards modifier had been blending toward a PPR-scaled estimate
 * (~1.5x too large for Standard). Derived as 40.43 x the measured per-format
 * WR point-scaling (half/ppr 0.82, std/ppr 0.64), which keeps PPR at its
 * validated value. Standard's factor is present for completeness but unused
 * (its blend weight is 0 — see AIR_YARDS_SHARE_BLEND_WEIGHT).
 */
export const POINTS_PER_AIR_YARDS_SHARE_UNIT_WR: Record<ScoringFormat, number> = {
  ppr: 40.43,
  half_ppr: 33.16,
  standard: 25.87,
};

/**
 * WR-only air-yards-share blend weight, per format. Shipped at 0.1 for PPR
 * (item 148) — a small but clean both-pipeline WR gain (primary WR 59.3 ->
 * 60.3, pooled 56.0 -> 56.4, every season >= baseline), the first real WR
 * improvement after the consensus/volume/drop-rate passes. A narrow peak:
 * 0.05-0.1 is a real plateau, but 0.15+ declines (air yards correlates with
 * target volume already in the score, so a small marginal weight helps and
 * more double-counts).
 *
 * Half-PPR/Standard = 0 (item 149): air yards is a reception-correlated PPR
 * signal, and `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR` is a PPR-derived scalar,
 * so the earlier shared-scalar 0.1 was blending non-PPR scores toward a
 * PPR-scaled estimate (~1.5x too large for Standard) — a latent bug. Swept
 * with the correct per-format factor (item 149): air yards adds essentially
 * nothing to either non-PPR format, so it's disabled there rather than
 * carried at a mis-scaled weight. Standard's pre-fix primary-2025 WR was a
 * conv-factor artifact, not a real signal (see CLAUDE.md item 149 / former
 * Open Item #31). With the weight at 0 the mis-scaled factor never applies,
 * so the PPR-only `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR` scalar is left as-is.
 */
export const AIR_YARDS_SHARE_BLEND_WEIGHT: Record<ScoringFormat, number> = {
  ppr: 0.1,
  // Re-swept per format at the correct per-format conversion factor and the
  // current shipped drop-rate weights (item 150). Half-PPR wants air yards ON
  // at 0.15 — a real signal at its drop-rate 0.4 (both pipelines >= air-off:
  // pooled WR 56.0 -> 57.0, primary 55.2 -> 55.7). This corrects item 149's
  // read that air yards "adds nothing to non-PPR" — that was measured at the
  // pre-item-149 drop-rate 0.3; at 0.4 the interaction makes it a contributor.
  half_ppr: 0.15,
  // Standard = 0: with the correct conversion factor, air-off is the pooled
  // peak and primary is flat — air yards genuinely adds nothing here. Its
  // pre-fix primary-2025 edge was purely the PPR-conv-factor artifact.
  standard: 0,
};

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
 *
 * half_ppr/standard: unlike every other factor in this file, NOT
 * recomputed as a fresh "ratio of sums" against 2025-only data — doing
 * so would replace this constant's 4-season-pooled 45.814 with a
 * 2025-only value (confirmed by a real diagnostic run: the 2025-only
 * recomputation lands at 34.4, matching the 34.9 documented above for
 * 2025 alone, not the pooled 45.814), a real methodology downgrade this
 * feature shouldn't force. Instead, scaled the shipped pooled ppr value
 * by the half/standard-vs-ppr RATIO measured from that same 2025-only
 * diagnostic run (0.9990/0.9981) — QB rushing EPA barely moves by format
 * regardless (QBs essentially never record receptions), so this is a
 * safe, small adjustment either way.
 */
export const POINTS_PER_QB_RUSH_EPA: Record<ScoringFormat, number> = {
  ppr: 45.814,
  half_ppr: 45.77,
  standard: 45.725,
};

/**
 * How much weight QB rushing EPA (converted to points via
 * POINTS_PER_QB_RUSH_EPA) carries against the running QB score (post-
 * volume-blend, stacked alongside the other QB-rushing terms). Swept
 * 0-0.5 against the full 2022-2025 pooled sample: pooled QB accuracy
 * peaked at 58.1% (w=0.2, up from the 57.1% baseline), but 2024 declined
 * MONOTONICALLY at every nonzero weight tested (55.9%→50.0%) while 2022/
 * 2023/2025 improved or held roughly flat. Shipped at 0.2 for a while on
 * that whole-model pick-accuracy framing (small overall gain, accepting
 * 2024's QB-specific decline) — see CLAUDE.md item 41 for the original
 * sweep.
 *
 * **Disabled (reverted to 0) after the "Projection accuracy" backtest
 * mode (item 65) found this term was badly miscalibrated as a POINT
 * estimate**, a question pick-accuracy backtesting can't see (two
 * players both mis-projected in the same direction can still rank
 * correctly). Root cause: `qbRushEpaAvg` is an unweighted mean of
 * per-GAME EPA-per-rush rates, each computed over however many rush
 * attempts that QB happened to have that week — often just 1-4 for a
 * low-mobility passer. `POINTS_PER_QB_RUSH_EPA` (45.814) is a huge
 * multiplier because it was derived from a population-level EPA-per-rush
 * average that sits very close to zero — so any individual player's
 * small-sample average, even a modest one, gets blown up into an absurd
 * "expected points" figure (as extreme as -70 points seen in real 2025
 * data) with no cap to bound it (unlike matchupModifier's ±2.5 cap).
 * Low-mobility QBs are hit hardest and hit systematically: their rare
 * rush attempts are almost always low-value situations (broken pockets,
 * kneels), so `qbRushEpaAvg` comes back negative nearly every week,
 * dragging the whole score down even though rushing is a trivial part of
 * their actual fantasy value. Confirmed via a real diagnostic sweep
 * against every 2025 QB pool-week (n=204): disabling this term alone
 * took QB projection bias from -1.81 to +0.01 (i.e., from a real,
 * systematic under-projection to essentially perfectly calibrated) and
 * MAE from 7.96 to 6.93 — while every tested alternative (capping the
 * modifier, gating it below a minimum attempt count, scaling the weight
 * down partially) landed strictly between those two points on both
 * metrics, never matching disabling it outright on bias. Also reverts
 * the 2024 pick-accuracy cost this term always carried (see above) as a
 * side effect, not the primary reason. `POINTS_PER_QB_RUSH_EPA` above is
 * kept, not deleted, same precedent as every other zeroed-out signal in
 * this file.
 */
export const QB_RUSH_EPA_BLEND_WEIGHT = 0;

/**
 * Final ensemble stage — blends `scorePlayer`'s fully-computed
 * `finalScore` (every modifier above already applied) with a "pure
 * recent volume" estimate (`recentVolumeAvg * POINTS_PER_VOLUME_UNIT`,
 * the exact same basis the standalone `recentVolume` backtest baseline
 * uses — see `baselines.ts`'s `pickByRecentVolume`). Structurally
 * different from every other weight in this file: those each tune how
 * much ONE signal contributes to the running score; this one shrinks
 * the ENTIRE finalScore (matchup, snap share, drop rate, QB rushing
 * terms, all of it) proportionally toward a single simple baseline — a
 * standard variance-reduction technique (ensembling a tuned model with
 * a robust simple one), not a new football signal. 1.0 = pure engine
 * (no-op); lower = more weight on the simple volume estimate.
 *
 * QB showed ZERO benefit at any ratio, in any format, standalone — the
 * engine already clearly beats the `recentVolume` baseline there (a
 * real premise correction: this *was* a real 2025 QB gap per item 30a,
 * but was closed when item 41 shipped `QB_RUSH_EPA_BLEND_WEIGHT`) — so
 * QB stays 1.0 everywhere.
 *
 * The other three positions needed a THIRD validation step beyond the
 * usual pooled-sweep-then-by-season-check: this signal is sensitive
 * enough to exact recentVolumeAvg values that it doesn't reliably
 * transfer from the nflverse-only pooled sample to the PRIMARY
 * (SportsDataIO, live-2025) pipeline, even when both agree the
 * underlying data source is "the same season" — the two pipelines
 * compute/join volume and pair players differently enough (item 24) to
 * matter for a signal this marginal, something individual weight
 * tuning elsewhere in this file never surfaced. **RB and WR were
 * dropped after this check, not before**: RB's pooled gain (discovered
 * via a since-fixed harness bug that used PPR-based pairing for every
 * format) never reappeared once re-swept correctly. WR showed a real
 * pooled gain that DID reproduce, but every ratio large enough to move
 * the primary pipeline at all moved it the WRONG way, consistently,
 * across three separate format/ratio tests (PPR -0.5pp, Half-PPR
 * -0.5pp, Standard -2.4pp) — WR's signal apparently doesn't generalize
 * to the live data source at all. **TE is the only position that
 * survived**: strong, broad, near-zero-decline gains pooled (Half-PPR:
 * 3 seasons up, 1 flat, none down; Standard: 3 up, 1 flat, none down),
 * and on the primary pipeline specifically, TE never regressed —
 * either a real gain (confirmed at a nearby ratio tested alongside a
 * since-reverted RB change) or exactly zero measured effect (plausible
 * small-sample discreteness on TE's ~100-pair single-season pool, not
 * harm — confirmed harmless by testing a much more aggressive ratio and
 * watching picks actually flip in the expected direction). PPR TE was
 * tested and separately rejected on its own pooled evidence — its
 * curve was jagged/non-monotonic with ±2-3pp season swings in both
 * directions before the pipeline question even arose.
 *
 * See CLAUDE.md's ensemble item for the full investigation, including
 * the harness bug and how it was caught.
 */
export const ENSEMBLE_VOLUME_BLEND_RATIO: Record<ScoringFormat, Record<SkillPosition, number>> = {
  ppr: { QB: 1.0, RB: 1.0, WR: 1.0, TE: 1.0 },
  half_ppr: { QB: 1.0, RB: 1.0, WR: 1.0, TE: 0.7 },
  standard: { QB: 1.0, RB: 1.0, WR: 1.0, TE: 0.7 },
};

/**
 * How much weight the external consensus point estimate (SportsDataIO's
 * own weekly projections since item 161; FantasyPros' scrape before that)
 * carries against the running score, blended in last, after every other
 * modifier above. Unlike every conversion-factor-based signal in this
 * file, this one is already points-denominated — no POINTS_PER_X factor
 * needed, just a direct blend toward their own estimate. Deliberately
 * universal across all four skill positions rather than position-scoped
 * — the standalone `pickByExpertConsensus` baseline (item 69) validated
 * strong and consistent at every position (57.4-60.3% pooled pick
 * accuracy, 2022-2025), unlike almost every other signal in this
 * document, which needed scoping down to where it actually held up.
 *
 * Swept 0-1.0 against pooled 2022-2025 nflverse-only pick accuracy: a
 * real, well-behaved plateau across w=0.6-0.9 (58.0-58.2% overall, every
 * season improving or flat, no season dropping toward chance). But
 * because this modifier can touch a large fraction of the WHOLE score
 * (at w=1.0 it fully replaces the engine's own estimate with theirs),
 * item 53's ensemble-investigation precedent required a real check
 * against the PRIMARY SportsDataIO pipeline too, not just the pooled
 * nflverse-only number — so `loadRun.ts` was extended to fetch this
 * signal as well (previously only `loadRunNflverseOnly.ts` did). That
 * check found a genuine split: pooled nflverse-only data keeps improving
 * through w=0.7-0.9, but on the primary 2025 pipeline specifically, WR
 * accuracy is unchanged through w=0.5 (58.3%, identical to baseline) and
 * then declines as weight increases further (57.4% at 0.7, 53.4% at
 * 0.9) — every other position (QB especially: +8.8 to +10.8pp on the
 * primary pipeline) improves or holds flat across the whole range
 * tested. **Shipped at 0.5 as a deliberate, user-confirmed choice** —
 * captures nearly all of the overall gain (primary pipeline: 56.9%→58.7%
 * overall) with zero measured WR cost, rather than the pooled-data-
 * optimal 0.7-0.9 region, which trades a little more overall gain for a
 * real WR cost on the pipeline that actually matters for the live tool.
 * w=0.7 is a documented, deliberately-not-chosen alternative, not a
 * rejected one — see CLAUDE.md item 70's Open Items if this gets
 * revisited with more data.
 *
 * `input.expertConsensusR2pPts` is now populated in live mode too (see
 * CLAUDE.md's live-tool-wiring item) — this weight has a real effect on
 * the deployed Start/Sit, Trade Analyzer, and Waivers tools, not just
 * backtest-mode validation.
 *
 * Now PER-POSITION (item 145): a per-position sweep found the item-70
 * universal-0.5 compromise was leaving a clean, no-tradeoff win on the
 * table. QB wants FAR more consensus (peaks at 0.8 on BOTH pipelines —
 * primary QB 61.8 -> 66.7, pooled 60.5 -> 61.5; 0.9/1.0 both decline, so
 * it's a real peak) and TE wants a bit more (0.7: pooled 56.8 -> 57.8,
 * primary flat). WR must stay at 0.5 (primary WR declines above it — the
 * exact reason item 70 couldn't just raise the universal weight), and RB
 * is flat. Per-position weights serve all four at once. Net: primary
 * overall 59.02 -> 59.84 (+0.82pp), pooled 57.98 -> 58.31, no position
 * regressing on either pipeline. QB now leans 80% on the consensus
 * — a deliberate, user-confirmed shift toward the market signal for the
 * position where it's most predictive. See CLAUDE.md's per-position
 * consensus-weight sweep.
 *
 * RB 0.5 -> 0.9 and TE 0.7 -> 0.9 came later, when the consensus SOURCE
 * changed from the FantasyPros scrape to SportsDataIO's own weekly
 * projections (item 161). The old values were swept against FantasyPros'
 * r2pPts distribution and are simply the wrong optimum for a different
 * source — at them, SportsDataIO scores WORSE than FantasyPros (60.00% vs
 * 60.66%); re-swept, it wins (61.80%). These are plateau-picked, not peak:
 * the measured optima were RB 1.0 and QB 0.9, and RB 1.0 sits on the
 * boundary, which would mean the engine contributes nothing to an RB's
 * score — the shape item 20 rejected. Single-season evidence; see Open
 * Item #37.
 */
export const EXPERT_CONSENSUS_BLEND_WEIGHT: Record<SkillPosition, number> = {
  QB: 0.8,
  RB: 0.9,
  WR: 0.5,
  TE: 0.9,
};

/**
 * Replacement-level per-game fantasy value at each position — the per-game
 * scoring of a freely-available waiver player, i.e. the player at the
 * startable-pool cutoff (BROAD_MODE_POOL_SIZE: QB/TE #12, RB/WR #24; D/ST and
 * K #12, one per team in a standard league).
 *
 * This is what makes cross-position value comparable. Raw rest-of-season
 * points are NOT: every league starts a QB, and the worst startable QB
 * already scores ~17.5 a game, so a QB's raw total is inflated by a baseline
 * you can replace for free off waivers. What a player is actually worth in a
 * trade is the points he adds ABOVE that baseline. Used by evaluateTrade.ts
 * (every trade) and suggestLeagueTrade.ts, the same value-over-replacement
 * basis the Top 100 cross-position ranking already uses (buildRankings.ts).
 *
 * Derived empirically from the full 2025 season: each position's cutoff-
 * ranked player's per-game average, in each format (min 8 games for a
 * robust per-game). QB is format-invariant (QBs rarely catch passes) and
 * high, since QB is a shallow position (only 12 starters), so its
 * replacement level is a strong streamer. RB/WR/TE fall as reception
 * weight drops, as expected. D/ST and K are format-invariant too — neither
 * scores receptions — and are the lowest of all, which is why an elite
 * kicker or defense is still barely a trade asset. Same "2025-derived
 * constant applied across all backtest seasons" precedent as
 * POINTS_PER_VOLUME_UNIT et al.
 */
export const REPLACEMENT_PER_GAME: Record<ScoringFormat, Record<ExtendedPosition, number>> = {
  ppr: { QB: 17.47, RB: 12.15, WR: 12.22, TE: 10.58, DST: 6.71, K: 8.41 },
  half_ppr: { QB: 17.47, RB: 11.1, WR: 10.34, TE: 8.75, DST: 6.71, K: 8.41 },
  standard: { QB: 17.47, RB: 10.27, WR: 8.13, TE: 6.89, DST: 6.71, K: 8.41 },
};

/**
 * How much of a rest-of-season trade valuation comes from SportsDataIO's
 * season-long projection, versus the engine's own extrapolation (a player's
 * current per-game rate re-projected across every remaining opponent).
 *
 * 0 = pure extrapolation (the original behaviour), 1 = pure projection.
 *
 * Backtested on 430 synthetic 1-for-1 trades across cutoff weeks 1-12 of
 * 2025, graded against real rest-of-season totals: extrapolation alone
 * 58.33%, projection alone 64.88%, a 50/50 blend 64.88%. The blend ties the
 * projection on accuracy, so it's chosen for robustness rather than for a
 * bigger number — it keeps the engine's recent-form and matchup signal in
 * the valuation and degrades naturally for a player the projection feed
 * doesn't cover.
 *
 * Why extrapolation loses: it multiplies a single week's score — which is
 * heavily recent-form driven — across ten remaining games, so hot and cold
 * streaks get extrapolated. Rest-of-season value regresses toward true
 * talent, which a season-long projection captures better than a four-game
 * sample. The gap widens at LATE cutoffs (week 12: 63.9% vs 41.7%), which
 * is where a streak has had the most chance to distort the extrapolation.
 *
 * Single-season evidence — SportsDataIO's projections 401 for 2022-2024 on
 * this subscription. See Open Item #37.
 */
export const REST_OF_SEASON_PROJECTION_BLEND = 0.5;
