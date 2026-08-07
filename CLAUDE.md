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
engine against completed seasons using only data that would have been
known before each tested week (see Conventions below for the actual
file layout). The live tool itself is still 2025-only (SportsDataIO),
but backtest mode now covers four seasons (2022-2025, via the
nflverse-only pipeline for anything before 2025) in both Single pair and
Broad modes, plus a permanent pooled-multi-season route/summary for
validating tuning decisions across all four at once — see "Backtesting &
Tuning History" items 24/36/39. A second live tool, the Trade Analyzer
(`/trade`), shipped after v1 — enter any number of players on each side
of a trade and get a graded verdict (good/fair/bad) with reasoning,
built on a rest-of-season value projection rather than a single game
(see "Backtesting & Tuning History" items 47-49 and the Trade Analyzer
paragraph below). A third live tool, the Waiver Wire recommender
(`/waivers`), shipped after that — surfaces players whose recent
opportunity (volume) is running ahead of their recent production, by
position, with a plain-English reason and a suggested same-position
drop candidate; deliberately built on the engine's already-validated
absolute-opportunity signal rather than a trend/delta framing, after a
dedicated backtest of the trend hypothesis came back negative (see
"Backtesting & Tuning History" item 58). Its roster input started as
manual one-by-one marking, then gained real Sleeper league import as
the primary path after that turned out to be the actual pain point —
connect once, one-click sync from then on — with manual marking kept
only for one-off additions (see item 59). The UI went through two
visual passes: a first
cohesive pass (indigo accent, proper nav, consistent card/badge
styling), then a full Apple-inspired redesign that replaced it —
system-font typography (`-apple-system`/`ui-rounded`, no webfont),
a teal `--accent` plus semantic `--good`/`--bad`/`--caution`/`--info`
tokens, a frosted-glass nav with a real segmented control, and squircle
"insight card" styling for both `ComparisonResult.tsx` and
`TradeResult.tsx` — see Conventions for the token system. Deliberately
scoped to the live start/sit and trade pages; the Backtest page's own
internal chrome (mode buttons, season toggle, table) was left on the
prior zinc/rounded-md styling both times, since it's the secondary/
internal validation tool, not a page newsletter readers use directly.
(The accent has since moved off teal to the navy/electric-blue "Prime
Time" palette, and — as of item 64 — the top nav itself was replaced
by a persistent sidebar shell with a real Home landing page; both of
those are separate, later changes from the pass described in this
paragraph, kept here as the original historical record. As of item 80,
the entire visual system described in this paragraph — including the
teal/navy accent, the `-apple-system`/`ui-rounded` typography, and the
Backtest-page exclusion — has been replaced outright by a dark/emerald
"data-grade" system spanning every page with no exclusions; this
paragraph is kept as historical record, not current styling.)
Both live tools also gained real PPR/Half-PPR/Standard scoring-format
toggles — not just a relabeled display, the five active conversion
factors were empirically re-tuned per format and the choice is threaded
all the way through matchup tables, scoring, and the primary backtest's
grading — see "Backtesting & Tuning History" item 50. D/ST and K
(kicker) support — previously explicitly out of scope — shipped after
that, across all three live tools at once (Start/Sit, Trade Analyzer,
Waivers), on a deliberately much simpler model than the skill-position
engine: recent scoring blended with a single matchup signal (opponent's
or the player's own team's Vegas-implied point total), rather than a
dozen blended signals — see "Backtesting & Tuning History" item 62 for
the full backtest and why D/ST's version of that signal turned out to
be a real, strong predictor (63.8% standalone) while K's was weaker
than just ranking kickers by season average. That same D/ST and K
support was extended to the Backtest page's Broad and Single Pair modes
next (item 63) — real, permanent by-position accuracy numbers (D/ST
65.0%, K 52.0%, on the primary 2025 season), not just item 62's one-off
diagnostic. The app's overall navigation was reworked next (item 64):
the old single top NavBar (shared across all pages) was replaced by a
persistent sidebar shell, and a new **Home** page (`/` — Start/Sit
moved to `/start-sit` to make room) now serves as a real navigational
hub across all four tools, plus a "recent comparisons" panel showing
genuine session history rather than placeholder content. The Backtest
page gained a fourth mode next, **Projection accuracy** (item 65) — a
fundamentally different question from every other backtest number in
this app: not "did the engine pick the right player" (every prior
backtest) but "how close does the engine's own score come to real
points scored." Ships with an engine-vs-naive-baseline comparison
(MAE/RMSE/bias), a per-player breakdown, and a player-search mode
showing week-by-week projected/actual/diff — the last of which
surfaced a real, unresolved calibration problem (see "Backtesting &
Tuning History" item 65 and Open Items): the engine systematically
*under-projects* at least one real player (Matthew Stafford, wrong in
the same direction all 16 graded weeks) and can produce *negative*
point projections in-season, neither of which has been investigated
yet — since fixed for the Stafford case specifically, see "Backtesting &
Tuning History" item 66. Scoped to 2025/PPR/skill-positions-only for
this first pass. A fifth live tool, the Lineup Optimizer (`/lineup`),
shipped after that — import a roster from Sleeper or add players by
hand, say how many starters go at each spot, and it fills out the best
lineup, reusing the already-validated `scoreExtendedPlayer`/`finalScore`
exactly as every other live tool (see "Backtesting & Tuning History"
item 76) — the first genuine whole-roster assignment problem this app
has tackled, as opposed to every other tool's pairwise-or-list framing.
The Home page next gained three real "this week" widgets — a lineup
snapshot, a top waiver target, and a genuine cross-team trade suggestion
for connected Sleeper users — reusing each tool's own engine rather than
inventing new logic (item 77). A sixth live tool, **Legit Rankings**
(`/rankings`), shipped after that — every rankable QB/RB/WR/TE (D/ST and
K deliberately excluded) ranked and scored 1-100, blending this app's
own engine snapshot with a genuinely new data source, FantasyPros'
season-long redraft consensus, plus a combined "Overall" cross-position
view (renamed **Top 100** and widened to a real top 100 players
regardless of position, item 84 — see below) and a gold "elite" tier for
90+ scores (item 78). The Start/Sit
result was then restructured (not re-scored) into a punchy verdict
banner — big name, a confidence bar derived from this app's own
already-validated historical accuracy-by-bucket numbers, and the full
signal breakdown moved into a collapsed-by-default "Why this pick"
section (item 79). The whole app's visual identity was then
replaced: a dark/emerald "data-grade" design system (near-black
`#0B0E0C`, a merged emerald `--accent`/`--good`, a gold `--premium`
token, Barlow Condensed headlines, JetBrains Mono on every number) now
spans every page **including Backtest**, which had been deliberately
excluded from both prior visual passes — see item 80 for the full
token/typography system and the real calibration/normalization bugs
items 78 surfaced along the way. The per-tool player-search box used by
every live tool was then unified into one shared component,
`PlayerMultiSelect.tsx` (replacing the old `PlayerSearchInput.tsx`,
deleted) — chips above the input, a selected-count-vs-max counter, a
disabled input with an explanatory placeholder at max, click-outside
close, and refocus-reopen, the same interaction everywhere a player is
picked (item 81). The Waiver Wire and Lineup Optimizer's "Your roster"
panel gained a collapsible header (a shared `CollapsibleSection.tsx`,
also reused by the new per-row collapse in the restyled Waiver Wire
results — see below) and a click-again-to-confirm "Clear" action (a new
`ConfirmButton.tsx`, deliberately not a native `window.confirm()`
dialog, which would have broken out of the app's own styling) (item
82). The Waiver Wire tool's results were then restyled from a two-column
card grid into a compact, collapsible row-list matching Legit Rankings'
own visual pattern, and gained a real quality/efficiency floor — a
candidate's recent yards-per-unit efficiency now has to clear 75% of
their position's real full-season baseline, closing a genuine false-
positive where a badly-performing backup QB forced into volume (real
box-score data, not a bug) still ranked as a top waiver target purely on
"opportunity outpacing production" (item 83). Most recently, the
Start/Sit page itself was substantially redesigned to match a
teammate-shared reference: a sidebar layout, player cards always visible
(not gated behind a global toggle) and ranked by the engine's own real
score, a real floor-to-ceiling range per card (actual min/max of recent
box-score output, not a fabricated projection interval — a new
`recentPprFloor`/`recentPprCeiling` pair on `PlayerScoreBreakdown`), a
position-specific stat grid, a per-card "Why this pick," four reference
labels under the confidence bar, and — after a follow-up question about
why every position showed the same 52% — a genuinely **position-aware**
confidence percentage pulled from this app's own real per-position
backtest history rather than one pooled cross-position number (items
85-86). Matchup context, injury status, and next-opponent/weather were
then moved out of the sidebar and into each player card directly, on
request, closing out the redesign (item 87).
Out of scope so far:
database/persistence, auth. Upcoming-schedule/next-opponent
lookup — previously fully out of scope — is now built AND wired into
live scoring: as of item 93, the live start/sit tool's matchup modifier
looks up each player's *next scheduled* opponent (reusing the same
schedule-lookup infrastructure the Trade Analyzer proved out), which
matches how backtest has always scored matchup (the target week's
opponent). The two paragraphs immediately below are kept as the
historical record of when this was still a candidate improvement; item
93 supersedes them.

**Candidate future improvement: next-opponent lookup for live matchup
context — RESOLVED in item 93; kept below as the historical record.**
The live tool's matchup modifier previously looked up each
player's *last completed* opponent (see above) — for a "who should I
start this week" tool, it arguably should look up their *next
scheduled* opponent instead. This is a smaller, more contained fix than
it might sound: the recent-form engine (PPR average, volume, red-zone
touches, EPA, etc.) wouldn't need to change at all, since it's entirely
about how a player has been performing recently — only the matchup
modifier's opponent identification would need a schedule lookup.
Backtest mode is arguably unaffected/already correct here, since it
grades against the target week's real, already-known historical
opponent. Two real constraints on pursuing this: (1) it can't be tested
against the *live* tool outside the NFL season, since there's no "next
game" to look up during the offseason (verify against backtest data
instead, or wait for the 2026 season to start); (2) weather (wind
specifically has real, well-documented fantasy effects — more than
rain or cold) would be a natural signal to pair with this, but only
becomes relevant once the tool actually knows which upcoming game a
player is playing in — it doesn't fit the current last-opponent
architecture at all.

**Update, now that the Trade Analyzer exists (item 47):** the
"SportsDataIO likely has a `/Schedules` endpoint; not yet confirmed
live" uncertainty above is resolved — confirmed live it does NOT, on
any tested path (every plausible endpoint name returns a clean `404`,
not the `401`-style "paywalled but exists" signature seen elsewhere in
this file). nflverse's `schedules` release fills the gap instead (see
Data Source Notes) and now has real, working code reading it
prospectively — `lib/recommendation/restOfSeason.ts`'s
`sumProjectedPoints`/`computeMatchupModifier`, and the SportsDataIO/
nflverse team-code mapping (`LAR`/`LA`, the only mismatch across all 32
teams). None of that was wired into start/sit's own matchup modifier,
by choice — this update only touches the Trade Analyzer, deliberately
scoped that way rather than changing the already-validated live
start/sit tool as a side effect. But it means this candidate
improvement is now a meaningfully smaller lift than described above if
picked up for start/sit itself: the schedule-reading and team-code-
mapping pieces are already built and proven, just not yet pointed at
`buildInput.ts`'s matchup-context construction.

**Update: next opponent + weather now shown on the start/sit player
cards — was display-only, but as of item 93 the matchup IS now scored
off the next opponent (this paragraph's "still NOT wired into scoring"
framing is historical — see item 93).** Deliberately a
narrower slice of the candidate improvement above: `ComparisonResult.tsx`
now shows each player's next scheduled opponent and that game's weather
(or "Dome" for a fixed-roof stadium), reusing the exact schedule
infrastructure the Trade Analyzer already proved out
(`getRemainingOpponentsByTeam`/`getGameWeatherByTeamWeek`, plus
`restOfSeason.ts`'s `toNflverseTeam`/`toSdioTeam` team-code mapping, now
exported for reuse) — at the time, `finalScore`/`matchupModifier` were
completely untouched and the engine still scored off the *last
completed* opponent (item 93 later pointed the matchup at the next
opponent instead). `PlayerComparisonInput`/
`PlayerScoreBreakdown` gained inert `nextOpponent`/`nextGameWeather`
fields (see Conventions) that flow through `buildInput.ts` →
`scorePlayer` → the API response → the component, never touching
`finalScore`. One real, verified-live limitation this surfaced: nflverse's
`schedules` release does NOT carry a pregame weather *forecast* — `wind`/
`temp` are blank for any game that hasn't been played yet (confirmed live:
even played-months-out 2026 week-1 games show blank wind/temp), only
becoming populated with actual recorded conditions at/after kickoff. Roof
type (dome/outdoors/closed/open) IS known arbitrarily far in advance,
since it's a fixed stadium property, so "Dome" always displays correctly;
for outdoor games the card honestly shows "Forecast not yet available"
rather than fabricating a number — verified live for both cases (a dome
team and a normal-stadium team, months before their next games). This
means the *actually* candidate-improvement-worthy backtest-validated
signal from item 39 (the WR-only `wind` baseline) still can't be
live-wired even now that next-opponent lookup exists for display — it
would need real conditions, not a forecast, and those simply aren't
knowable that far ahead from this data source.

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
  isn't reconstructable from **SportsDataIO's** data, so
  `buildBacktestComparisonInput` never reads this field. nflverse's
  `injuries` release *does* have the real weekly pregame
  Questionable/Doubtful/Out designations (see "Backtesting & Tuning
  History" item 18) — originally used only for one standalone baseline
  test, but as of item 56 it's also wired into the actual backtest
  recommendation (`comparePlayers`' existing Out/Doubtful exclusion now
  gets real data in backtest mode, not just live mode). Not a change to
  how the live tool's own (already-real-time) injury flag works, since
  that was already correct.
  **Gap closed in item 57**: nflverse's weekly injury report only
  captures week-to-week Questionable/Doubtful/Out — a player who
  transitions to longer-term injured reserve typically drops off that
  report entirely (no `report_status` row at all, confirmed live). The
  `weekly_rosters` release's `status` column (`RES` = reserve/injured)
  fills that gap instead — see `nflverse/rosters.ts` and item 57's
  quantified before/after numbers. One remaining, deliberately
  unaddressed gap: game-day-inactive (`INA`) status isn't surfaced,
  since it's announced ~90 minutes before kickoff — close enough to game
  time to be a meaningfully different, murkier leakage question from an
  IR move announced days out.
- **2024 (and presumably earlier) season data is NOT accessible via
  SportsDataIO on this plan** — confirmed directly: any 2024 request
  (e.g. `PlayerSeasonStats/2024`, `PlayerGameStatsByWeek/2024REG/1`)
  returns a clean `401 Unauthorized Season` with "contact
  sales@sportsdata.io" to unlock it; that would require a paid tier
  upgrade. This is a SportsDataIO-specific limit, not a project-wide
  one — the live tool and the *primary* 2025 backtest pipeline both stay
  SportsDataIO-only, but backtest mode's separate nflverse-only pipeline
  (see Conventions) has since been used to validate tuning decisions
  against 2022-2025 anyway (see "Backtesting & Tuning History" items
  24/36/39) — every "re-validate against more data" caveat elsewhere in
  this doc that predates that work is stale in that specific sense; the
  4-season nflverse-only sample is the current out-of-sample check, not
  a wait for the 2026 season.
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
- **SportsDataIO has no game-schedule endpoint on this plan** —
  confirmed live while building the Trade Analyzer (item 47): every
  plausible path (`/Schedules`, `/Games`, `/GamesByWeek`, etc., on both
  the `fantasy` and `odds` hosts) returns a clean `404 Resource not
  found`, not the `401`-style "exists but needs a paid tier" signature
  seen for 2024 season data and red-zone stats above — a genuinely
  different product family this subscription doesn't include at all,
  not a paywall. nflverse's `schedules` release fills this gap for the
  live tool (see `getRemainingOpponentsByTeam` in Conventions) —
  confirmed it already carries the *upcoming* season's full fixture
  list (opponents known, scores blank) as soon as the NFL publishes it,
  not just completed seasons, by pulling the real file mid-2026-offseason
  and finding all 272 of the 2026 season's games already present.
- **SportsDataIO's `FantasyPoints` (standard, 0/reception) and
  `FantasyPointsPPR` (full PPR, 1/reception) are otherwise identical** —
  confirmed live at both the game and season level:
  `FantasyPointsPPR - FantasyPoints` equals the row's own `Receptions`
  field exactly (e.g. Justin Jefferson, 2025 week 8: 14.4 - 7.4 = 7.0
  receptions, matching exactly). This is what makes half-PPR scoring a
  free derivation (`getFantasyPoints()` in `sportsdata/types.ts`) rather
  than needing a new data source or endpoint — see item 50.
- **Sleeper's API is free, fully public, and needs no auth or API
  key** — confirmed live (item 59): a nonexistent username returns HTTP
  200 with a JSON `null` body, not a 404, so "not found" has to be
  detected from the parsed body, not the status code. Like nflverse and
  unlike SportsDataIO, Sleeper has no ID shared with this app's
  SportsDataIO-based player space, so importing a roster needs its own
  name-based join (`lib/sleeper/resolveRoster.ts`) — reuses nflverse/
  playerMatch.ts's existing normalization rather than a third scheme.
  The one large, expensive call (`/players/nfl`, ~12k entries) is a
  dump of Sleeper's entire player database with no per-league
  filtering; Sleeper's own docs ask callers not to hit it more than
  once a day, so it's cached 24h in-process, same TTL discipline this
  app already uses for nflverse's heavy CSV releases.
- **`dynastyprocess/data` (GitHub, free, no-auth) has TWO separate
  FantasyPros-rankings files with very different update behavior** —
  confirmed live (item 68/69), correcting item 55's own earlier
  conclusion. `files/db_fpecr.csv.gz` (what item 55 checked) really did
  stop receiving weekly rows around August 2025. `files/fp_latest_weekly.csv`
  is a SEPARATE file, driven by a different "Daily FP scrape" workflow,
  still actively committing at a roughly-daily cadence through the
  2025 season (and further back — real history confirmed to December
  2021). It only ever holds the single most recent snapshot (each daily
  commit overwrites it), so a past week's rankings are reconstructed by
  fetching the file's content at whichever commit was current just
  before that week's games started — git history used as a de facto
  time-series archive (`src/lib/fantasypros/`). GitHub's unauthenticated
  REST API caps at 60 req/hour; the commit-history LIST is the only call
  site that matters for that limit, so it's fetched once (paginated) and
  cached, with per-week date-matching done locally afterward rather than
  one API call per week. Raw file content at a specific commit isn't
  subject to that limit and is immutable once committed, so it's cached
  far longer (30 days) than the commit index itself (24h, since new
  commits keep landing).
- **nflverse's `schedules` release carries betting lines
  (`spread_line`/`total_line`, closing) back through 2022, free and
  no-auth** — already used for the D/ST and K implied-total signals (see
  `getImpliedTeamTotalsByTeamWeek` in `schedules.ts` and "Backtesting &
  Tuning History" item 62). Confirmed (item 97) this makes a paid odds
  API (e.g. The Odds API) unnecessary for any team-level game-line signal
  (spread, total, implied total) — such an API would only add player
  props, opening-line movement, and multi-book data, none of which any
  odds signal tested so far uses. (Signing up for such an API is also not
  something this assistant can do on the user's behalf — account creation
  is theirs to do.)
- **nflverse's `stats_player_week` includes kicker (Position "K") rows
  with full distance-bucketed FG detail** (`fg_made_0_19` through
  `fg_made_60_`, `fg_missed_*`, `pat_made`, etc.) for all of 2022-2025 —
  BUT its own `fantasy_points`/`fantasy_points_ppr` fields are
  offense-only (0 for every kicker), so kicker fantasy points must be
  computed from the buckets (standard distance scoring: 3 pts 0-39, 4 pts
  40-49, 5 pts 50+, 1 per PAT — avg ~8/game, verified sane across all
  four seasons). Used only for backtest-side kicker analysis on the
  nflverse pipeline (item 97); the shipped K scorer runs on SportsDataIO's
  own kicker FantasyPoints and is unaffected.
- **The Odds API (`the-odds-api.com`) — free tier; key in `ODDS_API_KEY`
  (`.env.local` locally / Vercel env in production, never committed, same
  discipline as `SPORTSDATA_API_KEY`).** Confirmed live (item 98): the
  NFL **events/schedule** endpoint is free (0 credits) and carries the
  full upcoming season as soon as the NFL publishes it; **current game
  odds/player props** work but cost credits (~6 per event's prop-market
  request) against a **500-requests/month** quota; **historical odds are
  paid-only** (the free key returns a 401
  `HISTORICAL_UNAVAILABLE_ON_FREE_USAGE_PLAN`), so nothing backtestable
  is reachable on free. **Player props are per-game and only posted a few
  days before kickoff** — empty in the offseason (confirmed: 0 of the
  first 12 lined 2026 games had props ~6 weeks out). Used only for the
  display-only "Betting lines" on the Start/Sit cards
  (`src/lib/oddsapi/`), never scoring. Spread/total are NOT taken from
  here — nflverse's schedules release already provides those free (see
  above); The Odds API's only genuinely additive data is player props and
  line movement, which nflverse lacks (and both need the paid tier to be
  backtestable — see "Backtesting & Tuning History" item 97 and Open Item
  #24).

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
  - Offensive snap share (TE only, fixing the position's long-standing
    weak spot), from nflverse (see Data Source Notes), blended into the
    running score the same way volume is (`SNAP_SHARE_BLEND_WEIGHT_TE`
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
  - **QB rushing EPA-per-play was tried as a third QB signal, shipped,
    then later disabled** (`QB_RUSH_EPA_BLEND_WEIGHT` back to `0` in
    `config.ts`) — rushing *quality*, not volume, and notably more
    stable across all four backtest seasons than any prior QB-rushing
    signal on pick accuracy alone (shipped at a deliberately balanced
    0.2 after a real, user-confirmed tradeoff — see item 41). Reverted
    after the "Projection accuracy" backtest mode (item 65) found it was
    badly miscalibrated as a point estimate for low-mobility QBs — an
    unweighted per-game average over as few as 1-4 rush attempts,
    multiplied by a huge conversion factor, produced modifiers as
    extreme as -31 points in real 2025 data and a systematic
    under-projection bias, invisible to pick-accuracy backtesting since
    two similarly-penalized QBs still rank correctly relative to each
    other. `POINTS_PER_QB_RUSH_EPA` is kept, not deleted — see item 66
    for the full diagnosis and the empirical sweep that confirmed
    disabling it outright beat every capping/gating alternative on
    calibration.
  - WR drop rate (FTN Charting, `DROP_RATE_BLEND_WEIGHT`/
    `POINTS_PER_DROP_RATE_UNIT` in `config.ts`) — WR only, not TE (TE's
    standalone result was too noisy to trust at any weight tested). A
    "lower is better" signal, the only one shaped that way in this
    engine; a real WR-specific tradeoff (2025 up, 2024 down as weight
    increases), deliberately tuned to a balanced point rather than
    either season's peak — see item 33.
  - **RB red-zone touches and RB rushing EPA-per-play were both tried
    and shipped, then later disabled** (`REDZONE_BLEND_WEIGHT_RB`/
    `RB_EPA_BLEND_WEIGHT` both `0` in `config.ts`) — each looked like a
    genuine win on the original 1-2 season validation, but a four-season
    pooled re-sweep (2022-2025) found both scored highest at zero
    weight, a real reversal rather than an artifact of one-at-a-time
    tuning (confirmed via a joint 2D grid search). The underlying
    conversion factors/constants are kept in `config.ts`, not deleted,
    in case a future season's data changes the picture again — see
    items 43-44 for the full story, including the real tradeoff (2025
    specifically gets worse; 2022/2023/2024 all improve) that was put to
    the user before disabling.
  - FantasyPros' weekly expert-consensus point estimate
    (`EXPERT_CONSENSUS_BLEND_WEIGHT` in `config.ts`) — a genuinely
    different KIND of factor from everything else in this list:
    human/market-informed (dynastyprocess/data, reconstructed from git
    history — see Data Source Notes), not derived from box scores or
    play-by-play. Blended in last, universal across all four skill
    positions rather than position-scoped (unlike almost every other
    signal here). Backtest-only for now — no live "current snapshot"
    fetch exists yet, so this factor doesn't affect the live tool at
    all regardless of its weight, only backtest-mode validation. A real
    tradeoff, not a clean win: a higher weight (~0.7-0.9) pools better
    across 2022-2025 nflverse-only data, but costs real WR accuracy on
    the primary 2025 pipeline specifically — shipped at the more
    conservative 0.5, which captures nearly all the gain (QB especially:
    +8.8 to +10.8pp on the primary pipeline) with zero measured WR cost.
    See items 69-70 for the full validation story.
  - [Add more factors here as they're decided]
- When it's a close call statistically, say so. Don't force false
  confidence.
- Every recommendation must include a short, human-readable "why."

## Backtesting & Tuning History
Narrative record of what was tried, what worked, and why — so this
reasoning isn't lost if we come back to tune this further. All numbers
below are from backtesting against the full completed 2025 season
(weeks 1-18), broad mode, all positions, adjacent-rank pairs (~612
pair-evaluations) unless noted otherwise. **Caveat that applied through
item 23**: everything up to that point is validated against a single
season, with a real risk some of it is tuned to 2025-specific dynamics
rather than a durable pattern. That caveat was substantially addressed
starting at item 24 (a second, nflverse-only pipeline validating against
2024) and again at item 39 (extended further to 2022-2023, making a
pooled 4-season sample the norm for anything tuned or re-checked from
that point on — see items 40-44). Read each item's own text for which
sample it used; later items that explicitly re-swept earlier ones
(e.g. item 43 re-sweeping items 13/19/20/33) supersede the original
single-season numbers for those specific constants.

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

45. **Formally re-tested the confidence-calibration inversion for
    statistical significance** — item 29 found "limited data" picks
    outperforming "confident" ones (54.2% vs. 59.5%, item 22-23) but
    couldn't confirm it wasn't noise (z≈1.23 on the 2025-only sample,
    short of the z≈1.96 needed for conventional significance); item 39
    saw the same pattern hold at pooled 4-season scale (52.3% vs. 58.3%)
    but flagged it as still not formally tested. Pulled the current
    `confidenceBreakdown` from the permanent pooled-multi-season route
    (post item 41/44 engine changes) and ran a proper two-proportion
    z-test.
    - **Confirmed real, not noise**: confident 52.44% (n=820) vs.
      limitedData 58.84% (n=1443) — z=-2.95, two-tailed p=0.003,
      significant at p<0.01. The much bigger pooled sample (n=820/1443
      vs. item 29's n=212/351) gave this the statistical power the
      original single-season test lacked.
    - **The other two pairwise comparisons are NOT significant**:
      confident vs. closeCall (z=-0.93, p=0.35) and limitedData vs.
      closeCall (z=0.64, p=0.52) — closeCall's much smaller sample
      (n=174) doesn't have the power to detect a difference even if one
      exists. So the confirmed finding is specifically "limited-data
      picks are more reliable than confident picks," not a full
      three-way ranking.
    - **Caveat stated honestly**: a standard two-proportion z-test
      assumes independent observations, which pair-week backtest results
      aren't strictly (a single bad week can correlate outcomes across
      several pairs) — the same caveat implicit in every accuracy number
      in this document. The effect size here is large enough (z=-2.95,
      comfortably past the 1.96 threshold) to have real margin against
      that kind of mild correlation inflation, but it's not a
      randomized-trial-grade test.
    - **No code change** — item 23 already split the flags and
      headlines correctly based on the *directionally* real (if then
      statistically unconfirmed) pattern ("Start X — though we have
      limited recent data..." carries no hedging, unlike the genuine
      "Close call" headline). This item confirms that design decision
      was right, rather than changing anything about it. Closes the
      open question item 29 and item 39 both left hanging.
46. **Picked depth charts back up (item 37's scoped-out blocker) — now
    unblocked for 3 of 4 seasons without ever solving 2025's mapping
    problem.** Confirmed live before writing anything: 2022 and 2023's
    `depth_charts` files share 2024's clean `season`/`week`/`game_type`/
    `depth_team` schema (2025 alone is the odd one out, still using the
    incompatible ESPN-scrape/timestamp format item 37 found) — so 3 full
    seasons of the clean format were available without needing to
    attempt that leakage-prone snapshot-to-week inference at all.
    - **Verified the join before trusting any numbers**: `depth_charts`
      identifies players by `gsis_id`, resolved through the same
      `players.ts` crosswalk `playByPlay.ts` already uses for red-zone
      touches. 100% match rate on offensive skill-position rows across
      all three seasons (8836/8836, 8779/8779, 8629/8629) — no
      degradation to worry about, unlike the ~99% name-based joins used
      elsewhere in this app.
    - **Standalone-tested by position (pooled 2022-2024, `depth_team`
      1=starter/2=backup/...; pick whoever's listed higher when they
      differ)**: RB 57.7% (n=149, stable across all 3 individual seasons
      — 57.7%/61.1%/53.5%, never below chance), WR 58.3% (n=48, also
      stable — 55.0%/57.9%/66.7%), TE 56.5% (n=62, but dipped to 41.2% —
      *below* chance — in 2024, TE's usual noisiness throughout this
      app), QB 80.0% (n=15 total, 5/season — far too thin to mean
      anything). Decision rate is low (~15% of pairs, most adjacent-rank
      pairs are both already starters) — the same "rare but real"
      current-week-fact shape as `injuryStatus` (item 18), not a data
      problem (the 100% match rate rules that out).
    - **Shipped as a permanent standalone baseline, RB/WR only** —
      TE excluded for the same below-chance-in-one-season instability
      that already exempts it from `DROP_RATE_BLEND_WEIGHT`; QB excluded
      for sample size, mirroring the QB exemption already used for
      `snapShare`/`targetShare` (item 15). Matches `injuryStatus`'s
      precedent exactly: a real, rare, current-week signal earns a
      permanent baseline even without ever being engine-integrated.
      New `nflverse/depthCharts.ts` (`getDepthChartByNormalizedNameWeek`
      — returns an empty map for any season ≥2025 rather than
      attempting to parse the incompatible schema), `BacktestRunData`'s
      `depthChartByPlayerIdWeek` (resolved onto the nflverse-only
      pipeline's synthetic PlayerIDs at load time via
      `gameLog.playerIdByNormalizedName`, the same resolution step
      `nflversePlayerWeekTable` itself goes through), threaded through
      `sliceWeekData`/`BacktestWeekSlice` exactly like `teamWeatherByTeamWeek`.
      New `pickByDepthChart` in `baselines.ts`.
    - **Verified against the real shared pipeline**: the `depthChart`
      baseline via `/api/backtest/broad-nflverse-multiseason` returned
      57.9% (n=197) — matching the standalone RB+WR count exactly
      (149+48=197). Confirmed graceful degradation on the primary
      SportsDataIO pipeline (612/612 no-pick, zero effect on that
      pipeline's own 57.5% overall number) and that pooling this into
      the shared architecture didn't change the engine's own accuracy
      at all (56.50% pooled, unchanged) — this is a baseline-only
      addition, not wired into `finalScore`.
    - **Not integrated into the live engine** — same status as
      `injuryStatus`/`wind`: a real, validated, permanent standalone
      baseline, visible in backtest mode, not part of scoring. Also
      structurally can't reach the live 2025 tool even if it were
      engine-integrated, since 2025's depth-chart schema was never
      solved. Temporary experiment code deleted after the validated
      parts were promoted to permanent code, same as `wind`'s item 39
      promotion.

47. **Built the Trade Analyzer** (`/trade`) — a second live tool
    alongside start/sit, evaluating multi-player trades rather than a
    single roster-spot decision. Enter any number of players on each
    side; get a graded verdict (good/fair/bad) with reasoning.
    - **Key architectural insight, not a new scoring model**:
      `scorePlayer()`'s `finalScore` is already computed entirely
      independently per player — every input (recent form, volume,
      matchup, nflverse signals) comes from that player's own data, not
      a comparison partner's. Only `comparePlayers()`'s ranking/
      tiebreaker logic is relative. That means `finalScore` already
      doubles as a standalone absolute value, so a trade's two sides can
      just be scored independently and summed — no new engine needed,
      only a new evaluation layer (`lib/trade/evaluateTrade.ts`) on top
      of the existing one.
    - **Chose rest-of-season value over a single game's**, since "who's
      better next game" is a materially weaker basis for judging a
      trade than "who's better the rest of the way." Resolved the
      `/Schedules` endpoint uncertainty the next-opponent-lookup note
      above had flagged as unconfirmed — confirmed live SportsDataIO
      has no schedule endpoint at all on this plan (see Data Source
      Notes), so used nflverse's `schedules` release instead, which
      already carries the upcoming season's full fixture list.
    - **Projection method**: strip the "last opponent" matchup
      adjustment out of a player's current score (`finalScore -
      matchupModifier`) to get a stable per-game baseline, then
      re-apply a fresh matchup adjustment for every remaining opponent
      on their real schedule and sum across the season
      (`lib/recommendation/restOfSeason.ts`'s `projectRestOfSeason`/
      `sumProjectedPoints`). Everything else about the player (recent
      form, volume, snap share, etc.) is held constant — deliberately,
      matching the "recent-form engine wouldn't need to change" scoping
      the next-opponent-lookup note above already called out.
      `computeMatchupModifier` was extracted out of `engine.ts` as a
      standalone pure function specifically so both the "last opponent"
      case (start/sit) and the "every future opponent" case (trade
      projection) share one formula rather than two copies.
    - **Found and fixed the one real SportsDataIO/nflverse team-code
      mismatch** (`LAR` vs. `LA` for the Rams — the same one item 34
      already found for weather) — confirmed by pulling both sources'
      full 32-team lists live rather than assuming it was the only one.
    - **Found and fixed a real season-transition bug while explaining
      the design to the user**, not from a bug report: the
      schedule-season lookup originally trusted `isInSeason`, which can
      flip `true` a few days *before* `lastCompletedWeek` itself
      advances (right after a season's kickoff, before that week's own
      timeframe has an `EndDate` in the past) — during that ~5-day
      window each year it would have looked up a nonexistent week and
      silently shown "not enough data" for every player instead of using
      the new season. Failed safely (no wrong numbers, just an honest
      gap) but was still wrong. Fixed by dropping the `isInSeason`
      dependency entirely: just check whether the current season has any
      games left, and roll forward to the next season if not.
48. **Built a backtest mode for the Trade Analyzer**, to check whether
    the rest-of-season projection is actually predictive rather than
    just plausible-sounding — the same reason backtest mode was built
    at all for start/sit (item 1).
    - **Corrected an assumption made when this was first proposed**:
      that there's "no ground truth to backtest a trade against."
      There is one — real rest-of-season point totals, once a season
      has actually played out. "Will side B outscore side A the rest of
      the way" is directly checkable against a completed season.
    - **Reused broad mode's adjacent-rank pairing** (`pairing.ts`) to
      generate synthetic 1-for-1 "trades" as of a given week — same
      pool/ranking methodology already validated for start/sit,
      deliberately scoped to 1-for-1 only for this first version (see
      Open Items below for multi-player trades).
    - **No external schedule fetch needed in backtest mode**, unlike
      live mode — every remaining week is already history, sitting in
      the same box scores the rest of backtest mode already fetches
      (any player's row for a team that week reveals that team's real
      opponent).
    - **Found and fixed a real bug on first run, not a design error**:
      initial projected totals were wildly inflated (8000+ points vs.
      ~150 real) — the opponent lookup pushed one entry per *player*
      row in a week instead of once per *team*, so a team's real
      opponent got duplicated ~15-20x (once per teammate who recorded a
      stat that week). Fixed and reverified against real box scores
      (e.g. Jonathan Taylor projected 151.6 vs. actual 145.7 as of week
      8, 2025).
    - **Result (2025, single cutoff, as of week 8)**: 69.4% overall
      (25-11, n=36) — QB 50%, RB 58.3%, WR 75%, TE 100%. Flagged
      honestly as thin (one season, one cutoff, small per-position
      samples) rather than reported at face value — see item 49.
49. **Pooled the trade backtest across many "as of week" cutoffs and all
    four seasons** — item 48's single-cutoff/single-season check (36
    trades) was too thin to trust on its own, the same lesson items 9/10/
    20 already drew for weight-tuning sample sizes. Mirrors
    `runBroadBacktestNflverseOnlyMultiSeason`'s established precedent
    (item 39) closely: new `runTradeBacktestMultiSeason` runs every
    season — including 2025 — through the same nflverse-only pipeline
    for consistency, rather than mixing in SportsDataIO's own 2025
    numbers, and loads seasons sequentially (not concurrently) for the
    same peak-memory reason item 27 already fixed.
    - **Capped the default cutoff range at week 12, not 17**: a trade
      evaluated as of week 16 only has 1-2 remaining weeks to project
      against, which barely tests the "sum across a real remaining
      schedule" idea this feature exists to check — it degenerates
      toward ordinary single-week grading. Every pooled cutoff in the
      default range tests a genuinely multi-week projection (at least 6
      remaining weeks).
    - **No UI for the pooled route** (`/api/backtest/trade-nflverse-
      multiseason`) — same precedent `broad-nflverse-multiseason`
      already set: a validation tool, not an interactive mode.
    - **Result: 1,728 pooled synthetic trades** (4 seasons × 12 cutoffs
      × up to 36 pairs) — **55.2% overall**. By position: RB 57.6%, TE
      60.4%, WR 53.3%, QB 49.0% (QB's weakness concentrated in 2024,
      43.1% — consistent with QB being this project's most historically
      unstable position for out-of-season generalization; see items
      24/30/41). By season: 2022 55.8%, 2023 56.5%, 2024 49.8%, 2025
      58.8% — three of four seasons clearly beat a coin flip, 2024 sits
      right at chance.
    - **Multi-player trades (2-for-1, 2-for-2, etc.) deliberately
      deferred, not built** — adjacent-rank pairing doesn't obviously
      generalize past two players; would need its own design pass on
      how to generate realistic multi-player synthetic trade candidates
      before extending, not a quick generalization of the 1-for-1
      pairing this item reused. See Open Items below.
50. **Added real PPR/Half-PPR/Standard scoring-format toggles to both
    live tools** — not a shallow relabel of displayed numbers, but the
    selected format threaded all the way through matchup tables,
    scoring, and the primary backtest's grading, with the underlying
    conversion factors empirically re-tuned per format.
    - **The key data insight**: confirmed live that SportsDataIO's
      `FantasyPoints` (standard) and `FantasyPointsPPR` (full PPR) are
      otherwise identical — `FantasyPointsPPR - FantasyPoints` equals
      the row's own `Receptions` field exactly, at both the game and
      season level. That makes half-PPR a free derivation
      (`getFantasyPoints()` in `sportsdata/types.ts`) rather than
      needing a new data source — see Data Source Notes.
    - **Chose the rigorous option over the shallow one, on the user's
      explicit call**: the volume/matchup modifiers driving most of the
      final score use conversion factors ("points per target," etc.)
      that were empirically tuned against full-PPR data specifically.
      Recomputed all five active factors (`POINTS_PER_VOLUME_UNIT`,
      `POINTS_PER_SNAP_SHARE_UNIT_TE`, `POINTS_PER_QB_RUSH_ATTEMPT`,
      `POINTS_PER_QB_RUSH_EPA`, `POINTS_PER_DROP_RATE_UNIT`) for
      half-PPR and standard using the exact same "ratio of sums" method
      as the shipped PPR values, against the full 2025 season, via a
      temporary diagnostic route (`/api/debug-scoring-factors`,
      reusing `loadBacktestRunData` directly — deleted after recording
      the numbers, same precedent as every other one-off analysis in
      this document).
    - **Verified the recomputation against known values before trusting
      it, and caught two real bugs doing so** — the same "reproduce the
      shipped value before trusting the sweep" discipline as items
      43/44: the PPR column initially didn't match the shipped
      `POINTS_PER_QB_RUSH_EPA` (784.7 vs. 45.814, ~20x off) or
      `POINTS_PER_DROP_RATE_UNIT` (207.0 vs. 182.75). Root causes: QB
      rush EPA's denominator needed to be that week's rate WEIGHTED BY
      rush attempts (`rushEpaPerPlay * RushingAttempts`), not the raw
      per-week rate summed alone (confirmed by cross-checking against
      item 41's own documented 2025-only sub-value, 34.9 — the fixed
      computation lands at 34.41, matching almost exactly); drop rate's
      population needed to include TE rows, not just WR (the underlying
      constant was always computed WR+TE, even though only WR gets the
      blend weight — TE is exempted from `DROP_RATE_BLEND_WEIGHT`
      itself, item 33, not from how the conversion factor was derived).
      Both fixes brought the PPR column to an exact or near-exact match.
    - **QB-scoped factors barely move by format, exactly as expected**
      (QBs essentially never record receptions): `POINTS_PER_QB_RUSH_
      ATTEMPT` goes 3.929 → 3.925 → 3.920 (ppr/half/standard).
      `POINTS_PER_QB_RUSH_EPA` is the one factor NOT recomputed fresh
      from 2025-only data — doing so would have quietly replaced its
      4-season-pooled shipped value (45.814) with a 2025-only one
      (34.41), a real methodology downgrade. Instead scaled the shipped
      pooled value by the half/standard-vs-ppr ratio measured in the
      same 2025-only diagnostic run (45.814 → 45.77 → 45.725) — small
      and safe either way, since this factor barely moves regardless.
      Reception-driven positions move substantially, as expected:
      `POINTS_PER_VOLUME_UNIT.WR` goes 1.729 → 1.418 → 1.106,
      `POINTS_PER_SNAP_SHARE_UNIT_TE` goes 9.607 → 7.698 → 5.788,
      `POINTS_PER_DROP_RATE_UNIT` goes 182.75 → 148.75 → 114.74.
    - **Made `pairing.ts`'s adjacent-rank ranking and `grading.ts`'s
      ground truth format-aware too**, not just the engine — which
      players count as "adjacent rank" genuinely shifts by format
      (reception-heavy players rank differently under PPR vs.
      Standard), and grading a Half-PPR-scored recommendation against
      PPR ground truth would silently defeat the whole point.
    - **Re-ran the primary broad backtest per format to confirm the
      retuned engine still performs**: PPR 57.5%, Half-PPR 55.2%,
      Standard 56.3% — all comfortably above chance. PPR still performs
      best, since the blend *weights* themselves (`VOLUME_BLEND_
      WEIGHT=0.9`, etc.) were tuned against it specifically and weren't
      independently re-swept per format in this pass — only the
      conversion factors were. A real, honest limitation, not silently
      glossed over: full parity would need re-sweeping every blend
      weight per format too, the same scale of work as the original
      tuning history above.
    - **Deliberately scoped out**: the nflverse-only 2022-2024 backtest
      pipeline and all naive baseline pickers (`baselines.ts`) stay
      PPR-only — re-tuning those too would be a much larger extension,
      and format-awareness on the primary 2025 pipeline already
      validates the core engine change soundly. See Open Items below.
    - **UI**: a shared segmented-control toggle
      (`ScoringFormatToggle.tsx`), persisted via `localStorage`
      (`useScoringFormat.ts` — no backend/account system, consistent
      with this app's "no persistence" scope) so picking a format once
      carries across Start/Sit and the Trade Analyzer within a session.
      Every previously-hardcoded "PPR" label and reasoning sentence
      (`engine.ts`, `evaluateTrade.ts`) is now format-aware.
    - **Caught one more real bug during UI verification**: a template-
      literal Tailwind class in an earlier redesign pass wasn't the
      issue here, but a genuine hardcoded "PPR points" string survived
      in `evaluateTrade.ts`'s reasoning text even in Standard mode —
      found by actually reading the rendered output in Standard format,
      not just checking the numbers, and fixed.
51. **Closed most of item 50's "not fully universal" gap: made the
    nflverse-only backtest pipeline and every naive baseline picker
    format-aware**, giving Half-PPR and Standard the same 4-season
    (2022-2025) pooled validation PPR already had.
    - **`baselines.ts` needed far less surgery than it looked like at
      first** — of the 23 naive pickers, only two (`pickPriorWeek`/
      `pickSeasonAvg`) actually read a fantasy-points field directly;
      every other baseline (volume, snap share, EPA, drop rate, etc.)
      is already format-agnostic since it compares raw counts/rates, not
      points. Both were switched from reading `.FantasyPointsPPR`
      directly to `getFantasyPoints(row, format)`. `BASELINE_PICKERS`'s
      type signature grew a `format: ScoringFormat` parameter, but the
      other 21 picker functions didn't need to change at all — TypeScript
      permits a function declaring fewer parameters to satisfy a type
      expecting more, so they still satisfy the (now 3-arg) type
      unmodified.
    - **Found a real, previously-unnoticed gap while wiring this up**:
      even after item 50 made `scorePlayer`/`comparePlayers` format-aware,
      `runBacktest.ts`'s `gradeBaselinesForPair` — and both its call
      sites in `runPairBacktest`/`runBroadBacktest` — were never actually
      passed the `format` variable those functions already had in scope.
      Baselines in the **primary SportsDataIO pipeline** were silently
      still being graded in PPR regardless of which format the engine
      itself was tested in. Fixed alongside the nflverse-only work,
      since it's the same function or a duplicate of it.
    - **Threaded `ScoringFormat` through the entire nflverse-only
      pipeline**: `collectBroadResultsForSeason` → both
      `runPairBacktestNflverseOnly`/`runBroadBacktestNflverseOnly` and
      the pooled `runBroadBacktestNflverseOnlyMultiSeason` → all three
      routes (`/api/backtest/broad-nflverse`, `/pair-nflverse`,
      `/broad-nflverse-multiseason`), each gaining a `scoringFormat`
      query param via the same `parseScoringFormat()` used elsewhere,
      default `"ppr"` throughout for backward compatibility.
    - **Verified no regression before trusting any new number** (the
      project's standing discipline, per items 43/44/50's own bug
      catches): re-ran the primary pipeline's PPR path
      (`/api/backtest/broad`, no format param) and got byte-identical
      results to before this change (overall 57.54%, `recentVolume`
      56.55%, `seasonAvg` 52.88%, `priorWeek` 50.50%). Then ran the
      pooled nflverse-only multiseason route with `scoringFormat=ppr`
      explicitly and got **overall 56.5%**, matching item 44's
      documented post-re-tune pooled figure (55.89%→**56.50%**) exactly
      — confirms the new format-threading is a true no-op for PPR on
      both pipelines.
    - **New results — Half-PPR and Standard, pooled 2022-2025, nflverse-
      only pipeline** (same shape as item 39's original PPR table):

      | format | overall | QB | RB | WR | TE | 2022 | 2023 | 2024 | 2025 |
      |---|---|---|---|---|---|---|---|---|---|
      | PPR (unchanged) | 56.5% | 57.8% | 57.5% | 54.3% | 57.5% | 56.9% | 56.2% | 56.8% | 56.1% |
      | Half-PPR | 55.3% | 57.6% | 53.6% | 54.7% | 57.2% | 56.6% | 56.4% | 53.3% | 54.8% |
      | Standard | 54.3% | 57.6% | 52.0% | 53.6% | 57.0% | 52.7% | 56.2% | 51.4% | 57.0% |

      All three formats clear chance in every season and every position
      — no format collapses the engine the way, say, 2024 QB did before
      item 30/41's fixes. **RB is the position most sensitive to
      format**, dropping steadily as PPR weight decreases (57.5%→53.6%→
      52.0%) — plausible, since RB's own conversion factors barely move
      by format (rushing touches don't earn receptions), so a
      Standard-scored RB pool is effectively noisier relative to the
      same blend weights tuned for PPR's smoother points distribution.
      QB and TE are the most format-stable (both ±0.6pp across all
      three), consistent with both positions' scoring being
      reception-light. This mirrors the primary pipeline's own item-50
      finding (PPR 57.5% > Standard 56.3% > Half-PPR 55.2%) in
      direction, if not in exact magnitude — PPR remains the
      best-performing format on both pipelines, as expected, since the
      blend *weights* (not just the conversion factors) were tuned
      against it.
    - **Also confirmed the primary pipeline's baseline-threading fix
      (above) didn't disturb its own already-documented engine numbers**:
      re-ran `/api/backtest/broad` for Half-PPR and Standard and got
      55.2%/56.3% — an exact match to item 50's recorded figures. Only
      the `priorWeek`/`recentVolume` baseline numbers changed (now
      correctly graded per-format instead of silently PPR-only), not the
      engine's own accuracy.
    - **Deliberately still out of scope** — see updated Open Items
      below: `tradeBacktest.ts` remains PPR-only (not part of "the
      multi-season nflverse backtest and baseline comparisons" this item
      was scoped to), and the blend weights themselves were still not
      independently re-swept per format.
52. **Re-swept the active blend weights separately per format** (now that
    item 51 made baseline grading format-aware everywhere, this was
    finally checkable) — RB's disabled red-zone/EPA signals, TE snap
    share, WR drop rate, both QB rushing terms, and the WR target-share/
    separation tiebreaker, for Half-PPR and Standard, using the pooled
    2022-2025 nflverse-only sample. Built via a temporary parameterized
    duplicate of `scorePlayer`/`comparePlayers` (weights passed as an
    explicit object rather than read from `config.ts`), cross-checked
    against the real API at the shipped-weight point before trusting any
    result (exact match on all three formats: 56.5%/55.3%/54.3%) — same
    discipline as items 43/44's harness, this time gotten right the
    first time.
    - **Almost nothing showed a real format-specific case.** RB's
      red-zone/EPA signals, re-tested from 0 specifically because RB has
      the biggest format accuracy gap: no clean signal for either
      format — noisy, non-monotonic grids, no plateau like PPR's
      original item-44 corner optimum. Left at 0 for all three formats.
      WR drop rate: minor shifts, nothing clearly better than the
      shipped 0.2. QB rushing volume/EPA: **identical curve shape across
      all three formats** — no format-specific divergence at all. WR
      tiebreaker on/off: small, inconsistent swings (-0.2pp Half-PPR,
      +0.9pp Standard, +0.2pp PPR) — never a clear net negative, kept
      universally enabled.
    - **One real side-finding, explicitly not acted on**: re-sweeping
      `QB_RUSH_BLEND_WEIGHT` against this pooled, single-pipeline sample
      shows accuracy climbing well past the shipped 0.3 for all three
      formats equally — a different picture than the two-pipeline
      (SportsDataIO 2025 + nflverse 2024) tension that originally
      justified 0.3 in item 30. Since this isn't a format issue, it's
      flagged here as worth its own dedicated look rather than folded
      into this task.
    - **`VOLUME_BLEND_WEIGHT` and `SNAP_SHARE_BLEND_WEIGHT_TE` were the
      exception — Standard genuinely wanted different values.** A
      per-weight sweep first: Half-PPR's volume curve was flat/noisy
      across the whole 0-1 range (no real preference, stayed at 0.9);
      Standard's climbed steadily toward the w=1 boundary instead of
      peaking mid-range like PPR's. TE snap share showed the same
      pattern — Half-PPR's TE curve actually *declined* from w=0
      (58.5%) as weight increased (TE's pool is thin/noisy, so this
      wasn't chased; whole-model impact was under 0.5pp either way), but
      Standard's genuinely preferred 0.5 over the shipped 0.4.
    - **A full 3D joint grid (volume × snapShareTe × dropRate, not a
      one-at-a-time combination) confirmed this wasn't noise** — every
      top-10 grid point had `volume=1.0`, with a genuine plateau across
      `snapShareTe` 0.4-0.5 and `dropRate` roughly irrelevant (flat
      54.8-55.0% across 0-0.2). Best point: `volume=1.0,
      snapShareTe=0.5, dropRate` left unchanged at the shared 0.2 (fine
      resolution confirmed 0.5 as a real local peak in the middle of a
      0.35-0.55 plateau, not an artifact of testing `dropRate=0`
      specifically) — a simpler two-constant change than the original
      three-constant grid winner, at nearly the same accuracy (54.8% vs.
      55.0%).
    - **Checked by-season before shipping, per the project's standing
      discipline for any weight change**: every one of the four pooled
      seasons improved or held flat under the new Standard weights
      (2022 +0.2pp, 2023 +0.6pp, 2024 +0.7pp, 2025 +0.3pp) — a clean win,
      not a tradeoff like QB rushing or WR drop rate. Only QB dipped
      slightly (57.6%→57.1%, -0.5pp), a side effect of
      `VOLUME_BLEND_WEIGHT` being shared across all four positions
      rather than RB/WR/TE-specific — raising it for their sake also
      raises it for QB's pass-attempt volume.
    - **Shipped**: `VOLUME_BLEND_WEIGHT` and `SNAP_SHARE_BLEND_WEIGHT_TE`
      in `config.ts` are now `Record<ScoringFormat, number>` (PPR/
      Half-PPR unchanged at 0.9/0.4; Standard at 1.0/0.5), with
      `engine.ts`'s two call sites indexing by the already-in-scope
      `format` parameter. `DROP_RATE_BLEND_WEIGHT` and every other
      weight stayed a plain shared scalar — this task found no case to
      convert them. **Verified against the real production API after
      shipping, not just the temp harness**: primary pipeline
      (`/api/backtest/broad`) — PPR 57.5% and Half-PPR 55.2% both
      byte-unchanged, Standard 56.3%→56.5%; pooled nflverse-only
      multiseason — PPR 56.5% and Half-PPR 55.3% byte-unchanged,
      Standard 54.3%→54.8% with by-season/by-position numbers matching
      the harness's predictions exactly. Verified live end-to-end too: a
      real Travis Kelce vs. Mark Andrews comparison in Standard format
      showed the new snap-share modifier note computing correctly
      (89% × 5.788 ≈ 5.1 points), no console errors, sensible rendering.
53. **Tested a simple ensemble: blending the engine's own `finalScore`
    with the standalone `recentVolume` baseline**, to see whether
    shrinking toward a simple, robust signal beats the fully-tuned score
    alone — the classic bias/variance tradeoff argument for ensembling,
    never tried in this project before (every prior "blend" tuned how
    much ONE signal contributes; this dilutes the WHOLE score). Original
    ask specifically named QB, on the premise that `recentVolume` "beats
    us on 2025" — that premise didn't hold: the current engine clearly
    beats `recentVolume` at QB (pooled 57.8% vs. 52.9%, and 57.8% vs.
    55.9% in 2025 specifically) — the real 2025 QB gap (item 30a) was
    already closed by item 41's `QB_RUSH_EPA_BLEND_WEIGHT`. QB showed
    zero ensemble benefit at any ratio tested, in any format — a clean
    negative control, not a data problem.
    - **Found and fixed a real bug in the test harness before trusting
      any Half-PPR/Standard result**: v1 paired players using PPR-based
      adjacent-rank pairing for every format (to save compute), scoring
      those PPR-chosen pairs in the target format — but the real API
      re-pairs players PER format (item 50: which players count as
      "adjacent rank" genuinely shifts by format). Caught by cross-
      checking the harness's own r=1.0 baseline against the real API for
      every format, not just PPR (a real process gap — PPR alone had
      been checked initially) — Half-PPR RB's r=1.0 baseline read 55.2%
      in the buggy harness vs. the real API's 53.6%. Rebuilt v2 pairing
      AND scoring in the same target format throughout; re-verified
      exactly against the real API for all three formats before
      re-sweeping anything.
    - **The re-swept (correct) picture, pooled 2022-2025**: RB showed no
      real signal in either non-PPR format once correctly paired (the
      original "RB gain" was entirely a bug artifact). WR and TE both
      showed real, broadly-positive, near-zero-decline gains in Half-PPR
      and Standard (TE: 3 seasons up/1 flat/0 down in both formats — the
      cleanest results of the whole investigation).
    - **A second, harder test was needed beyond the usual pooled-sweep-
      then-by-season-check: does it transfer to the PRIMARY (SportsDataIO,
      live) pipeline** — this signal turned out to be sensitive enough to
      exact `recentVolumeAvg` values that pooled nflverse-only validation
      wasn't sufficient on its own, unlike every individual weight tuned
      earlier in this document. **WR failed this test decisively**: every
      ratio large enough to move the primary pipeline at all moved it the
      WRONG way, consistently, across three separate format/ratio tests
      (PPR -0.5pp, Half-PPR -0.5pp, Standard -2.4pp) — confirmed via raw
      pick counts, not just rounded percentages, and confirmed the
      mechanism itself works correctly (an aggressive test ratio did flip
      picks, just in the losing direction). **TE never regressed** on the
      primary pipeline — either a real gain (when tested at a nearby
      ratio) or exactly zero measured effect (plausible small-sample
      discreteness on TE's ~100-pair single-season pool, confirmed
      harmless rather than assumed: an aggressive test ratio did flip
      picks on the same pool, just not at the shipped ratio specifically).
    - **Shipped**: `ENSEMBLE_VOLUME_BLEND_RATIO` in `config.ts`
      (`Record<ScoringFormat, Record<SkillPosition, number>>`, 1.0 =
      pure engine/no-op), applied as a final stage in `scorePlayer` after
      every existing modifier — TE only, Half-PPR and Standard only, both
      at 0.7. PPR, QB (all formats), RB (all formats), and WR (all
      formats) all stay 1.0. Verified against the real production API
      after shipping: PPR is byte-identical on both pipelines; Half-PPR/
      Standard gain +0.2-0.3pp pooled with TE moving as predicted, and
      show zero measured change on the primary 2025-only pipeline (not
      harmful, just below this season's pick-flip threshold). Verified
      live end-to-end: a real Kelce vs. Andrews Half-PPR comparison
      rendered correctly, no console errors.
    - **The three positions failed (or passed) for three genuinely
      different reasons, not one "ensemble doesn't work" story — worth
      separating explicitly:**
      - **RB: not a generalization gap at all — a bug.** The apparent
        RB gain existed only in the buggy v1 harness (PPR-paired,
        wrong-format-scored). Once re-paired correctly *within the same
        pooled nflverse-only sample*, RB showed no signal in either
        non-PPR format. It never reached the primary-pipeline test stage
        with anything real to test.
      - **WR: a real, new failure mode — cross-pipeline generalization
        failure, not overfitting.** WR passed every check *within* the
        pooled nflverse-only sample (correctly re-paired, positive
        pooled gain, broadly consistent by-season). But that validation
        happened entirely on nflverse-only data (synthetic PlayerIDs, its
        own player-match/coverage quirks); tested against the structurally
        different primary SportsDataIO pipeline, every ratio large enough
        to move it at all moved it the WRONG way, consistently, across
        three separate format/ratio tests. This is distinct from the
        joint-logistic-regression rejection (items 38/42), which was
        classic overfitting — in-sample fit vs. cross-validated/
        leave-one-season-out fit, measured entirely *within one dataset/
        pipeline*. WR's ensemble failure is not "fit training noise, fails
        on held-out data from the same source" — it's "validated cleanly
        on one pipeline's data, doesn't transfer to a different pipeline's
        data." A sensitivity to exact input values and data-source
        differences, not to sample size or model capacity.
      - **TE: passed the hardest bar in the document so far.** Positive in
        the pooled multi-season nflverse-only sample AND never regressed
        against the primary pipeline (either a real small gain at a
        nearby ratio, or a confirmed-harmless measured-zero effect at the
        shipped ratio). The only one of the three that cleared all three
        checks.
    - **Standing rule going forward, not just a note on this item**: any
      future candidate signal that operates on the WHOLE `finalScore`
      (an ensemble/shrinkage/blend-toward-a-simple-baseline step, as
      opposed to one additive modifier feeding into it) must clear THREE
      checks before shipping, not the usual two:
      1. Pooled multi-season accuracy (2022-2025, nflverse-only).
      2. By-season breakdown showing no single season carrying the whole
         result.
      3. Direct re-test against the primary SportsDataIO pipeline, at the
         actual ratio being considered — not assumed from steps 1-2.
      This third check is the one every other individually-tuned weight
      in this document has been able to skip (single-modifier weights
      tuned on the pooled nflverse-only sample have transferred fine to
      the primary pipeline every time they were checked). Whole-score
      signals are not safe to assume the same about, per WR's result
      above — they appear more sensitive to exactly which pipeline
      produced the underlying numbers.
54. **Tested exponentially-weighted recent performance (most recent game
    weighted higher) as a standalone replacement for the engine's flat
    recent-N-game average** — same underlying data
    (`recentGamesByPlayer`'s last `RECENT_WEEK_COUNT` played games), just
    reweighted. Tested standalone (pick whoever has the higher weighted
    average, not blended with season average/volume/matchup the way the
    real engine actually uses `recentPprAvg`), pooled 2022-2025
    nflverse-only sample, decay parameterized so `decay=1.0` reproduces
    the flat average exactly (the control case) and `decay<1.0` tilts
    weight toward the most recent game.
    - **Caught a second instance of the same bug class as item 53**: the
      first pass's diagnostic route cached backtest cases in a single
      format-blind variable rather than a `Map` keyed by format — so
      after the first (PPR) request, every later Half-PPR/Standard
      request silently reused the PPR-paired cases while scoring them in
      the wrong format, identical in kind to item 53's pairing bug, just
      a caching variant of it rather than a hardcoded-format variant.
      Caught by re-running with a properly format-keyed cache and finding
      Half-PPR's numbers changed substantially (54.0% vs. the buggy
      50.9%) — the corrected numbers below superseded the originally
      (buggy) reported ones for Half-PPR and Standard; PPR was never
      affected (its own by-season checks used an inline per-request walk
      that didn't go through the buggy shared cache).
    - **Standalone accuracy is weak throughout** (50-55%, near chance) —
      expected, since this is testing the raw recent-average signal in
      total isolation, not blended with season average/volume the way
      the real engine uses it; consistent with item 2's original finding
      that raw points alone are close to a coin flip.
    - **The corrected per-format picture has no unifying story**: PPR
      wants mild recency weighting (`decay≈0.9`, +0.6pp overall, 3/4
      seasons improve). Half-PPR wants NO weighting at all — flat
      (`decay=1.0`) is the genuine best point, with any weighting making
      it monotonically worse; by season, 3 of 4 are roughly flat but 2025
      swings hard against weighting (-3.8pp), the exact kind of
      single-season sensitivity this document has repeatedly flagged as
      a reason not to trust a pooled number blindly. Standard wants
      dramatically MORE aggressive weighting (`decay≈0.15-0.2`, meaning
      the most recent 1-2 games nearly dominate), a real plateau across
      that whole low-decay range (+2.3pp overall at peak, 3/4 seasons
      improve, though 2022 declines by -2.8pp).
    - **Not integrated — dropped, per user request, rather than pursued
      further.** Three formats each wanting a qualitatively different
      weighting scheme, with no plausible unifying mechanism found or
      proposed, reads as more consistent with noise than a genuine
      format-dependent signal — especially layered on top of how weak
      the standalone signal is to begin with. **Flagged as worth
      revisiting, not closed as a dead end**: the real, more relevant
      test was never run — testing this INSIDE `blendedScore` (i.e.
      reweighting the recent-vs-season blend the way the engine actually
      uses `recentPprAvg`, rather than judging the raw recent-average
      signal in total isolation) might tell a cleaner story, since
      standalone accuracy this low doesn't say much about what happens
      once it's blended with season average and run through the rest of
      the pipeline. Temporary diagnostic route deleted after recording
      these numbers, same precedent as every other one-off analysis in
      this document.
55. **Investigated sourcing aggregated expert consensus rankings (e.g.
    FantasyPros) for historical weeks, to test blending them with the
    engine's own recommendation as a tiebreaker/blend factor** — a
    genuinely new *kind* of candidate signal (a third-party human/expert
    opinion aggregate, not derived from box scores or play-by-play the
    way every other signal in this document is). Investigated and
    dropped before any code was written — a research-and-decide task,
    not a backtest.
    - **A free, no-auth source does exist and was verified live, not
      assumed**: `dynastyprocess/data` on GitHub (a community open-data
      project, unaffiliated with FantasyPros itself) publishes
      `db_fpecr.csv.gz` — a ~100MB gzipped CSV of scraped FantasyPros
      Expert Consensus Rankings, fetchable the same static-file way every
      nflverse release already used in this project is. Confirmed by
      downloading and inspecting the real file (not just its docs): a
      `wp` ("weekly position") row type is exactly the "who's ranked
      where this week, by position" signal a blend/tiebreaker would need,
      with real, comparably-dense coverage for 2022 (13.5K rows), 2023
      (13.2K), and 2024 (12.2K).
    - **A real, disqualifying-for-2025 gap was found**: the file has
      ZERO `wp` rows for 2025, and the GitHub commit history (checked via
      the GitHub API directly, not summarized docs) shows the repo's
      automated FantasyPros scrape hasn't produced a new commit since
      August 8, 2025 — the archive appears to have stopped updating
      entirely roughly a year before this investigation. So this source
      could validate ECR as a standalone signal against 2022-2024 (three
      real seasons, the same scale this project already trusts for other
      nflverse-only backtests) but could never be checked against 2025 —
      the season the live tool and primary backtest pipeline actually
      run on.
    - **No SportsDataIO PlayerID join available either**: the file's
      `sportsdata_id` column (despite the name) is populated for some
      other ranking types but blank on the `wp` rows specifically —
      integrating this would need the same name-normalization join
      `playerMatch.ts` already built for nflverse, a solved but real
      extra step, not free.
    - **The official FantasyPros API was also checked**: real historical/
      bulk access requires a paid subscription tier, not a free path.
    - **A follow-up question — "is the Sleeper API worth using instead,
      since it's free?" — was checked and rejected on its own merits**,
      not just deferred: Sleeper's public API is genuinely free and
      no-auth (confirmed against its own docs), but it does not expose
      rankings or ADP as an endpoint at all. The "Sleeper ADP" shown on
      third-party sites (FTN, YAFSB, ADPWire) is those sites scraping and
      aggregating thousands of individual public Sleeper league drafts
      themselves, not something Sleeper's API hands you directly —
      replicating it would be a bigger scraping project than the
      FantasyPros file, for a *different* kind of signal besides (a
      once-a-year preseason draft-position snapshot, not a week-by-week
      in-season ranking), and it wouldn't close the 2025 gap regardless,
      since Sleeper has no bulk historical archive either.
    - **Dropped, per user request, rather than pursued further** — the
      free path's 2022-2024-only ceiling was judged disqualifying enough
      not to justify the ingestion/name-join work for a signal that could
      never be checked against the season that actually matters most
      right now. No code was written; this write-up is the only lasting
      artifact. Worth revisiting only if either the free archive resumes
      updating with 2025+ data, or a paid FantasyPros API subscription
      becomes worth acquiring for other reasons.
56. **Wired nflverse's real weekly injury report into backtest mode's
    recommendation logic** — prompted by a user report that a real,
    known-out player (Mahomes, out weeks 16-18 of the 2025 season) was
    still being recommended in Single Pair mode. Confirmed the report
    with a real backtest run before touching any code (`/api/backtest/
    pair?ids=18890,21693&season=2025&weeks=14,15,16,17,18` — Mahomes vs.
    Burrow): the model recommended Mahomes in weeks 16-18 despite
    `Played=false`/0 actual points every time, grading "incorrect" all
    three weeks.
    - **Root cause confirmed, not assumed**: `buildBacktestInput.ts`'s
      `buildBacktestComparisonInput` hardcoded `InjuryStatus: null` on
      every backtest player — deliberately, since SportsDataIO's archived
      `InjuryStatus` is retroactive and correlates 1:1 with that week's
      `Played` (using it would be circular with the outcome being
      graded). But nflverse's `injuries` release already has the real,
      *pregame* Questionable/Doubtful/Out designations — published days
      before kickoff, so using it is a genuine historical fact, not
      leakage — and it was already flowing into
      `weekSlice.nflverseStatForWeek()` for the standalone
      `pickByInjuryStatus` baseline (item 18), just never connected to
      the actual recommendation engine.
    - **Fix**: `buildBacktestComparisonInput` now reads
      `weekSlice.nflverseStatForWeek(playerId, targetWeek)?.injuryStatus`
      instead of hardcoding `null`. No new exclusion logic was needed —
      `comparePlayers` already excludes `Out`/`Doubtful` candidates when
      a healthy alternative exists (`engine.ts`, pre-existing code shared
      with the live tool); this just gives that existing filter real,
      non-leaky data in backtest mode too. Both backtest pipelines
      (primary SportsDataIO and nflverse-only) already load
      `getInjuryReports` into the same shared `nflversePlayerWeekTable`,
      so the fix applies to both with no pipeline-specific code.
    - **Re-verified live with a real "Out" case, since the Mahomes
      example itself didn't fully confirm the fix**: pulled nflverse's
      real `injuries_2025.csv` directly and found Mahomes has NO
      `report_status` at all for weeks 16-18 (blank for every 2025 row,
      in fact) — nflverse's weekly injury report drops a player from its
      practice-participation-based reporting once they're on longer-term
      injured reserve, so it structurally can't capture "on IR" the way
      it captures a week-to-week Out/Doubtful/Questionable tag. This is a
      real, separate data limitation, not a bug in the fix — confirmed by
      finding a genuine `Out`-tagged skill player instead (Alvin Kamara,
      out weeks 14-18 with a knee injury) and re-running
      `/api/backtest/pair?ids=18878,19045&season=2025&weeks=14,15,16,17,18`
      (Kamara vs. Aaron Jones): weeks 14-17 now correctly recommend Jones
      ("nobody else in this comparison is currently available"), and week
      18 — where Jones was *also* out — correctly falls back to comparing
      both rather than refusing to pick, exactly matching `comparePlayers`'
      existing "only filter if a healthy alternative exists" logic.
    - **Confirmed zero effect on Broad mode's own accuracy, on purpose,
      not by oversight**: re-ran the primary pipeline (all 3 formats) and
      the pooled nflverse-only multiseason route before/after (via
      `git stash`) and got byte-identical numbers every time (PPR 57.5%/
      56.5%, Half-PPR 55.2%, Standard 56.5%, pooled by-position/by-season
      all unchanged). This makes sense once traced through: Broad mode's
      candidate pool (`pairing.ts`) already filters to
      `targetWeekRows.filter(r => r.Played === 1)` before any pairing
      happens, so a genuinely-out player was never in the pool to begin
      with — this fix only changes behavior in **Single Pair mode**,
      where a user manually names two specific players and the tool has
      no pool-level filter to fall back on. That's exactly the mode the
      original report came from.
    - **Not a scoring-weight tradeoff like most items in this document**
      — no sweep, no user decision needed, since it's a straightforward
      "use real, already-available, non-leaky data instead of null" fix
      with a verified-safe (zero-effect) blast radius on the one mode
      that has an aggregate accuracy number to protect.
57. **Followed up on item 56's own open thread — the fix didn't fully
    cover the original Mahomes report, since nflverse's weekly injury
    report structurally can't capture longer-term injured reserve.**
    User asked directly: would real IR data actually move accuracy, or
    is this a narrow edge case not worth chasing? Answered with a real
    test, not speculation.
    - **Found a genuine, previously-unused source for this specific
      gap**: nflverse's `weekly_rosters` release (confirmed live,
      available for all of 2022-2025) has a per-player-per-week `status`
      column — `RES` (reserve/injured) correctly flags Mahomes for
      exactly weeks 16-18, the weeks the injury report couldn't see.
    - **Quantified the value before shipping anything**: rebuilt
      broad-mode-style pairing deliberately *without* the `Played===1`
      pool filter (to simulate the real exposure Single Pair mode has,
      since Broad mode's own tracked number is permanently insulated
      from any injury signal by that filter — see item 56). Graded three
      ways on the full 2025 season: no injury signal at all (61.9%/
      59.0%/57.8% across PPR/Half-PPR/Standard), the already-shipped
      weekly injury report alone (65.0%/61.9%/61.8%), and injury report
      + roster `RES` status together (**69.8%/69.2%/67.3%**). The `RES`
      signal's own marginal contribution (+4.8 to +7.3pp) was larger than
      the injury report's own — on 82-87 exposed pairs across the season,
      not a rare edge case. TE gained the most (66.7%→77.4% in PPR),
      plausibly because TE's shallow pool makes one IR'd starter a bigger
      pool-composition problem than at deeper positions.
    - **Shipped**: new `nflverse/rosters.ts` (`getReserveStatusReports`,
      filtering the release to `status === "RES"` only — deliberately not
      surfacing `INA` (game-day inactive), since that's announced ~90
      minutes before kickoff, a meaningfully different and murkier
      leakage question from an IR move announced days out, not tested
      here). `NflverseWeekStat` gained a `rosterStatus` field
      (`weekTable.ts`), populated by both backtest pipelines
      (`loadRun.ts`/`loadRunNflverseOnly.ts`) the same way `injuryStatus`
      already was; `NflverseSourceRows.rosterRows` is optional so live
      mode's `nflverseLive.ts` needed no changes (it already has
      real-time roster/injury status from SportsDataIO directly).
      `buildBacktestInput.ts` now treats `rosterStatus === "RES"` as
      equivalent to `"Out"`, taking priority over the injury-report
      status when both are present (a confirmed IR move is a stronger
      fact than a Questionable/Doubtful practice tag).
    - **Verified against real data, not just the pooled sweep**: re-ran
      the exact original report (Mahomes vs. Burrow, 2025 weeks 14-18)
      and confirmed weeks 16-18 now correctly recommend Burrow ("nobody
      else in this comparison is currently available"), fully resolving
      the case that prompted this whole investigation. Re-ran Broad mode
      on both pipelines, all three formats, before/after — byte-identical
      in every case, confirming the zero-effect-on-Broad-mode prediction
      from item 56 held for this signal too.

58. **Back-tested the core hypothesis behind a proposed Waiver Wire tool
    BEFORE writing any feature code — "does rising opportunity predict
    next-week performance better than rising points?" — and the answer
    was no, on both the first test and a real follow-up sweep.** The
    original pitch was trajectory-based: surface players whose recent
    opportunity (volume/share) had risen relative to their own baseline,
    even before their points caught up — the opposite framing from
    Start/Sit's absolute-value comparison. Same "prove it before building
    it" discipline as every other candidate signal in this document.
    - **Test design, deliberately NOT reusing `pairing.ts`'s adjacent-rank
      pool**: `BROAD_MODE_POOL_SIZE` caps the pool at each position's
      "startable" top tier (top-12 QB, top-24 RB/WR, top-12 TE) — exactly
      the players a waiver-wire tool has no reason to recommend. Built an
      uncapped pool instead (any player who played the target week with
      ≥6 prior played games), still paired adjacent-rank by season-to-date
      average through the prior week (same basis `pairing.ts` already
      uses, just without the cap) so pairs stay comparable in current
      role without leaking the trend signal itself into pair selection.
      `opportunityTrend` = Δ in `getVolumeStat` (recent 3 played games vs.
      the 3 before that); `pointsTrend` = Δ in PPR points, the same
      windows. Pooled 2022-2025, nflverse-only pipeline (temporary
      diagnostic route, deleted after recording numbers — same precedent
      as every other one-off analysis in this document).
    - **First result: statistically indistinguishable from each other,
      and both clearly weaker than just using absolute level.** Pooled
      (n=5283/5392): `opportunityTrend` 52.3%, `pointsTrend` 52.2% — a
      0.08pp gap, well within noise. A sanity control graded on the same
      pool/pairing — `absoluteVolumeLevel` (recent volume, no trend at
      all, the same signal already shipped as the `recentVolume`
      baseline) — came in at **54.9%**, confirming the harness was sound
      (it landed right where `recentVolume`'s already-documented numbers
      would predict) while showing trend adds nothing: level alone beats
      both trend variants by a real ~2.6pp. By season, `opportunityTrend`
      edges `pointsTrend` in 3 of 4 years (2023/2024/2025) but only by
      ~1pp each; 2022 goes the other way by 2.7pp — no decisive pattern.
    - **Followed up with a real 6-combo sweep before accepting the
      rejection** — window size (2/3/4 played games) × baseline
      definition (trend vs. the immediately-prior window, or trend vs.
      season-to-date average before the recent window), same "don't judge
      on one untuned point" discipline as every weight sweep in this
      document:

      | combo | `opportunityTrend` | `pointsTrend` |
      |---|---|---|
      | 2-game, vs. prior window | 51.8% | 51.5% |
      | 2-game, vs. season avg | 53.4% | 54.1% |
      | 3-game, vs. prior window | 52.3% | 52.2% |
      | 3-game, vs. season avg | 53.8% | 53.0% |
      | 4-game, vs. prior window | 54.4% | 54.1% |
      | 4-game, vs. season avg | 53.9% | 53.2% |

      The single biggest number (4-game-vs-prior-window) doesn't hold up
      decomposed: 2024 alone is +3.6pp (58.5% vs. 54.9%) while 2023 goes
      the other way (53.0% vs. 55.3%) and TE loses outright (50.3% vs.
      52.7%) — the same isolated-peak shape rejected elsewhere in this
      document (items 9, 20, 38). The one combo where `opportunityTrend`
      beat `pointsTrend` at every position AND every season
      (3-game-vs-season-average) still only won by 0.2-2.5pp each time,
      and its pooled number (53.8%) still trailed the very first
      control (absolute level, 54.9%). **No trend definition tested
      cleanly beat absolute recent volume level.**
    - **Decision: reframed the whole feature around absolute
      opportunity, not trend** — surfacing players whose CURRENT recent
      volume is high relative to their CURRENT recent points, not
      whether either one is rising. This is a ranking composition of an
      already-validated primitive (recent volume beats recent points as
      a forward signal — the strongest standalone predictor found across
      this whole app's backtesting history, items 6-13), not an
      independent predictive claim requiring its own separate backtest —
      flagged as such rather than presented as freshly validated. See
      the Waiver Wire tool description below and Conventions'
      `src/lib/waivers/` entry.
    - **Shipped as a third live tool, `/waivers`**: `rankCandidates.ts`
      does a bulk, whole-active-player-pool scan (deliberately NOT
      running the full `buildComparisonInput`/`scorePlayer` pipeline
      per player — that's reserved for the handful of candidates
      actually surfaced) ranking each position by the gap between a
      player's recent-volume rank and recent-points rank (self-relative
      floor: only ranks within the top half of the position's own
      recent-volume distribution, not a guessed absolute cutoff).
      `buildWaiverReport.ts` then runs the real engine
      (`buildComparisonInput`/`scorePlayer`) for just those top
      candidates, reusing `PlayerScoreBreakdown.notes` verbatim (same
      "one source of truth for reasoning text" as `ComparisonResult.tsx`/
      `TradeResult.tsx`) rather than inventing new copy — one exception:
      `scorePlayer`'s own WR-only handcuff note is filtered out and
      replaced with a plain roster-context line, since that note always
      reads "worth roughly 0.0 extra points" (`TEAMMATE_OUT_BUMP_WEIGHT_
      WR` is zeroed, item 35) and read as a direct contradiction sitting
      under this feature's own "may be opening up extra opportunity"
      line — caught live, in the browser, not assumed. `suggestDrop.ts`
      reuses the Trade Analyzer's `evaluateTrade`/`projectRestOfSeason`/
      `toTradePlayerResult` verbatim — a same-position "drop X, add Y" is
      literally a 1-for-1 trade evaluation, not a new comparison
      mechanism. Roster marking (`useRosteredPlayers.ts`) is
      localStorage-only, mirroring `useScoringFormat.ts` — no real league
      integration, consistent with this app's "no persistence" scope.
    - **Verified live end-to-end**, not just the backtest: ran a real
      `/api/waivers` request with two rostered players (Bijan Robinson,
      RB; CeeDee Lamb, WR), confirmed real candidates surfaced per
      position with correct gap labels (e.g. "RB8 by volume" / "RB38 by
      points"), correct same-position-only drop suggestions (RB pickups
      suggested dropping Bijan Robinson, WR pickups suggested dropping
      CeeDee Lamb, TE pickups showed no suggestion since none was
      rostered there — graceful degradation), the handcuff-note dedup
      fix rendering cleanly, and the "Already rostered" dismiss button
      correctly both hiding a card immediately and adding it to the
      roster list for future runs. No console errors, both light and
      dark mode.

59. **Reworked the Waiver Wire tool's roster input after real usage
    feedback: manual one-by-one marking was unrealistic, and re-adding a
    whole roster every session was the actual complaint** (item 58
    shipped "mark players as rostered" as the only mechanism). Two
    fixes, one small and one a real new integration.
    - **First, a UI bug caught in the same pass**: the "Already rostered"
      pill on `WaiverResult.tsx`'s candidate cards overflowed past the
      card's own right edge for longer player names (confirmed visually
      — Aaron Rodgers' pill sat flush against/past the border while
      Brady Cook's had normal padding). Root cause: the avatar+name flex
      wrapper had no `min-w-0` of its own — only its inner text div did —
      so the browser's automatic flex-item sizing wouldn't let the
      wrapper shrink below its natural content width to make room for
      the non-shrinking button, even though the inner truncate was
      correctly configured. Standard fix: add `min-w-0` to the
      *outer* wrapper too, not just the div actually doing the
      truncating. Verified at both desktop (two-column grid) and mobile
      (375px, single column) widths.
    - **The real fix: Sleeper league import**, not a bigger manual-entry
      UI. Confirmed live against Sleeper's real public API (no auth
      needed — verified directly with `curl` before writing any code,
      including the "user not found" case, which returns HTTP 200 with a
      JSON `null` body rather than a 404) that a user's real roster is
      fully fetchable in three calls: username → user_id
      (`/user/{username}`), user_id + season → leagues
      (`/user/{id}/leagues/nfl/{season}`), league → rosters
      (`/league/{id}/rosters`, `owner_id`/`co_owners` identify which
      roster is the user's own). A separate, heavily-cached call
      (`/players/nfl`, ~12k entries) maps Sleeper's own player_ids to
      real names — Sleeper's docs ask callers not to hit it more than
      once a day, so it's cached 24h, same TTL discipline as nflverse's
      heavy CSV releases.
    - **New `src/lib/sleeper/`**: `client.ts` (same in-process TTL cache
      pattern as `sportsdata/client.ts`/`nflverse/client.ts`, no API key
      needed), `api.ts` (`getSleeperUser`/`getSleeperLeagues`/
      `getSleeperRosters`/`getSleeperPlayers`), `resolveRoster.ts` — a
      THIRD name-based player join (Sleeper has no ID shared with
      SportsDataIO either), deliberately reusing nflverse/playerMatch.ts's
      `normalizePlayerName`/`buildSdioPlayerIdByNormalizedName` rather
      than a third hand-rolled normalization scheme. Team-defense and
      kicker roster slots are skipped (confirmed live that Sleeper's
      player map returns `position: "DEF"` with `full_name: null` for
      those, e.g. `"CLE"`) — this app has no D/ST or K support. A genuine
      name-mismatch is returned as an `unmatched` name, not silently
      dropped, same honesty discipline as every other name-join in this
      project.
    - **New routes**: `GET /api/sleeper/leagues?username=X` (queries
      both the last-completed and upcoming season in parallel, so a
      not-yet-reset redraft league and an already-rolled-over dynasty
      league both show up without guessing which one applies) and
      `GET /api/sleeper/roster?leagueId=X&userId=Y`.
    - **Frontend**: `SleeperImport.tsx` (username → league picker →
      import, or once connected, a one-click "Sync roster" /
      "Change league") plus `useSleeperConnection.ts` (localStorage,
      mirrors `useScoringFormat.ts`'s pattern — remembers username/
      league so returning to the page never requires re-entering
      either). Imported players merge into the existing roster list via
      the same `addRostered` the manual `PlayerSearchInput` already
      used (already dedup-safe) — sync never silently removes a
      manually-added player, only adds. The manual search box stays
      alongside it for one-off additions Sleeper doesn't have (kept, not
      replaced).
    - **Verified live end-to-end against a real, live Sleeper account
      with real current-season leagues** (found via Sleeper's own
      documented example league ID, which happens to still resolve to a
      live user with real 2025/2026 leagues — confirmed independently
      with `curl` before any UI testing, so the API-shape assumptions
      going into the code were never guessed): username → 6 real leagues
      resolved correctly (both 2025 and 2026 shown) → picking a league
      imported 12 real roster players with **zero unmatched names** →
      connection and full roster survived a hard page reload → running
      "Find waiver targets" correctly excluded every rostered player and
      suggested realistic same-position drops (varied verdicts, "Bad
      trade" and "Fair trade" both appeared depending on the pair) →
      "Change league" correctly cleared the connection while leaving the
      already-imported roster untouched. No console errors, light and
      dark mode both checked. (One session-specific note: this app's
      Browser-pane pointer-click tool had a coordinate-dispatch issue
      unrelated to the app itself during this verification pass — worked
      around by driving clicks/input via `document.querySelector(...)`
      + `.click()`/native-setter value assignment instead; every
      interaction was still exercised through the real rendered DOM and
      real event handlers, not mocked.)

60. **Fixed a real gap in item 59's Sleeper import, caught by the user
    immediately after trying it: it only excluded the user's OWN
    roster, not players already owned by opponents in the same league.**
    A genuine waiver-wire candidate has to be unrostered LEAGUE-WIDE —
    recommending a player someone else already drafted isn't a usable
    pickup, it's just wrong. Sleeper's rosters endpoint already returns
    every team's roster for a league in one call
    (`GET /league/{id}/rosters`), not just the requesting user's — the
    gap was that `resolveRoster.ts` only ever looked at the one roster
    matching `owner_id`/`co_owners` and discarded the other ~11+ teams'
    rosters it had already fetched.
    - **`resolveSleeperRoster` now resolves every roster in the league in
      one pass** (not the user's roster, then a second separate
      resolution) and returns both: `players`/`unmatched` (the user's
      own roster, unchanged) and a new `leagueRosteredPlayerIds: number[]`
      — the union of every SportsDataIO-resolved player across ALL
      rosters in the league, including the user's own. Deliberately IDs
      only, not full `PlayerSummary` objects, since these are never
      individually displayed — only used to exclude candidates.
    - **Kept as a genuinely separate concept from `rostered`, not
      merged into it**, since the two get used for different things:
      `/api/waivers` unions `rostered` + `leagueRostered` for the
      ranking-pool exclusion (anyone owned by anyone is not a waiver
      candidate), but `suggestDrops` still receives `rostered` alone
      (only the user's OWN players are ever valid drop candidates — you
      can't drop an opponent's player).
    - **Threaded through the frontend**: `SleeperConnection` gained
      `leagueRosteredPlayerIds`, refreshed on every "Sync roster" (not
      just the initial import) so it can't go stale relative to the
      real league. Connection state was lifted from `SleeperImport.tsx`
      into `WaiverTool.tsx` (which now owns the single
      `useSleeperConnection()` call and passes `connection`/
      `onConnectionChange` down as props) — two separate hook instances
      each syncing their own copy of the same localStorage key would not
      have seen each other's updates within a render, and `WaiverTool.tsx`
      is the component that actually needs the value to build the
      `/api/waivers` request. A small transparency line ("Also excluding
      N players already rostered by other teams in this league") shows
      whenever a league is connected, so the exclusion isn't silent.
    - **Verified against the real, live league already used for item
      59's verification**: the league's real roster count came back at
      152 total rostered players (12-team league) — confirmed the
      user's own 12 are a strict subset of that 152 (`resolveTeam` isn't
      double-counting or diverging between the two code paths), then ran
      a real `/api/waivers` request with all 152 IDs in `leagueRostered`
      and confirmed **zero overlap** between the 24 surfaced candidates
      and the excluded set, checked programmatically against the raw
      response JSON, not just eyeballed. Verified a real drop suggestion
      still worked correctly off the user's own (unaffected) roster
      subset. No console errors, dark mode checked.

61. **Two follow-up polish requests on the Waiver Wire tool, both from
    direct user feedback after trying items 59-60.**
    - **"Trade" → "move" in the drop-suggestion panel.** A drop+add
      isn't a trade between two sides — there's no trade partner, just
      swapping one roster spot — but `WaiverResult.tsx`'s
      `DropSuggestion` was rendering `evaluateTrade()`'s own
      `evaluation.headline` verbatim ("Good/Bad/Fair trade..."), since
      `suggestDrop.ts` reuses that function's verdict math directly
      (item 58's whole point). Rather than touch `evaluateTrade()`
      itself — shared with the real Trade Analyzer, where "trade" is
      the correct word — added a small `moveHeadline()` in
      `WaiverResult.tsx` that rebuilds the same phrasing from
      `evaluation.verdict`/`evaluation.netValue` (both already exposed
      on `TradeEvaluation`) with "move" wording instead. The verdict
      *logic* (threshold, good/bad/fair decision) stays single-sourced
      in `evaluateTrade()`; only this presentation-layer string differs
      per caller. Verified live: all three variants ("Good/Bad/Fair
      move...") render correctly, confirmed `evaluateTrade.ts`/
      `TradeResult.tsx` byte-unchanged (no risk to the real Trade
      Analyzer, which still correctly says "trade").
    - **"Already rostered" button: hide once Sleeper-connected, and
      reposition it so it never competes with the player name.** Two
      separate problems the user's question surfaced:
      1. The button always called `addRostered` (the user's OWN
         roster), but a surfaced candidate excluded by the item 60 fix
         could be on an OPPONENT's roster — clicking it in that case
         would have incorrectly added someone else's player to the
         user's own roster (and made them eligible as a future
         drop-candidate). Once Sleeper is connected, the league-wide
         sync already covers the normal case, and the rare remaining
         gaps (a name-match miss, or a stale sync) are better handled by
         "Sync roster" than by this button. Resolved by hiding it
         entirely when `sleeperConnection` is set — `WaiverResult`
         gained a `showRosteredButton` prop, `WaiverTool.tsx` passes
         `!sleeperConnection`. Manual-mode users (no Sleeper connection)
         keep the button unchanged, since it's still their only way to
         build the exclusion list at all.
      2. Independent of the above, the button was still living inside
         the avatar+name header row, fighting the name for space (the
         reason item 58's original `min-w-0` overflow bug existed at
         all). Moved it out of that row entirely — the header is now
         just avatar + name + position/team, always full width. First
         pass put it at the end of the badges row via `ml-auto`
         (right-aligned, wrapping to its own line on narrow cards); a
         same-session follow-up request moved it again, to its own row
         directly below the badges, left-aligned flush with the
         "`{positionLabel}` by volume" pill rather than floated right —
         the final, shipped placement.
    - **Verified live**: with Sleeper connected, confirmed via
      `document.querySelectorAll` that zero "Already rostered" buttons
      render anywhere on the page, and every card's name displays in
      full (no truncation, nothing to compete with). Clicked "Change
      league" to disconnect without reloading and confirmed the
      *already-rendered* results re-render with the button now present
      (a live prop, not baked into the stale response — no re-fetch
      needed) in its shipped position, its own row under the badges.
      Clicked it for a real candidate (Brady Cook) and confirmed it was
      added to the roster chips and disappeared from the QB results,
      same dismiss behavior as before. No console errors.

62. **Built D/ST and K support — the first time this app has scored any
    position outside QB/RB/WR/TE** — on a deliberately much simpler
    model than the skill-position engine, per explicit instruction:
    test standalone first, expect a lower ceiling than skill positions,
    and don't over-invest if the first pass shows thin/noisy signal.
    Candidate signals were named up front rather than discovered:
    opponent implied team total + turnover/sack rate for D/ST, own-team
    implied total + dome/wind for K.
    - **Real data sources confirmed live before writing any scoring
      code**, same discipline as every prior signal in this document.
      D/ST: SportsDataIO's `FantasyDefenseByGame/{season}/{week}`
      (previously unused by this app — team-level defensive stats,
      `Sacks`/`Interceptions`/`FumblesRecovered`/`FantasyPoints` etc.,
      confirmed live). K: no new source needed — `PlayerGameStatsByWeek`
      already returns kicker rows (`Position: "K"`), just never
      previously surfaced in player search. **Implied team total**
      (both positions' shared matchup signal) comes from nflverse's
      `schedules` release, already used for weather/byes/opponents (see
      Data Source Notes) — `total_line`/`spread_line` combine as
      `total/2 ± spread/2` per team. Confirmed the sign convention
      live rather than assuming it, cross-checking nflverse's
      `spread_line` against SportsDataIO's `GameOddsByWeek` for a real
      game before trusting either the formula or which sign belongs to
      the home vs. away team.
    - **Standalone backtest results, full 2025 season** (temporary
      diagnostic route, deleted after recording numbers — same
      precedent as every other one-off analysis in this document):

      | signal | position | pairwise accuracy | naive baseline |
      |---|---|---|---|
      | opponent implied total | D/ST | **63.8%** (n=226) | season avg 50.4% |
      | recent turnover/sack rate | D/ST | 50.0% (n=226) | — (chance) |
      | own-team implied total | K | 55.4% (n=201) | season avg **60.1%** |
      | dome/wind | K | 51.4% (n=201) | — (near chance) |

      **A genuine surprise, not the expected outcome**: D/ST's
      implied-total signal came back clearly *stronger* than most
      skill-position signals in this entire document (comparable to
      recent-volume's 56.6% skill-position ceiling from item 7, and
      well above it) — plausible given how directly a defense's
      fantasy output depends on the opposing offense's success
      (sacks/turnovers/points-allowed are all suppressed when the
      opponent is expected to move the ball well). D/ST's own
      turnover/sack-rate signal landed at exactly 50.0% — dead chance,
      the same "no signal" result item 12's team-level game-script
      baseline found. **K came back as expected — thin and weaker than
      a naive baseline**: neither candidate signal cleanly beat simply
      ranking kickers by season-to-date average, the outcome flagged as
      the likely one going in. Per the explicit instruction not to
      over-invest once this became clear, no further K signal
      exploration was done (e.g. no attempt at red-zone trips, a more
      standard kicker signal not tested here).
    - **Shipped D/ST's implied-total signal as a real, meaningfully
      weighted matchup modifier** — not a token gesture. Conversion
      factor derived via OLS regression (`FantasyPoints ~ opponent
      implied total`, full 2025 season, n=544 team-weeks, matching this
      project's established regression discipline over "ratio of sums"
      whenever a signal isn't naturally zero-anchored — see item 33's
      RB EPA precedent): slope **-0.486** points lost per point of
      opponent implied total above a 22.5-point league average, capped
      at ±5.0 points. **Shipped K's implied-total signal too, but as a
      deliberately modest, capped modifier** (slope +0.175, cap ±2.0) —
      real and directionally correct, but small, reflecting that it's
      the weaker of the two positions' signals and `blendedScore`
      (recent-vs-season form) already captures most of what
      `recentVolume`'s-analog (season average) would predict on its
      own. **Turnover/sack rate and dome/wind are surfaced as
      reasoning-note context only, never weighted into `finalScore`** —
      the same "prove it before wiring it in" bar every other signal in
      this document has had to clear, and both failed it outright (50.0%
      and 51.4%).
    - **Architecture: two new, deliberately simple scorers, not an
      extension of the skill-position engine.** `scoreDefense.ts`/
      `scoreKicker.ts` are self-contained — a recent-vs-season blend
      (reusing `blendRecentAndSeason`/`dataQualityFor`, factored out
      into a new shared `scoreExtendedShared.ts`) plus exactly one
      additive matchup term — rather than routing D/ST/K through
      `scorePlayer`'s dozen-signal skill-position pipeline with every
      unused field defaulted to null. Keeps the already-validated skill
      engine completely untouched (confirmed via `npx tsc --noEmit`
      immediately after the one refactor `engine.ts` did need — see
      below — with zero behavior change) and makes each position's
      actual model size honest in the code itself, not just in a
      comment. A new `scoreExtended.ts` dispatches by position
      (`scoreExtendedPlayer`) so every call site (compare/trade/waivers
      routes) has one entry point regardless of which of the three
      scorers actually runs, plus a matching
      `projectExtendedRestOfSeason` for the Trade Analyzer/waivers drop
      suggestions. The one skill-engine change: `comparePlayers` in
      `engine.ts` was split into itself (still `scorePlayer` on skill
      inputs) plus a newly-exported `compareBreakdowns(breakdowns)` that
      does the actual ranking/tiebreaker logic on an array of
      already-scored `PlayerScoreBreakdown`s — a pure extraction with no
      logic change, so `scoreExtendedPlayer`'s D/ST/K/skill breakdowns
      can all be ranked together through the one shared comparison path
      regardless of which scorer produced them.
    - **D/ST needs a synthetic player identity that doesn't otherwise
      exist** — SportsDataIO has no "player" record for a team defense.
      New `sportsdata/defenseTeams.ts` mints one from the existing
      `/Teams` endpoint: synthetic PlayerIDs via a `900000 + TeamID`
      offset (guaranteed no collision with any real SportsDataIO
      PlayerID), `FirstName: ""`/`LastName: "{Team} D/ST"`,
      `Position: "DST"`. New `sportsdata/defense.ts` reads
      `FantasyDefenseByGame` the same shape every other per-week reader
      in this app uses. A new `ExtendedPosition = SkillPosition | "DST"
      | "K"` type (`sportsdata/types.ts`) is used only where D/ST and K
      genuinely need to flow through the same code as skill positions
      (search, roster marking, waiver-candidate typing) — `SkillPosition`
      itself is untouched, since it's deeply embedded in the validated
      skill engine and changing it would have risked exactly the kind
      of accidental behavior change this whole architecture was built
      to avoid.
    - **Scoped to "everywhere skill positions appear," per an explicit
      choice put to the user rather than assumed** — the alternative
      (Start/Sit only, since that's the tool the original ask was
      framed around) was offered as the recommended, smaller-footprint
      option; the user chose the broader scope. Wired into all three
      live tools: `/api/compare` (`getImpliedTeamTotalsByTeamWeek`,
      new in `nflverse/schedules.ts`, fetched alongside the existing
      weather/opponent lookups), `/api/trade` (same fetches, plus
      `projectExtendedRestOfSeason` for D/ST's and K's rest-of-season
      values — mirroring skill positions' `restOfSeason.ts` but simpler:
      implied totals are only ever known ~1 week out in practice, per
      nflverse's own schedule data, so the projection naturally falls
      back to a flat recent-form base rate for every farther-out week
      rather than fabricating a matchup adjustment — an honest
      simplification, not a bug, the same "can't know that far ahead"
      precedent this app's weather-forecast display already
      established), and `/api/waivers`.
    - **Waivers needed a genuinely different ranking mechanism, not a
      reuse of skill positions' opportunity-vs-production gap** — there's
      no volume/opportunity concept for a team defense or a kicker.
      New `rankExtendedCandidates.ts` instead ranks by how much a
      player's *this-week* matchup-adjusted score outperforms their own
      *season-to-date* rank — real streaming logic (the same shape
      fantasy players already use to decide a Tuesday-night D/ST
      pickup), not a forced analogy to skill positions' gap framing.
      Surfaced in `WaiverResult.tsx` with position-appropriate badge
      language (`isStreamingPosition()`: "this week"/"this season"
      rather than skill positions' "by volume"/"by points").
    - **Found and fixed a real reliability bug while building the
      waivers ranking**, the same class of bug item 27 already fixed
      once for the nflverse backtest pipeline: scanning all 32 D/ST
      teams (and every active kicker) concurrently meant each one
      independently re-fetched the same underlying per-week
      `FantasyDefenseByGame`/`PlayerGameStatsByWeek` data before any
      single request could populate the shared in-process cache —
      confirmed live via a real `SportsDataError: Network error calling
      /FantasyDefenseByGame/2025REG/8: fetch failed` under that load,
      not a hypothetical. Fixed the same way item 27 did: pre-warm every
      needed week's data once (sequenced, not `Promise.all`'d together,
      for the same peak-connection-pressure reason), before the
      per-entity fan-out. Verified the fix holds across 4 consecutive
      cold dev-server restarts.
    - **UI caveats calibrated per position's actual validated strength,
      not a blanket disclaimer** — the original ask was for something
      like "D/ST and K are inherently harder to predict than skill
      positions," but the backtest showed that's only true for one of
      the two. `scoreDst`'s first note instead reads "D/ST uses a
      simpler model than skill positions... not a blend of a dozen
      signals" (simpler, not necessarily less trustworthy — its own
      signal backtested stronger than most skill-position signals);
      `scoreKicker`'s first note keeps the originally-requested framing
      verbatim ("Kickers are inherently harder to predict... treat this
      as a rougher estimate"), since that one *is* accurate to what the
      backtest found. Matches this project's standing discipline
      (Recommendation Logic Philosophy: "when it's a close call
      statistically, say so") extended to a whole position's confidence
      level, not just a single comparison's.
    - **Verified live end-to-end across all three tools, not just
      backtest**: Start/Sit (a real Pittsburgh Steelers D/ST vs. Arizona
      Cardinals D/ST comparison, correct recommendation with matchup
      reasoning), Trade Analyzer (a real Jacksonville Jaguars D/ST-for-
      Harrison Butker trade, correct "Fair trade" verdict with full
      rest-of-season detail cards for both, including the season-
      rollforward note when no current-season games remain), and
      Waivers (both the D/ST and K sections rendering real streaming
      candidates with correct badges/reasoning/matchup context, "Already
      rostered" working normally). Checked in both dark and light mode,
      zero console errors across all three tools with D/ST or K
      involved. Full-project `npx tsc --noEmit -p .` and `npm run lint`
      both clean after all of the above.
    - **One known, deliberately unaddressed gap surfaced by this
      work**: `sleeper/resolveRoster.ts` (item 59) still explicitly
      skips D/ST and K slots when importing a Sleeper roster ("this app
      has no D/ST or K support" — no longer accurate as of this item,
      but not fixed here, since Sleeper import wasn't part of this
      task's scope). Practical effect: a Sleeper-synced roster won't
      include a user's own D/ST/K, so `suggestDrop.ts`'s drop-candidate
      step will never suggest dropping one for a Sleeper-connected user
      (manual roster marking via `PlayerSearchInput` still works for
      both positions, same as any skill position). Left as an open item
      below rather than silently patched as a side effect of this task.

63. **Added real D/ST and K support to the Backtest page** — item 62
    validated D/ST's and K's simplified scoring model with a temporary,
    one-off diagnostic route; this item wires that validation into the
    permanent, user-facing Backtest UI (Broad mode's by-position accuracy
    breakdown, plus Single Pair mode), on direct request: "I want to see
    their accuracy metrics."
    - **New data loading in `loadRun.ts`**: `allDefenseWeeklyRows`
      (`FantasyDefenseByGame` for every week, mirroring how
      `allTeamWeeklyRows` already batch-fetches `TeamGameStatsByWeek`),
      `impliedTotalsByTeamWeek` (nflverse's Vegas-implied totals, same
      source item 62's live scorers already use, wrapped in the same
      degrade-to-empty-map-on-failure pattern as every other nflverse
      fetch in this pipeline), and `dstPlayers`/`dstPlayerIdByTeam`
      (from `getAllDstPlayers()`, resolved once so pairing/scoring stay
      synchronous rather than re-fetching `/Teams` per lookup). All four
      are optional fields on `BacktestRunData`, following the exact
      precedent `teamWeatherByTeamWeek`/`depthChartByPlayerIdWeek`
      already set for primary-pipeline-only data — deliberately NOT
      extended to `loadRunNflverseOnly.ts`'s 2022-2024 pipeline in this
      pass, since that's not where D/ST/K's live scoring was tuned or
      validated (see Open Items).
    - **A real architectural obstacle, found and worked around rather
      than hit blindly**: `buildPositionDefenseTableFromRows`/
      `buildSeasonToDatePlayerStatsFromRows` (the tables backing
      skill-position pairing/matchup context) both filter to
      `isSkillPosition(row.Position)` BY DESIGN — confirmed by reading
      both functions before writing any new code, not assumed. That
      meant the tempting shortcut ("just merge D/ST/K rows into
      `allWeeklyRows` and let the existing pipeline handle them") would
      have silently dropped both positions from every season-to-date
      lookup, since neither `"DST"` nor `"K"` is a `SkillPosition`. Kept
      D/ST entirely separate (its own `allDefenseWeeklyRows` array,
      never merged into `allWeeklyRows`) and added a new
      position-agnostic `weekSlice.seasonGamesByPlayer()` helper
      specifically so K — whose raw rows already DO live in
      `allWeeklyRows`, confirmed live via a direct
      `PlayerGameStatsByWeek` fetch showing real `Position: "K"` rows
      with correct `FantasyPoints` — has a season-average basis the
      existing skill-filtered `seasonToDateTable` can't provide.
    - **New pairing functions in `pairing.ts`**:
      `buildDstPairsForWeek` (team-level, ranks all ~31 non-bye teams
      by season-to-date D/ST points, adjacent-rank pairs, deliberately
      uncapped unlike skill positions' `BROAD_MODE_POOL_SIZE` — with
      only 32 teams total, the whole universe is already "realistic
      depth," unlike WR/RB's much deeper bench pools) and
      `buildKickerPairsForWeek` (player-level, same shape as skill
      pairing but sourced from the new `seasonGamesByPlayer` rather
      than the skill-filtered table). `CandidatePair.position` widened
      from `SkillPosition` to `ExtendedPosition` to carry `"DST"`/`"K"`
      pairs — required one small, targeted cast in `tradeBacktest.ts`
      (`pair.position as SkillPosition`, with a comment explaining why
      it's safe: that file only ever calls the skill-only
      `buildAllPairsForWeek`, never the new extended one).
    - **New backtest-mode input builders**: `buildBacktestDstInput`
      (`scoreDefense.ts`) and `buildBacktestKickerInput`
      (`scoreKicker.ts`) are the synchronous, weekSlice-driven
      counterparts to item 62's live `buildDstComparisonInput`/
      `buildKickerComparisonInput` — same relationship
      `buildBacktestInput.ts` already has to `buildInput.ts` for skill
      positions. One deliberate departure from skill positions'
      backtest precedent: `nextOpponent`/`opponentImpliedTotal` are
      populated normally here, not nulled out — skill positions null
      this in backtest mode specifically to avoid leaking an unknowable
      *future* opponent, but D/ST's and K's "opponent this week" in a
      backtest is the target week's real, already-played, fully-known
      historical matchup, so there's no leakage risk to guard against.
      Both builders read injury status from nflverse's real weekly
      report (`weekSlice.nflverseStatForWeek`), the same non-leaky
      discipline `buildBacktestComparisonInput` already established for
      skill positions, rather than a circular SportsDataIO field.
    - **New dispatcher, `scoreExtendedBacktest.ts`**:
      `scoreExtendedPlayerBacktest` mirrors item 62's live
      `scoreExtendedPlayer` dispatch (synthetic D/ST ID -> K -> skill)
      but returns a `PlayerScoreBreakdown` synchronously. Both
      `runPairBacktest` and `runBroadBacktest` (`runBacktest.ts`) now
      call this plus the already-existing `compareBreakdowns` (the pure
      ranking function item 62 already extracted out of `comparePlayers`
      for exactly this kind of mixed-position-family use) instead of
      `buildBacktestComparisonInput`+`comparePlayers` directly.
    - **Grading D/ST required one small, well-scoped workaround**: D/ST
      has no row in `allWeeklyRows` at all (SportsDataIO models it as a
      team stat), so `gradeOutcome`'s `PlayerGameStat`-based actual-score
      lookup can't grade it directly. Rather than widen that
      well-tested, widely-shared function, `runBacktest.ts` builds a
      small, request-scoped array of `PlayerGameStat`-SHAPED rows from
      that week's real D/ST box scores (`toDstActualRows` — synthetic
      PlayerID via `dstPlayerIdByTeam`, `FantasyPoints` copied into both
      the PPR and standard fields since D/ST doesn't vary by scoring
      format) — just enough for `gradeWeek` to run completely unchanged.
      Never merged into `allWeeklyRows`/`seasonToDateTable` themselves,
      which stay skill-position-only by design, per the obstacle above.
    - **Baseline grading (naive-strategy comparison) is deliberately
      skipped for D/ST and K pairs**, in both Broad and Single Pair
      mode — every `baselines.ts` picker was built and validated against
      skill-position signals (volume, snap share, target share, etc.)
      that don't exist for these two positions; testing confirmed most
      would just report `no_pick` for a D/ST or K pair (since they read
      the skill-filtered `seasonToDateTable`), but a few (team pace,
      prior-week points) would still produce a real-looking but
      essentially coincidental number — team-level pass/rush rate has no
      real relationship to a kicker's own scoring, for instance. Skipping
      entirely, rather than shipping baselines that produce numbers
      without a coherent naive-strategy story behind them, follows this
      document's own "don't report a number without a real story"
      discipline (see items 12/17's own precedent for reporting a
      negative/non-result honestly rather than a shaky positive one).
    - **This also fixed a real, previously-latent bug, not a
      hypothetical one**: since item 62 already widened `/api/players`
      search to include D/ST and K, a user could ALREADY select two
      kickers (or two defenses) in Single Pair mode before this item
      shipped — and the old skill-only `runPairBacktest` would have
      either produced nonsense (K, silently run through the
      skill-position engine it was never tuned for) or an outright
      wrong/broken result (D/ST, whose synthetic ID was never in
      `allWeeklyRows`/`allPlayers` at all). This item closes that gap as
      a side effect of building real Broad-mode support, not a
      separately-scoped fix.
    - **Verified live end-to-end, not just via `tsc`**: Broad mode with
      only D/ST and K checked returned real, sane numbers — **D/ST
      65.0%** (160-86, 10 push) and **K 52.0%** (116-107, 25 push),
      both consistent with item 62's standalone diagnostic (63.8%/
      55.4%) — with baselines correctly showing no data rather than
      crashing. Single Pair mode verified with a real D/ST-vs-D/ST
      comparison (San Francisco vs. Cleveland, 62.5% with a sensible
      week-1 no-pick before any season-to-date data exists, real
      week-by-week fantasy point totals matching realistic box scores)
      and a real K-vs-K comparison (Chris Boswell vs. Jake Bates,
      58.8%). Confirmed the season/mode guard conditions work
      correctly: D/ST/K checkboxes render only in Broad mode on the
      2025 season, and stay hidden for 2024/2023/2022 (no nflverse-only
      D/ST support) and for Trade analyzer mode (no trade-backtest
      support). Zero console errors across every check. Full-project
      `npx tsc --noEmit -p .` and `npm run lint` both clean.
    - **Deliberately out of scope for this item** (see Open Items):
      extending D/ST/K backtest support to the nflverse-only 2022-2024
      pipeline (would need confirming nflverse has an equivalent
      team-defense data source, not yet checked) or to the Trade
      Analyzer's own backtest (`tradeBacktest.ts` stays skill-only,
      unchanged).

64. **Reworked the app's top-level navigation from a single top NavBar
    into a persistent sidebar shell, plus a new Home page** — the app
    had grown to four real tools (Start/Sit, Trade Analyzer, Waivers,
    Backtest), each still built as its own isolated, centered
    marketing-style page with a big hero. Explored two mockups first
    (a general "dashboard" concept and the same treatment applied to
    Start/Sit specifically) before building anything real, then shipped
    on direct request — with one explicit change from the mockups: the
    landing page is called **Home**, not "Dashboard," throughout (nav
    label, route, page title).
    - **New `AppShell.tsx`** replaces `NavBar.tsx` (deleted) as the root
      layout's chrome — a persistent sidebar, deliberately kept a fixed
      dark navy in BOTH light and dark mode (unlike every other surface
      in this app, which follows the theme toggle) as a "broadcast
      desk" nod to the app's existing Prime Time navy/electric-blue
      branding. Collapses to a horizontal scrolling bar below the `md`
      breakpoint instead of a hamburger menu, since the 5-link list
      stays usable that way. Shows the user's current scoring format
      (read live from `useScoringFormat`) in its footer — real state,
      not a static label.
    - **New `PageHeader.tsx`** replaces each page's old full-bleed hero
      (large centered headline + `.hero-glow` gradient blur, now
      deleted from `globals.css` as dead CSS) with a compact, left-
      aligned title/subtitle — the hero made sense when every page was
      an isolated screen but wasted the sidebar layout's width and read
      as inconsistent once a persistent nav is always on screen.
    - **Routing changed**: `/` is now Home, not Start/Sit — Start/Sit
      moved to `/start-sit`. This is the one real breaking change in
      this item (old bookmarks/links to `/` now land on Home, not a
      redirect); no other route moved. Verified via a real `next build`
      that both routes generate correctly as separate static pages.
    - **Home page** (`src/app/page.tsx`) is a real navigational hub, not
      a data dashboard — deliberately, given this project's own
      standing "no dummy/placeholder data" rule (see Things to Avoid).
      The mockup's illustrative widgets (a pre-filled "quick compare,"
      a fake "latest trade verdict," hardcoded accuracy numbers) don't
      have an honest real-data source without either a slow live fetch
      on every page load (backtest accuracy) or a persistence layer
      this app doesn't have (a "latest trade," since trades aren't
      saved anywhere) — so Home shipped as 4 real tool-launch cards
      (real copy, real links, no numbers) plus one genuinely live
      widget: recent Start/Sit comparisons (see below), which needed no
      fake data to populate because it's real session history.
    - **New `useRecentComparisons.ts`** (localStorage, no backend —
      same "no persistence" scope as `useRosteredPlayers.ts`/
      `useScoringFormat.ts`) records up to 5 real Start/Sit results the
      user has actually run this browser. `StartSitTool.tsx` writes to
      it after every successful `/api/compare` call; a new
      `StartSitRail.tsx` (`RecentComparisonsPanel`, exported for reuse)
      renders it both on the Start/Sit page and, via a thin client
      wrapper (`RecentComparisonsHomeCard.tsx`, needed so the Home page
      itself can stay a server component), on Home.
    - **Start/Sit's content got the fuller redesign** the mockup showed
      (the other three tools' internal content is deliberately
      untouched this pass — just re-homed under the new shell/header,
      per the same "port everything to the shell, redesign what was
      actually mocked up" scoping this item's own mockup conversation
      already set expectations for). `StartSitTool.tsx` now lays out as
      a 2-column grid: search panel + `ComparisonResult.tsx` (itself
      unchanged — its existing squircle-card styling already matched
      the dashboard treatment closely, see the earlier Apple-inspired
      redesign) on the left, `StartSitRail.tsx` on the right. The rail's
      other panel, **matchup context**, is built entirely from data the
      API response already carries (`PlayerScoreBreakdown.matchupContext`,
      already populated for skill positions) — no new fetch, and it
      degrades to nothing for D/ST/K (which don't have this field) the
      same way the rest of the app treats fields those positions lack.
    - **New `--surface-sunken` design token** added to `globals.css`
      (light `#f4f6fa` / dark `#0c111a`) for the slightly-recessed
      panel backgrounds (player chips, etc.) the new layout needed — a
      real, permanent addition to the token system alongside
      `--surface`, not a one-off inline color.
    - **Verified live end-to-end, not just `tsc`/lint**: a real
      Bijan Robinson vs. Jonathan Taylor comparison on the redesigned
      `/start-sit` rendered the real headline, real "Why" reasoning,
      real player-card stats, a real matchup-context rail (correctly
      labeling one matchup "roughly average" and the other "tough
      matchup" from the actual `diffFromAverage` sign), and the real
      comparison appearing in "Recent comparisons" immediately after.
      Confirmed Home, Trade Analyzer, Waivers, and Backtest all render
      correctly under the new shell with zero console errors, in both
      light and dark mode (sidebar staying dark in both, main content
      switching), and at mobile width (sidebar collapsing to a
      horizontal bar, cards stacking single-column). `next build`
      clean; `npx tsc --noEmit -p .` and `npm run lint` both clean.

65. **Added a "Projection accuracy" mode to the Backtest page — a
    fundamentally different question from every other backtest number in
    this document.** Every existing backtest grades PAIRWISE PICK
    accuracy (given two players, did the engine recommend whoever
    actually scored more) — that's a ranking question, and a model can
    answer it correctly while still being wildly wrong about EACH
    player's actual point total, since only the relative order matters.
    This item asks the other question directly, on explicit request:
    how close does the engine's own `finalScore` come to real points
    scored? Deliberately scoped simple, per that same request: 2025
    season only (the primary, tuned SportsDataIO pipeline), PPR only,
    skill positions only (QB/RB/WR/TE — D/ST/K deferred, see Open Items).
    - **Key architectural insight, not a new signal**: `finalScore` was
      already denominated in fantasy points the whole time — it's built
      entirely from point-denominated terms (`blendedScore` is a
      recent/season PPR-point blend; every modifier stacked on top,
      `matchupModifier`/`volumeModifier`/etc., is itself an "expected
      points from X" term). It had just never been *graded* as a point
      estimate before, only ever compared relatively within a pair. That
      means testing this needed no new scoring logic, only a new grading
      layer on top of the existing, unmodified `scorePlayer`.
    - **New population, reused rather than rebuilt**: extracted
      `buildRankedPoolForWeek` out of `pairing.ts`'s existing
      `buildPairsForWeek` (a pure refactor — `buildPairsForWeek` now
      just pairs that same ranked list adjacent, no behavior change) so
      this tests the identical "realistic startable pool"
      (`BROAD_MODE_POOL_SIZE`) every pick-accuracy backtest already
      uses, rather than the full player universe — projecting a
      replacement-level bench player's points is a noisier, less
      meaningful test, the same reasoning that motivated the pool cap
      in the first place (items 6-13).
    - **New `projectionGrading.ts`** (`ProjectionGradeResult`/
      `summarizeProjectionErrors`) computes MAE (mean absolute error —
      the headline "how many points off, on average" number), RMSE
      (penalizes big individual misses more than MAE), and bias (mean
      *signed* error — positive means the model systematically
      over-projects, negative means it under-projects) — mirrors
      `grading.ts`'s summarizer discipline (one reusable pure function,
      not duplicated per call site) but for continuous error instead of
      correct/incorrect/push/no_pick, since this is a magnitude
      question, not a binary one.
    - **New `runProjectionBacktest.ts`** walks every week/position,
      grades every pool member's `finalScore` against their real actual
      points that week, AND grades a naive "season-to-date average"
      baseline the identical way on the identical player-weeks (free to
      compute, since that average is already the pool's own ranking
      basis) — so the engine's projection has a naive number to beat,
      the same "never report an accuracy number without a naive
      baseline" discipline this whole document has followed since item
      2. New route `/api/backtest/projection`; new `Mode` on
      `BacktestTool.tsx` ("Projection accuracy," season toggle hidden
      and forced to 2025 for this mode, position checkboxes reused with
      no D/ST/K entries); new `ProjectionSummaryView` component
      mirroring `BacktestSummaryView`'s plain banner-row layout rather
      than introducing a new visual language.
    - **Real result, full 2025 season (weeks 1-18), PPR, n=1224
      pool-member-weeks**:

      | | engine `finalScore` | naive season-avg baseline |
      |---|---|---|
      | Overall | MAE 6.8, RMSE 8.8, bias -0.6 | MAE 6.9, RMSE 8.6, bias +1.9 |
      | QB (n=204) | MAE 8.0, RMSE 10.3, bias -1.8 | MAE 7.4, RMSE 9.4, bias +3.1 |
      | RB (n=408) | MAE 6.7, RMSE 8.5, bias +0.2 | MAE 6.6, RMSE 8.5, bias +0.9 |
      | WR (n=408) | MAE 7.0, RMSE 9.0, bias -0.6 | MAE 7.2, RMSE 8.7, bias +2.5 |
      | TE (n=204) | MAE 5.5, RMSE 7.5, bias -1.0 | MAE 6.0, RMSE 7.7, bias +1.4 |

    - **Honest read of this table — a mixed result on raw error, but a
      clear and consistent one on bias.** MAE is close between the two
      everywhere (the engine wins overall and at WR/TE, the baseline
      wins narrowly at QB/RB) — the engine's dozen blended signals don't
      buy a dramatically smaller average miss than just "how many points
      has this player been averaging." **Bias tells a real, different
      story**: the naive baseline is *systematically optimistic* at
      every position (+0.2 to +3.1, worst at QB), while the engine's
      bias sits near zero or mildly negative everywhere (-1.8 to +0.2).
      Best-guess explanation, not confirmed further: a player's
      inclusion in this ranked pool is itself conditioned on a strong
      season average, so using that same average to predict the *next*
      week is partly predicting on the noise that got them into the
      pool in the first place (a regression-to-the-mean effect) — the
      engine's recent-form/matchup blend pulls the estimate back down
      from that optimism, at the real cost of sometimes overcorrecting
      (QB's -1.8 bias is the single largest miss in either direction on
      this table).
    - **This is a genuinely new kind of finding for this document** —
      every prior item asked "does the engine pick the right player,"
      and this is the first evidence on "does the engine's own number
      mean anything as a point estimate." The answer is a qualified yes:
      not dramatically more accurate in raw MAE than the simplest
      possible baseline, but meaningfully better-calibrated (less
      systematically biased), which is exactly the kind of thing pick
      accuracy alone could never have surfaced, since two well-ranked
      but badly-calibrated numbers still produce a correct pick.
    - **Verified live, not just via the API response**: ran the real
      `/backtest` page end-to-end (mode → position checkboxes → real
      fetch → rendered banners) and got the exact numbers in the table
      above; confirmed the season toggle correctly hides for this mode,
      zero console errors, `npx tsc --noEmit -p .` and `npm run lint`
      both clean.
    - **Added a per-player breakdown immediately after, on direct
      follow-up request** ("I want to see if for individual players
      too") — the position-level table above pools every player-week
      together, which can hide real variance: a model could be
      well-calibrated on average while being consistently wrong about
      specific players. `runProjectionBacktest.ts` already computed
      every individual `ProjectionGradeResult`; this just groups them by
      `playerId` before pooling (a genuine "was this data already
      there" reuse, not new scoring or fetching) into a new
      `PlayerProjectionSummary[]`, sorted worst-MAE-first so the biggest
      misses are the first thing visible rather than buried in an
      average. New `ProjectionPlayerTable.tsx` (mirrors
      `BacktestWeekTable.tsx`'s plain `overflow-x-auto` table styling).
    - **Real result confirms the expected shape, not a surprise**: the
      worst-MAE players are overwhelmingly `n=1`-`2` small-sample
      outliers (e.g. a QB who played a single partial game) — exactly
      what you'd expect, since a single bad week dominates a mean with
      no other games to average against. But a handful of well-sampled
      players (`n=12-16`, nearly a full season) also show real, sizable
      misses — Matthew Stafford (n=12, MAE 18.2) stood out enough to be
      worth a dedicated look if this gets picked up again: MAE, RMSE,
      and `|bias|` were nearly identical for him, which by the power-mean
      inequality (RMSE ≥ MAE, with equality only when every error has
      the same magnitude) implies unusually *consistent* same-direction
      misses across his 12 games, not just a large average one — flagged
      here as an observation, not confirmed further (see Open Items).
    - **Added player search with a week-by-week table, on direct
      follow-up request** ("I want to be able to search for a player...
      see projected points, actual points and the difference") — the
      per-player breakdown above still pools across weeks into one MAE
      number; this shows the actual week-by-week detail behind it for
      whichever specific player(s) the user searches, the same way
      Single Pair mode already lets a user search specific players
      rather than only ever seeing the broad-mode pool.
      New `playerProjectionLookup.ts`
      (`runPlayerProjectionLookup`) is a genuinely separate function
      from `runProjectionBacktest.ts`, not a thin wrapper around it —
      deliberately NOT restricted to the "realistic startable pool"
      (`buildRankedPoolForWeek`) the aggregate uses, since a user
      searching for one player wants that exact player's history
      regardless of whether they'd have ranked inside the pool every
      week. This means the same player's numbers can legitimately
      *differ* between the two views — confirmed live: Stafford's
      pool-restricted `byPlayer` entry (n=12, MAE 18.2) only counts the
      12 weeks he ranked inside the top-12 QB pool, while the
      unrestricted lookup (n=16) grades all 16 weeks he played, and
      lands on a materially different MAE (20.5) — a real, honest
      difference in what's being measured, not a bug, but one worth
      being aware of if comparing the two tables side by side.
      `/api/backtest/projection` gained an optional `ids` param
      (comma-separated player IDs); `positions` and `ids` are
      independent and either can be empty — the route distinguishes "no
      `positions` param" (every other caller's existing "give me all
      skill positions" default) from "empty `positions` param" (this
      route's own "the user wants a player-only lookup, run zero pool
      positions" case) by checking the raw query value before deciding
      whether to invoke `parsePositionsParam` at all, rather than
      changing that shared function's default behavior for every other
      caller. New `ProjectionPlayerDetailView`/`ProjectionPlayerDetail.tsx`
      renders Week/Projected/Actual/Diff per searched player, reusing
      the "Look up specific players" chip-list + `PlayerSearchInput`
      pattern Single Pair mode already established (capped at 4 players,
      mirroring Start/Sit's `MAX_PLAYERS`).
    - **The week-by-week detail surfaced a second, sharper version of
      the Stafford finding**: not just "similar-magnitude misses" but
      literally the *same-signed* miss in all 16 graded weeks — the
      model under-projected him every single week, no exceptions. It
      also surfaced something else worth flagging honestly: several of
      his early-season `predicted` values are *negative*
      (e.g. week 2: -3.5, week 6: -13.6) — `finalScore` has no floor at
      zero, so a real QB's projection going negative is possible today
      given enough stacked negative modifiers, which reads as
      implausible on its face (a real NFL starter's fantasy floor isn't
      meaningfully negative) even though it isn't new behavior this
      item introduced — `scorePlayer` has always been able to produce
      this, it just was never visible at this granularity before. Not
      investigated or fixed here — flagged in Open Items.
    - **Verified live end-to-end**: a real Matthew Stafford lookup
      (weeks 1-18, no positions checked) rendered the exact week-by-week
      table above via the real UI, confirmed a combined request
      (positions AND `ids` both set) returns both sections' data
      correctly via a direct API check, zero console errors, `npx tsc
      --noEmit -p .` and `npm run lint` both clean.
    - **Deliberately out of scope for this pass** (see Open Items):
      D/ST and K (would need `scoreExtendedPlayerBacktest` instead of
      `scorePlayer` directly, plus D/ST's own synthetic-row actual-score
      lookup — both already exist from items 62-63, just not wired into
      this new grading path), Half-PPR/Standard formats, the 2022-2024
      nflverse-only seasons, and any correlation/R² statistic beyond
      MAE/RMSE/bias.

66. **Root-caused and fixed the Stafford/QB calibration bug item 65
    surfaced — a real, systemic miscalibration, not a Stafford-specific
    anomaly.** Root cause: `qbRushEpaModifier`
    (`QB_RUSH_EPA_BLEND_WEIGHT`/`POINTS_PER_QB_RUSH_EPA`, item 41)
    blends the player's ENTIRE running score toward
    `qbRushEpaAvg * 45.814`, and `qbRushEpaAvg` is an unweighted mean of
    per-GAME EPA-per-rush rates — each computed over however many rush
    attempts that QB happened to have that week, often just 1-4 for a
    low-mobility passer. `POINTS_PER_QB_RUSH_EPA`'s huge multiplier
    (45.814) was derived from a population-level average that sits very
    close to zero, so any individual player's small-sample rate — even a
    modest one — gets blown up into an absurd "expected points" figure,
    with no cap to bound it (unlike `matchupModifier`'s ±2.5 cap).
    Confirmed via real 2025 play-by-play data this isn't a kneel-counting
    bug specifically (Stafford's kneel EPA ≈ -0.93, non-kneel scramble
    EPA ≈ -0.94, nearly identical) — it's that a genuinely low-mobility
    passer's rare rush attempts are almost always low-value situations
    (broken pockets, kneels, desperate scrambles), so the rate comes back
    negative nearly every week with nothing to offset it. Pulled
    Stafford's real week-by-week breakdown: `qbRushEpaModifier` was
    negative in all 17 of his graded weeks, ranging -2.4 to **-31.2**
    points in a single week. Cross-checked against Joe Burrow (another
    pocket passer, same negative pattern, less extreme) and Lamar Jackson
    (real dual-threat: `qbRushEpaAvg` mostly small and *positive*,
    modifiers a sane single digits to low-teens) — confirms this is a
    position-wide bias against low-mobility QBs, not one player's data
    glitch. Never caught by any pick-accuracy backtest because two
    pocket passers being compared both get a similarly-shaped penalty,
    so relative ranking survives even though the absolute numbers are
    nonsense — exactly item 65's own "ranking vs. calibration" insight,
    playing out concretely.
    - **Found the fix empirically, not by guessing** — built a temporary
      diagnostic route (`/api/debug-qb-rush-epa`, deleted after recording
      these numbers, same precedent as every other one-off analysis in
      this document) that recomputed every 2025 QB pool-week's projection
      under a grid of candidate fixes — capping the modifier at various
      thresholds, gating it below a minimum rush-attempt count, scaling
      the blend weight down, and disabling it outright — and graded each
      against real MAE/RMSE/bias. **Disabling the term entirely won
      clearly on bias** (baseline -1.81 → +0.01, i.e. from a real,
      systematic under-projection to essentially perfectly calibrated)
      while landing within ~0.1 MAE point of every other candidate's
      best result (baseline MAE 7.96 → 6.93; the single best MAE found
      anywhere in the grid, jointly scaling down `QB_RUSH_BLEND_WEIGHT`
      too, only reached 6.79 — a difference judged not worth reopening
      that separately-negotiated weight, per item 30's own cross-season
      tradeoff, for a ~0.14-point MAE gain). Verified the sanity
      relationship (`finalScore = runningScoreBeforeEpa +
      qbRushEpaModifier` exactly, since every other QB modifier
      downstream of it is currently zero-weighted) held for all 204 rows
      before trusting the sweep.
    - **Shipped: `QB_RUSH_EPA_BLEND_WEIGHT` reverted from 0.2 to 0** —
      same "disabled but not deleted" precedent as every other
      zeroed-out signal in this file (`POINTS_PER_QB_RUSH_EPA` itself is
      untouched). This is a real reversal of item 41's original ship
      decision, made with the benefit of a metric (point calibration)
      item 41 didn't have access to at the time.
    - **Verified against the real engine, not just the sweep harness**:
      re-ran Projection accuracy mode for QB and got an exact match to
      the sweep's prediction (MAE 6.93, bias +0.01, n=204) — and the
      engine now clearly beats the naive season-average baseline on both
      metrics (baseline MAE 7.45, bias +3.13), which it did not before.
      Re-ran Stafford's own week-by-week player lookup: no more negative
      projected-point weeks, and the diffs are now a mix of over/under
      rather than under-projecting all 16 graded weeks — the original
      reported symptom is gone.
    - **This also reopens item 41's own documented pick-accuracy
      tradeoff, in reverse — flagged honestly, not glossed over.**
      Re-ran both pick-accuracy backtests after the change: primary 2025
      pipeline QB 56.9%→52.9% (whole-model 57.5%→56.9%); pooled
      2022-2025 nflverse-only QB 57.8%→57.1% pooled, with 2024
      specifically *improving* 52.0%→55.9% (recovering the exact decline
      item 41 originally accepted as that ship's tradeoff) while
      2023/2025(nflverse) give back a few points each. Net effect is a
      modest pick-accuracy cost, the mirror image of item 41's original
      modest gain — a real, known tradeoff, not a free fix, made on the
      explicit instruction to optimize for projection calibration over
      pick accuracy for this specific term.
    - **Deliberately did not touch `QB_RUSH_BLEND_WEIGHT`** (item 30's
      separately-negotiated cross-season tradeoff, still at 0.3) — the
      sweep showed it contributes a much smaller, less systematically
      biased miscalibration than the EPA term, and jointly re-tuning it
      wasn't worth reopening a different weight's own tradeoff history
      for a marginal MAE gain (see above).

67. **Two follow-up fixes to the "Projection accuracy" feature, both from
    direct user feedback after trying item 66's fix live: a real display
    bug, and a genuinely new capability (prior-season fallback for
    week 1) — plus a cross-position calibration investigation that
    deliberately did NOT ship anything further.**
    - **Fixed a real display bug in the per-player week-by-week
      lookup**: `ProjectionPlayerDetail.tsx`'s "Actual" column already
      correctly showed "Bye/DNP" for weeks with no played row, but the
      "Projected" column right next to it still showed a computed
      number — `playerProjectionLookup.ts` set `predicted =
      breakdown.finalScore` unconditionally, since `scorePlayer()` has
      no notion of "there's no game this week" and will happily project
      a bye week from recent form. Fixed by gating `predicted` on
      `weekRow` the same way `actual` already was. **Doesn't change any
      MAE/RMSE/bias number** — those already require both `predicted`
      and `actual` to be non-null, and `actual` was already null on
      these weeks, so they were already excluded from grading. Purely a
      display-honesty fix. Verified live: Matthew Stafford's week 8 bye
      now shows "—" in Projected instead of a number next to "Bye/DNP".
    - **Investigated whether other positions have the same kind of
      systematic miscalibration item 66 found for QB** — built a
      temporary diagnostic (`/api/debug-position-calibration`, deleted
      after recording numbers, same precedent as every other one-off
      analysis in this document) that zeroed out each position-specific
      modifier independently against the full 2025 pool and measured the
      resulting MAE/RMSE/bias, the same methodology as item 66's QB
      sweep. **Post-item-66 baseline**: QB bias +0.01 (fixed), RB +0.21,
      WR -0.57, TE -1.04 — TE is now clearly the worst-calibrated
      position, RB's MAE is barely better than the naive baseline at all
      though its bias is small.
      - **TE's `snapShareModifier` is a real, sizeable drag** (~-1.75pts
        average contribution — removing it flips bias from -1.04 to
        +0.71) — but swept against `SNAP_SHARE_BLEND_WEIGHT_TE`, this is
        a genuine MAE-vs-bias TRADEOFF, not a clean win like QB's EPA
        term was: MAE keeps improving as the weight scales UP past its
        current value (1.25x scale: MAE 5.45 vs. current 5.53) even as
        bias gets worse (-1.48), while scaling DOWN toward zero-bias
        (~0.4-0.5x scale) costs real MAE (5.76-5.92 vs. 5.53). Unlike
        `QB_RUSH_EPA_BLEND_WEIGHT`, `SNAP_SHARE_BLEND_WEIGHT_TE=0.4` is a
        carefully cross-season-validated PICK-ACCURACY weight (item 43's
        documented 4-season pooled peak, 57.5%) — touching it for a
        modest, tradeoff-y calibration gain on a single season's small
        TE sample (n=204, this project's chronic noisiest position) risks
        giving up real, hard-won validated accuracy for an ambiguous
        gain. **Not touched — flagged as a genuine judgment call, not
        resolved unilaterally**, same precedent as items 30/33/41/44.
      - **WR's `dropRateModifier` looked like a cleaner win at first** —
        scaling it to ~0.5x its current weight improved BOTH MAE
        (7.05→6.93) and bias (-0.57→+0.23) in the calibration sweep.
        Tested it for real before shipping (same due diligence as item
        66): set `DROP_RATE_BLEND_WEIGHT=0.1` and re-ran the real broad
        pick-accuracy backtest. **Real, non-trivial cost on the primary
        2025 pipeline**: WR accuracy 58.3%→55.9% (-2.45pp) — the pooled
        4-season number barely moved (54.31%→54.06%) because 2024/2025
        (nflverse) improved while 2022/2023 declined, but the PRIMARY
        pipeline (the one both live tools actually run on) took a real
        hit. **Reverted** — same "the primary-pipeline check is not
        optional for anything touching a whole position's weight"
        discipline item 53 established for the ensemble ratio. Both
        findings are flagged here as open, unresolved judgment calls
        (see Open Items) rather than silently dropped.
    - **Built a real prior-season fallback for the "zero games at all
      this season" case** (week 1 most commonly, but also a rookie
      call-up or a player back from a long absence) — the literal gap
      the user asked about ("why can't you project week one"). Confirmed
      first that this is a BACKTEST-specific structural gap, not really
      a live-tool one: the live tool's `SeasonContext`
      (`getSeasonContext()`) naturally keeps pointing at the prior
      season's fully-completed data until the new season's own week 1
      actually finishes, so by the time `recentWeeks` ever includes a
      new-season week, that week's game (and thus its stat row) already
      exists — the live tool only hits true "zero games" for a player
      who's specifically missed everything so far this season (rookie
      debut, long injury return), not for the tool/calendar itself.
      Backtest mode has no such fallback at all, since
      `loadBacktestRunData` only ever loads the single season under
      test — week 1 of that season genuinely has nothing before it.
      - **New `nflverse/priorSeasonAverage.ts`**
        (`getPriorSeasonPprAveragesByNormalizedName`) — full prior-season
        per-game scoring average by normalized player name, reading
        nflverse's `stats_player` release (SportsDataIO has no accessible
        season before the current one on this plan — see Data Source
        Notes) and reusing `getFantasyPoints()`/`normalizePlayerName()`
        rather than a new computation or join scheme. Degrades to an
        empty map on fetch failure, same "optional signal, fail open"
        discipline as every other nflverse source in this app.
      - **New `PlayerComparisonInput.priorSeasonPprAvg` field**, and a
        third `else if` branch in `scorePlayer`'s existing recent/season
        blendedScore fallback chain (`engine.ts`) — fires ONLY when both
        `recentPprAvg` and `seasonPprAvg` are null, i.e. strictly the
        "nothing at all this season" case; never blended against real
        current-season data, and every downstream modifier
        (matchup/volume/etc.) still applies normally on top of it.
        Deliberately the narrowest possible fix — extending this into a
        blended component for weeks 2-4 (thin-but-nonzero samples) would
        touch the already-validated `RECENT_WEIGHT` formula and need its
        own real backtest sweep, out of scope for "why can't you project
        week 1" specifically. A useful, unplanned side effect: since this
        downgrades `dataQuality` from "insufficient" (no projection at
        all) to "limited" (a real projection, just thin), a live-mode
        week-1 comparison using this fallback automatically gets the
        already-existing, already-validated "though we have limited
        recent data" framing (item 23) for free — no new confidence
        mechanism needed.
      - **Threading was deliberately selective, not blanket** — added as
        an optional parameter (default empty map) on both
        `buildBacktestComparisonInput` and `buildComparisonInput`, so
        every existing call site keeps working unchanged unless
        explicitly wired. Wired into `playerProjectionLookup.ts` (the
        actual reported gap — this function walks every requested week
        directly, no pool filter). **Deliberately NOT wired into
        `runProjectionBacktest.ts`** — checked first and found
        `buildRankedPoolForWeek` already requires
        `seasonToDate.Played > 0` for pool eligibility, which
        structurally excludes week 1 from that function's pooled/
        by-position grading regardless (confirmed: QB's n=204 was
        already exactly 17 weeks × 12 pool size, not 18) — wiring it in
        there would have been a real fetch cost for zero behavioral
        effect, so it was left out rather than added as dead plumbing.
        **Also deliberately NOT wired into the live tool's three routes**
        (compare/trade/waivers, via `scoreExtendedPlayer`) in this pass —
        `buildComparisonInput`'s new parameter exists and defaults safely
        to a no-op, so this is cheap to wire in later, but doing it live
        needs its own fetch-and-thread work across three route files that
        wasn't part of what was asked this round. See Open Items.
      - **Verified live end-to-end**: re-ran Matthew Stafford's real
        week-by-week lookup — week 1 now shows a real projection (13.4
        vs. actual 13.6, nearly exact) instead of "—", `n` correctly grew
        from 16 to 17 graded weeks, MAE/bias shifted accordingly (8.6→8.1
        MAE, -6.7→-6.4 bias — a small improvement, not the main point of
        this fix, which was making week 1 show *something honest* rather
        than nothing). Confirmed via the real UI, zero console errors.
        `npx tsc --noEmit -p .` and `npm run lint` both clean.

68. **Tested whether a separately-fit, MAE-minimizing regression (using
    the same already-validated raw signals `finalScore` already reads,
    but its own jointly-fit weights instead of the ranking-tuned blend)
    would out-calibrate `finalScore` directly — a direct follow-up to
    items 65/66/67's calibration work, on explicit request. Closed as a
    documented negative finding: no code shipped.**
    - **Design, deliberately mirroring items 38/42's methodology** (the
      project's own prior "jointly-fit model vs. hand-tuned weights"
      investigation, just for pick accuracy rather than calibration): one
      linear model per position, fit via subgradient descent minimizing
      mean absolute error (L1 loss, not OLS's squared error — a genuine
      MAE-direct fit, per the explicit request) plus an L2 penalty on
      weights, on standardized features. Features were `blendedScore`,
      `matchupDiffRatio` (unclamped, unlike `matchupModifier`), and
      `recentVolumeAvg` for every position, plus each position's own
      already-computed raw signals regardless of their current `config.ts`
      weight (QB: `recentQbRushAttemptsAvg`/`qbRushEpaAvg`/
      `successRateAvg`/`goalLineTouchesAvg`; RB: `redZoneTouchesAvg`/
      `epaPerPlayAvg`; WR/TE: `targetShare`/`separation`, plus
      `dropRateAvg` for WR or `snapShareAvg` for TE) — `scorePlayer`
      already computes every one of these regardless of whether its blend
      weight is active, so no new data collection was needed beyond the
      already-built pooled 2022-2025 nflverse-only pipeline (item 39).
      Missing values mean-imputed (a minor, documented simplification —
      the impute value is computed once over the full pooled sample
      rather than per-fold, a small, low-impact leak relative to the
      real question being tested).
    - **Caught and fixed a real numerical-stability bug in the optimizer
      before trusting the sweep** — a fixed learning rate safe at
      `l2=0` diverged (NaN) at `l2≥100`, since the L2 penalty's gradient
      isn't averaged by `n` the way the MAE gradient is, so the effective
      step size at high `l2` needs a correspondingly smaller learning
      rate. Fixed by scaling `lr` down by `1/(1+l2)`; re-verified finite,
      stable results across the full `l2∈[0,500]` grid afterward.
    - **Validation matched item 42's rigor exactly, for the same reason**:
      in-sample (expected optimistic), 5-fold CV within the pooled
      sample, AND leave-one-season-out CV (train on 3 seasons, test on
      the 4th, repeated for each) — with the current engine's own
      `finalScore` re-evaluated on the IDENTICAL rows for a fair
      comparison, not quoted from elsewhere.
    - **Pooled/LOSO numbers looked promising for two positions at first
      glance** — RB improved MAE by a real, consistent ~3% (6.66→6.44,
      LOSO) at low L2, and WR improved BOTH MAE (7.17→6.97, LOSO) and
      bias (-0.83→-0.23) at a moderate L2 (~20-100) — but neither held up
      once decomposed by season, which is the whole reason this document
      insists on that decomposition rather than trusting a pooled number.
    - **The real finding: bias improvements at the pooled/LOSO level were
      substantially an artifact of season-to-season SIGN CANCELLATION,
      not genuine per-season calibration.** For every position tested,
      the current hand-tuned engine's own per-season bias is consistently
      one sign across all four seasons (RB: consistently positive, +0.13
      to +1.19; WR: consistently negative, -0.38 to -1.60; TE:
      consistently negative, -0.45 to -1.04) — imperfect, but predictable.
      The regression's per-season bias, in contrast, FLIPS sign as a
      direct function of L2 (e.g. WR at l2=20: 2022 -0.20, 2023 -0.85,
      2024 -0.85, but **2025 +0.95** — a real, meaningfully-sized flip in
      the one season that's actually decision-relevant right now). The
      pooled/LOSO bias number looks like it's approaching zero as L2
      increases, but that's positive-in-one-season canceling
      negative-in-others, not uniform improvement — exactly the kind of
      illusion a pooled metric can hide and a by-season breakdown
      exposes, the same lesson items 34/39's goal-line-rushing and
      high-wind-WR re-tests already taught this document once before, now
      showing up in a completely different kind of model.
    - **RB's MAE win, unlike its bias story, WAS genuinely consistent
      across all four seasons** at `l2=0` (each season individually
      beats the corresponding engine-baseline season) — the honest
      finding there isn't "illusory," it's a real, uniform MAE gain
      traded against a real, uniform-direction bias cost (negative and
      larger than the engine's own small positive bias) — a genuine,
      unresolved tradeoff, not a false pooled number.
    - **TE never beat the engine on MAE at any L2 that also helped
      bias** — the one position where the regression showed no
      redeeming case at all.
    - **Verdict: not shipped, for any position.** QB shows no
      meaningful difference either way (item 66 already fixed its real
      calibration problem). RB is a genuine but unresolved MAE-vs-bias
      tradeoff. WR's apparent win doesn't survive the by-season
      decomposition specifically in 2025. TE shows no case for it at
      all. This reinforces, rather than reverses, items 38/42's original
      conclusion — the conservative, plateau-seeking, cross-season-
      validated hand-tuning process this document has used throughout
      continues to behave more predictably than a jointly-fit
      alternative at this data scale, now confirmed for a genuinely
      different modeling task (continuous MAE regression, not pairwise
      classification) than items 38/42 tested. Temporary diagnostic route
      (`/api/debug-projection-regression`) deleted after recording these
      numbers, same precedent as every other one-off analysis in this
      document — this write-up is the only lasting artifact.

69. **Shipped a real, permanent standalone baseline for FantasyPros'
    weekly expert-consensus rankings (`pickByExpertConsensus`) — a
    genuinely new KIND of signal for this document (human/market-
    informed, not derived from box scores or play-by-play), and one of
    the strongest, most consistent standalone signals found in this
    entire investigation.**
    - **Corrected item 55's own prior "dropped" conclusion, on direct
      follow-up ("what if we take into account expert projections?").**
      Item 55 checked `dynastyprocess/data`'s `db_fpecr.csv.gz` release
      file and correctly found it had stopped receiving weekly (`wp`-type)
      rows around August 2025 — but that repo has a SECOND, separate file
      (`files/fp_latest_weekly.csv`) that item 55 never discovered, driven
      by a different, still-actively-running "Daily FP scrape" workflow.
      Confirmed live: real commits at a roughly-daily cadence covering
      2022 through the 2025 season's finale (and further back — verified
      history exists to December 2021). The file itself only ever holds
      the SINGLE most recent snapshot (each daily commit overwrites it),
      so a past week's rankings only exist by fetching the file's content
      at whichever commit was current just before that week's games
      started — git history as a de facto, if unintentional, time-series
      archive.
    - **Two rounds of standalone validation before touching any real
      code**, matching this document's standing discipline: a small
      8-week spot-check first (confirmed the git-history-mining approach
      actually works, confirmed real player-name matching via a ~99%
      real match rate once genuinely-injured/inactive players are
      excluded — e.g. CeeDee Lamb's 2025 weeks 3-6 miss was confirmed as
      a real absence, not a join bug), then a full pooled 2022-2025
      standalone script (18 weeks × 4 seasons, ~19,900 matched
      player-weeks) checking two separable questions: does
      `r2p_pts` (dynastyprocess's own rank-to-points conversion — not
      officially documented, best-effort interpreted from the column
      name and behavior) calibrate well as a point estimate, and does
      the rank ORDER itself predict pairwise outcomes. The standalone
      script's own ad hoc pairing (adjacent by FantasyPros' OWN rank
      order) found calibration real and consistent (r2p_pts MAE beat the
      engine's on QB/RB/WR, tied on TE, no season sign-flips — unlike
      item 68's regression) but pick accuracy only real for TE (56.7%
      pooled, every season above chance) — QB/RB looked like pure chance,
      WR mixed.
    - **The REAL harness result, once actually wired in, was
      substantially stronger than the standalone script suggested** —
      because the standalone script's pairing (adjacent by FantasyPros'
      OWN rank) tests a different, harder question than this project's
      standard methodology (adjacent by OUR OWN season-to-date rank,
      exactly how every other baseline/signal in this document is
      tested). Once graded through the real `buildAllPairsForWeek`
      pairing and the real multi-season harness: **QB 57.4%, RB 59.3%,
      WR 60.3%, TE 57.7% pooled — all four positions clear 57%, one of
      the strongest and most consistent results in this entire
      document's history.** By-season breakdown (the item 68 lesson,
      applied here too): RB is the standout for consistency (58.3-60.9%
      every single season, tightest range of any position tested in this
      whole document); WR is strong every season (55.2-64.3%); QB is
      strong in 3 of 4 seasons but drops to exactly 50.0% in 2024 (a
      real, if modest, inconsistency); TE is positive every season but
      widest range (52.5-66.3%), consistent with TE's chronic noisiness
      throughout this document.
    - **New infrastructure — genuinely different in kind from every
      other data source in this app**: `src/lib/fantasypros/client.ts`
      (a small GitHub REST + raw-content client, NOT the nflverse-data
      release-asset shape every other external source here uses — this
      one needs the commits API to find historical snapshots, then
      raw.githubusercontent.com for content at a specific commit) and
      `weeklyConsensus.ts` (orchestrates: get the season's real week-start
      dates via a new `nflverse/schedules.ts` `getWeekStartDates` reader,
      find the latest commit strictly before each week's kickoff — a
      real, non-leaky historical fact, not a forecast — fetch that
      commit's snapshot, normalize names via the same `playerMatch.ts`
      join every other external source here uses). Two different cache
      TTLs, deliberately: the commit INDEX (24h, since new commits land
      roughly daily) vs. a specific commit's file CONTENT (30 days,
      since it's immutable by git's own design once committed).
      GitHub's unauthenticated REST API is rate-limited to 60 req/hour —
      the one call site that matters (`fetchCommitHistory`) fetches the
      WHOLE paginated history ONCE and matches dates locally afterward,
      rather than one API call per week, so a full 4-season backtest run
      costs a small, fixed number of these calls regardless of how many
      weeks/seasons it covers. Raw content fetches aren't subject to
      that same limit.
    - **Threaded through the nflverse-only pipeline exactly like
      `depthChartByPlayerIdWeek`/`teamWeatherByTeamWeek`** (item 39/46's
      precedent): a new optional `BacktestRunData.expertConsensusByPlayerIdWeek`
      field, resolved onto the pipeline's synthetic PlayerIDs at load
      time via `gameLog.playerIdByNormalizedName`, threaded through
      `sliceWeekData`/`BacktestWeekSlice`, absent/no-op on the primary
      SportsDataIO pipeline (verified live: 612/612 no_pick, zero crash).
      Fetched as its own sequential step in `loadRunNflverseOnly.ts`,
      AFTER the main batch — same "one heavy, many-request source at a
      time" discipline item 27 established for red-zone touches, since
      this one is a genuinely different shape of "heavy" (not one big
      file, but up to ~18 sequential per-week fetches plus a paginated
      commit lookup).
    - **Deliberately unscoped across all four positions for this first
      real-harness pass** (`pickByExpertConsensus` in `baselines.ts`) —
      same discovery-phase treatment wind/depthChart originally got
      (items 34→39, 37→46) before being scoped down to where they
      actually held up. Given how consistently strong all four positions
      came back here, there's a real case this one doesn't need scoping
      down at all — a genuine first in this document's history of
      position-scoped signals — but that's a decision for a follow-up
      pass, not assumed here.
    - **Not integrated into `finalScore` or engine.ts in this item** —
      shipped as a standalone baseline only, same status as
      `injuryStatus`/`wind`/`depthChart` before it, with the
      `finalScore` integration decision deliberately deferred to its own
      follow-up (item 70, immediately below) rather than bundled in
      here. The calibration angle (`r2p_pts` as an MAE-competitive point
      estimate — the original motivating question, "what if we take
      into account expert projections," was about projection accuracy
      specifically, not pick accuracy) was validated in the standalone
      script but still has no equivalent real-harness path — "Projection
      accuracy" mode only compares `finalScore` against one hardcoded
      naive baseline (item 65), not an arbitrary external one. Still a
      real, well-scoped follow-up — see Open Items.

70. **Integrated `pickByExpertConsensus`'s signal into `finalScore`
    itself, on direct follow-up request** — a genuine promotion (real
    weight sweep, real accuracy numbers, a real tradeoff put to the
    user) rather than "the standalone number looked good, ship it."
    - **The signal (`r2p_pts`) is already points-denominated**, unlike
      every other modifier in this file — no new `POINTS_PER_X`
      conversion factor needed, just a direct blend:
      `runningScore = (1-w)*priorRunningScore + w*r2pPts`, added last in
      the additive chain (after every other modifier, before the
      ensemble stage). Deliberately universal across all four positions
      rather than scoped down — mirrors how the standalone baseline
      itself needed no scoping (item 69).
    - **New `PlayerComparisonInput.expertConsensusR2pPts` field**
      (`types.ts`), populated in `buildBacktestComparisonInput` directly
      from `weekSlice.expertConsensusByPlayerIdWeek` (no new parameter
      needed — the data was already flowing into `BacktestWeekSlice` for
      the baseline). Always `null` in live mode (`buildInput.ts`) — no
      live "current snapshot" fetch path exists yet (see Open Items), so
      this integration is a structural no-op for the actual live tool
      regardless of the weight shipped, until that's built separately.
    - **Swept `EXPERT_CONSENSUS_BLEND_WEIGHT` 0-1.0 against the pooled
      2022-2025 nflverse-only pipeline first**: a real, well-behaved
      plateau across w=0.6-0.9 (58.0-58.2% overall, up from 56.4% at
      w=0), every season improving or flat when checked individually (no
      season dropping toward chance — the item 68 lesson, applied here
      too, and passed cleanly this time).
    - **Caught exactly the failure mode item 53 was written to catch,
      before shipping anything.** This modifier can touch a huge
      fraction of the WHOLE score (at w=1.0 it fully replaces the
      engine's own estimate with theirs) — item 53's ensemble
      investigation established that this class of signal needs a real
      check against the PRIMARY SportsDataIO pipeline, not just pooled
      nflverse-only validation, since a prior signal (WR's ensemble
      ratio) had looked great pooled and then reversed on the primary
      pipeline every time it was actually tested. `loadRun.ts` (the
      primary pipeline's loader) didn't fetch this signal at all before
      this item — extended it to do so, resolved via
      `buildSdioPlayerIdByNormalizedName` (the same join direction every
      other primary-pipeline nflverse signal uses, as opposed to the
      nflverse-only pipeline's synthetic-ID join), fetched as its own
      sequential step after the main batch (same item-27 discipline as
      `loadRunNflverseOnly.ts` already uses for this exact same source).
    - **The primary-pipeline check found a real, genuine split, not a
      clean confirmation or a clean rejection.** On the primary 2025
      pipeline specifically: QB improves enormously at every weight
      tested (+8.8 to +10.8pp), RB improves modestly and consistently,
      TE is flat throughout — but **WR is unchanged through w=0.5
      (58.3%, identical to baseline) and then declines as weight
      increases further** (57.4% at 0.7, 53.4% at 0.9). Pooled
      nflverse-only data wanted w=0.7-0.9; the primary pipeline's own WR
      number specifically wanted ≤0.5 — a real tradeoff between "more
      overall pooled gain" and "zero measured cost on the position that
      shows a cost at all," not a case where one weight is obviously
      correct.
    - **Put the tradeoff to the user rather than resolved unilaterally**
      (same precedent as items 30/33/41/44/53) — **shipped at
      `EXPERT_CONSENSUS_BLEND_WEIGHT = 0.5`**: primary-pipeline overall
      56.9%→58.7%, QB 52.9%→61.8%, RB 57.6%→58.6%, WR unchanged at
      58.3%, TE unchanged at 56.4% — nearly all of the achievable gain,
      zero measured downside on the one pipeline that actually matters
      for the live tool. **w=0.7 is documented, not deleted, as a
      real, deliberately-not-chosen alternative** (pooled nflverse-only
      58.2% vs w=0.5's 57.8%, at the cost of primary-pipeline WR
      accuracy) — see Open Items.
    - **Verified against the real engine after shipping**: re-ran the
      primary pipeline's own broad backtest and got an exact match to
      the sweep's recorded numbers (58.69% overall). Confirmed live mode
      is a true no-op regardless of this weight (a real `/api/compare`
      request shows `expertConsensusR2pPts: null`,
      `expertConsensusModifier: 0`, `finalScore` unaffected) — expected,
      since `buildInput.ts` never populates the field. `npx tsc --noEmit
      -p .` and `npm run lint` both clean.

71. **Gave "Projection accuracy" mode (item 65) a real, third comparison
    baseline: FantasyPros' own weekly consensus point estimate, alongside
    the engine and the existing naive season-average baseline** — the
    direct real-harness answer to the question that started items 68-70
    ("what if we take into account expert projections," asked about
    projection accuracy specifically). Previously only validated via a
    one-off standalone script (item 69); this is the permanent,
    real-harness version, matching the rigor every other number in this
    feature already has.
    - **`runProjectionBacktest.ts` grades a third series on the identical
      pool/weeks** — `r2p_pts` pulled from the same
      `weekSlice.expertConsensusByPlayerIdWeek` the `pickByExpertConsensus`
      baseline and the `finalScore` blend (item 70) already read, no new
      data plumbing needed. Deliberately its own `n`, not forced to match
      the engine/baseline counts: unlike the naive season-average
      baseline (guaranteed to exist for every pool member, since pool
      membership itself requires season-to-date data), FantasyPros'
      weekly snapshot doesn't rank every pool player every week — real
      coverage gaps, not a bug, same honesty discipline as every other
      partial-coverage signal in this app.
    - **Found and fixed the same missing-plumbing gap item 70 needed for
      the primary pipeline's pick-accuracy grading, but for THIS route**:
      `runProjectionBacktest.ts`'s own `sliceWeekData` call didn't pass
      `expertConsensusByPlayerIdWeek` through either (only
      `runBacktest.ts`'s two call sites had been updated) — fixed
      alongside this work, since the whole feature depends on it.
    - **Result, full 2025 season, all four positions (n=1224 engine/
      baseline, n=1203 expert-consensus — the coverage gap in practice)**:

      | | engine (w=0.5 blend) | naive baseline | FantasyPros alone |
      |---|---|---|---|
      | Overall | MAE 6.35, bias +0.31 | MAE 6.85, bias +1.90 | MAE 6.35, bias +0.91 |
      | QB | MAE 6.58, bias +0.98 | MAE 7.45, bias +3.13 | MAE 6.52, bias +2.00 |
      | RB | MAE 6.45, bias +0.35 | MAE 6.64, bias +0.91 | MAE 6.47, bias +0.55 |
      | WR | MAE 6.58, bias +0.34 | MAE 7.17, bias +2.52 | MAE 6.56, bias +1.16 |
      | TE | MAE 5.44, bias -0.51 | MAE 6.05, bias +1.43 | MAE 5.52, bias -0.00 |

    - **A clean, coherent story, not just a number to report**: the
      engine (already blended 50/50 with this same signal per item 70)
      lands at essentially the same raw MAE as FantasyPros' number used
      alone, but with meaningfully better bias in 3 of 4 positions
      (QB/RB/WR) — the blend keeps FantasyPros' accuracy while
      correcting some of its own-observed optimism (their bias is
      positive, i.e. they tend to over-project, at every position except
      TE). TE is the one honest exception: FantasyPros alone (bias
      -0.00) is actually better-calibrated there than the blended engine
      (bias -0.51) — flagged rather than glossed over, consistent with
      TE's history as this document's chronic noisiest position.
    - **UI**: `ProjectionSummaryView` (`ProjectionSummary.tsx`) gained a
      third section, same `ProjectionRow` banner pattern as the existing
      two — no new visual language introduced. Verified live: real
      numbers render correctly, matching the API exactly, zero console
      errors, both by-position rows present for all three comparisons.
      `npx tsc --noEmit -p .` and `npm run lint` both clean.
    - **Deliberately out of scope for this pass**: no per-player
      breakdown for the expert-consensus comparison (the existing
      `byPlayer` table is engine-only) — could be added later the same
      way if useful, but wasn't asked for here.

72. **Direct user report: "Matthew Stafford's 2025 projections are
    unacceptable, they don't make any sense and are way too far off from
    actuals." Investigated end to end — found one real bug (fixed), one
    architectural flaw shared with the already-fixed item 66 bug (tested
    a fix, found no clean win, reverted), and the real root cause of the
    remaining bias (identified precisely, not fixed — a genuine
    architectural question, not a bug, left as item 73's open item).**
    - **Bug #1, real and fixed: `playerProjectionLookup.ts` — the code
      behind "Look up specific players," the exact feature being looked
      at — never got the item 70/71 `expertConsensusByPlayerIdWeek`
      threading.** A THIRD `sliceWeekData` call site, missed when items
      70 (`runBacktest.ts`) and 71 (`runProjectionBacktest.ts`) each
      updated their own. It was silently showing stale, pre-integration
      numbers. Fixed by threading the same three trailing arguments
      through this call site too. Verified live: Stafford's own summary
      improved from MAE 8.10/bias -6.36 to MAE 7.40/bias -4.24 purely
      from this fix, before touching anything else.
    - **Bug #2, same architecture as item 66's already-fixed
      `qbRushEpaModifier` bug, but for `qbRushModifier` (the rushing-
      VOLUME term, not rushing-quality) — milder per-instance since real
      attempt counts aren't as noisy as a per-game EPA rate, but still
      real and systematic.** Pulled Stafford's full modifier breakdown:
      `qbRushModifier` was negative in 16 of his 17 graded weeks (-0.9 to
      -5.1 points) — blending a pocket passer's entire score toward
      "expected points from rush attempts alone" systematically
      penalizes him for not running, the identical mechanism as the EPA
      bug. Confirmed not Stafford-specific: Baker Mayfield showed the
      same pattern, `qbRushModifier` growing more negative as his own
      recent rush attempts declined week to week.
      - **Implemented and swept a minimum-attempts gate**
        (`QB_RUSH_MIN_ATTEMPTS_THRESHOLD` in `config.ts`, real
        production code, currently `0` = no-op) — below the threshold,
        `qbRushModifier` doesn't apply at all. Tested thresholds 1-3
        plus full disable against real pick accuracy (primary 2025 *and*
        pooled 2022-2025) and against Stafford's own calibration.
      - **No clean win found — a real, honest negative result, not a
        quiet success.** Pooled pick accuracy across thresholds
        (baseline 60.5%, 1.5→60.3%, 2.5→61.3%, 3→59.8%, disabled→60.1%)
        is a spike at 2.5 bracketed by WORSE values on both sides, not a
        plateau — exactly the "don't trust an isolated peak" pattern
        this document has repeatedly warned about elsewhere (items
        9/20/38), and QB's persistently small per-bucket samples make
        this particular kind of noise likely, not just possible.
        Calibration told a similar story: Stafford's bias improves as
        the threshold rises (-4.24 baseline → -3.06 at 2.5 → -3.01 at 3)
        but **plateaus around -3 even with the term fully disabled**
        (-2.93) — meaning `qbRushModifier` was a real contributor
        (~30% of his bias) but not the dominant one. Reverted
        `QB_RUSH_MIN_ATTEMPTS_THRESHOLD` to `0`; the gate mechanism and
        its doc comment are kept in `config.ts`/`engine.ts`, not
        deleted, same "disabled but not removed" precedent as every
        other rejected signal in this file, in case a future season's
        data makes the threshold curve less noisy.
    - **The real, dominant cause: `volumeModifier`, and it's not a bug —
      it's the core volume signal's own design, working exactly as
      built, hitting a genuine outlier.** Pulled Stafford's real 2025
      season totals directly from nflverse (350.4 PPR points ÷ 597 pass
      attempts): his own true conversion rate is **0.587 points/attempt**
      — about 15% above `POINTS_PER_VOLUME_UNIT.QB.ppr` (0.511), the
      POPULATION-average rate the engine blends every QB's score toward
      at `VOLUME_BLEND_WEIGHT=0.9`. For a QB whose real efficiency
      durably sits above the population average — exactly what a
      genuine breakout/elite-efficiency season looks like — blending 90%
      of the running score toward a population-average-implied value
      will always pull it down toward "typical QB" territory, regardless
      of how good that QB's season actually is. This is the same
      mechanism the entire volume signal was validated on (items 6-13:
      volume beats raw points as a predictor because points carry
      touchdown-variance noise) — for the population it's a real,
      extensively cross-season-validated win (`VOLUME_BLEND_WEIGHT=0.9`
      sits in a genuine four-season plateau, item 43); for an individual
      durable outlier, the same mechanism necessarily miscalibrates them.
      **Not touched** — `VOLUME_BLEND_WEIGHT` is one of the most
      validated weights in this entire engine, and a real fix here would
      need a structurally different mechanism (e.g. blending each
      player's own recent conversion rate alongside the population one),
      not a weight tweak — a real architectural change needing its own
      full validation, not something to build unilaterally. See item 73
      (Open Items) for the open question this leaves.
    - Temporary diagnostic route (`/api/debug-qb-rush-attempts`) used for
      the gating sweep deleted after recording these numbers, same
      precedent as every other one-off analysis in this document.

73. **Wired `EXPERT_CONSENSUS_BLEND_WEIGHT` into the live tool — the
    real, previously-missing piece flagged since item 70 (Open Items
    16/17): the weight had zero effect on the deployed Start/Sit, Trade
    Analyzer, and Waivers tools, only backtest-mode validation, because
    no "current snapshot" fetch path existed for FantasyPros' rankings.**
    - **Simpler than the historical path by design**: the backtest path
      (`getExpertConsensusByNormalizedNameWeek`) has to mine git commit
      history to reconstruct a PAST week's snapshot, since
      `dynastyprocess/data`'s `fp_latest_weekly.csv` only ever holds the
      single most recent daily overwrite. Live mode only ever needs "what
      does the consensus say right now" — no commit-history lookup at
      all, just a direct fetch of the file's current branch HEAD. New
      `fetchCurrentSnapshot()` (`fantasypros/client.ts`) does exactly
      that, confirmed live against the repo's real default branch
      (`master`, not `main` — checked via the GitHub API rather than
      assumed) and cached 6 hours (shorter than the historical path's
      30-day pinned-commit cache, since this content changes as new
      commits land, but long enough to stay polite to
      raw.githubusercontent.com across a single comparison's several
      concurrent player lookups). New
      `getCurrentExpertConsensusByNormalizedName()`
      (`fantasypros/weeklyConsensus.ts`) parses it the same way the
      per-week historical reader does, minus the week dimension —
      `normalizedName -> {rank, r2pPts}`.
    - **Threaded through the same "fetch once per request, share across
      every player" pattern every other live-mode signal in this app
      already uses** (`remainingOpponentsByTeam`/`teamWeatherByTeamWeek`/
      `impliedTotalsByTeamWeek`): `buildInput.ts` gained an
      `expertConsensusByNormalizedName` parameter (default empty map,
      same defaulting style as `priorSeasonPprAvgByNormalizedName`),
      `scoreExtendedPlayer` (`scoreExtended.ts`) threads it through to the
      skill-position path only (D/ST's and K's own scorers never read
      this signal, since `EXPERT_CONSENSUS_BLEND_WEIGHT` only applies
      inside `scorePlayer`), and all three live routes
      (`/api/compare`, `/api/trade`, `/api/waivers`) fetch it once
      alongside their existing schedule/weather fetches and pass it down.
      `buildWaiverReport.ts`'s `buildWaiverCandidateDetails` (which calls
      `buildComparisonInput` directly, bypassing `scoreExtendedPlayer`,
      since waiver ranking is skill-position-only) and
      `suggestDrop.ts`'s `suggestDrops` (which scores a user's own
      rostered players via `scoreExtendedPlayer`) both needed the same
      threading to cover every skill-position scoring path in the
      Waivers tool, not just the candidate-ranking one.
    - **Verified live end-to-end against the real running app, not just
      `tsc`/lint** (via direct requests to the dev server already
      running on this machine, since this is server-side data with no
      visual surface to check in a browser): a real `/api/compare`
      request (Joe Burrow vs. Patrick Mahomes) showed Burrow with a real,
      non-null `expertConsensusR2pPts` (22.1) and a real nonzero
      `expertConsensusModifier` (+3.8) computed correctly, while Mahomes
      — genuinely absent from the current snapshot, confirmed by
      grepping the raw fetched CSV directly rather than assuming a bug —
      correctly degraded to `null`/`0`, the same honest-gap handling
      every other optional external signal in this app already has.
      `/api/trade` and `/api/waivers` both verified working end-to-end
      too, including the real "FantasyPros' weekly consensus projects
      roughly X points..." reasoning note rendering correctly in a real
      Waivers candidate's notes. Zero errors in the dev server log across
      all three.
    - This closes Open Items 16 and 17 as originally written (both are
      superseded by this item, not left standing alongside it).

74. **Investigated Open Item 18 — whether `volumeModifier`'s
    population-average conversion factor could be fixed for durable
    per-player outliers (the root cause item 72 identified for
    Stafford's residual calibration bias) by blending each player's own
    trailing conversion rate in alongside the population one, exactly
    the mechanism item 72 itself proposed as the real fix. Tested
    properly, found a clean, monotonic, negative result. Not shipped.**
    - **Design**: an empirical-Bayes shrinkage estimator, not a flat
      per-player substitution — `shrunkRate = (seasonAttempts * ownRate +
      K * populationRate) / (seasonAttempts + K)`, where `ownRate` is a
      QB's own season-to-date PPR points ÷ season-to-date pass attempts
      **strictly before the target week** (no leakage — same discipline
      as every other backtest-mode signal in this app) and `K` is a
      tunable "prior strength" in attempts — a small `K` trusts a
      player's own rate heavily even off a modest sample, a large `K`
      stays close to the population rate regardless of sample size. This
      specifically avoids the naive version of this idea (using a
      player's own RECENT-window rate) which item 72's investigation
      never wrote out explicitly but which was worth ruling out on
      inspection first: since `recentPprAvg`/`blendedScore` already
      IS the recent-window points average, computing a "conversion rate"
      from that same window and multiplying back through
      `recentVolumeAvg` just reconstructs `blendedScore` itself at high
      weight — collapsing the validated volume signal back into the
      pre-volume, points-only engine (item 2's 50.3% baseline) rather
      than fixing anything. Using a longer, more stable SEASON-TO-DATE
      window for `ownRate`, shrunk by sample size, avoids that collapse.
    - **Built as a temporary diagnostic** (`/api/debug-qb-volume-
      shrinkage`, deleted after recording these numbers, same precedent
      as every other one-off analysis in this document), reusing real
      production functions rather than re-deriving the scoring formula
      from scratch where possible: `buildBacktestComparisonInput`/
      `scorePlayer` for the real baseline breakdown, `compareBreakdowns`/
      `gradeWeek` for pick-accuracy grading (only `finalScore` swapped on
      a cloned breakdown), `buildRankedPoolForWeek`/`buildPairsForWeek`
      for the identical realistic-pool/adjacent-rank methodology every
      other backtest number in this app uses. The one piece that
      genuinely had to be hand-reconstructed was the QB modifier chain
      itself (to substitute an alternative volume-conversion factor
      without touching any other modifier), which reads every other raw
      signal straight off the real breakdown (`matchupModifier`,
      `recentQbRushAttemptsAvg`, `goalLineTouchesAvg`, `successRateAvg`,
      `qbRushEpaAvg`, `expertConsensusR2pPts`) rather than recomputing
      them independently.
    - **Caught the exact bug class item 43 already warned about, on the
      first run — a real, load-bearing lesson in why this project cross-
      checks every sweep harness against the real engine before trusting
      it.** The first version of the reconstruction blended
      `matchupModifier` into `volumeModifier`'s own basis (i.e. blended
      `blendedScore + matchupModifier` toward the volume-implied
      estimate), but the real `engine.ts` blends `volumeModifier` against
      `blendedScore` ALONE — `matchupModifier` only enters the running
      score that every SUBSEQUENT modifier uses as its base. This
      produced a real, nonzero (0.79-point) mismatch against the actual
      shipped engine at the "population-rate-only" control point, caught
      by the same discipline items 43/44 established (verify the harness
      reproduces the real engine exactly before trusting any new number)
      rather than assumed correct. Fixed; the corrected harness matches
      the real engine's `finalScore` EXACTLY (0.0 max difference) across
      all 204 graded QB pool-weeks before any of the numbers below were
      trusted.
    - **Result: a clean, monotonic, negative result — not an ambiguous
      tradeoff requiring a user decision, unlike QB rushing/RB EPA/the
      ensemble ratio elsewhere in this document.** Swept `K` from 25
      (aggressive shrinkage) to 1600 (very mild) against `K=∞`
      (population-rate-only, i.e. today's shipped behavior), full 2025
      season, primary SportsDataIO pipeline, QB pool
      (`buildRankedPoolForWeek`, n=204 pool-weeks / n=102 pairs):

      | K | pool MAE | pool bias | pool pick accuracy |
      |---|---|---|---|
      | 25 (aggressive) | 6.89 | +2.06 | 56.9% |
      | 100 | 6.78 | +1.74 | 57.8% |
      | 400 | 6.67 | +1.37 | 59.8% |
      | 1600 (mild) | 6.61 | +1.12 | 60.8% |
      | population-only (shipped) | **6.58** | **+0.98** | **61.8%** |

      Every metric — calibration (MAE, and bias moving further positive,
      i.e. more over-projection on average) AND pick accuracy — gets
      monotonically WORSE as `K` decreases (more weight on each player's
      own rate), with NO interior optimum anywhere in the tested range.
      Unlike every genuine tradeoff this document has shipped (items
      30/33/41/44/70), there is no point in this family that's "some
      good, some bad" — population-rate-only (today's behavior) is
      simply better on every axis tested, at every `K`.
    - **But the ORIGINAL motivating case — Stafford's own calibration —
      does move in the predicted direction, just not enough to be worth
      the pool-wide cost.** Stafford's own bias (same pool-restricted
      12-week sample `runProjectionBacktest`'s `byPlayer` uses) improves
      from -4.00 (population-only) to -3.31 at `K=25` — real, but a
      partial fix at best (still a meaningfully large under-projection,
      not resolved), bought at the cost of every OTHER QB in the pool
      getting worse-calibrated on average. Confirms item 72's root-cause
      diagnosis was directionally correct (Stafford's durable
      above-population efficiency really is part of his bias), but this
      specific fix generalizes badly across the pool.
    - **Best-guess explanation for the pool-wide regression, worth
      recording for anyone who revisits this**: even a season-to-date
      `ownRate` is still derived from PPR POINTS, which carry real
      touchdown-rate variance — using it to build a "conversion rate"
      partially re-introduces exactly the noise the volume signal was
      built to filter out in the first place (items 6-13). It also
      likely double-counts rushing value for dual-threat QBs
      specifically: a QB's own points-per-pass-attempt rate includes
      whatever rushing production they have, which is ALREADY captured
      by the separate `qbRushModifier`/`QB_RUSH_BLEND_WEIGHT` additive
      term (item 30) — inflating the volume-conversion estimate on top
      of that for a QB like Lamar Jackson or Josh Allen, while a genuine
      pocket passer like Stafford (minimal rushing) gets a cleaner
      signal from the same mechanism. The pool mixes both kinds of QB,
      and the aggregate effect of the confound outweighs the aggregate
      benefit of the fix.
    - **Not shipped — no `config.ts`/`engine.ts` change.** This is a
      genuine rejection, not a "kept but disabled" precedent like most
      zeroed-out signals in this file, since no new named constant was
      ever added to production code. A future attempt at this same idea
      should probably start from a units-cleaner efficiency proxy than
      total PPR points per attempt (e.g. passing yards or EPA per
      dropback, isolated from rushing production) rather than this
      item's direct approach — flagged as an open avenue below, not
      pursued further here per the standard "don't chase an ambiguous
      idea past its first clean rejection" discipline this document has
      followed throughout (see items 25/26/34's partial rejections,
      38/42/54/55's full ones).
    - This closes Open Item 18 as originally written, with a real,
      quantified answer (not a "still not started" placeholder) — see
      the Open Items entry below for what's left if this gets revisited.

75. **Promoted the FantasyPros-vs-engine per-week comparison (used ad hoc
    for items 72/74 and again for three user-requested spot-checks —
    Stafford, George Pickens, Bijan Robinson) into a permanent feature,
    rather than rebuilding a one-off diagnostic route every time a
    specific player's numbers were wanted.** The data was already fully
    in scope — `playerProjectionLookup.ts`'s per-player week-by-week
    lookup already reads `weekSlice.expertConsensusByPlayerIdWeek` for
    its own purposes elsewhere in the file — it just wasn't surfaced on
    the `PlayerWeekProjection` shape itself.
    - **New `fantasyProsProjection: number | null` field** on
      `PlayerWeekProjection`, populated the same way the temporary
      diagnostic scripts did (`weekSlice.expertConsensusByPlayerIdWeek
      .get(playerId)?.get(week)?.r2pPts`) — no new fetch, same
      already-loaded data, just returned instead of discarded. Kept
      deliberately out of the `diff`/summary math (that stays
      engine-vs-actual only, unchanged) — this is a side-by-side display
      column, not a second graded series (that's what the separate
      `expertConsensusOverall`/`expertConsensusByPosition` pooled series
      from item 71 already does, at the position level).
    - **`ProjectionPlayerDetail.tsx`'s table gained a "Projected
      (FantasyPros)" column** next to the existing "Projected (engine)"
      one (renamed from plain "Projected" for clarity now that there are
      two). No new fetch, no new route — the existing
      `/api/backtest/projection?ids=...` response already carried this
      data through `playerDetail` once the field was added upstream.
    - **Verified live end-to-end through the real UI**, not just the
      API response: ran Matthew Stafford through the actual `/backtest`
      page (Projection accuracy mode, player search, all four position
      checkboxes unchecked for a player-only lookup) and confirmed the
      rendered table matches the manually-pulled numbers from the
      diagnostic-script era exactly (e.g. week 4: engine 14.9,
      FantasyPros 17.2, actual 27.4). Zero console errors.
    - **Follow-up, same item**: added a `fantasyProsDiff` column (same
      `fantasyProsProjection - actual` shape as the existing engine
      `diff`) and a totals row summing every numeric column
      (`sumColumn` in `ProjectionPlayerDetail.tsx`, skipping weeks with
      no value for that column — bye weeks don't get treated as zero).
      Labeled the two diff columns "Diff (engine)"/"Diff (FantasyPros)"
      once there were two, rather than a bare "Diff." Re-verified live
      against Stafford: total row reads engine 278.3 / FantasyPros
      314.3 / actual 350.4 / engine diff -72.1 / FantasyPros diff -36.1
      — a concrete, season-long confirmation of the same finding items
      72/74 already quantified per-week (FantasyPros under-projects
      Stafford by about half as much as the blended engine does, summed
      across the whole season). Zero console errors.
    - **Second follow-up, same item: added a "who got it right more"
      counter** (`countCloserWeeks`, `ProjectionPlayerDetail.tsx`). For a
      single searched player there's no pairwise pick to grade the way
      every other backtest accuracy number in this app works (see
      `gradeOutcome`/`compareBreakdowns`) — "right" here means "closer to
      the real score that week," a smaller absolute error between
      `diff`/`fantasyProsDiff`, counted only over weeks where both
      projections and a real actual exist (a bye week or a coverage gap
      can't be judged either way). Renders as a line under the header:
      "Closer to actual: Engine N · FantasyPros N (· Tied N) (of N weeks
      with both projections)." Re-verified live against Stafford: Engine
      6 · FantasyPros 11 (of 17) — consistent with the MAE/bias/total-diff
      numbers already established, just expressed as a per-week win
      count instead of an aggregate error magnitude. Zero console errors.

76. **Built a Lineup Optimizer — a fifth live tool (`/lineup`), the first
    genuine whole-roster assignment problem this app has tackled**, as
    opposed to every existing tool's pairwise-or-list framing (Start/Sit
    compares 2-3 named players; Trade Analyzer compares two sides; Waivers
    ranks a candidate pool). Import a roster from Sleeper or add players
    by hand, tell it how many starters go at each spot, and it fills out
    the best lineup — reusing the already-validated `scoreExtendedPlayer`/
    `finalScore` exactly as every other live tool does. No new scoring
    signal and no new backtest were needed: this is a new assignment/UI
    layer on top of already-proven scoring, not a new prediction claim.
    - **Scoped as its own tool, not folded into Start/Sit**, after
      discussing the tradeoff with the user directly: a lineup optimizer
      is architecturally a whole-roster assignment problem (much closer
      to Waivers' "import a real Sleeper roster, score everyone on it"
      shape) rather than Start/Sit's 2-3-named-player pairwise comparison.
    - **Fixed a real, already-documented gap as part of this work** (was
      Open Item 10): Sleeper roster import previously skipped D/ST and K
      entirely. `resolveSleeperRoster` (`lib/sleeper/resolveRoster.ts`)
      now reads from `getActiveExtendedPlayers()` (skill + K + synthetic
      D/ST rows) instead of the skill-only `getAllPlayers()` — K joins by
      name exactly like a skill player (a locally-built skill+K name
      index replaces the shared `buildSdioPlayerIdByNormalizedName`
      helper here, since that helper is deliberately skill-only for its
      other callers). D/ST needs a genuinely different path: Sleeper
      represents a team defense as `position: "DEF"`, `full_name: null`,
      with the team's own abbreviation as its `player_id` (confirmed
      live) — resolved against a team-code → synthetic-PlayerID map built
      from the same already-fetched extended pool. **A real, useful
      surprise found while building this**: assumed Sleeper's team codes
      would need the same `LA`→`LAR` translation nflverse's data needs
      (the one known SportsDataIO mismatch documented elsewhere in this
      file) — checked live instead of assuming, and found Sleeper's own
      player dump uses `LAR` directly, already matching SportsDataIO. The
      `toSdioTeam()` call is kept anyway as a defensive no-op (same
      "falls back to its input unchanged" precedent the function already
      has), and the code comment states the verified fact, not the
      original wrong assumption. **Verified live against a real public
      Sleeper league**: Cleveland's `"CLE"` roster entry now resolves to
      the correct synthetic D/ST PlayerID (900008) with zero unmatched
      entries for that slot (previously silently skipped); K's join was
      independently confirmed viable by cross-checking a real active
      kicker's Sleeper name against this app's own extended player search
      (no live roster with a rostered kicker was available to test the
      full round-trip, but the two halves — Sleeper having real,
      name-joinable K entries, and this app's search resolving that exact
      name — were each verified directly). `leagueRosteredPlayerIds`
      (Waivers' own exclusion list) improves for free from the same fix,
      not new scope — confirmed Waivers' own behavior is unchanged/only
      improved, not regressed, by re-running it after this change.
    - **Roster slots auto-detect from the real connected Sleeper league,
      always editable** — the user's explicit choice over always-manual
      configuration, matching this app's standing "real data over
      guesses" pattern. `SleeperLeague.roster_positions` (a field Sleeper
      already returns, just not previously typed/threaded through) is now
      surfaced end-to-end: `sleeper/types.ts` → `/api/sleeper/leagues`
      route → `SleeperImport.tsx`'s `LeagueOption` →
      `useSleeperConnection.ts`'s `SleeperConnection` (with a
      backward-compatible empty-array default for a connection saved
      before this field existed, same precedent as
      `leagueRosteredPlayerIds`'s own earlier addition). New
      `lib/lineup/rosterSlots.ts`: `SlotType` (QB/RB/WR/TE/K/DST plus the
      real flex variants Sleeper leagues use — FLEX, SUPER_FLEX,
      WRRB_FLEX, REC_FLEX; IDP-style flex slots are silently ignored,
      since this app has no defensive-player pool at all),
      `parseSleeperRosterPositions()` (counts real starting slots from
      Sleeper's raw array, ignoring BN/TAXI/IR), `DEFAULT_SLOTS` (a
      standard 9-starter shape used when no Sleeper league is connected).
      Verified the parser directly against the real `roster_positions`
      array pulled from a real public league
      (`["QB","RB","RB","WR","WR","TE","FLEX","FLEX","DEF","BN"×6]`) —
      correctly produced `{QB:1,RB:2,WR:2,TE:1,DST:1,FLEX:2}`, matching
      that league's real settings exactly (a 12-team league with 2 flex
      spots and no kicker).
    - **Assignment algorithm** (`lib/lineup/optimizeLineup.ts`): fills
      fixed single-position slots first (each with that position's own
      top-scored players, since only that position can fill them anyway),
      then fills flex-type slots from whatever's left over, narrowest-
      eligibility-first (WRRB_FLEX/REC_FLEX, then FLEX, then SUPER_FLEX)
      — the standard, provably-optimal greedy order for this "fixed slots
      then shared flex" structure for the common case of 0-2 total flex
      slots (documented in code as a heuristic, not a full weighted-
      assignment solver, for the rare case of several overlapping flex
      types at once). Availability-first sort within each position
      (healthy/active players always rank above a bye-week or Out/
      Doubtful player, regardless of raw score) mirrors `compareBreakdowns`'
      own "prefer healthy, but still fill the slot if that's all there
      is" philosophy (`engine.ts`), just applied to N-way assignment
      instead of a single pairwise comparison. An unfillable slot (not
      enough eligible players on the roster) renders as an honest empty
      slot ("No eligible player on your roster for this slot — add one
      to fill it"), not a crash or a silently dropped row.
    - **New `/api/lineup` route** mirrors `/api/compare`/`/api/trade`'s
      existing fetch block exactly (context, positionDefenseTable,
      nflversePlayerWeekTable, remainingOpponentsByTeam + season-
      rollforward, teamWeatherByTeamWeek, impliedTotalsByTeamWeek,
      `getCurrentExpertConsensusByNormalizedName`) — full live-data parity
      with every other live route, no new fetch logic invented. Scores
      every rostered player via `scoreExtendedPlayer` (already handles
      skill/K/D/ST uniformly) then calls `optimizeLineup`. Slot counts
      travel over the wire as a compact `<SlotType><count>` string (e.g.
      `QB1,RB2,WR2,TE1,FLEX1,K1,DST1`), parsed/serialized by
      `parseSlotsParam`/`serializeSlots` in the same `rosterSlots.ts`.
    - **UI**: `LineupTool.tsx` mirrors `WaiverTool.tsx`'s shape exactly —
      `useRosteredPlayers()`/`useSleeperConnection()` are the SAME global
      hooks Waivers already uses (verified live: connecting Sleeper or
      adding a player on either page shows up on both — one roster
      concept across the app, not a per-tool one), plus `SleeperImport`
      and `PlayerSearchInput` reused verbatim. New `RosterSlotsEditor.tsx`
      (a compact grid of per-slot-type steppers, re-populated from
      `parseSleeperRosterPositions(connection.rosterPositions)` whenever
      the connected league actually changes — tracked via a ref so
      further manual edits aren't clobbered on every render — never
      locked to the detected value). New `LineupResult.tsx` (starters
      grouped by slot, reusing `breakdown.notes` verbatim for reasoning —
      same "one source of truth for reasoning text" precedent as
      `WaiverResult`/`TradeResult` — plus a Bench section for everyone
      else). `AppShell.tsx` gained a "Lineup" nav link between Waivers
      and Backtest.
    - **Verified live end-to-end, not just via the API**: built a real
      8-player roster (Burrow/Bijan/McCaffrey/Jefferson/Lamb/Kelce/
      Butker/Cleveland D/ST) through the actual UI — correct assignment
      to every fixed slot, an intentionally-thin roster correctly left
      RB2/WR2/FLEX as honest empty slots with zero players benched. A
      second, larger roster (10 players, two QBs and three WRs) via
      direct API confirmed the harder cases: the backup QB (Mahomes,
      lower score) correctly benched behind the starter, and the third
      WR (Jefferson, the lowest-scored of three) correctly rolled into
      the FLEX slot rather than the bench — confirming the "fixed slots
      first, then flex from leftovers" ordering works as designed, not
      just in the simple case. Checked light and dark mode, zero console
      errors throughout, and confirmed Waivers itself is unchanged (same
      shared roster, same Sleeper connection, `Find waiver targets` still
      returns real results) after all of the above. `next build`,
      `npx tsc --noEmit -p .`, and `npm run lint` all clean.
    - **Deliberately out of scope for this pass**: no backtest validation
      for the ASSIGNMENT logic itself (not a new prediction claim — see
      above), no support for saving/naming multiple lineup configurations
      (the roster and slot config are both single, global, localStorage-
      only state, same "no persistence" scope as every other live tool),
      and no attempt to solve the rare multi-overlapping-flex-type case
      with a true weighted-assignment algorithm (documented as a known,
      accepted heuristic limitation instead).

77. **Added three real "this week" widgets to the Home page** — a
    lineup snapshot, a top waiver target, and a genuine cross-team trade
    suggestion — plus moved the whole "This week" section above the
    tool-launch cards on request. None invented new scoring logic; each
    widget calls the exact same route/engine its full tool page does.
    - **`HomeLineupWidget.tsx`/`HomeWaiverWidget.tsx`** call `/api/lineup`
      and `/api/waivers` directly, auto-fetching on mount against
      whatever roster/Sleeper connection is already saved (no button
      click needed, unlike the full tool pages) — an honest empty-state
      CTA when no roster exists yet, never fabricated data.
    - **`HomeTradeWidget.tsx` is the genuinely new piece**: a real,
      two-sided cross-team trade FINDER, not just a display of the
      existing Trade Analyzer (which only grades a trade the user
      already proposes). New `lib/trade/suggestLeagueTrade.ts` finds
      your best bench surplus (by rest-of-season value) and your
      weakest starter/empty slot, scans every other real roster in a
      connected Sleeper league for a positional match, and proposes a
      trade — but ONLY after two gates: the other team has a genuine,
      comparatively weak spot at your surplus's position, and the trade
      grades as **"fair"** (roughly matched rest-of-season value), never
      "good for you." That second gate isn't arbitrary — an early
      version allowed "good," and live testing immediately produced an
      unrealistic offer (a backup QB for a top-12 WR) — mathematically,
      under one shared valuation, "good for you" is *always* "bad" for
      the other side by the identical margin, so "fair" is the only
      value band that can ever be mutually sensible. Deliberately
      Sleeper-only (no manual-roster fallback), since it needs real
      per-team roster data no manually-built roster has.
    - **New Sleeper plumbing**: `resolveSleeperRoster` now also returns
      `otherTeams` (every OTHER team's real, resolved roster — previously
      discarded down to just a league-wide union), backed by a new
      `getSleeperLeagueUsers` (`sleeper/api.ts`) for real team names. New
      `/api/trade-suggestion` route; the position tabs component pattern
      and `POSITION_ORDER`/`isStreamingPosition`/`moveHeadline` were
      exported from `WaiverResult.tsx` for the waiver widget to reuse
      verbatim rather than re-deriving copy.
    - **Verified live end-to-end** against a real, live Sleeper account
      (username provided by the user, since no test credentials existed
      in memory or code from prior sessions): the trade widget found a
      real, sensible trade ("Sam Darnold ↔ Wan'Dale Robinson," graded
      fair) against a real opposing team once the "fair-only" fix
      shipped. Committed as `a3a38fa`.

78. **Shipped Legit Rankings (`/rankings`), the sixth live tool** — every
    rankable QB/RB/WR/TE (D/ST and K excluded — see below) ranked and
    given a **Legit Score, 1-100**, plus a combined **Overall** view
    spanning all four positions. Built, then iteratively fixed against
    real, user-flagged bad rankings — a genuine "ship, get real feedback,
    fix the real cause" cycle, not a one-shot build.
    - **Core mechanism** (`lib/rankings/buildRankings.ts`): scores every
      "played recently" player at a position via the same
      `scoreExtendedPlayer` every other live tool uses (no new
      prediction model), min-max normalizes `finalScore` within that
      position's pool to `[1,100]`, and caches the computed RESULT
      itself (not just source data — a new pattern for this app) for 30
      minutes per `(position, season, week, format)`. Negative-projection
      players (a known, still-open engine calibration gap — see items
      65/66) are excluded from the pool entirely rather than shown a
      nonsensical "-36 projected points."
    - **FantasyPros season-long blend, a genuinely new data source**:
      `lib/fantasypros/seasonProjections.ts` reads dynastyprocess/data's
      `db_fpecr_latest.csv` (FantasyPros' current REDRAFT — season-long,
      not weekly — consensus rank per position), confirmed live to cover
      all six positions, PPR only. Blended in specifically to fix a real
      case: Mahomes scored a legitScore of only 58 because only 1 of his
      4 recent-window games had usable data, producing a noisy, thin
      snapshot the engine had no way to distinguish from a real decline
      — confirmed directly against SportsDataIO's own weekly
      stats before concluding this wasn't a bug. `ENGINE_WEIGHT` (per
      `dataQuality`) controls how much the engine's own snapshot counts
      vs. FantasyPros' consensus; twice retuned lower for thin-sample
      cases (`full`=0.65 unchanged, `limited`/`insufficient` eventually
      0.15/0.05) after a second real case (Lamar Jackson, a genuinely
      elite FantasyPros QB2, still under-ranked at the first, milder
      retune) showed the first fix wasn't strong enough.
    - **A second, independent root cause found via live testing** (not
      just weight tuning): Justin Jefferson (real FantasyPros WR6) was
      initially outranked by Quentin Johnston (real FantasyPros WR46) —
      caused by normalizing FantasyPros' rank against its OWN full
      redraft pool (239 WRs, mostly deep scrubs), which inflated a
      mediocre rank like 46 to ~80/100. Fixed with `FP_NORMALIZATION_CAP`
      — caps the normalization depth to roughly 3x this file's own
      per-position display limit, not FantasyPros' full published pool.
    - **A real, second team-code mismatch found and fixed**: FantasyPros'
      source uses "JAC" for Jacksonville where SportsDataIO uses "JAX" —
      distinct from (and in addition to) the already-known nflverse
      LAR/LA mismatch — confirmed by diffing the full 32-team list, not
      assumed.
    - **Follow-up scope changes, all on direct request**: capped the
      visible list per position (`RANKING_LIMIT`: top 10 QB/20 RB/25
      WR/10 TE — computed BEFORE truncation so a 10th-ranked QB's score
      still reflects standing against the full pool, not just the
      visible ten); D/ST and K removed entirely (`RANKABLE_POSITIONS`,
      route now rejects them); and the combined **Overall** view
      (`getLegitRankingsOverall`) added — merges the four position lists
      by their already-normalized `legitScore` (not raw `finalScore`,
      which isn't comparable across positions), no new scoring pass.
    - **Verified live at every step** against real players (Mahomes,
      Lamar Jackson, Jefferson/Johnston, and a full sweep of QB/RB/WR/TE/
      DST/K before D/ST/K were removed) — `tsc`/lint clean throughout.
      Committed as `beefc54`.

79. **Restructured the Start/Sit result's presentation — explicitly NOT a
    scoring/logic change** (per the user's own framing of the request):
    leads with a bold verdict banner (big player name, a confidence bar),
    then a one-sentence summary (`result.headline`, reused verbatim),
    with the full signal breakdown, matchup notes, and both player cards
    moved into a collapsed-by-default "Why this pick" toggle — content
    preserved exactly, just reachable one click away instead of always
    expanded.
    - **The confidence percentage isn't fabricated**: it maps the
      already-existing `isCloseCall`/`hasLimitedData` flags (computed
      exactly as before, in `comparePlayers`, untouched) to this app's
      own already-validated historical accuracy rates per bucket — close
      call ~51% (item 22), confident ~52%, limited data ~59% (item 45's
      real two-proportion z-test, pooled 2022-2025) — the same
      counterintuitive "limited data is more reliable than confident"
      finding this app's headline copy already reflected, now given a
      real number and a visual bar instead of just words.
    - `ComparisonResult.tsx` gained a `useState` toggle (now a real
      client component, `"use client"` added) but zero new fetches, zero
      changes to `comparePlayers`/`scorePlayer`/`engine.ts`. Verified
      live with two real comparisons, light and dark mode, both toggle
      states. Committed as `dcd90b1`.

80. **Replaced the entire visual identity — a full re-skin, zero scoring/
    logic changes** — a teammate shared a reference design from a
    similar tool; proposed the token/typography mapping and three
    genuinely open decisions (dark-only vs. keep both themes; whether
    Backtest joins this time; where the new gold "premium" color
    actually gets used) via `AskUserQuestion` before touching any code,
    per explicit instruction to propose first.
    - **User's calls**: keep both light AND dark as first-class themes
      (not dark-only, despite the reference being dark-first — a new
      light theme was designed from scratch, not just inherited from the
      old one); bring Backtest fully into the redesign this time,
      breaking the precedent both prior visual passes (the original
      "cohesive pass" and the Apple-inspired one) set of deliberately
      excluding it as "the internal tool"; gold reserved for Legit
      Rankings' new 90+ elite tier specifically.
    - **Tokens** (`globals.css`): dark background `#0B0E0C`, light
      `#F5F7F5` (a genuinely new design, not a negative of the dark
      theme); `--accent` and `--good` deliberately MERGED into one
      emerald (`#00E07F` dark / `#00B868` light) — a real philosophy
      reversal from the Apple-inspired system's explicit "keep brand and
      meaning separate" choice, since this reference's whole language is
      "green is the brand is money is good," same as Underdog/PrizePicks-
      style products; `--bad`/`--caution`/`--info` kept distinct; new
      `--accent-secondary` (gradients/hover) and `--premium`/
      `--premium-ink` (gold, `#E8C468` dark / `#B8863A` light).
    - **Typography**: Barlow Condensed (new `--font-display` token) on
      `PageHeader` titles, the verdict banner's big name, and the
      `AppShell` wordmark; Inter replaces the `-apple-system` stack for
      `--font-sans`; JetBrains Mono replaces `ui-rounded` for what's now
      `--font-mono` (renamed from `--font-rounded` — a single token
      redefinition cascaded through all 10 files already using the
      `font-rounded` utility class via one mechanical rename, no
      per-component font logic needed). All three loaded via
      `next/font/google` in `layout.tsx` (self-hosted at build time, same
      privacy posture as the system-font stack it replaces).
    - **Gold elite tier**: `RankingsResult.tsx`'s `legitScoreClasses`
      gained a 90+ tier using `--premium`, and the old 60/85 accent/good
      split was collapsed to one 70+ tier — a real, necessary fix, not
      just an addition: with `--accent`/`--good` now the same color, the
      OLD two-tier split would have rendered two adjacent bands
      identically.
    - **Backtest migration** (the biggest mechanical piece): all 8
      components (`BacktestTool`, `BacktestSummary`, `BacktestWeekTable`,
      `BacktestCaveatNote`, `TradeBacktestTable`, `ProjectionSummary`,
      `ProjectionPlayerTable`, `ProjectionPlayerDetail`) moved off
      hardcoded `zinc`/`amber`/`sky`/`emerald`/`red` Tailwind-default
      classes onto this app's own semantic tokens, with mode/season
      toggle buttons and the primary CTA upgraded from plain
      `rounded-md` boxes to the same pill/segmented-control and
      shadowed-CTA conventions every other page already uses.
    - **Verified live across all six tools plus Backtest, light AND dark,
      with real data** — ran actual comparisons, trades, waiver searches,
      a lineup build, rankings, and a real backtest (58.7% overall
      accuracy, matching this app's own documented history) through the
      new UI; zero console errors anywhere; `tsc`/lint clean; a full
      `next build` production build succeeds. Committed as `b60906c`.

81. **Unified the player-selection UI across every tool that picks
    players into one shared component** — Start/Sit, Trade Analyzer
    (×2, give/get), Waivers, Lineup, and Backtest (×2, Single pair and
    the Projection-accuracy player lookup) each had their own hand-
    rolled chip-list-plus-search markup, in three visibly different chip
    styles (one literally duplicated verbatim between Waivers and
    Lineup). Before building anything, surveyed and reported the full
    scope back to the user — six call sites, one shared
    `PlayerSearchInput.tsx` underneath all of them for the actual fetch/
    dropdown logic, but zero shared chip/counter/max-handling behavior.
    - **New `PlayerMultiSelect.tsx`** replaces all six sites: chips
      render above the input (not below), the input clears and stays
      focused after each pick, a `{selected}/{max}` counter renders next
      to an optional label when `max` is set (omitted entirely for the
      two genuinely unlimited tools, Waivers/Lineup's roster — no fake
      "X/∞" implied limit), the input **disables** with an explanatory
      placeholder at max rather than disappearing (the previous
      behavior everywhere), a real `mousedown`-outside listener closes
      the dropdown (replacing a `blur`+`setTimeout` proxy), and
      refocusing the input reopens the cached dropdown if room remains.
      An `extraExcludeIds` prop covers Trade Analyzer's cross-side
      exclusion (a player already on "You give" can't also appear in
      "You get" results).
    - Chip style unified into one design (avatar initials, position
      badge, name, team, remove ×) used everywhere, replacing the three
      prior styles (Start/Sit and Trade Analyzer's avatar-card, Waivers/
      Lineup's team-less pill, Backtest's plain unstyled row).
    - **Verified live**, not just via `tsc`/lint: exercised every one of
      the six sites end-to-end in the real browser (search → select →
      chip appears → counter updates → max disables the input → click-
      outside closes → refocus reopens with cached results), plus the
      cross-side exclusion on Trade Analyzer specifically. Zero console
      errors, light and dark mode both checked.
    - `PlayerSearchInput.tsx` deleted outright once all six call sites
      were migrated — confirmed via `tsc`/lint that nothing else
      referenced it (two doc-comment mentions elsewhere in the codebase,
      unrelated to this component, were updated to point at the new
      name instead). Committed as `b04e9e0`.
82. **Made the Waiver Wire/Lineup Optimizer "Your roster" panel
    collapsible, with a click-again-to-confirm "Clear" action** — direct
    follow-up requests after item 81 shipped: a real, Sleeper-synced
    roster can run 30+ chips deep (confirmed live against the user's own
    connected dynasty league), dominating the page every time either
    tool loads.
    - **New `CollapsibleSection.tsx`** — the same expand/collapse
      pattern `ComparisonResult.tsx`'s "Why this pick" toggle already
      used (item 79), factored out for reuse: a header row (arbitrary
      `label` content plus an optional `action` slot rendered outside
      the toggle button itself, so a second interactive control can sit
      in the header without invalid nested-`<button>` HTML) and a
      chevron that flips on toggle. `WaiverTool.tsx`/`LineupTool.tsx`
      both wrap their `PlayerMultiSelect` roster block in one, labeled
      `Your roster ({count})`, expanded by default.
    - **New `ConfirmButton.tsx`** — a click-again-to-confirm button
      (first click arms it: label swaps to a danger-styled
      "Click to confirm" for 3 seconds; a second click within that
      window fires the real action; clicking elsewhere or waiting it out
      disarms it) used for the new "Clear" action. Deliberately NOT a
      native `window.confirm()` dialog — tried that first, and it
      visually breaks out of this app's entire custom dark/light design
      system (unstyled OS chrome next to Barlow Condensed/JetBrains
      Mono everywhere else), plus complicated live-browser verification
      (native dialogs don't reliably respond to the same automated-click
      tooling the rest of this app's verification uses). A new
      `clearRostered()` was added to `useRosteredPlayers.ts` alongside
      the existing `addRostered`/`removeRostered`.
    - **Verified live against the user's real, live-connected Sleeper
      account** — clicking Clear correctly emptied a real 34-player
      roster down to 0, and re-clicking "Sync roster" restored it to the
      TRUE current Sleeper roster (29 players) rather than the pre-clear
      34. The 5-player gap was investigated, not assumed benign: those 5
      (Joe Burrow, Ja'Marr Chase, Travis Kelce, Harrison Butker,
      Cleveland Browns D/ST) turned out to be stale manually-added test
      players left over from earlier development sessions' live
      verification work, confirmed absent from the real Sleeper roster
      via a direct API check — Clear + Sync actually cleaned up leftover
      test data rather than losing anything real.
    - Committed as `4b6677c`.
83. **Restyled the Waiver Wire tool's results from a two-column card
    grid into a compact, collapsible row-list** (direct request: "it
    should look more similar to our legit rankings tab, with collapsable
    additional info") — matches `RankingsResult.tsx`'s own pattern
    exactly: one bordered container per position, thin row dividers,
    avatar/name/badges on the left with a stat on the right, each row
    collapsed by default and individually expandable (`ChevronIcon`
    exported from `CollapsibleSection.tsx` for reuse here rather than a
    third copy of the same inline SVG). A first pass (`flex flex-col
    gap-4`, still card-shaped, just single-column) was shipped and
    explicitly rejected by the user as still not what they wanted before
    this row-list version replaced it.
    - **A real false positive surfaced by direct user question**
      ("chris oladokun and brady cook are both backup qbs, why are they
      being recommended") — investigated against real box scores (a
      temporary debug route, deleted after use, same discipline as every
      other one-off diagnostic in this document) rather than guessed at.
      Confirmed NOT a bug: both genuinely started/played extended snaps
      late in the real 2025 season (Oladokun: KC, 16-22 real pass
      attempts across weeks 16-18; Cook: NYJ, real starter since week
      14, 22-35 attempts/game) — real, verified data. But both were
      genuinely BAD (Oladokun ~4.4 real yards/attempt across those
      games, Cook ~4.7), and the waiver ranking's whole mechanism
      (opportunity outpacing production — item 58) has no way to
      distinguish "a good player in a temporary slump, buy low" from "a
      bad backup who just inherited volume and is performing exactly as
      badly as expected," since both look identical on a pure
      volume-vs-points gap.
    - **Added a real efficiency/quality floor** — yards per unit of
      volume (pass attempt for QB, touch for RB, target for WR/TE;
      `getEfficiencyStat` in `rankCandidates.ts`), computed from real
      `PassingYards`/`RushingYards`/`ReceivingYards` fields newly added
      to `PlayerGameStat`/`PlayerSeasonStat` (SportsDataIO already
      returns these; this app just wasn't reading them — same "cast, not
      whitelist" extension pattern as every prior field addition to this
      type). A candidate's own recent efficiency has to clear
      `EFFICIENCY_FLOOR_RATIO` (0.75) of the position's real baseline.
    - **The baseline went through two real iterations, not one
      guess-and-ship** — a first version used the mean efficiency of
      just the thin ~4-week recent candidate pool as the baseline, which
      looked reasonable but, verified live, failed to actually exclude
      Brady Cook: late-season weeks with many backups getting real spot
      duty drag the whole recent pool's average down WITH the bad
      players, exactly when the filter matters most. Replaced with a
      **full-season, ratio-of-sums baseline** (`computeSeasonEfficiencyBaseline`,
      the same "ratio of sums" methodology this app's other empirically-
      derived conversion factors already use) — hundreds of real
      attempts/touches/targets per position across a whole season,
      immune to any single week's composition. Re-verified live after
      the fix: both Oladokun and Cook correctly excluded from the real
      `/api/waivers` response (not just an isolated debug check), while
      every other position's candidate list still filled its normal 6
      slots with reasonable players — confirms the floor isn't so
      aggressive it empties the pool.
    - Committed as `94e9af4`.
84. **Renamed Legit Rankings' "Overall" tab to "Top 100" and made it
    show a real top 100 players regardless of position** — the combined
    view previously merged each position's own DISPLAY-capped list
    (QB10/RB20/WR25/TE10 — `RANKING_LIMIT`, item 78 — roughly 65 players
    max), not a genuine top 100 across positions.
    - Split `getLegitRankingsForPosition` (item 78's original function)
      into a new internal `getFullLegitRankingsForPosition` (the real,
      cached, UNCAPPED ranked list per position) plus a thin wrapper that
      applies `RANKING_LIMIT` only for the individual QB/RB/WR/TE tabs —
      the per-tab display caps are unchanged, only the combined view's
      own input changed. `getLegitRankingsOverall` now merges all four
      positions' full uncapped lists, sorts by `legitScore`, and slices
      to a new `TOP_100_LIMIT = 100` — the caching behavior itself is
      unaffected (still one cache entry per position, 30-minute TTL;
      only what gets sliced out of that cached list differs by caller).
    - The `"OVERALL"` internal tab/query-param value was kept as-is
      (only the user-facing label changed to "Top 100") — no API
      contract change, just `RankingsTool.tsx`'s `TAB_LABEL` map.
    - **Verified live**: the real `/api/rankings?position=OVERALL`
      response now returns exactly 100 entries spanning all four
      positions (confirmed programmatically, not eyeballed), while each
      individual position tab's own count is unchanged (QB 10/RB 20/
      WR 25/TE 10) — the two display caps are genuinely independent now.
      Committed as `eec51a2`.
85. **Redesigned the Start/Sit results page's layout and structure to
    match a teammate-shared reference design** — explicitly a
    presentation/structure change, not a scoring or data change: every
    real signal, number, and piece of reasoning stays exactly what it
    was, just laid out differently. Per direct instruction, mapped the
    request onto this app's existing components BEFORE writing any code
    (StartSitTool.tsx already had a 2-column sidebar grid and a top-of-
    page player picker from items 64/81; ComparisonResult.tsx's verdict
    banner/confidence bar from item 79 needed extending, not rebuilding;
    each player's own `.notes` — already reused verbatim by Waivers/
    Trade Analyzer — was the natural source for a per-card "Why this
    pick," replacing the prior single GLOBAL toggle that gated the
    entire card grid behind one "Why this pick" click). Two real,
    upfront judgment calls were put to the user via `AskUserQuestion`
    before building: (1) should the verdict banner be a fixed-dark card
    like the sidebar nav, or stay theme-adaptive like every other card —
    **kept theme-adaptive**; (2) the reference design's four confidence-
    scale labels (Coin flip/Lean/Confident/Lock) don't match this app's
    own real, narrow 51-59% accuracy band, so the dot would almost
    always sit in the first two zones — **kept the generic honest scale**
    anyway (chosen over curve-fitting the thresholds to this app's own
    range), consistent with this app's standing "don't force false
    confidence" philosophy.
    - **One genuinely new field was needed, not fabricated**: no
      floor-to-ceiling projection-range data existed anywhere in this
      engine (`finalScore` is a single point estimate). Rather than
      invent a statistical interval, added `recentPprFloor`/
      `recentPprCeiling` to `PlayerScoreBreakdown` — the REAL min/max of
      a player's own recent-game PPR output, computed from `recentGames`
      data every scorer (`engine.ts`, `scoreDefense.ts`, `scoreKicker.ts`)
      already fetches but previously discarded down to just an average.
      The recent average always falls between floor and ceiling by
      construction (same underlying values), so the UI marker never
      needs clamping.
    - **Player cards are now always visible** (not gated behind the old
      global toggle) and sorted by real `finalScore` descending —
      `result.players` itself is selection order, not ranked order, so
      this is a pure client-side display sort on an already-real field,
      not a new signal. Each card: a large bold projection number
      (`finalScore`) with the new floor-ceiling range bar underneath, a
      compact position-specific stat grid (real fields already on the
      breakdown — pass attempts for QB, touches + red-zone touches for
      RB, targets + drop rate for WR, targets + snap share for TE — no
      new signals, just picking which 3-4 already-computed fields matter
      per position instead of one long flat list), and its own
      collapsed-by-default "Why this pick" using that player's real
      `.notes`.
    - **Confidence bar gained four static reference-scale markers**
      (tick marks + labels at 50/60/75/90%) under the existing real
      percentage — explicitly NOT four new validated accuracy tiers
      (there were only ever three real backtested numbers), just generic
      calibration context for the one real number, per the judgment call
      above.
    - **A real bug was caught and fixed during live verification, not
      assumed away**: the floor-ceiling bar's percentage math assumed
      floor/ceiling were always non-negative — a real D/ST game can score
      negative FantasyPoints, and a negative floor produced a negative
      CSS `left%` that visually clipped to a full-width bar (looked
      "maxed out" rather than showing the real, honest partial range).
      Fixed by anchoring the bar's scale to `min(floor, 0)` instead of
      always 0, verified live against a real Arizona Cardinals D/ST card
      (floor -3.0, ceiling 5.0) showing a correct partial-width bar
      after the fix.
    - **Sidebar** gained a new `KeyTakeawaysPanel` (`result.reasoning`,
      the pairwise comparison-level summary that no longer had a home
      once the old global toggle was removed) and, briefly, an
      `InjuryWeatherPanel` — see item 87, which moved that panel's
      content into the cards themselves shortly after this item shipped.
    - **Verified live end-to-end**, not just via `tsc`/lint: real 2-and
      3-player comparisons (including a real D/ST-vs-D/ST comparison
      specifically to exercise the negative-floor bug above) in both
      light and dark mode, per-card expand/collapse, zero console errors
      throughout. Committed as `2ebc2f0`.
86. **Made the Start/Sit confidence percentage position-aware** — a
    direct follow-up question after item 85 shipped ("how is it possible
    every position is 52% correct — aren't our backtest numbers
    different by position?"). Investigated and confirmed: yes, the
    52%/59%/51% numbers were pooled across every position and season
    combined (item 45's original two-proportion z-test), not broken out
    per position, even though this app's own backtest history has always
    shown real per-position variation.
    - **Pulled real per-position numbers from the existing backtest
      infrastructure** rather than guessing or re-deriving a new
      pipeline: QB/RB/WR/TE from `/api/backtest/broad-nflverse-multiseason`
      (the pooled 2022-2025 nflverse-only route, filtered per position —
      the same pooled cross-season source item 45's original number used,
      just broken out instead of combined), D/ST and K from
      `/api/backtest/broad` on the primary 2025 pipeline only, since the
      nflverse-only pipeline has no D/ST/K support at all (a real,
      disclosed difference in rigor between the two groups — skill
      positions rest on 4 pooled seasons, D/ST/K on one).
    - **Real numbers** (confident/limitedData/closeCall): QB 55/65/45,
      RB 62/60/52, WR 53/61/49, TE 59/56/56, D/ST 64/66/64, K 39/55/50.
    - **A second real bug surfaced by actually pulling the numbers,
      not assumed going in**: the old label text ("limited data — but
      historically our most reliable calls") baked in the POOLED
      ordering (closeCall worst, confident middle, limitedData best) as
      if it were universal. It isn't — RB's confident bucket (62%) beats
      its own limited-data bucket (60%), and K's confident bucket (39%,
      n=31) is the WORST of its three, below a coin flip. Shipping the
      old label text next to the new, correct per-position number would
      have been actively misleading for those positions. Rewrote the
      label copy to stop implying any fixed cross-bucket ranking, letting
      the real number do the honest work instead.
    - New `CONFIDENCE_BY_POSITION`/`POOLED_CONFIDENCE` (fallback only)
      tables in `ComparisonResult.tsx`; `getConfidence()` now looks up
      the recommended player's own position. Verified live: a real QB
      comparison correctly showed 65% (not the old flat 59%) for a
      limited-data pick, a real RB comparison showed 62% for a confident
      pick — two different real numbers where every comparison used to
      show the same one. Committed as `b792069`.
87. **Moved matchup context, injury status, and next-opponent/weather
    out of the sidebar and into each player card directly** — a direct
    follow-up request after item 85 shipped both there (cards) and in
    the sidebar (`MatchupContextPanel`/`InjuryWeatherPanel`, added by
    item 85 itself). Asked one clarifying question first (`AskUserQuestion`):
    move the data out of the sidebar entirely, or duplicate it in both
    places — **user chose moving it out**, no duplication.
    - `MatchupContextPanel`/`InjuryWeatherPanel` deleted from
      `StartSitRail.tsx` entirely (along with their now-unused
      `formatWeather`/`matchupLabel`/`injuryBadgeClasses`/`DOME_ROOFS`
      helpers) — sidebar now holds only `KeyTakeawaysPanel` and
      `RecentComparisonsPanel`. The same real fields
      (`matchupContext`/`injuryStatus`/`nextOpponent`/`nextGameWeather`)
      moved into `ComparisonResult.tsx`'s `PlayerCard` instead, as a new
      section between the stat grid and the per-card "Why this pick."
    - **A real alignment bug was caught and fixed on direct follow-up**
      ("the text where it says forecast not available isn't even with
      weather and not aligned with the opponent/week row above it"): the
      row layout used `items-center`, which vertically centers a label
      against a value that wraps to two lines (e.g. "Forecast not yet
      available") — inconsistent against single-line rows above it, and
      the wrapped value itself was left-aligned within its own box
      rather than flush with the row above. Fixed with `items-start` +
      `text-right` on the value, verified live against the exact
      wrapped-text case that prompted the report.
    - Committed as `cd8525b`.
88. **Unified the roster-import feature into one app-wide sidebar modal,
    fixed a real cross-instance state-sync bug it surfaced along the way,
    and collapsed the Lineup page's roster-slots panel behind a live
    summary** — all from direct user feedback that the Sleeper import
    block was repetitive (rendered full-size on BOTH the Waivers and
    Lineup pages) and took up too much space, plus a specific report that
    the sidebar's scoring indicator "seems broken and doesn't change."
    - **Grounded the advice in the real wiring before proposing
      anything**: the import UI (`SleeperImport.tsx`) rendered in exactly
      two places (`WaiverTool.tsx`/`LineupTool.tsx`); the Trade Analyzer
      never used it (the user's "trade analyzer" was `HomeTradeWidget`, a
      read-only consumer); and the connection/roster were ALREADY global
      state (localStorage hooks), just with a bulky control duplicated per
      tool. So the fix was a re-home, not a rebuild.
    - **Root cause of the scoring-indicator bug — the load-bearing find,
      not the cosmetic one.** `useScoringFormat`/`useSleeperConnection`/
      `useRosteredPlayers` each held their own `useState`, so two hook
      instances (the sidebar vs. a tool page) never synced — a same-tab
      localStorage write doesn't notify other instances (the `storage`
      event only fires in OTHER tabs). The sidebar's scoring chip read its
      own copy and never re-rendered when a tool page's toggle changed the
      format. This is the same class of drift item 60 worked around by
      lifting connection state into `WaiverTool.tsx` — but that only
      covers one page's own children, not a sibling like the shell.
    - **Fixed all three hooks at the root** with one shared module-level
      store (new `src/lib/createPersistentStore.ts`, built on
      `useSyncExternalStore`): every consumer subscribes to ONE value, so
      a write anywhere re-renders every reader in the tab, and a `storage`
      listener keeps separate tabs in sync too. Hook APIs are
      byte-identical (tuple/object shapes unchanged), so no consumer
      needed refactoring — the Home widgets, `PlayerMultiSelect`, both
      tools, and the shell all kept working unmodified. Hydration stays
      safe by deferring the localStorage read to an effect
      (`usePersistentStore`), the same server-default-then-sync discipline
      the per-hook versions used.
    - **The import itself moved into one app-wide modal**: new
      `RosterManager.tsx` (Sleeper connect/sync/change + manual add via
      `PlayerMultiSelect` + Clear via `ConfirmButton`), rendered once by
      `AppShell.tsx` and opened from anywhere via a new in-memory
      `useRosterModal` store (a non-persisted `createPersistentStore` with
      `storageKey: null` — a modal shouldn't reopen on reload). Themed as
      a normal content surface (not the fixed-dark sidebar), so
      `SleeperImport`'s existing token styling renders right in both
      themes; scrim-click and Escape close it.
    - **Three entry points, no duplicated panel**: a compact "My roster"
      status block in the desktop sidebar footer (player count + connected
      league name, next to the now-working Scoring chip); a mobile-only
      top-bar button (`sticky right-0` so it stays reachable while the nav
      scrolls, with a left-fade mask — the sidebar footer is desktop-only,
      so this is how mobile reaches the manager); and a shared
      `RosterSummaryButton.tsx` on the Waivers and Lineup pages ("Your
      roster · N players · Manage") replacing each page's old full-size
      inline `SleeperImport` + roster `CollapsibleSection` block.
    - **Collapsed the Lineup roster-slots panel** the same "reduce space"
      way, but as a page-level `CollapsibleSection` (collapsed by
      default), NOT the shell modal — slot config is Lineup-specific,
      unlike the cross-tool roster. Its header shows a live summary
      (`summarizeSlots`/`totalStarters` in `lib/lineup/rosterSlots.ts`):
      "Roster slots · 9 starters · 1 QB · 2 RB · ..." — verifiable at a
      glance (and reflecting a connected league's real slots without
      expanding), expanding to the full stepper grid only to edit. The
      full shape is dropped on mobile (`hidden sm:inline`), keeping just
      "N starters" on narrow screens; `RosterSlotsEditor` lost its
      now-redundant internal heading.
    - **Verification was tsc + lint only, stated honestly**: another
      chat's `next dev` held Next 16's per-project dev lock (same working
      directory), so a second dev server refused to start and this
      session's Browser tools couldn't reach the other one — and killing
      that server or risking its shared `.next` with a production build
      wasn't worth it. `npx tsc --noEmit` and `npm run lint` clean
      throughout; the user's own running server (on this folder) HMR'd the
      changes for their own visual check.
89. **Re-swept `QB_RUSH_BLEND_WEIGHT` against both pipelines and confirmed
    0.3 is optimal — Open Item #7's premise no longer holds on the current
    engine.** Item 52 flagged (as a side-finding) that pooled 2022-2025
    accuracy seemed to "climb well past 0.3," raising the question of
    whether 0.3 left accuracy on the table or that was an artifact of
    grading 2025 through the nflverse-only pipeline. Swept
    w ∈ {0.0, 0.2, 0.3, 0.4, 0.5, 0.7, 0.9} against the REAL shipped engine
    (config edit + curl of the real `/api/backtest/broad` and
    `/api/backtest/broad-nflverse-multiseason` routes — no reimplemented
    scoring, so no cross-check harness was needed; validated the harness
    reproduces the documented shipped numbers exactly first, primary 2025
    PPR overall 58.69% / QB 61.76%, matching item 70). PPR only: the weight
    is a single format-shared scalar whose curve shape item 52 already
    found identical across formats, and since the decision was "no change,"
    no format needed re-validation regardless.
    - **The premise did NOT reproduce.** On the current engine, POOLED
      accuracy PEAKS at 0.3 and declines above it, rather than climbing:

      | w | pooled overall | pooled QB | primary 2025 overall | primary 2025 QB |
      |---|---|---|---|---|
      | 0.0 | 57.69 | 60.05 | 58.69 | 61.76 |
      | 0.2 | 57.73 | 60.29 | 59.02 | 63.73 |
      | **0.3** | **57.78** | **60.54** | 58.69 | 61.76 |
      | 0.4 | 57.45 | 58.58 | 59.02 | 63.73 |
      | 0.5 | 57.53 | 59.07 | 57.21 | 52.94 |
      | 0.7 | 57.45 | 58.58 | 56.89 | 50.98 |
      | 0.9 | 57.32 | 57.84 | 56.39 | 48.04 |

    - **Why the premise is stale, not wrong-at-the-time**: item 52 measured
      this before item 66 disabled `QB_RUSH_EPA_BLEND_WEIGHT` and before
      item 70 blended FantasyPros expert consensus into `finalScore` at
      0.5. Expert consensus now carries most of the QB score (item 70
      lifted primary QB from 52.9% to 61.8%), which flattened and then
      inverted the QB-rush weight's old upward slope — the landscape the
      item-52 side-finding described no longer exists.
    - **0.3 is the clean pooled peak for both overall and QB**, and
      dominates 0.0 specifically via 2024 (pooled 2024 QB 55.9% at 0.3 vs.
      50.98% at 0.0 — the out-of-sample season the QB-rush term was added
      for in item 30 — with everything else ~equal). The original item-30
      cross-season tradeoff still holds exactly: pooled 2024 QB wants HIGH
      weight (50.98→59.80 across 0.0→0.9) while 2022/2023/2025 QB want LOW
      and crater at 0.5+ — so 0.3 remains the right balanced compromise for
      the same reason it was chosen originally.
    - **Primary 2025 is a noisy plateau across 0.0-0.4** (overall
      58.69-59.02, QB 61.76-63.73 — 1-2 QB pairs of jitter on n=102) then
      collapses at 0.5+ (QB → 48% at 0.9). 0.2/0.4 edge 0.3 on primary by
      1-2 pairs, but pooled and 2024 both prefer 0.3, and chasing a
      1-2-pair small-sample primary peak over the robust pooled signal is
      exactly the "don't trust an isolated peak" discipline this document
      applies elsewhere (items 9/20/38). Not moved.
    - **Decision: no change — `QB_RUSH_BLEND_WEIGHT` stays 0.3**, now
      re-confirmed as the pooled optimum on the current engine rather than
      a legacy item-30 compromise. Answers Open Item #7's question: it's
      neither a real generalization gain to capture nor merely a
      2025-nflverse artifact — the effect it described was overtaken by
      later engine changes. No code changed; the temporary config edits
      were reverted and the curl-driven sweep left no repo artifact (this
      write-up is the only lasting record, same discipline as items
      43/52's own sweep cleanups).
90. **Built the multi-player trade backtest (Open Item #5) — 2-for-2
    validates cleanly; 2-for-1 surfaced a real confound in the tool's
    raw-sum trade valuation.** The live Trade Analyzer (item 47) has always
    accepted any number of players per side (values summed), but only
    1-for-1 synthetic trades were ever backtested (items 48-49). This
    extends it to the two canonical multi-player shapes, CROSS-POSITION
    (the user's explicit call over same-position, via AskUserQuestion —
    matches how the live tool is actually used), pooled 2022-2025
    nflverse-only, cutoffs 1-12 (same range as the 1-for-1 trade backtest).
    - **Construction (the actual design pass #5 called for)**: sides are
      value-balanced by SEASON-TO-DATE average — the neutral basis
      adjacent-rank pairing already uses, deliberately NOT the projection
      being graded (which would leak / circularly bias toward ties). All
      startable skill players pool into one cross-position value ranking
      (points are comparable across positions). 2-for-2 = non-overlapping
      groups of 4 split {rank1,rank4} vs {rank2,rank3} (the exact
      generalization of adjacent-rank pairing — a 1-for-1 is {rank1} vs
      {rank2} — naturally near-balanced). 2-for-1 = each anchor matched to
      the two lower-ranked players whose combined value is closest, within
      `BALANCE_TOLERANCE=0.2`, consumed so trades don't overlap. Grading is
      the direct generalization: predicted-winner side = higher SUMMED
      projection, graded against the side that actually scored more SUMMED
      rest-of-season points. New `backtest/multiPlayerTradeBacktest.ts` +
      route `/api/backtest/trade-multi-nflverse-multiseason`
      (validation-only, no UI, same precedent as the 1-for-1 multiseason
      route); reuses `tradeBacktest.ts`'s now-exported
      `buildOpponentsByTeamWeek`/`projectFromHistory`/
      `actualRestOfSeasonTotal`.
    - **A real methodological confound, caught by spot-checking generated
      trades** (the item-48 discipline — item 48 caught an 8000-point
      projection bug the same way): for UNEVEN-count trades (2-for-1),
      summed-total grading is confounded by count. Two players accumulate
      more total than one over the same remaining games unless each sits
      well below the single's rate — so the larger side tends to win the
      total regardless of quality, AND the engine's summed projection tends
      to favor it. Baked a permanent naive baseline into the result — "pick
      the side with more players" (a no_pick tie on even-count trades) —
      per this project's #1 discipline (never report accuracy without a
      naive baseline, items 2/3).
    - **Results, pooled 2022-2025 (n=1361 trades):**

      | shape | engine | naive "more players" | n |
      |---|---|---|---|
      | 2-for-2 (even) | **55.5%** | n/a (tie) | 863 |
      | 2-for-1 (uneven) | 62.2% | 61.2% | 497 |

      **2-for-2 is the clean, meaningful validation**: 55.5% pooled,
      essentially matching the 1-for-1 trade backtest re-run on the current
      engine (55.0%), every season above chance (50.9/55.8/57.9/57.4). The
      trade analyzer's rest-of-season projection generalizes to balanced
      multi-player swaps about as well as it does to 1-for-1.
    - **2-for-1's 62.2% is NOT a clean skill measure** — it barely beats
      the naive "more players" baseline (61.2%, +1.0pp pooled), and by
      season the engine is genuinely mixed against it: beats it in 2022
      (54.2 vs 47.9) and 2024 (67.6 vs 62.2), LOSES in 2023 (68.0 vs 76.0),
      ties in 2025 (60.5 vs 60.5). A temporary tally (deleted after
      recording, same discipline as every other one-off in this document)
      confirmed the mechanism: the engine picks the larger side ~74% of the
      time while that side wins only ~61% — a systematic bias toward
      over-valuing the side with more players.
    - **This is itself a finding about the shipped tool, not just the
      backtest**: `evaluateTrade.ts` sums per-side value with no accounting
      for the roster spot a consolidation trade frees, so it structurally
      over-values quantity in uneven trades — the backtest faithfully
      validated the tool as built and surfaced that bias. Flagged as a new
      open item (a replacement-level normalization — credit the short side
      with a waiver-level filler for the freed lineup spot — would make
      both the 2-for-1 backtest meaningful AND the live tool's uneven-trade
      verdicts fairer).
    - **Resolves Open Item #5** for the even-count case (validated) and
      documents the uneven-count confound rather than papering over it.
      `npx tsc --noEmit` and `npm run lint` clean; temporary diagnostic
      route/code deleted, the permanent naive baseline kept.
91. **Restructured the Start/Sit player cards to a teammate-provided
    reference layout — presentation only, real fields only, zero new
    signals or fabricated numbers.** A follow-on to items 85-87's Start/Sit
    redesign, `ComparisonResult.tsx`'s `PlayerCard` rebuilt to a fixed
    structure: (1) header = numbered rank circle (mono) + name + pos/team +
    a "Start"/"Bench lean" pill (the existing `recommendedPlayerId` logic,
    not new logic); (2) a color-coded opponent + defensive-rank line; (3)
    the big projection with the floor→ceiling bar's marker moved to our
    projection (`finalScore`); (4) a fixed 2x2 stat grid with magnitude
    bars; (5) context rows (next opponent, weather) with icons, injury/bye/
    data-quality kept as status badges; (6) mono on every number, regular
    font on labels.
    - **Every value is a real, already-computed breakdown field** — no new
      data. Verified live against a real `/api/compare` (WR/RB/QB/TE) that
      each slot populates as the per-position mapping assumes:
      `recentPprAvg`, opportunity (`recentVolumeAvg` — touches for RB,
      targets for WR/TE; `recentQbRushAttemptsAvg` for QB, per the spec's
      "rush attempts for QB", not pass attempts), `snapShareAvg` (real for
      all skill positions, not just TE), and a red-zone-or-drop slot
      (`redZoneTouchesAvg` for RB/QB, `dropRateAvg` for WR/TE). Any slot a
      position genuinely lacks renders "—" (never a fabricated placeholder)
      — `dropRateAvg` is null for QB/RB, and D/ST/K have null volume/snap/
      red-zone signals, so their slots 2-4 dash out honestly.
    - **The projection marker now sits at `finalScore`, not
      `recentPprAvg`** (items 85's marker was the recent average). The
      floor→ceiling band stays the real recent min/max, but the bar's scale
      is EXTENDED to include the projection, so a projection above the
      recent ceiling (real — `finalScore` layers matchup/volume/consensus
      modifiers on top of recent scoring) shows truthfully to the right of
      the band rather than clipping. The small stat bars use fixed
      reference maxima (a visual scale like the confidence bar's 0-100), not
      fabricated data — the displayed number is always the real value.
    - **Caught and corrected an inverted instruction rather than following
      it literally** (the instruction-source-boundary discipline): the ask
      said "color green if the rank number is high (weak defense)," but our
      `positionDefenseTable` rank sorts DESCENDING by points allowed
      (`positionDefense.ts`), so rank #1 = allows the MOST = weakest =
      MOST favorable, and #32 = stingiest. Following the literal instruction
      would have colored tough matchups green. Colored by actual
      favorability instead (`diffFromAverage` via the existing
      `matchupLabel` — favorable=green, tough=red, the ask's true intent),
      and kept the "favorable/tough" word beside the rank so the number's
      direction stays unambiguous. Confirmed live: QB vs NYJ #2 = favorable/
      green (NYJ allows the 2nd-most to QBs), TE vs LV #29 = tough/red.
    - **No engine/scoring change** — `comparePlayers`/`scorePlayer`/
      `finalScore` untouched; this is `ComparisonResult.tsx` only. `npx tsc
      --noEmit` and `npm run lint` clean. Not browser-screenshot-verified
      this session (the other chat's dev server held Next's dev lock), but
      every real-data assumption was verified via the live `/api/compare`
      response and the user eyeballed it on their own HMR'd server before
      committing. Committed as `9cb3a2e`.
92. **Follow-on Start/Sit card refinements — layout + a real "Case For /
    Case Against" split, presentation only, real fields only.** Three
    user-requested tweaks after item 91, all in `ComparisonResult.tsx`
    (plus a two-line rail change), verified live this session on the
    session's OWN dev server (the other chat's had stopped, freeing Next's
    dev lock — so unlike item 91 this was browser-screenshot-verified end
    to end with a real Bijan-vs-Jonathan-Taylor comparison).
    - **Stacked the two player cards** vertically instead of side-by-side
      (`grid gap-4 sm:grid-cols-2` → `flex flex-col gap-4`), and **removed
      the "Key takeaways" rail panel** (`StartSitRail.tsx`'s
      `KeyTakeawaysPanel` deleted along with its now-unused `result` prop
      and the `ComparisonResultData` import; `StartSitTool.tsx` updated to
      pass only `recent`). The rail is now just Recent comparisons.
      `result.reasoning` is no longer surfaced on the page — an accepted
      consequence, the verdict banner + per-card Case For/Against carry the
      reasoning now.
    - **Replaced the collapsible "Why this pick"** (which rendered
      `player.notes`) with a NON-collapsible, two-column **Case For**
      (green header) / **Case Against** (red header), one sentence each.
      Both are generated deterministically from already-computed breakdown
      fields — NOT `player.notes` (which are all positive/context, with no
      "against" side) and not fabricated: `buildCaseFor` picks the single
      strongest real positive in priority order (favorable matchup →
      recent form + ceiling → projection), `buildCaseAgainst` the single
      most relevant real risk (injury → bye → tough matchup → thin data →
      boom/bust floor, with an honest "few red flags" fallback). Rank
      NUMBERS are deliberately omitted from these sentences (the words
      "softer"/"stingier" carry the meaning; the colored opponent line
      already shows the number) — avoids the same rank-direction confusion
      item 91 flagged.
    - **Moved Opponent + Weather up beside the 2x2 metrics grid** (a
      context column under the projection, `sm:grid-cols-[1fr_170px]`,
      stacking on mobile) and **added a new color-coded "Health status"
      line** there: reads the real `injuryStatus` (Out/Doubtful → red,
      Questionable → amber), `isOnByeThisWeek` → "On bye", else "Active"
      (green) — worded "Active" (not "Healthy") to not overclaim, since a
      null injury field means "not injury-listed," not "confirmed 100%".
      The old label-left/value-right `ContextRow` became a stacked
      `ContextItem` to fit the narrow column.
    - **Removed the now-redundant header injury/bye/data-quality badge
      block** (Health status covers injury/bye; limited-data still shows
      in the verdict banner and via Case Against), plus the now-unused
      `injuryBadgeClasses`, `ChevronIcon`, and the `useState` import (the
      card no longer has any collapsible state).
    - **No engine/scoring change** — `ComparisonResult.tsx` +
      `StartSitRail.tsx` + `StartSitTool.tsx` only. `npx tsc --noEmit` and
      `npm run lint` clean; verified live (both cards, no console errors).
      Committed as `b234534`.
    - **Follow-on note (committed separately as `188c9e4`): QB stat grid
      is now a passing profile.** On user request, the QB card's slots 2-4
      (rush attempts/gm, snap share, red-zone rushes/gm — all weak QB
      signals: snap share is ~always near 100% for a starter, rushing is a
      small slice for most passers) were replaced with pass attempts/gm
      (`recentVolumeAvg`), success rate (`successRateAvg`), and EPA/dropback
      (`epaPerPlayAvg`) — the standard QB volume + efficiency + advanced-
      efficiency trio, all already-computed real breakdown fields (verified
      populated for QB in a live `/api/compare` before wiring). EPA is
      signed, so it's shown with an explicit +/- and its bar uses a shifted
      scale (league-average ≈ 0 → ~40% fill, poor ≈ empty, elite ≈ full) —
      the displayed number is always the real value. QB now branches to a
      new `buildQbStatSlots`; the recent-avg slot (slot 1, unchanged) was
      factored into a shared `recentAvgSlot` helper used by both paths.
      RB/WR/TE/D-ST/K grids are untouched; a QB missing any of the three
      still dashes out honestly. Verified live (Josh Allen -0.11 EPA vs.
      Joe Burrow +0.14, correct signs/bars), `tsc`/lint clean.
    - **Follow-on note (committed separately as `928f629`): the "Recent
      comparisons" widget is now clickable — click an entry to re-open
      that comparison.** It was previously read-only. Each stored entry
      now carries its `players` + `scoringFormat` (`useRecentComparisons`),
      so a click restores the exact selection and re-runs it;
      `useRecentComparisons` also de-dupes by player set (re-running a
      matchup moves it to the top rather than stacking a copy). Older
      entries saved before this change parse to an empty `players` array
      and are simply non-clickable (backward-compat), not errors.
      `StartSitTool` factored its fetch into a shared
      `runComparison(players, format)` used by both the Compare button and
      a new `handleSelectRecent`. Works on Home too, cross-page:
      `RecentComparisonsHomeCard` hands the entry off via a new in-memory
      store (`usePendingRestoreComparison` — survives the client
      navigation Home → `/start-sit`, deliberately NOT a hard refresh/new
      tab, so a stale restore never fires on a fresh load) and routes to
      `/start-sit`, which restores it on mount (a `restoredRef` guards
      against React strict-mode's double-invoked mount effect). Verified
      live end-to-end both in-page (rail) and cross-page (Home → Start/Sit
      restored both chips + result); `tsc`/lint clean.
93. **Pointed the live matchup modifier at the NEXT scheduled opponent
    instead of the last completed one — resolving the long-standing
    "next-opponent lookup for live matchup context" candidate improvement
    (see Overview), and bringing the live tool into conformance with the
    already-validated backtest methodology.** Prompted by a user question:
    Bijan's card read "ATL vs NO" while the Falcons actually play PIT in
    Week 1 — because the live matchup rated his *last completed* 2025
    opponent (New Orleans), not his upcoming one.
    - **The key insight that made this safe, not risky**: backtest
      (`buildBacktestInput.ts`) has ALWAYS scored matchup off the target
      week's opponent (the game being predicted) — confirmed by reading
      the code before touching anything. LIVE (`buildInput.ts`) was the
      outlier, scoring off the last *completed* opponent. So every
      accuracy number in this document was validated with the
      next/target-week opponent; this change makes live match that, rather
      than introducing untested behavior. It touches only the live input
      builder — no backtest input changes, so no accuracy numbers move.
    - **The change** (`buildInput.ts`): compute the next scheduled
      opponent first (from the existing `remainingOpponentsByTeam`
      lookup — the same infra the Trade Analyzer and the display-only
      next-opponent card line already used), then build `matchupContext`
      from THAT opponent's `positionDefenseTable` rank, falling back to
      the most recent completed opponent only when the schedule has no
      upcoming game (offseason edge, or genuinely no games left). Skill
      positions only — `positionDefenseTable` is skill-only; D/ST and K
      score matchup off Vegas-implied totals, untouched.
    - **Scope of effect, traced deliberately**: Start/Sit, Waivers, and
      Lineup all score via `scoreExtendedPlayer` → `buildComparisonInput`,
      so all three now rate the *upcoming* matchup (correct). The **Trade
      Analyzer is unaffected** — `restOfSeason.ts` strips `matchupModifier`
      out (`baseRate = finalScore - matchupModifier`) and re-applies a
      fresh one per remaining opponent, so its base value never depended
      on which single opponent `matchupContext` held.
    - **Display follow-through** (`ComparisonResult.tsx`): the opponent
      line now shows the week (`BAL vs IND · Wk 1`) and its def-rank/color
      reflect that upcoming game; the redundant "Opponent" context item
      (which showed the same next opponent) was removed — the context
      column is now just Weather + Health status — and the now-unused
      `CalendarIcon` dropped. Case For/Against automatically reference the
      upcoming opponent now (e.g. "Tough matchup — PIT has been one of the
      stingier defenses against RBs").
    - **Verified live end-to-end** (this session's own dev server): a real
      `/api/compare` confirmed every skill player's `matchupContext.opponentTeam`
      now equals `nextOpponent.team` (Bijan NO→**PIT** #27 tough, Josh
      Allen HOU #30, etc.), and the rendered cards show the upcoming
      opponent + week with correct favorable/tough coloring. `npx tsc
      --noEmit` and `npm run lint` clean.
    - **One honest offseason caveat**: the def-rank behind the upcoming
      opponent is still computed from the last completed season's data
      (2025) during the offseason, since the new season hasn't happened —
      a reasonable proxy that becomes live current-season data once the
      2026 season starts. Also updated the now-stale Overview paragraphs
      that described the matchup as using the last-completed opponent
      (kept as historical record, marked superseded by this item).

94. **Spiked a week-1 backtest (using multi-season + expert projections
    for rookies), found the free FantasyPros data only supports 2 of 4
    seasons, and shipped a stale-snapshot guard that came out of it —
    committed as `c46acca`.** The backtest structurally can't score week 1
    (no in-season prior data: `sliceWeekData`'s `priorRows = slice(0, 0)`
    → empty pool → no pairs; it grades weeks 2-18). User asked whether,
    with 4 seasons loaded, week 1 of season N could be built from season
    N-1 (prior-season averages, item 67) plus FantasyPros' week-1/preseason
    consensus (items 69/70) — with **rookies specifically leaning on expert
    projections** (their only pre-week-1 signal). Confirmed the engine
    would need one small addition for rookies: `expertConsensusModifier` is
    gated on `blendedScore != null` (`engine.ts:291`), and a rookie has no
    recent/season/prior-season average, so expert consensus would never
    apply — it'd need to become the last fallback in the blendedScore
    chain, one rung below item 67's prior-season fallback.
    - **Ran two spikes before committing to any build** (temporary
      diagnostic route, deleted after — same discipline as every one-off
      in this document):
      - **Rookie name-matching: clean.** All 28 test rookies (7 per season,
        2022-2025) name-matched nflverse and had a real per-game average
        (gradeable) — no crosswalk needed, the name join just works.
      - **Week-1 consensus snapshots: only 2 of 4 seasons usable.** The
        dynastyprocess "daily scrape" (item 69's git-history source) has
        multi-month OFFSEASON GAPS: for 2022 and 2024 there were NO commits
        between January and week-1 kickoff, so "latest commit strictly
        before week 1" resolved to the PRIOR season's playoff-era rankings
        (~240 days stale) — confirmed genuinely absent, not a name miss
        (the entire incoming rookie class, e.g. Jayden Daniels in 2024, was
        simply not in the snapshot; only unrelated veterans matched the
        surnames). 2023 (21-day gap) and 2025 (0-day) had fresh, correct
        week-1 snapshots with rookies present (Bijan #5, Jeanty #10, etc.).
        Verified via the GitHub commits API that the scrape resumed right
        at/after week-1 kickoff both years (2022: Sep 8 21:42, after the
        Sep 8 kickoff; 2024: Sep 10, after Sep 5), so ONLY week 1 was ever
        stale — weeks 2-18 always had fresh data.
    - **Verdict on the week-1 backtest itself: shelved, not built.** The
      method is sound (rookies-via-expert-projections works, name-matching
      works), but the free data only supports a 2-season (2023 + 2025)
      week-1 sample — too thin to be worth the build, and the official
      FantasyPros API that could fill 2022/2024 is paid (item 69). The
      rookie engine-fallback change was likewise not made (nothing to
      validate it against at 2-season scale).
    - **What DID ship: a stale-snapshot guard** (`MAX_SNAPSHOT_AGE_DAYS =
      60` in `fantasypros/weeklyConsensus.ts`) — the latent-bug fix the
      spike surfaced. Any snapshot more than 60 days older than the week it
      represents is now treated as no-data instead of blended in (fresh
      snapshots run 0-21 days old, stale ones ~240, so 60 cleanly separates
      them). Verified it fires exactly right: 2022/2024 week-1 now return 0
      (was ~393 stale players), while 2023/2025 week-1 and all week-2
      snapshots are kept. **Zero effect on any existing validated number**
      — the only stale weeks were the two week-1s, which backtesting
      already excludes, so the pooled 2022-2025 PPR backtest is
      byte-identical before/after (overall 57.78%, expert-consensus
      baseline 59.04% / n=2395). The live tool is untouched (it reads the
      current-HEAD snapshot via `getCurrentExpertConsensusByNormalizedName`,
      not this historical commit-mining path). `tsc`/lint clean.

95. **Redesigned the Trade Analyzer result into a "trade desk" — a
    mockup-driven visual overhaul, real fields only, no engine change.**
    User asked for a more impressive, less-simple Trade Analyzer. Built a
    full-page Artifact mockup first (the app's dark/emerald design system,
    condensed `font-display` headline, mono numbers) grounded in the real
    `TradeEvaluation` data, then ported it into `TradeResult.tsx`:
    - **Verdict hero** — a `font-display` headline (verdict-specific
      phrase) + a big mono net-value number, all COLOR-ADAPTIVE by verdict
      (good=emerald, fair=amber/caution, bad=red, unknown=info) via inline
      `var(--TONE)` styles rather than Tailwind classes, so the dynamic
      color needs no per-verdict literal-class map. Plus a value-balance
      meter (proportional give-vs-get bars).
    - **Give ↔ get board** — elevated player cards (avatar initials,
      position badge, big mono rest-of-season total, per-game micro-bar,
      games left), a centered exchange node, a gold `--premium` "Higher
      value" tag on the higher-total side (skipped for fair/unknown), and
      an accent ring on the single most valuable player. Neutral styling
      for the give side, emerald for the get side.
    - **Reasons to accept / Reasons to reject** — on direct follow-up,
      replaced the (verbose, ~28-line) collapsible "Why this verdict" list
      with a two-column, non-collapsible pro/con: green "Reasons to accept"
      + red "Reasons to reject", 1-2 sentences each, generated
      deterministically from the evaluation (net value, side totals, the
      marquee player per side, player counts) — NOT the raw per-player
      reasoning strings. Genuinely two-sided (even a "fair" trade produces
      a real reason for each). Adapts to good/fair/bad/unknown, any
      player-count per side, and null projections. Same Case-For/Case-
      Against precedent as the Start/Sit card (items 85/92).
    - A **summary stat strip** (give / get / net / weeks-left) closes it.
    - **No engine/data change** — `TradeResult.tsx` only; every number is a
      real breakdown/evaluation field. `evaluation.reasoning` (the detailed
      per-player notes) is no longer surfaced in the trade view, an accepted
      consequence of the pro/con replacement. Verified live end-to-end (a
      real Amon-Ra St. Brown + Tony Pollard for Ja'Marr Chase + Jaylen
      Warren trade → "fair"/+7.8, correct amber theming, both pro/con
      columns rendering the right sentences), `tsc`/lint clean. Committed as
      `99577ab`. The mockup's subtle load-in animation was deliberately
      left out to keep the component simple/robust — see Open Item #20.

96. **Redesigned the Home page: a newsletter signup band and a live
    "Top of the board" rankings preview — presentation/growth features,
    real data only, no engine change.** Iterated on a full-page mockup
    (Artifact) through several rounds first, then built the approved
    direction into `src/app/page.tsx`.
    - **Live rankings list** (`HomeRankingsBoard.tsx`): the top 5 Legit
      Scores across all positions, self-fetched client-side from the exact
      same `/api/rankings?position=OVERALL` route the Legit Rankings tool
      uses — mounts and fetches on its own, exactly like the existing Home
      widgets, so a cold-cache rankings computation (which can run several
      seconds) never blocks the rest of the page from rendering. Rendered
      as a single bordered list matching `RankingsResult.tsx`'s row
      pattern (the user picked the list over a card grid): rank → position
      chip → name (+ gold "Elite" tag at 90+) → team · next opponent ·
      favorable/tough label → score bar → Legit Score. The
      favorable/tough labels reuse `ComparisonResult.tsx`'s exact
      `diffFromAverage` thresholds (>1.5 favorable, <-1.5 tough) so the
      word means the same thing everywhere. `matchupContext` rides along
      in the route's JSON — the route returns the full
      `LegitRankingEntry`/`PlayerScoreBreakdown` objects, so the field is
      present even though `RankingEntryResponse`'s own typed slice doesn't
      declare it; the component extends the type locally to read it.
      Verified live end-to-end against the real running app: real data
      (Puka Nacua/Trey McBride 100, Bijan/CMC 99, Burrow 96), correct
      matchup colors, gold elite tier, both light and dark themes.
    - **Newsletter signup band** (`NewsletterSignup.tsx` + a new
      `/api/subscribe` route): occupies the slot an earlier mockup used
      for a backtest-accuracy stat band. The user opted NOT to surface the
      accuracy number publicly (to a layperson ~57% reads as barely better
      than a coin flip even though it's genuinely strong for this problem;
      also a number they'd have to keep current), so the credibility band
      was replaced with the newsletter CTA — the whole app exists to serve
      Legitfootball's newsletter, so a signup hook up top is a natural fit.
      The route is deliberately provider-agnostic: it forwards the email
      to a `NEWSLETTER_FORM_ENDPOINT` env var (a plain POST URL — the shape
      Beehiiv/ConvertKit/Buttondown/Mailchimp hosted-form actions and
      simple APIs accept) and returns an honest "signup isn't connected
      yet" (503) when that env var is unset, rather than faking a
      subscription and silently dropping the email — this app's standing
      "no fake data / show a clear message" rule, applied to a write path.
      The client component only shows its "You're in" success state after
      the route confirms. Verified live: valid email with no provider →
      the honest not-connected message, invalid email → validation error.
    - **Deliberately left unchanged**: the "This week" widget row and the
      six-tool grid. The mockup's Start/Sit-as-hero tool-grid restructure
      was NOT built — it dropped Backtest from the grid and is a bigger
      opinion call — see Open Item #22. The newsletter's actual provider
      wiring is Open Item #21. `npx tsc --noEmit` and `npm run lint` clean.

97. **Tested betting odds as a new signal family (implied team total,
    spread), following the full process — confirmed the data was already
    free, ran standalone + integration tests pooled 2022-2025, shipped
    nothing.** Prompted by a plan to sign up for The Odds API; two things
    reframed it before any signup: (1) creating that account isn't
    something this assistant does — flagged for the user to do themselves
    — and (2) it turned out to be unnecessary. nflverse's `schedules`
    release already carries `spread_line`/`total_line` (closing lines)
    back through 2022, and every proposed test operates on team-level game
    lines (spread + total), which The Odds API would only extend with
    player props / opening-line movement / multi-book — none of which
    these tests need. So the whole family was tested on free,
    already-available data, no signup, no payment (see the Data Source
    Notes on nflverse betting lines and kicker scoring).
    - **Kicker scoring confirmed computable from free data first** (the
      one real unknown): nflverse's `stats_player_week` has K rows with
      full distance-bucketed FG detail but an offense-only
      `fantasy_points` (0 for kickers), so kicker points are computed from
      the buckets — see the Data Source Note.
    - **Standalone tests (pooled 2022-2025, temporary diagnostic route,
      deleted after recording):**
      - **Implied total → K: clears the bar.** 55.1% pooled (n=910),
        every season 52.6-56.2%, beating a same-harness season-average
        baseline (49.8% — kicker season-average is ~chance, the well-known
        low-persistence of kicker scoring) by ~5pp in all four seasons.
        Differs from item 62's single-season SportsDataIO finding (implied
        55.4% vs. a 60.1% season-avg baseline) — that season-avg gap is a
        scoring-source/pool methodology difference between the two
        pipelines; implied total's own ~55%, stable across four seasons,
        holds regardless.
      - **Spread → QB: rejected, as expected.** "Pick the bigger-underdog
        QB" (garbage-time/volume hypothesis) came in at 47.8% pooled
        (favorite direction ~52.2%), swinging 42.7-54.0% across seasons
        and crossing chance both ways — the same cross-season instability
        every other QB-rushing signal has shown (item 26's
        qbRushingAttempts flipped 46.8↔63.0). Matched the user's own
        going-in expectation.
      - **Implied total × usage interaction (skill), deliberately NOT
        standalone** (the user's explicit call — a standalone team-level
        signal already failed once, the pace baseline item 12; don't
        repeat it). "Usage AND implied total agree" vs. "usage alone":
        **TE** was cleanest — agreement 58.5% vs. usage-alone 54.1%
        pooled, beating usage-alone in all four seasons. **WR** was
        positive pooled (55.7% vs. 50.8%) but 2025 broke it; **RB** was a
        2024-carried artifact (59.2% vs. 56.8% pooled, but 2022 inverted).
        Only TE looked worth an integration test.
    - **Integration tests (the real "consider shipping" step) — both
      negative:**
      - **TE interaction, as an additive term on the real engine
        finalScore** (`finalScore + w*(impliedTotal-22.5)*recentTargetShare`,
        the item-74 "reuse real scores, add one term" approach; w=0
        reproduced the real nflverse-only multiseason TE number exactly —
        56.8% pooled, 58.4/55.9/52.5/60.4 — validating the harness before
        trusting the sweep). Sweeping w=0-3: best case 57.3% at w=2
        (+0.5pp, noise), a wash by season (2022/2024 up, 2023/2025 down).
        The full engine already captures the interaction — most plausibly
        through the FantasyPros expert-consensus blend (item 70: a TE on a
        high-total team is already ranked up) plus the matchup modifier.
        Same failure mode as QB success rate (item 33) and teammate bump
        (item 35): real standalone, adds nothing once integrated. Not
        shipped.
      - **K implied-total weight re-sweep: strong on nflverse, doesn't
        transfer to production.** The 4-season nflverse sweep is
        compelling — pure form is *below chance* for kickers (47.2%), and
        accuracy climbs monotonically as implied gets more weight (current
        slope 0.175 → 52.0%; slope 1.0/cap 8.0 → 54.9% pooled, every
        season improving). But K ships on the SportsDataIO pipeline
        (different kicker scoring), and the primary-pipeline check (2025,
        the only season SportsDataIO serves) is a noisy wash across
        weights — 50.7% (slope 0.35) / 52.0% (current) / 52.5% (slope
        1.0), ±1pp on one season with no direction. Exactly the
        cross-pipeline non-transfer item 53 documented for the WR
        ensemble; since production K scoring can't be validated beyond
        2025 and the current 0.175 was itself derived from real 2025
        SportsDataIO data (item 62's OLS), retuning to the nflverse result
        would be tuning to the wrong pipeline. **User chose to hold** at
        0.175/2.0 rather than ship an unvalidated bump — see Open Item
        #23. Config reverted; no change.
    - **Net: nothing shipped** — the process worked as designed
      (standalone promise → integration/cross-pipeline checks → hold).
      Both temporary diagnostic routes deleted after recording numbers,
      same discipline as items 22/29/34/38. Item 62's shipped K
      implied-total modifier is *validated* (not changed) by the 4-season
      standalone result; the lasting artifacts are this write-up and the
      two Data Source Notes (nflverse betting lines / kicker scoring).

98. **Added display-only player props to the Start/Sit cards (The Odds
    API free tier) — a live market-context feature, not a model signal.**
    Follows item 97's finding that a *backtested* odds signal needs paid
    historical data; this is the free-tier-viable alternative the user
    chose: show current sportsbook props on each card, visual only ("even
    if it's just visual and not built into the model yet").
    - **Probed the free tier first** (temporary route, deleted) rather
      than assume what it exposes: the full upcoming schedule (events
      endpoint, free/0 credits, carries all 272 of the 2026 season's
      games), current game props (endpoint works but **empty in the
      offseason** — 0 of the first 12 lined 2026 games had props ~6 weeks
      out; books post props days before kickoff), historical odds
      **paid-gated** (explicit 401 `HISTORICAL_UNAVAILABLE_ON_FREE_USAGE_
      PLAN` — so no backtested signal, ever, on free), and a
      500-requests/month quota (events free; each event's props ≈ ~6
      credits). See the new Data Source Note.
    - **New `src/lib/oddsapi/`** (server-only, fail-open, aggressively
      cached to protect the quota): `client.ts` (reads `ODDS_API_KEY`
      from env — never committed, same discipline as `SPORTSDATA_API_KEY`
      — in-process TTL cache), `props.ts` (fetches upcoming events +
      per-event props, joins to our players by `normalizePlayerName`,
      position-scoped markets — QB pass yds/pass TDs/rush yds, RB rush
      yds/receptions/anytime TD, WR·TE rec yds/receptions/anytime TD; a
      SportsDataIO-code→Odds-API-full-name map finds each player's game),
      `types.ts` (plain display types with NO `server-only` import, so
      the client card can `import type` them without pulling server code
      into the bundle — confirmed by a clean production build).
    - **Display-only wiring, kept off the scoring path entirely**:
      `/api/compare` fetches props once per comparison and returns a
      separate `propsByPlayerId` map (never on `PlayerScoreBreakdown`);
      `ComparisonResult.tsx` renders a "Betting lines" section on skill
      cards, last (below Case For/Against), labeled "Market lines — shown
      for context, not part of our projection." Always rendered for
      QB/RB/WR/TE with an honest empty state ("Sportsbook lines post
      closer to kickoff…") so the placement is visible even in the
      offseason — the same "section exists, data pending" treatment the
      card already gives weather (added after the user noted the page
      "looks the same as before," since a hidden-when-empty section is
      invisible for the ~6 weeks until props post). D/ST and K are
      excluded (no meaningful props, and this is skill-position
      start/sit).
    - **Verified what the offseason allows, honestly**: the pure parser
      (`extractPlayerLines`, factored out of the fetch for testability)
      against a realistic Odds-API-shaped fixture — all three position
      groups, both anytime-TD outcome shapes (Yes/No-with-description and
      name-only), and an unmatched player (returns empty) — all correct;
      the live `/api/compare` returns `propsByPlayerId: {}` gracefully
      (offseason) with the comparison unaffected; a throwaway preview
      page (deleted) rendering the real card with sample data confirmed
      both the populated and empty states render correctly; `tsc`, lint,
      and a full production build all clean. **The one thing not
      verifiable now**: the populated card with REAL data, since no props
      exist yet — it gets its first real-data test when Week-1 lines post
      (~September 2026); fail-open means a parse/join bug there shows
      nothing (graceful), not a break. (The in-app browser's known
      click-desync blocked driving a live comparison in the tool; a real
      browser drives it fine.)
    - **Not in the model** — display only, per the user's explicit scope.
      A props-derived *signal* (a passing-yards or rush-attempt prop is a
      more direct usage signal than target share) would need paid
      historical data to backtest — see Open Item #24.

99. **Redesigned the shared player picker (`PlayerMultiSelect.tsx`) —
    presentation only, every tool upgraded at once.** The search/select
    panel (used on Start/Sit, Trade, Waivers, Lineup, Backtest — item 81)
    read as too plain: a bare input plus a text-only dropdown. Mocked up
    an improved version (Artifact) first, then built the core into the
    shared component (props interface unchanged, so all six tools got it
    simultaneously).
    - **Position-colored initials avatars** — new `--pos-qb/rb/wr/te/k/dst`
      tokens in `globals.css` (both themes), deliberately OUTSIDE the
      semantic set (accent/good/bad/caution) so a position color never
      reads as "good/bad." A violet/teal/blue/rose system for QB/RB/WR/TE,
      used as a scanning cue on the avatar tile and the position badges.
    - **Richer dropdown rows** (avatar + name + colored position pill +
      team + injury pill + a hover "Add" affordance), **a real search
      field** (search icon, emerald focus ring), **a slot-dot counter**
      (filled dots + "N of max"), and **selected players as cards** (with
      the position avatar) instead of the prior tiny chips.
    - **Headshots tried, then reverted on user feedback.** The
      `/api/players` response already returns `photoUrl` (real
      SportsDataIO headshots), and a first pass layered them over the
      initials tile (onError → fall back to initials). They loaded fine
      in a real browser, but the low-res S3 images were too muddy to be
      worth showing — reverted to the position-colored initials tile,
      keeping everything else. (`photoUrl` is still on the type for a
      future higher-res source.)
    - **Deliberately deferred** (need more than styling — see Open Item
      #25): inline season PPR average in results (the search API returns
      no stats today) and a "quick-add" empty state (the shared component
      has no per-tool "recent/popular" feed; Start/Sit's own Recent
      comparisons would be the natural wire-up, not a fabricated list).
    - **Verified live both themes** via the real `/start-sit` dropdown
      with real player data (position colors, badges, search field all
      correct); the selected-card state renders but wasn't screenshotted
      (the in-app browser's click-desync blocks driving add-to-select — a
      real browser does it fine). `tsc`, lint, and a full production build
      all clean.

100. **Made the Start/Sit pick + confidence player-aware — a ranking
    guardrail (b) plus gap-calibrated confidence (a).** Prompted by a user
    asking whether confidence could account for the specific players
    ("Lamar Jackson should be a lock over someone like Josh Johnson").
    Checking the live tool exposed two problems: the engine actually
    *recommended* Josh Johnson (a deep backup — finalScore 12.8 vs Lamar's
    8.6), and confidence was a flat ~55% bucket that couldn't reflect how
    lopsided the matchup was. The mis-rank was a three-cause offseason/
    limited-data pileup: the volume signal (0.9 weight) crushed Lamar's low
    pass-attempt volume (−7.0), while Johnson's garbage-time attempts
    (+2.2), a FantasyPros-snapshot presence Lamar lacked (+1.0 expert
    consensus), and a friendlier matchup inflated him.
    - **(b) Ranking guardrail — tried the obvious fix, backtested it, and
      it failed twice.** Down-weighting the volume signal on thin data (the
      intuitive "lean on season average when the recent window is thin"):
      swept it and found it REGRESSED the backtest's limited-data bucket
      (60.4%→58.7% at factor 0.5) — the volume signal is genuinely
      net-helpful even on thin samples for the CLOSE pairs the backtest
      measures — AND didn't even fix the case (Johnson still edged Lamar,
      since the flip is multi-cause, not just volume). Lesson: any
      thin-data-WIDE suppression aggressive enough to flip a blowout also
      damages the close calls that rely on those signals. What makes the
      Lamar case different isn't "thin data" — it's the huge SEASON-LONG
      gap between the two players, a *pairwise* property a per-player score
      can't see.
    - **The guardrail that worked is comparison-level and cause-agnostic**
      (`compareBreakdowns`): if another candidate beats the finalScore
      leader by BOTH ≥1.6× and +5 pts on season-to-date average AND the
      comparison involves limited recent data, fall back to the season-long
      favorite (with an explanatory note; the raw projections stay honest,
      only the pick is overridden — same pattern as the existing bye/injury
      overrides). Both thresholds required so it only fires on a genuine
      star-vs-scrub gap. **Verified byte-for-byte no-op on the pooled
      2022-2025 backtest** — adjacent-rank pairs have similar season
      averages by construction, so the trigger never fires there; it only
      acts on the lopsided pairs it exists for. Fixes Lamar-vs-Johnson
      (now recommends Lamar) and doesn't misfire on two comparable starters
      (Lamar vs Josh Allen, 1.3× season gap → ranks Allen normally).
      `SEASON_GAP_GUARDRAIL_RATIO`/`_ABS` in config.ts. Not backtest-tunable
      (it doesn't fire on the test set) — a conservative, reasoned safety
      rail. Committed `aefad1a`.
    - **(a) Gap-calibrated confidence.** The old confidence (item 86) maps
      three coarse flags to per-position accuracy — but those were measured
      on adjacent-rank (deliberately close) pairs, so there's no "blowout"
      bucket and a lopsided call can't read as confident. Backtested a
      gap→accuracy curve instead: all-pairs within each week's startable
      pool (not just adjacent), pooled 2022-2025, bucketed by the actual
      |finalScore gap|. Clean and monotonic — 51.9% at gap 0-1, 56.8% at
      2-3, 65% at 4-6, 70% at 6-9, up to 79% at 13+. So the projection gap
      is a genuinely well-calibrated confidence signal. `GAP_CONFIDENCE_CURVE`
      (piecewise-linear) now drives the confidence %, returned as a new
      `confidence` field on `ComparisonResult` and read by the UI. For a
      guardrail pick the finalScore gap favors the OTHER player, so
      confidence there feeds the SEASON-long gap through the same curve
      (Lamar's 11.6-pt season gap → 76%). Honest ceiling ~79% for two
      rosterable players, so the reference bar's "Lock" (90%) marker
      essentially never lights up — our picks genuinely aren't 90%+ even on
      blowouts. Old 3-bucket logic kept as a fallback. Verified live:
      Lamar-vs-Johnson 76%, Lamar-vs-Allen (8.3-pt gap) 71%, a toss-up
      ~52%. Committed `026efa5`.
    - **Deliberately pooled, not per-position** (unlike item 86's buckets)
      — the by-position gap curves were similar and monotonic, and the
      pooled curve is cleaner/better-populated; per-position is a possible
      refinement (Open Item #26). `tsc`, lint, and a full production build
      all clean throughout.
    - **Follow-on (committed `90151e1`): depth-chart confidence floor — "a
      backup should never be close to a starter."** The gap curve tops out
      ~79% because it's calibrated on *startable-pool* pairs; a genuine
      starter over a deep backup is a higher-confidence regime than any
      startable comparison, and the season-gap guardrail fixes the *pick*
      but confidence still read only ~76%. Added a live depth-chart signal:
      `getCurrentDepthChartRankByNormalizedName` reads the LATEST snapshot
      of nflverse's `depth_charts` release — the 2025+ ESPN-scrape schema
      (keyed by `dt`/`pos_abb`/`pos_rank`) that
      `getDepthChartByNormalizedNameWeek` deliberately can't use for the
      backtest (snapshot->week mapping is leakage-prone, item 37), but
      "who's the starter right now" needs no such mapping — just the most
      recent snapshot. Confirmed live: Lamar = BAL QB1, star RB/WR/TEs rank
      1, deep backups (journeyman QBs like Josh Johnson) absent entirely
      (so "not on the chart" is itself a backup signal). The `/api/compare`
      route resolves it to a `playerId -> rank` map and passes it to
      `compareBreakdowns` (a new optional param), which floors confidence to
      `DEPTH_STARTER_CONFIDENCE` (90) when the pick is a rank-1 starter and
      the best alternative is a clear backup (rank >= 3, or off-chart AND
      >= `SEASON_GAP_GUARDRAIL_ABS` behind on season average — the latter
      guards against a name-match miss looking like a scrub). Verified:
      Lamar-vs-Johnson now 90%, Lamar-vs-Allen (two starters) stays 71%
      (floor doesn't apply). **No-op on the backtest by construction** —
      depth rank is live-only (the map is omitted in backtest) and the
      floor only touches the confidence number, never the pick or the
      confidence *buckets* the backtest measures. SportsDataIO depth charts
      were checked first and are paywalled (401 on the `scores` product).
      Two caveats: the `depth_charts` file is large (~554k rows), so the
      first live request cold-loads it (cached 24h after); and it reads the
      last-completed season's file (fine in the offseason — the 2025 file
      already carries a March-2026 snapshot — season-rollforward a future
      refinement, Open Item #26).

101. **Fixed injury-poisoned OFFSEASON projections by backfilling the
    recent-form window to the last N games actually PLAYED — gated to the
    offseason after the backtest showed a blanket version isn't a win.**
    User report: Lamar Jackson projected only ~8 points for Week 1, "way
    too low." Root-caused against his real 2025 game log (pulled directly
    from SportsDataIO, not assumed): the recent-form window is a fixed
    last-4-CALENDAR-weeks window (weeks 15-18), and Lamar was **Out** weeks
    5-8 and 17 and clearly limited weeks 15-16 (12 and 10 pass attempts —
    roughly half a healthy starter's ~30). So his window was three
    half-games at ~13 attempts; his genuinely healthy games (weeks 9-14,
    23-35 attempts) sat just outside it. The `blendedScore` (14.6) was
    fine — the entire collapse to 8.6 was `volumeModifier = -7.05`, the
    0.9-weight volume signal reading 13 attempts and concluding "expect ~7
    points." (Mahomes was worse: only 1 of the last 4 weeks played,
    projected 12.0.)
    - **Tested the fix in the backtest FIRST, at the user's explicit
      request, before applying anything.** Temporarily changed
      `weekData.ts`'s `recentGamesByPlayer` from "last 4 calendar weeks
      played" to "last 4 games actually PLAYED over a 2x lookback"
      (backfilling past injury gaps) and re-ran both pipelines:

      | | overall | QB | RB | WR | TE |
      |---|---|---|---|---|---|
      | Primary 2025 before | 58.76 | 61.76 | 58.62 | 58.33 | 56.44 |
      | Primary 2025 after | 58.48 | 59.80 | 59.61 | 59.31 | 57.43 |
      | Pooled 22-25 before | 57.78 | 60.54 | 58.99 | 55.67 | 56.79 |
      | Pooled 22-25 after | 57.73 | 58.58 | 58.13 | 56.90 | 57.78 |

      **A blanket backfill is not a win**: overall flat (-0.05 to -0.28pp),
      WR/TE +1pp, RB mixed, and QB **-2pp in both** — the exact position
      the motivating case (Lamar) is.
    - **The reason is a genuine regime mismatch, not noise** (QB's -2pp is
      directionally consistent across both pipelines, on a decent sample):
      the backtest predicts the *immediate next week*, when a player who
      missed recent games is very often STILL hurt/limited — so those
      half-games genuinely predict it, and backfilling with older
      pre-injury games misleads (QB, where mid-season injuries like Lamar's
      dominate, regresses most). The live OFFSEASON case is the opposite:
      projecting Week 1 months after the injury healed, the injured tail is
      stale noise and the pre-injury healthy games are the right baseline.
      In broad backtest mode every paired player played the target week, so
      "recently injured but now fully recovered" can't be isolated from
      "recently injured and still ramping" — the two are fused, which is
      why gating the backtest version on current health wouldn't have
      recovered the QB loss either. The backtest structurally can't
      represent the healed-months-later regime, so it under-credits the fix
      for exactly the case raised.
    - **Reverted the backtest experiment** (working tree left clean, same
      discipline as every other one-off in this document) and shipped a
      **LIVE-ONLY, offseason-gated** version instead — the only regime the
      backtest can't validate, so applying it there has zero in-season risk
      and cannot regress any backtest number. `buildInput.ts` gates on
      `!context.isInSeason`: in-season, the recent window stays the exact
      calendar-window behavior the backtest validates; in the offseason, it
      becomes the player's last `RECENT_WEEK_COUNT` (4) games actually
      played over a `2*RECENT_WEEK_COUNT` (8-week) lookback.
      `getRecentGameStatsForPlayer` (`weeklyStats.ts`) gained an optional
      `limit` param that returns only the last N played games from a wider
      lookback (omitted by every other caller — kicker/defense/rankings/
      waivers — so their behavior is unchanged). Also aligned the nflverse
      recent-signal window to the exact games `recentGames` used (so the
      backfill's older games carry their nflverse signals too, and the two
      windows never diverge) — a structural no-op in-season for a healthy
      player, since their played weeks ARE `context.recentWeeks`.
    - **No-op for healthy players by construction**: a player who played
      all of the last 4 weeks has "last 4 played" == "last 4 calendar
      weeks," so the backfill changes nothing. Verified live: Jonathan
      Taylor (healthy) unchanged at 16.9 / `full` data quality, while Lamar
      went 8.6 -> 11.7 (window backfilled to weeks 14/15/16/18, recent
      volume 13.3 -> 18.75) and Mahomes 12.0 -> 16.75. Trade route still
      correct; `tsc`/lint clean.
    - **The window fix only gets Lamar partway (to ~11.7), deliberately.**
      His residual drag is a SEPARATE, pre-existing issue — the
      pass-attempts-only QB volume signal structurally undervalues rushing
      QBs (item 24) — not the injury poisoning this item fixes. Kept out of
      scope rather than conflated.
    - **Scoped to the live scoring path** (`buildComparisonInput` ->
      `scoreExtendedPlayer`), so it covers Start/Sit, the Trade Analyzer,
      and the Lineup Optimizer. Legit Rankings and Waivers use their own
      bulk recent-week fetch and would still rank an injured player low for
      the same reason — deliberately left untouched this pass (see Open
      Item #27).

102. **Extended item 101's offseason injury-window backfill to Legit
    Rankings and Waivers (resolving Open Item #27), and extracted the
    offseason/lookback logic into one shared helper along the way.** The
    key finding, verified before writing much code: both tools' actual
    SCORING was ALREADY fixed transitively by item 101 — Legit Rankings
    scores every player through `scoreExtendedPlayer` -> `buildComparisonInput`
    (item 78), and Waivers' surfaced-candidate detail (`buildWaiverReport`)
    and drop suggestions (`suggestDrop`) do too. What remained was each
    tool's OWN bulk recent-week scan, which never went through
    `buildComparisonInput`.
    - **New shared helper `recommendation/recentWindow.ts`** (`getRecentWindow`
      / `takeRecentPlayed`) — one source of truth for the "in-season =
      last few calendar weeks; offseason = last N games actually PLAYED
      over a 2x lookback, gated on `isInSeason`" rule that item 101 had
      inlined in `buildInput.ts`. `buildInput.ts` was refactored to use it
      (verified a byte-for-byte no-op: Lamar still 11.69 post-refactor).
    - **Legit Rankings**: `filterByRecentGames` (the eligibility gate,
      `MIN_RECENT_GAMES=1`) now counts played games over the wider
      offseason window instead of just the last 4 calendar weeks. This
      surfaced a real, previously-INVISIBLE bug: **Jayden Daniels** (an
      elite QB, injured late in 2025) was being **excluded from the QB
      rankings entirely** for having zero games in the narrow last-4-weeks
      window — even though his scoring would have been fine. He now
      correctly ranks QB #6 (legit 81, carried by the FantasyPros
      season-consensus blend since his own engine snapshot is still
      `limited`/injury-thin — exactly the blend item 78 built for this).
      Widening the eligible pool re-normalizes the min-max legit scores
      (e.g. Burrow 96 -> 88) — not a regression but a fuller, more correct
      pool. Only the weeks widen; the per-player `limit` is irrelevant to a
      `>= 1`-game eligibility count.
    - **Waivers**: `rankCandidates.ts`'s candidate-ranking window (its own
      opportunity-vs-production + efficiency-floor scan, genuinely separate
      from `scoreExtendedPlayer`) now fetches the wider offseason window and
      keeps each player's last N games actually played (`takeRecentPlayed`),
      so a candidate isn't ranked off injury-thinned half-games. Verified
      the route still returns full, sane candidate lists per position.
    - **In-season no-op by construction** for all three (getRecentWindow
      returns `{weeks: recentWeeks, limit: null}` in-season, which reduces
      each call site to its exact prior behavior) — so, like item 101, this
      changes only the offseason regime the backtest can't represent and
      touches zero validated numbers. `tsc`/lint clean.

103. **Investigated the "pass-attempts-only volume undervalues rushing
    QBs" problem (item 24) through the calibration lens — found the
    premise doesn't hold, root-caused the real offseason symptom to
    FantasyPros coverage, and built an offseason redraft-consensus fix
    instead of touching the volume signal.** The ask (prompted by Lamar
    Jackson's low Week-1 projection) was to boost rushing QBs the
    pass-attempts-only volume signal undervalues. Measured FIRST, per the
    item-65/66 discipline — "projected too low" is a calibration/bias
    question, not a pick-accuracy one (pick accuracy is already optimized,
    item 89).
    - **The premise doesn't hold.** Projection Accuracy mode (2025, PPR,
      per-QB bias) shows rushing QBs are already OVER-projected: mean bias
      **+2.31** vs pocket passers +0.24, and every well-sampled rushing QB
      is neutral-to-over (Lamar +2.30, Hurts +2.78, Allen +1.30, Daniels
      +3.82; only rookies Maye -0.85 / C. Williams -0.24 slightly under).
      The 0.3-weight rush term (item 30/89) plus the 0.5-weight FantasyPros
      consensus blend (item 70) already over-compensate for the
      pass-attempts-only signal — boosting volume further would WORSEN QB
      calibration. So the volume-signal change was NOT built (a documented
      rejection, the same "measure before shipping" discipline as items
      53/89). This is the classic ranking-vs-calibration split (items
      65/66): two rushing QBs still rank correctly relative to each other
      even while both point estimates run a touch high.
    - **The real cause of Lamar's low LIVE number was FantasyPros
      coverage, not the volume signal.** The live consensus path
      (`getCurrentExpertConsensusByNormalizedName`) reads the CURRENT
      weekly snapshot (`fp_latest_weekly.csv`), which in the offseason is
      frozen at last season's final week (dated 2025-12-30) — and Lamar,
      injured at season's end, ISN'T IN IT (Tyler Huntley is listed as
      Baltimore's starter, confirmed by pulling the raw file). So his
      0.5-weight consensus stabilizer was silently `null` live, while
      in-season and in the backtest (which use per-week snapshots when he's
      healthy and ranked) it fires and he's fine. That's the whole gap:
      injured at season's end -> absent from the frozen final snapshot ->
      no consensus rescue live.
    - **Fix (`fantasypros/liveConsensus.ts`): in the offseason, feed the
      live consensus from FantasyPros' CURRENT season-long REDRAFT
      rankings** (`db_fpecr_latest.csv`, dated 2026-07-31, forward-looking
      for the upcoming season — already read for Legit Rankings via
      `seasonProjections.ts`) instead of the stale weekly snapshot. The
      redraft file is rank-only (no `r2p_pts`), so each player's redraft
      position rank is converted to a points estimate via the weekly
      file's OWN rank->`r2p_pts` curve (the per-rank points scale is
      time-stable — QB5 ~ 19-20 — even when the snapshot's player->rank
      assignments are stale, so it's a valid bridge).
      `getLiveExpertConsensusByNormalizedName(context)` is the single gated
      entry point (weekly in-season, redraft in offseason, same isInSeason
      gate as item 101's `getRecentWindow`).
    - **Wired into the five SCORING routes** (compare/trade/lineup/
      waivers/trade-suggestion) via that one entry point. **Legit Rankings
      deliberately EXCLUDED** — it already has its own tuned redraft blend
      (item 78's `ENGINE_WEIGHT`, calibrated assuming the offseason engine
      snapshot has no consensus); feeding offseason consensus into its
      engine snapshot too would double-weight redraft and distort that
      tuning, so it keeps the weekly path.
    - **Backtest-neutral by construction**: the backtest uses the
      HISTORICAL per-week consensus path
      (`getExpertConsensusByNormalizedNameWeek`), never this live
      current-snapshot path, so zero backtest numbers move; the consensus
      term's 0.5 weight is already validated (item 70). In-season is a
      clean no-op branch. Verified live end-to-end: Lamar 11.7 -> **16.49**
      (consensus r2p 21.3, +4.81 modifier), Ja'Marr Chase 20.87 (22.7),
      Bijan Robinson 21.39 (22.0), Brock Bowers 13.34 (15.8) — all
      sensible across positions. `tsc`/lint clean.
    - **Resolves the long-standing item-24 concern in understanding**:
      the pass-attempts-only volume signal is left as-is deliberately —
      it's not a net-undervaluation once the rush term + consensus blend
      are accounted for, and the data says re-tuning it would hurt.

104. **Fixed a whole-app player-availability gap surfaced by a FantasyPros
    consensus coverage audit: PUP/IR/NFI players were silently excluded
    from every tool.** Ran a coverage audit (temporary diagnostic route,
    deleted after — same discipline as every other one-off in this
    document) checking whether FantasyPros-ranked players actually join
    into the app's player set. Two findings:
    - **The name-join is HEALTHY** — every relevant-rank miss was a simple
      would-match name (George Kittle, Stefon Diggs, Alec Pierce…), no
      apostrophe/suffix/nickname `normalizePlayerName` bugs. Relevant-rank
      match rate was 95-100% (redraft) / 87-97% (weekly), and the shortfall
      wasn't the join.
    - **The real bug**: `getActivePlayers()`/`getActiveExtendedPlayers()`
      filtered to `Status === "Active"`, which drops SportsDataIO's
      `Physically Unable to Perform` / `Injured Reserve` / `Non Football
      Injury` designations. In the offseason those are routine camp/roster
      tags on real rostered players — so **George Kittle** (PUP, SF — an
      elite TE), Alec Pierce (PUP), Zach Charbonnet (PUP), Ricky Pearsall
      (IR) and ~25 others were entirely absent from search, comparison,
      Legit Rankings, and lineup. Confirmed against SportsDataIO's raw
      `/Players` Status distribution (Active 880, Inactive 1113, PUP 10, IR
      14, NFI 5, Exempt/Left Team 1).
    - **Fix (`players.ts`)**: a shared `isRosterable` predicate —
      `Status === "Active" OR (Status ∈ {PUP, IR, NFI} AND Team != null)` —
      used by both `getActivePlayers` and `getActiveExtendedPlayers`. An
      `Inactive`/no-team player (unsigned free agent, e.g. Stefon Diggs)
      stays excluded, as does `Exempt/Left Team`. Applied unconditionally,
      NOT offseason-gated: in-season startability is already handled by the
      engine's Out/Doubtful injury exclusion + thin-data handling, so an IR
      player appearing in search/rankings is harmless (flagged and
      low-ranked), and gating would add complexity for no real benefit.
    - Flows to every surface at once (search, Legit Rankings, waivers,
      lineup) since they all read these two functions.
      `hasLimitedTeammate`/`getAnyPlayerById` use the unfiltered
      `getAllPlayers`, unaffected.
    - **Verified live**: Kittle/Pierce/Charbonnet/Pearsall now searchable
      (were NONE before); Diggs (unsigned FA) still correctly excluded;
      Kittle now ranks Legit **TE #7** (was absent entirely) and compares
      with real backfilled recent data (`dataQuality` full — his 2025
      games, via item 101's offseason backfill) plus real redraft consensus
      (item 103). `tsc`/lint clean.

105. **Floored and bounded `finalScore` — fixing a real thin-sample
    projection pathology (down to -37 points) the live tool could expose,
    while leaving pick accuracy byte-identical.** Item 65 flagged negative
    projections; item 66 fixed the worst offender (qbRushEpa) but the
    general "no modifier except matchup is bounded" issue stayed open
    (Open Item #12). Measured the actual distribution first (temporary
    diagnostic route, deleted after — same discipline as every one-off in
    this document):
    - **In the startable pool** (the projection backtest's own scope,
      n=1224): already clean post-item-66 — min finalScore 4.9, ZERO
      negatives. So the pool-based projection mode never saw a problem.
    - **Unrestricted** (every played skill player the live tool lets a
      user pick, n=6230): **7.4% (462) projected NEGATIVE, down to
      -37.1.** Driver confirmed by elimination: NOT the volume signal
      (legit ±7) but `dropRateModifier` — its big
      `POINTS_PER_DROP_RATE_UNIT` (182.75) factor applied to a fluky
      1-target drop rate on a deep WR, the exact uncapped-big-factor bug
      class item 66 fixed for qbRushEpa, invisible to the startable pool
      (where samples are real).
    - **Fix**: a single clamp at the end of `scorePlayer` —
      `finalScore ∈ [max(0, blendedScore - CAP), blendedScore + CAP]`,
      `FINAL_SCORE_DEVIATION_CAP=15` in `config.ts`. Floors skill fantasy
      points at 0 (never negative) AND bounds how far the whole modifier
      stack can move the projection from the recent/season-form baseline
      (blendedScore). Deliberately caps the AGGREGATE deviation, not
      individual modifiers — so no validated weight (volume 0.9, dropRate
      0.2, etc.) is touched, and dropRate itself (fine in the pool) is
      left alone; the pathology is only ever a thin-sample artifact.
      Skill-only by construction: D/ST and K use their own scorers
      (scoreDefense/scoreKicker) and can legitimately go negative.
    - **Why 15**: the startable pool never deviates more than ~8 points
      from blendedScore, so a 15-point cap never engages for a realistic
      player — making it a PROVABLE no-op for the backtest while still
      clipping the -37 pathologies.
    - **Verified**: unrestricted negatives 462 -> 0, min -37.1 -> 0.0,
      legitimate range unchanged (median 4.9, max 29.7). Both headline
      backtests byte-identical after the change — primary 2025 broad
      58.76% (QB 61.76 / RB 58.62 / WR 58.33 / TE 56.44) and pooled
      2022-2025 57.78% (QB 60.54 / RB 58.99 / WR 55.67 / TE 56.79) —
      confirming zero pick-accuracy impact. `tsc`/lint clean. Resolves the
      finalScore-floor half of Open Item #12 (D/ST/K projection grading
      and the multi-season/format projection-mode extensions there remain
      open).

106. **Tested dome / home-away / rest game-context signals standalone
    (pooled 2022-2025) — the one genuinely-untested signal family in this
    document — and closed it as a documented negative finding: none clears
    the bar, and the one strong number is a confound.** All three come from
    nflverse's `schedules` release games.csv (`roof`, `home_team`/
    `away_team`, `home_rest`/`away_rest`), tested the same way as every
    other standalone baseline (adjacent-rank startable pairs, favor the
    player with the favorable context when the pair differs), via a
    temporary diagnostic route that reused the real nflverse-only pipeline
    (loader + `buildAllPairsForWeek`), deleted after recording the numbers.
    - **Results (pooled standalone accuracy):**

      | signal | ALL | QB | RB | WR | TE |
      |---|---|---|---|---|---|
      | indoor (dome/closed) | 52.6% | 53.3% | 50.6% | 54.5% | 52.0% |
      | home | 51.8% | 59.3% | 53.4% | 47.4% | 50.0% |
      | rest (more days) | 49.7% | 48.2% | 54.8% | 47.2% | 45.6% |

    - **The two mechanistically-clean, cross-season-STABLE signals are too
      weak.** WR indoor (54.5%, positive all four seasons — passing plays
      better indoors) and RB rest (54.8%, positive all four seasons — rest
      helps a workload back) are both real but modest, and WEAKER than
      signals the engine already has (recentVolume 56.6%, expertConsensus
      57-60%). Per this document's repeated finding (items 33/35), a ~54%
      standalone signal adds nothing once blended into the already-tuned
      score.
    - **The one strong number — QB home 59.3% — is almost certainly a
      confound, not a home-field effect.** On the SAME home games, QBs
      overperform (59.3%) but WRs UNDERperform (47.4%, below chance every
      season). A real home-field scoring boost would lift both — they share
      an offense. That contradiction is the exact "team-level signal is
      blind to individual role" failure that sank the game-script baseline
      (item 12); the QB number also dips to 48.9% in 2022, the cross-season
      instability repeatedly rejected elsewhere (items 26/34). WR rest
      shows the same swing (41.1% in 2022 to 55.8% in 2025).
    - **The genuinely useful part is already captured.** Home field, dome,
      and rest are all priced into the Vegas implied team total, and item
      97 already found implied-total×usage mostly redundant with the
      expert-consensus blend for skill positions — so even the real bits
      would be near-orthogonal-to-nothing on integration.
    - **Not integrated — closed as a documented standalone finding**, same
      discipline as items 12/34/97. No code shipped; the temporary
      diagnostic route was deleted after recording these numbers. The
      schedule data (roof/home-away/rest) stays available in games.csv if a
      future season changes the picture, but the four-season read is clear
      enough not to revisit soon.

107. **Ran the properly-scoped EWMA test (Open Item #8): recency-weighting
    the recent-form average INSIDE blendedScore, not as a standalone pick
    signal (item 54's inconclusive test). Clean negative — it monotonically
    HURTS pick accuracy; the flat average is better.** Item 54 only tested
    EWMA as a standalone "pick whoever has the higher weighted average"
    signal (weak, no unifying story across formats); Open Item #8 flagged
    the real test — reweighting the recent-vs-season blend the way the
    engine actually consumes `recentPprAvg` — as never run.
    - Implemented as a config-gated `RECENT_EWMA_DECAY` (1.0 = flat average
      = current behavior; below 1 weights the most recent game highest,
      decaying geometrically) feeding a `weightedRecentAverage` helper in
      the recentPprAvg computation. Verified decay=1.0 is byte-identical to
      baseline (a clean no-op) before trusting the sweep.
    - **Swept against the real engine end-to-end** (config edit + real
      backtest routes — no re-implemented harness, so no divergence risk):

      | decay | primary 2025 | pooled 2022-2025 |
      |---|---|---|
      | 1.0 (flat, baseline) | 58.76 | 57.78 |
      | 0.9 | 58.76 | — |
      | 0.8 | 58.67 | 57.32 |
      | 0.7 | 58.57 | — |
      | 0.6 | 58.48 | — |
      | 0.5 | 58.39 | — |

      Monotonic: every step of recency-weighting makes the primary pipeline
      worse (QB 61.8->60.8, RB 58.6->57.6, WR/TE flat), and pooled
      2022-2025 is worse too at even a mild 0.8 (57.78->57.32, QB and RB
      both down). No decay, format, or season preferred recency-weighting.
    - **Why**: with only up to 4 recent games, a flat average is already a
      small sample; recency-weighting over-weights the single most-recent
      game — the noisiest one, not the most predictive — effectively
      shrinking an already-thin sample and adding variance without signal
      (consistent with item 2's original "raw recent points are noisy"
      finding).
    - **Not shipped — code fully reverted** (config constant, helper, and
      engine usage all removed to the item-105 state, baseline re-confirmed
      at 58.76), matching item 54's own precedent (its standalone EWMA code
      was deleted too). Resolves Open Item #8: the flat recent-form average
      is confirmed better than any recency-weighted alternative, standalone
      OR inside blendedScore.

108. **Redesigned the Waiver Wire results into a "buy-low board" built
    around an opportunity-vs-production gap visualization — presentation
    only, real data, both themes.** The prior results were a competent
    collapsible row-list (item 83) but buried the tool's actual insight
    (volume rank vs. points rank) in text. Built a full-page Artifact
    mockup first (the items 64/95/96 pattern), iterated with the user
    (removed a summary strip, then the editorial "Opportunity is
    outrunning production" headline, then the board sub-header/framing
    text, all on request — the results now lead straight into the
    spotlight, with only the dynamic status note kept), then implemented
    into `WaiverResult.tsx` / `WaiverTool.tsx`.
    - **The signature device — a gap bar** (new): a position-rank axis
      with a green "opportunity" node (recent volume rank; this-week
      matchup for streaming) sitting ahead of a hollow "production" node
      (recent points rank; season rank), the green span between = the
      buy-low gap. Driven by the real `volumeRank`/`pointsRank` the
      `/api/waivers` response already returned (previously unused by the
      frontend). A per-position track scale (`GAP_SCALE`) keeps the span
      proportional and readable.
    - **A spotlight** for the biggest-gap skill candidate (streaming
      excluded — a different kind of gap) with metrics (touches/gm, recent
      PPR, consensus proj), the reasoning lead, a matchup pill, and the
      real suggested drop. **Position tabs** with counts (All +
      per-position). **Streaming D/ST/K** kept their honest "this week's
      matchup vs. season baseline — a spot start" framing. Position-colored
      avatars/chips (`--pos-*` tokens, reusing `PlayerMultiSelect`'s
      gradient pattern), Favorable/Tough matchup pills (from
      `breakdown.matchupContext`), injury pills, and a "how to read it"
      footer.
    - **All existing functionality preserved**: expand-for-reasoning, drop
      suggestions (`DropSuggestion`/`moveHeadline`), "already rostered"
      (manual mode only), and the `POSITION_ORDER`/`isStreamingPosition`/
      `moveHeadline` exports the Home waiver widget depends on. `WaiverTool`
      widened `max-w-3xl` -> `max-w-5xl` (pre-search controls kept in a
      centered `max-w-xl` block); the dynamic `contextNote` (e.g. the
      offseason "ranked on 2025 form" note) renders as a small status line
      above the board.
    - **Caught and fixed a real bug during live verification**: a deep
      candidate with no FantasyPros consensus (`expertConsensusR2pPts`
      0.0) rendered "0.0 pts consensus proj" as a bright-green highlighted
      stat — now hidden unless the projection is > 0.
    - **Verified live end-to-end** against the user's real connected
      Sleeper roster (29 players), both light and dark (dark via
      prefers-color-scheme, the app's real mechanism) — spotlight, tabs,
      gap bars, matchup/injury pills, streaming sections, and real drop
      suggestions all rendering correctly. No API/engine change
      (presentation only, reusing data the response already carried).
      `tsc`/lint clean.

109. **Redesigned the Waiver Wire PRE-search screen to match item 108's
    buy-low board — presentation only, no engine/API change.** Item 108
    redesigned the RESULTS; the landing state a user sees before clicking
    "Find waiver targets" was still three bare stacked controls (scoring
    toggle, roster summary, Find button) under the page header — the user
    flagged it as "way too plain." All changes are in `WaiverTool.tsx`; the
    hooks/fetch/logic are untouched.
    - **A "buy-low signal" hero** (new `MethodHero`) teaches the tool's
      actual insight before any search runs: an eyebrow, a `font-display`
      headline, a one-line explanation, and a **schematic gap bar** (new
      `SchematicGapBar`) that deliberately mirrors item 108's signature
      `GapBar` device — green "opportunity" node ahead of a hollow
      "production" node with a "buy-low gap" tag — but with GENERIC axis
      labels ("Recent usage" / "Recent points"), NOT fabricated player
      data, so it reads as an instructional diagram, not a fake result (the
      project's standing "no dummy data" rule — a labeled schematic is
      explanation, not placeholder data). Three honest feature bullets
      (opportunity-over-output, a paired same-position drop, league-aware
      filtering) describe what the tool really does.
    - **A cohesive "Set up your search" controls panel** replaces the loose
      stack: scoring format and roster are now numbered steps (a small
      `StepDot`) inside one bordered card, capped by the Find CTA.
    - **Layout**: pre-search is a 2-column grid (hero + controls) at the
      `lg` breakpoint, collapsing to a single stacked column below it;
      once results exist, it collapses back to the centered single-column
      controls so item 108's board stays the focus. `WaiverResult.tsx` is
      untouched.
    - **Caught and fixed a real mobile horizontal-overflow bug during live
      verification**: the grid used bare `fr` columns
      (`lg:grid-cols-[1.15fr_0.85fr]`), which are `minmax(auto, …)` and
      can't shrink below content width — the hero card overflowed the
      viewport on mobile (only visible once actually screenshotted at 375px,
      not in the desktop check). Fixed with explicit `grid-cols-1` for
      mobile plus `minmax(0,…)` on the `lg` columns — the standard
      shrinkable-grid fix (same class of fix as the page-body-scroll
      guidance this app already follows).
    - **Verified live end-to-end**: desktop light (2-column, aligned) and
      mobile dark (stacked, no overflow after the fix), zero console errors,
      `tsc`/lint clean. Committed as `28e63e9`.

110. **Redesigned the Lineup Optimizer — results into a real lineup board,
    and the pre-build controls into a compact control deck. Presentation
    only, no engine/API change; reuses data `/api/lineup` already returns.**
    The results were competent 2-up cards (item 76) with an always-expanded
    wall of reasoning; the pre-build state was plain controls. Rebuilt both
    across a few user-directed iterations.
    - **Results board** (`LineupResult.tsx`): a **projected-team-total
      header** (summed from the starters' real `finalScore`s — a genuinely
      new number, ~153.5 in the live test) with a slots-filled count; then
      **position-colored starter cards** stacked full-width (the shared
      `--pos-*` tokens — colored left border + gradient avatar, a slot chip
      QB/RB 1/WR 2/FLEX 1/SUPER FLEX, big mono projected score, opponent
      line, and a Favorable/Tough/Neutral matchup pill from
      `matchupContext.diffFromAverage`); **per-card collapsible "Why this
      pick"** (`ChevronIcon` from `CollapsibleSection`) so a full 10-starter
      lineup is scannable instead of a wall of text; and a clean sorted
      **bench** list with mini position-avatars. Empty slots keep the honest
      dashed "no eligible player" card.
    - **Cards stacked, not 2-up, on user request** — full width means names
      never truncate (the 2-up grid squeezed them). Cards are ordered by the
      slot order the optimizer returns.
    - **Control deck** (`LineupTool.tsx`): the original pre-build state grew
      a hero + a bulky numbered-step "Build your lineup" card; the user
      disliked both ("takes too much space and looks generic… it looks the
      same"). Landed, after two iterations, on: no hero at all, and a single
      **unified deck** — two mono stat tiles (**Roster** count + league,
      **Slots** starters + shape) stacked on mobile / side-by-side at `sm`,
      an inline expand that drops the `RosterSlotsEditor` into the deck, and
      a **scoring strip** at the bottom — replacing the three look-alike
      bordered rows. Roster tile opens the shared roster modal
      (`useRosterModal`); slots use a local `slotsOpen` toggle rather than
      `CollapsibleSection` so the editor renders full-width inside the deck.
      `RosterSummaryButton`/`CollapsibleSection` are no longer used here
      (still used by Waivers). Layout is one centered column (controls
      `max-w-2xl`, results up to `max-w-3xl`).
    - **Two real layout bugs caught during live verification** (both only
      visible once actually screenshotted, not in the code): (1) a first
      controls pass put all three controls in one `sm:flex-row` — the fixed-
      width scoring toggle didn't shrink, so it clipped and pushed the Slots
      segment off-screen; fixed by splitting into two flex-1 stat tiles plus
      a separate full-width scoring strip. (2) The two tiles side-by-side
      clipped the Slots summary on mobile ("10 star…"); fixed by stacking
      them (`flex-col … sm:flex-row`) below `sm`.
    - **Iteration history worth recording** (the doc's own "what was tried"
      discipline): a first build also added a **landing hero** (an "Optimal
      lineup" explainer with an illustrative position-colored slot strip and
      feature bullets) — the user asked to remove it ("the tool is
      self-explanatory"), and clarified the "optimal lineup card" they
      wanted gone was that **landing hero**, NOT the post-search
      projected-total header (which was briefly removed on a misread, then
      restored). Net: landing hero deleted, post-search header kept.
    - **Verified live end-to-end** against the real connected Sleeper roster
      (29 players → 10 starters, 19 bench; correct flex/superflex
      assignment, a "Limited data" pill on a thin-sample player, reasoning
      expanding correctly, slots editor expanding inside the deck), desktop
      light + mobile dark, no horizontal overflow, zero console errors,
      `tsc`/lint clean. Committed across `a8fd7ce` (results board + first
      compact controls) and `ce998c4` (the control-deck rework).

111. **Explored four full visual directions for the Start/Sit result as
    Artifact mockups, then wired the chosen one — an editorial "almanac" —
    into the real app, first the result component and then the whole
    Start/Sit page.** Same layout/statistics throughout; this is a
    presentation/design-system change, not an engine change. The mockups
    were built with the `artifact-design` skill and iterated live in the
    in-app browser (served through the dev server so the JS/animation ran,
    since a raw `file://` static-snapshot doesn't execute scripts).
    - **The four exploratory Artifact mockups** (all reproduce the exact
      current result layout — verdict + confidence + stacked player cards
      with opponent/def-rank, projection + floor→ceiling, per-position 2x2
      stat grid, weather/health, case for/against, betting lines — with
      illustrative sample data): (a) **B&W + accent (sharp)** — near-
      monochrome, squared edges, one selectable accent (mono/gold/blue),
      independent "sliders" color, a reserved danger-red toggle, plus a
      full **desktop-page** variant (sidebar + picker + result + rail) with
      wider cards and a glow toggle; (b) **cinematic broadcast showpiece** —
      dark, poster-scale condensed name, a real radial confidence gauge,
      gold/cyan/red, grain + ghost glyphs, orchestrated count-up/arc motion,
      committed single-DARK theme; (c) **modern product** — bright airy
      light/dark, a clean geometric sans (Avenir Next), a violet-indigo
      accent with SEPARATE semantic green/red, a live accent switcher
      (violet/blue/teal/pink), and a high-contrast inverted-dark verdict
      panel added on request; (d) **editorial "The Matchup" almanac** —
      warm porcelain paper, espresso ink, a deep **pine-green** verdict
      panel (the field) as the high-contrast anchor, **brass** detail,
      engraved **Copperplate** small-caps labels + big **Futura** display
      figures as the typographic heroes, hairline rules, paper grain, a
      committed single-LIGHT/print world. The user picked **(d)**, "use the
      mockup's default" palette.
    - **Fonts — the one real production caveat, flagged up front.** The
      mockups lean on Mac-only faces (Futura, Copperplate, Didot, Avenir
      Next) as stand-ins that won't exist on most users' machines/servers.
      For the shipped version they were swapped for web-embeddable
      equivalents loaded via `next/font/google` (self-hosted at build, same
      privacy/perf posture as the app's existing Barlow/Inter/JetBrains):
      **Jost** for the Futura role (display name + big figures), **Cinzel**
      for the engraved Copperplate-style labels. Added in `layout.tsx` as
      `--font-jost`/`--font-engraved` on `<html>` (loaded app-wide, used
      only by Start/Sit). Result is ~95% the mockup look, licensable and
      cross-platform.
    - **Step 1 — the result component** (`ComparisonResult.tsx` +
      new `ComparisonResult.module.css`). Rewrote the component's
      presentation to the almanac sheet (masthead + dateline, pine verdict
      panel with the confidence % + a thin meter using the same
      `CONFIDENCE_SCALE_MARKS`, ranked player cards where the recommended
      pick is a solid ink-framed feature block and the rest are lighter/
      quiet, editorial hairline-divided stat grid, green/red case columns,
      betting, colophon, real context note). **Every piece of data logic
      was kept** — `getConfidencePct` (the item-100 gap-calibrated number,
      with the item-86 per-position bucket fallback), `buildStatSlots` and
      all its per-position sub-builders (QB passing profile included), the
      floor/ceiling scale math, `buildCaseFor`/`buildCaseAgainst`, weather/
      health, betting props, and multi-player ranking. Styling is a scoped
      **CSS Module** (a self-contained `.sheet` with its own porcelain
      palette + the font vars) specifically so none of it touches the app's
      global token system. One layering detail worth noting: the paper
      **grain** is a `::after` overlay with `mix-blend-mode: multiply` and
      `z-index: 5` so it paints OVER the porcelain surfaces (an earlier
      `::before` version sat behind the cards and only textured the
      margins).
    - **Step 2 — the rest of the Start/Sit page**, on the user's explicit
      follow-up ("extend to rest of page"). Done the cheap, robust way:
      the whole app is token-driven (item 80's design system), so a single
      page-scoped wrapper class `.matchup-page` (in `globals.css`) that
      **overrides the app's color tokens** (`--background`/`--surface`/
      `--foreground`/`--accent`/`--accent-ink`/`--good`/`--bad`/`--caution`/
      `--premium`/…) to the editorial palette recolors every token-consuming
      component inside it — the search/compare panel, the scoring toggle,
      the player chips, the Recent-comparisons rail — WITHOUT editing any of
      those shared components. Works regardless of the viewer's OS theme,
      because a descendant's nearest ancestor sets the custom property (the
      wrapper beats both the light and dark `:root` token blocks for its
      subtree). `start-sit/page.tsx` applies the wrapper and replaces the
      shared `PageHeader` with an inline editorial header (Cinzel eyebrow +
      Jost title). The **sidebar (`AppShell`) was deliberately left dark/
      emerald** — it's shared chrome across all six tools — so the page
      reads as "a dark app with an editorial document section," not a
      half-converted app. Page ground `#e7e1d2` (deeper) vs. surface
      `#f5f1e7` (porcelain cards) vs. the result sheet's own `#ede8dd`
      (with a shadow) gives three tonal layers so cards/sheet still pop.
    - **Verified live end-to-end against the REAL app with REAL data**
      (not just the mockup): drove `/start-sit`, ran a real comparison
      (Bijan Robinson vs. Christian McCaffrey via the clickable
      recent-comparisons rail — the manual player-search add wouldn't fire
      through the in-app browser's synthetic clicks, a known
      click-desync quirk, so the rail re-run was the reliable path),
      confirmed real confidence (53%, close call), real projections/ranges/
      matchup chips, weather "Forecast pending" (offseason), the real
      offseason context note, both cards, the whole page recolored, sidebar
      still dark. Desktop; zero console errors; `npx tsc --noEmit -p .` and
      `npm run lint` clean; **a full `next build` compiles** (fonts +
      CSS module + the page all build for production).
    - **Deliberately scoped to Start/Sit only** — the other five tools
      (Trade, Waivers, Lineup, Rankings, Backtest) are untouched and still
      dark/emerald. Applying the almanac look app-wide is a real, separate
      design-system undertaking, not a token tweak — see the new Open Item
      #28 for exactly what that would involve.

### Open items (as of item 111 — pick up here)
Everything through 80f6c70 ("Add Waiver Wire tool with real Sleeper
league import") is committed and pushed (`git log`; confirmed live via
GitHub's own commit-status check, which shows Vercel's deployment for
that commit as `"state": "success"` / "Deployment has completed" —
checked directly against the GitHub API, not assumed from the push
alone), including item 46's real, permanent code (`nflverse/depthCharts.ts`, the
`depthChartByPlayerIdWeek` plumbing, and the new `pickByDepthChart`
baseline), items 47-49's real, permanent code (`lib/trade/`,
`lib/recommendation/restOfSeason.ts`, `lib/backtest/tradeBacktest.ts`,
the `/trade` page, and the new `/api/backtest/trade*` routes), item 50's
real, permanent code (`getFantasyPoints`/`ScoringFormat`/
`parseScoringFormat` in `sportsdata/types.ts`, the per-format
`config.ts` constants, `ScoringFormatToggle.tsx`, `useScoringFormat.ts`),
item 51's format-threading work (`baselines.ts`, `runBacktest.ts`,
`runBacktestNflverseOnly.ts`, and the three `*-nflverse*` routes), item
52's per-format `VOLUME_BLEND_WEIGHT`/`SNAP_SHARE_BLEND_WEIGHT_TE`, item
53's `ENSEMBLE_VOLUME_BLEND_RATIO`, the next-opponent/weather display
feature (see Overview), item 56's weekly-injury-report fix, and item 57's
`nflverse/rosters.ts`/`rosterStatus` roster-status fix. Items 54 (EWMA
recent-average) and 55 (FantasyPros ECR) were both investigated and
explicitly dropped — no code was shipped for either, only these doc
entries. Both item 56 and item 57 were confirmed to have zero effect on
the live tool (`buildInput.ts`/`nflverseLive.ts` untouched by either —
the live tool already has real-time injury/roster status straight from
SportsDataIO). Item 58's Waiver Wire tool (`lib/waivers/`, the
`/waivers` page, `useRosteredPlayers.ts`, `/api/waivers`), item 59's
Sleeper league import (`lib/sleeper/`, `SleeperImport.tsx`,
`useSleeperConnection.ts`, `/api/sleeper/*`), item 60's leaguewide-
rostered-players fix (`resolveRoster.ts`'s `leagueRosteredPlayerIds`,
threaded through the same files), and item 61's two polish fixes
(`WaiverResult.tsx`'s `moveHeadline`/`showRosteredButton`) are all part
of that same 80f6c70 commit — landed and deployed together, not a
separate pending batch. Item 62's D/ST and K support (live tools only)
is committed separately, as `a86cc8b`; item 63's Backtest-page D/ST and
K support as `f7f2e8b`; item 64's sidebar-shell/Home redesign as
`927e237` — all pushed to `main` after the user explicitly asked each
time. Item 65's "Projection accuracy" mode (including its two
same-session follow-ups — the per-player breakdown and the player
search/week-by-week lookup — all still item 65, not separate items) is
committed as `33eb5a3`. Item 66's QB rushing-EPA calibration fix
(`QB_RUSH_EPA_BLEND_WEIGHT` reverted to 0) is committed as `488f441`.
Item 67's bye/DNP display fix (`playerProjectionLookup.ts`'s `predicted`
gating) is committed separately as `e02fede`. The rest of item 67 — the
prior-season-fallback feature (`nflverse/priorSeasonAverage.ts`,
`PlayerComparisonInput.priorSeasonPprAvg`, the new `scorePlayer` fallback
branch, and the `playerProjectionLookup.ts` wiring) plus its
cross-position calibration investigation write-up — is committed as
`d69c8ed`. Item 68's regression-vs-`finalScore` investigation shipped no
code at all (a documented negative finding only) — its CLAUDE.md
write-up is committed as `6fefc74`. Item 69's FantasyPros
expert-consensus baseline (`src/lib/fantasypros/`, the
`nflverse/schedules.ts` `getWeekStartDates` addition, the
`BacktestRunData.expertConsensusByPlayerIdWeek` plumbing through
`loadRunNflverseOnly.ts`/`weekData.ts`, and the new
`pickByExpertConsensus` baseline in `baselines.ts`) is committed as
`3306614`. Items 70-72's code — item 70's `finalScore` integration
(`PlayerComparisonInput.expertConsensusR2pPts`, the
`expertConsensusModifier` blend in `engine.ts`,
`EXPERT_CONSENSUS_BLEND_WEIGHT` in `config.ts` shipped at 0.5,
`loadRun.ts`'s new primary-pipeline fetch of this signal); item 71's
"Projection accuracy" real-harness comparison
(`runProjectionBacktest.ts`'s third graded series, the API route fields,
`ProjectionSummaryView`'s new section, `BacktestTool.tsx`'s threading);
and item 72's Stafford investigation (the real `playerProjectionLookup.ts`
bug fix — a third missed `expertConsensusByPlayerIdWeek` call site —
plus the new, currently-inert `QB_RUSH_MIN_ATTEMPTS_THRESHOLD` gate in
`config.ts`/`engine.ts`, kept at `0`/no-op since the gating sweep found
no clean win) — is committed as `bae0ce1`. Item 73's real code — the
live FantasyPros current-snapshot wiring (`fantasypros/client.ts`'s
`fetchCurrentSnapshot`, `weeklyConsensus.ts`'s
`getCurrentExpertConsensusByNormalizedName`, and the threading through
`buildInput.ts`/`scoreExtended.ts`/`buildWaiverReport.ts`/
`suggestDrop.ts` and all three live routes) — plus item 74's
investigation (which shipped no code at all, a documented negative
finding only) — plus this document's own write-up of both — are
committed together as `1c5c1c0`. Item 75's permanent FantasyPros-vs-
engine per-player projection comparison (`playerProjectionLookup.ts`'s
`fantasyProsProjection`/`fantasyProsDiff` columns and
`ProjectionPlayerDetail.tsx`'s totals row) is committed as `b4ecb3d`;
its same-item "closer to actual" week counter follow-up as `c55b367`.
Item 76's Lineup Optimizer is committed as `45de3f0`. Item 77's Home
page widgets (including the trade-suggestion engine and its live-tested
"fair-only" fix) are committed as `a3a38fa`. Item 78's Legit Rankings
tool — including every fix found via live testing along the way
(Mahomes/Lamar Jackson's `ENGINE_WEIGHT` retune, the Jefferson/Johnston
`FP_NORMALIZATION_CAP` fix, the Jacksonville JAC/JAX team-code fix, the
position caps, the D/ST-and-K removal, and the Overall view) — is
committed as a single commit, `beefc54`. Item 79's Start/Sit verdict-
banner restructure is committed as `dcd90b1`. Item 80's full visual
redesign (tokens, typography, the Backtest migration) is committed as
`b60906c`. The CLAUDE.md write-up of items 77-80 was committed
separately, as `ea48508`. Item 81's shared `PlayerMultiSelect.tsx` (and
the deletion of `PlayerSearchInput.tsx`) is committed as `b04e9e0`. Item
82's `CollapsibleSection.tsx`/`ConfirmButton.tsx` and the roster-panel
Clear action are committed as `4b6677c`. Item 83's Waiver Wire row-list
restyle and the real efficiency floor (`PassingYards`/`RushingYards`/
`ReceivingYards` additions, `computeSeasonEfficiencyBaseline`) are
committed as `94e9af4`. Item 84's Legit Rankings "Top 100" rename and
real top-100 merge are committed as `eec51a2`. Item 85's Start/Sit
redesign (sidebar layout, ranked always-visible cards, the new
`recentPprFloor`/`recentPprCeiling` fields, the confidence-scale
markers, and the negative-floor bar-math fix) is committed as `2ebc2f0`.
Item 86's position-aware confidence percentages are committed as
`b792069`. Item 87's matchup/injury/weather-into-cards move (and the
row-alignment fix) is committed as `cd8525b`; the CLAUDE.md write-up of
items 81-87 followed as `c3352b6`. Item 88's code landed in two commits,
both pushed to `main`: the sidebar roster modal + the cross-instance
scoring-sync fix (`createPersistentStore.ts`, `RosterManager.tsx`,
`RosterSummaryButton.tsx`, `useRosterModal.ts`, the three rewritten
hooks, and the `AppShell`/`WaiverTool`/`LineupTool` rewiring) as
`990a73d`, and the Lineup roster-slots collapse
(`summarizeSlots`/`totalStarters`, the `CollapsibleSection` wrap) as
`8874ef5`; item 88's remaining touch (dropping the roster-slots shape
summary on mobile) plus its CLAUDE.md write-up followed as `66a92aa`.
Item 89 (the `QB_RUSH_BLEND_WEIGHT` re-sweep) shipped NO code — a
confirmed no-change result — so its only artifact is its CLAUDE.md
write-up, committed as `7b2b1f6`. Item 90's code (the multi-player trade
backtest: `backtest/multiPlayerTradeBacktest.ts`, the
`/api/backtest/trade-multi-nflverse-multiseason` route, and the three
now-exported helpers in `tradeBacktest.ts`) plus its write-up are
committed as `0d0ca38`. Item 91's Start/Sit card restructure
(`ComparisonResult.tsx` only) is committed as `9cb3a2e`, its CLAUDE.md
write-up as `25e2a87`. Item 92's follow-on card refinements (the
Case For/Against split, the context-beside-metrics + Health status move,
the stacked cards, and the Key Takeaways rail removal — `ComparisonResult.tsx`/
`StartSitRail.tsx`/`StartSitTool.tsx`) are committed as `b234534`, its
CLAUDE.md write-up as `bf0b36d`. Item 92's two follow-on notes are also
committed: the QB passing-profile stat grid (`188c9e4`, write-up
`acbb493`) and the clickable recent-comparisons feature (`928f629`,
write-up `97d7c06`). Item 93's live-matchup-uses-next-opponent
change (`buildInput.ts` + the `ComparisonResult.tsx` display follow-through)
is committed as `4415171`, its CLAUDE.md write-up (plus the corrected
Overview passages) as `0138a1f`. Item 94's stale-snapshot guard
(`fantasypros/weeklyConsensus.ts`'s `MAX_SNAPSHOT_AGE_DAYS`) is committed
as `c46acca`, its CLAUDE.md write-up as `dcad3a9`. Item 95's Trade
Analyzer redesign (`TradeResult.tsx` only) is committed as `99577ab`,
its CLAUDE.md write-up (and the new Open Item #20 for its deferred
load-in animation) as `cee54e6`. Item 96's Home-page redesign — the
newsletter signup band (`NewsletterSignup.tsx`, the new `/api/subscribe`
route) and the live "Top of the board" rankings list
(`HomeRankingsBoard.tsx`), wired into `page.tsx` — is committed as
`68faef0`, its CLAUDE.md write-up (and Open Items #21/#22) as `b535041`.
Item 97's betting-odds signal investigation shipped no code — a
documented negative finding (nothing cleared the integration/cross-
pipeline bar), the K weight held at its shipped value; its CLAUDE.md
write-up (two Data Source Notes on nflverse betting lines / kicker
scoring, and Open Item #23) is committed as `e534955`. Item 98's
display-only player props on the Start/Sit cards (`src/lib/oddsapi/`,
the `/api/compare` `propsByPlayerId` field, and `ComparisonResult.tsx`'s
"Betting lines" section) is committed as `275bc52`, its CLAUDE.md
write-up (the Data Source Note on The Odds API, the `src/lib/oddsapi/`
Conventions entry, and Open Item #24) as `a0d9eb9`. Item 99's shared
player-picker redesign (`PlayerMultiSelect.tsx` + the `--pos-*` tokens in
`globals.css`) is committed as `c5bc1a3`, its CLAUDE.md write-up (and
Open Item #25) as `18f8e44`. Item 100's player-aware Start/Sit pick +
confidence — the season-gap ranking guardrail (`SEASON_GAP_GUARDRAIL_*`
in config.ts, `compareBreakdowns`) committed as `aefad1a`, and the
gap-calibrated confidence (`GAP_CONFIDENCE_CURVE`, the new `confidence`
field on `ComparisonResult`, the UI wiring) as `026efa5`, its CLAUDE.md
write-up (and Open Item #26) as `2777d22`. Item 100's depth-chart
confidence-floor follow-on (`getCurrentDepthChartRankByNormalizedName`,
`DEPTH_STARTER_CONFIDENCE`, the `compareBreakdowns` floor + `/api/compare`
wiring) is committed as `90151e1`, its CLAUDE.md write-up as `6f4a662`.
Item 101's offseason injury-window backfill (the `getRecentGameStatsForPlayer`
`limit` param in `weeklyStats.ts` and the `!context.isInSeason`-gated
last-N-played backfill + nflverse-window alignment in `buildInput.ts`) plus
this CLAUDE.md write-up (and Open Item #27) are committed together — the
backtest experiment behind it (a temporary `weekData.ts` change) was reverted
before shipping, leaving no repo artifact, same discipline as every other
one-off in this document. Item 101 is committed and pushed as `68b4a36`.
Item 102's extension of that backfill to Rankings and Waivers (the shared
`recommendation/recentWindow.ts` helper, the `buildInput.ts` refactor onto
it, the `filterByRecentGames` widening in `buildRankings.ts`, and the
candidate-window backfill in `rankCandidates.ts`) plus this CLAUDE.md
write-up (and the Open Item #27 resolution) are committed together.
Item 103's offseason redraft-consensus fix (the new
`fantasypros/liveConsensus.ts`, and the five scoring routes —
compare/trade/lineup/waivers/trade-suggestion — switched to
`getLiveExpertConsensusByNormalizedName`; rankings deliberately kept on the
weekly path) plus this CLAUDE.md write-up are committed together. The
volume-signal change it investigated was NOT built (rushing QBs are already
over-projected — a documented rejection, no code). Item 104's PUP/IR/NFI
player-availability fix (the `isRosterable` predicate in `players.ts`,
surfaced by a since-deleted consensus coverage audit route) plus this
CLAUDE.md write-up are committed together. Item 105's finalScore floor+bound
(`FINAL_SCORE_DEVIATION_CAP` in `config.ts`, the clamp in `engine.ts`,
surfaced by a since-deleted score-distribution diagnostic route) plus this
CLAUDE.md write-up are committed together. Item 106's game-context signal
investigation (dome/home-away/rest) shipped NO code — a documented negative
finding (nothing cleared the bar; the diagnostic route was deleted), so its
only artifact is this CLAUDE.md write-up. Item 107's EWMA-inside-blendedScore
test (Open Item #8) also shipped NO code — recency-weighting monotonically
hurt accuracy, so the config/engine changes were reverted; its only artifact
is this CLAUDE.md write-up. Item 108's Waiver Wire "buy-low board" redesign
(`WaiverResult.tsx` rebuilt around the gap-bar visualization + spotlight +
tabs, `WaiverTool.tsx` widened) plus its CLAUDE.md write-up are committed
together, as `28e63e9`. Item 109's Waiver Wire PRE-search redesign
(`WaiverTool.tsx`'s new `MethodHero`/`SchematicGapBar`/`StepDot` landing +
the mobile grid-overflow fix) is also committed as `28e63e9` (the code),
its CLAUDE.md write-up as `579d5ab`. Item 110's Lineup Optimizer redesign —
the results board + first compact controls (`LineupResult.tsx` +
`LineupTool.tsx`) as `a8fd7ce`, and the control-deck rework
(`LineupTool.tsx`) as `ce998c4` — with this CLAUDE.md write-up following it.
Item 111's editorial "almanac" redesign of Start/Sit (the four exploratory
Artifact mockups shipped no repo code — they live only as the artifacts and
this write-up; the wired-in code is `layout.tsx`'s Jost/Cinzel fonts, the new
`ComparisonResult.module.css`, the rewritten `ComparisonResult.tsx`,
`globals.css`'s `.matchup-page` token-override skin, and the re-skinned
`start-sit/page.tsx`) plus this CLAUDE.md write-up are committed together.
Everything above (items
96-111, all code and write-ups) is committed and pushed to `main` — the
working tree is clean. (Per this project's standing rule, commit/push only
once the user explicitly asks.) Nothing below is started or fixed yet:

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
5. **Trade Analyzer: multi-player trades — RESOLVED for even-count
   trades, see item 90; uneven-count confound documented + spun into new
   item #19 below.** Built the cross-position 2-for-1/2-for-2 backtest
   (`multiPlayerTradeBacktest.ts`). 2-for-2 (equal counts) validates
   cleanly at 55.5% pooled (≈ the 1-for-1 backtest's 55.0%), every season
   above chance — the projection generalizes to balanced multi-player
   swaps. 2-for-1 (uneven counts) is confounded by count under summed-total
   grading: the engine (62.2%) barely beats a naive "pick the side with
   more players" (61.2%), so that number isn't a clean skill measure. Only
   3+-for-N shapes (beyond 2-for-2/2-for-1) remain unbuilt, and the
   uneven-trade fix is item #19.
6. **Scoring-format toggle still isn't fully universal — narrowed
   further by item 52, one gap left.** Item 51 made the nflverse-only
   backtest and every naive baseline picker format-aware; item 52
   re-swept the active blend weights per format and found only
   `VOLUME_BLEND_WEIGHT`/`SNAP_SHARE_BLEND_WEIGHT_TE` had a real,
   every-season-validated Standard-specific optimum, now shipped. What's
   left: `tradeBacktest.ts` (the Trade Analyzer's own backtest) is still
   PPR-only — out of scope for both items 51 and 52, neither of which
   touched the trade backtest. Half-PPR/Standard whole-model accuracy
   still trails PPR's somewhat (primary pipeline: 55.2%/56.5% vs. 57.5%;
   pooled nflverse-only: 55.3%/54.8% vs. 56.5%) — item 52 confirmed this
   isn't fixable by further per-format weight tuning (RB signals, drop
   rate, and QB rushing terms all showed no real format-specific case),
   so the remaining gap is more likely structural (e.g. `blendedScore`
   itself, or `POINTS_PER_*` conversion factors interacting with
   position pools differently per format) than a tuning oversight.
7. **`QB_RUSH_BLEND_WEIGHT` (0.3) re-sweep — RESOLVED, see item 89: no
   change, 0.3 re-confirmed optimal.** Item 52's side-finding (pooled
   accuracy "climbing well past 0.3") did NOT reproduce on the current
   engine — it predated item 66 (disabling `QB_RUSH_EPA_BLEND_WEIGHT`) and
   item 70 (FantasyPros expert consensus now carrying the QB score). Swept
   both pipelines fresh: pooled 2022-2025 accuracy now PEAKS at 0.3 (both
   overall and QB) and declines above it, primary 2025 wants ≤0.4 and
   collapses at 0.5+, and the original item-30 cross-season tradeoff
   (pooled 2024 QB wants high weight, 2022/2023/2025 QB want low) still
   holds — so 0.3 stays as the balanced compromise, now confirmed as the
   pooled optimum rather than a legacy compromise. No longer open.
8. **Exponentially-weighted recent performance — RESOLVED, see item 107.**
   Item 54 tested EWMA standalone (inconclusive); item 107 ran the real
   test flagged here — recency-weighting `recentPprAvg` INSIDE blendedScore
   — and found it monotonically HURTS pick accuracy on both pipelines (no
   decay/season/format preferred it). The flat recent-form average is
   confirmed better; code was reverted, no engine change. Closed.
9. **The Waiver Wire tool's gap ranking (item 58) has never itself been
   directly backtested as a ranking heuristic** — only its underlying
   primitive (recent volume beats recent points as a forward signal) has
   validated numbers behind it. Whether "biggest volume-rank-minus-
   points-rank gap" specifically predicts a genuine breakout better than,
   say, volume rank alone, hasn't been checked. Also: `suggestDrop.ts`'s
   drop-candidate suggestion is same-position only — no flex-spot
   cross-position logic (mirrors the same scoping decision the Trade
   Analyzer itself never needed to make, since it's user-driven there).
   Both are candidates for a dedicated pass if this tool gets real usage.
10. **Sleeper roster import skipping D/ST and K — resolved, see item
    76.** `resolveSleeperRoster` now reads from `getActiveExtendedPlayers()`
    and resolves D/ST via a team-code → synthetic-PlayerID map (K joins
    by name like any skill player), fixed alongside the Lineup Optimizer
    since that tool needed a Sleeper-imported roster to be able to fill
    DEF/K slots automatically. Verified live against a real public
    league. No longer open.
11. **D/ST and K's Backtest-page support (item 63) is scoped to the
    primary 2025 SportsDataIO pipeline and to Broad/Single Pair mode
    only** — two real gaps, not oversights:
    - **The nflverse-only 2022-2024 pipeline has no D/ST/K support at
      all.** Extending it would first need confirming nflverse has an
      equivalent team-defense data source to SportsDataIO's
      `FantasyDefenseByGame` (not yet checked) — K might be closer to
      free, since `stats_player`/`gameLog.ts` likely already carries
      kicker rows the same way `PlayerGameStatsByWeek` does, but this
      wasn't verified before deferring the work.
    - **The Trade Analyzer's own backtest (`tradeBacktest.ts`) stays
      skill-only.** D/ST and K already work in the *live* Trade
      Analyzer (item 62's `projectExtendedRestOfSeason`), so extending
      the backtest to validate that projection is a real, coherent next
      step if picked up — it would reuse the same
      `buildDstPairsForWeek`/`buildKickerPairsForWeek` pairing this item
      already built, just needs its own rest-of-season grading logic
      (mirroring `projectFromHistory`'s relationship to
      `restOfSeason.ts` for skill positions).
12. **"Projection accuracy" mode (item 65) is scoped to 2025/PPR/skill
    positions only** — three real gaps, not oversights:
    - **D/ST and K aren't graded.** `runProjectionBacktest.ts` calls
      `buildBacktestComparisonInput`/`scorePlayer` directly rather than
      the extended dispatcher (`scoreExtendedPlayerBacktest`) items
      62-63 already built — wiring it in would need D/ST's own
      actual-score lookup (mirroring `toDstActualRows` in
      `runBacktest.ts`) since D/ST has no row in `allWeeklyRows`, but
      the rest of the plumbing already exists.
    - **Half-PPR/Standard aren't tested** — `runProjectionBacktest`
      takes a `format` parameter and would work unchanged, this just
      hasn't been run/reported yet.
    - **The 2022-2024 nflverse-only seasons aren't covered** — would
      need a second orchestration function pointed at
      `loadRunNflverseOnly.ts`, the same pattern every other
      out-of-sample check in this document already follows.
    Also worth a dedicated pass if picked up again: item 65's own
    "regression to the mean" explanation for the baseline's positive
    bias was reasoned through, not confirmed with a direct test (e.g.
    checking whether bias correlates with how far above the position's
    own average a pool member's season average sits). No minimum
    sample-size filter exists yet either, so the "worst MAE" table is
    currently dominated by `n=1`-`2` outliers rather than the
    well-sampled misses that are more likely to mean something.
    **Matthew Stafford's own systematic miss — item 65's most concrete
    finding — was root-caused and fixed in item 66**
    (`QB_RUSH_EPA_BLEND_WEIGHT` reverted to 0); no other well-sampled
    player-level miscalibration case has been checked for since. Whether
    `finalScore` should have a hard floor at all (item 65 also flagged
    real negative projected-point weeks, now gone for Stafford
    specifically post-fix, but the underlying "no modifier is capped
    except matchupModifier" pattern is still true of every other QB/RB/
    WR/TE modifier in `engine.ts`) remains an open, unaddressed
    structural question — item 66 fixed the one modifier proven to
    misbehave this badly, not the general absence of bounds elsewhere.
13. **TE's `snapShareModifier` and WR's `dropRateModifier` both showed a
    real calibration cost in item 67's investigation, but neither was
    touched** — genuine judgment calls, not oversights. TE:
    `SNAP_SHARE_BLEND_WEIGHT_TE` (0.4) is a real MAE-vs-bias tradeoff
    (scaling it down toward zero-bias costs real MAE; scaling it UP
    improves MAE further while worsening bias), sitting on top of an
    already-validated 4-season pick-accuracy peak (item 43) — no weight
    tested cleanly wins on every axis the way item 66's QB fix did. WR:
    `DROP_RATE_BLEND_WEIGHT` at half its current value (0.1) DID clearly
    improve both MAE and bias in the calibration sweep, but cost real
    pick accuracy when checked against the actual primary-pipeline
    backtest (58.3%→55.9%, -2.45pp) — a bigger cost than the calibration
    gain looked like it was worth, so it was reverted rather than shipped.
    Both are documented, open decisions if picked up again — see item 67
    for the full sweep numbers.
14. **The prior-season fallback (item 67) is only wired into the
    backtest's per-player lookup, not the live tool.**
    `buildComparisonInput` (`buildInput.ts`) already accepts the new
    `priorSeasonPprAvgByNormalizedName` parameter and defaults it safely
    to a no-op empty map — the live-tool gap this would close is
    narrower than the backtest one (per item 67's own analysis,
    `SeasonContext` already carries last season's data forward until the
    new season's week 1 actually completes), but a rookie call-up or a
    player back from a long in-season absence would still benefit.
    Wiring it in needs: fetching
    `getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason
    - 1, format)` once per request (mirroring how `remainingOpponentsByTeam`/
    `teamWeatherByTeamWeek` are already fetched once and shared across
    every player in a comparison) and threading it through
    `scoreExtendedPlayer` (`scoreExtended.ts`) into all three live
    routes (`/api/compare`, `/api/trade`, `/api/waivers`) — not attempted
    this pass since it wasn't part of what was asked.
15. **The prior-season fallback is skill-positions-only and PPR-derived
    only where it's actually used** (matches the `buildRankedPoolForWeek`/
    "Projection accuracy" scope it was built for — see item 12 above for
    the broader D/ST/K and format gaps already on this list). Also
    untested: whether the fallback should ever partially blend into
    weeks 2-4 (thin-but-nonzero current-season samples) rather than only
    firing on a strict zero — item 67 deliberately scoped this to the
    narrowest fix that answers "why can't you project week 1," not a
    reweighting of the `RECENT_WEIGHT` formula, which would need its own
    real backtest sweep.
16. **`pickByExpertConsensus`/`EXPERT_CONSENSUS_BLEND_WEIGHT` (items
    69-71): pick-accuracy integration and the projection-accuracy
    real-harness comparison are both done — one real follow-up remains:**
    - **`EXPERT_CONSENSUS_BLEND_WEIGHT=0.7` (or the 0.6-0.9 pooled
      plateau generally) is a documented, deliberately-not-chosen
      alternative to the shipped 0.5** — real, better pooled 2022-2025
      accuracy (58.2% vs. 0.5's 57.8%), at the cost of the primary
      pipeline's own WR accuracy (57.4% vs. 0.5's unchanged 58.3% at
      w=0.7; worse still at 0.9). Worth revisiting if a future season's
      primary-pipeline data changes that specific tradeoff, or if WR
      gets its own separately-tuned weight rather than sharing one
      scalar with the other three positions (a real, un-tried
      alternative design — every other per-position split in this file,
      e.g. `SNAP_SHARE_BLEND_WEIGHT_TE`, exists per-FORMAT, not
      per-position within one format; splitting THIS weight by position
      hasn't been attempted). Item 71's projection-accuracy numbers add
      one more data point worth folding in if this gets re-swept: TE is
      the one position where FantasyPros' raw estimate calibrates
      *better* than the blended engine, a hint (not proof) that TE might
      want a different weight than QB/RB/WR here too.
    - **Live-tool integration: done — see item 73.** The current-HEAD
      snapshot fetch path now exists (`fetchCurrentSnapshot`/
      `getCurrentExpertConsensusByNormalizedName`) and is threaded
      through `buildInput.ts`/`scoreExtended.ts` into all three live
      routes, verified live end-to-end. `EXPERT_CONSENSUS_BLEND_WEIGHT`
      now has a real effect on what Start/Sit, Trade Analyzer, and
      Waivers actually recommend.
    - Also worth a dedicated look if picked up again: whether
      `pickByExpertConsensus` genuinely doesn't need position-scoping
      (unlike every other signal in this document, all four positions
      cleared the bar convincingly here) or whether 2024 QB's exact-50%
      season and TE's wide season-to-season range (52.5-66.3%) are early
      warning signs that would show up with more scrutiny.
17. **Live-tool wiring for `EXPERT_CONSENSUS_BLEND_WEIGHT` — resolved,
    see item 73.** `fantasypros/client.ts`'s current-snapshot fetch path
    now exists and is threaded through `buildInput.ts`/`scoreExtended.ts`
    into all three live routes, verified live end-to-end. No longer
    open.
18. **`volumeModifier`'s population-average conversion factor
    (`POINTS_PER_VOLUME_UNIT.QB`) systematically miscalibrating durable
    per-player outliers — investigated, see item 74. Not a clean fix.**
    The proposed mechanism (blending each player's own season-to-date
    trailing conversion rate into the volume-modifier's conversion
    factor via empirical-Bayes shrinkage) DOES move the originally-
    diagnosed case (Stafford) in the right direction — bias improves
    from -4.00 to -3.31 at the most aggressive shrinkage tested — but
    makes the WHOLE QB pool's calibration and pick accuracy
    monotonically WORSE at every shrinkage strength tested (pool MAE
    6.58→6.89, bias +0.98→+2.06, pick accuracy 61.8%→56.9% from
    population-only to the most aggressive setting) — a clean rejection,
    not an ambiguous tradeoff needing a user decision. Not shipped; no
    `config.ts`/`engine.ts` change. **Left genuinely open for a future
    attempt, if picked up again**: item 74's own best-guess explanation
    is that a player's own points-per-attempt rate — even season-to-date
    — still carries real touchdown-variance noise (the exact thing the
    volume signal was built to filter out, items 6-13) and likely
    double-counts rushing value for dual-threat QBs specifically, since
    it's derived from TOTAL PPR points (passing + rushing) while
    `qbRushModifier` already separately models rushing volume. A
    follow-up attempt should probably start from a units-cleaner
    efficiency proxy isolated from rushing and touchdown variance —
    passing yards per attempt, or completion-percentage-above-
    expectation-adjusted yardage — rather than total points per attempt,
    before concluding the whole idea doesn't work. `cpoe` itself was
    already tested standalone and rejected as a QB signal (item 16,
    44.0%, worse than chance) but that tested it as a PICK-accuracy
    signal directly, not as an input to a shrinkage-based volume-
    modifier fix — a genuinely different use of the same underlying
    stat, not yet tried.
19. **Uneven trades (2-for-1, N-for-M with unequal counts) are
    over-valued toward the larger side — a real bias in the live
    `evaluateTrade.ts`, surfaced by item 90.** Both the live Trade Analyzer
    and the trade backtest sum per-side rest-of-season points with NO
    accounting for the roster/lineup spot a consolidation trade frees, so
    the side with more players is structurally favored (more bodies
    accumulate more total points). Item 90 confirmed it: on 2-for-1s the
    engine's summed projection picks the larger side ~74% of the time and
    barely beats a naive "more players" baseline. The fix (which would make
    BOTH the live verdict fairer and the 2-for-1 backtest a meaningful skill
    measure): credit the short side with a replacement/waiver-level filler
    for each freed starting spot, so both sides field the same number of
    startable players before summing. Needs a defensible "replacement
    level" definition (e.g. the pooled ranking's startable-tier cutoff
    value, position-aware) and touches `evaluateTrade.ts` (live) +
    `multiPlayerTradeBacktest.ts` (backtest) together. Also still unbuilt:
    3+-player-per-side shapes beyond 2-for-2/2-for-1 (item 90 covered the
    two canonical ones).
20. **Trade Analyzer result load-in animation — deferred from item 95.**
    The mockup had a tasteful entrance (the value-balance and per-game bars
    grow from zero, cards/sections rise + fade on load), guarded by
    `prefers-reduced-motion`. It was left out of the shipped
    `TradeResult.tsx` to keep it a lightweight, state-free component (the
    bars render at their final width). Adding it means either a mount
    effect (start bars at `scaleX(0)`, animate to final — making
    `TradeResult` a client component with a small `useState`/`useEffect`)
    or a pure-CSS keyframe reveal keyed off a mount class. Low-priority
    polish, not a correctness issue.
21. **Newsletter signup provider isn't wired yet (item 96).** The Home
    page's signup band POSTs to `/api/subscribe`, which forwards the email
    to a `NEWSLETTER_FORM_ENDPOINT` env var — currently unset, so the live
    Subscribe button returns an honest "signup isn't connected yet"
    message and no email is captured. To finish: set
    `NEWSLETTER_FORM_ENDPOINT` (`.env.local` locally, Vercel project env
    vars in production — same "never commit a secret" discipline as
    `SPORTSDATA_API_KEY`) to Legitfootball's newsletter provider's
    form-POST URL. Most providers (Beehiiv/ConvertKit/Substack/Mailchimp/
    Buttondown) accept a plain `{ email }` POST; if the chosen provider
    needs a richer call (an auth header, a different body shape, a list
    ID), extend `/api/subscribe/route.ts` accordingly. Blocked only on
    which platform Legitfootball actually runs on — asked, not yet
    answered.
22. **Home tool grid wasn't restructured (item 96).** The approved mockup
    promoted Start/Sit to a wide "hero" card with the other tools smaller,
    but the build left the existing six-equal-card 2-col grid as-is, since
    the mockup's version dropped Backtest from the grid and the hero
    restructure is a bigger opinion call. If picked up: promote Start/Sit
    (or another flagship) to a hero card while keeping all six tools
    represented. Presentation-only, `src/app/page.tsx`.
23. **K implied-total weight is validated-higher-on-nflverse but
    unshipped (item 97).** The 4-season nflverse sweep strongly favors
    weighting K's implied-total modifier far above the current 0.175
    (pure form is *below chance* for kickers; slope 1.0/cap 8.0 hit 54.9%
    pooled, every season improving). NOT shipped because it doesn't
    transfer to the production SportsDataIO pipeline (a ±1pp wash on 2025,
    the only season SportsDataIO serves — 50.7/52.0/52.5% across weights,
    no direction), and the current weight is grounded in real 2025
    SportsDataIO data (item 62). The only thing missing to resolve this
    is a second season of SportsDataIO kicker data (2026+), which would
    allow a genuine multi-season production check of a higher weight; the
    nflverse-side evidence is already conclusive that form is nearly
    worthless for kickers and implied total should dominate. Revisit once
    that data exists. (`POINTS_PER_IMPLIED_TOTAL_POINT`/`K_MATCHUP_CAP` in
    `scoreKicker.ts`.)
24. **Player props are display-only; more needs paid Odds API data (item
    98).** The Odds API's current player props now show on the Start/Sit
    cards (visual only, `src/lib/oddsapi/`). Three follow-ups:
    (a) **verify the populated card with real data once Week-1 lines post
    (~September 2026)** — the offseason has no props, so the real name-join
    + market-mapping path has only been validated against a fixture, not
    live data (fail-open means a bug shows nothing, not a break, but it's
    worth a quick live confirmation then). (b) A props-derived **usage
    signal** (a passing-yards or rush-attempt prop line is a more direct,
    market-informed usage measure than target share) can't be backtested
    without **paid historical odds** — revisit only if a paid Odds API
    tier is ever acquired (which also unlocks historical game lines for
    the item-97 spread/total family). (c) **Quota**: the free tier's 500
    req/month is tight for real traffic (~a few dozen distinct games'
    props per month even with caching); at scale it'd need a paid tier or
    a tighter fetch (fewer markets, or only the recommended player).
25. **Player picker follow-ups deferred from the item-99 redesign.** Two
    mockup elements weren't built because they need more than styling:
    (a) **inline season PPR average** in each search result —
    `/api/players` (`searchActiveExtendedPlayers` → `toPlayerSummary`)
    returns roster info only, no stats; adding it means one cached
    `getPlayerSeasonStats` lookup joined onto the results (cheap, but a
    real API change). (b) A **quick-add empty state** (the mockup's
    "most-compared this week") — `PlayerMultiSelect` is shared across six
    tools and has no per-tool feed; the honest wire-up is an optional
    prop the caller passes (Start/Sit → its existing Recent comparisons,
    item 92), not a fabricated "popular" list. Both presentation-adjacent
    and low-risk. Also parked here: the `photoUrl` headshots were reverted
    (item 99) for being too muddy — a higher-res headshot source would
    make the avatars real photos.
26. **Gap-calibrated confidence is pooled across positions (item 100).**
    `GAP_CONFIDENCE_CURVE` is one pooled 2022-2025 curve; the by-position
    curves (QB/RB/WR/TE) were similar and monotonic but thinner at the
    tails. A per-position curve would be marginally more precise
    (superseding item 86's position-aware buckets in a gap-aware way) if a
    future need arises. Also: the guardrail-confidence path feeds the
    season-avg gap through a curve calibrated on finalScore gaps — a
    reasoned approximation, not separately calibrated (the guardrail
    doesn't fire on the backtest, so there's no clean sample to calibrate
    it against). And the depth-chart floor's `DEPTH_STARTER_CONFIDENCE`
    (90) is a reasoned value, not backtest-calibrated (the backtest never
    pairs a starter with a scrub). The depth-chart reader
    (`getCurrentDepthChartRankByNormalizedName`) reads the last-completed
    season's `depth_charts` file — fine in the offseason (the 2025 file
    carries a March-2026 snapshot), but once the 2026 season is underway a
    season-rollforward (try the in-progress season's file, fall back to
    last-completed) would keep the "current starter" signal fresher; also
    the ~554k-row file cold-loads on the first live compare (cached 24h),
    which a lighter fetch (early-stop at the latest snapshot, if the file
    stays sorted latest-first) could avoid.
27. **Extending item 101's backfill to Rankings and Waivers — RESOLVED,
    see item 102.** Both tools' scoring was already fixed transitively (they
    score via `scoreExtendedPlayer`); item 102 extended the same
    offseason-gated window to each tool's own recent-week scan (Rankings'
    eligibility filter, Waivers' candidate ranking) via a shared
    `recentWindow.ts` helper, and surfaced/fixed a real bug — Jayden Daniels
    was excluded from QB rankings entirely for an injury gap. Two related
    threads remain genuinely open: (a) the residual undervaluation of
    rushing QBs from the pass-attempts-only volume signal (item 24) — a
    separate issue from injury poisoning, not something the window fix
    touches; and (b) the backfill only fixes the OFFSEASON regime — the
    backtest showed a blanket in-season version costs QB accuracy (regime
    mismatch, item 101), so there's no clean in-season equivalent unless a
    way is found to distinguish "recovered" from "still ramping" that the
    backtest can actually validate.
28. **Extend the editorial "almanac" look (item 111) to the rest of the
    app.** Right now only Start/Sit is editorial (warm paper / pine-green /
    espresso, Jost + Cinzel); the other five tools (Trade, Waivers, Lineup,
    Legit Rankings, Backtest) and the Home page are still the dark/emerald
    "data-grade" system, and the shared sidebar (`AppShell`) is deliberately
    still dark. This is a real design-system undertaking, not a token tweak
    — here's the map for whoever picks it up:
    - **The cheap 80% is already proven** (item 111): the whole app is
      token-driven (item 80), so wrapping each page's `<main>` in the
      `.matchup-page` class (in `globals.css`) recolors every token-consuming
      shared component inside it (cards, buttons, chips, toggles, tables)
      without touching those components. So the fastest path is: add that
      wrapper (or a renamed app-wide equivalent) to the other five tool
      pages + Home, and swap each page's `PageHeader` for the editorial
      header treatment used in `start-sit/page.tsx` (Cinzel eyebrow + Jost
      title). Each page's own result component (e.g. `TradeResult.tsx`,
      `WaiverResult.tsx`, `LineupResult.tsx`, `RankingsResult.tsx`, the
      Backtest tables) would still look "recolored dark-design" rather than
      truly editorial until restyled — the almanac *typography/rules/paper*
      treatment (like `ComparisonResult.module.css`) is per-component work.
    - **Real decisions to make first**, not just execution: (a) the sidebar
      — keep it dark as a deliberate "chrome vs. document" contrast (current
      choice) or make it editorial too (bigger visual commitment; the sidebar
      is fixed-dark in `AppShell` in both themes today); (b) whether to keep
      the app's dark/emerald as a real theme option or fully replace it (the
      almanac is a committed LIGHT/print world with no dark variant — going
      app-wide means either dropping dark mode or designing a "night edition"
      of the almanac, which is substantial); (c) the `--pos-*` position
      colors (violet/teal/blue player-avatar dots) currently sit unchanged on
      the porcelain — fine in small doses, but app-wide they may want muting
      to stay on-palette; (d) the two fonts (Jost, Cinzel) already load
      app-wide via `layout.tsx`, so no new font work is needed.
    - **Recommended approach**: do it one tool at a time (Trade Analyzer
      next is the closest analog to Start/Sit — verdict + sides), each as
      its own component-level editorial restyle mirroring
      `ComparisonResult.module.css`'s pattern (a scoped CSS Module + the
      shared `.matchup-page` token skin on the page), verifying live against
      real data per the project's standing discipline — rather than one
      giant global flip.

## Voice & Tone
- This tool represents [Legitfootball]'s newsletter brand. Match that
  voice: [Clear, concise and simple].
- Explanations should read like a sharp, trusted friend giving advice —
  not a generic dashboard or a wall of stats.

## Conventions
- `src/lib/sportsdata/` — low-level SportsDataIO fetch client and typed
  data-access functions (`client.ts`, `players.ts`, `seasonStats.ts`,
  `weeklyStats.ts`, `byes.ts`, `timeframes.ts`, `positionDefense.ts`,
  `seasonToDatePlayerStats.ts`, `teamGameStats.ts`, `defense.ts` — item
  62, a thin typed reader over `FantasyDefenseByGame`, the same
  per-week-reader shape as `weeklyStats.ts`). `defenseTeams.ts` (item
  62) mints synthetic D/ST `Player` records from `/Teams` (SportsDataIO
  has no real player identity for a team defense) — synthetic PlayerIDs
  via a `900000 + TeamID` offset, guaranteed not to collide with any
  real PlayerID. `types.ts` itself
  is NOT server-only (unlike the fetch/data-access files above) — it's
  imported from client components too (e.g. `ScoringFormatToggle.tsx`)
  for its plain types/pure functions, `ScoringFormat`/`getFantasyPoints`/
  `parseScoringFormat` (item 50) included, plus `ExtendedPosition` (item
  62, `SkillPosition | "DST" | "K"` — used only where D/ST/K genuinely
  need to flow through the same code as skill positions: search, roster
  marking, waiver-candidate typing; `SkillPosition` itself stays
  untouched, since it's deeply embedded in the validated skill engine).
  `players.ts`'s `getActiveExtendedPlayers()`/`searchActiveExtendedPlayers()`
  (item 62) are additive alongside the original skill-only
  `getActivePlayers()`/`searchActivePlayers()`, not a replacement — internal
  callers like waiver ranking and `hasLimitedTeammate` still depend on
  skill-only semantics, so widening the originals would have been a
  silent behavior change for them. `client.ts` and friends
  remain server-only (guarded via the `server-only` package) — never
  import those from a `"use client"` file. `client.ts`'s `sportsDataFetch()` supports two
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
  unmodified `scorePlayer`/`comparePlayers`, which as of item 50 both
  take an explicit `ScoringFormat` parameter (default call sites that
  haven't been made format-aware — the nflverse-only backtest pipeline,
  the trade backtest — pass `"ppr"` literally, not a default parameter
  value, so it's visible at each call site rather than implicit).
  Tunable weights live in `config.ts` — adjust there as the logic gets
  tuned, per the Recommendation Logic Philosophy section above; the five
  active `POINTS_PER_*` conversion factors are `Record<ScoringFormat,
  ...>` as of item 50, empirically re-tuned per format (see
  "Backtesting & Tuning History" for the full story) — the *disabled*
  factors (weight `0`: red-zone, goal-line, QB success rate, RB EPA,
  teammate-bump) were deliberately left as plain PPR-only numbers, since
  a dormant constant doesn't need per-format recalibration.
  `VOLUME_BLEND_WEIGHT`/`SNAP_SHARE_BLEND_WEIGHT_TE` are *also*
  `Record<ScoringFormat, number>` as of item 52, the only two per-position
  blend *weights* (as opposed to conversion factors) found to have a real,
  every-season-validated per-format optimum — Standard runs higher on
  both (1.0/0.5 vs. PPR/Half-PPR's shared 0.9/0.4); every other weight
  (RB red-zone/EPA, WR drop rate, both QB rushing terms) showed no
  format-specific case and stayed a plain shared scalar.
  `ENSEMBLE_VOLUME_BLEND_RATIO` (item 53) is a different kind of thing
  entirely — a final stage in `scorePlayer`, applied AFTER every modifier
  above, that shrinks the whole `finalScore` toward a simple
  `recentVolumeAvg`-implied estimate (a variance-reduction ensemble
  technique, not a new football signal). `Record<ScoringFormat,
  Record<SkillPosition, number>>`, 1.0 = no-op; only TE in Half-PPR/
  Standard is non-1.0 (0.7) — QB/RB/WR all stay 1.0 in every format after
  a real generalization gap surfaced between the pooled nflverse-only
  sample and the primary SportsDataIO pipeline (see "Backtesting &
  Tuning History" item 53 for the full investigation, including a
  harness bug that was caught before it could ship a false RB signal).
  `volume.ts`'s
  `getVolumeStat()` reads `ReceivingTargets`/`RushingAttempts`/
  `PassingAttempts` off `PlayerGameStat` — these fields were already
  present in every SportsDataIO response but unused until the volume
  signal was added; `sportsDataFetch()` casts the raw JSON rather than
  whitelisting fields, so extending `PlayerGameStat` in
  `sportsdata/types.ts` needed zero fetch/mapping changes anywhere.
  `PlayerComparisonInput.nflverse` (an `NflverseSignals`) carries every
  nflverse-sourced signal from `nflverse/aggregate.ts` into `scorePlayer`
  — see "Backtesting & Tuning History" for how each is scored and current
  as of the most recent item touching it: TE snap share (item 20) and WR
  drop rate (item 33) are additive blends on top of the volume blend; QB
  gets three additional additive terms (rush volume item 30, rush EPA
  item 41) stacked after volume; WR target share + separation is a
  close-call tiebreaker in `comparePlayers`, not part of `finalScore` at
  all (item 20). RB red-zone touches and RB EPA-per-rush were both
  additive blends too, but are now disabled (`REDZONE_BLEND_WEIGHT_RB`/
  `RB_EPA_BLEND_WEIGHT` both `0`) after a four-season pooled re-sweep
  found the combination hurt more than it helped (item 44) — the raw
  signals are still computed and shown in reasoning notes, just no
  longer weighted into `finalScore`. `restOfSeason.ts` (item 47) is a
  fourth, standalone piece alongside the three bridging files above —
  not part of `scorePlayer`/`comparePlayers` at all, but built on top of
  them for the Trade Analyzer: `computeMatchupModifier` is exported from
  `engine.ts` as a pure function so both `scorePlayer`'s single-opponent
  case (the *next scheduled* opponent in live mode as of item 93, the
  target-week opponent in backtest) and `restOfSeason.ts`'s "every future
  opponent" case
  share one formula; `sumProjectedPoints`/`projectRestOfSeason` take a
  player's score with that one matchup term stripped out and re-sum it
  against every remaining opponent on their real schedule.
  `toNflverseTeam`/`toSdioTeam` (the LAR/LA team-code mapping) are
  exported from this file rather than kept private, since `buildInput.ts`
  now needs the same translation for the next-opponent display feature
  below — one source of truth for that mapping rather than a second copy.
  `PlayerComparisonInput`/`PlayerScoreBreakdown` also carry
  `nextOpponent`/`nextGameWeather` (`types.ts`) — a player's next
  scheduled opponent and that game's weather (`GameWeather`, from
  `nflverse/schedules.ts`), populated in live mode only
  (`buildInput.ts`, via the same `getRemainingOpponentsByTeam`/
  `getGameWeatherByTeamWeek` the Trade Analyzer already uses, fetched
  once per `/api/compare` request with the same season-rollforward
  fallback `/api/trade` uses) and always `null` in backtest mode
  (`buildBacktestInput.ts`). The `nextOpponent`/`nextGameWeather` fields
  themselves are still inert display data for `ComparisonResult.tsx` —
  never read by `scorePlayer`/`comparePlayers`. But as of item 93 the live
  matchup rating (`matchupContext`, a separate field) is built from the
  SAME next-opponent lookup and DOES feed `finalScore`: so the next
  opponent now drives live scoring via `matchupContext`, even though these
  two display-only fields still don't.
  `comparePlayers` is now a thin wrapper: it maps skill inputs through
  `scorePlayer` and hands the resulting breakdowns to a newly-exported
  `compareBreakdowns(breakdowns)`, which does the actual ranking/
  tiebreaker logic (item 62 — a pure extraction, no behavior change,
  confirmed via `npx tsc --noEmit` immediately after) so D/ST and K
  breakdowns from the two files below can be ranked through the same
  shared comparison path without being forced through `scorePlayer`
  itself. `scoreDefense.ts`/`scoreKicker.ts` (item 62) are D/ST's and
  K's own scorers — deliberately NOT routed through `scorePlayer`'s
  dozen-signal skill pipeline, since both positions ship on a
  genuinely simpler model (recent-vs-season blend plus exactly one
  additive matchup term, sourced from nflverse's Vegas-implied team
  totals — see "Backtesting & Tuning History" item 62 for the full
  backtest and why D/ST's version of that signal shipped at real
  weight while K's shipped modest and capped). Both share
  `blendRecentAndSeason`/`dataQualityFor`/`skillFieldDefaults`/`average`,
  factored out into `scoreExtendedShared.ts` so the recent-form math
  isn't duplicated a third time. `scoreExtended.ts` is the position-
  family dispatcher every live call site actually calls —
  `scoreExtendedPlayer(playerId, ...)` routes to `scoreDst`/
  `scoreKicker`/`scorePlayer` by position, and
  `projectExtendedRestOfSeason` does the same for the Trade Analyzer/
  waivers rest-of-season projections (D/ST and K's own
  `projectDstRestOfSeason`/`projectKickerRestOfSeason`, in
  `scoreDefense.ts`/`scoreKicker.ts` respectively, fall back to a flat
  recent-form base rate for any week whose implied total isn't known
  yet — in practice, more than ~1 week out — the same honest
  "can't know that far ahead" pattern this app's weather-forecast
  display already established, not a bug). As of item 63,
  `scoreDefense.ts`/`scoreKicker.ts` each also export a synchronous
  backtest-mode input builder (`buildBacktestDstInput`/
  `buildBacktestKickerInput`) — the same live-vs-backtest split every
  skill-position bridging file already has (`buildInput.ts` vs.
  `buildBacktestInput.ts`) — and `scoreExtendedBacktest.ts` mirrors
  `scoreExtended.ts`'s dispatcher for backtest mode
  (`scoreExtendedPlayerBacktest`), consumed by `lib/backtest/
  runBacktest.ts` for the Backtest page's D/ST and K support.
- `src/lib/trade/` — `evaluateTrade.ts` (item 47), the Trade Analyzer's
  evaluation layer. Deliberately thin: reuses `scorePlayer()`'s
  `finalScore` as a standalone per-player value (see item 47's
  architectural note) rather than introducing a second scoring model,
  and reuses `CLOSE_CALL_ABS_POINTS`/`CLOSE_CALL_RELATIVE_PCT` from
  `recommendation/config.ts` for the good/fair/bad threshold rather than
  a separately-tuned one — there's no backtest ground truth to tune a
  trade-specific threshold against yet.
- `src/lib/waivers/` — the Waiver Wire tool's evaluation layer (item 58).
  `rankCandidates.ts` does a cheap, bulk pass across the whole active
  player pool (NOT the full `buildComparisonInput`/`scorePlayer`
  pipeline — that's reserved for the few candidates actually surfaced),
  ranking each position by the gap between a player's recent-volume rank
  and recent-points rank; a real backtest found trend/delta framing adds
  nothing over this absolute-level gap (see item 58), so this is
  deliberately NOT a trend signal. As of item 83, a candidate also has to
  clear a real yards-per-unit efficiency floor (`getEfficiencyStat`,
  `EFFICIENCY_FLOOR_RATIO=0.75`) against the position's real full-season
  baseline (`computeSeasonEfficiencyBaseline`, fetched via
  `getPlayerSeasonStats` — a ratio-of-sums over hundreds of real
  attempts/touches/targets, not the thin recent-candidate pool a first,
  rejected version used) — closes a real false positive where a badly-
  performing backup QB forced into volume still ranked as a top target on
  the opportunity-vs-production gap alone. `buildWaiverReport.ts` runs the real
  engine for just the surfaced top-N candidates, reusing
  `PlayerScoreBreakdown.notes` verbatim rather than inventing new copy
  (same discipline as `ComparisonResult.tsx`/`TradeResult.tsx`), with one
  filtered exception — `scorePlayer`'s WR-only handcuff note is dropped
  in favor of a plain roster-context line, since the shipped note always
  reads "worth roughly 0.0 extra points" (`TEAMMATE_OUT_BUMP_WEIGHT_WR`
  is zeroed, item 35) and reads as self-contradictory next to this
  feature's own context line. `suggestDrop.ts` reuses `lib/trade/`'s
  `evaluateTrade`/`toTradePlayerResult` and
  `recommendation/restOfSeason.ts`'s `projectRestOfSeason` verbatim — a
  same-position "drop X, add Y" suggestion is a 1-for-1 trade evaluation,
  not a new comparison mechanism. As of item 62, `suggestDrop.ts` scores
  both rostered players and pickup candidates through
  `scoreExtendedPlayer`/`projectExtendedRestOfSeason` instead of the
  skill-only `buildComparisonInput`/`scorePlayer`/`projectRestOfSeason`
  path, so a D/ST or K can be a valid drop suggestion too — needed two
  new parameters (`teamWeatherByTeamWeek`/`impliedTotalsByTeamWeek`)
  threaded in from the route, since D/ST/K's matchup modifier depends on
  them the way skill positions' depends on `positionDefenseTable`.
  `rankExtendedCandidates.ts` (item 62) is D/ST's and K's own ranking
  module, deliberately separate from `rankCandidates.ts` rather than a
  generalization of it — the mechanism itself is different (this week's
  matchup-adjusted score vs. season-to-date rank, a real streaming
  signal, not skill positions' volume-vs-points opportunity gap, which
  has no D/ST/K analog). Pre-warms `FantasyDefenseByGame`/
  `PlayerGameStatsByWeek` for every needed week before scanning all 32
  teams/every active kicker, to avoid the same cache-stampede failure
  item 27 already fixed once for the nflverse backtest pipeline
  (confirmed live: this scan pattern reproduced a real
  `SportsDataError: fetch failed` before the fix).
- `src/lib/lineup/` — the Lineup Optimizer's slot model and assignment
  algorithm (item 76), the first whole-roster assignment feature in this
  app (as opposed to Waivers' ranking or Start/Sit's pairwise comparison).
  `rosterSlots.ts` defines `SlotType` (QB/RB/WR/TE/K/DST plus the real
  flex variants Sleeper leagues use — FLEX/SUPER_FLEX/WRRB_FLEX/REC_FLEX)
  and each one's eligible `ExtendedPosition`s, `parseSleeperRosterPositions`
  (turns a real Sleeper league's raw `roster_positions` array into slot
  counts, ignoring bench/taxi/IR entries), `DEFAULT_SLOTS` (a standard
  9-starter shape for when no Sleeper league is connected), and
  `parseSlotsParam`/`serializeSlots` (a compact `<SlotType><count>`
  wire format shared between the client and `/api/lineup`).
  `optimizeLineup.ts` fills fixed single-position slots first with each
  position's own top-scored, already-computed `PlayerScoreBreakdown`s
  (via `scoreExtendedPlayer` — no new scoring, just a new consumer of it),
  then fills flex-type slots from whatever's left over, narrowest-
  eligibility-first — the standard, provably-optimal greedy order for
  this "fixed slots then shared flex" structure at the 0-2-total-flex-
  slot scale nearly every real league uses (documented as a heuristic,
  not a full weighted-assignment solver, for the rare case of several
  overlapping flex types at once). Availability-first sort within each
  position (a healthy/active player always outranks one on a bye or
  Out/Doubtful, regardless of raw score) mirrors `compareBreakdowns`'
  own "prefer healthy, but still fill the slot if that's all there is"
  philosophy (`engine.ts`), just applied to N-way assignment instead of
  a single pairwise comparison. An unfillable slot renders `breakdown:
  null` rather than disappearing, so the UI can show an honest empty-slot
  message instead of silently dropping a row.
- `src/lib/sleeper/` — server-only client for Sleeper's free, no-auth
  public API (item 59), the real-roster-import path that replaced
  manual one-by-one roster marking as the primary way to populate the
  Waiver Wire tool's roster. `client.ts`/`api.ts` mirror `sportsdata/
  client.ts`'s in-process TTL cache pattern (`getSleeperUser` returns
  null for a nonexistent username — Sleeper returns HTTP 200 with a
  JSON `null` body, not a 404, confirmed live — rather than throwing).
  `resolveRoster.ts` resolves EVERY roster in the league in one pass
  (`getSleeperRosters` already returns all of them, not just the
  requesting user's), joining each Sleeper player to a SportsDataIO
  PlayerID. D/ST and K are both resolved as of item 76 (previously both
  were skipped entirely — a decision made when this app genuinely had no
  D/ST or K support, item 59, never revisited when item 62 added real
  support for both; see CLAUDE.md's Lineup Optimizer item for why it was
  finally fixed). K joins by name like any skill player, via a locally-
  built skill+K name index (reusing `nflverse/playerMatch.ts`'s
  `normalizePlayerName`, but NOT the shared `buildSdioPlayerIdByNormalizedName`
  helper, which is deliberately skill-only for its other callers). D/ST
  has no name to join on at all (Sleeper represents a team defense as
  `position: "DEF"`, `full_name: null`, with the team's own abbreviation
  as its `player_id`, confirmed live) — resolved instead against a
  team-code → synthetic-PlayerID map built from the same already-fetched
  extended pool, passed through `recommendation/restOfSeason.ts`'s
  `toSdioTeam` defensively (confirmed live this is a no-op today —
  Sleeper's own codes already match SportsDataIO's, even for the one
  known `LAR`/`LA` mismatch documented elsewhere in this file — kept for
  the same "falls back to its input unchanged" reason `toSdioTeam` itself
  has). Returns two genuinely different things from that one pass:
  the requesting user's own roster (`players`/`unmatched`, matching
  `owner_id` OR `co_owners`) and `leagueRosteredPlayerIds` — every
  player owned by ANY team in the league, IDs only. Item 59 originally
  shipped with only the former; item 60 added the latter after the user
  immediately caught that recommending an opponent's already-rostered
  player is a real correctness bug, not an edge case — a waiver
  candidate has to be unowned league-wide, not just off the requesting
  user's own team. Genuine name-match misses on the user's own roster
  come back as `unmatched` names rather than being silently dropped
  (not tracked per-opponent-roster — a miss there just means that one
  obscure bench player isn't excluded, an accepted, honest gap at the
  same ~99% match rate every other name-join in this app already has).
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
  Notes for the validation story). `priorSeasonAverage.ts` (item 67,
  `getPriorSeasonPprAveragesByNormalizedName`) is a small, standalone
  reader over the same `stats_player` release used by `gameLog.ts` —
  full prior-season per-game scoring average by normalized name, the
  `blendedScore` fallback of last resort for a player with zero games at
  all yet this season (week 1 most commonly); see
  `PlayerComparisonInput.priorSeasonPprAvg` and `engine.ts`'s
  `scorePlayer` for how narrowly this is scoped (only fires when
  `recentPprAvg`/`seasonPprAvg` are BOTH null, never blended against real
  current-season data). `weekTable.ts` combines every source
  above into one `PlayerID -> week -> stat` table, built by both
  `backtest/loadRun.ts` (batch, one call for the whole season) and
  `recommendation/nflverseLive.ts` (live, one call per comparison
  request). `aggregate.ts` is the shared, pure "what's a player's recent
  signal value" layer on top of that table (`averageSnapShare`/
  `averageTargetShare`/`averageSeparation`/`averageRedZoneTouches`/
  `averageGoalLineTouches`/`averageSuccessRate`/`averageEpaPerPlay`/
  `averageDropRate`/`averageQbRushEpa` — the last one QB-only, reading
  the same `rushEpaPerPlay` field RB's EPA signal uses, just for a QB's
  own carries; see item 41) —
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
  read via the separate `nflverseStatForWeek()` accessor instead. Used by
  the `injuryStatus` backtest baseline (item 18) and, as of item 56, by
  `buildBacktestInput.ts` itself — real, pregame Out/Doubtful status now
  reaches `comparePlayers`' existing exclusion filter in backtest mode
  too, not just live mode (which already had real-time injury status
  from SportsDataIO directly, unaffected by this change). `NflverseWeekStat`
  also carries `rosterStatus` (item 57, `nflverse/rosters.ts`) — a
  separate current-week fact from `injuryStatus`, since it comes from the
  weekly roster release rather than the injury report; `buildBacktestInput.ts`
  treats a `"RES"` `rosterStatus` as equivalent to `"Out"`, taking priority
  over `injuryStatus` when both are present.
  `gameLog.ts`/`schedules.ts` are the two files that make nflverse usable
  as a *primary* data source, not just a supplement — `gameLog.ts` builds
  a full `PlayerGameStat[][]` game log from `stats_player`, and
  `schedules.ts` derives bye weeks, per-team-per-week game weather
  (`getGameWeatherByTeamWeek` — roof/temp/wind, backs the WR-only `wind`
  baseline, item 39), and each team's remaining regular-season opponents
  (`getRemainingOpponentsByTeam` — item 47, live-mode-only; powers the
  Trade Analyzer's rest-of-season projection, not used by backtest mode,
  which derives the equivalent directly from its own already-fetched
  historical box scores instead — see `tradeBacktest.ts` below), and
  each team's Vegas-implied point total per week
  (`getImpliedTeamTotalsByTeamWeek` — item 62, `total_line/2 ±
  spread_line/2` from the same `games.csv` rows, sign confirmed live
  against SportsDataIO's `GameOddsByWeek` for a real game before
  trusting it — the shared matchup signal behind both D/ST's and K's
  simplified scorers, see "Backtesting & Tuning History" item 62) from the
  `schedules` release's `games.csv` (no dedicated byes/schedule endpoint
  exists on either SportsDataIO or, for byes, nflverse). `depthCharts.ts`
  reads the
  `depth_charts` release (official starter/backup role) — usable for
  2022-2024 only, since 2025's file uses a structurally incompatible
  ESPN-scrape/timestamp schema (item 37/46); backs the RB/WR-only
  `depthChart` baseline. All of these are used only by
  `backtest/loadRunNflverseOnly.ts` (item 24), never by the live tool or
  the primary 2025 backtest.
- `src/lib/fantasypros/` — server-only client for `dynastyprocess/data`
  (item 68/69), a free, no-auth GitHub repo, but a genuinely different
  fetch SHAPE from every other external source in this app: not a
  release asset (nflverse's pattern) or a REST endpoint (Sleeper's), but
  a file whose past state has to be reconstructed from git commit
  history (see Data Source Notes for why). `client.ts` has its own small
  GitHub REST + raw-content fetcher and its own quote-aware CSV parser
  (duplicated from, not shared with, `nflverse/client.ts`'s — different
  host/URL shape, and this file is small enough that none of that
  parser's column-filtering-at-scale concerns apply) — `fetchCommitHistory()`
  (paginated, 24h cache) and `fetchSnapshotAtCommit(sha)` (30-day cache,
  content is immutable once committed). `weeklyConsensus.ts`'s
  `getExpertConsensusByNormalizedNameWeek(season, maxWeek)` orchestrates:
  get the season's real week-start dates (`nflverse/schedules.ts`'s
  `getWeekStartDates`, reusing that file's own already-cached `games.csv`
  fetch), find the latest commit strictly before each week's kickoff
  (local date-matching against the one cached commit list — no
  per-week API calls), fetch+parse that commit's snapshot, normalize
  names via the same `nflverse/playerMatch.ts` join every other external
  source here uses. Fetches weeks sequentially (not `Promise.all`) —
  same politeness-toward-a-many-request-source discipline as
  `loadRunNflverseOnly.ts`'s own sequential staging (item 27). Used by
  both backtest pipelines as of item 70 (`loadRunNflverseOnly.ts` and,
  since item 70 needed a primary-pipeline check per item 53's
  whole-score-signal precedent, `loadRun.ts` too) — resolved onto each
  pipeline's own PlayerID space at load time, backs the (deliberately
  unscoped across all four positions) `pickByExpertConsensus` baseline
  and, in `loadRun.ts`'s case, feeds `finalScore` directly via
  `EXPERT_CONSENSUS_BLEND_WEIGHT`. `client.ts`'s `fetchCurrentSnapshot()`
  (item 73) is the live-mode counterpart to the historical
  commit-mining path above — no commit lookup at all, just the file's
  current branch HEAD (confirmed live: `master`, not `main`), cached 6h
  rather than the historical path's 30-day pinned-commit cache, since
  this content changes as new commits land. `weeklyConsensus.ts`'s
  `getCurrentExpertConsensusByNormalizedName()` parses it the same way
  as the per-week reader, minus the week dimension — this is what
  `buildInput.ts` (live mode) reads, threaded through
  `scoreExtended.ts` into all three live routes, the piece that was
  missing from item 70's original ship (see CLAUDE.md item 73).
- `src/lib/oddsapi/` — server-only client for The Odds API (item 98),
  the app's betting-lines source for the Start/Sit cards' display-only
  "Betting lines" section. `client.ts` (in-process TTL cache doubling as
  quota protection — the free tier is only 500 req/month; reads
  `ODDS_API_KEY`, throws so every caller fails open to no-props),
  `props.ts` (`getPropsForPlayers` plus the pure, unit-testable
  `extractPlayerLines`; fetches upcoming events + per-event props, joins
  to players by `normalizePlayerName`, position-scoped markets),
  `types.ts` (plain display types with NO `server-only` import, so the
  client `ComparisonResult.tsx` can `import type` them without pulling
  server code into the client bundle). Strictly display-only — never
  touches `PlayerScoreBreakdown` or any scoring path; `/api/compare`
  returns it as a separate `propsByPlayerId`, empty in the offseason
  before books post props. See Data Source Notes for the free-tier
  limits.
- `src/lib/backtest/` — the backtesting feature: `loadRun.ts` (the only
  network I/O — fetches every needed week once per request, both
  player-level and team-level rows, plus the nflverse tables above; as
  of item 63, also `allDefenseWeeklyRows`/`dstPlayerIdByTeam`/
  `dstPlayers`/`impliedTotalsByTeamWeek` — D/ST's and K's own backtest
  data, primary-pipeline-only, same optionality pattern as
  `teamWeatherByTeamWeek`/`depthChartByPlayerIdWeek`),
  `weekData.ts` (pure per-week slicing/aggregation from that batch —
  team pace and the nflverse stats use the same *recent*-weeks window
  as player recent-form, not full season-to-date, since team/player
  tendencies can shift within a season; item 63 added
  `targetWeekDefenseRows`/`dstSeasonGamesByTeam`/
  `recentDefenseGamesByTeam` for D/ST and a position-agnostic
  `seasonGamesByPlayer` — deliberately NOT reusing
  `seasonToDateTable`, which is skill-position-filtered by design, see
  "Backtesting & Tuning History" item 63), `grading.ts`
  (correct/incorrect/push/no_pick outcomes + accuracy summary, plus
  `summarizeByCloseCall` for confidence-calibration checks — as of item
  50, `gradeOutcome`/`gradeWeek` take an optional `ScoringFormat`,
  default `"ppr"`, so ground truth is graded in whatever format the
  engine was scored in), `baselines.ts`
  (naive strategies graded by the identical `gradeOutcome` rules as the
  engine, over the same weeks/matchups, so accuracy is directly
  comparable — prior-week points, season-to-date average, recent volume,
  plus every nflverse-backed signal tested so far: `snapShare`/
  `targetShare`/`airYardsShare`/`cpoe`/`aggressiveness`/`separation`/
  `yacAboveExpectation`/`rushYoe`/`receivingComposite`/`qbRushingAttempts`/
  `goalLineTouches`/`epaPerPlay`/`successRate`/`createdReceptionRate`/
  `teammateOutBump` (never shipped into the engine), `injuryStatus`/
  `wind`/`depthChart`/`expertConsensus` (real, permanent,
  current-week-fact baselines — items 18/39/46/69 — not engine-integrated
  but not "unshipped" either, just standalone; `expertConsensus` is
  external/human-sourced rather than derived from box scores or
  play-by-play like the other three), and `redZoneTouches`/`dropRate` (both WERE shipped
  into the engine at some point — `dropRate` still is, WR-only;
  `redZoneTouches`'s engine weight was later zeroed, item 44, though the
  baseline itself still runs — every picker in `baselines.ts` is format-
  aware as of item 51, though only `pickPriorWeek`/`pickSeasonAvg`
  actually branch on it, since every other baseline compares raw
  counts/rates rather than points; see Open Items). See "Backtesting &
  Tuning History" for
  the full status of each), `pairing.ts` (broad-mode adjacent-rank
  pairing methodology — `buildPairsForWeek`/`buildAllPairsForWeek` also
  take an optional `ScoringFormat`, default `"ppr"`, as of item 50,
  since which players count as "adjacent rank" genuinely shifts by
  format; item 63 added `buildDstPairsForWeek`/`buildKickerPairsForWeek`
  plus the dispatching `buildAllExtendedPairsForWeek`, all skill-only
  `buildPairsForWeek`/`buildAllPairsForWeek` left completely unchanged —
  `CandidatePair.position` is now `ExtendedPosition`, which needed one
  targeted cast in `tradeBacktest.ts` since that file only ever produces
  skill-only pairs but the shared type widened under it), `runBacktest.ts`
  (orchestration — `runPairBacktest`/
  `runBroadBacktest` are format-aware as of item 50, and
  `gradeBaselinesForPair` itself gained a `format` parameter in item 51
  after both call sites were found to be silently dropping the
  already-in-scope `format` variable; `runBacktestNflverseOnly.ts` is
  fully format-aware too as of item 51 — only `tradeBacktest.ts` still
  calls everything with `"ppr"` hardcoded, per Open Item 6. As of item
  63, both `runPairBacktest`/`runBroadBacktest` score every player
  through `scoreExtendedPlayerBacktest`/`compareBreakdowns` instead of
  `buildBacktestComparisonInput`/`comparePlayers` directly, so a request
  can freely mix skill positions with D/ST or K; `toDstActualRows` builds
  a small, request-scoped array of `PlayerGameStat`-shaped rows from
  that week's real D/ST box scores so `gradeWeek` can grade a D/ST pair
  without D/ST ever needing a row in `allWeeklyRows` itself. Baseline
  grading is skipped entirely for D/ST/K pairs in both functions — see
  item 63 for why), `config.ts`/
  `params.ts` (tunables, query parsing — item 63 added
  `parseExtendedPositionsParam`, used only by `/api/backtest/broad`;
  every other position-param route, including the nflverse-only and
  trade-backtest ones, still uses the original skill-only
  `parsePositionsParam`). The engine's own grading logic
  still always treats injury status as unknown — the `injuryStatus`
  baseline above is the only place in backtest mode that reads real
  historical designations, and only as a standalone trial (see Data
  Source Notes). Both API routes return `baselineSummaries` and
  `confidenceBreakdown` alongside the engine's own accuracy so results
  are never reported in isolation from a baseline/calibration check.
  `loadRunNflverseOnly.ts`/`runBacktestNflverseOnly.ts` (item 24) are a
  parallel, nflverse-only path for validating the tuned engine weights
  against seasons SportsDataIO won't serve (2022-2024) — same
  `BacktestRunData` shape and same scoring/grading functions as the
  primary pipeline, just a different loader and a duplicated (not
  shared) orchestration loop, kept separate deliberately to avoid any
  risk to the already-validated 2025 numbers.
  `runBroadBacktestNflverseOnlyMultiSeason` (same file) pools this same
  pipeline across an arbitrary season list (default 2022-2025) into one
  combined sample, reporting both pooled and per-season breakdowns — the
  permanent home for the "more robust, cross-season" checks used
  throughout items 39-46 (as opposed to the 2025-vs-one-other-season
  checks items 1-38 relied on). `tradeBacktest.ts` (items 48-49) is the
  Trade Analyzer's own backtest — a parallel feature, not an extension of
  `runBacktest.ts`, since it grades a different thing (rest-of-season
  totals across synthetic 1-for-1 trades, not single-week picks) but
  reuses the same `pairing.ts`/`sliceWeekData`/`BacktestRunData`
  plumbing. `collectTradeResultsForSeason` is its own per-season/per-
  cutoff walk (mirroring `collectBroadResultsForSeason`'s role in
  `runBacktestNflverseOnly.ts`), shared by the single-cutoff
  `runTradeBacktest` and the pooled `runTradeBacktestMultiSeason`.
  `multiPlayerTradeBacktest.ts` (item 90) extends this to cross-position
  2-for-1/2-for-2 synthetic trades (route
  `/api/backtest/trade-multi-nflverse-multiseason`) — sides value-balanced
  by season-to-date average, graded by summed rest-of-season projection vs
  actual, reusing `tradeBacktest.ts`'s now-exported
  `buildOpponentsByTeamWeek`/`projectFromHistory`/`actualRestOfSeasonTotal`.
  It reports a permanent naive "pick the side with more players" baseline
  alongside the engine, because uneven-count (2-for-1) trades are
  structurally confounded by count under summed-total grading (see
  "Backtesting & Tuning History" item 90 and Open Item #19); 2-for-2
  (even counts) is the clean measure.
  `projectionGrading.ts`/`runProjectionBacktest.ts` (item 65) are a
  third parallel feature alongside `tradeBacktest.ts` — grading
  `finalScore` itself as a continuous point projection (MAE/RMSE/bias)
  rather than a binary pairwise pick, on the same "realistic startable
  pool" `pairing.ts`'s `buildRankedPoolForWeek` (extracted out of
  `buildPairsForWeek` for this reuse, no behavior change to the
  existing pairing) already defines. `runProjectionBacktest`'s
  `byPlayer` result groups the same already-computed
  `ProjectionGradeResult`s by `playerId` (no new scoring/fetching) into
  a `PlayerProjectionSummary[]`, sorted worst-MAE-first. Scoped to the
  primary 2025
  SportsDataIO pipeline, PPR, and skill positions only for now — see
  Open Items for the D/ST/K, other-format, and other-season extensions.
  `playerProjectionLookup.ts` (item 65) is a genuinely separate function
  from `runProjectionBacktest.ts`, not a thin wrapper — grades
  specific, user-searched players week-by-week (`PlayerWeekProjection[]`
  per player) without restricting to `buildRankedPoolForWeek`'s pool,
  since a searched player's own history matters regardless of pool
  membership that week; the same player can legitimately show different
  summary numbers between this and `runProjectionBacktest`'s `byPlayer`
  as a result (see item 65's Stafford example) — a real methodology
  difference, not a bug.
- `src/app/api/players` (item 62: now calls `searchActiveExtendedPlayers`
  instead of the skill-only `searchActivePlayers`, so D/ST and K appear
  in the shared `PlayerMultiSelect.tsx` search box everywhere it's used —
  see item 81; `PlayerSearchInput.tsx` was that shared search box before
  item 81 replaced it, and is now deleted),
  `src/app/api/compare`, `src/app/api/trade`
  (item 47 — both `compare` and `trade` also accept an optional
  `scoringFormat` query param, `ppr`/`half_ppr`/`standard`, via
  `parseScoringFormat()`, item 50). `compare` also fetches
  `getRemainingOpponentsByTeam`/`getGameWeatherByTeamWeek` (the
  next-opponent/weather display feature — see Overview and Conventions'
  `buildInput.ts` entry) using the identical season-rollforward pattern
  `trade` already established, rather than a second copy of that logic.
  As of item 62, `compare`/`trade` also fetch
  `getImpliedTeamTotalsByTeamWeek` and score every requested player
  through `scoreExtendedPlayer`/`compareBreakdowns` (D/ST/K's dispatcher
  and shared ranking path — see Conventions' `recommendation/` entry)
  instead of calling `buildComparisonInput`/`scorePlayer`/
  `comparePlayers` directly, so a request can freely mix skill positions
  with D/ST or K.
  `src/app/api/waivers` (item 58) orchestrates `lib/waivers/`'s
  ranking/report/drop-suggestion layers, same error-handling shape as
  `trade`. As of item 62, also fetches implied totals and calls
  `rankExtendedWaiverCandidates` alongside the skill-only
  `rankWaiverCandidates`, merging D/ST and K results into the same
  `candidatesByPosition` response and passing weather/implied-totals
  through to `suggestDrops` too. Two distinct query params, not one, as of item 60: `rostered`
  (comma-separated PlayerIDs, the user's own roster) excludes those
  players from the ranking pool AND supplies the drop-candidate pool;
  `leagueRostered` (every player owned by any OTHER team in a connected
  Sleeper league) also excludes from the ranking pool but is never
  passed to the drop-candidate step — you can't drop a player you don't
  own. `src/app/api/sleeper/leagues` and `src/app/api/sleeper/roster`
  (item 59) orchestrate `lib/sleeper/` — `leagues` resolves a username
  to its real leagues (querying both the last-completed and upcoming
  season, since a redraft league might not have reset yet while a
  dynasty league might already exist for next season), `roster`
  resolves one league+user into the requesting user's own SportsDataIO
  players (ready to feed straight into the same roster state the manual
  `PlayerMultiSelect.tsx` flow already populates) plus, as of item 60,
  `leagueRosteredPlayerIds` for every team in that league.
  `src/app/api/lineup` (item 76) mirrors `/api/compare`/`/api/trade`'s
  fetch block exactly (full live-data parity — same context/schedule/
  weather/implied-totals/expert-consensus fetches every other live route
  already does), scores every rostered `ids` player via
  `scoreExtendedPlayer`, then calls `lib/lineup/optimizeLineup.ts`. Slot
  counts travel as a compact `<SlotType><count>` string parsed/serialized
  by `lib/lineup/rosterSlots.ts`'s `parseSlotsParam`/`serializeSlots`.
  `src/app/api/backtest/pair`,
  `src/app/api/backtest/broad` (also `scoringFormat`-aware, item 50),
  `src/app/api/backtest/broad-nflverse`,
  `src/app/api/backtest/pair-nflverse`,
  `src/app/api/backtest/broad-nflverse-multiseason`,
  `src/app/api/backtest/trade`, `src/app/api/backtest/trade-nflverse`,
  `src/app/api/backtest/trade-nflverse-multiseason` (the trade-backtest
  trio is items 48-49; the other nflverse-suffixed routes are items
  24/36/39 — all out-of-sample validation only), `src/app/api/backtest/
  projection` (item 65 — MAE/RMSE/bias grading, 2025/PPR/skill-only for
  now; `positions` and an optional `ids` param are independent — the
  route reads `positions` off the raw query value directly rather than
  through `parsePositionsParam`'s own default-to-all-positions
  behavior, specifically so an empty `positions` param can mean "run
  zero pool positions," not "give me everything," when the request is
  really just a player-specific lookup) — Route Handlers that
  orchestrate the lib layers above and return trimmed JSON (never proxy
  raw upstream payloads, never leak the API key).
- `src/components/` — `AppShell.tsx` (item 64 — the persistent sidebar
  shell wrapping every page from `layout.tsx`, replacing the old
  `NavBar.tsx`, now deleted) and `PageHeader.tsx` (item 64 — the compact
  title/subtitle every page uses in place of its old full-bleed hero),
  `StartSitTool.tsx`/`PlayerMultiSelect.tsx`/`ComparisonResult.tsx` (live
  start/sit mode, at `/start-sit` as of item 64 (previously `/`) — as of
  item 81, `PlayerMultiSelect.tsx` is the shared chip-plus-search
  component every player-picking tool in this app uses, replacing the
  old `PlayerSearchInput.tsx` (deleted); see Overview and that item for
  the full six-site migration. As of items 85/87, `ComparisonResult.tsx`
  no longer gates its player cards behind one global "Why this pick"
  toggle — cards render always, sorted by real `finalScore`, each with a
  large projection number, a real floor-to-ceiling range bar
  (`recentPprFloor`/`recentPprCeiling`, item 85), a position-specific
  stat-tile grid, matchup context + next opponent + weather (moved here
  from the sidebar by item 87), and its own per-card "Why this pick"
  reading that player's real `.notes`. The verdict banner's confidence
  bar is now position-aware (`CONFIDENCE_BY_POSITION`, item 86) and
  shows four static reference-scale markers under the real percentage).
  As of item 64, `StartSitTool.tsx`
  lays out as a 2-column grid with a new `StartSitRail.tsx` alongside
  `ComparisonResult.tsx` — as of item 87, the sidebar holds only
  `KeyTakeawaysPanel` (`result.reasoning`, item 85 — the pairwise
  comparison-level summary that needed a new home once the old global
  toggle was removed) and `RecentComparisonsPanel` (exported for
  reuse) backed by `src/lib/useRecentComparisons.ts`, a localStorage
  hook mirroring `useRosteredPlayers.ts`'s pattern that records real
  Start/Sit results the user has actually run this session — the
  sidebar's original `MatchupContextPanel`/`InjuryWeatherPanel` (added by
  item 85) were both deleted by item 87 once their content moved into
  the player cards themselves, rather than being duplicated in both
  places (a deliberate choice, not an oversight — see that item).
  `RecentComparisonsHomeCard.tsx` is a thin "use client" wrapper around
  that same panel so the (server-rendered) Home page can show it too
  without itself needing to be a client component. `TradeAnalyzer.tsx`/`TradeResult.tsx` (live Trade
  Analyzer mode, at `/trade`, item 47 — `TradeAnalyzer.tsx` reuses
  `PlayerMultiSelect.tsx` for both sides of a trade, via its
  `extraExcludeIds` prop for the cross-side exclusion), `ScoringFormatToggle.tsx`
  (item 50 — the PPR/Half-PPR/Standard segmented control, shared by
  `StartSitTool.tsx` and `TradeAnalyzer.tsx`; its selected value is
  owned by `src/lib/useScoringFormat.ts`, a small localStorage-backed
  hook — no backend/account system, consistent with this app's "no
  persistence" scope — so the choice carries across both live tools
  within a session), `WaiverTool.tsx`/`WaiverResult.tsx` (live Waiver
  Wire mode, at `/waivers`, item 58 — `WaiverTool.tsx` also reuses
  `PlayerMultiSelect.tsx` (item 81) for one-off manual roster additions,
  backed by
  `src/lib/useRosteredPlayers.ts`, a localStorage hook mirroring
  `useScoringFormat.ts`'s pattern (item 82 added `clearRostered()`
  alongside the original `addRostered`/`removeRostered`); the roster
  block is wrapped in a `CollapsibleSection.tsx` (item 82, label
  `Your roster ({count})`, expanded by default) with a `ConfirmButton.tsx`
  "Clear" action in its header — a click-again-to-confirm control,
  deliberately not a native `window.confirm()` dialog, which would break
  out of this app's own styling. As of item 83, `WaiverResult.tsx`
  renders each position as a `RankingsResult.tsx`-style bordered
  row-list (one container per position, thin dividers, each row
  collapsed by default and individually expandable — `ChevronIcon`
  imported from `CollapsibleSection.tsx` for reuse) rather than the
  original two-column card grid; `WaiverResult.tsx`'s "Already
  rostered" button both dismisses a candidate from the current view
  instantly via local state and adds it to the roster list for future
  runs), `SleeperImport.tsx` (item 59 — the primary way to populate that
  same roster state now: username → real league picker → one-click
  import, or once connected, "Sync roster"/"Change league"; persisted
  via `src/lib/useSleeperConnection.ts` so the username/league never
  needs re-entering — the connection object itself is owned by
  `WaiverTool.tsx`, not this component, since item 60's leaguewide
  exclusion needs `connection.leagueRosteredPlayerIds` for the
  `/api/waivers` request; `SleeperImport.tsx` receives
  `connection`/`onConnectionChange` as props rather than calling
  `useSleeperConnection()` itself, which would create a second
  independent copy of the same localStorage-synced state that wouldn't
  see this component's own updates), `LineupTool.tsx`/`LineupResult.tsx`/
  `RosterSlotsEditor.tsx` (live Lineup Optimizer mode, at `/lineup`, item
  76 — `LineupTool.tsx` mirrors `WaiverTool.tsx`'s exact shape, owning
  its own `useRosteredPlayers()`/`useSleeperConnection()` instances, and
  as of items 81/82 also mirrors its `PlayerMultiSelect.tsx`/
  `CollapsibleSection.tsx`/`ConfirmButton.tsx` roster-panel structure
  exactly;
  since both hooks are backed by the SAME localStorage keys as Waivers',
  connecting Sleeper or adding a player on either page is really one
  shared roster/connection, not a per-tool one — verified live.
  `RosterSlotsEditor.tsx` is a compact grid of per-`SlotType` steppers,
  re-populated from `lib/lineup/rosterSlots.ts`'s
  `parseSleeperRosterPositions(connection.rosterPositions)` whenever the
  connected league actually changes, tracked via a ref so it doesn't
  clobber further manual edits on every render; `LineupResult.tsx`
  groups starters by slot, reusing `PlayerScoreBreakdown.notes` verbatim
  for reasoning — same "one source of truth" precedent as
  `WaiverResult.tsx`/`TradeResult.tsx` — plus a Bench section),
  `HomeLineupWidget.tsx`/`HomeWaiverWidget.tsx`/`HomeTradeWidget.tsx`
  (item 77 — three self-fetching client widgets in a new "This week"
  section at the top of the Home page, each independently calling
  `/api/lineup`/`/api/waivers`/`/api/trade-suggestion` on mount rather
  than the server-rendered page fetching for them, so a slow/failed
  widget never blocks the rest of Home from rendering; each degrades to
  its own honest empty/error state — e.g. `HomeTradeWidget.tsx` shows
  nothing actionable when no Sleeper league is connected, rather than a
  fake placeholder, per this app's standing "no dummy data" rule).
  `HomeWaiverWidget.tsx` picks its single top candidate using
  `WaiverResult.tsx`'s exported `POSITION_ORDER`/`isStreamingPosition`/
  `moveHeadline`, reused rather than re-derived. `RankingsTool.tsx`/
  `RankingsResult.tsx` (item 78 — the Legit Rankings tool, at
  `/rankings`) render `RankingsTab = "OVERALL" | "QB" | "RB" | "WR" |
  "TE"` (default `"OVERALL"`, internal value unchanged since item 78 —
  only its user-facing `TAB_LABEL` changed, to "Top 100", by item 84),
  fetching `/api/rankings` per tab;
  `RankingsResult.tsx` takes a plain `positionLabel: string` prop
  (not `ExtendedPosition`) since the Top 100 tab's rows span multiple
  real positions at once, each with its own within-position rank
  reassigned by `getLegitRankingsOverall` (`lib/rankings/
  buildRankings.ts` — as of item 84, this reads each position's real
  UNCAPPED ranked list via a new internal `getFullLegitRankingsForPosition`
  rather than the per-tab display-capped one, so the combined view can
  pick a genuine top 100 across positions rather than whatever was left
  over from each tab's own cap) rather than reusing whichever position's
  rank the row happened to carry from its own position-specific
  computation, and
  `BacktestTool.tsx`/`BacktestWeekTable.tsx`/`BacktestSummary.tsx`/
  `BacktestCaveatNote.tsx`/`TradeBacktestTable.tsx`/`ProjectionSummary.tsx`/
  `ProjectionPlayerTable.tsx`/`ProjectionPlayerDetail.tsx`
  (backtest mode, at
  `/backtest` — `BacktestTool.tsx` has four modes, Single pair/Broad/
  Trade analyzer/Projection accuracy, the last two added in items 48/65
  respectively; `TradeBacktestTable.tsx` is
  its per-trade detail table, mirroring `BacktestWeekTable.tsx`'s role
  for the other two modes. As of item 63, Broad mode's position
  checkboxes also include D/ST and K, gated to `season === "2025"` — no
  UI change was needed in `BacktestSummary.tsx` for the new by-position
  rows to render, since `byPosition` was already a plain
  `Record<string, ...>` iterated generically. `ProjectionSummary.tsx`
  (item 65) deliberately mirrors that same plain banner-row layout —
  MAE/RMSE/bias instead of an accuracy percentage — rather than
  introducing a new visual language for the backtest page's secondary/
  internal tool; Projection accuracy mode hides the season toggle
  entirely and forces 2025, since `runProjectionBacktest` only supports
  the primary pipeline so far. `ProjectionPlayerTable.tsx` (item 65,
  added on direct follow-up request) renders the same per-player
  breakdown as a plain table, mirroring `BacktestWeekTable.tsx`'s
  `overflow-x-auto` styling rather than a third layout convention.
  `ProjectionPlayerDetail.tsx` (item 65, second follow-up request) adds
  the "Look up specific players" chip-list + search UI and renders
  `playerProjectionLookup.ts`'s week-by-week Projected/Actual/Diff table
  per searched player, same table styling again).
  **Restyled twice, historically.** A first Apple-inspired pass (teal
  `--accent`, `-apple-system` type, `font-rounded`/`ui-rounded` on stat
  numerals) superseded the original indigo-accent design and
  deliberately excluded `BacktestTool.tsx`'s own chrome (kept on prior
  zinc/rounded-md styling as the secondary/internal validation tool).
  **Both of those are now themselves superseded by item 80's full
  dark/emerald redesign**, adopted from a teammate-shared design
  reference and applied everywhere, Backtest included this time — see
  item 80 for the full page-by-page rollout and the clarifying
  questions asked before building it. `globals.css` now defines: `--accent`
  (emerald `#00E07F`/`#00B868` — brand, verdict-positive, AND recommended-
  pick semantics all share this one token, a deliberate merge from the
  prior system's teal-accent/emerald-verdict split, made because the
  reference design uses one green throughout) plus `--bad`/`--caution`/
  `--info` (unchanged in meaning, retuned in hex) and two new tokens:
  `--premium` (gold `#E8C468`, reserved for a rare top tier — currently
  only the Legit Rankings 90+ score band) and `--accent-secondary`
  (`#00B868`, the reference's secondary green, used sparingly for
  depth/hover rather than as a second semantic meaning). Both light and
  dark are first-class, tuned independently — dark uses the near-black
  navy `#0B0E0C` background from the reference directly; light is this
  app's own equivalent construction, not copied from any reference,
  since the design brief only specified a dark treatment. `--font-sans`
  moved from `-apple-system` to Inter (self-hosted via
  `next/font/google`, `layout.tsx`); a new `--font-display` (Barlow
  Condensed, bold/condensed) is used for headlines/verdict names/nav
  wordmark via a `font-display` utility class; `--font-mono` (renamed
  from the prior system's `--font-rounded`, and now genuinely JetBrains
  Mono via `next/font/google` rather than a system UI-rounded fallback)
  is applied to every stat numeral across the app — the same call sites
  `font-rounded` used before, plus several more picked up while
  migrating each page off the old zinc/amber/sky/emerald palette
  (`BacktestCaveatNote.tsx`, `BacktestSummary.tsx`, `BacktestTool.tsx`,
  `BacktestWeekTable.tsx`, `TradeBacktestTable.tsx`,
  `ProjectionSummary.tsx`, `ProjectionPlayerTable.tsx`,
  `ProjectionPlayerDetail.tsx`). The same template-literal-Tailwind-class
  bug class the first pass already caught once (`` `bg-${token}/12` ``
  not resolving through Tailwind's static scanner, requiring a lookup
  object like `VERDICT_BADGE` instead of string interpolation) was
  re-confirmed still true and re-avoided throughout this pass — no new
  instances introduced. One collision fixed while merging `--accent`
  and the old `--good` into one emerald: `RankingsResult.tsx`'s
  `legitScoreClasses` tiering previously used `--accent` and `--good` as
  two visually distinct bands (60+ / 85+) — under the merged token
  those would have rendered identically, so it was collapsed to a
  single 70+ emerald tier plus a new 90+ `--premium` gold tier (chosen,
  via `AskUserQuestion`, over a Backtest-accuracy-number or a
  general "any 90+ score" application — Rankings' elite tier was judged
  the clearest, least noisy fit for a reserved-for-rare highlight
  color). The design's dark verdict-banner treatment
  (dark card background, green accent, confidence bar) already existed
  structurally in `ComparisonResult.tsx` from item 79's restructure —
  item 80 restyled its colors/type (`font-display text-[34px]` on the
  winner name) rather than rebuilding its layout, since the two changes
  were complementary, not competing (item 79: information hierarchy;
  item 80: visual identity).
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
