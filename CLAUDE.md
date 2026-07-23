# Project: [Tool Name TBD] — Fantasy Football Start/Sit Tool

## Overview
A web-based tool that helps fantasy football players decide who to start
each week when two or more players compete for the same roster spot.
Built for [Legitfootball]'s NFL/fantasy newsletter audience
(~16,000 subscribers today, targeting rapid growth). This is a competitive
build — one of several candidate tools being evaluated as a live, working
demo. The bar is a real, deployed tool using real current NFL data, not a
mockup.

## Who This Is For
Engaged fantasy football readers of [Legitfottball]'s newsletter — people
who already follow football closely and want a fast, trustworthy second
opinion on a tough lineup decision, delivered in a voice that fits the
newsletter's brand.

## Core User Flow (MVP)
1. User selects two (or more) players competing for the same roster spot
2. Tool pulls real, current stats and matchup data for each player
3. Tool runs a rules-based comparison (see "Recommendation Logic" below)
4. Tool displays a clear recommendation WITH reasoning — never just a
   verdict with no explanation

## Architecture
*(Fill in as the project takes shape — Claude Code should keep this
section current as real decisions get made.)*
- Framework: Next.js 16 (App Router, TypeScript), scaffolded via
  `create-next-app`
- Frontend: React 19, Tailwind CSS v4 for styling
- Backend: Next.js Route Handlers (`src/app/api/*`) — no separate
  backend service for now
- Database: TBD (not yet needed for MVP; add when persistence is
  required)
