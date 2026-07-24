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

**Candidate future improvement: next-opponent lookup for live matchup
context.** The live tool's matchup modifier currently looks up each
player's *last completed* opponent (see above) — for a "who should I
start this week" tool, it arguably should look up their *next
scheduled* opponent instead. This is a smaller, more contained fix than
it might sound: the recent-form engine (PPR average, volume, red-zone
touches, EPA, etc.) wouldn't need to change at all, since it's entirely
about how a player has been performing recently — only the matchup
modifier's opponent identification would need a schedule lookup
(SportsDataIO likely has a `/Schedules` endpoint for this; not yet
confirmed live). Backtest mode is arguably unaffected/already correct
here, since it grades against the target week's real, already-known
historical opponent. Two real constraints on pursuing this: (1) it
can't be tested against the *live* tool outside the NFL season, since
there's no "next game" to look up during the offseason (verify against
backtest data instead, or wait for the 2026 season to start); (2)
weather (wind specifically has real, well-documented fantasy effects —
more than rain or cold) would be a natural signal to pair with this,
but only becomes relevant once the tool actually knows which upcoming
game a player is playing in — it doesn't fit the current last-opponent
architecture at all.

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
  - QB rushing attempts, as a second, separate additive term stacked
    alongside (not blended into) the existing pass-attempts-only volume
    signal (`QB_RUSH_BLEND_WEIGHT`/`POINTS_PER_QB_RUSH_ATTEMPT` in
    `config.ts`) — added specifically to close a real 2024 out-of-sample
    gap (rush-heavy QBs like Lamar Jackson/Jayden Daniels were
    systematically undervalued). Deliberately tuned as a two-season
    tradeoff rather than a clean win: every nonzero weight costs some
    2025 accuracy in exchange for 2024 accuracy — see "Backtesting &
    Tuning History" item 30 for the full sweep and why 0.3 was chosen.
  - RB rushing EPA-per-play (`RB_EPA_BLEND_WEIGHT`/
    `RB_EPA_REGRESSION_SLOPE`/`RB_EPA_PPR_AT_ZERO` in `config.ts`),
    stacked after red-zone touches — a genuine two-season improvement,
    not a tradeoff (unlike QB rushing above). Uses a linear-regression
    conversion factor rather than every other signal's "ratio of sums,"
    since raw rushing EPA sums negative across a season and would
    otherwise flip the sign — see item 33.
  - WR drop rate (FTN Charting, `DROP_RATE_BLEND_WEIGHT`/
    `POINTS_PER_DROP_RATE_UNIT` in `config.ts`) — WR only, not TE (TE's
    standalone result was too noisy to trust at any weight tested). A
    "lower is better" signal, the only one shaped that way in this
    engine; a real WR-specific tradeoff (2025 up, 2024 down as weight
    increases), deliberately tuned to a balanced point rather than
    either season's peak — see item 33.
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
29. **Investigated *why* `hasLimitedData` (59.5%, n=351) beats
    `confident` (54.2%, n=212) — item 21/22 flagged this as worth a
    dedicated pass but never ran it.** Two hypotheses were on the table:
    (a) "asymmetry" — adjacent-rank pairing still nets a real talent gap
    for these pairs (one clearly-lesser option, not a genuine toss-up),
    or (b) "role-player variance" — limited-data pairs skew toward
    lower/replacement-tier players whose small stat edges are more
    decisive than a star's noisier week-to-week output. Tested both with
    a temporary diagnostic (duplicated `runBroadBacktest`'s loop rather
    than modifying it, per the item-22 precedent; used once, then
    deleted — no lasting code artifact, same as item 22).
    - **Neither hypothesis survived.** The gap in season-to-date PPR
      average between the two paired players (the closeness of the
      "adjacent rank" pairing itself) is nearly identical across every
      bucket — confident 0.69, closeCall 0.55, hasLimitedData 0.68 — so
      hasLimitedData pairs aren't secretly less close in talent (kills
      hypothesis a). The two players' average season PPR level (a tier
      proxy: star vs. replacement-level) is also nearly identical —
      confident 16.08, hasLimitedData 16.30 — so hasLimitedData isn't
      disproportionately backup/role players either (kills hypothesis
      b). The actual real-world PPR margin between the two players that
      week (how lopsided the outcome really was) is likewise flat across
      buckets (~8-9 points everywhere) — hasLimitedData games weren't
      secretly blowouts in disguise.
    - **A third candidate — "the model deviates from naive season-rank
      more often when data is limited, and that deviation is what's
      smart" — also didn't hold up.** hasLimitedData picks do agree with
      raw season-rank order less often than confident picks (50.1% vs.
      58.5%), but cross-tabbing accuracy by agreement shows *agreeing*
      with season rank is still more accurate than disagreeing within
      every bucket, hasLimitedData included (61.9% vs. 57.1%) — so the
      edge isn't coming from the model smartly overriding a stale season
      average either.
    - **By position, the gap is directionally consistent (hasLimitedData
      ≥ confident in all four: QB +11.8pp, RB +5.3pp, WR +2.1pp, TE
      +13.2pp) but not statistically significant anywhere** — the
      largest position gaps (QB, TE) ride on confident samples of just
      n=19 and n=20, each within roughly half a standard error of pure
      chance on their own (i.e. QB confident's 47.4% and TE confident's
      45% aren't distinguishable from a coin flip at this sample size).
      RB and WR have healthier samples (n=52/n=121 confident) and show
      much smaller gaps (5.3pp, 2.1pp). Pooling all positions, the
      headline 54.2% vs. 59.5% gap comes out to z≈1.23 — real and
      consistently-directioned, but short of conventional significance
      (would need z≈1.96), and not obviously explained by either
      proposed mechanism.
    - **Resolution: most likely a moderate-sample artifact, not a
      structural property of "limited data."** The 2025-only backtest
      (~612 pairs total, and confident/hasLimitedData splits that thin
      further to as few as n=19 per position) doesn't have the power to
      distinguish this reliably, and QB/TE's unusually bad `confident`
      luck is doing a lot of the work in the pooled number. This doesn't
      overturn the item 22-23 decision to split the flag (that fix was
      about correct labeling of two behaviorally-different triggers, not
      about the size of the gap between them) — but the *specific*
      "limited data is more trustworthy than confident" framing should
      be treated as a soft, unconfirmed lean rather than a validated
      finding. Worth re-checking once 2026 season data is available as a
      second sample (see the "single-season" caveat at the top of this
      section) rather than chasing further on 2025 alone.

30. **Fixed (with a deliberate tradeoff) the QB-doesn't-generalize-to-
    2024 problem flagged in item 24 and left open after items 25/26's two
    failed attempts** — this time using a THIRD architecture: QB rushing
    volume as its own separate additive term, mirroring exactly how RB's
    red-zone touches (item 20) were stacked on top of the general volume
    blend rather than merged into RB's touches count. Followed the same
    process discipline as every other signal in this document: standalone
    test first, then integrate only if it earns it, then sweep the
    weight rather than guessing.
    - **Step 1 — reconfirmed the standalone signal is genuinely
      unstable, not different from item 26's finding**: re-ran the
      existing `pickByQbRushingAttempts` baseline against both seasons
      and got the identical numbers already on record — 46.8% (2025,
      n=94, worse than chance), 63.0% (2024, n=100). Proceeded anyway,
      since the whole point of this pass was testing whether the
      *additive-term* architecture (rather than blending rush into the
      existing pass-attempts number, item 25's rejected approach, or
      trusting the standalone signal directly, item 26's rejected
      approach) behaves differently from a single-number standalone
      pick — flagged this instability honestly before proceeding rather
      than treating it as a clean green light.
    - **Step 2 — added `getQbRushAttemptStat` (`volume.ts`)**, separate
      from `getVolumeStat`'s existing pass-attempts-only QB signal, and
      a new additive term in `scorePlayer` (`engine.ts`): `runningScore
      = blendedScore + matchupModifier + volumeModifier + redZoneModifier
      + snapShareModifier`, then `finalScore = (1-w)*runningScore +
      w*expectedPointsFromQbRush` where `expectedPointsFromQbRush =
      recentQbRushAttemptsAvg * POINTS_PER_QB_RUSH_ATTEMPT`.
      `POINTS_PER_QB_RUSH_ATTEMPT = 3.929` computed via the same
      "ratio of sums" method as every other conversion factor (total QB
      PPR points ÷ total QB rushing attempts across every played
      QB game-week of the 2025 season) — cross-checked by recomputing
      `POINTS_PER_VOLUME_UNIT.QB` the same way from the same data pull
      and getting an identical 0.511, confirming the method is sound.
      Rush attempts convert at ~7.7x the rate of pass attempts (3.929 vs.
      0.511 pts/attempt) — rarer but disproportionately high-value
      touches. New `PlayerScoreBreakdown` fields:
      `recentQbRushAttemptsAvg`/`qbRushModifier` (`types.ts`).
    - **Step 3 — swept `QB_RUSH_BLEND_WEIGHT` in 0.1 steps against BOTH
      seasons' QB accuracy** (not just 2025, unlike every prior sweep in
      this document — the explicit point of having 2024 data now):

      | `w` | 2025 QB | 2024 QB |
      |---|---|---|
      | 0 (baseline) | 56.9% | 42.2% |
      | 0.1 | 51.0% | 50.0% |
      | 0.2 | 52.9% | 52.9% |
      | 0.3 | 52.9% | 55.9% |
      | 0.4 | 50.0% | 57.8% |
      | 0.5 | 49.0% | 62.7% |
      | 0.6 | 48.0% | 63.7% |
      | 0.7 | 48.0% | **64.7% (peak)** |
      | 0.8 | 47.1% | 63.7% |
      | 0.9 | 47.1% | 63.7% |

      **This curve has a fundamentally different shape than RB's
      red-zone or TE's snap-share sweeps** — those were net wins on the
      primary (2025) season at nearly every weight tested, so the sweep
      was only about avoiding an overfit single-point peak. Here, *every
      nonzero weight makes 2025 worse than the shipped baseline* — there
      is no free win. It's a genuine seesaw: 2024 climbs steadily as 2025
      falls, crossing near-equal around w=0.2-0.3, then 2025 keeps
      sliding below chance (47-48%) at higher weights while 2024
      plateaus around 63-65%.
    - **Step 4 — this was flagged explicitly as a real tradeoff, not a
      clean win, and put to the user rather than resolved unilaterally**
      (unlike every prior weight choice in this document, which had an
      unambiguous best point). Given the choice between not shipping
      it, the balanced w=0.3 compromise, or the 2024-favoring w=0.7 peak,
      **the user chose w=0.3** — a deliberate bet that cross-season
      stability matters more than peak single-season accuracy, on the
      explicit understanding it costs 2025 a real -4pp.
    - **Result at w=0.3**: QB 52.9% (2025, down from 56.9%) / 55.9% (2024,
      up from 42.2%) — both clearly above chance and roughly matched,
      rather than one season strong and the other near/below chance.
      **Overall engine accuracy**: 2025 57.05%→56.39% (-0.66pp), 2024
      53.9%→56.18% (+2.28pp) — the two seasons now sit close together
      (56.39% vs. 56.18%) at the whole-engine level too, not just QB.
    - **Verified live end-to-end**, not just backtest: a real
      `/api/compare` request (Lamar Jackson vs. Joe Burrow, 2025 season)
      showed `qbRushModifier` firing in both directions as expected —
      positive for Lamar (high rush-attempt rate, even off a
      limited/3-game recent sample) and negative for Burrow (a
      pass-only-attempts contributor, and his rushing volume converts to
      fewer points than his existing running score) — with the new note
      line ("Averaging X.X rushing attempts/game... worth roughly Y.Y
      PPR points...") rendering correctly for both.
    - **This resolves item 1 of the (now former) open-items list below**
      with an explicit, documented tradeoff rather than a clean fix — the
      QB volume/pass-attempts signal itself (`POINTS_PER_VOLUME_UNIT.QB`,
      `VOLUME_BLEND_WEIGHT`) is untouched; the fix is a second, separate
      additive term stacked alongside it.

30a. **Follow-up: confirmed item 30's w=0.3 choice against naive
    baselines (not just chance), and tested two more targeted variants
    of the same signal before settling on w=0.3 as final.**
    - **Baseline check first**: re-ran the full baseline suite (QB-only,
      both seasons) to confirm the fixed engine still beats simple naive
      rules, not just a coin flip. **2024: confirmed** — engine 55.9% vs.
      seasonAvg 52.9% (+3.0pp) and recentVolume 49.5% (+6.4pp). **2025:
      did not hold up as cleanly** — the engine now exactly *ties*
      seasonAvg (52.9%=52.9%, identical correct/incorrect counts) and is
      clearly *beaten* by the plain recentVolume baseline (57.0% vs.
      52.9%, a 4.1pp loss). Worth noting this wasn't purely introduced by
      the rush term: even pre-fix, the old engine's 2025 QB accuracy
      (56.9%) was already a near-tie with recentVolume's 57.0% — the
      w=0.3 change turned a rounding-distance gap into a real, visible
      one. Flagged honestly rather than glossed over, since it's a real
      cost of the item 30 tradeoff.
    - **Tested a red-zone-only variant** (yardline_100<=20, mirroring
      RB's existing red-zone touches exactly) as a "cleaner" alternative
      to total rush attempts — standalone via the existing
      `redZoneTouches` baseline (already handles QB as a first-class
      rush-only branch, so no new code was needed to check this).
      **Result: 49.5% (2025, n=91) / 63.0% (2024, n=92)** — nearly
      identical to total attempts' 46.8%/63.0%. Not a cleaner signal:
      the same QBs who rush a lot in general are largely the same ones
      who get more red-zone rushes, so narrowing to the red zone doesn't
      isolate a meaningfully different group or fix the instability.
      Not pursued further.
    - **Tested a goal-line-only variant** (yardline_100<=5, a new,
      tighter cutoff computed alongside the existing red-zone stat in
      the same play-by-play pass — see `playByPlay.ts`'s
      `goalLineRushAttempts`/`goalLineTargets`, threaded through
      `weekTable.ts`/`aggregate.ts`'s new `averageGoalLineTouches` and
      wired into both `buildInput.ts` (live) and `buildBacktestInput.ts`
      the same way red-zone touches already are). **Standalone result:
      53.3% (2025, n=75) / 52.7% (2024, n=74)** — genuinely different
      from the other two variants: stable and consistent across seasons
      instead of swinging 46-49%→63%. Cleared the "shows promise" bar,
      so it was integrated as a real additive term
      (`POINTS_PER_QB_GOAL_LINE_RUSH=64.543` — note the much larger
      conversion factor than red zone's 4.797 or total attempts' 3.929,
      simply because goal-line rush attempts are rare: only 138 total
      across every QB, every week, of the 2025 season — same "ratio of
      sums" numerator over a much smaller denominator) and swept against
      both seasons in fine (0.01-0.05) steps given the larger factor's
      likely sensitivity.
      - **Found a real "both seasons improve" region** (roughly
        w=0.08-0.22) — something neither total attempts nor red-zone-
        only ever produced: e.g. w=0.2 gave 57.8% (2025, +0.9pp over
        baseline) / 50.0% (2024, +7.8pp over baseline), no season worse
        off. But the movement was jagged and step-like (accuracy jumping
        in 1-2pp increments at specific weights — e.g. 2024 sat flat at
        43.1% for w=0.08-0.12 then jumped straight to 48-50% by
        w=0.18-0.2), consistent with a signal thin enough that each step
        is really just 1-2 individual pairs flipping, not a smooth
        trend. Its best 2024 result anywhere in the sweep (52.0% at
        w=0.25) barely clears a coin flip — nowhere near the 55.9-64.7%
        the noisier signals reached.
      - **Deliberately NOT shipped** despite the appealing "no tradeoff"
        headline number: 138 total plays across a full season is too
        thin a foundation to trust over a signal backed by a much larger
        sample (total attempts: 2267), and the modest ceiling means it
        wouldn't meaningfully close the 2024 gap even if the exact peak
        held up. Code is complete and live-wired (not just backtest) but
        gated off via `QB_GOAL_LINE_BLEND_WEIGHT=0` — kept in place
        rather than deleted so this doesn't need re-deriving from
        scratch if revisited once a third season of data exists.
    - **Re-examined whether a more conservative total-attempts weight
      (0.15-0.2, i.e. a smaller tradeoff than 0.3) would preserve more of
      2025** — the direct, obvious next idea after the goal-line variant
      didn't pan out. **It doesn't hold up**: 2025's cost isn't smooth
      as weight increases — it dips to 51.0% around w=0.1-0.15, then
      recovers to a flat 52.9% plateau from w=0.18 through w=0.3. Within
      that plateau, **2025's cost is identical at every point (52.9%),
      but 2024 keeps improving all the way to w=0.3** (52.0%→52.9%→
      55.9% across w=0.18→0.2→0.3). So w=0.2 doesn't actually preserve
      more of 2025 than w=0.3 — it pays the same 2025 cost for a smaller
      2024 payoff. **w=0.3 is Pareto-best within this family**, not an
      arbitrary pick to be second-guessed down — confirmed this rather
      than assumed it.
    - **Final decision: kept `QB_RUSH_BLEND_WEIGHT=0.3`** (total
      attempts), unchanged from item 30. Both alternate variants tested
      here (red-zone-only, goal-line-only) are documented, implemented,
      and deliberately not activated.
31. **Audited the play-by-play release for two more genuinely unused
    columns — EPA and the binary `success` flag** — the same
    "what's sitting unused" logic behind the original volume signal
    (item 6) and the red-zone/goal-line work (items 19/30), extended to
    nflverse's own headline efficiency metrics rather than another raw
    volume count. Both are read from the *same already-fetched* `pbp`
    rows red-zone/goal-line touches already parse — no new fetch or file
    needed, just two more columns added to the existing allowlist
    (`PBP_COLUMNS` in `playByPlay.ts`) and two more accumulators in the
    same aggregation pass. Role-scoped exactly like every other signal in
    this family: rush attempts for RB, dropbacks (passes + sacks +
    scrambles) for QB, targets for WR/TE. New standalone baselines
    `pickByEpaPerPlay`/`pickBySuccessRate` in `baselines.ts`.
    - **Overall numbers were unremarkable** (EPA: 47.2%/50.6%, success
      rate: 49.1%/52.6% — both near chance across all positions
      combined) but, per the pattern that's held throughout this whole
      investigation, **a real position-specific signal was hiding in the
      average**:

      | position | EPA/play (2025/2024) | success rate (2025/2024) |
      |---|---|---|
      | QB | 38.0% / 44.0% (bad) | **53.0% / 52.0%** (stable) |
      | RB | 52.2% / 57.2% | 49.8% / 56.2% |
      | WR | 49.5% / 50.3% | 47.7% / 52.6% |
      | TE | 41.8% / 44.4% (bad) | 46.4% / 45.7% (bad) |

    - **QB success rate is the standout finding**: raw EPA-per-dropback
      is clearly *worse* than chance for QB in both seasons (38%/44%) —
      plausibly too dominated by boom/bust outlier plays (long TDs,
      picks) to be a stable predictor — but the cruder, down/distance-
      adjusted success-rate flag is modestly positive **and stable
      across both seasons** (53.0%→52.0%), a property no QB-rushing
      variant tried in items 25/26/30/30a ever achieved. Genuinely
      promising for the position that's been the hardest, most
      season-unstable problem in this entire document.
    - **RB EPA-per-rush is a secondary candidate**: positive in both
      seasons and *improves* in 2024 (52.2%→57.2%) rather than degrading
      like most signals do out-of-sample.
    - **WR shows nothing** (both metrics hover at chance both seasons);
      **TE is consistently below chance on both metrics, both seasons**
      — not promising, but at least stable in that (bad) direction
      rather than swinging.
    - **Not integrated yet** — standalone numbers only, same "prove it
      before wiring it in" discipline as every other signal in this
      document. QB success rate and RB EPA-per-rush are both flagged as
      real candidates in the open items below; WR/TE results are
      negative findings, recorded here rather than chased further.
32. **Finally picked up FTN Charting** — the "third candidate signal
    family" flagged back in item 14 and left on the open-items list ever
    since (deliberately deprioritized behind red-zone touches at the
    time). Human-charted, play-level data (drops, contested/created
    receptions, pressure, personnel) not derivable from raw stats or
    play-by-play alone. Confirmed live against the real release before
    building anything (not assumed): covers 2022-2025 (both backtest
    seasons included), and — unlike every other nflverse source used so
    far — carries no player ID or name of its own. It's keyed by
    `nflverse_game_id`/`nflverse_play_id`, confirmed to match the main
    `pbp` release's `game_id`/`play_id` exactly, so it's joined onto the
    same pbp rows red-zone/EPA aggregation already iterates (`game_id`/
    `play_id` added to `PBP_COLUMNS`; new `ftnCharting.ts` fetches and
    keys the charting file, `playByPlay.ts` looks it up per-row using
    pbp's own `receiver_player_id` to attribute a charted target to a
    player) — no second full pbp parse needed. Tracked `is_drop` and
    `is_created_reception` as the two most fantasy-relevant charted
    fields; skipped pressure/personnel context (`n_blitzers`,
    `is_qb_out_of_pocket`, box counts) for this pass since those describe
    the opposing pass rush/scheme more than the player's own skill — the
    same attribution concern that sank the team-level game-script
    baseline in item 12 — and would need their own dedicated pass if
    revisited. New standalone baselines `pickByDropRate`/
    `pickByCreatedReceptionRate` in `baselines.ts`, WR/TE only (denominator
    is charted targets, via a `chartedTargetCount` accumulator kept
    separate from raw target count in case charting coverage has gaps).
    - **Results, by position (2025/2024):**

      | position | drop rate (lower wins) | created-reception rate |
      |---|---|---|
      | WR | 52.4% / 53.1% | 52.9% / 48.3% |
      | TE | 50.0% / 54.8% | 55.2% / 53.0% |

    - **Drop rate is a real, if modest, candidate**: small (2-5pp above
      chance) but genuinely stable across both positions and both
      seasons — never dips below chance anywhere in the table. A
      "reliability" signal with no equivalent anywhere else in this app.
      Flagged as a real candidate in the open items below, same
      treatment as QB success rate/RB EPA-per-rush.
    - **Created-reception rate is a documented negative/mixed finding,
      not a candidate.** Solid and stable for TE (55.2%→53.0%) but
      unstable for WR — crosses from positive (52.9%) to below chance
      (48.3%) between seasons, the same season-to-season sign-flip
      pattern that's sunk several other signals in this document (QB
      rushing volume, red-zone-only QB rushes). Not pursued further; not
      added to the open-items candidate list.
33. **Integrated the three items-31/32 candidates into the live engine**
    — all three followed the same process (wire into `NflverseSignals`/
    `aggregate.ts` if not already there, add an additive term mirroring
    RB red-zone's shape, sweep both seasons), but landed in three
    genuinely different places, which is itself the finding worth
    recording.
    - **Caught a real methodology bug before it shipped**: RB rushing
      EPA sums to a *negative* total across the full 2025 season
      (rushing plays average negative EPA leaguewide — a well-known,
      real fact, not a data error), which breaks the "ratio of sums"
      method used for every other conversion factor in this file —
      dividing total points by a negative sum flips the sign, so
      *better* RBs by EPA would score *lower*. Computed it both ways and
      compared before trusting either. Fixed by using an OLS regression
      slope (PPR points ~ EPA-per-rush) instead: slope 5.772, with an
      intercept (`RB_EPA_PPR_AT_ZERO=9.749`) that every other conversion
      factor in this file doesn't need, since EPA doesn't pass through
      the origin the way volume/share metrics do (0 EPA means
      "league-average," not "no production").
    - **QB success rate: standalone-validated but rejected on
      integration.** Every weight tested (0.1-0.9) made 2025 *worse*
      than the w=0 baseline (52.9%), and 2024 never clearly beat its own
      baseline either (mostly 51-56%, flat-to-worse). The standalone
      finding (item 31) was real, but it adds nothing once blended
      against a QB score already dominated by `VOLUME_BLEND_WEIGHT=0.9`
      — the first case in this document where a signal that looked
      genuinely stable standalone still failed on integration, a
      different failure mode than the cross-season instability that
      sank every prior QB attempt. `QB_SUCCESS_RATE_BLEND_WEIGHT` stays
      at 0 — code kept, not deleted, same as the goal-line precedent.
    - **RB EPA-per-rush: a clean, genuine win, shipped at w=0.3.**
      Swept in 0.1 steps (then refined at 0.15/0.25/0.35): both seasons
      sit at or above baseline across the entire w=0.1-0.4 range (2025:
      58.6-60.6% vs. 58.6% baseline; 2024: 51.5-53.4% vs. 52.5%
      baseline), a real plateau, not a tradeoff or an isolated spike —
      the same shape as RB red-zone/TE snap-share's original integration
      (item 20), unlike QB rushing's forced tradeoff. **Result at
      w=0.3**: RB 59.6%/52.9% (both up from baseline).
    - **Drop rate: a real WR-specific tradeoff, no clean TE signal —
      put to the user rather than resolved unilaterally**, the same
      "this is a genuine judgment call" treatment as item 30's QB
      rushing weight. WR showed a clear, monotonic-ish tradeoff shape as
      weight increased (2025 climbing from 55.9%→59.8%, 2024 declining
      from 59.5%→57.5% across w=0-0.3) — structurally identical to QB
      rushing's tradeoff, just for a different position. TE showed no
      clean signal at any weight (noisy, non-monotonic, smallest sample
      of anything tested — consistent with TE's history as this
      document's noisiest position). **The user chose WR-only at the
      balanced w=0.2** (58.3%/59.5%, both ≥ baseline) over the bigger
      w=0.3 tradeoff or not shipping at all — required adding a TE
      exemption to the modifier (mirroring the QB skip pattern used for
      snap/target share in item 15), since the code previously applied
      one shared weight to both positions. Verified TE is completely
      unaffected (56.4%/57.4%, byte-for-byte unchanged) and WR moved
      exactly as predicted.
    - **Verified live end-to-end**, not just backtest: a real RB pair
      (McCaffrey vs. Bijan Robinson) showed `rbEpaModifier` firing
      correctly in both directions (each player's modifier reflects how
      far *their own* running score sits from the EPA-implied estimate,
      not a raw head-to-head EPA comparison — both landed negative here
      since both are high-volume backs whose blended scores already sit
      well above the EPA-implied baseline). A real WR pair (Jefferson
      vs. Lamb) showed `dropRateModifier` correctly firing only for
      Jefferson (6.25% recent drop rate → -2.28 points) and correctly
      showing zero for Lamb (0% recent drop rate).
    - **Result: overall engine accuracy 2025 56.4%→57.5% (+1.1pp), 2024
      56.2%→56.3% (+0.2pp)** — both seasons better than before this
      item, not a tradeoff at the whole-engine level (the WR drop-rate
      tradeoff and the RB EPA gain move in the same net-positive
      direction once combined).
34. **Tested weather (wind) as a candidate signal — a genuinely new data
    source, not another cut of nflverse's existing releases.** Motivated
    by a design discussion about forward-looking next-opponent lookups
    (see the Overview's "Candidate future improvement" note) — weather
    only matters once the tool knows which specific game a player is
    about to play in, which the live tool doesn't do yet, so this was
    scoped as a pure backtest investigation (both seasons already have
    known, played games) rather than something to wire into the live
    engine regardless of outcome.
    - **Confirmed nflverse's `schedules` release (`games.csv`) has real
      per-game `roof`/`temp`/`wind` data**, covering both backtest
      seasons. Found and fixed a real team-code mismatch before trusting
      any numbers: SportsDataIO's 2025 pipeline uses `LAR` for the Rams,
      nflverse's schedule uses `LA` — silently produced zero decidable
      pairs for any Rams player until caught and normalized.
    - **Checked sample size before testing anything** (the explicit
      lesson from the goal-line rushing follow-up): at the wind
      threshold most people would call genuinely "windy" (≥15mph),
      decidable pairs (one player's team in a high-wind outdoor game,
      the other's team in a calm/indoor one) drop to single digits for
      QB (7-10) and low-teens for TE (9-13) — thinner than the
      already-rejected goal-line signal (75-92 pairs). A looser ≥10mph
      cutoff gives a healthier sample (25-53 pairs depending on
      position) but is barely above the season-average wind speed
      (7.9mph) — not "windy" in the intuitive sense.
    - **Standalone results ("avoid the high-wind player"), by position
      and threshold (2025/2024):**

      | position | wind≥10mph | wind≥12mph | wind≥15mph |
      |---|---|---|---|
      | QB | 53.3% / 54.5% (n=30/33) | 50.0% / 60.9% (n=22/23) | 70.0% / 42.9% (n=10/7) |
      | RB | 53.1% / 47.2% (n=49/53) | 51.3% / 46.2% (n=40/39) | 47.8% / 43.8% (n=24/16) |
      | WR | 58.8% / 60.0% (n=51/50) | 59.5% / 52.6% (n=37/39) | 68.2% / 42.9% (n=22/15) |
      | TE | 36.0% / 38.2% (n=25/34) | 31.8% / 39.1% (n=22/23) | 44.4% / 44.4% (n=13/9) |

    - **WR is the one real, if imperfect, finding — and it perfectly
      illustrates the sample-size lesson from goal-line rushing.** At
      the statistically trustworthy ≥10mph threshold, WR is genuinely
      stable and positive in both seasons (58.8%/60.0%, n=50-51) — one
      of the more convincing "both seasons agree" results in this whole
      document. But push to the ≥15mph threshold that actually matches
      the football intuition ("real wind hurts the passing game"), and
      it flips hard (68.2%→42.9%, below chance) on a sample of just
      15-22 — the identical instability pattern that sank the goal-line
      signal. The two thresholds can't both be right: the trustworthy
      number is barely above average wind (not dramatically "windy"),
      and the intuitive number doesn't have enough games to trust.
    - **RB shows no signal at any threshold** (44-53%, essentially
      chance) — a sensible, confirming negative result rather than a
      concerning one, since wind shouldn't meaningfully affect the
      running game. **QB is weak and inconsistent** across thresholds.
      **TE is backwards** (consistently below chance at the two
      trustworthy thresholds) and small-sample, consistent with TE's
      history as the noisiest position throughout this document.
    - **Not integrated — closed as a documented standalone finding.**
      No clean, both-trustworthy-and-intuitive result exists for any
      position, so this doesn't clear the bar that RB EPA-per-rush or
      even WR drop rate cleared in item 33. Diagnostic route was
      temporary and has been deleted; the numbers above are the only
      lasting artifact, same discipline as items 22/29.
35. **Tested the classic "handcuff" idea directly** — does a player's
    target/touch share meaningfully increase in weeks a same-position
    teammate is Out/Doubtful, and if so, does that translate into being
    the better start that week. A genuinely new kind of signal for this
    document: every prior item measured a player's own recent stats;
    this one measures a *roster-relative, current-week* fact (is a
    teammate out right now), using nflverse's real injury-report data
    (item 18) joined against a historical team+position roster set
    (built from weeks strictly before the target week — same
    no-hindsight discipline as `positionDefenseTable`/`seasonToDateTable`
    — so this correctly returns nothing in week 1, before any roster
    composition is knowable).
    - **Step 1 — effect size first, before any grading**: for each
      player, split their own played weeks into "teammate limited" vs.
      "normal" and compared average share (a within-player paired
      design, not a raw pooled average, since pooling would confound the
      effect with which players happen to have more of each kind of
      week). **Result: a large, stable RB effect** (rush share among a
      team's RBs: +7.8pp in 2025, +8.3pp in 2024, n=75-102 qualifying
      players, 201-247 teammate-out weeks) — remarkably consistent
      across seasons, one of the largest effect sizes found in this
      entire investigation. **WR and TE show the same direction but much
      smaller magnitude** (target share: WR +1.7pp both seasons; TE
      +0.9-1.9pp, noisier) — real, but modest, since targets are
      naturally split across more pass-catchers than RB touches are
      split across backs.
    - **Step 2 — graded as a standalone baseline** (`pickByTeammateOutBump`
      in `baselines.ts`, backed by a new `BacktestWeekSlice.hasLimitedTeammate`
      helper in `weekData.ts`): pick whoever currently has the bump, when
      exactly one of the two paired players does. **A genuinely
      counterintuitive result**: RB's large +8pp effect barely beats
      chance once graded (52.4% 2025, 51.2% 2024, n=42-43) — a bigger
      slice of touches doesn't mean a bigger slice of *points*, plausibly
      because a bumped backup RB is still usually lower-talent than
      whoever they're paired against. **WR, despite its much smaller
      effect size, was the more useful signal**: 55.9% (2025, n=68) /
      53.8% (2024, n=65) — modest but stable in both seasons. **TE was
      too thin and unstable to trust** (68.8%→44.4%, n=16-18).
    - **Step 3 — took WR to full integration, since it cleared the
      "shows promise" bar**: added `hasLimitedTeammate: boolean` to
      `PlayerComparisonInput` (computed differently per mode, same
      live-vs-backtest split as the engine's existing injury flagging —
      `weekSlice.hasLimitedTeammate` for backtest, SportsDataIO's live
      `Player.InjuryStatus` scanned across `getAllPlayers()` for live
      mode) and a new additive term in `engine.ts`. Unlike every other
      additive term in this file, this backs a *boolean* flag, not a
      continuous rate, so the shape is a flat bonus when true
      (`weight * POINTS_PER_TEAMMATE_OUT_BUMP_WR`), not the usual
      blend-toward-an-absolute-estimate pattern (which would incorrectly
      pull every non-flagged player toward a fixed value as weight
      increases). `POINTS_PER_TEAMMATE_OUT_BUMP_WR=1.014` computed as
      the within-player average PPR-point differential (teammate-out
      minus normal weeks) across the full 2025 season.
    - **Swept 0.1-1.0 against both seasons — a clean rejection, not a
      tradeoff.** Every nonzero weight made BOTH 2025 (58.3%→57.4%) and
      2024 (59.5%→58.5%) worse — unlike QB rushing/WR drop rate, where
      one season improved as the other declined, here both seasons move
      the same (wrong) direction together. Same failure mode as QB
      success rate (item 33): a real, stable standalone signal that adds
      nothing once blended into an already-tuned score.
      `TEAMMATE_OUT_BUMP_WEIGHT_WR` stays at 0 — code kept, not deleted,
      same precedent as every other rejected signal.
    - **Net takeaway for future signal-hunting in this document**: effect
      size and predictive/gradeable accuracy are not the same thing, and
      neither is standalone baseline accuracy the same thing as
      integration value — three different bars, and a signal can clear
      any subset of them independently. RB cleared none past step 1; WR
      cleared steps 1-2 but not step 3.
36. **Added a 2024 (nflverse-only) path to the Backtest page's Single
    pair mode** — closing the scope gap flagged since item 24: only
    Broad mode had a 2024 equivalent, since the single-pair UI's player
    search only ever queries SportsDataIO (real SportsDataIO PlayerIDs),
    while the 2024 nflverse-only pipeline identifies players by its own
    *synthetic* PlayerIDs (assigned in `gameLog.ts` from
    `player_display_name`, a completely different ID space with no
    relationship to SportsDataIO's). Rather than build a parallel
    2024-specific search UI, resolved the gap server-side: a new
    `resolveSdioNameToNflverseId()` (`playerMatch.ts`) takes whichever
    SportsDataIO player the existing search already returned, looks up
    their real name, and re-joins it into nflverse's synthetic ID space
    — the same name-normalization join used everywhere else in this
    pipeline, just run in the reverse direction. A genuine name-mismatch
    miss (~1% of players, the same rate documented on
    `normalizePlayerName`) throws a typed `PlayerNotInNflverseSeasonError`
    that the route surfaces as a clear 404 message, never a silent wrong-
    player substitution.
    - New `runPairBacktestNflverseOnly()` (`runBacktestNflverseOnly.ts`)
      mirrors `runBacktest.ts`'s `runPairBacktest` — same per-week loop,
      sourced from `loadNflverseOnlyRunData` instead — with the name
      resolution step in front. `BacktestRunData` (`loadRun.ts`) gained
      one new optional field, `gameLogPlayerIdByNormalizedName`, set only
      by the nflverse-only loader; the primary SportsDataIO pipeline is
      untouched by this addition. New route:
      `/api/backtest/pair-nflverse`.
    - **Frontend**: the Season toggle (previously rendered only in Broad
      mode) now renders for both modes, and `BacktestCaveatNote`'s
      nflverse caveat now shows whenever 2024 is selected, regardless of
      mode — matching how the caveat already worked for Broad mode.
    - **Verified live in the browser**, not just via curl: selected 2024
      in Single pair mode, searched and added Lamar Jackson and Joe
      Burrow (both resolved via the existing SportsDataIO-backed search),
      ran the backtest, and got back real week-by-week 2024 results
      (correct real scores each week, e.g. week 7's 34.4 vs. 14.9,
      matching real 2024 box scores) labeled "Showing 2024 results
      (nflverse-only)" — confirmed this is genuinely running the
      nflverse-only pipeline end-to-end through the UI, not just the API
      in isolation. Regression-checked 2025 Single pair and both Broad
      modes immediately after — all three unchanged from their
      previously-recorded numbers.
37. **Scoped out nflverse's `depth_charts` release as a candidate signal
    (official pregame role designation — starter vs. backup — rather
    than anything derived from box-score stats) and found a real,
    non-trivial blocker before writing any code.** 2024's file has the
    expected clean `season`/`week`/`game_type`/`depth_team` schema (the
    official weekly NFL depth-chart submission format — confirmed real
    counts: e.g. 1087/1049/881 RB-weeks at depth_team 1/2/3, exactly the
    "is this player the starter" signal this was meant to test). **But
    2025's file uses a completely different schema** — keyed by `dt` (a
    raw ESPN-scrape timestamp, 221 distinct snapshots across the season,
    no `week` column at all) rather than the season/week format every
    other nflverse source used in this project shares across both
    backtest seasons. This is the first source where 2024 and 2025 are
    structurally incompatible, not just a name/column-naming quirk like
    the LAR/LA or season_type/game_type catches in earlier items —
    reliably mapping each snapshot to "the week it represents" would be
    its own nontrivial, leakage-prone inference problem (depth charts
    shift continuously; a snapshot taken days before kickoff may not
    match gameday reality) before the actual signal could even be tested
    standalone. Deliberately stopped here rather than building the 2025
    mapping speculatively — no code was written, this is a scoping
    finding only. See open items below.
38. **Tested fitting each position's weights jointly (a per-position
    logistic regression) instead of the hand-tuned, one-signal-at-a-time
    additive blend this whole document has used so far** — the natural
    next question once several validated signals existed per position
    (RB: red-zone touches + EPA-per-rush; WR: target share + separation +
    drop rate; TE: snap share; QB: rush volume). Built as a standalone
    backtest experiment, same discipline as every other candidate
    approach in this document: prove it before shipping it.
    - **Deliberately reused, not re-derived, the engine's own raw
      per-player signals** (`scorePlayer()`'s `blendedScore`/
      `matchupModifier`/`recentVolumeAvg` plus each position's validated
      signal(s) above) as the joint model's features, so the comparison
      isolates one variable — *how* the inputs get combined into a final
      score (a fixed, sequentially-tuned additive blend vs. a jointly-fit
      linear model) — rather than also changing *what* data each approach
      sees. Framed as pairwise classification on the same broad-mode
      adjacent-rank pairs every other number in this document uses
      (`buildAllPairsForWeek`): feature = the two players' raw-signal
      difference, label = who actually outscored whom that week. A
      no-intercept, L2-regularized logistic regression (features
      standardized per position) was fit via gradient descent — no
      intercept is deliberate, not an oversight: pairing always lists the
      higher-season-rank player first, so an intercept would conflate
      real signal with list order; a model with no intercept is exactly
      antisymmetric, the correct shape for "which of these two wins."
    - **Fit on the full 2025 season** (mirroring how the hand-tuned
      weights were also swept against the full 2025 backtest), then
      checked three ways: in-sample 2025 accuracy, 5-fold cross-validated
      2025 accuracy (an honest check, since a higher-capacity jointly-fit
      model risks overfitting a single season more than the engine's
      low-parameter blend does), and true out-of-sample 2024 accuracy
      using the 2025-fit weights/standardizer completely unchanged — the
      same generalization check every other tuned weight in this document
      has been put through. The hand-tuned engine's own accuracy was
      recomputed on these *identical* row subsets (not just quoted from
      its documented headline number) for a fair apples-to-apples.
    - **Results (overall, n=610 2025 / 607 2024):**

      | | in-sample 2025 | 5-fold CV 2025 | out-of-sample 2024 |
      |---|---|---|---|
      | joint logistic regression | 56.4% | **48.9%** | **50.7%** |
      | hand-tuned engine (same rows) | — | 57.5% | 56.3% |

      By position, the same pattern holds everywhere except one:

      | position | joint in-sample | joint CV | joint 2024 | engine 2025 | engine 2024 |
      |---|---|---|---|---|---|
      | QB | 57.8% | 48.0% | 48.0% | 52.9% | 55.9% |
      | RB | 56.2% | 50.2% | 48.0% | 59.6% | 52.9% |
      | WR | 57.8% | 52.9% | 51.0% | 58.3% | 59.5% |
      | TE | 52.5% | **38.6%** | 58.4% | 56.4% | 57.4% |

    - **The in-sample number is a mirage.** 56.4% looks competitive with
      the engine's 57.5% — but that's exactly the number a higher-
      capacity model is expected to produce on the data it was fit to.
      Both the 5-fold cross-validation (48.9%, a coin flip) and the true
      2024 out-of-sample check (50.7%) expose it: the jointly-fit model
      does not generalize, while the hand-tuned engine — checked on these
      same identical pairs — clearly does (57.5%/56.3%).
    - **Confirmed this wasn't just an under-regularized default before
      rejecting it** — swept L2 strength from 1 to 3000 (same "sweep it,
      don't guess" discipline as every weight in this document):

      | L2 | 1 | 5 | 20 | 50 | 100 | 200 | 500 | 1000 | 3000 |
      |---|---|---|---|---|---|---|---|---|---|
      | CV 2025 | 48.9% | 49.7% | 49.2% | 49.8% | 49.7% | 49.5% | 49.7% | 50.5% | 46.9% |
      | 2024 | 50.7% | 51.4% | 51.7% | 52.1% | 52.9% | 52.9% | 52.6% | 49.9% | 45.3% |

      Cross-validated accuracy never clears ~50.5% anywhere on this
      curve — genuinely flat at chance, not a tuning problem — and 2024
      out-of-sample tops out around 52.9% (L2=100-200) before collapsing
      as regularization gets heavy enough to wash out even the real
      blendedScore/volume signal. Nowhere on the curve does the joint
      model approach the engine's 56.3% on identical 2024 pairs.
    - **Best guess why a "more rigorous" joint fit loses to a hand-tuned
      one here**: sample size relative to model capacity. ~100-200 pairs
      per position is enough to fit 4-6 free parameters to real
      training-set noise, especially with real collinearity between
      `blendedScore` and `recentVolumeAvg` (better players get both more
      volume and more points). The hand-tuned engine's weights, by
      contrast, were never fit by unconstrained optimization at all —
      each one was swept for a *plateau*, not a peak (see items 9/10/20),
      and several were independently checked against 2024 before shipping
      (items 30/33) — a much stronger implicit regularizer than a generic
      L2 penalty on standardized coefficients.
    - **TE's cross-validation number (38.6%, worse than any other
      bucket) is likely small-sample noise, not a real finding** — TE has
      the smallest pool in this whole document (n=101) and has been the
      noisiest position throughout (see items 5/10/20). Its out-of-sample
      2024 result (58.4%) is, oddly, the one case where the joint model
      matches the engine — read this as a coincidence of a thin sample,
      not evidence the joint approach works better at TE specifically.
    - **Not integrated — closed as a documented negative finding.** This
      doesn't undermine the project's existing tune-one-signal-at-a-time-
      and-validate-out-of-sample discipline; if anything it reinforces it
      — that more statistically "principled" joint fitting loses cleanly
      to the conservative, plateau-seeking, cross-season-checked hand-
      tuning process this document has used throughout, at this data
      scale (~600 pairs/season). Worth revisiting if a much larger
      multi-season sample ever exists, but not worth pursuing further on
      two seasons of this size. The temporary `jointModel.ts` module and
      its diagnostic route were deleted after recording these numbers,
      same as the temporary diagnostics behind items 22/29/34 — this
      write-up is the only lasting artifact.

39. **Extended the nflverse-only backtest pipeline to 2022 and 2023,
    doubling the out-of-sample seasons available from one (2024) to
    four (2022-2025), then used the bigger pooled sample two ways: a
    general robustness check, and a re-test of two signals previously
    rejected for looking too thin on sample size alone rather than for a
    wrong underlying idea (QB goal-line rushing — item 30 follow-up;
    high-wind WR — item 34).**
    - **Verified compatibility live before building anything** (not
      assumed): fetched the real 2022/2023 nflverse-data release assets
      for every source the nflverse-only pipeline depends on —
      `stats_player_week`, `snap_counts`, `injuries`, `ftn_charting`,
      `play_by_play`, `nextgen_stats`, and `schedules` — and confirmed
      byte-identical column schemas to the already-validated 2024/2025
      files (including `injuries`' `game_type`-not-`season_type` quirk
      from item 26, present the same way in both new seasons). Team
      codes also matched exactly between `schedules`' `home_team`/
      `away_team` and `stats_player_week`'s own `team` column for both
      seasons (e.g. both use `LA` for the Rams) — unlike item 34's
      SportsDataIO-vs-nflverse `LAR`/`LA` mismatch, no team-code fix is
      needed here since this pipeline never touches SportsDataIO's own
      codes at all.
    - **Built a permanent, reusable multi-season pooling capability**
      rather than a one-off script, since "get more robust weight tuning
      overall" is an ongoing need, not a single check: extracted the
      per-season week/pair walk shared by every nflverse-only entry point
      into `collectBroadResultsForSeason` (`runBacktestNflverseOnly.ts`),
      then added `runBroadBacktestNflverseOnlyMultiSeason` on top of it,
      pooling engine + full baseline-suite grading across an arbitrary
      season list (default 2022-2025) while still reporting a per-season
      breakdown alongside the pooled numbers — same "don't average away
      a real per-bucket difference" discipline as `summarizeByCloseCall`.
      New route: `/api/backtest/broad-nflverse-multiseason`. Deliberately
      runs *all four* seasons — including 2025 — through this same
      nflverse-only pipeline rather than mixing in the SportsDataIO
      pipeline's own 2025 numbers, so every pooled season is paired/
      scored by identical plumbing (item 24 already found the two
      pipelines agree within ~0.15pp on 2025 in aggregate). Seasons load
      sequentially, not concurrently, to avoid reproducing the peak-
      memory reliability problem item 27 fixed for the single-season
      case.
    - **General robustness result: the engine holds up remarkably
      consistently across all four individual seasons** — 2022 55.6%,
      2023 54.8%, 2024 56.3%, 2025 56.4% (pooled: 55.8%, n=2437) — no
      season is a wild outlier, which is itself a meaningfully stronger
      claim than the two-season generalization checks earlier items
      relied on. By-position pooled (QB 57.1%, RB 55.7%, WR 54.3%, TE
      57.6%) is also more balanced than any single season showed — TE,
      the weakest position throughout this document, is no longer
      clearly the laggard once pooled. The confidence-calibration
      inversion flagged in items 21-23 and left as a soft, unconfirmed
      lean in item 29 (limited-data picks outperforming "confident"
      ones) reappears at a much bigger scale (confident 52.3% n=778 vs.
      limited-data 58.3% n=1449) — still not formally re-tested for
      significance here, but a sample this size makes the pattern harder
      to dismiss as noise; flagged as worth a dedicated pass rather than
      chased further in this one.
    - **Deliberate scope limit**: did not re-sweep every already-shipped
      weight (`VOLUME_BLEND_WEIGHT`, `REDZONE_BLEND_WEIGHT_RB`,
      `SNAP_SHARE_BLEND_WEIGHT_TE`, `RB_EPA_BLEND_WEIGHT`,
      `DROP_RATE_BLEND_WEIGHT`) against the pooled sample — that's a
      larger undertaking than what was asked this pass, which was to
      extend the pipeline and specifically revisit the two
      sample-size-limited signals below. Worth a dedicated follow-up.
    - **QB goal-line rushing re-swept — same instability, better proof
      of it.** Pooled goal-line-touch volume nearly quadrupled (592 touches
      / 408 decidable QB pairs, vs. 138 touches / ~100 pairs on 2025
      alone) — recomputed the conversion factor the same "ratio of sums"
      way (59.80, close to the single-season 64.543, not re-derived in
      `config.ts` to avoid disturbing the shipped constant). Swept
      `w=0` through `0.5` against the pooled sample:

      | `w` | pooled | 2022 | 2023 | 2024 | 2025 |
      |---|---|---|---|---|---|
      | 0 (baseline) | 57.1% | 59.8% | 58.8% | 55.9% | 53.9% |
      | 0.1 | 56.9% | 62.7% | 55.9% | 55.9% | 52.9% |
      | 0.2 | 57.8% | 63.7% | 57.8% | 55.9% | 53.9% |
      | 0.3 | 56.1% | 62.7% | 52.9% | 54.9% | 53.9% |
      | 0.5 | 56.9% | 62.7% | 54.9% | 53.9% | 55.9% |

      The pooled number moves in a shallow, noisy 56.1-57.8% band with
      no clean plateau — and the by-season columns show exactly why:
      2022 improves sharply at *every* nonzero weight (+3-9pp) while
      2023 gets steadily *worse* (58.8%→52.9% by `w=0.3`, a real -5.9pp
      swing) and 2024/2025 stay roughly flat. A 4x bigger sample didn't
      resolve the instability that kept this signal unshipped in items
      30/30a — it replaced "too little data to tell" with a materially
      different and more decisive verdict: **genuinely unstable even
      with four seasons pooled**, not just data-starved. Still not
      shipped — `QB_GOAL_LINE_BLEND_WEIGHT` stays at 0 in `config.ts`,
      doc comments there updated with this result.
    - **High-wind WR re-tested — and this time it held up.** Rebuilt the
      weather join deleted after item 34 (`getGameWeatherByTeamWeek`,
      now a permanent reader in `schedules.ts`, keying a team+week to
      that game's roof/temp/wind from the same `schedules` release used
      for byes), and re-ran "avoid the high-wind player" across all four
      positions at four thresholds, pooled across 2022-2025:

      | position | wind≥10mph | wind≥12mph | wind≥15mph | wind≥18mph |
      |---|---|---|---|---|
      | QB | 52.5% (n=118) | 53.3% (n=90) | 51.3% (n=39) | 46.7% (n=15) |
      | RB | 49.5% (n=212) | 51.9% (n=160) | 53.8% (n=80) | 50.0% (n=26) |
      | WR | 55.3% (n=199) | 53.9% (n=141) | 55.4% (n=65) | 44.4% (n=18) |
      | TE | 45.5% (n=110) | 49.4% (n=83) | 55.6% (n=36) | 61.5% (n=13) |

      **WR is the one real difference from item 34's two-season test.**
      There, WR's signal *inverted* between the trustworthy 10mph
      threshold (58.8%/60.0%) and the intuitive-but-thin 15mph one
      (68.2%/42.9%) — the two couldn't both be right. Pooled across four
      seasons, that inversion is gone: 10/12/15mph now agree with each
      other (53.9-55.4%), a more modest number than the original 10mph
      reading but a genuinely stable one across three different
      thresholds and a much bigger sample (n=65-199 vs. n=37-101
      before). 18mph is still thin (n=18) and still noisy — consistent
      with every other over-narrow cutoff in this document. RB/QB/TE
      show the same negative/inconsistent pattern as item 34 (RB: no
      wind effect on the run game, as expected; QB: weak; TE: noisy,
      this document's chronic small-sample position).
    - **Promoted WR wind to a real, permanent standalone baseline** —
      the first time this session's re-tests actually cleared the bar,
      rather than just refining a rejection. Shipped at the 10mph
      threshold specifically *because* it's the best-populated, most
      stable point, not the highest single-point accuracy — the same
      "prefer the trustworthy plateau over the intuitive-but-thin peak"
      lesson item 34 itself first drew. Required real plumbing, not just
      a throwaway script, to match how every other validated standalone
      signal in this document is wired: `teamWeatherByTeamWeek` added to
      `BacktestRunData` (populated only by `loadRunNflverseOnly.ts` —
      the primary SportsDataIO pipeline has no weather data and doesn't
      share nflverse's team-code conventions closely enough to join
      directly, so it's simply absent/empty there, degrading to no_pick
      like every other optional signal) and threaded through
      `sliceWeekData`/`BacktestWeekSlice`. New `pickByWind` in
      `baselines.ts` (WR-only, mirroring the position-scoping pattern
      used throughout this file). Verified end-to-end through the real
      shared pipeline, not just the throwaway sweep script: the real
      `wind` baseline via `/api/backtest/broad-nflverse-multiseason`
      returned 55.9% (n=195) — matching the standalone experiment's
      55.3% (n=199) within the noise of minor tie-handling differences
      between the two harnesses. **Not integrated into the live
      engine** — same architectural blocker flagged in item 34 and the
      Overview's "Candidate future improvement" note: this looks up the
      target week's own actual recorded conditions, not a pregame
      forecast, so it isn't live-wireable until the tool does
      next-opponent lookup. It now sits at the same status as
      separation/target share: a real, permanent, validated standalone
      baseline that isn't (yet) part of `finalScore`.
    - **Temporary code cleaned up, permanent code kept**: the ad hoc
      sweep/test harness (`signalRevisitExperiment.ts` and its
      diagnostic route) was deleted after recording these numbers, same
      discipline as items 22/29/34/38 — but `getGameWeatherByTeamWeek`,
      the `teamWeatherByTeamWeek` plumbing, and `pickByWind` all persist
      as real code, since (unlike goal-line QB rushing) this signal
      actually cleared the bar this time.

40. **Quick cross-position checks on already-validated signals** — not a
    new investigation, just asking whether a signal validated (and in
    some cases shipped) at one position says anything at positions it
    wasn't scoped to, using code and data that already existed (the
    pooled 2022-2025 sample from item 39, the existing `baselines.ts`
    pickers). One new picker was added (QB's own rushing EPA), everything
    else reused as-is. Standalone-only — no engine/config changes.
    - **The user's literal example — WR drop rate at TE — is slightly
      negative on the bigger pool**: 46.4% (n=280), down from the
      original single-season 50.0%/54.8% (item 32). Reinforces, with a
      cleaner number, why TE is exempted from `DROP_RATE_BLEND_WEIGHT`.
      WR's own standalone drop-rate number also softened pooled (49.0%,
      n=643, vs. the original 52.4%/53.1%) — worth flagging honestly: the
      *standalone* picker looks closer to chance at this larger sample
      than it did on either single season, even though the signal still
      earned its keep once *blended* into the full engine score in item
      33 (a real, if modest, WR-specific gain as weight increased). A
      weak standalone signal and a real marginal contribution once
      stacked with several other signals aren't a contradiction, but
      it's a good reminder not to over-read a single season's standalone
      number the way items 9/10/20 already cautioned against.
    - **TE's shipped snap-share signal isn't particularly TE-special once
      pooled**: TE 54.5% (n=393, down from the single-season 57.7%), but
      RB 54.6% (n=786) and WR 52.7% (n=786) land in the same modest
      52-55% band — snap share looks like a broadly modest opportunity
      signal across positions at this sample size, not a TE-specific
      standout the way the original number suggested.
    - **RB's red-zone-touches signal, cross-tested at QB, moved from
      near-chance to a real positive** — 56.3% (n=355), up from the
      original single-season 49.5% (item 19). WR stayed a negative
      finding (48.6%, n=722, consistent with item 19's 43.0%) and TE
      stayed near chance (51.7%, n=356, vs. 48.8%). Not chased further
      this pass — QB already has its own red-zone/goal-line rushing
      story (items 30/30a/39) — but worth remembering if QB rushing
      signals get revisited again.
    - **Separation (the WR/TE receiving tiebreaker) softened at TE
      pooled**: 49.1% (n=334, down from the single-season 53.8%) while
      WR held (53.6%, n=773, vs. 54.1%) — reinforces why the composite
      tiebreaker (item 17/20) was scoped WR-only rather than WR+TE.
    - **The one genuinely new result: QB's own rushing EPA-per-play**
      (distinct from `qbEpaPerDropback`, already tested and rejected in
      item 31 at 38.0%/44.0% — this reads the same `rushEpaPerPlay`
      field RB's shipped EPA signal uses, just for a QB's own carries
      instead of a RB's). **54.8% pooled (n=398)** — modestly positive,
      and notably not showing the wild season-to-season sign-flips every
      other QB-rushing signal in this document has shown (items
      25/26/30/30a). A real candidate worth a proper look (by-season
      breakdown, integration sweep) if QB rushing gets revisited again —
      flagged here as a lead, not chased further this pass per the
      "quick check" scope.
    - Temporary code (`crossCheckExperiment.ts` and its diagnostic route)
      deleted after recording these numbers, same discipline as items
      22/29/34/38.
41. **Followed up on item 40's QB-rushing-EPA lead — by-season stability
    check, then an integration sweep, then shipped it at a user-approved
    weight.** The most thorough QB-rushing investigation in this
    document, and the first one that actually shipped.
    - **Standalone by-season breakdown was the real test**: 58.6% (2022) /
      59.4% (2023) / 49.5% (2024) / 51.5% (2025) — never below chance,
      genuinely more stable than every prior QB-rushing signal (total
      attempts, red-zone-only, goal-line-only, NextGen rushYoe), all of
      which swung from clearly-below-chance to clearly-above-chance
      across seasons. One caution surfaced alongside this: the
      *conversion factor* itself (points per unit of EPA) swings hard by
      season (47.4 / 149.7 / 33.0 / 34.9) even though the win/loss picks
      don't — a different kind of instability than the pick-accuracy
      swings every other QB-rushing signal showed.
    - **Confirmed the sum-safety check RB's EPA integration needed
      (item 33) doesn't apply here**: QB rushing EPA sums POSITIVE in
      every season (183.65 / 58.07 / 276.78 / 254.27), unlike RB's
      rushing EPA which summed negative and forced an OLS-regression
      workaround. Plain "ratio of sums" is safe — computed from the full
      2022-2025 pooled sample (45.814 points per unit) rather than 2025
      alone, since the whole point of this signal was cross-season
      robustness.
    - **Integration sweep (additive term, mirroring RB EPA's shape) was
      genuinely mixed, not a clean win**: pooled QB accuracy peaked at
      58.1% (w=0.2, vs. 57.1% baseline), but 2024 declined
      *monotonically* at every nonzero weight tested (55.9%→50.0%) while
      2022/2023/2025 improved or held flat — not the "every season at or
      above baseline" shape RB's EPA integration showed.
    - **Reframed at the whole-model level before deciding — this mattered
      a lot.** QB is one of four position pools, so even QB's best-case
      +1pp gain only moved *overall* accuracy by +0.16pp (55.77%→55.93%
      pooled). Checked one more thing before asking for a decision: did
      the model still beat the simple `recentVolume` baseline in every
      individual season at w=0.2? Yes — and 2025 (the one season the
      model currently loses to `recentVolume` on, 56.4% vs. 56.6%)
      flipped to winning (56.9% vs. 56.6%).
    - **Put the tradeoff to the user rather than resolved unilaterally**
      (same precedent as items 30/33): small-but-real whole-model gain,
      universal-baseline-beating preserved and even improved in the one
      season that was previously a loss, against a real, monotonic
      2024-specific QB decline. **User chose to ship at w=0.2.**
    - **Shipped as `QB_RUSH_EPA_BLEND_WEIGHT=0.2`**/
      `POINTS_PER_QB_RUSH_EPA=45.814` in `config.ts`, following the exact
      same additive-term pattern as every other QB modifier
      (`engine.ts`'s `qbRushEpaModifier`, stacked after
      `qbSuccessRateModifier`). New `NflverseSignals.qbRushEpaPerPlay`
      field and `aggregate.ts`'s `averageQbRushEpa()` (QB-only; reads the
      same `rushEpaPerPlay` field RB's shipped signal uses, distinct from
      `epaPerPlay`'s QB mapping to `qbEpaPerDropback`, a passing-EPA
      signal already tested and rejected in item 31). Wired into both
      `buildBacktestInput.ts` and `buildInput.ts` (live), matching every
      other signal's live/backtest parity.
    - **Verified against the real shipped code, not just the sweep
      harness** — the temporary sweep script approximated the rushing-EPA
      average by walking `recentGamesByPlayer` directly, while the
      shipped code uses the canonical `recentNflverseByPlayer()` window
      every other signal uses; the two differ slightly on which weeks
      they include at the margin. Re-ran the real pooled backtest after
      shipping to get the authoritative numbers (slightly different from
      the sweep's approximation, same overall story): pooled QB 57.1%→
      57.8%, overall 55.77%→55.89%, 2024 QB 55.9%→52.0% (a bigger dip
      than the sweep predicted), 2023 QB 58.8%→61.8% (a bigger gain).
      Every individual season still beat `recentVolume` post-ship (2022
      55.6% vs. 55.5%, 2023 55.2% vs. 53.3%, 2024 55.7% vs. 53.3%, 2025
      57.0% vs. 56.6%).
    - **Verified live end-to-end**, not just backtest: a real
      `/api/compare` request (Lamar Jackson vs. Joe Burrow, 2025 season)
      showed `qbRushEpaModifier` firing in both directions as expected —
      negative for Jackson (0.14 EPA/rush, below what his running score
      already implies) and positive for Burrow (0.39 EPA/rush, well
      above), with the new note ("Averaging X.XX EPA per rush attempt
      recently (as a runner)...") rendering correctly for both.
    - Temporary sweep code (`qbRushEpaExperiment.ts` and its diagnostic
      route) deleted after shipping — unlike prior QB-rushing attempts,
      this one has real, lasting production code, not just a write-up.
42. **Revisited item 38's joint logistic regression rejection now that
    the pooled sample is ~4x bigger** (~2437 pairs vs. ~600/season) —
    item 38 explicitly flagged this as worth revisiting "if a much larger
    multi-season sample ever exists." Rebuilt `jointModel.ts` (deleted
    after item 38) with the current engine's full feature set per
    position, now including `qbRushEpaPerPlay` (shipped since item 38, in
    item 41) alongside the original signals — same no-intercept,
    L2-regularized logistic regression on standardized pairwise-diff
    features as before.
    - **Added a genuinely stronger test than item 38 had access to**:
      leave-one-season-out cross-validation (train on 3 seasons, test on
      the 4th held-out one, repeated for each of the 4 seasons) — a real
      "never seen this season" check, unlike item 38's single 2025-train/
      2024-test split or plain k-fold CV within one season (which only
      tests generalization to a random subset of the *same* season).
    - **Result: the gap narrowed substantially but the hand-tuned engine
      still wins clearly.** Pooled (n=2437, l2=1): in-sample 55.7%,
      10-fold CV 53.5%, leave-one-season-out 51.9%, vs. the engine's
      55.9% on identical rows. Swept L2 from 1 to 5000 to find the best
      case for the joint model (same "don't reject on an under-tuned
      default" discipline as item 38): leave-one-season-out peaked at
      53.5% (l2=500) before declining at higher regularization and
      collapsing by l2=5000 — still a real ~2.4pp gap behind the engine
      at its best point, down from item 38's original ~5-7pp gap (where
      the joint model was at-or-below chance on every honest check).
    - **By position (l2=1), the engine wins everywhere on
      leave-one-season-out, by an uneven margin**: QB 53.7% vs. 57.8%
      (4.1pp), RB 51.5% vs. 55.7% (4.2pp), WR 50.0% vs. 54.3% (4.3pp,
      the joint model is genuinely a coin flip here), TE 55.1% vs. 57.5%
      (2.4pp, the closest of the four — TE's smaller, noisier pool may
      just mean less room for the engine's tuning discipline to compound
      an edge). Per-season breakdown shows the joint model's held-out
      accuracy swinging hard by which season is held out (QB: 61.8% held
      out 2022, 48.0% held out 2024 — a 13.8pp spread) — it isn't
      learning a uniformly transferable pattern the way the engine's
      cross-season-checked weights do, just a better one on average than
      item 38 found.
    - **Conclusion: more data was a real, measurable improvement, but not
      a reversal.** The direction of item 38's finding holds — the
      conservative, plateau-seeking, cross-season-validated hand-tuning
      process this document has used throughout still beats a jointly-
      fit model at this data scale — but the margin shrank from "joint
      model is at chance" to "joint model is real but ~2-4pp behind,"
      which is itself informative: it suggests the original gap was
      partly a genuine sample-size problem (as item 38 speculated) and
      partly a real methodological edge that hand-tuning holds regardless
      of sample size. Not chased further (e.g. no attempt to combine the
      two approaches) — closed as a confirmed, updated rejection.
      Temporary code (`jointModel.ts` and its diagnostic route) deleted
      again after recording these numbers.

43. **Re-swept all five already-shipped blend weights against the pooled
    2022-2025 sample** (`VOLUME_BLEND_WEIGHT`, `REDZONE_BLEND_WEIGHT_RB`,
    `SNAP_SHARE_BLEND_WEIGHT_TE`, `RB_EPA_BLEND_WEIGHT`,
    `DROP_RATE_BLEND_WEIGHT`) — all five were originally tuned against
    2025 alone or a 2025/2024 two-season check, a scope limit item 39
    explicitly flagged as worth a dedicated follow-up.
    - **Caught and fixed a real bug in the sweep harness before trusting
      any result — worth recording since it nearly shipped two wrong
      config changes.** The harness re-implements scorePlayer()'s
      finalScore chain (rather than modifying engine.ts) so each weight
      could be varied one at a time. The first version started its
      running score at `blendedScore + matchupModifier` and blended
      volume against that — but engine.ts's actual `volumeModifier`
      blends against `blendedScore` ALONE; matchupModifier only enters
      the running-score basis starting at `redZoneModifier`. That
      silently corrupted every downstream modifier whenever
      matchupModifier wasn't exactly 0 (i.e. almost always). It wasn't
      caught until *after* shipping `SNAP_SHARE_BLEND_WEIGHT_TE` (0.4→
      0.15) and `DROP_RATE_BLEND_WEIGHT` (0.2→0.15) based on the buggy
      numbers — a real-engine check afterward showed TE accuracy had
      dropped from 57.5% to 55.8%, the opposite of what the sweep
      predicted. Both changes were reverted immediately. Fixed the
      harness (matched engine.ts's two-tier structure exactly) and added
      a permanent safeguard: every sweep now cross-checks its own
      "shipped value" reproduction against the real engine's actual
      graded accuracy on the same rows *before* any result is trusted —
      the same "verify against the real code" discipline used
      everywhere else in this document, just applied one step too late
      the first time.
    - **Corrected results: three of the five are already at or very near
      optimal — confirmed unchanged.** `VOLUME_BLEND_WEIGHT` (0.9) sits
      inside a genuine 0.85-1.0 plateau (55.6-56.1%). `SNAP_SHARE_BLEND_
      WEIGHT_TE` (0.4) turned out to be the actual pooled peak (57.5%,
      cleaner than the original 2025-only sweep found). `DROP_RATE_
      BLEND_WEIGHT` (0.2) sits at a real local peak (54.1%) backed by a
      genuine neighborhood, not an isolated spike.
    - **The other two — both RB signals — turned up a real surprise.**
      Pooled across 4 seasons, both `REDZONE_BLEND_WEIGHT_RB` (56.5% at
      w=0 vs. 55.7% shipped at 0.2) and `RB_EPA_BLEND_WEIGHT` (56.2% at
      w=0 vs. 55.7% shipped at 0.3) score HIGHEST at zero weight — i.e.
      no additive term at all pools better than either shipped value. By
      season, only 2025 clearly favors red-zone touches' shipped weight
      (2022/2023/2024 all do worse at 0.2 than at 0); RB EPA is similar
      but slightly more mixed (2024/2025 still favor the shipped weight,
      2022/2023 don't). This is a real reversal from the original
      single/two-season tuning, not confirmation of it.
    - **Deliberately left both at their shipped values rather than
      resolved unilaterally.** These two interact — both apply to RB,
      applied sequentially (red-zone touches feeds into the running
      score RB EPA then blends against) — so evaluating them
      independently, one at a time while holding the other fixed, may
      understate or misstate what a *joint* re-tuning of both would
      show. A proper answer needs a 2D grid search over both weights
      together, not two separate one-at-a-time sweeps; flagged here as a
      follow-up rather than guessed at.
    - Temporary code (`weightResweepExperiment.ts`, both versions, and
      its diagnostic route) deleted after recording these numbers.
44. **Ran the joint 2D re-sweep item 43 flagged as a follow-up** —
    `REDZONE_BLEND_WEIGHT_RB` and `RB_EPA_BLEND_WEIGHT` varied together
    (not one at a time), since both apply sequentially to the same
    position and item 43's independent sweeps may have understated their
    interaction. Verified the harness against the real engine first this
    time (exact match at the shipped point, 452/360) before trusting the
    grid — the same safeguard added after item 43's bug.
    - **Result: a clean, decisive corner optimum, not an ambiguous
      tradeoff.** The pooled-accuracy surface declines smoothly in both
      weights from a single peak at (0, 0) — 57.5%, vs. 55.7% at the
      shipped (0.2, 0.3) — with no interior local maximum anywhere in the
      7×7 grid tested. This is the biggest single-item accuracy gain
      found in the whole four-season investigation.
    - **But it is a real tradeoff, not a free win.** By season: 2022
      (53.7%→57.6%), 2023 (56.9%→59.9%), and 2024 (52.9%→56.4%) all
      improve substantially (+3.0 to +3.9pp each), while 2025 — the
      season both signals were originally validated on — declines
      (59.1%→56.2%, -2.9pp). Checked for a middle-ground weight
      combination that preserves more of 2025 without giving up the
      broader gain; none exists in the tested grid — 2025 specifically
      wants red-zone touches kept nonzero, every other season wants it
      at zero, and moving away from (0, 0) in that dimension costs
      pooled accuracy immediately.
    - **Reframed against the naive `recentVolume` baseline before
      deciding, not just against the signals' own prior values** — this
      changed how the 2025 "cost" reads. RB-only, 2025's recentVolume
      baseline is 59.8%: the shipped engine (59.1%) was *already* barely
      below it, not clearly beating it. At the whole-model level (all 4
      positions), the shipped engine beats the baseline in all 4
      seasons, but only narrowly in 2022 and 2025 (+0.1pp and +0.4pp
      respectively) — and disabling both RB signals flips 2025
      specifically from that narrow win (57.0% vs. 56.6%) to a narrow
      loss (56.1% vs. 56.6%), while widening the win in 2022/2023/2024.
      Whole-model gain: +0.62pp pooled (55.89%→56.50%).
    - **Put the tradeoff to the user rather than resolved unilaterally**
      (same precedent as items 30/33/41): a decisive, broad, 3-season
      pooled gain against a real but narrow whole-model cost in the one
      season these signals were built on. **User chose to disable both**
      (`REDZONE_BLEND_WEIGHT_RB=0`, `RB_EPA_BLEND_WEIGHT=0`) — the
      underlying conversion factors/constants
      (`POINTS_PER_REDZONE_TOUCH_RB`, `RB_EPA_REGRESSION_SLOPE`,
      `RB_EPA_PPR_AT_ZERO`) are kept in `config.ts`, not deleted, same
      precedent as every other zeroed-out signal in this file.
    - **Verified against the real engine, not just the sweep harness**:
      re-ran the pooled 4-season backtest after shipping and got an
      exact match to the sweep's prediction (overall 56.50%, RB 57.51%),
      with QB/WR/TE byte-for-byte unchanged. Verified live end-to-end via
      a real `/api/compare` request (Bijan Robinson vs. Christian
      McCaffrey): `redZoneModifier`/`rbEpaModifier` both correctly read 0
      for both players, while the underlying raw stats
      (`redZoneTouchesAvg`/`epaPerPlayAvg`) still populate and still
      appear in the reasoning notes — the same "note describes the raw
      signal regardless of whether its weight is 0" behavior every other
      zeroed-out signal in this app already has (not a new quirk this
      change introduced).
    - Temporary code (`rbJointSweepExperiment.ts` and its diagnostic
      route) deleted after recording these numbers.

### Open items (as of item 44 — pick up here)
Everything through 06d66f0 ("Re-sweep all five shipped blend weights
against pooled 4-season sample") is committed (`git log`). Item 44 (this
RB joint sweep) is written up above but not yet committed — it shipped
real, lasting config changes (`REDZONE_BLEND_WEIGHT_RB=0`,
`RB_EPA_BLEND_WEIGHT=0`), verified against the real engine and live.
Nothing below is started or fixed yet:

1. **TE drop rate remains unresolved** — noisy and non-monotonic at
   every weight tested in item 33 (smallest sample of anything
   integrated so far), unlike WR's clean tradeoff shape. Deliberately
   left untouched (TE exempted from `DROP_RATE_BLEND_WEIGHT` in
   `engine.ts`) rather than forced into either direction. Would need a
   larger sample (a future season) or a different TE-specific approach
   to resolve, not a quick re-sweep of the existing data.
2. **RB's 2024 drop (58.6%→52.4%) was never decomposed** — confirmed
   real (red-zone data joins and the modifier fires correctly on 2024
   data), but *why* it dropped wasn't isolated the way the original
   weight sweep decomposed 2025's numbers (item 24). Note RB's baseline
   has since shifted with item 33's EPA-per-rush addition (2024 RB is
   now 52.9%, not 52.4%) — worth re-checking this decomposition against
   the current numbers if picked up.
3. **`rushYoe` swings hard between seasons** (44.6%→59.8%) — a NextGen-
   Stats-derived rushing efficiency metric; `qbRushingAttempts` (the
   other signal that showed this same instability) is now addressed by
   item 30's additive-term integration, but `rushYoe` itself was never
   investigated further (item 26).
4. **FTN Charting's pressure/personnel fields** (`n_blitzers`,
   `is_qb_out_of_pocket`, box counts, play-action/RPO/screen flags) were
   deliberately skipped in item 32 in favor of drop/created-reception
   rate — these describe the opposing pass rush/scheme more than the
   player's own skill (the same attribution concern that sank the
   team-level game-script baseline in item 12), so they'd need their own
   dedicated pass to figure out how to attribute them fairly, not a
   quick extension of item 32's join.
5. **Depth charts (starter/backup role) — real signal candidate,
   blocked on a schema incompatibility, not yet resolved.** 2024's
   `depth_charts` file has the clean season/week format needed; 2025's
   is a completely different ESPN-scrape/timestamp format with no week
   column (item 37). Before this can even be standalone-tested
   cross-season, someone needs to either (a) build a reliable
   snapshot-to-week mapping for the 2025 file, or (b) test 2024 alone
   first (accepting no cross-season validation until the mapping is
   solved) to see if the signal is even worth the mapping effort. Not
   started — item 37 deliberately stopped at the scoping stage rather
   than guessing at a mapping.
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
  before the usual name join. `playByPlay.ts` also computes goal-line
  touches, EPA-per-play, success rate (all role-scoped: rush for RB,
  dropback for QB, target for WR/TE), and FTN Charting's drop/created-
  reception rate (target-scoped) in the same single pass over the pbp
  rows — see "Backtesting & Tuning History" items 30-32. `ftnCharting.ts`
  fetches the FTN Charting release (human-charted play-level data — no
  player ID of its own, joined onto `playByPlay.ts`'s pbp rows by
  `game_id`/`play_id`). `playerMatch.ts` does the
  name-normalization join onto SportsDataIO `PlayerID`s (see Data Source
  Notes for the validation story); `weekTable.ts` combines every source
  above into one `PlayerID -> week -> stat` table, built by both
  `backtest/loadRun.ts` (batch, one call for the whole season) and
  `recommendation/nflverseLive.ts` (live, one call per comparison
  request). `aggregate.ts` is the shared, pure "what's a player's recent
  signal value" layer on top of that table (`averageSnapShare`/
  `averageTargetShare`/`averageSeparation`/`averageRedZoneTouches`/
  `averageGoalLineTouches`/`averageSuccessRate`/`averageEpaPerPlay`/
  `averageDropRate`) —
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
  `src/app/api/backtest/broad`, `src/app/api/backtest/broad-nflverse`,
  `src/app/api/backtest/pair-nflverse` (the latter two, item 24/item 36,
  out-of-sample validation only) — Route Handlers that orchestrate the
  lib layers above and return trimmed JSON (never proxy raw upstream
  payloads, never leak the API key).
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