- Hosting: Vercel
- Version control: GitHub
- Football data source: SportsDataIO NFL API (Discovery Lab / free
  tier) — see [sportsdata.io](https://sportsdata.io)

Current state: v1 of the core start/sit comparison tool is live — real
player search, real SportsDataIO data, a rules-based recommendation
engine, and a working UI — plus a backtesting mode that replays the
engine against the completed 2025 season using only data that would
have been known before each tested week (see Conventions below for the
actual file layout). Out of scope so far: database/persistence, auth,
K/DEF positions, upcoming-schedule/next-opponent lookup (matchup
difficulty is computed against each player's most recent completed
opponent, not a hypothetical future one), multi-season history.

## Data Source Notes
- Football data comes from the SportsDataIO NFL API (Discovery Lab /
  free tier). API key is stored as the `SPORTSDATA_API_KEY` environment
  variable (`.env.local` locally, Vercel project env vars in
  production) — never hard-coded or committed to GitHub.
  (Note: an earlier version of this doc referenced football-data.org,
  which turned out to be a soccer-only API — not usable for this
  project.)
- Cache player/stat data rather than re-fetching on every page load —
  data doesn't need to be second-by-second fresh.
- Handle missing/edge-case data gracefully: bye weeks, injured players,
  rookies with limited history, mid-season trades. Never show a broken
  or blank result — show a clear, honest message instead.
- Historical `InjuryStatus` (on `PlayerGameStatsByWeek` rows) only ever
  contains `None`/`Out`/`Probable` — never `Questionable`/`Doubtful` —
  and `Out` correlates 1:1 with `Played===0`. Pregame injury uncertainty
  isn't reconstructable from **SportsDataIO's** data, which is why
  backtest mode's grading logic still treats injury status as unknown by
  default. nflverse's `injuries` release *does* have the real weekly
  Questionable/Doubtful/Out designations (see "Backtesting & Tuning
  History" item 18) and is used there for one standalone baseline test —
  but that's a backtest-only trial, not a change to how the live tool's
  own (already-real-time) injury flag works.
- **2024 (and presumably earlier) season data is NOT accessible on this
  plan** — confirmed directly: any 2024 request (e.g.
  `PlayerSeasonStats/2024`, `PlayerGameStatsByWeek/2024REG/1`) returns a
  clean `401 Unauthorized Season` with "contact sales@sportsdata.io" to
  unlock it. This means every "re-validate once a second season of data
  exists" caveat elsewhere in this doc refers to *waiting for the 2026
  season to complete under the current plan* — it is not a "just query
  an already-completed prior season" fix; that would require a paid
  tier upgrade.
- **SportsDataIO does not offer snap counts, target share, or air yards
  at any tier** — confirmed against the live NFL API doc catalog (not
  just skimmed): zero endpoints or fields for any of the three,
  anywhere. Red zone stats *do* exist as a real SportsDataIO product
  (`PlayerGameRedZoneStats`/`PlayerSeasonRedZoneStats`, plus "Inside
  Five"/"Inside Ten" variants) but live in their separate `stats`
  package — confirmed via a live `401 Access denied due to invalid
  subscription key` on that endpoint, the same failure shape as the
  2024-season lockout above, meaning it needs a paid tier upgrade, not
  a code change.
- **`src/lib/nflverse/`** is a second, free, no-auth external data
  source (the open-source nflverse/nflfastR project) added specifically
  to fill the snap-share/target-share/air-yards gap above — see
  Conventions and "Backtesting & Tuning History" item 14. It has no ID
  shared with SportsDataIO, so rows are joined onto SportsDataIO
  `PlayerID`s by normalized player name (`playerMatch.ts`) — validated
  at ~99% match on skill positions against the full 2025 roster; the
  small remainder is real nickname/full-name mismatches (e.g. nflverse's
  "Nate Carter" vs. SportsDataIO's "Nathan Carter"), dropped silently
  rather than hand-maintaining an alias table. A fetch failure from
  nflverse is caught and degrades to empty data (new baselines just
  report `no_pick`) rather than taking down the whole backtest — it's a
  third-party source being trialed, not the app's primary data path.

## Recommendation Logic Philosophy
This is the most important section — the "brain" of the tool.
- Start with transparent, rules-based logic (not a black-box model).
  Every recommendation should be explainable in plain English.
- Factors to weigh (adjust weighting here as we tune it):
  - Recent performance (last 4 weeks) — weighted more heavily than
    season-long average
  - Opponent/matchup difficulty for the player's position
  - Recent volume/opportunity (targets for WR/TE, rushing attempts +
    targets for RB, pass attempts for QB), blended against recent/season
    PPR points at a heavily volume-weighted ratio (`VOLUME_BLEND_WEIGHT`
    in `config.ts`) — the single strongest signal found so far. See
    "Backtesting & Tuning History" below for the full validation story
    and why the weights are set where they are.
  - Injury status (Questionable/Doubtful/Out) — flag prominently, but
    don't treat "Questionable" as an automatic bench
  - Red-zone touches (RB only) and offensive snap share (TE only,
    fixing the position's long-standing weak spot), both from nflverse
    (see Data Source Notes), blended into the running score the same
    way volume is (`REDZONE_BLEND_WEIGHT_RB`/`SNAP_SHARE_BLEND_WEIGHT_TE`
    in `config.ts`). Target share + separation (also nflverse) act as a
    WR-only close-call tiebreaker rather than a scoring factor — see
    "Backtesting & Tuning History" item 20 for why each was scoped the
    way it was.
  - [Add more factors here as they're decided]
- When it's a close call statistically, say so. Don't force false
  confidence.
- Every recommendation must include a short, human-readable "why."

## Backtesting & Tuning History
Narrative record of what was tried, what worked, and why — so this
reasoning isn't lost if we come back to tune this further. All numbers
below are from backtesting against the full completed 2025 season
(weeks 1-18), broad mode, all positions, adjacent-rank pairs (~612
pair-evaluations) unless noted otherwise. **Caveat that applies to every
number here**: this is validated against a single season. There's a real
risk some of this is tuned to 2025-specific dynamics rather than a
durable pattern — re-validate once a second season of data exists. Note:
that's the 2026 season completing under the *current* SportsDataIO
plan, not 2024 — confirmed that season is locked behind a paid tier
(see Data Source Notes).

1. **Built backtest mode first** (`/backtest`) specifically to check
   whether the engine's recommendations were actually good, not just
   plausible-sounding — replaying it week-by-week using only data
   known before each tested week (see "Recommendation Logic
   Philosophy" and `lib/backtest/`).
2. **First real result was humbling**: the engine scored ~50.3%
   accuracy on adjacent-rank pairs (statistically a coin flip), and was
   *beaten* by the dead-simple "pick whoever's averaged more points
   this season" baseline (~52.9%). A "prior week's points" baseline
   scored ~50.5% — also no better than the engine.
3. **Added permanent measurement tools to the backtest harness** (not
   just one-off checks) so this kind of gap gets caught going forward:
   baseline comparisons graded on identical weeks/matchups
   (`lib/backtest/baselines.ts`), a by-position accuracy breakdown, and
   a confidence-calibration check (`summarizeByCloseCall` in
   `grading.ts`) that splits accuracy by the engine's own "close call"
   flag.
4. **Confidence calibration finding**: "confident" picks (49.5%) and
   "close call" picks (50.5%) were statistically indistinguishable —
   the close-call flag wasn't predicting anything at this scale. Caveat:
   broad mode's adjacent-rank pairing methodology already selects for
   closeness, which compresses how much room the flag has to
   differentiate — a real finding, but partly an artifact of the test
   set's construction, not proof the concept is useless everywhere.
5. **By-position breakdown**: QB/RB/WR clustered near 50-52% (no
   meaningful difference between them); TE was a clear laggard at
   ~43.6% — likely a smaller, noisier position pool, not investigated
   further yet.
6. **Went looking for a better signal**: noticed the SportsDataIO
   responses already include `ReceivingTargets`/`RushingAttempts`/
   `PassingAttempts` per game (volume/opportunity stats), but the app
   only used `FantasyPoints(PPR)` — raw points are noisy because
   touchdowns are highly random; volume is a more stable predictor.
7. **Validated volume as a standalone baseline before touching the
   engine** (`pickByRecentVolume` in `baselines.ts`): **56.6% accuracy
   alone** — clearly the strongest signal found, beating every other
   baseline and the engine itself by a wide margin.
8. **First engine-integration attempt made things *worse*** (49.5%,
   down from 50.3%). Root cause: the modifier compared each player's
   volume against one static per-position reference number
   (`VOLUME_REFERENCE`), but broad mode's top-N "startable" player pool
   clusters almost entirely *above* that reference for every position
   (e.g. real top-24 WRs ranged 7.0-11.7 targets/game against a
   reference of 7) — so nearly everyone got a small positive nudge with
   little room to actually differentiate between two specific players.
   A weak, conservative scale (`VOLUME_MODIFIER_PER_UNIT=0.1`,
   `CAP=2`) just wasn't enough to matter, and what little effect it had
   landed slightly negative.
9. **Empirically tuned the scale against the real backtest** (not
   guessed) rather than accepting that regression:
   `PER_UNIT`/`CAP` → overall accuracy: `0.1/2` → 49.5% (worse) → `0.5/8`
   → 53.4% → `1.0/15` → 54.6% → `2.0/30` → 55.1% but with uneven
   per-position swings (WR dipped, TE jumped sharply) — a sign of
   overfitting to this one season's sample rather than genuine signal.
10. **Settled on `PER_UNIT=1.0`/`CAP=15`** — the more conservative,
    broadly-consistent point on that curve rather than the single-run
    peak. Final result: **~54.6% overall, every position (QB/RB/WR/TE)
    beating chance** — a real, validated improvement over the
    pre-volume 50.3%, though still short of the standalone 56.6% volume
    baseline (meaning there's likely still room to improve how volume
    is weighted relative to the PPR-based blend — flagged here rather
    than chased further, to avoid over-tuning to a single season). Post-
    volume by-position breakdown: RB 56.7%, QB 55.9%, WR 53.9%, TE
    50.5% — RB/QB benefited most (touches/attempts are a very clean
    signal there), TE remains the weakest, still just above chance.
11. **Audited the API response for other unused-but-available fields**
    (per the same "volume was sitting there unused" logic): nothing
    else at the player level looked promising (remaining fields are
    mostly noisy efficiency/rate stats already implicitly captured by
    PPR points, or defensive stats irrelevant to skill positions). Found
    a separate `TeamGameStats` endpoint (team-level, `odds` API host —
    see `client.ts`'s `API_BASES`) with `OffensivePlays`,
    `PassingAttempts`/`RushingAttempts` at the team level — a
    theoretically legitimate, non-leaky proxy for "game script" (teams
    that pass more give their pass-catchers more opportunity).
12. **Tested team pace/pass-rate as a standalone baseline before
    touching the engine** (`pickByGameScript` in `baselines.ts`,
    `lib/sportsdata/teamGameStats.ts` for the point-in-time team
    aggregation) — **result: 47.5% accuracy, actually worse than
    chance.** Not integrated into the engine. Best guess why: broad
    mode already pairs players by season-average rank, which reflects
    each player's individual role/target-share within their own
    offense — but team-level pace/pass-rate is blind to that (a WR3 on
    a fast, pass-heavy team doesn't necessarily outproduce a WR1 on a
    slower one), so it doesn't add the kind of differentiation this
    test needs. Kept in the harness for reference (same as the other
    baselines) but explicitly not shipped — a documented negative
    result, not silently dropped.
13. **Retuned the PPR-vs-volume blend properly, without adding any new
    signal.** The old `VOLUME_REFERENCE`/`PER_UNIT`/`CAP` mechanism
    (distance from a static per-position reference point, capped) mixed
    raw volume units with PPR points inconsistently, so "how much weight
    does volume get" was never a real, interpretable single dial.
    Replaced it with a genuine weighted blend:
    `finalScore = (1-w) * blendedScore + w * expectedPointsFromVolume +
    matchupModifier`, where `expectedPointsFromVolume =
    recentVolumeAvg * POINTS_PER_VOLUME_UNIT[position]` — a real
    points-per-target/touch/attempt conversion factor computed
    empirically from the full 2025 season (QB 0.511 pts/attempt, RB
    0.808 pts/touch, WR 1.729 pts/target, TE 1.817 pts/target), not
    guessed. Swept `w` from 0 (pure points) to 1 (pure volume) against
    the full backtest: 0→50.3%, 0.25→50.7%, 0.5→52.8%, 0.75→53.9%,
    0.85→54.6%, **0.9→55.4% (peak)**, 0.95→55.1%, 1.0→54.6%. Accuracy
    climbs steadily as volume gets more weight and stays in a
    well-behaved 54.6-55.4% plateau across 0.85-1.0 with every position
    moving consistently (no erratic single-position swings like the old
    mechanism showed at high scale) — `w=0.9` sits in the middle of that
    plateau, not an isolated spike. **New result: ~55.4% overall**,
    narrowing the gap to the standalone volume baseline's 56.6% ceiling
    from 2.0pp down to 1.2pp. `w=0.9` also means the final formula
    leans heavily on volume — a notable, honest finding in itself: for
    this data source and test methodology, recent opportunity predicts
    next-week production better than recent points do.
14. **Went looking for more signals in the same family** (player-level
    opportunity, not team-level) — snap share, target share, and air
    yards share. SportsDataIO doesn't offer any of the three (snap
    counts aren't in its NFL API at all; red zone stats exist as a
    product but 401'd as outside our subscription tier — see Data
    Source Notes), so pulled them from **nflverse** instead (see Data
    Source Notes and `src/lib/nflverse/`), joined onto SportsDataIO
    `PlayerID`s by normalized name (~99% match rate on skill positions,
    validated against the full 2025 roster before trusting any backtest
    number built on it). Tested each standalone via new
    `baselines.ts` pickers (`snapShare`, `targetShare`, `airYardsShare`),
    same harness/rules as every other baseline. **Results (overall):**
    snap share 52.4%, target share 54.4%, air yards share 52.9% — all
    positive but short of the recent-volume baseline's 56.6%. **By
    position, the picture is uneven**: target share and air yards share
    are clearly WR signals (55.6%/56.6%, both beating the shipped
    engine) but are close to a coin flip or worse at TE (49.0%/44.9%)
    and are near-meaningless at QB (most QB pairs tie near-zero target
    share, leaving only ~12 of 102 QB pairs decided at all — not a data
    problem, just two starters splitting essentially 100% of their
    team's dropbacks). Snap share inverts that pattern: it's TE's best
    baseline of the bunch (57.7%) but weak at QB (46.6%, also mostly
    ties). **Not integrated into the engine yet** — standalone numbers
    only, per the same "prove it before wiring it in" discipline used
    for volume and game-script; red zone touches (the third signal
    originally proposed) was deliberately held for a later pass since it
    has no pre-aggregated nflverse file and would need full play-by-play
    aggregation — a heavier lift than the two shipped here.
15. **Made the QB exemption from item 14 an explicit rule, not an
    emergent side effect.** `pickBySnapShare`/`pickByTargetShare` in
    `baselines.ts` now return `no_pick` for any pair involving a QB
    (`pickByNflverseStat`'s `skipPositions` param), rather than relying
    on near-universal ties to filter QB out of the accuracy calculation
    naturally. Confirmed the aggregate barely moves either way (snap
    share 52.4%→53.3%, target share 54.4%→54.1% — QB's own decided-pair
    count was already tiny relative to the total), so this is about
    correctness/intent, not chasing a bigger number.
16. **Tested NextGen Stats** (`src/lib/nflverse/nextGenStats.ts` — real
    NFL-tracked player tracking data, not derived from play-by-play; see
    Conventions) as a further audit of "what's sitting unused," the same
    logic that originally found the volume signal. Pulled the metrics
    that looked most likely to add something new: for QB, completion %
    above expectation (`cpoe`) and "aggressiveness" (% of throws into
    tight coverage) — specifically hoping to find *something* that
    differentiates QBs, since items 14/15 established that target share
    and snap share structurally can't. For receivers, average separation
    from the nearest defender and YAC above expectation. For RB, rush
    yards over expected per attempt. **Results were mostly a negative
    finding**: `cpoe` 44.0% and `aggressiveness` 46.0% (both *worse* than
    chance, n=100 QB pairs) — the hoped-for QB signal did not
    materialize; accuracy in football and fantasy-scoring value aren't
    the same thing, and a QB's fantasy output is driven far more by
    volume/TDs than by how far above expected his completion rate runs.
    `rushYoe` (RB) also came in worse than chance at 44.6%. The one real
    positive: `separation` (receivers) at 54.0% overall, holding up
    consistently at both **WR (54.1%) and TE (53.8%)** — a genuine,
    position-stable signal, though still short of target share's 54.1%
    (post-QB-exemption) and well short of recent-volume's 56.6%.
    `yacAboveExpectation` split by position in a way worth flagging
    rather than averaging away: WR 48.5% (below chance) vs. TE 55.9%
    (clearly above) — plausibly because a TE's fantasy value leans more
    on manufactured yards-after-catch on shorter throws, where a WR's
    leans more on separation/target volume itself; not chased further.
    **None of the four integrated into the engine** — standalone numbers
    only, same discipline as items 14/12.
17. **Combined target share and separation** (`pickByReceivingComposite`
    in `baselines.ts`) — the two standalone signals validated in items
    14/16 — to test whether stacking signals beats either alone.
    Averaging them was a non-starter (a share fraction and yards of
    separation have no shared unit without inventing one), so combined
    by **agreement** instead: pick whoever both signals favor, fall back
    to whichever one has data when only one does, `no_pick` if they
    disagree. Result depends heavily on position, in a way worth reading
    carefully rather than averaging away: **WR 59.2%** (n=103 of 204
    decided) — the single best number in this entire investigation,
    beating recent-volume (56.6%) and the shipped engine (55.4%) outright
    — but **TE 51.6%** (barely above chance; target share is already
    weak at TE per item 14, so requiring agreement with it mostly just
    throws away separation's own 53.8% and gains nothing) and **RB
    55.2%**, identical to target share alone, since separation has no RB
    rows at all and the fallback rule reduces to target-share-only there.
    Overall blended: 55.7% (n=368 of 610 decided). The real story is the
    coverage/precision tradeoff, not the headline number: at WR, this
    approach roughly halves how often it produces a pick (103 of 204 vs.
    ~196 for target share alone) in exchange for a large accuracy jump on
    the pairs it does commit to — a genuine "high-confidence overlay"
    signal for WR specifically, not a general replacement for anything.
    **Not integrated into the engine** — if this gets pursued further,
    it should be scoped to WR only (mirroring the QB exemption in item
    15) rather than applied blindly across positions.
18. **Tested nflverse's `injuries` release** (`src/lib/nflverse/
    injuries.ts`) — the data source that fixes the gap flagged
    repeatedly in Data Source Notes: SportsDataIO's archived data can't
    distinguish Questionable/Doubtful from simply not playing, but
    nflverse's weekly injury report has the real pregame designations
    (1,280 Questionable / 106 Doubtful / 1,396 Out rows across the full
    2025 season). Built `pickByInjuryStatus` — pick whoever's *less*
    injured when the two players' current-week report status differs
    (`Out` > `Doubtful` > `Questionable` > no report), the one baseline
    in the whole harness that looks up a **current-week** fact rather
    than averaging a trailing usage tendency (see `nflverseStatForWeek`
    in `weekData.ts`, added alongside the existing recent-window
    `recentNflverseByPlayer`). **Result: 55.4% overall (n=65 of 611
    decided)** — a real edge, roughly matching the shipped engine's own
    accuracy, but the standout number here is coverage, not accuracy:
    only ~10.6% of pairs have one player injured and the other not, so
    this is a rare-but-useful signal rather than a broadly applicable
    one. By position (all small samples, read with caution): RB 63.2%
    (n=19), QB 66.7% (n=3, too small to trust), WR 51.7% (n=29), TE
    50.0% (n=14). **Not integrated into the engine** — the live tool
    already flags live injury status separately (see Recommendation
    Logic Philosophy); this result says that *if* the live tool ever
    needed a fallback signal for genuinely unknown/ambiguous injury
    cases, official report status would be a reasonable one, but it
    isn't a general-purpose scoring factor given how rarely it applies.
19. **Tested red-zone touches** (`src/lib/nflverse/playByPlay.ts`) —
    the third signal from the original "player-level opportunity" list
    (items 14/16), deliberately held back since it's the only one with
    no pre-aggregated nflverse file. Required aggregating the full
    play-by-play release (`pbp`, ~98MB decompressed CSV/season) by
    filtering `yardline_100 <= 20` and counting rush attempts +
    targets per player per game — resolved to SportsDataIO `PlayerID`s
    via a two-hop join (play-by-play uses `gsis_id`, not name, so
    `players.ts` reads nflverse's ID crosswalk release first, then the
    usual name-normalization join). Fetch + parse + aggregate runs in
    ~5-7 seconds cold and is cached in-process after, same as every
    other nflverse source. Unlike the share/rate metrics elsewhere in
    this file, a real zero here is meaningful (played, but no red-zone
    role that game), so `pickByRedZoneTouches` walks the player's
    actually-played weeks and defaults missing nflverse rows to 0
    rather than filtering them out. **Result: 50.2% overall (n=550) —
    dead even with chance**, but that average hides a real, mixed
    picture: **RB 58.2%** (n=189, one of the stronger position-specific
    numbers in this whole investigation) vs. **WR 43.0%** (n=186,
    clearly *worse* than chance). Best guess why: a bellcow RB's
    red-zone rush share is a stable, low-variance role signal, while a
    single game's red-zone targets to a given WR is a small, TD-variance-
    heavy count that doesn't carry over reliably week to week. QB 49.5%
    and TE 48.8% were both near chance. **Not integrated into the
    engine** — if pursued, RB-only, mirroring the WR-only scoping note
    on item 17.
20. **Integrated three of the standalone-validated nflverse signals into
    the live engine** — the first time anything from items 14-19 moved
    past a backtest-only trial. Picked the three with a clear,
    defensible position scope rather than every positive number found:
    - **RB: red-zone touches**, as a second additive blend on top of
      the existing volume blend: `runningScore = blendedScore +
      matchupModifier + volumeModifier`, then `finalScore =
      (1-w)*runningScore + w*expectedPointsFromRedZone` where
      `expectedPointsFromRedZone = recentRedZoneTouchesAvg *
      POINTS_PER_REDZONE_TOUCH_RB`. `POINTS_PER_REDZONE_TOUCH_RB=4.797`
      computed the same "ratio of sums" way as `POINTS_PER_VOLUME_UNIT`
      (total RB PPR points ÷ total RB red-zone touches across every
      played game-week of the 2025 season) — red-zone touches convert
      to points at ~6x the rate of touches in general, which tracks
      (they're disproportionately touchdown chances). Swept `w` in 0.1
      steps against the full backtest (RB accuracy): 0.1→58.1%,
      **0.2→58.6% (peak)**, 0.3→58.1%, 0.4→56.7%, 0.5→55.7%, 0.6→56.2%,
      0.7→57.1%, 0.8→56.2% — settled on **0.2**, the middle of a real
      0.1-0.3 plateau.
    - **TE: snap share**, same additive-blend shape, stacked after the
      red-zone term (a no-op for non-RB players either way, so order
      doesn't matter in practice — a player is never both RB and TE).
      `POINTS_PER_SNAP_SHARE_UNIT_TE=9.607` (points per 100%-snap-share
      equivalent), computed the same way. This curve was **much noisier**
      than volume's or red zone's — TE's pool is smaller (~100 pairs) so
      single pairs flipping swing accuracy by ~1pp — full 0.05-step sweep
      bounced 52.5-58.4% with no clean monotonic climb, including a
      boundary peak at w=0.95-1.0 (58.4%) that would mean discarding the
      existing blended score for TE entirely. Deliberately rejected that
      edge peak — same "don't chase an isolated spike" discipline as
      `VOLUME_BLEND_WEIGHT` and the old capped-volume-modifier's CAP=30
      rejection (item 9) — and settled on **0.4**, the middle of a
      genuine two-point plateau at 0.35-0.4 (56.4%) that keeps the blend
      meaningfully anchored to both signals.
    - **WR: target share + separation, as a close-call tiebreaker, not
      a scoring factor.** Unlike the two above, this doesn't touch
      `finalScore` — `comparePlayers` computes the normal ranking first,
      and only when the top two candidates are both WR, it's already a
      close call, *and* target share and separation independently agree
      on the same player does it flip the winner and clear the
      close-call flag. Chose the strict "both signals present and
      agree" rule (not the backtest baseline's single-signal fallback)
      since that's the specific configuration that was actually
      validated at 59.2% (item 17) — the fallback case is materially
      weaker and already partially captured by the existing blend.
    - **Result: overall engine accuracy 55.4% → 57.05%**, every position
      improving (QB 56.9%, RB 58.6%, WR 55.9%, TE 56.4% — TE's jump is
      the biggest single move, targeting the position that's been the
      weak link since the volume work in items 6-13).
    - **Live-mode wiring, not just backtest**: `PlayerComparisonInput`
      gained an `nflverse: NflverseSignals` field (`snapShare`/
      `targetShare`/`separation`/`redZoneTouches`), populated by both
      `buildBacktestInput.ts` (from the already-loaded `weekSlice`) and
      `buildInput.ts` (live — via new `nflverseLive.ts`, which fetches
      the same seven nflverse sources for the current season and builds
      the same `PlayerID -> week -> stat` table `loadRun.ts` builds for
      backtest, fetched once per `/api/compare` request and shared
      across every player being compared, mirroring how
      `positionDefenseTable` already works). Both builders share one
      new pure module, `src/lib/nflverse/aggregate.ts`
      (`averageSnapShare`/`averageTargetShare`/`averageSeparation`/
      `averageRedZoneTouches`), so "what counts as a player's recent
      signal value" has one source of truth rather than being redefined
      per call site. Verified live end-to-end (not just backtest) via
      real `/api/compare` requests: a real RB pair correctly flipped on
      red-zone touches, a real TE pair's snap share modifier fired and
      degraded gracefully to `null`/no-modifier for a player with no
      recent games, and a blowout WR pair correctly left the close-call
      override untouched (it only ever fires on genuine close calls,
      confirmed separately at scale by every close WR-WR pair already
      exercised in the backtest). Added `export const maxDuration = 30`
      to `/api/compare/route.ts` (matching the backtest routes) since a
      cold nflverse cache means aggregating the full play-by-play release
      (~5-7s) on top of everything the route already does.
21. **Re-ran the confidence-calibration check (item 4) after item 20's
    engine changes** — the flag is now genuinely differentiated (a real
    ~4.3pp gap: confident 54.2% vs. close-call 58.5%, n=212/400), a big
    change from item 4's ~1pp gap that was statistically noise. **But
    the gap runs backwards**: close-call picks are now *more* accurate
    than confident ones, not less — the opposite of what a working
    confidence flag should show. Isolated whether the WR tiebreaker
    (item 20) caused this by temporarily disabling just its
    `isCloseCall = false` effect and re-running: **the inversion
    predates the tiebreaker** (confident 52.4% vs. close-call 57.0%
    with it off, still a ~4.6pp backwards gap) — it's a pre-existing
    property of the volume/red-zone/snap-share tuning, not something
    the tiebreaker introduced. The tiebreaker's actual marginal effect
    is a small, real improvement: it reclassifies ~86 pairs from
    close-call to confident (exactly the WR pairs where target share
    and separation agreed and flipped or confirmed the pick), and those
    reclassified picks lift confident's accuracy (52.4%→54.2%) while
    narrowing the backwards gap slightly (4.6pp→4.3pp) — moving
    genuinely-resolved calls into the right bucket, without fixing the
    underlying inversion. **Not investigated further yet** — worth a
    dedicated pass on *why* confident picks underperform close-call
    ones (candidate hypothesis, untested: `dataQuality !== "full"` is
    one of two conditions that sets `isCloseCall`, alongside the score
    gap — if those two triggers behave very differently, blending them
    into one flag could itself be masking a real signal), flagged here
    rather than guessed at.
22. **Tested item 21's hypothesis directly** — added a temporary
    diagnostic field splitting `isCloseCall`'s two triggers apart
    (score gap ≤ threshold vs. either player's `dataQuality !== "full"`)
    and re-ran the full backtest bucketed by which one actually fired
    for each close call. **Confirmed the hypothesis exactly**: the two
    triggers behave completely differently, and blending them was
    masking a real signal.
    - **Pure score-gap close calls** (gap small, both players' data
      full): **51.1% (n=47)** — a genuine coin flip, exactly what a
      working "close call" flag should show.
    - **Pure data-quality close calls** (gap was *not* small, but one
      player had limited/insufficient data): **59.5% (n=234)** —
      *more* accurate than "confident" (54.2%), not less.
    - **Both triggers at once**: **59.7% (n=119)** — tracks the
      data-quality number, not the gap number.
    - So the backwards inversion in item 21 is entirely a data-quality
      artifact, not a score-closeness one: limited-data comparisons
      (early season, rookies, players back from injury — fewer recent
      games to average) are apparently *easier* to call correctly than
      "confident" full-data ones, plausibly because those situations
      more often involve one clearly-lesser option rather than two
      genuinely comparable ones. The genuine score-gap signal (51.1%)
      was there all along, just diluted by being counted together with
      a differently-behaved trigger three times its size (234 vs. 47
      decided pairs).
    - **Practical implication, not yet acted on**: the live tool's
      "Close call — lean X, but it's not a lock" headline currently
      fires identically for both triggers, but historically the
      data-quality trigger's picks are *more* trustworthy than a
      "confident" pick, while the pure-gap trigger's picks really are a
      toss-up. Telling a user "trust your gut" on a limited-data call is
      probably mismatched framing given this result — flagged here as a
      real, validated finding; splitting the flag/headline language
      into the two cases is a deliberate design decision to make
      separately, not a byproduct of this diagnostic. Diagnostic field
      was temporary and has been removed from the shipped code
      (`engine.ts`/`types.ts`/`runBacktest.ts` are back to their
      pre-item-22 state) — the numbers above are the only lasting
      artifact of this investigation.
23. **Acted on item 22's finding: split `isCloseCall` into two real,
    permanent flags** — `isCloseCall` (score gap alone, no data-quality
    issue) and `hasLimitedData` (either top candidate's `dataQuality
    !== "full"`, regardless of gap). The WR tiebreaker (item 20) still
    gates on *either* trigger (a new `anyUncertaintyTrigger` local,
    preserving its original validated behavior exactly) — only the
    user-facing flag/headline changed. `comparePlayers` now returns
    three mutually-exclusive states instead of two: `isCloseCall` (real
    toss-up — unchanged "Close call — lean X, but it's not a lock."
    headline), `hasLimitedData` (new: "Start X — though we have
    limited recent data on at least one of these players.", no hedging
    on the pick itself, since the data shows these are reliable), or
    neither ("Start X."). `ComparisonResult.tsx`'s banner now has a
    third color (sky, alongside the existing amber/emerald) for the
    `hasLimitedData` state. `grading.ts`'s `ConfidenceBreakdown`
    (`summarizeByCloseCall`) is now a 3-way split to match, surfaced as
    a third row in `BacktestSummaryView`. **Re-ran the full backtest to
    confirm**: overall engine accuracy unchanged at 57.05% (confirms
    this only changed labeling/headlines, not any actual pick), and the
    three buckets now cleanly separate exactly as item 22 predicted —
    confident 54.2% (n=212, unchanged), close-call 51.1% (n=47, the
    genuine coin-flip cases), limited-data 59.5% (n=351, the reliable-
    but-previously-mislabeled cases). Verified live end-to-end via two
    real `/api/compare` requests: the earlier TE pair with one player
    missing recent games now correctly says "though we have limited
    recent data" instead of "Close call," while a genuinely close RB
    pair still gets the original "Close call" framing.
24. **Built a second, nflverse-only backtest pipeline specifically to
    validate the tuned weights out-of-sample against 2024** — every
    number in this document through item 23 is validated against a
    single season (2025) only, since SportsDataIO returns `401
    Unauthorized Season` for any 2024 request on this plan (confirmed
    live again before starting this work), the same lockout documented
    in Data Source Notes. nflverse itself has full 2024 coverage in the
    identical format for everything already used (confirmed live:
    `snap_counts_2024.csv`, `stats_player_week_2024.csv`,
    `injuries_2024.csv`, `play_by_play_2024.csv` all exist).
    - **The existing backtest pipeline couldn't just point at 2024** —
      it depends on SportsDataIO for far more than the supplementary
      nflverse signals: grading (was the pick actually right?),
      position-defense tables, season-to-date aggregation, and byes all
      come from `PlayerGameStatsByWeek`/`Byes`, which are blocked for
      2024. Building a second, fully nflverse-sourced pipeline was the
      only path that didn't require a paid tier upgrade.
    - **Key design insight that kept this from being a full rewrite**:
      every downstream consumer (`weekData.ts`, `pairing.ts`,
      `grading.ts`, `buildBacktestInput.ts`, `engine.ts`) is written
      against the `PlayerGameStat`/`Player` *interfaces*, not against
      SportsDataIO specifically. So the only genuinely new code needed
      was a loader that constructs those same shapes from nflverse's
      `stats_player` release instead — everything downstream runs
      completely unmodified. New files: `nflverse/gameLog.ts` (builds
      `PlayerGameStat[][]` from `stats_player_week_{season}.csv` —
      "Played" inferred as "row exists for this player-week," since
      nflverse's `calculate_stats()` only emits a row when a player
      recorded a snap-worthy stat, the same practical signal
      SportsDataIO's `Played` flag encodes; PlayerIDs are synthetic,
      assigned from `player_display_name`, since this pipeline never
      needs to cross-reference SportsDataIO's — every other nflverse
      source it joins against already resolves to that same name
      convention), `nflverse/schedules.ts` (bye weeks derived from the
      `schedules` release's `games.csv`, since nflverse has no dedicated
      byes endpoint — a team's bye is whichever week it has no game),
      `backtest/loadRunNflverseOnly.ts` (assembles all of the above into
      the exact same `BacktestRunData` shape `loadRun.ts` produces),
      `backtest/runBacktestNflverseOnly.ts` (a thin orchestration
      duplicate of `runBroadBacktest`, since that function calls
      `loadBacktestRunData` directly rather than accepting a pre-loaded
      batch — kept as a genuine duplicate rather than refactoring
      `runBacktest.ts` to avoid any risk to the already-validated 2025
      pipeline), and a new route, `/api/backtest/broad-nflverse`.
      `allTeamWeeklyRows` is always empty in this pipeline — nothing
      shipped uses team-level data, only the never-shipped gameScript
      baseline does, so it wasn't worth building a second team-stats
      source for that. Deliberately did not retune anything for this —
      `config.ts` is read completely unchanged; retuning against 2024
      would defeat the point of an out-of-sample check.
    - **Sanity-checked the new pipeline against 2025 before trusting it
      for 2024** (2025 is the one season with independent ground truth
      to compare against): 56.9% overall / QB 54.9% / RB 57.6% / WR
      54.9% / TE 61.4%, vs. the SportsDataIO pipeline's 57.05% / 56.9% /
      58.6% / 55.9% / 56.4%. Close enough in aggregate (0.15pp overall)
      to trust the pipeline is sound; position-level differences are
      expected given the two pipelines pair players by each source's
      own week-by-week PPR ranking, so a slightly different points
      calculation shifts exactly which players get paired.
    - **2024 result: 53.9% overall (down from 57.05% on 2025) — a real
      generalization gap, but concentrated almost entirely in one
      position, not spread evenly.** By position: QB 42.2% (n=102, worse
      than chance), RB 52.4% (n=204, down from ~58%), **WR 59.5% (n=200,
      up from ~55%)**, **TE 57.4% (n=101, holds steady/up from ~56%)**.
      The two 2025-tuned position-specific signals with the most at
      stake here — TE snap-share and the WR composite tiebreaker — both
      *held up or improved* against 2024. RB's drop and QB's collapse
      are the story, and they don't have the same cause.
    - **Investigated the QB collapse directly rather than reporting a
      42% number at face value** — spot-checked real 2024 QB pairs
      (`console.log` of actual predictions/outcomes, later removed).
      Confirmed real players, real stats, real red-zone/matchup data —
      not a pipeline bug. The actual cause: `volume.ts`'s QB signal is
      pass attempts *only* ("rushing production is already reflected in
      points" — a design choice from item 6, predating this session's
      work), and at `VOLUME_BLEND_WEIGHT=0.9` the final score is ~90%
      driven by that pass-attempts estimate. 2024's top-12 QB pool
      skewed unusually rush-heavy (Lamar Jackson's MVP season, Jayden
      Daniels' rookie year, Josh Allen, Jalen Hurts, Anthony Richardson,
      Baker Mayfield) — exactly the QBs whose real fantasy value the
      pass-attempts-only signal most understates. This is a genuine,
      pre-existing design tension the volume work never had reason to
      surface against 2025's QB pool — not a defect in anything built
      this session, but a real out-of-sample finding worth flagging:
      the QB volume signal may need a rushing component, unvalidated as
      of this writing.
    - **Investigated RB's drop the same way** before accepting it —
      spot-checked real 2024 RB pairs (`redZoneTouchesAvg`/
      `redZoneModifier` per player). Confirmed real players, sensible
      red-zone touch counts, the modifier firing in the correct
      direction every time — the join and the modifier both work
      correctly on 2024 data. The accuracy drop itself (58.6%→52.4%)
      appears to be genuine season-to-season variance rather than a
      broken signal, but wasn't decomposed further (e.g. isolating
      red-zone touches' own marginal contribution on 2024 specifically,
      the way item 20's weight sweep did for 2025) — flagged here as an
      open question rather than guessed at.
    - **Not yet done**: naive-baseline comparison against 2024
      (`runBroadBacktestNflverseOnly` skips it — see the function's own
      doc comment); re-tuning anything based on this result (a
      deliberate choice, per above, but worth revisiting once QB's
      rushing-signal gap is addressed).
    - **Reliability note on this pipeline**: the local dev server
      crashed outright on roughly half of the cold-cache requests to
      `/api/backtest/broad-nflverse?season=2024` while building/using
      it (both during this item and item 25's sweep below) — always
      recovered cleanly on a retry, and every request that *did*
      complete produced consistent, sane results (confirmed by re-
      running the same query multiple times), so the numbers reported
      here aren't in question. Most likely cause: `Promise.all`-firing
      several multi-MB CSV fetches at once, one of them the ~98MB `pbp`
      file parsed by `nflverse/client.ts`'s hand-rolled char-by-char
      parser — real memory pressure on a single dev-server process, not
      present in the (already-cached, individually-fetched)
      SportsDataIO pipeline. **Fixed in item 27** — the diagnosis above
      (memory pressure from concurrent large parses) was correct;
      see item 27 for the actual root cause (a two-copy parser plus 184
      unused columns retained per play-by-play row) and the fix.
25. **Tried adding a rushing component to `volume.ts`'s QB signal** —
    the direct, obvious response to item 24's QB finding, and a real
    test of whether that finding was actionable or just a fact to note.
    Swept `TEMP_QB_RUSH_ATTEMPT_WEIGHT` (pass attempts + `w` × rush
    attempts, `w` from 0 = shipped behavior to 1 = rush attempts counted
    fully equally) against **both** seasons, recomputing
    `POINTS_PER_VOLUME_UNIT.QB` empirically for each `w` from 2025 data
    (same ratio-of-sums method as every other conversion factor, kept
    consistent rather than re-deriving from 2024, which would defeat
    the point of an out-of-sample check):

    | `w` | conv. factor | 2025 QB | 2025 overall | 2024 QB | 2024 overall |
    |---|---|---|---|---|---|
    | 0 (shipped) | 0.511 | 56.9% | 57.05% | 42.2% | 53.9% |
    | 0.1 | 0.505 | 55.9% | 56.9% | *(not captured)* | *(not captured)* |
    | 0.25 | 0.495 | 54.9% | 56.7% | 46.1% | 54.5% |
    | 0.75 | 0.466 | 49.0% | 55.7% | 49.0% | 55.0% |
    | 1.0 | 0.452 | 52.0% | 56.2% | 48.0% | 54.9% |

    **No tested weight was a clean win.** Every non-zero weight cost
    real, validated 2025 accuracy (up to -7.8pp at `w=0.75`) — and even
    the best 2024 result (`w=0.75`, 49.0%) stayed below chance. The
    curve isn't clean/monotonic either (2025 QB dips hardest at `w=0.75`
    then partially recovers at `w=1.0` — the same kind of small-sample
    jumpiness seen in the TE snap-share sweep, n=102 QB pairs). **Reverted
    to the original shipped state** (`volume.ts`/`config.ts` both back to
    pass-attempts-only, 0.511) rather than trade a validated result for
    a partial, still-inadequate one — same discipline as rejecting an
    isolated peak elsewhere in this document, just applied to rejecting
    the whole idea rather than one point on a curve.
    - **Why this probably can't be fixed by reweighting alone**: blending
      pass and rush attempts into one undifferentiated "touches" count
      forces a single conversion factor to represent two genuinely
      different QB archetypes (pocket passer vs. dual-threat) at once —
      there's no single blend weight that's right for both. A more
      promising direction, not attempted here: give QB a **second,
      separate additive term** for rushing volume (mirroring exactly how
      RB's red-zone touches — item 20 — were added as their own blend on
      top of the general volume blend, rather than merged into RB's
      touches count). That would need its own empirical conversion
      factor and its own weight sweep, done properly, rather than
      reusing this item's quick single-dial attempt.
26. **Tested QB rushing volume as its own standalone signal** (item 25's
    recommended alternative to a blended fix) via a new baseline,
    `pickByQbRushingAttempts` in `baselines.ts` — pick whoever's averaged
    more recent rushing attempts, QB-only, completely separate from the
    existing pass-attempts-only `recentVolume` baseline. Tested on both
    seasons, same as every other signal in this investigation:

    | | 2025 | 2024 |
    |---|---|---|
    | `qbRushingAttempts` | **46.8%** (n=94) | **63.0%** (n=100) |

    **Not recommended for integration as-is.** The signal flips from
    clearly *worse* than chance on 2025 to clearly *better* than chance
    on 2024 — the opposite of the stability every integrated signal so
    far has shown (RB red-zone touches and TE snap share both held up or
    improved 2025→2024; this one inverts). A 2-season sample where a
    signal swings this hard doesn't give any confidence about which
    direction it'd go in a third season — same "don't trust an isolated
    result" discipline used throughout this document, just applied
    across seasons instead of across a weight sweep. Left as a
    documented standalone result, not integrated.
    - **Found and fixed a real bug while building this**: the
      `injuryStatus` baseline came back at exactly n=0 for 2024 (down
      from 2025's n=65) — not just low coverage, zero. Root cause:
      nflverse's `injuries` release has an **inconsistent schema across
      seasons** — 2025's `injuries_2025.csv` has both `season_type` and
      `game_type` columns; 2024's `injuries_2024.csv` has only
      `game_type`. `nflverse/injuries.ts` filtered on `season_type`,
      which silently read as `undefined` for every 2024 row, filtering
      out the entire file. Fixed by filtering on `game_type` instead
      (present and consistent in both seasons, confirmed by checking the
      actual header row of both files rather than assuming) —
      `snapCounts.ts` already used `game_type` for the same release
      family, so this brought `injuries.ts` in line with the existing
      convention rather than introducing a new one. Also checked every
      other per-season nflverse reader (`gameLog.ts`, `playerStats.ts`,
      `playByPlay.ts`) for the same `season_type`-presence risk by
      inspecting each one's actual 2024 header — all three have it
      consistently; `injuries.ts` was the one outlier. Re-verified after
      the fix: 2025 unaffected (55.4%, n=65, identical to before), 2024
      now shows a real number (55.9%, n=59) instead of an empty bucket.
    - **Added the full baseline suite to `/api/backtest/broad-nflverse`**
      — it previously only computed engine accuracy. Now shares
      `runBacktest.ts`'s baseline-grading helpers directly (exported:
      `BASELINE_IDS`/`emptyBaselineOutcomes`/`gradeBaselinesForPair`/
      `summarizeBaselineOutcomes`) rather than duplicating them, so both
      routes grade every baseline by the identical rules and the numbers
      are directly comparable:

      | baseline | 2025 | 2024 |
      |---|---|---|
      | priorWeek | 50.5% (n=596) | 51.6% (n=593) |
      | seasonAvg | 52.9% (n=607) | 54.6% (n=604) |
      | recentVolume | 56.6% (n=580) | 53.3% (n=585) |
      | gameScript | 47.5% (n=596) | n/a (no team data in this pipeline) |
      | snapShare | 53.3% (n=484) | 48.4% (n=494) |
      | targetShare | 54.1% (n=495) | 51.9% (n=495) |
      | airYardsShare | 52.9% (n=507) | 51.0% (n=502) |
      | cpoe | 44.0% (n=100) | 40.0% (n=100) |
      | aggressiveness | 46.0% (n=100) | 43.0% (n=100) |
      | separation | 54.0% (n=289) | 51.7% (n=271) |
      | yacAboveExpectation | 50.9% (n=289) | 57.6% (n=271) |
      | rushYoe | 44.6% (n=184) | **59.8%** (n=189) |
      | receivingComposite | 55.7% (n=368) | 51.9% (n=345) |
      | injuryStatus | 55.4% (n=65) | 55.9% (n=59) |
      | redZoneTouches | 50.2% (n=550) | 55.7% (n=553) |
      | qbRushingAttempts | 46.8% (n=94) | 63.0% (n=100) |

      Worth flagging without chasing further: `rushYoe` (RB NextGen
      Stats rush-yards-over-expected) also swings hard between seasons
      (44.6%→59.8%, the same instability pattern as
      `qbRushingAttempts`) — both are NextGen-Stats-derived rushing
      efficiency metrics, which may not be a coincidence, but this
      wasn't investigated further.
27. **Fixed the `/api/backtest/broad-nflverse` reliability problem
    flagged in item 24** (crashed the dev server on roughly half its
    cold-cache requests), rather than continuing to just retry it — this
    came up because the natural next step, a Backtest-page season
    toggle, would put that flakiness directly in front of whoever uses
    the tool instead of just an agent re-running `curl`. Root cause
    wasn't the network fetch, it was memory: `client.ts`'s `parseCsv`
    built a full `string[][]` for the entire file and *then* mapped it
    to an array of objects — two complete copies of the data alive at
    once — and `pbp` (play-by-play, needed for red-zone touches) has
    ~587k rows and 192 columns, of which `playByPlay.ts` only ever reads
    8. Three changes, all measured together:
    - `parseCsv` rewritten single-pass — builds each row's object
      directly as it's parsed, never materializing the intermediate
      `string[][]`.
    - `fetchNflverseCsv` gained an optional `onlyColumns` parameter,
      threaded into `parseCsv`, folded into the cache key too (correct
      even though nothing but `pbp` uses it today). `playByPlay.ts`
      passes its actual 8 needed columns — a ~24x cut to what a
      587k-row file retains in the 24h in-process cache.
    - `loadRunNflverseOnly.ts` fetches in three stages instead of one
      `Promise.all`: the game log alone first (also fixes a second,
      smaller waste — `getPlayerWeekStats` reads the *same* underlying
      file, and firing both concurrently raced two fetches of it instead
      of the second one hitting a warm cache), then the remaining
      small/medium sources together, then red-zone touches (by far the
      single heaviest fetch) alone, after everything else has already
      resolved and freed its memory.
    - **Verified, not just assumed fixed**: reran the full 2025 backtest
      first to confirm the parser rewrite changed nothing (57.05%
      overall, every baseline identical, including `redZoneTouches` at
      50.2%/n=550 — same numbers as before this change, byte-for-byte).
      Then ran the 2024 route cold (fresh dev server, empty cache) four
      times in a row: **4/4 succeeded**, each in 5-7 seconds — down from
      the 30-40+ seconds a successful cold run took before, and up from
      the ~50% failure rate item 24 documented. All four runs returned
      identical results (53.87% overall, QB 42.16%, etc.) to each other
      and to the pre-fix numbers, confirming the fix changed reliability
      and speed, not correctness.
28. **Added a season toggle to the Backtest page's Broad mode** (2025
    SportsDataIO vs. 2024 nflverse-only), now that item 27 made the 2024
    route reliable enough to put in front of a user rather than just an
    agent re-running `curl`. Deliberately scoped to Broad mode only —
    Single-pair backtesting has no nflverse-only equivalent (see item
    24), so the toggle simply isn't rendered outside Broad mode rather
    than exposing a season choice that would 404 or silently no-op.
    `BacktestCaveatNote` gained a second, conditional note explaining
    what the 2024 source is and why it exists (only shown when that
    season is selected); the results panel is labeled with which
    season/source produced what's currently displayed, tracked
    separately from the *selected* toggle state so flipping the toggle
    after a run doesn't mislabel stale results before the next run
    completes.
    - **Found and fixed a real bug while wiring this up**: the fetch URL
      for 2025 was built as `` `${endpoint}&weeks=...` `` where
      `endpoint` was just `"/api/backtest/broad"` with no query string
      at all — missing the `?`, producing `/api/backtest/broad&weeks=…`,
      a 404. Only surfaced when actually clicking through the UI in the
      browser (confirmed via the network request log, not just visual
      inspection) — the 2024 path happened to work by coincidence, since
      its endpoint already had a `?season=2024` for `&weeks=...` to
      correctly attach to. Fixed by building the query string with
      `URLSearchParams` instead of manual string concatenation, which
      makes this whole class of bug structurally impossible rather than
      just fixing this one instance.
    - **Verified both directions in one session**: ran Broad mode on
      2025 (57.0% overall, labeled "SportsDataIO"), switched to 2024
      without reloading the page (53.9% overall, labeled "nflverse-
      only," correct caveat swapped in, `gameScript` baseline correctly
      showing all no-pick), switched back — all matching the numbers
      already established in items 24-27.

### Open items (as of item 28 — pick up here)
Everything through item 28 above is committed (`git log` — "Add nflverse
data source, wire three signals into the engine, and validate against
2024"). Nothing below is started or fixed yet:

1. **The QB volume signal still doesn't generalize to 2024** (42.2%,
   worse than chance) — the single biggest open problem from this whole
   investigation. Two fix attempts both failed: blending rushing
   attempts into the existing pass-attempts signal regressed 2025 at
   every weight tried (item 25, reverted); testing rushing attempts as
   its own standalone signal flipped from 46.8% (2025) to 63% (2024) —
   too unstable across two seasons to trust (item 26). `volume.ts`/
   `config.ts` are back to pass-attempts-only, unchanged from before
   this was discovered. No safe fix identified yet.
2. **RB's 2024 drop (58.6%→52.4%) was never decomposed** — confirmed
   real (red-zone data joins and the modifier fires correctly on 2024
   data), but *why* it dropped wasn't isolated the way the original
   weight sweep decomposed 2025's numbers (item 24).
3. **`rushYoe` and `qbRushingAttempts` both swing hard between seasons**
   (44.6%→59.8% and 46.8%→63% respectively) — both are NextGen-Stats-
   derived rushing efficiency metrics, which may not be a coincidence,
   but this was never investigated (item 26).
4. **FTN charting** (play-level pressure/blitz/play-action/drops data)
   was flagged early as a third candidate signal family, deliberately
   deprioritized behind red-zone touches, and never picked back up
   (item 14). No code exists for it.
5. **`/api/backtest/broad-nflverse` has no single-pair equivalent** —
   only Broad mode works for 2024 (see item 24's design constraint);
   the Backtest page's "Single pair" mode is SportsDataIO/2025-only and
   the season toggle is correctly hidden outside Broad mode. Not a bug,
   just a scope boundary worth knowing about before assuming it's a gap.

## Voice & Tone
- This tool represents [Legitfootball]'s newsletter brand. Match that
  voice: [Clear, concise and simple].
- Explanations should read like a sharp, trusted friend giving advice —
  not a generic dashboard or a wall of stats.

## Conventions
- `src/lib/sportsdata/` — low-level SportsDataIO fetch client and typed
  data-access functions (`client.ts`, `players.ts`, `seasonStats.ts`,
  `weeklyStats.ts`, `byes.ts`, `timeframes.ts`, `positionDefense.ts`,
  `seasonToDatePlayerStats.ts`, `teamGameStats.ts`). Server-only
  (guarded via the `server-only` package) — never import this from a
  `"use client"` file. `client.ts`'s `sportsDataFetch()` supports two
  API hosts via `opts.base` (`API_BASES`): `"fantasy"` (default, most
  endpoints) and `"odds"` (`TeamGameStats` lives there) — the
  in-process cache keys on `${base}:${path}` so there's no collision
  risk between hosts. **Caching**: a simple in-process TTL `Map`, not
  Next's `fetch` Data Cache — several SportsDataIO endpoints
  (`/Players`, `/PlayerSeasonStats`, `/PlayerGameStatsByWeek`) return
  4-6MB payloads, and Next's Data Cache silently refuses to cache
  anything over 2MB (it logs a warning and just re-fetches every time).
  The in-process cache works for any payload size but resets on cold
  starts — an accepted tradeoff at this app's scale rather than adding
  real cache infra.
- `src/lib/recommendation/` — the pure, framework-agnostic scoring
  engine (`engine.ts`, `config.ts`, `types.ts`, `volume.ts`) plus three
  bridging files that are the only impure pieces: `buildInput.ts` (live
  mode), `buildBacktestInput.ts` (backtest mode, fully synchronous —
  reads from a pre-fetched batch instead of making its own calls), and
  `nflverseLive.ts` (live mode's equivalent of `backtest/loadRun.ts`'s
  nflverse fetch — builds the same `PlayerID -> week -> stat` table for
  the current season, fetched once per `/api/compare` request and
  passed into every `buildComparisonInput` call, the same way
  `positionDefenseTable` already is). All three feed the *same*
  unmodified `scorePlayer`/`comparePlayers`. Tunable weights live in
  `config.ts` — adjust there as the logic gets tuned, per the
  Recommendation Logic Philosophy section above. `volume.ts`'s
  `getVolumeStat()` reads `ReceivingTargets`/`RushingAttempts`/
  `PassingAttempts` off `PlayerGameStat` — these fields were already
  present in every SportsDataIO response but unused until the volume
  signal was added; `sportsDataFetch()` casts the raw JSON rather than
  whitelisting fields, so extending `PlayerGameStat` in
  `sportsdata/types.ts` needed zero fetch/mapping changes anywhere.
  `PlayerComparisonInput.nflverse` (an `NflverseSignals`) carries the
  snap-share/target-share/separation/red-zone-touches signals from
  `nflverse/aggregate.ts` into `scorePlayer` — see "Backtesting &
  Tuning History" item 20 for how each is scored (RB red-zone touches
  and TE snap share are additive blends on top of the volume blend;
  WR target share + separation is a close-call tiebreaker in
  `comparePlayers`, not part of `finalScore` at all).
- `src/lib/nflverse/` — server-only client for the free, no-auth
  nflverse-data GitHub releases (`client.ts`: fetch + parse + the same
  in-process TTL cache pattern as `sportsdata/client.ts`, since these
  CSVs are also multi-MB; hand-rolled quote-aware CSV parser since a
  naive `split(",")` breaks on this data — every row's `headshot_url`
  embeds an unquoted-looking comma inside a quoted field; also
  transparently `zlib.gunzipSync`s any `.gz` asset, since the
  `nextgen_stats` release only ships gzipped CSVs — no new dependency,
  Node's built-in `zlib`). `snapCounts.ts`/`playerStats.ts`/
  `nextGenStats.ts`/`injuries.ts` are thin typed readers over the
  `snap_counts`, `stats_player`, `nextgen_stats`, and `injuries` releases
  respectively (`nextGenStats.ts` ships one all-years file per stat type
  — passing/receiving/rushing — rather than one file per season, so it
  filters to the requested season itself). `playByPlay.ts` is the one
  heavier reader — no pre-aggregated red-zone file exists in nflverse, so
  it aggregates the full `pbp` release itself (filtering
  `yardline_100 <= 20`, counting rush attempts/targets per player per
  game); play-by-play identifies players by `gsis_id` rather than name,
  so it resolves through `players.ts` (nflverse's ID crosswalk release)
  before the usual name join. `playerMatch.ts` does the
  name-normalization join onto SportsDataIO `PlayerID`s (see Data Source
  Notes for the validation story); `weekTable.ts` combines every source
  above into one `PlayerID -> week -> stat` table, built by both
  `backtest/loadRun.ts` (batch, one call for the whole season) and
  `recommendation/nflverseLive.ts` (live, one call per comparison
  request). `aggregate.ts` is the shared, pure "what's a player's recent
  signal value" layer on top of that table (`averageSnapShare`/
  `averageTargetShare`/`averageSeparation`/`averageRedZoneTouches`) —
  used by both `recommendation/buildInput.ts`/`buildBacktestInput.ts`
  (feeding the live engine — see Recommendation Logic Philosophy and
  "Backtesting & Tuning History" item 20) and, independently,
  `backtest/baselines.ts` (which still does its own inline averaging
  for the many signals *not* integrated into the engine, e.g.
  `cpoe`/`aggressiveness`/`rushYoe`/`yacAboveExpectation` — deliberately
  not refactored onto `aggregate.ts` to avoid perturbing already-
  validated backtest numbers for signals that aren't shipping).
  Most fields are read via `backtest/weekData.ts`'s
  `recentNflverseByPlayer()` (averaged over the recent-weeks window,
  same as player recent-form); injury status is the one exception —
  it's a current-week fact, not a trailing tendency to average, so it's
  read via the separate `nflverseStatForWeek()` accessor instead (used
  by the `injuryStatus` backtest baseline only — not integrated into the
  live engine, which already has real-time injury status; see item 18).
  `gameLog.ts`/`schedules.ts` are the two files that make nflverse usable
  as a *primary* data source, not just a supplement — `gameLog.ts` builds
  a full `PlayerGameStat[][]` game log from `stats_player`, and
  `schedules.ts` derives bye weeks from the `schedules` release's
  `games.csv` (no dedicated byes endpoint exists) — both used only by
  `backtest/loadRunNflverseOnly.ts` (item 24), never by the live tool or
  the primary 2025 backtest.
- `src/lib/backtest/` — the backtesting feature: `loadRun.ts` (the only
  network I/O — fetches every needed week once per request, both
  player-level and team-level rows, plus the nflverse tables above),
  `weekData.ts` (pure per-week slicing/aggregation from that batch —
  team pace and the nflverse stats use the same *recent*-weeks window
  as player recent-form, not full season-to-date, since team/player
  tendencies can shift within a season), `grading.ts`
  (correct/incorrect/push/no_pick outcomes + accuracy summary, plus
  `summarizeByCloseCall` for confidence-calibration checks), `baselines.ts`
  (naive strategies graded by the identical `gradeOutcome` rules as the
  engine, over the same weeks/matchups, so accuracy is directly
  comparable: prior-week points, season-to-date average, recent volume
  — all shipped in the engine or kept as reference — plus every
  nflverse-backed signal tested so far (`snapShare`/`targetShare`/
  `airYardsShare`/`cpoe`/`aggressiveness`/`separation`/
  `yacAboveExpectation`/`rushYoe`/`receivingComposite`/`injuryStatus`/
  `redZoneTouches`), all tested and **not** shipped into the engine yet;
  see "Backtesting & Tuning History"), `pairing.ts` (broad-mode
  adjacent-rank pairing methodology), `runBacktest.ts` (orchestration),
  `config.ts`/`params.ts` (tunables, query parsing). The engine's own
  grading logic still always treats injury status as unknown — the
  `injuryStatus` baseline above is the only place in backtest mode that
  reads real historical designations, and only as a standalone trial
  (see Data Source Notes). Both API routes return
  `baselineSummaries` and `confidenceBreakdown` alongside the engine's
  own accuracy so results are never reported in isolation from a
  baseline/calibration check. `loadRunNflverseOnly.ts`/
  `runBacktestNflverseOnly.ts` (item 24) are a parallel, nflverse-only
  path for validating the tuned engine weights against seasons
  SportsDataIO won't serve — same `BacktestRunData` shape and same
  scoring/grading functions as the primary pipeline, just a different
  loader and a duplicated (not shared) orchestration loop, kept separate
  deliberately to avoid any risk to the already-validated 2025 numbers.
- `src/app/api/players`, `src/app/api/compare`, `src/app/api/backtest/pair`,
  `src/app/api/backtest/broad`, `src/app/api/backtest/broad-nflverse`
  (item 24, out-of-sample validation only) — Route Handlers that
  orchestrate the lib layers above and return trimmed JSON (never proxy
  raw upstream payloads, never leak the API key).
- `src/components/` — `StartSitTool.tsx`/`PlayerSearchInput.tsx`/
  `ComparisonResult.tsx` (live mode) and `BacktestTool.tsx`/
  `BacktestWeekTable.tsx`/`BacktestSummary.tsx`/`BacktestCaveatNote.tsx`
  (backtest mode, at `/backtest`, linked from the nav in `layout.tsx`).
  Reuses the existing `bg-background`/`text-foreground`/`font-sans`
  Tailwind tokens and `prefers-color-scheme` dark mode from
  `globals.css` — no new theme tokens or Tailwind config added.
- Season/week resolution for the live tool is always computed live via
  `getSeasonContext()` (never hardcoded) — it correctly falls back to
  the last completed season during the NFL offseason. Backtest mode
  targets a fixed completed season (`DEFAULT_BACKTEST_SEASON` in
  `lib/backtest/config.ts`, currently 2025 — bump once a later season
  completes).

## Commands
- `npm run dev` — start local dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run the production build locally
- `npm run lint` — run ESLint
- No test runner configured yet

## Things to Avoid For Now
- No native mobile app — responsive web only
- No league/team import integrations
- No scaling/infrastructure work for large user volume — build for
  correctness and quality at small scale; scaling is a later, separate
  problem
- No dummy/placeholder data — always use real player data, even if it's
  from a prior completed season during the NFL offseason
