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

**Current state at a glance (as of item 179).** Seven live pages:
**Start/Sit** (`/start-sit`), **Trade Assistant** (`/trade`), **Waivers**
(`/waivers`), **Lineup Optimizer** (`/lineup`), **Legit Rankings**
(`/rankings`), **Player Stats** (`/stats`), and **Backtest** (`/backtest`,
the internal validation tool), behind a Home hub (`/`) and a persistent
sidebar shell.

Data sources, in one line each: **SportsDataIO** is the primary source for
everything the live tools do — box scores, season stats, weekly and
season projections (the consensus signal), advanced metrics, betting lines,
teams/players. **nflverse** (free, no auth) supplies what SportsDataIO's
current plan can't: the game schedule (next opponent, weather, Vegas
implied totals), play-by-play-derived signals, depth charts, and the
2022-2025 backtest pipeline. **Sleeper** (free, non-commercial licence)
supplies real league/roster import.

Two things a new session should know before touching data: the **legacy
SportsDataIO key is load-bearing, not legacy** — it is the only thing
serving 2025, and every tool runs on the last completed season (item 178).
And the app is on **two disjoint subscriptions** routed by season
(`seasonRouting.ts`), so 2025 and 2026 come from different hosts with
different keys (item 158).

The paragraphs below are the running historical record of how the project
got here — read them for the reasoning behind a decision, not as a
description of today's UI.

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
(`/trade`) — **user-facing name later changed to "Trade Assistant," item
152; the component/route are still `TradeAnalyzer`/`/trade`** —
shipped after v1: enter any number of players on each side
of a trade and get a graded verdict (good/fair/bad) with reasoning,
built on a rest-of-season value projection rather than a single game
(see "Backtesting & Tuning History" items 47-49 and the Trade Analyzer
paragraph below). A third live tool, the Waiver Wire recommender
(`/waivers`), shipped after that — originally surfaced players whose
recent opportunity (volume) was running ahead of their recent production
(the "gap" framing), by position, with a plain-English reason and a
suggested same-position drop candidate; deliberately built on the
engine's already-validated absolute-opportunity signal rather than a
trend/delta framing, after a dedicated backtest of the trend hypothesis
came back negative (see "Backtesting & Tuning History" item 58). **As of
item 142 this tool was reframed**: a dedicated backtest of the RANKING
itself found the gap heuristic was no better than random on real forward
production, so the primary sort is now recent volume among
waiver-eligible players (the startable/rostered tier excluded), and
"buy-low" (production lagging volume) became a per-candidate tag rather
than the sort key — see item 142. Its roster input started as
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
  at any tier — SUPERSEDED, see item 155. It DOES, via a product that is
  deliberately absent from the public catalogue ("NFL Advanced Metrics",
  whose endpoints SportsDataIO's own onboarding email describes as
  "hidden from the front end").** The original finding below was a
  correct reading of the documented catalogue and stays as the record of
  why `src/lib/nflverse/` exists at all; it is no longer a true statement
  about what SportsDataIO sells. Original note: confirmed against the
  live NFL API doc catalog (not
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
- **SportsDataIO has no game-schedule endpoint on this plan — PLAN-
  SPECIFIC, and no longer true of the 2026 subscription (item 155):**
  `v3/nfl/scores/json/Schedules/2026REG` returns a real 304-game list on
  the new key. The finding below remains correct for the ORIGINAL plan
  and legacy host, and is why nflverse's `schedules` release is still
  what every shipped code path reads. Original note:
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
- **Sleeper's API is free, fully public, and needs no auth or API key —
  but it is licensed for NON-COMMERCIAL use only.** `docs.sleeper.com`:
  "free to use for non-commercial purposes"; commercial use requires
  contacting Sleeper for licensing (read live, Aug 2026). Tracked as one
  of the four items in Open Item #33 — it is live in shipped code
  (`src/lib/sleeper/`), so it is not a hypothetical. The rest of this
  note remains accurate. Confirmed live (item 59): a nonexistent username returns HTTP
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
- **THREE SportsDataIO keys now exist. The LEGACY one is what actually runs
  the app (item 156); the two 2026 keys are for the migration.**
  `SPORTSDATA_LEGACY_API_KEY` is the previous subscription's key — legacy
  hosts, 2025 only, and every shipped reader uses it (see
  `API_BASES` in `client.ts`, which pairs each host with the env var
  supplying its key). It covers 2025 and NOT 2026, so it stops working
  once 2026 week 1 completes (~Sept 15 2026) — see Open Item #35. The two
  notes below describe the 2026 keys and remain accurate about them, except
  that item 156 resolved the `PlayerGameStatsByWeek` blocker (`BoxScoresFinal`
  is the Final-Only equivalent) — read them together with item 156.
- **The two 2026 subscriptions, on a DIFFERENT host path and scoped to 2026
  only (item 155).**
  `SPORTSDATA_API_KEY` ("SportsDataIO API") and
  `SPORTSDATA_ADVANCED_API_KEY` ("NFL Advanced Metrics API"), both
  reported active by the user. Three things differ from the original
  subscription and each one is load-bearing:
  1. **Host path.** The new keys authenticate against
     `https://api.sportsdata.io/v3/nfl/{package}/json/…`. Every shipped
     path in `src/lib/sportsdata/client.ts` uses the LEGACY
     `https://api.sportsdata.io/api/nfl/{fantasy,odds}/json/…`, where
     both new keys return `401`. So the new keys are not a drop-in swap;
     migrating hosts is a real, verify-everything change.
  2. **Season scope.** Only 2026 is entitled. Every 2021-2025 request
     `401`s. Since 2026 hasn't kicked off (SportsDataIO's own
     `Timeframes/current` reports Preseason Week 2), the season-scoped
     stats endpoints return 200 with ZERO rows.
  3. **`PlayerGameStatsByWeek` is NOT entitled** — `401` on every season
     and season-type tried (2026REG/1, 2026PRE/1, 2026PRE/2). That
     endpoint is the app's backbone (`weeklyStats.ts` feeds essentially
     every tool), so the new plan cannot run this app even after kickoff
     unless it's added.
  **Auth differs by product**: the `v3` packages accept the
  `Ocp-Apim-Subscription-Key` header like the legacy host, but the
  advanced-metrics endpoints were verified with the `?key=` query
  parameter its onboarding email documents — header auth was never
  tested against a VALID advanced endpoint (the earlier `404`s there
  were a bad probe path, `/Teams`, which doesn't exist in that package),
  so treat "header works on advanced-metrics" as unknown, not disproven.
- **NFL Advanced Metrics carries, first-party, nearly every signal this
  app currently sources from nflverse — plus a lot that has never been
  available here (item 155).** Base
  `https://api.sportsdata.io/v3/nfl/advanced-metrics/json/`; three
  endpoints, none in the public catalogue:
  `AdvancedPlayerGameStats/{season}/{week}`,
  `AdvancedPlayerSeasonStats/{season}/{team}`,
  `AdvancedPlayerInfo/{PlayerId}`. `AdvancedPlayerInfo` returns combine/
  athleticism data (SPARQx, SpeedScore, AgilityScore, ThreeConeDrill, …)
  and — the important part — embeds `AdvancedPlayerGames` (per-week) and
  `AdvancedPlayerSeasons` (~300 fields). Between them they carry
  `SnapShare`/`Snaps`, `TargetShare`, `AirYards` (+PerTarget/PerGame/
  PerReception), `TargetSeparation`, `AverageCushion`, `RedZoneTargets`/
  `RedZoneTouches`/`RedZoneCarries`/`GoalLineCarries`, `DropRate`/
  `Drops`, plus signals never previously obtainable: `RouteParticipation`,
  `PassRoutes`, `YardsPerRouteRun`, `ExpectedFantasyPoints`,
  `OpportunityShare`, `WeightedOpportunities`, `TargetQualityRating`,
  `PressuredCompletionPercentage`, `TotalQBR`, `SlotRate`/`SlotSnaps`,
  `PlayactionPassAttempts`, `BreakawayRunRate`, `YardsCreated`.
  **One genuinely useful quirk, verified:** the season-scoped advanced
  endpoints `401` for 2025, but `AdvancedPlayerInfo/{PlayerId}` returns
  that player's REAL 2025 per-week rows anyway (confirmed: Joe Burrow,
  PlayerID 21693, 8 rows — weeks 1, 2, 13-18, matching his real
  injury-shortened season, with per-week `SnapShare` and `FantasyPoints`,
  and a 2025 season row showing `AirYards` 1868). So historical advanced
  data IS reachable on this plan — but only one HTTP call per player,
  which is fine for a Start/Sit comparison and impractical for Legit
  Rankings' whole-pool scan.
- **The Odds API (`the-odds-api.com`) — SUPERSEDED by item 177; the client
  and its env var are deleted and betting lines now come from SportsDataIO's
  `PlayerPropsByWeek`. Kept as the record of what the free tier could and
  could not do, and because its "historical odds are paid-only" finding was
  independently confirmed against SportsDataIO. Original note: free tier; key in `ODDS_API_KEY`
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
  - WR air-yards share (nflverse, `AIR_YARDS_SHARE_BLEND_WEIGHT`/
    `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR` in `config.ts`) — WR only, a
    downfield-role signal (a different axis than target count). Shipped
    at a small 0.1 weight (item 148): a clean both-pipeline WR gain and
    the counterexample to this app's "consensus crowds out new box-score
    signals" pattern. PPR-only so far.
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
    play-by-play. Blended in last (after every other modifier), and now
    PER-POSITION (item 145): `Record<SkillPosition, number>` = {QB:0.8,
    RB:0.5, WR:0.5, TE:0.7}. It affects the live tool too — the live
    current-snapshot fetch was wired in later (item 73), so this is NOT
    backtest-only despite what older items in this file say. Shipped
    universal at 0.5 first (item 70) as a compromise — a higher universal
    weight pooled better but cost primary-pipeline WR accuracy — then split
    per position (item 145) once it was clear that broke the tradeoff: QB
    peaks at 0.8 on both pipelines (primary QB 61.8→66.7) and TE wants 0.7,
    while WR must stay ≤0.5, a clean no-tradeoff win. QB now leans 80% on
    consensus — the strongest single dependence on an external signal
    anywhere in the engine. See items 69-70 and 145 for the full story.
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
      **(SUPERSEDED by item 140: sorting the Top 100 by `legitScore` was
      wrong — legitScore is position-relative, so best-TE=100 sat next to
      best-WR=100 and McBride ranked #2 overall. The Top 100 now sorts by
      value-over-replacement instead. See item 140.)**
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
      tuning, so it keeps the weekly path. **(SUPERSEDED by item 139: this
      exclusion turned out to be the cause of an elite-injured player,
      Lamar Jackson, tanking in the rankings — the frozen weekly snapshot
      gave his engine score no consensus support in the offseason. Legit
      Rankings now uses the offseason-aware consensus too; the feared
      double-count is self-correcting. See item 139.)**
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

112. **Extended the editorial "almanac" look to the Trade Analyzer, and
    front-loaded the two-theme shared foundation the rest of the rollout
    reuses (presentation only — no engine/scoring/data changes).** Item 111
    shipped the almanac on Start/Sit as a committed-LIGHT sheet; this pass
    generalized it. Three decisions taken with the user up front
    (AskUserQuestion): keep both light AND a new "night edition" (not drop
    dark mode); recolor the sidebar to a pine/espresso rail; and bundle the
    foundation into this pass rather than a separate step.
    - **Two-theme almanac tokens** (`globals.css`): one shared `--alm-*`
      palette (warm porcelain paper / pine-green / espresso ink by day;
      warm espresso-charcoal + cream ink + brightened green/brass/red by
      night, under `@media (prefers-color-scheme: dark)`). `.matchup-page`
      now maps the app tokens FROM `--alm-*`, so the night edition falls
      out with no per-page media query.
    - **`ComparisonResult.module.css`** now sources its sheet palette from
      `--alm-*`, giving the already-shipped Start/Sit the night edition too
      (no longer committed-light).
    - **Sidebar** (`AppShell`) recolored from emerald to a pine/brass
      espresso rail (a constant dark spine in both themes).
    - **Trade Analyzer**: `.matchup-page` wrapper + editorial header, new
      `TradeResult.module.css` + rewritten `TradeResult.tsx` (porcelain
      "trade desk" — pine verdict panel, give/get board, case columns,
      engraved strip), all real evaluation data unchanged.
    - **Shared-component `editorial` variant**: `ScoringFormatToggle`,
      `PlayerMultiSelect`, and `RecentComparisonsPanel` gained an
      `editorial` prop (default false → the still-dark tools untouched)
      for squared/engraved styling, since these are shared across every
      tool; each per-page landing wrapper passes `editorial` and supplies
      its own editorial container/button. This is the reusable pattern
      every later page in the rollout uses.
    - Committed `5866836`; verified live in both themes.

113. **Waiver Wire almanac.** `.matchup-page` wrapper + editorial header;
    the buy-low hero + schematic gap bar editorialized; `WaiverResult`
    board editorialized in place (all data logic preserved) — porcelain
    squared spotlight with a brass "top target" tag, engraved gap-bar
    labels, Jost names/figures, engraved-caps position tab index + section
    headers, hairline row-lists, squared matchup/drop chips. Added reusable
    `.font-jost` / `.font-engraved` utilities to `globals.css` for the
    rollout. Shared `RosterSummaryButton` gained the `editorial` variant.
    Committed `66c2086`.

114. **Lineup Optimizer almanac.** Control deck (engraved Roster/Slots/
    Scoring labels, Jost counts, editorial toggle, squared "Manage" +
    engraved "Build my lineup"); `RosterSlotsEditor` squared; `LineupResult`
    board (engraved "Optimal lineup" eyebrow + Jost heading and
    projected-total, squared porcelain starter cards with engraved slot
    chips, Jost projections/names, squared matchup/status pills, hairline
    bench). Committed `8def0b8`.

115. **Legit Rankings almanac.** Squared engraved segmented tab index
    (Top 100 / QB / RB / WR / TE) + editorial scoring toggle;
    `RankingsResult` squared porcelain list, Jost ranks/names/score badges.
    **Real tier-color fix for the almanac palette**: the middle 45-69
    legit-score band moved from `--caution` to `--info`, because
    `--caution` and `--premium` are BOTH brass in the almanac and would
    otherwise be indistinguishable from the 90+ gold elite tier — now
    premium(gold)/good(pine)/info(blue)/bad(red) all read distinct, and
    the gold elite tier carries over cleanly. Committed `266e6ee`.

116. **Sidebar rail made editorial + a real mobile drawer** (`AppShell`),
    two changes on request. (a) Almanac typography for the rail: a Jost
    "Legitfootball" wordmark under an engraved "Fantasy Almanac" tagline,
    an engraved "Tools" section label, engraved "My roster"/"Scoring"
    footer labels, squared nav items and warm hairline borders — still a
    constant dark espresso spine in both themes (unchanged intent). (b)
    Mobile navigation reworked from the old horizontal scrolling strip into
    a slim top bar (hamburger + wordmark + roster quick-button) that slides
    the same rail in as a left drawer with a scrim; nav taps navigate and
    close it (a route-change `useEffect`), and the close-X / scrim dismiss
    it. Committed `faca7ca`.

117. **Home almanac.** Page wrapper + editorial header; `NewsletterSignup`
    (squared band, Jost title, engraved "Subscribe" button);
    `HomeRankingsBoard` "Top of the board" (engraved header, squared list,
    Jost ranks/names/scores, gold "Elite" chips carry over via `--premium`);
    the three "This week" widgets + recent-comparisons card (engraved
    hairline headers, squared cards, Jost names/figures). Every widget
    still self-fetches its same real route. Committed `18578d0`.

118. **Backtest almanac — completes the app-wide rollout** (all seven
    pages + the shell are now editorial). Squared engraved mode/season
    pills, position checkboxes, week selects, caveat/scope notes; engraved
    result-section labels and table column headers; squared banners and
    outcome pills; engraved "Run backtest" CTA; editorial `PlayerMultiSelect`
    (single-pair + projection lookup); Jost headline figures (accuracy % /
    MAE). **The dense tabular table figures were deliberately kept
    `font-mono`** (JetBrains, unaffected) for alignment — only the
    prominent figures went Jost. Verified live in both themes with a real
    Broad backtest (58.7% overall + by-position + baselines); a full
    `next build` passes. Committed `2605c6d`. **Resolves Open Item #28.**

119. **Start/Sit fix: relabel the recent range "Recent low/high", not
    "Floor/Ceiling".** A user flagged that a player (Mark Andrews) can be
    projected ABOVE his stated "Ceiling" — which read as a contradiction.
    It is NOT a scoring bug: `recentPprCeiling` is the max of a player's
    recent box-score output (backward-looking), while `finalScore` is a
    forward projection that can legitimately exceed it (favorable matchup,
    expert consensus, volume — and `finalScore` is bounded relative to
    `blendedScore`, not to the recent high, per item 105). Calling the
    recent max a "Ceiling" implied a hard upper bound. Relabeled the
    range-bar ends "Recent low"/"Recent high" and the Case-For sentence
    "a recent high of" (`ComparisonResult.tsx`). Presentation only.
    Committed `a49c5e3`.

120. **Heading-font experiment: Fraunces — tried, then reverted.** On
    request, tested replacing Jost (the `--font-jost` display role — page
    titles, player/verdict names, big figures) with Fraunces (an editorial
    serif) via a one-line `layout.tsx` swap into the same variable.
    Verified live — it looked strongly editorial (the pine verdict panel
    with the player name in Fraunces read like a broadsheet headline) and
    the serif numbers stayed legible; the dense Backtest tables were
    unaffected since they're `font-mono`. The user chose to revert for now.
    Reverted (the change was never committed; `layout.tsx`/`globals.css`/
    the two result modules restored to Jost). No repo artifact — this note
    is the only record.

121. **Start/Sit: hover tooltips explaining each player-card stat** (on
    request — e.g. hovering QB "Success rate" pops a plain-English
    description). Each `StatSlot` gained an optional `tip`; a `STAT_TIPS`
    map covers every per-position stat surfaced (recent avg, pass att,
    success rate, EPA/dropback, touches, targets, snap share, red-zone
    touches/rushes, drop rate). `StatGrid` renders a scoped, almanac-styled
    tooltip (a dark ink card on the porcelain sheet; inverts to a light
    card in the night edition) above the cell, on `:hover` AND
    `:focus-within`; cells with a tip are focusable (`tabIndex`) with a
    subtle dotted-underline affordance, and right-column tooltips anchor
    right so they never clip the sheet's `overflow:hidden`. No engine/data
    change. `ComparisonResult.tsx` + `ComparisonResult.module.css`.
    Committed `80715bb`.

122. **Label-font swap: Archivo replaces Cinzel for the engraved labels**
    (`--font-engraved`). On request, after comparing candidates live on a
    throwaway `/font-lab` page — serif options first (Cormorant SC / IM
    Fell English SC / EB Garamond), then modern options (Space Grotesk /
    Archivo / Familjen Grotesk / Sora), each rendered at the real tiny
    label sizes plus a large sample — the user picked **Archivo**, a modern
    grotesk, for a cleaner/more contemporary take on the uppercase
    letter-spaced labels (page eyebrows, section headers, stat/grid labels,
    tags, sidebar). Loaded into the same `--font-engraved` variable (the
    `const` is still named `cinzel` for historical reasons), weight 600;
    the serif fallbacks in `globals.css`'s `.font-engraved` and both result
    modules' `--fl` were swapped to a sans stack. Display headings (Jost)
    and body/mono (Inter/JetBrains) are untouched — the type is now nearly
    all-sans (Jost display + Archivo labels). The scratch `/font-lab` page
    was deleted. Committed `779f9c7`.

123. **Tested opponent-adjusted recent production — a genuinely new signal
    (adjust a player's recent fantasy output for the strength of the
    defenses they faced) — standalone then RB-only integration. Clean
    negative finding, nothing shipped.** The first new *signal* idea
    explored since item 97; not on the prior Open Items list. Motivation:
    the engine's recent-form signals treat 12 targets against an elite
    secondary the same as 12 against a bad one, even though it already has
    a matchup modifier for the *upcoming* opponent — so opponent-adjusting
    the *backward* production seemed like an obvious gap.
    - **Standalone (pooled 2022-2025, nflverse-only, ~2,380 pairs)** via a
      temporary diagnostic route, same discipline as every one-off in this
      document. Adjusted each recent game's fantasy points by
      `pts + strength * (leagueAvgAllowed[pos] - allowed[opp][pos])` (the
      defense-strength reference is the target-week season-to-date
      `positionDefenseTable` — all weeks before the target week, no
      leakage), swept the additive strength (0.5/1.0/1.5) plus a
      multiplicative `pts * leagueAvg/allowed` variant, against a **plain
      recent-points control** (the honest baseline — there was no
      "recent-N-game points average" baseline before this).
      - Plain recent points: **51.0%** pooled (≈ item 2's coin-flip
        finding — raw recent points alone are near chance).
      - Opponent-adjusted (best, additive ×1.0): **51.7%** pooled — only
        +0.7pp over plain, well inside noise, non-monotone in strength,
        and mixed by season. By position it *helped RB* (51.6%→54.2% at
        ×0.5) but *hurt QB* (53.3%→49.5%).
      - Every variant was **dominated by `recentVolume` (54.7% pooled)** —
        the shipped signal — at every position and every season. Even RB's
        best opponent-adjusted number trailed RB volume (56.8%).
      - **Why it fails is item 2's lesson restated**: the noise in
        production is touchdown variance, and opponent-adjusting *points*
        doesn't remove that — it reshuffles noisy points. Volume sidesteps
        the noise entirely, which is why it's been the backbone since
        items 6-13.
    - **RB-only integration sweep** (the user asked specifically whether
      applying it to RB would improve the engine, since RB was the one
      position with a real standalone flicker). Blended an
      opponent-adjusted recent-points estimate into RB `finalScore` as an
      additive term via `compareBreakdowns` (mutating `finalScore` on the
      real breakdowns so tiebreakers/guardrails run faithfully), pooled
      2022-2025. **w=0 reproduced the real engine byte-for-byte** (RB
      58.99%/n=812; by season 55.2/60.9/61.3/58.6 — exact match to the
      shipped `/broad-nflverse-multiseason` route, verified before
      trusting the sweep, per items 43/44/74's discipline).

      | w | RB pooled | 2022 | 2023 | 2024 | 2025 |
      |---|---|---|---|---|---|
      | 0 (shipped) | 59.0 | 55.2 | 60.9 | **61.3** | 58.6 |
      | 0.2 | 59.2 | 58.1 | 64.4 | 55.9 | 58.6 |
      | 0.3 (peak) | 60.0 | 59.1 | 64.9 | **56.9** | 59.1 |
      | 0.5 | 56.3 | 56.7 | 60.4 | 53.4 | 54.7 |

      The pooled peak (+1.0pp RB, +0.3pp whole-model at w=0.3) **fails the
      bar three ways**: (1) it's *inside the noise* (SE ≈ 1.7pp at n=812,
      so 59.0→60.0 is under one SE); (2) it's a *season tradeoff, not a
      plateau* — w=0.3 gains in 2022/2023/2025 but **2024 drops 4.4pp**
      (61.3→56.9), the same seesaw shape as QB rushing (item 30), the
      opposite of a clean every-season win; (3) the curve is *jagged, not
      monotone* (w=0.1/0.15 sit *below* w=0, then spike, then fall — the
      isolated-peak/pair-flipping noise pattern rejected in items 9/20/38).
    - **Verdict: not shipped.** Lands like RB red-zone/EPA in item 44 —
      real-looking on part of the sample, but not a durable, every-season
      gain — and confirms the standalone prior exactly: a signal weaker
      than both RB volume and the full engine's own RB accuracy adds no
      robust information once blended, it just reshuffles noise for a
      within-noise pooled bump at the cost of a real 2024 regression. No
      `config.ts`/`engine.ts` change; both temporary diagnostic routes
      (`/api/debug-opp-adj`, `/api/debug-opp-adj-int`) and their modules
      deleted after recording these numbers. This write-up is the only
      lasting artifact. The cleaner untested variant, run next as item
      124: recency-weighting the *upcoming* defense's strength in the
      matchup modifier — sharpening a signal the engine already uses,
      rather than adding a redundant backward one.

124. **Tested recency-weighting the upcoming-defense strength in the
    matchup modifier (the #2 follow-up flagged in item 123) — clean,
    monotone negative. Nothing shipped.** The shipped matchup modifier
    ranks the upcoming opponent by season-to-date points allowed,
    averaging every prior week EQUALLY. This built a recency-WEIGHTED
    position-defense table (recent weeks weighted higher, geometric decay
    `weight_i = decay^(mostRecentIndex - i)`) and injected it into the real
    scoring path — `buildBacktestComparisonInput` reads
    `weekSlice.positionDefenseTable`, so overriding that field per (week,
    decay) changes only the matchup modifier, every other signal untouched
    — swept the decay pooled 2022-2025 via a temporary diagnostic route.
    `decay=1.0` is equal weighting = the shipped table, so it reproduced
    the real engine byte-for-byte (overall 57.776%, exact match to
    `/broad-nflverse-multiseason`), verified before trusting the sweep.

    | decay | Overall | QB | RB | WR | TE |
    |---|---|---|---|---|---|
    | **1.0 (shipped)** | **57.8** | 60.5 | 59.0 | 55.7 | 56.8 |
    | 0.9 | 57.3 | 59.8 | 58.5 | 55.7 | 55.8 |
    | 0.8 | 57.5 | 60.0 | 58.3 | 56.0 | 56.5 |
    | 0.7 | 57.2 | 59.8 | 58.0 | 55.9 | 55.8 |
    | 0.6 | 57.1 | 59.8 | 57.9 | 55.7 | 55.6 |
    | 0.5 | 56.8 | 59.6 | 57.8 | 55.8 | 54.3 |

    - **The opposite of item 123's ambiguous seesaw — this is monotone and
      unambiguous.** Every step toward recency emphasis makes it worse or
      flat, at every position and in 3 of 4 seasons (2022 has a lone +0.5
      blip at 0.8, isolated noise). No decay beats the shipped equal-
      weighted table anywhere that matters. No tradeoff, no isolated peak,
      no user decision.
    - **Why**: a defense's points-allowed-per-position is a fairly stable
      season-long property, and with only 1-17 prior games a full-season
      average is a MORE reliable estimate than a recency-weighted one that
      discards sample. Down-weighting older games shrinks the effective
      sample and amplifies the large single-week defensive noise (a
      defense's weekly output depends heavily on which offense it drew).
      Same lesson as item 107 (EWMA on player form) and item 2 — thin
      samples want stable averages, not recency emphasis.
    - **Not shipped**, no `config.ts`/`engine.ts` change; temporary
      diagnostic route (`/api/debug-recency-def`) and module deleted after
      recording these numbers. Closes the item-123 #2 follow-up. Net for
      the items 123-124 signal-hunting pass: both candidate ideas came back
      negative (opponent-adjusted production marginal/noisy; recency-
      weighted defense cleanly rejected), reinforcing that the engine's
      recent-form and matchup signals are already well-tuned on both
      fronts.

125. **Profiled `/api/compare` latency (Start/Sit "takes a while") and
    DECIDED on a hybrid precompute-cache fix — decision + full profiling
    recorded here; implementation deferred to Open Item #29 (needs Vercel
    infra the user provisions).** A performance investigation, not a tuning
    or feature change. No engine/scoring change was made or is planned —
    see the accuracy note below.
    - **What the route does per request** (`src/app/api/compare/route.ts`):
      fetches, in parallel, `positionDefenseTable` (SportsDataIO, all
      completed weeks' box scores), `getLiveNflversePlayerWeekTable`
      (`nflverseLive.ts` — SEVEN nflverse sources incl. the ~98MB
      play-by-play release), `getRemainingOpponentsByTeam` /
      `getGameWeatherByTeamWeek` / `getImpliedTeamTotalsByTeamWeek`
      (schedules), `getLiveExpertConsensusByNormalizedName` (FantasyPros),
      `getCurrentDepthChartRankByNormalizedName` (nflverse depth_charts,
      ~554k rows, item 100), then scores each player and finally fetches
      display-only betting props (The Odds API) INLINE before responding.
    - **Instrumentation approach** (temporary, reverted after): wrapping
      each fetch in a timing helper and `console.log`-ing marks was
      unreliable here because this session shares the working directory
      with another chat's `next dev` server (Next 16's per-project dev
      lock blocks a second one), and that server's stdout isn't readable
      from this session while its HMR served a stale/miscompiled version of
      the inline edits (both the route-level and nflverse-level marks
      logged `{}`). The reliable path was a NEW temporary route
      (`/api/debug-compare-timing`) that runs each fetch through a timer
      and returns the marks IN THE JSON RESPONSE BODY (new file → clean
      compile; no dependence on server stdout/log files). Deleted after
      recording numbers, same discipline as every other one-off in this
      document.
    - **Cold-cache per-stage timing** (fetched in parallel, so cold
      wall-clock ≈ the slowest stage; a partially-warm real compare
      measured ~5.07s, a colder debug run ~13.8s):

      | Stage | Cold ms |
      |---|---|
      | **depthChart** | **12,816** |
      | **red-zone / play-by-play** | **10,190** |
      | playerWeekStats | 5,509 |
      | positionDefenseTable | 3,313 |
      | remainingOpponents | 2,881 |
      | impliedTotals | 2,756 |
      | weather | 2,598 |
      | snapCounts | 1,952 |
      | ngsReceiving / passing / rushing | ~1,000-1,900 each |
      | injuries | 1,354 |
      | expertConsensus | 971 |

    - **The surprise finding**: `depthChart` (~12.8s) is the SINGLE biggest
      cost — bigger than the ~98MB play-by-play parse (~10.2s) — because
      the nflverse `depth_charts` release is ~554k rows and
      `getCurrentDepthChartRankByNormalizedName` parses the whole thing.
      And it's the LEAST essential thing on the path: it exists only for
      item 100's depth-chart confidence FLOOR (nudging a listed starter
      over a clear backup), which only tweaks the confidence *number* in
      edge cases, never the pick. The pbp parse (second-biggest) is also
      mostly dead weight — of everything it computes (red-zone/goal-line/
      EPA/success-rate/drop-rate) only WR drop rate still affects a live
      pick (weight 0.2, item 33); the rest are zero-weighted since items
      44/66.
    - **The deeper problem — the in-process cache is nearly useless on
      Vercel.** `client.ts`'s cache is a per-process in-memory `Map`;
      serverless functions are stateless across cold starts and don't
      share memory across instances, so every cold invocation re-downloads
      and re-parses everything. The in-process cache only helps a single
      warm instance.
    - **Options weighed**:
      - **#1/#2 quick cuts** — drop/defer `depthChart` and pbp from the
        hot path. Zero new infra, zero staleness, but a small ACCURACY/
        behavior cost: dropping pbp removes WR drop rate (a real signal),
        dropping depthChart removes the confidence floor (confidence
        number only, not the pick).
      - **#3 precompute cache (CHOSEN)** — a scheduled job (Vercel Cron)
        builds the heavy, slow-changing tables into a persistent store
        (Vercel KV / Blob / Upstash) on a cadence; live routes READ the
        precomputed snapshot instead of parsing on demand.
    - **Why #3 is accuracy-NEUTRAL by construction** (the decisive point):
      it's a caching change, not a logic change — the engine reads the
      exact same numbers, just from a snapshot. `config.ts`/`engine.ts`/
      the weights/signals are untouched, and the backtest runs on its own
      historical pipeline that never touches the live cache, so backtested
      accuracy is IDENTICAL. Better still, the expensive data being
      precomputed is FINALIZED historical data (a completed week's box
      scores, snap counts, play-by-play don't change after the games are
      played), so a precomputed last-week aggregate is byte-identical to a
      live fetch — zero accuracy or freshness cost for the bulk. This is
      the opposite of #1/#2, which DO change what the engine sees.
    - **The chosen shape — HYBRID** (so the one real tradeoff, freshness,
      effectively disappears): precompute only the expensive, slow-changing
      tails — the pbp/red-zone aggregate, the depth_charts table,
      `playerWeekStats`, `positionDefenseTable`, and the schedules-derived
      tables (weather/implied/opponents) — on a weekly cron (offseason:
      even less often), but KEEP the small, game-day-volatile fetches LIVE
      (injuries is only ~1.35s and is the truly game-day-critical one;
      FantasyPros consensus ~1s). That captures ~all the latency win
      (~13s cold → ~1-2s) while keeping the freshness-sensitive inputs
      current.
    - **Tradeoffs of #3, honestly (why it's an Open Item to CONFIRM, not a
      slam dunk)**: (1) freshness is bounded by the cron cadence — a
      non-issue for the finalized historical aggregates, and mitigated for
      volatile data by keeping those live (the hybrid), but the cadence
      still has to be chosen carefully; (2) new infrastructure + a
      dependency + cost (a managed store, a cron function, env vars,
      serialization of multi-MB tables — Blob suits the large nflverse
      table better than KV's per-value size limits); (3) you DON'T get to
      delete the live path — it must remain as a fallback for a cold store
      (first deploy, failed cron run, season rollover), so it's more code,
      not less; (4) nflverse schema drift (the doc has several: LAR/LA,
      `season_type`/`game_type`) would fail SILENTLY in a background cron
      and serve a stale snapshot until noticed, rather than failing loudly
      at request time.
    - **Also identified as a free, separate UX win** (not accuracy-
      related): the betting props (The Odds API, display-only) are fetched
      INLINE before the response — they should be deferred to a
      client-side follow-up fetch so the verdict renders immediately and
      lines fill in async.
    - **Status: DECIDED, NOT YET IMPLEMENTED.** Building it needs a Vercel
      KV/Blob store provisioned and a Cron configured — the user's Vercel
      dashboard work, not something this assistant can stand up from the
      repo alone — so it's listed as Open Item #29 to build AND then
      confirm (measure the real before/after, verify accuracy is unchanged
      via a byte-identical backtest, and confirm the fallback path works
      on a cold store). All temporary instrumentation was reverted (the
      inline route/nflverseLive timing and the `/api/debug-compare-timing`
      route all removed); working tree clean apart from this write-up.

126. **Implemented the item-125 speedup — and it needed NO external infra
    (Vercel Blob turned out unnecessary).** The key discovery via
    measurement: the two dominant cold tails parse HUGE files into SMALL
    aggregates (`depthChart` ~12.8s parse → 12KB output; red-zone/pbp
    ~10.2s → 1.79MB output), so caching the OUTPUT fits Next.js's built-in
    Data Cache (`unstable_cache`) — which, unlike the per-process
    `client.ts` Map, is shared across Vercel serverless cold starts. No
    Blob/KV/Upstash to provision.
    - **New `src/lib/cache/liveAggregates.ts`** — persistent read-through
      wrappers around the slow-changing getters, 24h `revalidate` (matches
      the getters' own in-process TTL; Vercel serves stale-while-
      revalidate so users effectively never eat the cold parse after first
      population). Wrapped: `getRedZoneTouchesCached`,
      `getPlayerWeekStatsCached`, `getSnapCountsCached`, `getNgs*Cached`,
      `getDepthChartRankCached`, `getPositionDefenseTableCached`,
      `getRemainingOpponentsCached`, `getGameWeatherCached`,
      `getImpliedTotalsCached`. Deliberately NOT wrapped (kept LIVE for
      game-day freshness): `getInjuryReports` (~1.35s) and the FantasyPros
      live consensus (~1s) — per item 125's hybrid.
    - **Columnar encoding was the trick that made the two biggest raw
      arrays cacheable.** `stats_player` (2.53MB) and `snap_counts`
      (2.3MB) sit just OVER Next's ~2MB Data Cache entry limit — but only
      because JSON repeats the field keys on all ~18-25k rows. Encoding
      each cached array columnarly (`{k:[keys], r:[[values]...]}`, decoded
      on read) cut them to 0.87MB / 0.94MB (red-zone 1.79MB→0.48MB) —
      all comfortably under 2MB, MEASURED via a temp route before trusting
      it. Without this they'd silently not cache (safe, but no speedup).
    - **Accuracy-neutral, VERIFIED byte-identical.** A temporary
      `/api/debug-cache-verify` route compared every cached wrapper's
      output to the raw getter's via canonical JSON: `allIdentical: true`
      across all 11 sources (including the columnar-encoded ones — decode
      round-trips exactly). The engine reads identical numbers; the
      backtest never touches these wrappers. Confirms item 125's
      accuracy-neutral claim empirically.
    - **Repointed all six live routes**: `compare` (positionDefense,
      depthChart, schedules → cached; the pbp/snap/playerWeekStats/NGS win
      comes for free via `nflverseLive.ts`, which every tool shares), plus
      `trade`/`lineup`/`waivers`/`rankings`/`trade-suggestion`
      (positionDefense + schedules → cached; all five share the identical
      import shape, repointed together). `nflverseLive.ts` now pulls its
      seven sources from the cached wrappers (except injuries, kept live).
      So every live tool benefits, not just Start/Sit.
    - **Verified end-to-end**: a real `/api/compare` returns a valid,
      unchanged result (recommends the higher-scored player, real
      finalScores), `/api/rankings` 0.1s warm, `tsc`/lint clean. The full
      COLD→warm latency delta can't be cleanly measured on the shared dev
      server (can't restart it / read its stdout — see item 125), so the
      real production before/after remains the Open Item #29 confirm step;
      but correctness (the thing that could break) is proven, and warm
      requests are already fast (compare ~2.7s with live injuries+consensus
      still in the path; rankings 0.1s).
    - **Still remaining (moved to a slimmed Open Item #29)**: confirm the
      real cold/warm latency on a Vercel deploy; defer the display-only
      betting props (The Odds API) to a client-side follow-up fetch (an
      independent UX win, a no-op in the current offseason since props are
      empty); and OPTIONALLY a Vercel Cron warmer (largely unnecessary
      given stale-while-revalidate). Vercel Blob/KV is NO LONGER needed —
      that part of the original #29 is dropped.

127. **Rewrote every page's heading and subheading (presentation only, no
    engine change).** The editorial pass had given each page a rhetorical-
    question `<h1>` ("Who should you start?") that read as corny. Replaced
    (via `AskUserQuestion`, plain-direct over editorial-declarative) with
    all-caps tool names: START / SIT, TRADE ANALYZER, OPTIMIZE LINEUP,
    PLAYER RANKINGS, WAIVER TARGETS, ENGINE BACKTEST; Home `<h1>` →
    FANTASY TOOLKIT BY LEGITFOOTBALL.COM. Subheadings trimmed to one short
    line each ("Who to start when two players compete for one spot.",
    "Who wins the trade, by rest-of-season value.", etc.). Text-only edits
    to each `src/app/*/page.tsx` header. Committed `7dcbb7e`.
128. **Brand identity: real LF-football logo, matching favicon, uppercased
    wordmark/brand everywhere. (a) and (b) are SUPERSEDED by item 165 —
    the inline-SVG recreation and `icon.svg` described here were replaced
    by the real pennant artwork; (c)'s tagline was later renamed again.
    Kept as the historical record.)** (a) Replaced the placeholder green-cube
    `LogoTile` in `AppShell.tsx` with an inline-SVG recreation of the
    LF-football mark (block "L", vertical football with laces, block "F";
    cream `#f4efe4` on a near-black tile) — crisp at any size, no asset
    file; the football was then re-centered in the L→F gap on request.
    (b) Matching favicon: deleted `src/app/favicon.ico`, added
    `src/app/icon.svg` (same mark) which Next App Router auto-serves as the
    tab icon. (c) Sidebar wordmark → all-caps LEGITFOOTBALL; tagline
    "Fantasy Almanac" → "Fantasy Toolkit". (d) Uppercased EVERY user-facing
    "Legitfootball" display instance → LEGITFOOTBALL (metadata title, the
    six page eyebrows, the newsletter heading, result colophons/mastheads
    in `ComparisonResult.tsx`/`TradeResult.tsx`); code comments left in
    normal case. Commits `af6e769`/`eba8406` (logo + favicon + centering),
    `3779f18` (wordmark/tagline), `1f357ab` (uppercase brand).
129. **Sidebar scoring is now an interactive control, not a read-only
    chip.** The sidebar footer's "Scoring" indicator became a compact
    PPR/Half/Std segmented control (`AppShell.tsx`), writing through the
    shared `useScoringFormat` store (item 88) so it syncs instantly with
    every tool page's own toggle. Committed `0e27293`.
130. **Light/dark theme toggle in the sidebar — SSR cookie-based, flash-
    free.** The app was `prefers-color-scheme`-only; added a manual
    override. New `useTheme` store (`src/lib/useTheme.ts` — "light" |
    "dark" | "system", persisted, shared like `useScoringFormat`).
    `globals.css` gained `data-theme` overrides that beat the media query:
    the two dark token blocks (base `--*` and the editorial `--alm-*`) are
    each guarded with `:root:not([data-theme="light"])` for the OS-follow
    case PLUS a duplicated explicit `:root[data-theme="dark"]` block for a
    forced-dark override (plain CSS can't share a ruleset across a media-
    query boundary); `color-scheme` added per theme. UI: a single sun/moon
    button in the sidebar footer under Scoring (an earlier two-segment
    Light/Dark control was replaced). **Flash-free via a `theme` cookie**:
    `layout.tsx` is now `async`, reads the cookie server-side
    (`next/headers`) and renders `data-theme` in the SSR HTML; `AppShell`'s
    effect mirrors the chosen theme into that cookie AND skips its first
    (pre-hydration) run so it doesn't clobber the server-rendered
    attribute. `suppressHydrationWarning` on `<html>`. An earlier
    pre-paint inline-`<script>` approach (`next/script` beforeInteractive)
    was tried and **reverted** — React 19 flags any inline script rendered
    through the tree ("script tag" warning) and it caused a hydration
    mismatch; the cookie/SSR approach is clean. One tradeoff: reading the
    cookie opts pages into dynamic rendering (acceptable — the tools fetch
    live data client-side anyway, and item-126's API-data caching is
    unaffected). Commits `0f4cd24` (initial), `9e5890c` (sun/moon),
    `b6301ae` (error fix), `cf44a66` (cookie/SSR).
131. **Mobile polish batch.** (a) **Background white-space**: short mobile
    pages showed the near-white root `--background` below `.matchup-page`'s
    `<main>`; fixed with `body { background: var(--alm-page-bg) }` (theme-
    aware editorial ground) so any uncovered area matches. (b) **Scoring
    toggle clipped** ("STAN…") in the Trade/Start-Sit/Lineup card headers
    at 375px — added `flex-wrap` so the segmented control drops to its own
    line (Waivers/Rankings already wrapped). (c) **iOS auto-zoom** on input
    focus: `@media (max-width:640px){ input:not([checkbox/radio]),textarea,
    select { font-size:16px !important } }` — iOS Safari zooms when a
    focused field is under 16px; user pinch-zoom left intact. (d) **Roster
    modal**: `min-w-0` on the Sleeper username field so it stops overflowing
    its flex row; dropped the "no need to add players one by one" copy.
    (e) **Start/Sit player card**: Weather/Status stacked vertically on
    mobile (`.aside` was overridden to `flex-direction:row`, which looked
    misaligned); "Health" label renamed to "Status". Commits `879f951`
    (bg + toggle wrap), `407aae7` (iOS zoom), `a040537` (roster modal),
    `57bb3d1` (Start/Sit card).
132. **Free agents: searchable, scorable, projected 0 — fixes real players
    missing from search (reported: Jonnu Smith).** SportsDataIO lists an
    offseason free agent as `Status:"Inactive"` / `Team:null`, so item
    104's `isRosterable` dropped them from BOTH search and scoring — even
    though they played last season (Jonnu Smith: 17 games for PIT in 2025,
    85.2 PPR). Since this tool analyzes last-completed-season data, such
    players belong in search. Fix (`players.ts`): a new
    `getPlayedLastSeasonPlayerIds()` (PlayerIDs with `Played > 0` in the
    last completed season's `PlayerSeasonStats`, cached, degrades to empty
    on fetch failure) now widens the SEARCH pool (`getActiveExtendedPlayers`)
    AND a new `getScorablePlayerById` (used by `buildComparisonInput`'s
    player resolution — the scoring path had independently re-resolved via
    the narrow set, so a searchable FA still came back "insufficient data")
    to include anyone who logged a game last season. The internal current-
    roster set (`getActivePlayers`, used by waivers/`hasLimitedTeammate`)
    is deliberately UNCHANGED. Guarded the teammate check against a null
    team. **Then, per follow-up, a free agent is projected 0**: a resolved
    player with no NFL team has no upcoming game, so `withFreeAgentProjection`
    (`scoreExtended.ts`) zeros `finalScore`/`recentPprFloor`/`recentPprCeiling`
    and prepends an explanatory note (skill + K only — D/ST always has a
    team). The Start/Sit card shows Status "Free agent" (red) and free-
    agent-aware Case for/against (instead of the contradictory "recent high
    of 0.0" the zeroing would otherwise produce). **Partially supersedes
    item 104's "an Inactive player with no team is an unsigned free agent
    and stays excluded"** — they're now included and searchable, just
    projected 0. Commits `1e9c9b5` (search/scoring inclusion), `5a7fd08`
    (0-projection), card copy in `57bb3d1`.

133. **Tightened the Start/Sit reasoning copy against a set of writing
    rules — prose/presentation only, zero engine/accuracy change — and
    built then REMOVED two would-be features (injury-branch verdict,
    format-flip note).** Prompted by a request to make the generated
    reasoning specific and comparative, from a reference doc that was
    explicitly NOT to override the backtest-validated calibration/weights.
    - **Copy audit + fixes (shipped, `aa3c6c1`):** rewrote
      `ComparisonResult.tsx`'s `buildCaseFor`/`buildCaseAgainst` and
      `engine.ts`'s verdict `headline` so every claim carries a specific
      number, both players are named comparatively in the verdict, and
      hedging/process language is gone. Matchup claims now cite the real
      defensive rank + points allowed vs. league average ("PIT allows the
      6th-fewest points to RBs — 19.0 a game, 2.9 below the 21.9 league
      average") instead of "tough matchup"; the verdict names both with
      the gap ("Start Bijan Robinson over Jonathan Taylor — 1.7 more
      projected points (21.4 to 19.6)") instead of a bare "Start X." or
      the hedged "lean X, not a lock"; vague fallbacks ("still worth a
      look") became honest empty-states; the recent-form line is now
      format-correct (was hardcoded "PPR"). **Honest ceiling noted:** the
      reference doc's per-defender/YPRR specificity isn't in this app's
      data (see Data Source Notes), so Rule 1 was applied at the real
      granularity — team-defense-vs-position, not per-CB coverage.
    - **Real correctness fix found along the way:** the matchup NOTE
      (`engine.ts`) still read "In their last game (vs X)" — stale since
      item 93 pointed the live matchup at the NEXT opponent — now reads
      "Faces X, ranked N of 32 …" (present-tense, correct for both live
      and backtest). Visible on Waivers/Lineup/Trade, where notes render.
    - **Two features built then REMOVED at the user's request** (net NOT
      shipped — they do not exist in the codebase now): (a) an
      injury-branch verdict ("if he plays start X; if not, start Y" when
      the top pick is Questionable/Doubtful — via a new `injuryContingency`
      field on `ComparisonResult`, set in `compareBreakdowns`), and (b) a
      format-flip note (on a 50-64% confidence pick, re-score the SAME
      engine under the other two formats in `/api/compare` and surface any
      winner flip — a `formatFlips` response field). Both were fully wired
      and verified live (a real Henry-vs-Kyler-Murray flip), then the user
      said not to include them; everything was reverted before `aa3c6c1`.
      Recorded here so a future session knows these were tried and
      deliberately left out, not overlooked.
    - **Accuracy-neutral, confirmed:** no `config.ts`/weights/calibration
      touched; the pick, `finalScore`, and `confidence` are unchanged
      (a live compare returned confidence 54 before/after), and the
      backtest grader never reads headline/notes/case strings, so every
      backtested number is byte-identical. `tsc`/lint clean.
134. **Start/Sit result visual polish — five small presentation-only
    changes, each committed and pushed separately.** All in
    `ComparisonResult.tsx`/`ComparisonResult.module.css` (plus
    `StartSitTool.tsx` for the last two), no engine/data change:
    - Footer: dropped the "LEGITFOOTBALL Almanac" colophon label and made
      the season dynamic — it now reads `lastCompletedSeason` from the API
      (threaded via a new `dataSeason` prop on `ComparisonResult`) instead
      of a hardcoded "2025", so it shows 2025 now and auto-advances when
      the next season starts (`5b2acb8`).
    - Thickened the card's green graphics — the stat-grid magnitude bars
      and the projection range bar from 2px to 4px, projection marker
      re-centered for the taller track (`b4da337`).
    - Removed the paper-grain fractal-noise texture (`.grain::after` and
      the `styles.grain` class usage) from the Start/Sit result sheet for
      a flat, clean paper — scoped to `ComparisonResult` only; the Trade
      Desk sheet keeps its own texture (`8b0f162`).
    - Spaced the result cards apart — the verdict panel and each player
      card are now separate bordered boxes (full border + 4px radius, 12px
      between cards, 20px under the verdict) instead of the seamless
      ruled-list "sheet" (`46dc25c`).
    - Widened the Start/Sit column (`max-w-5xl` → `max-w-7xl`) and trimmed
      vertical padding on the sheet/verdict/cards for a wider, more compact
      layout (`0e7b2eb`).
135. **Extensive Start/Sit visual-redesign exploration — Artifacts only,
    NOTHING wired into the app.** After items 133-134, the user explored
    many alternate visual directions for the Start/Sit page via published
    Artifacts (claude.ai/code/artifact/…); none were adopted or committed
    — **the live app is unchanged (still the editorial almanac design from
    items 111-119).** Directions tried, and the read on each, so a new
    session doesn't restart from zero: a "modernized" dark dashboard and a
    flat "pro sheet" (both rejected as too generic / too Sleeper-like); the
    current almanac recolored + retyped (palette + font explorers); a warm
    "clubhouse" pine+gold middle-ground (off); a "prime time" broadcast
    (navy+orange) with full-width stacked cards + a 6-accent switcher; a
    bold poster / gameday-graphic (liked — "step in the right direction")
    and a team-colors variant (Falcons red vs Colts blue, from a 32-team
    color map); a "tale of the tape" head-to-head with a confidence dial
    (rejected as too Sleeper-like); a boxing "fight card"; and a
    "de-magazined" almanac (masthead/dateline/colophon/ruled-sheet removed,
    dividers kept, real fonts inlined). Then reference-site matches on
    request: **nash.ai** (deep navy + volt-lime, Host Grotesk, glassy
    cards — full page with a 6-accent switcher + light/dark toggle),
    **blink.new** (near-black + blue, light-weight Geist headings, grey
    borders), and **wozcode.com** (green-black + lime, heavy condensed
    Saira headings, warm-grey bordered cards). **Technique worth reusing:**
    real design tokens were pulled from each reference site through the
    in-app browser (`getComputedStyle`), and webfonts were matched by
    inlining the app's own self-hosted woff2 (Jost/Archivo/Inter, found
    under `.next/static/media` and `.next/dev/static/media`) as `@font-face`
    data-URIs, since the Artifact CSP blocks font CDNs. **End state: no
    direction chosen to ship; the user was still comparing reference-
    matched mockups.** Wiring any chosen direction into the real app would
    be a token/component restyle of the item-111-118 editorial system, not
    a data/engine change.
140. **Fixed the Top 100 (cross-position) view over-ranking elite TEs and
    QBs — now sorted by value-over-replacement (user report: "why is Trey
    McBride so high").** Presentation/ordering change, no new scoring.
    - **Diagnosis**: the Top 100 / Overall view sorted by `legitScore`,
      which is normalized WITHIN each position (item 84) — best TE = 100,
      exactly like best WR = 100. So the combined sort put McBride (TE,
      projection 16.6, legit 100) at **#2 overall**, above Bijan (RB, 21.4)
      and every WR/RB he outscores by ~4-5 pts. The same flaw put six QBs
      in the top 15. McBride's TE-tab #1 was correct (FantasyPros TE1); the
      cross-position placement was the bug.
    - **Root cause was item 84's own sort choice.** Item 84 deliberately
      sorted the Overall view by `legitScore` rather than raw `finalScore`,
      reasoning that finalScore isn't comparable across positions (QBs/RBs
      naturally outscore TEs). That's true — but the correct cross-position
      comparison isn't legitScore either, it's **value over replacement**
      (finalScore minus the position's replacement level), which item 84
      didn't consider.
    - **The fix**: `getLegitRankingsOverall` (`buildRankings.ts`) now sorts
      by `valueOverReplacement` = `finalScore - REPLACEMENT_PER_GAME[format]
      [position]` (reusing the exact constants item 138 built for the
      uneven-trade fix). The displayed `legitScore` in the Top 100 is
      RE-NORMALIZED to the Top-100's own VOR spread (1..100) so the number
      moves monotonically with the order and the gold "elite" tier
      highlights the genuinely-top-overall players — rather than a TE's 100
      sitting at rank 9. A player can legitimately show a different score in
      the two views: the position tab answers "how good at your position"
      (McBride 100, best TE), the Top 100 answers "how valuable overall"
      (McBride ~73, mid-pack).
    - **Result**: McBride **#2 → #10** overall; the top is now RBs/WRs by
      projection (Bijan, Chase, Nacua, McCaffrey, St. Brown…), and the
      first QB lands at **rank 32** — matching FantasyPros' OWN redraft-
      overall board (which had Lamar, their QB2, at ecr ~32 overall).
      Top-100 position mix RB 33 / WR 33 / TE 15 / QB 19. **Per-position
      tabs are unchanged** (McBride still TE #1, legit 100) — verified live.
    - **User chose VOR** over a "keep QBs prominent" variant, knowing it
      drops elite QBs down the overall board (correct for a 1-QB value
      ranking; the app has no superflex/2-QB league setting). `tsc`/lint
      clean.
    - **Follow-up fix (same day): the re-normalization was scaling across
      the top-100 SLICE's own VOR range, which forced the 100th-best player
      to a score of 1** (user: "why would a player in the top 100 have a
      score of 1"). Fixed to normalize against the FULL rankable pool's VOR
      range instead — a top-100 player is well above replacement, so they
      now land in a high band (score range ~57-100, gold 90+ tier tight),
      and only deep waiver-tier players (never shown) approach 1. Monotonic
      with rank; per-position tabs still show their own position-relative
      legitScore (McBride 100 on the TE tab), unaffected.
    - **Second follow-up fix (same day): raw-finalScore VOR discarded
      consensus, so an injured elite fell below a rookie** (user: "why is
      Tyler Shough above Lamar Jackson"). Shough's engine finalScore (16.6)
      coincidentally matched Lamar's (16.5, injury-depressed), and a plain
      `finalScore - replacement` sort has no consensus input — so the rookie
      edged the consensus QB2. The QB TAB got it right (Lamar #6) because
      legitScore blends consensus; the Overall VOR didn't. Fixed by computing
      the cross-position VOR from a CONSENSUS-BLENDED projection:
      `0.5*finalScore + 0.5*expertConsensusR2pPts` (the redraft-derived
      consensus points estimate already on the breakdown, item 70/103), then
      minus replacement (`crossPositionVor` in `buildRankings.ts`). Keeps the
      value points-based (accurate spacing/scarcity) AND consensus-aware.
      A rejected intermediate — scaling legitScore by a per-position VOR
      ceiling — fixed the ordering but distorted spacing so badly it pushed
      EVERY QB out of the top 100 (position mix RB 42 / WR 46 / TE 12 / QB
      0), so it was discarded. Verified: Lamar **#37** (r2p 21.3) now well
      above Shough **#87** (r2p 15); Josh Allen **#25** (top QB, matching
      FantasyPros' overall board); McBride **#9** (elite TE, consensus-
      backed, no longer the absurd #2); scores 57-100; QB/RB/WR/TE all
      present (mix WR 35 / RB 32 / TE 15 / QB 18); position tabs still
      unaffected. `tsc`/lint clean.
139. **Fixed Legit Rankings under-ranking an elite player coming off an
    injury-affected season (user report: "Lamar Jackson is far too low")
    — a one-line data-source swap in the rankings route, no scoring-logic
    change.** Diagnosed with a throwaway route (deleted after) rather than
    guessed:
    - **NOT a name-join or missing-data bug** (the obvious first guess):
      Lamar is correctly matched to FantasyPros' redraft consensus at
      **QB2** (ecr 2.51). The real cause: his engine snapshot scored only
      **11.7** and was labeled `dataQuality: "full"` — the item-101/102
      offseason backfill pulled in 7 played games, but several are his
      injury-limited/rested late-2025 games, so the recent-form score is
      genuinely depressed. At `"full"` quality the engine gets 65% of the
      `computeLegitScores` blend weight (`ENGINE_WEIGHT`), so his tanked
      snapshot drowned out his elite FP QB2 — while Jayden Daniels
      (`"limited"`, engine only 15% weight) sailed past him on FP QB5.
      Confirmed directly: Lamar final 11.7/dq full/FP 2 vs. Daniels
      11.4/dq limited/FP 5, with Daniels ranking ABOVE Lamar.
    - **Root cause was item 103's deliberate rankings exclusion.** Item
      103 gave the LIVE tools an offseason-aware consensus
      (`getLiveExpertConsensusByNormalizedName` — weekly in-season, the
      current season-long REDRAFT consensus in the offseason), which lifts
      Lamar's live engine score 11.7→16.5. It EXCLUDED Legit Rankings over
      a double-counting worry (rankings already blends FP redraft
      separately via `ENGINE_WEIGHT`). But that exclusion is exactly why
      rankings used the FROZEN weekly snapshot — stuck at 2025 week 18,
      where Lamar (hurt at season's end) is simply absent, so his engine
      snapshot got NO consensus support and his injury-tanked games
      dominated.
    - **The fix**: the rankings route (`/api/rankings`) now uses
      `getLiveExpertConsensusByNormalizedName(context)` like every other
      tool, instead of `getCurrentExpertConsensusByNormalizedName()`. This
      reverses item 103's rankings exclusion — justified because the
      "double-count" it worried about is **self-correcting**: feeding
      consensus into the engine snapshot pulls a consensus-elite player
      with a bad recent sample UP (Lamar), and pulls an engine-over-rated
      player DOWN toward consensus (e.g. Trevor Lawrence), both correct.
      `ENGINE_WEIGHT` was never a rigorously tuned weight (item 78: "a
      reasoned default"), so there's no precise tuning to distort.
    - **Result**: Lamar went from **outside the top 10** to **QB #6, legit
      90 (elite/gold tier)**; his engine score corrected 11.7→16.5 (the
      same value item 103 got live). The whole QB board is now sensible
      (Allen #1, Maye, Burrow, Hurts, Herbert, Lamar), and RB/WR/TE are
      unaffected/sensible (Bijan/CMC/Gibbs; Chase/Nacua/St. Brown;
      McBride/Bowers) — verified live across all four positions. `tsc`/lint
      clean; throwaway diagnostic route deleted.
    - **Deliberately NOT changed (user's call — see Open Items)**: Lamar
      is a consensus QB2 but still sits at #6, behind a few QBs FP ranks
      lower (Burrow QB4, Herbert QB8), because his corrected engine score
      (16.5) is ~2 pts below theirs (18+, cleaner recent samples) and the
      engine still carries 65% weight at `"full"` data. Pushing him toward
      QB2-3 would mean lowering `ENGINE_WEIGHT.full` so rankings defer more
      to consensus — a real shift in the rankings' philosophy (more
      FantasyPros-mirroring, less of the app's own engine). Put to the
      user, who chose to ship the current fix and revisit the harder lean
      later — logged as an open item.
138. **Fixed the uneven-trade over-valuation (Open Item #19) — a
    replacement-level roster-spot normalization in `evaluateTrade.ts`
    (live) and `multiPlayerTradeBacktest.ts` (backtest). Even-count trades
    are byte-identical; only uneven ones change.** Item 90 surfaced that
    both the live Trade Analyzer and the multi-player backtest summed
    per-side rest-of-season points with no accounting for the roster spot a
    consolidation frees, so the side with more players was structurally
    over-valued (raw totals accumulate with headcount).
    - **The mechanism (value-over-replacement, in effect)**: an uneven
      trade frees (or consumes) roster spots equal to the count difference;
      each is worth a freely-available waiver player. So the SHORTER side is
      credited a replacement-level filler for the count difference before
      the sides are compared. New `REPLACEMENT_PER_GAME` constant in
      `config.ts` — the startable-pool-cutoff player's per-game value
      (`BROAD_MODE_POOL_SIZE`: QB/TE #12, RB/WR #24), derived empirically
      from the full 2025 season, per format (a throwaway diagnostic route,
      deleted after recording, same discipline as every other one-off in
      this doc). QB is high (~17.5, a shallow position → strong streamer)
      and format-invariant; RB/WR/TE fall as reception weight drops
      (e.g. WR 12.22 PPR → 8.13 Standard). The filler = that per-game value
      × the extra player's remaining games; the "extras" are the (diff)
      lowest-value players on the longer side, so their positions set the
      filler. **Even counts → zero filler**, so 1-for-1 / 2-for-2 are
      untouched (verified byte-identical).
    - **Live (`evaluateTrade.ts`)**: gained a `format` param (threaded from
      the trade route; the two other call sites — suggestDrop /
      suggestLeagueTrade — are always 1-for-1, a no-op) and a new
      `rosterNote` field explaining the credit, rendered as a caption in
      `TradeResult.tsx`'s verdict panel so the adjustment is never silent
      (item 95 stopped rendering `reasoning` in the trade view). Side
      totals stay RAW (they match the player cards); only `netValue` — what
      drives the verdict — is roster-adjusted. **Verified all directions
      live**: even 1-for-1 (Pollard→Chase) net = raw diff exactly,
      `rosterNote` null (unchanged); 2-for-1 (Pollard+Warren→Chase) raw
      diff −66.3 (would read "bad") → freed spot credited ~206.6 → net
      **+140.2, "good"** (matches real fantasy wisdom — an elite + a waiver
      filler beats two mid players); 1-for-2 the exact mirror (net −140.2,
      "bad"); Standard format a smaller filler (174.6 vs PPR's 206.6),
      confirming format-awareness.
    - **Backtest (`multiPlayerTradeBacktest.ts`)**: the same filler is
      applied to BOTH the engine's projected sums AND the actual
      ground-truth sums (extras chosen by actual value, always defined), so
      the count confound is removed from what's graded, and the naive "more
      players" baseline is graded against the corrected ground truth too.
      **2-for-2 is byte-identical to item 90 (engine 55.5%, 479-384,
      n=863)** — the clean even-count measure is untouched. **2-for-1
      changed as intended**: the naive "more players" heuristic collapsed
      from item 90's 61.2% to **17.7%** — correctly exposed as a *losing*
      strategy once the freed spot is credited (a balanced consolidation
      genuinely favors the FEWER-players side, real fantasy strategy), and
      the engine tracks the corrected ground truth at 80.5%.
    - **Honest read of the 2-for-1 number**: the ground-truth DIRECTION is
      now correct (previously it wrongly favored more-players, a roster-
      accounting omission), but the 80.5% is dominated by the large,
      correct "consolidation is good" filler term rather than isolating
      per-player projection skill — so **2-for-2 (55.5%) remains the clean
      skill measure**, and the primary value of this change is the LIVE
      tool's fairer uneven-trade verdicts, not turning 2-for-1 into a
      pristine skill test. `tsc`/lint clean.
    - **Still open (see #19/#5)**: 3+-player-per-side shapes beyond
      2-for-2/2-for-1 aren't built (item 90 covered the two canonical ones).
137. **Closed the two scoring-format gaps in the Backtest tooling (Open
    Item #6, and the Half-PPR/Standard part of #12) — plumbing plus a UI
    control, no engine/scoring-logic change.**
    - **Trade backtest is now format-aware** (#6): `tradeBacktest.ts`
      (single-cutoff `runTradeBacktest` + pooled
      `runTradeBacktestMultiSeason`) and `multiPlayerTradeBacktest.ts`
      (the 2-for-1/2-for-2 backtest, item 90) both threaded a
      `format: ScoringFormat = "ppr"` param through pairing
      (`buildAllPairsForWeek`/`buildRankedPoolForWeek`), scoring
      (`scorePlayer`), and — the previously-PPR-hardcoded ground truth —
      `actualRestOfSeasonTotal`, which now sums `getFantasyPoints(row,
      format)` instead of `row.FantasyPointsPPR`. All four trade-backtest
      routes (`/trade`, `/trade-nflverse`, `/trade-nflverse-multiseason`,
      `/trade-multi-nflverse-multiseason`) parse `scoringFormat` and echo
      it in `context`. Defaults to `"ppr"` everywhere, matching the
      existing convention (`buildAllPairsForWeek`/`gradeWeek`/
      `runProjectionBacktest` all already default to ppr), so untouched
      callers are byte-unchanged.
    - **Projection-accuracy mode's backend was already format-aware** (its
      route parsed `scoringFormat` and `runProjectionBacktest` took a
      `format` param since item 65/71) — the only gap for #12's format
      slice was the UI never exposing it.
    - **The Backtest UI now has a scoring-format control** — the real
      user-facing close, and a gap that turned out to span EVERY mode, not
      just trade/projection: the Backtest page had no format control at
      all, so every UI-driven run silently used PPR even though broad/pair
      routes have accepted `scoringFormat` since item 51. `BacktestTool.tsx`
      now reads the app-wide global `useScoringFormat` (the same store the
      sidebar and every live tool share — item 88) and threads
      `scoringFormat` into all four modes' query strings
      (pair/broad/trade/projection). Rendered as the shared editorial
      `ScoringFormatToggle` right under the mode buttons, so flipping the
      format re-runs the current backtest in it. Deliberately reuses the
      global format rather than a Backtest-local one, for consistency with
      the rest of the app (one scoring-format concept).
    - **Verified against the running dev server**: trade backtest (2025,
      week 8, QB/RB/WR/TE) — PPR 25-11 (byte-identical to item 48's
      documented 69.4%, so no regression), Half-PPR 19-17, Standard 22-14
      (each now graded in its own format, previously silently PPR).
      Projection mode (2025, RB, full season) — PPR MAE 6.45 / bias +0.35
      (exactly item 71's documented RB number, no regression), Half-PPR
      6.24 / +1.08, Standard 6.32 / +1.59 (bias grows more positive as PPR
      weight drops — sensible, the blend is PPR-tuned). `/backtest` page
      renders 200 with the new toggle. `tsc`/lint clean.
    - **Still open (see #12)**: Projection mode's D/ST-and-K grading and
      its 2022-2024 nflverse-only-season coverage are untouched here — this
      pass was formats, not positions or seasons.
136. **Wired the prior-season-average fallback into the live tools
    (resolves Open Item #14, and the format half of #15) — a plumbing
    change, no engine/scoring-logic change.** The fallback that lets a
    player with zero current-season games still get a real projection
    (item 67's `getPriorSeasonPprAveragesByNormalizedName` +
    `scorePlayer`'s blendedScore fallback-of-last-resort branch,
    previously fed only in the backtest's per-player lookup) now reaches
    the live tools too.
    - **Threaded exactly how expert consensus already was** (item 73): a
      new trailing optional `priorSeasonPprAvgByNormalizedName` param on
      `scoreExtendedPlayer`/`suggestDrops`/`suggestLeagueTrade` (default
      empty map = no-op), and each of the five live scoring routes
      (`/api/compare`, `/api/trade`, `/api/lineup`, `/api/waivers`,
      `/api/trade-suggestion`) now fetches
      `getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason
      - 1, format)` once per request (fail-open `.catch(() => new Map())`)
      and passes it down. `buildComparisonInput` already read the map and
      populated `priorSeasonPprAvg` — the gap was purely that
      `scoreExtendedPlayer` passed `undefined` for it and no route fetched
      it. Now **format-aware** (the average is computed in the selected
      scoring format), closing the "PPR-derived only" half of #15 for the
      live tool.
    - **Deliberately NOT wired into two no-op call sites**, per item 67's
      own "don't add dead plumbing" discipline: Legit Rankings
      (`buildRankings.ts`) and the waiver-candidate detail
      (`buildWaiverReport.ts`) only ever score players that already
      cleared a recent-games gate (item 102 / rankCandidates' opportunity
      floor), so `recentGames.length === 0` can never hold there and the
      fallback could never fire. It IS wired into `suggestDrops` (scores
      the user's own roster, which can include a back-from-injury
      zero-data player).
    - **Confirmed the live path is genuinely reachable, not dead code**: a
      currently-rostered player with zero current-season games is resolved
      by `getScorablePlayerById` via its `isRosterable` branch (Active or
      PUP/IR/NFI-with-a-team, item 104) even though they're absent from
      `getPlayedLastSeasonPlayerIds`, so they reach `scorePlayer` with
      `seasonStat == null` + an empty recent window → the fallback fires.
      The only scorable-but-zero-current-data case is exactly a rostered
      player who sat out the whole season (season-long IR/PUP) — the
      narrow case this is for.
    - **Verified**: `tsc`/lint clean; a live `/api/compare` regression
      check against the running dev server shows full-data players
      (Bijan/McCaffrey) unchanged with `priorSeasonPprAvg: null`, and a
      ~35-player sweep of thin/injured players confirmed the fallback
      stays dormant for anyone with any current-season data (they read
      `dataQuality: "limited"`, not the fallback). The fallback LOGIC
      itself was already validated in item 67 (Stafford week 1: "—" →
      real 13.4). Could NOT exhibit a live zero-current-season player
      firing it — such a player (rostered, sat out all of 2025, has 2024
      data) is genuinely rare and none surfaced in the offseason sweep —
      but the wiring, reachability, and no-regression are all confirmed,
      and the change is a proven no-op for every player with any
      current-season data.
    - **Still open (folded into #15)**: the fallback is
      skill-positions-only (D/ST and K use their own scorers, which have
      no blendedScore fallback), and the weeks-2-4 partial-blend question
      is untouched.

141. **Whole-app "Nash/volt" + glass redesign, plus a Start/Sit perf
    fix (this session). Presentation-only throughout — ZERO scoring/
    engine/data changes; every pick, confidence number, and projection is
    unchanged.** Replaced the editorial "almanac" design system (warm
    paper / pine / brass / Cinzel, items 80/111-122) ENTIRELY with a
    nash.ai-inspired dark-navy + volt (chartreuse) system, plus a
    frosted-glass treatment. Started from a published Start/Sit Artifact
    mockup (dark navy `#01051e`, bright volt `#c8ff00`, Jost display),
    then rolled it across the whole app tool-by-tool.
    - **Design tokens (`globals.css`):** base `:root`+dark AND the
      `--alm-*` palette (still read by the two result CSS modules — the
      variable NAMES were kept, only the VALUES changed to navy/volt)
      redefined. **Dark is the hero theme** (near-black navy `#01051e`
      bg, `--accent` = bright volt `#c8ff00`, `--accent-ink` = navy
      `#01051e`, `--bad` = rose `#ff7a8a`). **Light uses a NAVY accent**
      (`--accent` = deep navy `#16265f`, white ink) — bright volt is
      unreadable as text on white, so light mode uses navy, the app's
      other brand color. The system reads as "volt on dark, navy on
      light," with the constant-dark sidebar keeping volt highlights in
      both (the light-mode-accent decision was made after showing the
      user olive/volt/navy options — user chose navy). `--good` is merged
      into `--accent`; `--premium` stays gold (Rankings' 90+ elite tier).
      Fonts: Jost (`--font-jost`) display, Archivo (`--font-engraved`)
      uppercase labels, Inter body, JetBrains mono numbers (all
      unchanged from the editorial pass — only colors/layout changed).
      `.matchup-page` gained a spread ambient volt/navy radial glow so
      frosted glass has color to refract.
    - **Glass utilities (`globals.css`): `.glass-card` / `.glass-card-accent`**
      — strong translucency (`color-mix(var(--surface) 44-52%,
      transparent)`) + heavy `backdrop-filter: blur(24-26px) saturate()`
      + a bright inner top-edge highlight + soft depth shadow; the
      `-accent` variant adds a corner volt/navy wash for CTAs (newsletter
      band, waiver/lineup heroes). Reusable — applied to every tool's
      card surfaces. (Note: on some pages `backdrop-filter` computes to
      `none` where an ancestor breaks it, but the translucent fill +
      shadow still read as glass; not a perf problem.)
    - **Per-tool status — ALL committed and pushed to `main`:** Start/Sit
      (verdict hero card + glass player panels — see below), Trade
      Analyzer (tone-adaptive verdict hero by good/fair/bad/unknown via a
      single `--tone` semantic token, glass give↔get board + breakdown
      card, editorial masthead/colophon dropped), Home (newsletter band +
      rankings board + all "This week" widgets + tool cards all
      `.glass-card`), Waivers (glass buy-low hero/controls, GOLD-tinted
      glass spotlight, glass row-list, pill Find button), Rankings (pill
      tab bar + glass ranked list, gold elite tier kept), Lineup (glass
      control deck + accent-glass optimal-lineup header + glass starter
      cards keeping position-colored left borders + glass empty-slot/
      bench). **Backtest was DELIBERATELY left on the plainer styling**
      (internal validation tool — still Nash-colored via the token layer,
      but no glass panels / pill controls). This continues the historical
      precedent of excluding Backtest from visual passes.
    - **Start/Sit result specifics (`ComparisonResult.tsx`/`.module.css`):**
      the verdict is now a high-contrast **hero card** (a `--tone`/volt
      left spine + corner gradient wash + soft glow, more solid than the
      frosted player panels). Player cards were then **rearranged to the
      almanac single-column layout** on user request: a big rank number +
      player name + "pos · team" + Start/Bench tag in the header, then
      hairline-ruled sections — opponent row (team vs opp · week + matchup
      tag), projection + range, stat grid with a weather/status aside
      (border-separated), case for/against (2-col), betting lines — all
      keeping the Nash glass/volt skin. The avatar-initials were dropped
      (rank number replaces them; `initials()` helper removed). Player
      name enlarged to 34px (`.pName`) on request.
    - **Shared components:** the `editorial` prop on `ScoringFormatToggle`/
      `PlayerMultiSelect`/`RecentComparisonsPanel`/`RosterSummaryButton`
      is now a MISNOMER — it renders rounded pills / glass (the Nash
      tool-page variant), not the old squared/engraved editorial look.
      Don't rename it (14 call sites); just know "editorial" = "themed
      tool-page variant." `AppShell` sidebar recolored espresso → constant
      deep-navy with volt (dark) / — active states.
    - **Perf fix #1 — deferred betting lines (DONE, committed):**
      `/api/compare` used to fetch The Odds API player props INLINE before
      returning, delaying the verdict on a network round-trip. Moved to a
      new **`/api/props?ids=`** route the client (`StartSitTool`) fetches
      AFTER the verdict renders (guarded by a `propsTokenRef` against a
      stale response landing after a newer comparison). Compare returns
      immediately; lines fill in async (empty/pending in the offseason,
      same as before). Display-only — no scoring impact. `getScorablePlayerById`
      resolves ids → name/team/position for `getPropsForPlayers`.
    - **Perf — the ACTUAL "slow" issue (#2, NOT done — pick up here):**
      User reported the DEPLOYED Start/Sit "slow again" (result takes long
      to appear). Diagnosed: NOT a regression from the redesign. Every
      Vercel deploy wipes the persistent Data Cache (item 126's
      `unstable_cache`), so the FIRST compare after each deploy re-parses
      the heavy nflverse **depth-charts release (~554k rows, ~13s, item
      100's confidence floor)** + play-by-play (WR drop rate), then it's
      fast for 24h; this session's ~10 deploys made the cold path
      recurrent. Measured locally: the API is genuinely FAST (0.36s cold
      offseason — the heavy in-season parses don't fire because
      current-season files are near-empty; warm 0.05s), and the frontend
      scrolls at 60fps — so it's specifically the post-deploy cold cache
      on production. **RECOMMENDED FIX #2 (agreed with user, not yet
      built): wrap the two heaviest, least-essential cold fetches
      (`getDepthChartRankCached` → confidence floor; the pbp/drop-rate
      fetch) in a short `Promise.race` timeout (~2.5s) so a cold compare
      returns fast and those two minor signals fill in once the cache
      warms in the background (the slow promise keeps running and
      populates `unstable_cache` for next time — self-healing). Tradeoff:
      on the first cold request the confidence number may lack its
      depth-chart starter bump (item 100) and a WR drop-rate tiebreaker
      may be skipped — NEITHER changes the actual pick.** Alternative
      full-fidelity fix: a Vercel Cron warmer (Open Item #29) to keep the
      cache warm across deploys.
    - **Commits this session (all pushed to `main`, current HEAD
      `014615b`):** `eb0b0e9` whole-app tokens + Start/Sit + sidebar,
      `85f9951` Start/Sit glass, `40fbb9f` verdict contrast card,
      `5e7cb16` light-mode navy accent, `2e3da3d` Trade, `20bb950` Home
      glass + `.glass-card` utility, `bdcba42` Waivers, `6e6d839`
      Rankings, `ca73407` Lineup, `2ddaaa0` props deferral (#1),
      `014615b` almanac card layout + bigger name.
    - **Doc-currency note:** every paragraph elsewhere in this file
      describing the editorial "almanac" system (items 80/111-122 — warm
      paper, pine/brass, Cinzel labels, the "night edition," the constant-
      DARK-espresso sidebar) or the earlier dark/emerald "data-grade"
      system (item 80) is now HISTORICAL, superseded by the Nash/volt +
      glass system above. Kept as the record of how the design evolved;
      not current styling.

142. **Built the waiver-ranking backtest (the long-standing Open Item #9),
    found the shipped "gap" ranking was no better than random, and
    reframed the Waiver Wire tool around recent volume as a result.** Every
    prior waiver work (items 58-61, 83) validated only the UNDERLYING
    primitive (recent volume beats recent points as a forward signal); the
    RANKING heuristic itself — "biggest volume-vs-points gap" — had never
    been graded as a ranking. This graded it directly, then acted on the
    result. Prompted by a user question ("does the waiver logic make
    sense?") that surfaced the ordinal gap metric's real weaknesses
    (magnitude-blind, pool-composition-dependent, structurally selects
    low-scorers).
    - **Refactored `rankCandidates.ts` into a pure, data-injected core**
      (`scoreWaiverPool` builds the eligible pool with all metrics;
      `selectWaiverCandidates` applies a strategy's gate/sort/slice;
      `computeEfficiencyBaseline`/`unitsAndYardsForPosition` exported) so
      the live tool and the backtest run the IDENTICAL ranking logic — the
      backtest grades the actual shipped code, not a reimplementation.
      Verified the live tool is byte-identical after the refactor before
      building on it. The nflverse `gameLog.ts` rows already carry every
      field the ranking reads (volume, yards, points), so the backtest
      runs on the pooled 2022-2025 nflverse-only pipeline like every other
      multi-season backtest here.
    - **Method** (`lib/backtest/waiverBacktest.ts`, route
      `/api/backtest/waiver-nflverse-multiseason`, validation-only/no-UI
      like the other `*-nflverse-multiseason` routes): for each
      (season, cutoff week W), rank candidates using only data through W,
      then measure each surfaced candidate's ACTUAL forward production
      (mean PPG over the next 4 played weeks). A strategy's score is the
      mean forward PPG of the players it surfaces. Runs TWO pool variants:
      `full` (studs included) and `waiverTier` (the startable/rostered tier
      — top BROAD_MODE_POOL_SIZE by season-to-date points — removed, so the
      baselines can't win just by surfacing studs no one can add). Honest
      caveats baked in: forward PPG over played games (0-forward-game
      candidates dropped equally across strategies); efficiency baseline
      computed strictly from weeks <= W (leak-free, unlike the live tool's
      full-season one); absolute forward PPG is the target, NOT
      breakout-vs-own-baseline (the decision-relevant metric — you start
      who'll score more, not who improved most from a low base).
    - **Result (waiver-tier pool, the fair comparison, pooled 2022-2025,
      mean forward PPG):**

      | strategy | PPG | vs. random |
      |---|---|---|
      | blindPool (random eligible) | 8.88 | — |
      | **gap (shipped)** | **9.00** | **+0.12 — no edge, any season** |
      | residual | 10.18 | +1.30 (beats gap all 4 seasons) |
      | volumeOnly | 11.99 | +3.11 |
      | pointsOnly | 11.98 | +3.10 |

      - **The shipped `gap` ranking is essentially random** (9.00 vs.
        8.88), consistent across all four seasons — it structurally
        selects low-scorers (its gate), and low recent points predict low
        forward points (points aren't pure noise). On the `full` pool it's
        even worse-than-random (10.96 vs. 11.64).
      - **`residual` (the A/B prototype, item's own follow-up) beats
        `gap` every season** — the ordinal→real-points fix is a genuine
        improvement — but still only ~= random on the fair pool, and
        trails volume.
      - **Volume-rank alone wins by ~2-3 PPG** — the decisive answer to
        Open Item #9: the gap does NOT beat picking by volume, it's far
        worse. Among waiver-tier players `volumeOnly` ≈ `pointsOnly` (the
        "volume >> points" law holds for the full pool/engine, not the
        shallow end).
    - **Acted on it — reframed the tool (user chose the "bigger" option
      over just flipping the default to residual):** primary sort is now
      **recent volume among waiver-eligible players**
      (`DEFAULT_WAIVER_STRATEGY = "volume"`; `gap`/`residual` kept
      selectable via `?rankBy=`), and the live ranking now excludes the
      **startable/rostered tier itself** (`STARTABLE_TIER_DEPTH`, top-12
      QB·TE / top-24 RB·WR by season points) on top of the user's own
      rostered/league exclusions — this is the piece that makes volume-sort
      good advice for everyone (without it, volume-sort surfaced studs like
      Bijan/CMC; with it, real waiver targets). "Buy-low" (production
      lagging volume, `residualScore > 0`) is now a per-candidate TAG, not
      the sort key.
    - **UI reframe** (`WaiverResult.tsx`/`WaiverTool.tsx`): the list is
      volume-ranked; a `BuyLowTag` + the gap bar are shown only for actual
      buy-lows (non-buy-lows read "producing in line with the workload — a
      volume play"); the spotlight is now the standout BUY-LOW (biggest
      residual), not the biggest ordinal gap; reasoning leads with
      opportunity and appends the buy-low line conditionally; hero/footer
      copy reframed from "ranked by the gap" to "ranked by opportunity,
      buy-lows flagged."
    - **Verified**: live tool byte-identical after the pure-core refactor;
      the reframed board returns sensible waiver-tier players with correct
      buy-low tags (raw API + live browser — hero, volume-ranked sections,
      tags, spotlight, non-buy-low note, drop suggestions all render);
      `tsc`/lint clean. **Resolves Open Item #9.** Backtest infrastructure
      committed as `c991f7e`; the reframe + this write-up in a follow-up
      commit.

143. **Unified the Waiver Wire "top target" between the Home widget and the
    Waiver page, made it position-fair (value over replacement), and added
    roster-need weighting** — from a user report that "the home screen
    waiver widget has a different target than our waiver page" and that the
    tool should "take into account the players already on the team."
    - **Diagnosed first, not guessed.** Confirmed with the user's real
      connected roster that the exclusion already works — zero rostered or
      league-rostered players leak into the candidates (all 241 owned
      players excluded). The mismatch was two different SELECTION
      heuristics: the Home widget picked the first non-empty position in
      `POSITION_ORDER` (→ the top QB by volume), while the page spotlight
      picked the biggest buy-low (item 142). Both were also QB-biased —
      QB volume/residual numbers are largest in absolute terms, so the
      "top target" kept surfacing a QB regardless of roster.
    - **Fix 1 — one shared, position-fair selection.** New
      `pickTopTarget` (`WaiverResult.tsx`), used by BOTH the page spotlight
      and the Home widget, ranks by **value over replacement**
      (`waiverValue = recentVolumeAvg × POINTS_PER_VOLUME_UNIT −
      REPLACEMENT_PER_GAME`, computed server-side in `buildWaiverReport.ts`
      and carried on each candidate). VOR is comparable across positions,
      so a deep/streamable QB (replacement ~17.5) no longer outranks a
      high-opportunity RB/WR. **Supersedes item 142's "spotlight = biggest
      residual buy-low"** — the spotlight is now the best VOR pickup (still
      shows the buy-low gap bar only when the pick is itself a buy-low).
    - **Fix 2 — roster-need weighting** (the "take the team into account"
      ask, beyond just excluding rostered players). `computeRosterNeedPenalty`
      docks `SURPLUS_PENALTY_PER_PLAYER` (3 pts) per rostered player beyond
      a position's starter need, using the connected league's real starter
      slots (`sleeperConnection.rosterPositions` via
      `parseSleeperRosterPositions`, or `DEFAULT_SLOTS` for a manual user);
      flex slots count toward RB/WR need. Applied ONLY to the single
      cross-position top target, never the per-position lists (a QB-needy
      user still browses the QB tab normally).
    - **Verified live end-to-end.** With the user's real roster (2 QB / 5 RB
      / 7 WR / 2 TE in a league needing 1 QB / 5 RB / 6 WR / 1 TE), the top
      target moved from **QB Aaron Rodgers** (before) to **RB Devin Neal**
      (after) — QB and TE penalized for surplus, RB at exactly its need. The
      Home widget now shows the identical target as the page. `tsc`/lint
      clean; committed as `5fbb3ae`.

144. **Made `VOLUME_BLEND_WEIGHT` per-position and shipped RB=0 (PPR) — the
    broad "volume is now redundant" hypothesis was a pooled-nflverse
    artifact that the primary-pipeline check killed; only RB transferred.**
    Prompted by the observation that volume drives ~90% of the score but
    the blend weight was a single per-format scalar shared across all four
    positions, never tuned per position — while QB's pass-attempt volume is
    a structurally weaker signal than RB touches/WR targets, and expert
    consensus (item 70) now carries a lot of the score.
    - **Method**: made `VOLUME_BLEND_WEIGHT` `Record<ScoringFormat,
      Record<SkillPosition, number>>` (verified no-op at all-0.9 first),
      then swept it per position via a temporary in-memory-mutation
      diagnostic route (`/api/debug-volume-sweep`, deleted after) rather
      than config-edit-and-curl — the latter hit a Next-dev module-recompile
      race that produced stale/off-by-one results (a first attempt's numbers
      were discarded once byte-identical rows across different weights
      exposed the staleness). Positions are independent in broad mode (pairs
      are within-position), so setting all four to the same test weight per
      run yields the full per-position curve. **Also caught and fixed a real
      self-inflicted bug**: the first sweep's regex matched BOTH `ppr: { QB:
      … }` lines and `count=1` corrupted `POINTS_PER_VOLUME_UNIT.ppr` (the
      conversion factor) instead of the weight — restored immediately, and
      every later run asserts the conversion factor is intact.
    - **Pooled 2022-2025 said "lower QB/TE weight"** (QB best at w≈0: 61.3
      vs 60.5, fixing 2024 55.9→62.7), suggesting volume had become
      redundant given the consensus blend. **But the primary 2025
      SportsDataIO pipeline — the one the live tool runs on — flatly
      contradicted it**: at w=0, primary QB CRATERS 61.8 → 54.9 (−6.9pp) and
      overall drops 58.69 → 56.72. Classic cross-pipeline non-transfer (the
      exact failure mode item 53 established the primary-pipeline check for,
      and item 70 saw for consensus). So QB/WR/TE stay at their format
      values — the pooled "improvement" is an artifact.
    - **RB was the one position that transferred.** RB=0 (no volume term)
      beats 0.9 on BOTH pipelines — primary RB 58.6 → 59.6 (overall 58.69 →
      58.94), pooled RB 59.0 → 59.6 — AND tightens cross-season variance
      (pooled 2022 RB 55.2 → 58.1, the weakest season). Coherent mechanism,
      not a fluke: item 44 already found RB "over-signaled" and zeroed its
      red-zone and EPA terms; recent form + consensus already capture RB
      value, so the base volume term is likewise net-noise. One caution
      noted honestly: the primary RB curve is non-monotonic (0 best, 0.3/0.5
      dip, 0.9 baseline between), so there's some noise, but 0 is clearly
      best on both pipelines by a real margin.
    - **Shipped `VOLUME_BLEND_WEIGHT.ppr.RB = 0`** (QB/WR/TE unchanged at
      0.9). Put to the user as a genuine judgment call (it reverses a
      foundational signal for a modest +0.25pp overall gain, per items
      30/33/41/44 precedent); user chose to ship. Verified on the real
      primary route (RB 59.6 / overall 58.94, QB/WR/TE byte-unchanged) and
      live (a real RB comparison renders sensibly, the pick correctly shifts
      since the RB volume term is gone), `tsc`/lint clean. The RB volume
      machinery (`POINTS_PER_VOLUME_UNIT.RB`) is kept, just zero-weighted
      for PPR — same "disabled but not deleted" precedent as every other
      zeroed signal in `config.ts`.
    - **Follow-up: swept Half-PPR and Standard too — RB=0 is PPR-ONLY, does
      NOT transfer.** Half-PPR: RB=0 makes the primary pipeline worse
      (primary RB 52.7 → 51.2, overall 56.23 → 55.74) even though pooled
      mildly likes it (+0.7) — the same non-transfer pattern, so not
      shipped. Standard: RB=0 is clearly wrong on BOTH pipelines (primary RB
      **56.9 → 49.0**, −7.9pp; pooled RB 54.6 → 52.0), and Standard wants its
      full weight. Coherent mechanism: PPR RB scoring includes receptions
      (which form + consensus already capture, making raw touch-volume
      redundant), but Standard RB points are yardage/TD-only and noisier, so
      touch-volume genuinely de-noises there. **Half-PPR RB stays 0.9 and
      Standard RB stays 1.0** — no config change, the PPR-only decision is
      now validated rather than merely scoped. Same in-memory-mutation
      diagnostic route (format-aware this time), deleted after; the earlier
      batch "failures" were just cold-cache timeouts from running both
      pipelines per request, fine once warm.

145. **Made `EXPERT_CONSENSUS_BLEND_WEIGHT` per-position and shipped QB=0.8
    / TE=0.7 — the cleanest no-tradeoff win in the tuning history, and a
    direct sequel to RB=0's "consensus reshapes the signal landscape"
    theme.** Consensus (item 70) is the single biggest lever in the engine
    (+8-10pp QB), but it was one universal weight of 0.5. Item 70's own
    write-up already had the clue: at higher weights the pooled pipeline and
    QB keep improving, but the primary WR *declines* (58.3 → 53.4 by w=0.9)
    — so a universal weight couldn't be raised without hurting WR, and 0.5
    was the compromise. Per-position weights break exactly that tradeoff.
    - **Method**: same as item 144 — made it `Record<SkillPosition, number>`
      (verified no-op at all-0.5), swept per position via an in-memory-
      mutation diagnostic route (positions independent in broad mode) on
      BOTH pipelines + by-season, deleted after.
    - **Result — a clean win, no position regressing on either pipeline.**
      QB strongly wants high consensus and PEAKS at 0.8 on BOTH pipelines
      (primary QB 61.8 → 66.7, pooled 60.5 → 61.5; 0.9 and 1.0 both decline,
      confirming a real peak, not a boundary). TE wants a bit more (0.7:
      pooled 56.8 → 57.8, primary flat). WR stays 0.5 (primary declines
      above it) and RB stays 0.5 (flat). Combined QB0.8/TE0.7/RB0.5/WR0.5:
      primary overall 59.02 → 59.84 (+0.82pp), pooled 57.98 → 58.31
      (+0.33pp), QB's weak 2024 improves (55.9 → 56.9). Bigger than RB=0
      (+0.25pp) and with no tradeoff.
    - **The one real implication, put to the user**: QB now leans **80%** on
      FantasyPros consensus (engine's own signals 20%) — a meaningful shift
      toward the market signal for the position where it's most predictive,
      echoing the deferred Open Item #30 ("lean rankings harder on
      consensus") but for the start/sit engine. Presented as such (same as
      RB=0); user confirmed ship.
    - **Shipped** `EXPERT_CONSENSUS_BLEND_WEIGHT = {QB:0.8, RB:0.5, WR:0.5,
      TE:0.7}` (`engine.ts` indexes by position; also fixed a stale comment
      there that wrongly called consensus "backtest-only / always null in
      live mode" — item 73 wired it live). Verified on both real routes
      (primary QB 66.7 / RB 59.6 / WR 58.3 / TE 56.4; pooled 58.31 / QB
      61.5, matching the diagnostic exactly) and live (a real Allen-vs-Burrow
      QB compare shows a large consensus modifier +6.34 pulling Allen's score
      toward the 22.1 consensus, sensible output). `tsc`/lint clean.
    - **One environmental gotcha worth recording**: after a dev-server
      restart clears the in-process FantasyPros cache, the FIRST backtest
      request's consensus fetch can miss (cold cache / GitHub's 60-req/hour
      unauth limit, exhausted by a long sweep) and silently degrade to an
      empty map (`.catch(() => new Map())`) — which makes that one run look
      like the no-consensus result (QB 52.9) and briefly looks alarming. It
      is transient: a second run once the cache is warm gives the real
      numbers. Not a code issue — the fetch's fail-open-to-empty is by
      design; just re-run.

146. **Post-consensus re-sweep of the three remaining active engine weights
    (`QB_RUSH_BLEND_WEIGHT`, `DROP_RATE_BLEND_WEIGHT`, `SNAP_SHARE_BLEND_WEIGHT_TE`)
    — found two clean both-pipeline wins and confirmed the third.** The
    RB=0 (item 144) and QB/TE consensus (item 145) wins both came from
    "consensus reshaped the landscape, re-check the weights," so this
    finished that pass on the weights not yet re-swept post-consensus. Same
    proven method: an in-memory-mutation diagnostic route
    (`/api/debug-weight-sweep`, deleted after), both pipelines + by-season.
    Two of the three are scalars (can't mutate a primitive `const` from
    another module), so a temporary `SWEEP_OVERRIDE` object was added to
    `config.ts` with three fallback reads in `engine.ts` (`x ?? CONST`),
    all reverted after the sweep — a no-op at baseline (override undefined),
    verified reproducing 59.84/58.31 before trusting anything.
    - **QB rush: NO CHANGE (0.3 confirmed optimal), hypothesis wrong.** I
      expected it redundant now that QB leans 80% on consensus; instead it
      PEAKS cleanly at 0.3 on both pipelines (primary QB 63.7 -> 66.7 across
      0 -> 0.3, then 0.4 -> 62.7 / 0.5 -> 61.8 both decline; pooled similar).
      A genuine QB signal even under heavy consensus — the qbRush term
      contributes through the 20% engine portion and still moves QB +3pp.
    - **WR drop rate: 0.2 -> 0.3 (raised).** The signal wanted MORE weight,
      not less — the opposite of the redundancy findings, and the ONE real
      gain for WR (the position both prior passes left untouched: it kept
      0.5 consensus and has no volume redundancy). Clean on both pipelines
      (primary WR 58.3 -> 59.3, pooled 55.7 -> 56.0). Higher (0.4-0.6) keeps
      nudging pooled up but starts costing 2025 WR, so 0.3 is the balanced
      peak.
    - **TE snap share: 0.4 -> 0.2 PPR (lowered).** The RB=0 pattern again:
      now that TE consensus is 0.7 (item 145), snap share at 0.4 was
      over-weighted/redundant. 0.2 beats 0.4 on both pipelines (primary TE
      56.4 -> 57.4, pooled 57.8 -> 58.3), cleaner by-season. Half-PPR/Standard
      left at 0.4/0.5 (PPR-only sweep, matching RB=0's scope).
    - **Combined (dropRate 0.3 + snapTe.ppr 0.2): a clean no-tradeoff win.**
      Primary overall 59.84 -> 60.33 (skill-only; +0.49pp), pooled 58.31 ->
      58.51, QB/RB byte-unchanged, no position regressing on either
      pipeline — unlike RB=0/consensus, no philosophy shift (minor WR-
      reliability / TE-snap weights). Verified on both real routes (primary
      WR 59.3 / TE 57.4; pooled 58.51 / WR 56.0 / TE 58.3, matching the
      diagnostic) and live (real Lamb-vs-Nacua WR and McBride-vs-Kittle TE
      compares render sensibly). `tsc`/lint clean; scaffolding fully
      reverted, diagnostic route deleted.

147. **Tested dynamic consensus weighting by data quality — lean harder on
    FantasyPros consensus when a player's recent-form sample is thin — and
    it's a clean NEGATIVE finding: both directions hurt, nothing shipped.**
    The hypothesis (the bigger "genuinely new" idea after the item 144-146
    weight retunes): when `dataQuality === "limited"` (fewer than
    RECENT_WEEK_COUNT recent games), the engine's own recent-form signals
    are unreliable, so lean more on consensus — mirroring Legit Rankings'
    item-78 `ENGINE_WEIGHT`-by-dataQuality precedent, for the start/sit
    engine. Flagged the tension up front: item 45 already found limited-data
    PAIRS are the MOST accurate bucket (58.8% pooled vs 52.4% confident), so
    there might be little pick-accuracy headroom — the real motivation was
    calibration on the thin-sample cases the backtest underrepresents.
    - **Method**: a new `EXPERT_CONSENSUS_BLEND_WEIGHT_LIMITED` table
      (initialized = the full weights, a verified no-op), an engine branch
      keying on `gamesUsedForRecent < RECENT_WEEK_COUNT` inside the
      consensus block (blendedScore != null there, so a player is "limited"
      or "full", never "insufficient"), swept via an in-memory-mutation
      diagnostic route reporting the confidence breakdown's `limitedData`
      bucket specifically (n=351 primary / n=1443 pooled — healthy). All
      reverted after; byte-clean.
    - **Result: monotonic, both-direction, both-pipeline HURT.** From the
      baseline (limited = the item-145 per-position weights), the
      limitedData bucket is 63.5% primary / 60.8% pooled. RAISING the
      limited weight drops it (boost+0.2 → 61.0%/60.4%, uniform 0.85 →
      58.7%/59.5%, uniform 1.0 → 57.5%/59.6%) AND drops overall (60.33 →
      56.89 at 1.0). LOWERING it also drops it (0.3 → 59.0%/59.1%, 0.0 →
      57.5%/57.6%). The current per-position weights are already optimal for
      limited-data players too — no data-quality-specific adjustment helps.
    - **Why it differs from the Legit Rankings precedent (the real insight,
      worth recording).** Rankings estimate SEASON-LONG value, where thin
      recent data genuinely means "defer to the market's season outlook."
      Start/sit is a THIS-WEEK decision, and a thin-data player is usually
      thin BECAUSE of a current situation (injury return, benching, rookie
      ramp) that the engine's recent-form signals capture better than
      FantasyPros' slower, reputation/season-based consensus. Leaning MORE
      on consensus removes that current-situation signal (hurts); leaning
      LESS adds noise from the thin recent form (also hurts). The item-145
      blend is the sweet spot for both data-quality regimes.
    - **Not shipped — no code change** (`config.ts`/`engine.ts` byte-clean
      reverts, diagnostic route deleted). A documented negative finding,
      same discipline as items 38/42/54/106/107/123/124. This write-up is
      the only artifact.

148. **Integrated air-yards share as a WR signal — a small but clean
    both-pipeline win, the first real WR improvement after the consensus /
    volume / drop-rate passes, and it defied the "consensus crowds out new
    box-score signals" expectation.** Air-yards share (a WR's share of team
    air yards — a downfield-role signal, a different axis than target count)
    validated standalone at ~56.6% for WR back in item 14 but was never
    integrated; the data was already read into the week table for the
    `airYardsShare` baseline, just not into the engine's `NflverseSignals`.
    - **Derived the conversion factor first** (temporary route, deleted):
      `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR = 40.43`, ratio of sums (sum WR PPR
      points / sum WR air-yards-share) over 2022-2025 WR game-weeks
      (n=8039), stable across seasons (38.3-41.4). Air-yards share and
      fantasy points are in the SAME `stats_player_week` CSV, so this was a
      direct read.
    - **Integrated** as a WR-only additive term (mirroring drop rate's
      shape): `airYardsShare` added to `NflverseSignals`/`EMPTY`, a new
      `averageAirYardsShare` (WR-only — TE's standalone air-yards number was
      too noisy, item 14) in `aggregate.ts`, populated in both
      `buildInput.ts`/`buildBacktestInput.ts`, and an `airYardsModifier` in
      `engine.ts` blended before the consensus stage. New breakdown fields
      `airYardsShareAvg`/`airYardsModifier` (+ a default in
      `scoreExtendedShared.ts` for D/ST/K).
    - **Swept the weight on both pipelines** via an in-memory-mutation
      diagnostic (`SWEEP_AIRYARDS`, reverted after): a genuine, if narrow,
      plateau at 0.05-0.1 — w=0.1 gives primary WR 59.3 -> 60.3, pooled WR
      56.0 -> 56.4, overall +0.33pp primary / +0.13pp pooled, and EVERY
      season holds or improves (pooled WR 56.4/54.9/58.0/56.4 vs baseline
      56.4/54.4/57.5/55.9). 0.15+ declines (air yards correlates with the
      target-volume already in the score, so a small marginal weight helps
      and more double-counts). QB/RB/TE unaffected (WR-only).
    - **Shipped `AIR_YARDS_SHARE_BLEND_WEIGHT = 0.1`** — picked 0.1 over the
      slightly-higher-primary 0.05 for its uniformly->=-baseline by-season
      profile (0.05 dipped 2022 by 0.5; the primary difference is ~1 pair of
      2025-only noise), same "prefer the plateau over the peak" discipline
      as items 9/10/20. PPR-only (the sweep didn't cover Half-PPR/Standard).
      Verified on both real routes (primary WR 60.3 / pooled WR 56.4,
      matching the diagnostic; QB/RB/TE byte-unchanged) and live (a real
      Lamb-vs-Chase compare shows real air-yards shares — Chase 40.8%, Lamb
      24.5% — with the modifier firing correctly at the small weight).
      `tsc`/lint clean; scaffolding reverted, diagnostic route deleted.
    - **Notable as the counterexample** to this session's recurring "new
      box-score signals get crowded out by consensus" pattern (items
      97/106/123/124 and my own low-odds prediction going in): a genuinely
      new signal DID clear the bar here, small but real, on the one position
      (WR) that the consensus-weight and volume-weight passes both left
      untouched.

149. **Swept the items-144/146/148 weights (drop rate, TE snap share,
    air-yards) for Half-PPR and Standard on both pipelines — those were all
    tuned PPR-only. Shipped two clean both-pipeline wins; air-yards non-PPR
    came back a documented no-ship.** Same in-memory `SWEEP_OVERRIDE`
    diagnostic + harness-verify discipline as items 144-146 (verified the
    empty override reproduces the real shipped numbers on all six format×
    pipeline baselines before trusting any swept value; e.g. pooled Half-PPR
    baseline 57.38/WR 56.53 matched exactly). RB=0 (item 144) was already
    confirmed PPR-only in its own follow-up, so it was excluded.
    - **Half-PPR drop rate 0.3 → 0.4 (shipped).** `DROP_RATE_BLEND_WEIGHT`
      was a single shared scalar (0.3); Half-PPR wanted more. Clean on both
      pipelines (pooled WR 56.5 → 57.1, primary 2025 WR 55.2 → 55.7), 0.4 a
      real peak (0.5+ decline), 3 of 4 pooled seasons up (2024 −0.5).
      Converted the constant to `Record<ScoringFormat, number>`
      {ppr:0.3, half_ppr:0.4, standard:0.3}. Same "drop rate wants MORE
      weight" direction item 146 found for PPR, now for Half-PPR too.
    - **Standard TE snap share 0.5 → 0.2 (shipped).** The non-PPR snap
      values (half 0.4, std 0.5) came from item 52's PRE-consensus per-format
      sweep; post-consensus (item 145 TE consensus → 0.7) Standard's 0.5 was
      over-weighted, the same redundancy item 145/146 found for PPR (0.4 →
      0.2). Clean both-pipeline win: pooled TE 62.2 → 63.5 with ALL four
      seasons ≥ baseline, primary 2025 TE 70.3 → 71.3. Standard now matches
      PPR at 0.2; Half-PPR stayed 0.4 (its own sweep was noisy — 0.4 a local
      peak pooled, primary flat — no clean signal to move it).
    - **Drop rate Standard, and TE snap Half-PPR: no change** — each was
      already at its both-pipeline optimum (Standard drop 0.3 is the pooled+
      primary peak; Half-PPR snap 0.4 is a noisy local peak with primary
      flat).
    - **Air-yards non-PPR: NOT shipped — a real methodological finding.**
      `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR` is a PPR-derived scalar (40.43),
      so the shipped scalar weight (0.1) has been applying a PPR-scaled
      conversion factor to non-PPR-scored games — a latent bug. Recomputed
      the factor per format (ratio of sums, Σ WR format-points / Σ WR
      air-yards-share over 2022-2025; PPR reproduced ~41.5 vs the shipped
      40.43, close enough to confirm method — small diff from a different
      WR-week set, n=9815 vs item 148's 8039), giving stable format ratios
      (half/ppr 0.82, std/ppr 0.64 → half 33.16, std 25.87 off the shipped
      40.43). With the CORRECT factor, air-yards adds essentially nothing to
      either non-PPR format (it's a reception-correlated signal). Half-PPR
      marginally prefers disabling on both pipelines but by-season mixed;
      **Standard's apparent primary-2025 benefit is entirely a conv-factor
      artifact** — with the correct 25.87 factor, primary Standard WR is flat
      at ~58.3 across every weight (the shipped 59.3 only exists because the
      inflated PPR 40.43 factor happens to correlate with 2025 outcomes), so
      disabling/correcting it costs ~1pp primary 2025 WR while helping the
      4-season pooled number. Neither transfers cleanly, so per the "ship
      clean transfers" bar nothing was shipped — but the underlying wrong-
      conv-on-non-PPR bug (air-yards weight 0.1 with the PPR 40.43 factor in
      Half-PPR/Standard) is left standing and flagged (Open Item #31). PPR
      air-yards untouched (validated, item 148).
    - **Verified against the real routes after shipping (not just the sweep
      harness):** PPR byte-identical on both pipelines (the Record refactor
      is a true no-op for PPR — primary 60.66, pooled 58.64); Half-PPR drop
      and Standard snap gains matched the sweep predictions exactly on both
      pipelines; live `/api/compare` in Half-PPR and Standard returns
      sensible WR/TE picks (the `DROP_RATE_BLEND_WEIGHT`-as-Record change is
      safe live). `tsc`/lint clean; `SWEEP_OVERRIDE` scaffolding and the
      `/api/debug-fmt-sweep` route both removed after recording these
      numbers, same discipline as items 144-148 — only `config.ts`/
      `engine.ts` changed.

150. **Fixed the item-149 air-yards non-PPR conversion-factor bug (former
    Open Item #31) — and re-swearing at the current shipped drop weights
    revealed the item-149 "air yards adds nothing to non-PPR" read was
    incomplete.** Item 149 flagged that
    `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR` was a PPR-only scalar (40.43)
    applied to non-PPR scores (~1.5x too large for Standard) and, based on a
    sweep run at the THEN-shipped drop-rate 0.3, concluded air yards could
    just be disabled for non-PPR. First attempt here did exactly that
    (weight Record {ppr:0.1, half_ppr:0, standard:0}) — but verifying it
    against the real routes showed it REGRESSED Half-PPR (pooled WR 57.1 ->
    56.0, primary 55.7 -> 55.2). Root cause: item 149 ALSO raised Half-PPR
    drop rate to 0.4, and air yards interacts with drop rate (both are
    sequential WR modifiers) — at drop 0.4 air yards is a real contributor,
    which the drop-0.3 sweep couldn't see. Rebuilt the sweep scaffolding and
    re-swept air yards at the CURRENT shipped drop weights (half 0.4, std
    0.3) with the CORRECT per-format conversion factors.
    - **The correct fix is a hybrid, not a blanket disable:**
      - **Conversion factor made per-format** (`Record` {ppr:40.43,
        half_ppr:33.16, standard:25.87}) — 40.43 x the measured WR
        point-scaling (half/ppr 0.82, std/ppr 0.64), keeping PPR at its
        validated value. This is the actual bug fix.
      - **Half-PPR air-yards weight 0 -> 0.15** — at drop 0.4 with the
        correct 33.16 factor, air yards improves BOTH pipelines vs air-off
        (pooled WR 56.0 -> 57.0, the pooled peak; primary 55.2 -> 55.7, flat
        across 0.05-0.2). So it's a real Half-PPR signal, not nothing.
      - **Standard air-yards weight stays 0** — with the correct 25.87
        factor, air-off is the pooled peak (59.11) and primary is flat; air
        yards genuinely adds nothing, and its pre-fix primary-2025 edge
        (59.31) was purely the PPR-conv-factor artifact (drops to 58.33 with
        correct handling). The engine gates the whole air-yards block on
        `weight > 0`, so a Standard WR card shows no air-yards note.
    - **Net vs the item-149 committed state:** PPR byte-identical on both
      pipelines (40.43/0.1 unchanged). Half-PPR essentially neutral (pooled
      WR 57.14 -> 57.02, primary unchanged) but now with the CORRECT
      conversion factor — the bug is fixed without a meaningful score change.
      Standard: pooled WR 58.99 -> 59.11 (+0.12), primary WR 59.31 -> 58.33
      (-0.98) — the accepted cost of removing the conv-factor artifact (the
      user chose to fix the bug knowing this ~1pp primary-2025 cost was never
      a real signal). Verified against the real routes (all six format x
      pipeline numbers match the sweep) and live `/api/compare` in Half-PPR/
      Standard. `tsc`/lint clean; sweep scaffolding + `/api/debug-fmt-sweep`
      removed; only `config.ts`/`engine.ts` changed. **Resolves Open Item
      #31.**

151. **Added a Weekly/Season mode toggle to Legit Rankings (`/rankings`),
    plus row-display cleanups — a blend-weight/presentation change, no new
    scoring signal.** The ranking already blended two signals per player —
    the engine's matchup-adjusted `finalScore` (weekly) and FantasyPros'
    season-long redraft consensus (season) — at `ENGINE_WEIGHT`; the toggle
    just shifts that blend.
    - **Weekly** (default, = the prior behavior): engine snapshot leads
      (`ENGINE_WEIGHT` by dataQuality, 0.65 for full data), matchup-adjusted
      → "best plays this week."
    - **Season** (new): a flat `SEASON_ENGINE_WEIGHT = 0.25` (75% FantasyPros
      season consensus), matchup-agnostic → "best rest-of-season value." The
      Top 100 cross-position VOR also leans harder on consensus
      (`OVERALL_CONSENSUS_WEIGHT` = {weekly:0.5, season:0.8}). `RankingMode`
      threaded through `getLegitRankingsForPosition`/`getLegitRankingsOverall`/
      `computeLegitScores`/`crossPositionVor` and the cache key (modes cache
      separately); the route parses `?mode=`. No backtest — rankings have no
      pick ground truth (items 78/139); a reasoned, tunable weight.
    - **Row-display changes (same feature):** removed the per-row FantasyPros
      rank and the opponent sentence (`notes[0]`) from `RankingsResult.tsx`,
      on request. Season mode shows real **season points scored so far** (new
      `seasonTotalPoints` on `PlayerScoreBreakdown`, from the season stat's
      format-aware total) **plus a rest-of-season projection** (reuses the
      Trade Assistant's `projectRestOfSeason` — `restOfSeasonPoints`/
      `restOfSeasonGames` on `LegitRankingEntry`). Offseason shows **0** season
      points (nobody's scored in the new season yet; gated on
      `context.isInSeason`), auto-switching to the real running total
      in-season. Committed `edb7753`.

152. **Reworked the Trade Assistant's uneven-trade (e.g. 2-for-1) verdict —
    three iterations, landed on the conservative, backtest-aligned model.
    Renamed "Trade Analyzer" → "Trade Assistant" along the way.** Prompted by
    two user reports of nonsensical uneven-trade verdicts (Washington+Walker
    for Gibbs said "+85 good" when giving up ~120 more raw points;
    Metcalf+Javonte for Gibbs said "fair" when getting an elite RB for two
    lesser players should favor the getter).
    - **Iteration 1 (shipped, then superseded):** shrank the item-138
      freed-roster-spot filler to 35% (`FREED_ROSTER_SPOT_FRACTION`) — it had
      over-credited the freed spot at a full startable starter's season
      (~207 pts). Fixed case A, not case B.
    - **Iteration 2 (shipped, then reverted):** replaced the filler with a
      **diminishing-returns** value model (`EXTRA_PLAYER_VALUE_RATIO = 0.4` —
      best player full value, each extra at 40%, so one elite outweighs two
      mids). Fixed both cases. But the user asked **"is this in line with our
      backtest model?"** and the honest answer is no: the discount is a
      lineup-scarcity *value judgment* that the multi-player trade backtest
      (which grades against *actual total points scored*, where two players
      always accumulate more) structurally cannot validate — the same
      un-backtestable status the freed-spot filler always had.
    - **Iteration 3 (SHIPPED, final — `03405c7`):** per the user's explicit
      choice, went **conservative/backtest-aligned** — grade uneven trades on
      **raw rest-of-season point totals** (no filler, no discount), so the
      side totals equal the sum of the player cards and the verdict rests only
      on the validated projections. The lineup-scarcity nuance is surfaced as
      a **caveat note** (naming the single most valuable player), not baked
      into the number. Both example trades now read "bad" (the package
      out-totals Gibbs) — the accepted tradeoff for backtest fidelity. Even
      trades (1-for-1/2-for-2) unchanged. `evaluateTrade.ts` is raw-sums +
      note (dropped the now-unused `format` param, 3 callers updated);
      `config.ts`/`TradeResult.tsx` reverted to their pre-session state; the
      multi-player trade backtest kept at its item-138 full-filler state (it
      measures actual points, which can't be "discounted" — a deliberate
      live-vs-backtest decoupling). Verified: the naive "more players"
      baseline is back to exactly 17.7% and 2-for-2 at 54.3% (matching item
      138).
    - **Rename:** the four user-facing "Trade Analyzer" labels → "Trade
      Assistant" (`cdd04c5`); the internal component/file (`TradeAnalyzer`)
      and code comments still use the old name.

153. **FantasyPros commercial-licensing exposure analysis — a strategic
    investigation (no engine change), with validated fallback numbers.** The
    user asked what the real exposure is if FantasyPros denies commercial
    licensing (our consensus comes via the `dynastyprocess/data` community
    SCRAPE, not a licensed feed). Ran the backtests with
    `EXPERT_CONSENSUS_BLEND_WEIGHT` set to 0 (temporary config edit, reverted)
    to measure the exact current fallback.
    - **The exposure is concentrated in QB and is largely unrecoverable.**
      Primary 2025 with vs. without consensus: QB **66.7% → 52.9%** (−13.8pp),
      RB 59.6→51.7, WR 60.3→60.8 (unaffected), TE 57.4→54.5, overall
      59.9→56.9. Pooled 2022-2025 overall 58.6→54.9. QB (shipped at 0.8
      consensus weight, item 145) has no substitute — item 30a found 2025 QB
      without consensus only ties the naive recentVolume baseline.
    - **RB's apparent −8pp is recoverable:** item 144 zeroed RB's volume
      weight *because consensus covered it*, so removing consensus
      double-exposes RB; restoring `VOLUME_BLEND_WEIGHT.ppr.RB` to 0.9 recovers
      RB to **57.6%** (re-tuned overall fallback 58.0%) — matching item 70's
      documented pre-consensus numbers exactly. So the realistic fallback =
      remove consensus AND revert the consensus-dependent retunes.
    - **Legit Rankings has NO backtestable fallback number** (no pick ground
      truth); losing consensus there costs the market-anchoring safety net
      (item 139 Lamar) — a credibility/UX exposure, not an accuracy one.
    - **"Engine as a whole" reframe (the user pushed on this):** (1) any
      consensus swap forces a full weight re-tune, since every weight was
      tuned *with* consensus present; (2) a strong projection could be a
      re-*anchor*, not a patch — standalone FantasyPros consensus (item 69)
      backtested as strong as the whole engine (WR consensus-alone 60.3% >
      engine WR 56.5%); (3) **if the driver is licensing, nflverse is the
      larger exposure than FantasyPros** — it feeds a dozen live signals + the
      entire 2022-2024 backtest, and SDIO can't replace it (no snap/target/
      air-yards at any tier).
    - **SportsDataIO paid tier**: could substitute FantasyPros *only via their
      projections product* (a same-kind market signal), NOT the box-score
      unlocks (which won't fix QB). Make-or-break unknown: whether their
      projections are **historically backtestable** (point-in-time archive/
      replay) — without that we can't validate before buying. Also: the free
      "Discovery Lab" tier isn't confirmed to serve live 2026 in-season weekly
      stats (the foundational data), so paid may be needed just to operate
      in-season regardless. Headshots: low-res already free (`photoUrl`,
      unused — too muddy, item 99); high-res exists but is access-gated (paid),
      with separate image-likeness licensing. Drafted a SDIO sales-call
      requirements checklist + inquiry email (delivered in-chat, not in the
      repo). No code shipped; this write-up + the two reverted config edits are
      the only artifacts. See new Open Item #33.

154. **UI review, then six fixes: rankings row density, control-cluster
    hierarchy, position-color consistency, a light-mode-specific separation
    mechanism, a sticky Start/Sit rail, and balanced landing states.
    Presentation only — no engine, scoring, or API change anywhere in this
    item.** Started from a
    fresh rating pass of the whole app driven in the browser (desktop 1400px
    and mobile 375px, both themes, real data), which came back **8/10** — up
    from the ~7.5 the item-151-153 session's own review gave, with that
    session's contrast/focus-ring/desktop-width fixes confirmed holding.
    Strongest: the Start/Sit result card's information hierarchy (verdict →
    matchup → projection+range → stat grid → case for/against) and the
    mobile drawer nav. Weakest: desktop space economy and control hierarchy.
    - **(a) The Rankings row's dead gap (`RankingsResult.tsx`).** At 1400px
      each row ran ~1080px wide with the name left and the score badge right
      and roughly 500px of nothing between — while the SAME list on mobile
      was tight and good, because the constrained width removes the void.
      Each row gained two desktop-only cells: the upcoming matchup (`vs OPP`
      + Favorable/Tough/Even, keyed off `diffFromAverage` via the same
      thresholds `ComparisonResult.tsx`'s own `matchupLabel` uses, so the
      word means one thing app-wide) and a score meter tinted to the same
      tier color as the badge, so bar and number can never disagree. The
      matchup cell is hidden in Season mode — that view is matchup-agnostic
      by design (item 151), so showing one would be a lie. Both are
      `sm:`/`lg:`-gated, so the mobile row is byte-identical to before.
      `matchupContext` was already in the `/api/rankings` payload (the route
      returns the full `LegitRankingEntry` breakdowns) and was already being
      read by `HomeRankingsBoard` via a local type extension — that
      extension was deleted and the field declared on the shared
      `RankingEntryResponse` instead, so there's one definition.
    - **(b) Control clusters, and a deliberate reversal of the prior
      session's call.** Rankings stacked three identically volt-filled,
      unlabeled pill groups (Top 100 / Weekly / PPR) and Backtest four —
      which read as ONE control with several segments lit, not as
      independent axes. The item-151-153 session had looked at this and
      dropped it as "no clean win; desktop was already one row and mobile's
      three are inherent to three multi-option controls" — that framing
      treated it as a LAYOUT problem (how to fit three groups), when it's
      really a LABELING + WEIGHT problem. New shared
      `SegmentedControl.tsx` with a `label` and a `tone`: each axis gets a
      small engraved caption, and only a page's PRIMARY axis carries the
      accent while supporting settings get a quiet fill. Rankings is now
      View / Timeframe / Scoring, left-aligned so it lines up with its own
      page header instead of centering at three ragged widths; Backtest is
      Mode / Scoring / Season, which also moved it off its old squared
      bordered buttons onto the app's shared pill language.
      `SCORING_FORMAT_OPTIONS` is now exported from `ScoringFormatToggle.tsx`
      so those two pages don't redeclare the option list.
      **The sidebar's own scoring pill deliberately stays volt** — in that
      rail volt means "selected" for nav too, and it's a separate
      always-dark surface; the tone split is WITHIN-page hierarchy.
    - **(c) Position colors were inconsistent.** The `--pos-qb/rb/wr/te`
      tokens (globals.css) are used as a scanning cue by
      `PlayerMultiSelect`/`LineupResult`/`WaiverResult`, but every Rankings
      avatar rendered volt regardless of position (confirmed by reading
      computed styles, not by eye). Now uses the same gradient tile. In the
      cross-position Top 100 this is exactly the cue that was missing — the
      position mix is scannable down the left edge.
    - **(d) Light mode had no hierarchy mechanism of its own — the real
      finding of this pass.** In dark, `--accent` is bright volt, so the
      recommended panel's translucent glow against near-black instantly
      marks the pick. In light, `--accent` is a deep navy and that same glow
      is invisible on white, so the two player cards looked nearly identical
      apart from the START/BENCH pill, and the white verdict card sat flush
      on a near-white page. The fix is NOT the dark treatment dialed up:
      light now separates by **edge + elevation + recession** — the verdict
      hero gets a real neutral drop shadow so it lifts off the page ground;
      the pick panel becomes an opaque raised card with a solid 4px accent
      spine down the left edge (the same marker the verdict hero already
      uses, so it reads as one family rather than a new device); and the
      bench panel RECEDES (sunken background, flat, no shadow, no spine).
      That last part is the half that does the real work — the contrast now
      runs in both directions instead of resting on the pick alone being
      slightly different. Implemented as module-local custom properties
      (`--pick-bg`/`--pick-spine`/`--bench-bg`/`--verdict-shadow`/…) with
      light values on `.sheet` and dark values in two override blocks, using
      the same three-state guard `globals.css` uses (`prefers-color-scheme`
      + a `:root:not([data-theme="light"])` guard, plus a duplicated
      `:root[data-theme="dark"]` so the toggle wins both ways — plain CSS
      can't share a ruleset across a media-query boundary). The dark values
      are the exact previous literals and `--pick-spine` is `0px` there, so
      **dark is byte-identical, verified by reading computed styles before
      and after** (pick: card-58% bg, volt 42% border, volt 34% glow, spine
      `0px`; bench: identical to the base panel). `.panel` gained
      `overflow: hidden` so the spine respects the corner radius — checked
      that this doesn't clip the item-121 stat tooltips by measuring all
      four tooltip rects against the panel bounds (all fully inside, worst
      case 216px of clearance) rather than assuming.
    - **(e) The Start/Sit right rail is now sticky from `lg` up
      (`StartSitRail.tsx`).** A full two-player result runs far taller than
      the short Recent-comparisons panel, so the rail scrolled away and left
      ~300px of blank column beside the player cards for the rest of the
      page. **It only works because the parent grid sets `items-start`** — a
      stretched grid item is full-height by definition, so sticky would have
      zero travel and silently do nothing; that alignment is load-bearing,
      not incidental, and is now commented as such. Every part is
      `lg:`-gated on purpose: below `lg` the grid collapses to one column
      and the rail stacks under the result, where sticky has no room to
      travel (confirmed `position: static` there). Measured travel rather
      than eyeballed: rail top sits at 142px at scroll 0 (its natural spot,
      below the page header), then pins at 24px through scroll 600 and on to
      the bottom of the page. The `max-h`/`overflow-y-auto` are defensive,
      not load-bearing — `useRecentComparisons` caps history at 5 entries
      (~200px against an 852px allowance), but without a cap a future taller
      rail could pin content permanently out of reach.
    - **(f) The Start/Sit and Lineup landing states were mostly empty
      viewport (`StartSitTool.tsx`/`LineupTool.tsx`).** Measured at
      1366x908: `/lineup` left **514px empty below its content (57% of the
      viewport)** and `/start-sit` **490px (54%)**, with the entry control
      jammed under the page header. Pre-result, each block now centers
      itself in the space below the header
      (`lg:min-h-[calc(100vh-16rem)]` plus `content-center` on Start/Sit's
      grid, `justify-center` on Lineup's flex column); the classes drop the
      moment a result exists and the layout returns to normal top-anchored
      flow. Result: Start/Sit 490px → 303px empty below (217 above / 303
      below), Lineup 514px → 310px (248 / 310) — slightly top-weighted on
      purpose, which is what reads as optically centered.
      **Recompose only, no new content** — the obvious fix (copy Waivers'
      method hero, item 109) was put to the user and deliberately NOT taken
      for Lineup, because item 110 removed that page's landing hero on
      request ("the tool is self-explanatory") and that still stands; the
      user chose the content-free option for both pages.
      **`content-center`, NOT `items-center`, is the load-bearing detail on
      Start/Sit**: it centers the grid's ROW BLOCK within the container
      while `items-start` still governs alignment WITHIN the row — which is
      exactly the non-stretched height (e)'s sticky rail depends on.
      `items-center` would silently break the rail added the same day.
      `min-height` also can't truncate: at a 470px-tall viewport the
      computed min-height (214px) is under the content height (237px) and
      the container simply grows — verified no clipping and no scrollbar
      there or at 620px.
      **Waivers was checked and left alone** — it measures only 243px empty
      (27%), because item 109's method hero already fills it. An earlier
      claim in this session that Waivers "occupies roughly the top-left
      third" was wrong, and came from reading a half-scale screenshot
      instead of measuring; recorded here so the mistake isn't inherited.
    - **One non-finding worth recording so it isn't "fixed" later**: the
      dark circle that overlaps the sidebar footer and a Rankings row in dev
      screenshots is **Next's dev-mode indicator**, not app UI — it does not
      exist in production.
    - **Verified live throughout, not just via `tsc`/lint**: both themes at
      1400px/1366px and 375px; Rankings Season mode correctly drops the
      matchup column; Backtest projection mode still hides Season and forces
      2025; and a real Broad backtest run returned **60.7% overall / QB 66.7
      / RB 59.6 / WR 60.3 / TE 57.4**, matching the documented current
      engine numbers exactly and confirming the control rework changed no
      behavior. `npx tsc --noEmit -p .` and `npm run lint` clean at every
      step. No `next build` — the user's dev server holds the same working
      directory and a production build would contend over `.next`.
    - **Follow-up: (e) caused a visible regression, fixed in `5b192fe`.**
      The sticky change also added `overflow-y-auto` + `max-h` to the rail
      wrapper as a scroll guard. An overflow container clips at its own
      SQUARE-cornered padding box, and the panel fills the wrapper exactly,
      so the card's soft drop shadow — which paints outside its border box —
      was sliced into a hard rectangle and read as a sharp-edged outline
      around the rail. Both were removed; `sticky`/`top-6`/`self-start`
      stay. The guard was defensive only and could never fire
      (`useRecentComparisons` caps history at 5 entries), so it was dead
      code with a visible cost. If the rail ever gains taller content, put
      the overflow on an INNER element, not that wrapper — there's a
      comment in the file saying so, because a scroll guard looks like the
      obvious companion to a sticky element.
    - Commits: `dd4c5c3` (a/b/c), `6004c8a` (d), `27a00e6` (e), `4e3b943`
      (f), `5b192fe` (the (e) regression fix).

155. **Probed two new SportsDataIO subscriptions (a higher-tier
    "SportsDataIO API" key plus a separate "NFL Advanced Metrics API"
    key) and mapped exactly what they can and can't reach. No code
    change — this is a capability/decision write-up, and it both answers
    a long-standing open question and falsifies two documented "facts"
    in Data Source Notes.**
    - **Operational state: the app is intentionally non-functional
      locally**, because `SPORTSDATA_API_KEY` in `.env.local` was swapped
      to the new key. `/api/players` returns 502 and every SportsDataIO
      call `401`s. Restoring the old key would fix it, but the user chose
      NOT to — the decision is to hold on the new key and wait for
      SportsDataIO to resolve the entitlements. Documented here because
      the failure looks exactly like a code regression and isn't one; see
      the READ THIS FIRST banner in the handoff for what this rules out.
      Production was swapped to the new key as well and went down with it
      — confirmed by black-box test of the live domain (`/api/players`
      and `/api/rankings` both `502`, page shell `200`). An earlier draft
      of this item asserted Vercel was untouched; that was assumed, never
      checked, and wrong. The lesson worth keeping: this document's value
      depends on not recording assumptions as findings.
    - **Method**: `curl` probes with each key against a matrix of hosts,
      packages, seasons and season-types, reading only status codes and
      row counts (no key values printed). Findings below are all live-
      verified, not read off documentation — the docs page for the NFL
      API doesn't even expose the per-package base paths (checked), and
      the advanced-metrics product isn't in the public catalogue at all.
    - **What the new main key unlocks (2026 only)**: `scores/json/Teams`,
      `Players` (6,245 rows), `Timeframes/current`, `Schedules/2026REG`
      (304 games), `Byes/2026`;
      `projections/json/PlayerSeasonProjectionStats/2026` (1,937 rows);
      `stats/json/PlayerGameRedZoneStats/2026REG/1`;
      `stats/json/PlayerSeasonStats/2026` and `/2026PRE` (200 but ZERO
      rows — the season hasn't kicked off).
    - **What it does NOT unlock**: `PlayerGameStatsByWeek` on ANY season
      or season-type (`401` — the app's backbone), `stats/json/Players`,
      `scores/json/DepthCharts`, and every season 2021-2025.
    - **Two documented facts in Data Source Notes are now wrong, and
      both have been marked superseded there rather than deleted:**
      (a) "SportsDataIO does not offer snap counts, target share, or air
      yards at any tier" — it does, through the hidden advanced-metrics
      product; the original note was a correct reading of the public
      catalogue, which is exactly why it was wrong. (b) "SportsDataIO has
      no game-schedule endpoint on this plan" — true of the original
      plan, false of the 2026 one.
    - **Partially answers item 153 / Open Item #33 (the FantasyPros
      licensing exposure).** The make-or-break question there was whether
      SportsDataIO's projections are historically backtestable. Answer on
      THIS plan: no — `projections/*/2026` works, every earlier season
      `401`s, so a projections-for-FantasyPros swap could not be
      validated against history without buying past seasons. The
      projections product does exist and is real (1,937 players), so the
      question is now about season entitlements, not product existence.
    - **The bigger strategic prize is nflverse, not FantasyPros.** Open
      Item #33 flagged nflverse as the larger un-reviewed licensing
      exposure (it feeds ~a dozen live signals and the whole 2022-2024
      backtest). Advanced Metrics carries first-party equivalents for
      nearly all of them (snap share, target share, air yards,
      separation, red-zone/goal-line touches, drop rate) — so this is the
      first credible path to retiring that dependency for the LIVE tools.
      It would also delete the single biggest performance cost in the
      app: red-zone touches currently come from parsing a ~98MB
      play-by-play release (items 27/125/126), and would become a direct
      field read.
    - **Deliberately did NOT start the migration.** Three blockers, any
      one of which would have made it wasted work: the missing
      `PlayerGameStatsByWeek` entitlement, the 2026-only season scope
      (the app runs on last-completed-season data, and 2026 has no rows
      yet), and the unresolved question of whether historical seasons can
      be added. Building against endpoints that `401` would have replaced
      a working architecture with a broken one and been unverifiable.
      See new Open Item #35.
    - No repo artifact beyond this write-up and the two Data Source Notes
      corrections — same discipline as every other probe-only
      investigation in this document (items 34/38/97/106).

156. **SportsDataIO support answered item 155's blocker, and the app is
    working again — on a THIRD (legacy) key, with a hard deadline. Two
    findings and one shipped code change.**
    - **The `PlayerGameStatsByWeek` 401 was never an omission — it's a
      product-tier distinction we had misread.** SportsDataIO's Ewan
      Macdonald: the subscription is **Final Only**, and
      `PlayerGameStatsByWeek` is marked **Live & Final**. The Final-Only
      equivalent is the **Box Score [Final]** family. Verified live:
      `stats/json/BoxScoresFinal/{season}/{week}` returns 200, and its
      `PlayerGames` array carries the SAME fields the app already reads
      (`PlayerID`, `Season`, `Week`, `Team`, `Position`, `Played`,
      `PassingAttempts`, `ReceivingTargets`, `Receptions`, `FantasyPoints`,
      `FantasyPointsPPR`). Confirmed against REAL data by querying the
      2026 preseason, which HAS been played — `2026PRE/1` returned 17
      games / 176 player rows, `2026PRE/2` 16 games / 179 rows. (2026REG
      returns 200 with 0 rows, correctly, since the season hasn't started.)
      **It is strictly better than what the app has today**: the same call
      also returns `FantasyDefenseGames` (replacing `defense.ts`'s
      `FantasyDefenseByGame` reader) and `TeamGames` (replacing
      `teamGameStats.ts`), so ONE endpoint collapses three current readers.
      By contrast `BoxScores/...` (the Live & Final variant) 401s, exactly
      as the tier explanation predicts.
    - **Injuries and depth charts ride on the Players feed, not the
      dedicated endpoints.** `scores/json/DepthCharts` and
      `stats/json/Injuries/…` still 401, but `scores/json/Players` (already
      200) carries `InjuryStatus`/`InjuryBodyPart`/`InjuryNotes`/
      `InjuryPractice`/`InjuryStartDate` (158 players currently flagged) and
      `DepthOrder`/`DepthPosition`/`DepthDisplayOrder`/
      `FantasyPositionDepthOrder` (2,053 players). This matters beyond
      parity: item 100's depth-chart confidence floor currently parses a
      ~554k-row nflverse release (~13s cold, the second-worst perf cost in
      the app after play-by-play) and would become a field on a feed the
      app already fetches. Also newly enabled: Fantasy Feeds > Salaries &
      Slates (`projections/json/DfsSlatesByWeek/2026REG/1` → 200), plus
      betting pre-game lines and props — those use SportsDataIO's
      **Sportsbook Group** endpoints, which were NOT tested.
    - **Historical seasons are paid and explicitly NOT part of the
      evaluation** — their stated reason is that historical data is "one
      and done" (once released they no longer control access). So 2022-2025
      cannot be unlocked on the evaluation keys at any point; pricing is a
      separate sales conversation.
    - **Shipped (`7129a2d`): per-host key selection, which restored the
      app.** The previous subscription's key turns out to still be fully
      alive — verified before building anything on it:
      `api/nfl/fantasy/json/PlayerGameStatsByWeek/2025REG/1` returns **1,743
      real player rows**, both legacy hosts work, all five endpoints the app
      calls return 200, and its season range is **2025 only** (2023/2024/2026
      all 401). `API_BASES` (`client.ts`) now pairs each host with the env
      var supplying its key (`SPORTSDATA_LEGACY_API_KEY` for both legacy
      hosts) instead of every request reading one global key, falling back to
      `SPORTSDATA_API_KEY` when the legacy var is unset so it's a no-op in
      any environment without one.
      **Much smaller than the season-routing this looked like it needed**:
      no shipped code path targets a v3 host yet, so per-HOST selection is
      sufficient and no per-SEASON branching is required.
    - **Verified end to end, local AND production**: player search returns
      real players; a real comparison returns "Start Joe Burrow over Patrick
      Mahomes — 2.1 more projected points (19.1 to 17.0)" with confidence
      55, **byte-identical to a run earlier the same session before any key
      changes**, which is what proves the engine is untouched; Legit
      Rankings returns a full QB board. Production needed
      `SPORTSDATA_LEGACY_API_KEY` added in Vercel plus a redeploy — worth
      remembering that Vercel binds env vars at BUILD time, so a variable
      added after a build starts is invisible until the next redeploy (this
      bit us once here: the deploy my push triggered succeeded while still
      502).
    - **The deadline this creates, which is the single most important thing
      in this item.** The legacy key covers 2025 and NOT 2026.
      `getSeasonContext()` follows the last COMPLETED season, so the app
      stays on 2025 — and keeps working — right up until 2026 week 1
      finishes (~**Sept 15 2026**, first game Sept 9 per SportsDataIO's own
      `Schedules/2026REG`). At that point it will request 2026, the legacy
      key will 401, and the app goes down again unless the v3 migration has
      landed. This buys roughly three weeks of a working app to do that
      migration as scheduled work rather than an emergency — it does not
      remove the need for it.

157. **Two research/decision threads with no code — recorded so they
    aren't re-litigated.**
    - **A community page (users sharing start/sit questions with each
      other) was proposed and declined.** The reasoning, since the instinct
      behind it is sound and will recur: it would be the first thing in
      this project needing a database AND user accounts (both explicitly
      out of scope — all state is localStorage), plus a permanent
      moderation burden on a brand built for someone else's newsletter; an
      empty community page reads as a dead product, which is actively bad
      for a build being evaluated; and it competes with r/fantasyfootball,
      Sleeper's own chat and Discord, where the audience already is. It
      also isn't the differentiator — the moat is the backtested engine.
      **The counter-proposal, also not built:** make comparisons shareable
      by URL. Same engagement/virality instinct, no database, no auth, no
      moderation — the player IDs and format encode into the URL, and the
      page already restores comparisons from stored state (item 92), so
      restoring from URL params is a small change rather than a new system.
      Offered and declined for now; noted here as the cheap version if the
      subject returns.
    - **Platform-sync and commercial-licensing research** — findings folded
      into Open Items #32 (FantasyPros' real platform list; Yahoo's OAuth2
      /attribution/Access-and-Use-Agreement; why Yahoo forces a session
      layer) and #33 (Sleeper's non-commercial licence, already committed
      separately in `8731b2c`). No code.

158. **Migrated the SportsDataIO readers to the v3 hosts — season-routed, so
    2025 keeps working today and 2026 works from September with no flag day.
    Stage 1 (mapping spike) then Stage 2 (the migration), both this session.**
    - **Stage 1 found the migration far lower-risk than expected.** All eight
      endpoints the app calls have a working v3 equivalent, and a
      field-by-field diff of legacy vs v3 responses found **zero missing
      fields on any of them** — v3 is a strict superset every time (e.g.
      PlayerGameStats 81 fields → 169, FantasyDefense 36 → 110). The three
      identity checks that would have broken things SILENTLY all pass:
      **team codes** identical 32/32, **PlayerIDs** identical (all 6,246
      shared, zero name mismatches — Burrow is 21693 on both), and
      **TeamIDs** identical, which is what keeps the synthetic D/ST
      PlayerIDs (`900000 + TeamID`, item 62) stable and rosters saved in
      users' browsers working.
    - **The mapping**: `Byes`→`scores/json/Byes`, `Teams`→`scores/json/Teams`,
      `Timeframes/all`→`scores/json/Timeframes/all`,
      `Players`→`scores/json/Players`,
      `PlayerSeasonStats`→`stats/json/PlayerSeasonStats`, and — the
      interesting one — `PlayerGameStatsByWeek`, `FantasyDefenseByGame` and
      `TeamGameStats` ALL collapse into a single
      `stats/json/BoxScoresFinal/{season}/{week}` call, read off its
      `PlayerGames`/`FantasyDefenseGames`/`TeamGames` arrays. Three readers,
      one HTTP request. It also retires the `odds` host, whose only remaining
      use was `TeamGameStats`.
    - **The design decision that shaped Stage 2: route by SEASON, not a
      cutover.** The two subscriptions cover DISJOINT seasons — the legacy
      key 401s on 2026, the 2026 key 401s on 2025 — so neither host family
      can serve both and a straight switch would have broken the app
      immediately. New `seasonRouting.ts` (`V3_MIN_SEASON = 2026`,
      `usesV3()`, `seasonYearFromApiSeason()`); each season-scoped reader
      dispatches internally. Because `getSeasonContext()` follows the last
      COMPLETED season, **the app moves itself to 2026 the moment 2026 week 1
      finishes — no redeploy, no flag day.**
    - **Non-season-scoped endpoints (`Players`, `Teams`, `Timeframes`) were
      deliberately LEFT on legacy**, even though v3 serves them fine. The
      2026 keys are an EVALUATION subscription (free through 15 Sept 2026);
      pointing always-on endpoints at them would make the whole app depend on
      an evaluation that might lapse. They flip to v3 when the 2026 plan is
      actually bought — that's a one-line change per reader now the bases
      exist.
    - **One real engineering risk, handled: payload size.** `BoxScoresFinal`
      is **~11.9 MB per week vs ~3.2 MB** for the legacy weekly stats (~4x),
      and the backtest loads a whole season (~214 MB vs ~58 MB) — the exact
      memory-pressure shape that crashed the dev server in item 27. So
      `boxScores.ts` fetches with the shared response cache BYPASSED (new
      `skipCache` option on `sportsDataFetch`), trims to the three arrays the
      app reads, and caches only those trimmed slices. Same
      "don't retain what you don't read" fix item 27 applied to play-by-play.
    - **Verified both paths.** 2025 (legacy): a real comparison returns
      "Start Joe Burrow over Patrick Mahomes — 2.1 more projected points
      (19.1 to 17.0)", confidence 55 — byte-identical to runs before the
      migration, which is what proves nothing regressed; player search and
      Legit Rankings also unchanged. 2026 (v3): exercised all five
      season-routed readers through the REAL app modules against 2026
      preseason (which has real played games) — 2,871 player rows, 32
      defense rows, 32 team rows, 32 byes, and a correctly-shaped sample row
      (Aidan O'Connell, QB, LV, played=1, 12.64 PPR, 24 pass attempts).
      `PlayerSeasonStats/2026` correctly returns 0 rows, since the regular
      season hasn't started. Temporary verification route deleted after.
    - **Honest limitation:** the v3 path is verified against 2026 PRESEASON
      only, because the new key can't see 2025 and the legacy key can't see
      2026. It needs re-verifying against real regular-season data once 2026
      week 1 completes — which is also the moment the app switches over, so
      that check is the first thing to do that week.
    - **Also worth knowing (cost me a cycle):** a Next.js App Router folder
      starting with `_` is a PRIVATE folder and is excluded from routing, so
      a temp route at `api/__v3check` 404s silently.

159. **Built the player stat pages — a sortable league-wide browser
    (`/stats`) plus per-player season/game-log pages (`/stats/[playerId]`) —
    then added search and advanced metrics. Presentation and data-surfacing
    only; no engine, scoring or backtest change anywhere in this item.**
    - **Most of the data was already being paid for and thrown away.**
      `PlayerGameStatsByWeek` returns **81 fields per row and the app read
      18**. Touchdowns, completions, interceptions, passer rating, longs,
      fumbles and the entire kicker line (FGM/FGA, 50+, XPM/XPA) were all
      arriving and being discarded. Because `sportsDataFetch` casts the raw
      JSON rather than allowlisting fields, declaring them on
      `PlayerGameStat`/`PlayerSeasonStat` was the whole data change — no new
      call, no new source. They're declared OPTIONAL because rows built from
      nflverse (`gameLog.ts`) and the synthetic D/ST rows in `runBacktest.ts`
      have no equivalent; making them required would only force fake zeros
      into those constructors.
    - **Season totals are one cheap call; game logs are not.** A leaderboard
      comes from a single `PlayerSeasonStats` call (which carries team and
      position too — the only join is onto the player list for full display
      names, since season rows abbreviate them, "C.McCaffrey"). A game log
      has to be assembled from per-week box scores: **SportsDataIO has no
      per-player season endpoint on this plan** — `PlayerGameStatsBySeason/
      {season}/{id}/all` and `PlayerSeasonStatsByPlayerID/{season}/{id}` both
      `404`. Weeks are therefore fetched in bounded batches of 4, not all 18
      at once, which is the memory-pressure shape item 27 fixed.
    - **Points lead both tables rather than trailing them.** With 8-9 stat
      columns these always scroll horizontally, and the first build had
      PTS/PPG last — which put the numbers people actually came for off the
      right edge. Rank is likewise assigned BEFORE the search filter runs: a
      filtered table that renumbers from 1 would tell you whoever you looked
      up is the best at his position.
    - **Search normalizes punctuation and case on both sides**, so "jamarr"
      finds Ja'Marr Chase and "aj brown" finds A.J. Brown; team codes match
      too. A miss offers the other positions rather than dead-ending, since
      the table only ever holds one position and searching a RB with the QB
      tab open legitimately finds nothing.
    - **Advanced metrics come from TWO different sources, deliberately, and
      the reason is item 155's season entitlement — see Open Item #35.**
      - **Player detail pages use SportsDataIO's NFL Advanced Metrics**
        (`AdvancedPlayerInfo/{PlayerId}`, `src/lib/sportsdata/
        advancedMetrics.ts`). Better than nflverse on every axis but
        longevity: keyed by the same PlayerID everything else uses so there
        is NO name join, one HTTP call per player, and it carries the
        red-zone numbers that cost a ~98MB play-by-play parse through
        nflverse. Surfaces snap share, target/opportunity share, routes run,
        red-zone usage, evaded tackles, yards created, deep-ball and
        contested-target volume, hurries.
      - **The leaderboard CANNOT use it** — every bulk advanced path `401`s
        for 2025 (Open Item #35), so a 252-row WR table would be 252 calls
        per page load. It uses nflverse's `snap_counts` + `stats_player_week`
        instead (two already-cached CSVs, no play-by-play), plus efficiency
        rates derived from the season totals already on the row.
      - **The two sources agreeing is a real cross-check on both**: Ja'Marr
        Chase reads 32.1% target share from nflverse on the leaderboard and
        32.1% from SportsDataIO on his own page; snap shares land within
        about a point (Chase 94.4 vs 95.5, Stafford 98.5 vs 99.2 — different
        snap definitions, same story). Stafford's derived 65.0% completion
        rate is exactly 388/597 from the standard table.
    - **Rates are derived from season sums, never averaged from per-game
      percentages, wherever the components are visible** — comp %, catch
      rate, yards per attempt/target/touch. That is the shape of the
      miscalibration bug in item 66. Only the team-share metrics (snap,
      target, opportunity, hog) are per-game means, because the team totals
      they divide against aren't in the rows; the UI says so rather than
      letting them read as season figures.
    - **Advanced is strictly optional and fails open.** It rides on the
      separate `SPORTSDATA_ADVANCED_API_KEY` evaluation subscription, so a
      throw, a missing key or a player the feed doesn't cover all drop the
      section AND its toggle, leaving the page exactly as it was. Verified
      against a real uncovered skill player (Myles Price, 16 games, no
      advanced rows), not just reasoned about. Kickers are excluded — the
      feed carries nothing meaningful for them. The defensive/coverage
      fields on these rows are deliberately skipped: they're for corner
      matchup analysis and read as garbage on a skill player
      (`PrimaryCorner` comes back as e.g. -9454).
    - **Missing values sort LAST in both directions.** "—" is missing data,
      not a low score; floating it to the top of an ascending sort would
      present unmatched players as the league's worst.
    - **Known gap, deliberately NOT fixed here**: the leaderboard's nflverse
      join is by normalized name, and `normalizePlayerName` strips
      punctuation and Jr./III suffixes but NOT diacritics, and doesn't
      resolve nicknames — so a handful of real players show "—" (Audric
      Estimé — accent; Kenny Gainwell — nflverse has "Kenneth"; Bam Knight —
      nflverse has "Zonovan"). About 4% of a WR list, the rest of the nulls
      being deep bench with no offensive snaps. Adding diacritic-stripping is
      close to a one-line change and can only turn misses into matches, but
      that function is SHARED WITH THE SCORING ENGINE — widening it changes
      which players pick up nflverse signals (snap share, drop rate) that
      feed `finalScore`, and would move backtested numbers. It needs its own
      change with its own backtest verification, not a side effect of a stat
      page.
    - D/ST is excluded throughout: SportsDataIO models a team defence as a
      team stat with no player row, so it has no game log of the shape these
      pages assume — the same reason Legit Rankings excludes it (item 78).
    - Verified against real 2025 data across all five positions, all three
      scoring formats, a kicker, a player with DNP weeks, a player with no
      games at all, and desktop/mobile with no page-level horizontal
      overflow. Commits: `4293da5` (pages), `aac6378` (search), `7e025f6`
      (advanced on detail), `1cc5b49` (advanced on leaderboard).

160. **Tested yards per route run (YPRR) as a standalone signal — the one
    marquee SportsDataIO advanced metric that is reconstructable per-week.
    Real WR signal, but not integrated: it overlaps heavily with target
    share, and it cannot be validated beyond a single season on this
    subscription.**
    - **Why only YPRR was testable.** Probing `AdvancedPlayerInfo` showed the
      per-player feed carries **83 fields per GAME but 445 per SEASON**, and
      almost every genuinely new metric is season-ONLY:
      `ExpectedFantasyPoints`, `RouteParticipation`, `YardsPerRouteRun`,
      `WeightedOpportunities`, `TargetQualityRating`, `TargetSeparation`,
      `PressuredCompletionPercentage`, `TotalQBR`, `AirYards`, `DropRate`.
      A season-final number can't be sliced into a trailing window and using
      it to predict week N leaks the rest of the season, so **none of those
      can be backtested at all in this form** — a shape problem, not a
      subscription one. Per-week the feed does carry `RoutesRun`,
      `SnapShare`, `TargetShare`, `OpportunityShare`, `Hurries`,
      `YardsCreated`, `EvadedTackles`, `RedZone*`, `DeepBall*`,
      `ContestedTargets` — so YPRR is reconstructable as
      `ReceivingYards / RoutesRun` from per-week components (ratio of sums
      over the trailing window, per items 33/159, not a mean of per-game
      rates).
    - **Method**: the standard harness — `buildPairsForWeek` adjacent-rank
      pairs on the primary 2025 SportsDataIO pipeline, weeks 2-18, graded by
      `gradeOutcome` — with reference pickers computed on the IDENTICAL pairs
      so the comparison is apples-to-apples. 306 pairs, 81 distinct pooled
      players, one cached `AdvancedPlayerInfo` call each (0 failures, ~12s).
    - **Results (2025, primary pipeline):**

      | signal | overall | WR | TE |
      |---|---|---|---|
      | **yprr** | **56.7%** (n=305) | **59.3%** (n=204) | 51.5% (n=101) |
      | targetShare | 55.1% | 57.4% | 50.5% |
      | targets (volume) | 54.6% | 54.2% | 55.3% |
      | routesRun | 48.2% | 47.0% | 50.5% |

    - **Route VOLUME alone is below chance (47-48%) while route EFFICIENCY is
      the best WR number here** — worth recording, because it says YPRR is
      not merely a volume proxy dressed up.
    - **But it is substantially the same information as target share.** Split
      by whether the two agree (item 17's receivingComposite methodology):
      WR agreement **63.7% (n=124)** — the strongest number in this test —
      while on the 80 pairs where they DISAGREE, YPRR picks right only 52.5%
      vs target share's 47.5%. So YPRR's genuine edge over a signal the
      engine already has is a ~5pp swing on 39% of pairs, barely above chance
      in absolute terms. TE shows nothing at all (51.5%/50.5%, agreement
      51.9%) — consistent with TE's chronic noisiness.
    - **Not integrated, on three grounds:** (1) YPRR alone (59.3% WR) does not
      beat the engine's own current WR accuracy (60.3%, primary 2025); (2) the
      repeated pattern of items 33/35/97/106/123 is that standalone signals of
      exactly this strength add nothing once blended into a score already
      carrying expert consensus — item 148's air-yards share is the lone
      counterexample and shipped at 0.1; (3) **it cannot be cross-season
      validated** — 2022-2024 advanced data is paywalled, so this is a
      single-season result, which items 24-30 are the long record of not
      trusting.
    - **What would change the answer**: buying historical seasons (Open Item
      #35) would make a proper multi-season YPRR sweep possible, and the
      agreement overlay (63.7%) is the shape worth testing then — as a WR
      high-confidence tiebreaker like item 20's, not a scoring factor.
      Separately, the season-only fields are a natural fit for **Legit
      Rankings**, which is a season-value ranking with no pick ground truth
      to backtest against (items 78/139) — `ExpectedFantasyPoints` and
      `YardsPerRouteRun` are arguably better inputs there than what it has
      now, and need no per-week reconstruction.
    - **FOLLOW-UP — the agreement overlay was then tested as a real
      integration, and it FAILS. This closes the question, and it means
      buying historical data for YPRR would be wasted money.** The obvious
      next step from the 63.7% agreement number was to try it the way item
      20's WR tiebreaker works: on a close call, defer to the players two
      signals independently agree on. Tested against the real engine on the
      primary 2025 pipeline, WR pairs, weeks 2-18.
      - **Harness verified against the real engine first** (items 43/44's
        rule): the diagnostic's baseline reproduced `/api/backtest/broad`
        WR EXACTLY — 60.29%, 123/204 — before any variant was trusted.
      - **Results:**

        | variant | WR accuracy | picks changed |
        |---|---|---|
        | baseline (engine as-is) | **60.29%** (123/204) | — |
        | + YPRR & target share agree | 57.84% (118/204) | 15 |
        | YPRR replacing separation | 57.84% (118/204) | 15 |
        | three-way agreement | 60.29% (123/204) | 0 |

      - The overlay overrode 15 picks and lost 5 net — **a 2.45pp
        regression**. The three-way variant never fires at all, which makes
        sense once traced: when target share and separation agree the engine
        ALREADY flips to them (item 20), so requiring YPRR to agree too adds
        no new overrides.
      - **Why the standalone number didn't survive**: on exactly the close
        calls this gates, the engine's pick is already informed by target
        share, separation, drop rate, air-yards share AND expert consensus.
        A two-signal heuristic overriding that is strictly less informed.
        Same failure mode as QB success rate (item 33) and the teammate-out
        bump (item 35) — a real standalone signal that adds nothing, or here
        actively hurts, once blended into an already-tuned score.
      - **Practical consequence for Open Item #35**: do NOT buy historical
        seasons on YPRR's account. It failed its first integration test on
        the one season available, so paying to validate it across more
        seasons would be spending money to re-check something already
        rejected. Any future case for buying history has to rest on a
        different signal, or on the backtest-pipeline argument already
        recorded in #35.
    - No engine or config change. Both temporary diagnostic routes deleted
      after recording these numbers, same precedent as items 22/29/34/38/97/
      106/123/124 — this write-up is the only lasting artifact.

161. **Replaced the FantasyPros consensus with SportsDataIO's own weekly
    projections as the engine's consensus signal — a real accuracy gain
    (primary 2025 overall 60.66% -> 61.80%), full coverage, and a licensed
    source instead of a community scrape. The biggest single source change
    the engine has had.**
    - **The make-or-break question from item 153 has an answer: they ARE
      backtestable.** `PlayerGameProjectionStatsByWeek/2025REG/{week}` returns
      200 on the LEGACY key the app already uses (671 rows for week 8), and
      they are genuine PREGAME projections, not backfilled actuals —
      confirmed by comparing 350 played players against their real scores:
      ZERO matched, with big misses both ways (Bijan projected 24.0, scored
      5.8; Jonathan Taylor projected 22.6, scored 37.4). A backfilled feed
      would look far more accurate than that.
    - **Projection accuracy, graded on identical rows** (same startable pool
      as item 71, only rows where BOTH sources have a projection, n=1203).
      The FantasyPros column reproduces item 71's documented figures exactly,
      which is what validates the harness:

      | | SportsDataIO | FantasyPros |
      |---|---|---|
      | ALL | MAE 6.22, RMSE 7.88, bias +0.64 | 6.35 / 8.05 / +0.91 |
      | QB | 6.37 / 7.94 / +0.93 | 6.52 / 8.16 / +2.00 |
      | RB | 6.41 / 8.14 / +0.46 | 6.47 / 8.24 / +0.55 |
      | WR | 6.39 / 7.93 / +1.02 | 6.56 / 8.16 / +1.16 |
      | TE | 5.33 / 7.15 / -0.06 | 5.52 / 7.32 / +0.00 |

      SportsDataIO wins MAE and RMSE at every position, and bias everywhere
      but TE (a tie).
    - **But MAE is not what the engine is tuned on, so PICK accuracy was
      tested before shipping** — and the first result was a trap worth
      recording. Swapped the consensus source inside the real engine (the
      map `sliceWeekData` already takes, so the source is the only variable)
      and graded on the primary 2025 pipeline. Harness verified against
      `/api/backtest/broad` first (60.66% overall, every position matching)
      per items 43/44's rule:

      | config | overall | QB | RB | WR | TE |
      |---|---|---|---|---|---|
      | FantasyPros (was shipped) | 60.66% | 66.7 | 59.6 | 60.3 | 57.4 |
      | SportsDataIO @ FP's weights | **60.00%** | 67.7 | 57.6 | 61.3 | 54.5 |
      | SportsDataIO @ peak weights | 62.79% | 70.6 | 63.0 | 61.3 | 57.4 |
      | **SportsDataIO @ shipped (conservative)** | **61.80%** | 67.7 | 61.6 | 61.3 | 57.4 |

      **At FantasyPros' own weights SportsDataIO looks WORSE** — those
      weights were swept against FantasyPros' r2pPts distribution (items
      70/145) and are simply the wrong optimum for a different source. Any
      "just repoint it" swap would have measured a regression and concluded
      the wrong thing.
    - **Shipped the conservative weights, not the peaks** (`QB 0.8 / RB 0.9 /
      WR 0.5 / TE 0.9`). The measured optima were RB 1.0 and QB 0.9, and RB
      1.0 sits on the BOUNDARY — it would mean the engine contributes nothing
      to an RB's score, the exact shape item 20 rejected, and a red flag
      about RB rather than a result to bank. QB's 0.9 is a spike flanked by
      lower values. The conservative set still beats FantasyPros (61.80% vs
      60.66%) and wins or ties at every position, so the gain is not purely
      peak-chasing. **User chose this over the peaks**, same
      put-it-to-the-user precedent as items 30/33/41/44/53/70.
    - **A real cross-check that the retune isn't overfitting**: the pooled
      2022-2025 nflverse-only pipeline still runs on FantasyPros (below), and
      under the NEW weights it reads 58.68% vs 58.64% before — essentially
      unchanged, with every season healthy. The retuned weights therefore
      hold up on a DIFFERENT consensus source across four seasons, which is
      more than the single-season swap evidence on its own could show.
    - **Deliberately a HYBRID across the two pipelines, not a clean swap.**
      SportsDataIO's projections `401` for 2022/2023/2024 (verified), so the
      nflverse-only multi-season pipeline still reads FantasyPros — it is the
      only consensus source with history, and that pipeline's entire job is
      the cross-season check. Each pipeline uses the only source it can
      actually get for its seasons. The primary pipeline (which validates
      what the live tools do) uses SportsDataIO, matching live.
    - **Two operational wins beyond accuracy**: coverage is 1224/1224 pool
      player-weeks vs FantasyPros' 1203 — keyed by the same PlayerID as
      everything else, so there is NO name join and no missing players — and
      it replaces a community scrape of a third party with a product the
      project licenses, which is the whole of Open Item #33's FantasyPros
      exposure.
    - **Code**: new `sportsdata/projections.ts` (season-routed like every
      other reader — legacy host for <=2025, the v3 `projectionsV3` package
      for 2026+) and `sportsdata/liveProjections.ts`
      (`getLiveProjectedPointsByPlayerId`, offseason-aware exactly the way
      item 103's FantasyPros path was: the upcoming week's projection
      in-season, the coming season's projection divided by projected games
      between seasons, since there is no upcoming week then). `loadRun.ts`
      builds the consensus map from projections instead of the scrape. The
      live threading changed from a NAME-keyed map to a PlayerID-keyed one
      across `buildInput.ts`/`scoreExtended.ts`/`buildWaiverReport.ts`/
      `suggestDrop.ts`/`suggestLeagueTrade.ts`/`buildRankings.ts` and all six
      live routes. `fantasypros/liveConsensus.ts` is now unused and carries a
      header saying so — kept, not deleted, as the revert path.
    - **User-facing copy updated**: the reasoning note said "FantasyPros'
      weekly consensus projects roughly X points" and now reads "The
      consensus projection has them at roughly X points". The Backtest
      page's projection-accuracy mode still names FantasyPros deliberately —
      that is a separate comparison series, still sourced from FantasyPros.
    - **Verified end to end**: real backtest 61.80% (matching the
      diagnostic's prediction exactly, QB 67.65 / RB 61.58 / WR 61.27 / TE
      57.43), pooled 58.68%, all six live routes 200 with real consensus
      values flowing (McCaffrey 19.5, Kamara 6.6 via the offseason path), all
      eight pages 200, `tsc`/lint clean. All three diagnostic routes deleted
      after recording, same precedent as every other one-off in this file.

162. **Blended SportsDataIO's season-long projection into rest-of-season
    trade valuation — a bigger measured gain than the consensus swap, and
    the opposite of the going-in expectation.** The Trade Assistant valued
    players by EXTRAPOLATION (item 47): take a player's one-week score,
    strip its matchup modifier, re-apply a fresh one per remaining opponent,
    sum. SportsDataIO's season projections are a directly rest-of-season-
    shaped number the app already fetches, so the obvious question was
    whether they beat that.
    - **Leakage checked FIRST**, because a season projection fetched months
      later could easily have been updated with actuals. It has not been:
      MAE 29.5 points against real 2025 season totals, with the top
      performers badly UNDER-projected (McCaffrey projected 289.9, scored
      416.6; Jonathan Taylor 261.2 vs 362.3). That is the classic PRESEASON
      signature — a static projection never revised. A contaminated feed
      would look far more accurate than that.
    - **Result, 430 synthetic 1-for-1 trades across cutoff weeks 1-12 of
      2025, graded against real rest-of-season totals:**

      | method | accuracy |
      |---|---|
      | engine extrapolation (was shipped) | 58.33% |
      | season projection alone | **64.88%** |
      | 50/50 blend | **64.88%** |

      +6.55pp, winning at 8 of 12 cutoffs, and winning BIGGEST late
      (week 12: 63.9% vs 41.7%).
    - **Why extrapolation loses — the mechanism, not just the number**: it
      multiplies a single week's score, which is heavily recent-form driven,
      across ten remaining games, so hot and cold streaks get extrapolated
      wholesale. Rest-of-season value regresses toward true talent, which a
      season-long projection captures better than a four-game sample. That
      the gap WIDENS at late cutoffs fits exactly — that's where a streak has
      had the most opportunity to distort the extrapolation.
    - **Shipped the 50/50 blend, not the projection alone**, even though they
      tie on accuracy. Checked the blend isn't degenerate before trusting the
      tie: the two methods disagree on 28.6% of trades (123 of 430) and sit
      on comparable scales (mean 157.2 vs 138.2), so it isn't just following
      one source. Chosen for robustness — it keeps the engine's recent-form
      and matchup signal in the valuation and falls back cleanly for a player
      the projection feed doesn't cover (`blendRestOfSeason` returns whichever
      side exists). `REST_OF_SEASON_PROJECTION_BLEND = 0.5` in `config.ts`.
    - **Wired into both live and backtest** so they can't drift: live via
      `sportsdata/seasonProjectionMap.ts` through `/api/trade`, `/api/waivers`
      (drop suggestions) and `/api/trade-suggestion`, keyed to the SAME season
      the remaining schedule resolved to; backtest via a new
      `BacktestRunData.seasonProjections` read by `projectFromHistory`, so the
      trade backtest measures what the live tool does.
    - **TWO FINDINGS surfaced while verifying, neither caused by this change:**
      - **The trade backtest does not include the expert-consensus term.**
        `collectTradeResultsForSeason` calls `sliceWeekData` with only 7
        arguments, so consensus is null there — meaning the trade backtest
        scores on a materially different engine than the live tool, which
        leans on consensus heavily (QB 0.8). This is why the shipped
        single-cutoff numbers came in ABOVE the diagnostic's (week 4: 80.56%
        vs 77.78%; week 12: 63.89% vs 58.33%) — the diagnostic passed the
        full slice. A real pre-existing gap; deliberately not fixed here so
        two changes don't get conflated. See Open Item #38.
      - **Item 49's documented 55.2% pooled trade accuracy is stale.** The
        nflverse multi-season trade backtest now reads 53.01%. Verified via
        `git stash` that this is byte-identical before and after this change
        (916/1728 both ways), so it is accumulated drift from later engine
        tuning, not a regression here. The blend is a true no-op on that
        pipeline by design — SportsDataIO projections 401 for 2022-2024, so
        `seasonProjections` is absent and `blendRestOfSeason` returns the
        pure extrapolation.
    - **Single-season evidence again** — projections 401 for 2022-2024, so
      this cannot be cross-validated either. Folded into Open Item #37.
    - **Verified**: live trade returns sensible blended values (McCaffrey ROS
      337.6 over 17 games, 19.9/gm against a 19.8 weekly score), single-cutoff
      backtests reproduce the diagnostic's per-cutoff pattern, nflverse
      multiseason byte-identical, all eight pages and every live route 200,
      `tsc`/lint clean. Diagnostic route deleted after recording.

163. **Fixed the trade backtests to grade the engine that actually ships —
    they were scoring without the expert-consensus term entirely. A
    correctness fix, and the largest single jump in a trade number this
    document records.** Found while verifying item 162 and logged as Open
    Item #38; picked up immediately after.
    - **The bug**: `collectTradeResultsForSeason` (`tradeBacktest.ts`) and its
      counterpart in `multiPlayerTradeBacktest.ts` both called `sliceWeekData`
      with SEVEN arguments, stopping at `depthChartByPlayerIdWeek`. That
      silently dropped four: `format`, `allDefenseWeeklyRows`,
      `impliedTotalsByTeamWeek` and — the one that matters —
      `expertConsensusByPlayerIdWeek`. So every trade backtest ever recorded
      graded an engine with NO consensus signal, while `/api/trade` has run
      with it since item 70, and leans on it heavily since item 145 (QB 0.8).
      The dropped `format` is a second, smaller bug in the same call: item
      137 made the trade backtest format-aware, but this slice defaulted to
      PPR, so a Half-PPR or Standard run was pairing and building its
      position-defense table in PPR regardless.
    - **Confirmed as the cause, not a guess**: item 162's diagnostic passed
      the full slice and predicted week-4 77.78% / week-12 58.33% where the
      shipped path reported 80.56% / 63.89%. After this fix the shipped path
      returns exactly 77.78% and 58.33% — the diagnostic and production now
      agree to the decimal.
    - **Before / after** (PPR):

      | measure | before | after |
      |---|---|---|
      | nflverse multiseason 1-for-1 (pooled) | 53.01% | **61.40%** |
      | multi-player 2-for-2 (the clean skill measure) | 54.35% | **60.02%** |
      | multi-player 2-for-1 | 81.29% | 82.09% |
      | multi-player pooled overall | 64.19% | 68.09% |
      | primary single cutoff wk4 / wk8 / wk12 | 80.56 / 72.22 / 63.89 | 77.78 / 77.78 / 58.33 |

      The pooled 1-for-1 gain (+8.39pp) is also much more CONSISTENT by
      season — 62.5 / 60.2 / 60.2 / 62.7 for 2022-2025, against a previous
      spread of 50.7 / 52.8 / 49.5 / 59.0. Single cutoffs move both ways,
      which is expected at n=36 each.
    - **These supersede every previously documented trade-backtest figure**,
      including item 49's 55.2% pooled (already stale at 53.01% from
      accumulated tuning — see item 162) and item 138's 2-for-2 54.3%/55.5%.
      The 2-for-1 naive "more players" baseline is unchanged at 17.71%, as
      expected: it doesn't depend on scoring at all.
    - **Not a tuning change** — no weight moved, and the broad backtest is
      byte-identical at 61.80% (it always passed the full slice). This only
      changes what the trade backtests MEASURE, bringing them in line with
      the live tool.
    - **Resolves Open Item #38.**

164. **Fixed a mislabel item 161 introduced: the Projection-accuracy mode's
    third series said "FantasyPros" while actually showing SportsDataIO's
    projections — and, more importantly, it stopped being an independent
    benchmark.** Found by auditing every `sliceWeekData` call after item 163,
    while checking whether the projection backtest had the trade backtests'
    missing-consensus bug.
    - **It did NOT have that bug** — `runProjectionBacktest.ts` and
      `playerProjectionLookup.ts` both already passed all 11 arguments
      (items 71/72 got that right). The audit confirmed the two trade
      backtests were the only offenders, and item 163 fixed both.
    - **But the audit found a different problem.** That third series reads
      `weekSlice.expertConsensusByPlayerIdWeek`, which item 161 repointed
      from the FantasyPros scrape to SportsDataIO's projections. The UI kept
      calling it FantasyPros in five places (summary caption, two column
      headers, the closer-week counter, the route's own explanatory note).
      Relabelled to "consensus" throughout, and the `fantasyProsProjection`/
      `fantasyProsDiff` fields renamed to `consensusProjection`/
      `consensusDiff`. (`buildRankings.ts`'s `fantasyProsPositionRank` is
      genuinely FantasyPros — it reads the redraft file directly — and was
      left alone.)
    - **The subtler half, which the label change alone wouldn't have
      surfaced**: this series used to answer "how does the engine compare to
      an INDEPENDENT external estimate" (item 71's whole purpose). Now that
      the same projection is the engine's own largest input, it answers a
      different question — what the engine's OTHER signals add on top of the
      consensus it ingests. Still useful, but not a benchmark, and the
      route's note now says so explicitly rather than letting it read as
      independent.
    - **Corrected numbers** (2025, PPR, n=1224 — these supersede item 71's):

      | | MAE | RMSE | bias | n |
      |---|---|---|---|---|
      | engine | 6.26 | 7.98 | +0.25 | 1224 |
      | naive season-avg | 6.85 | 8.63 | +1.90 | 1224 |
      | consensus (SportsDataIO) | 6.19 | 7.85 | +0.63 | 1224 |

      Two things worth reading off this. The engine's own calibration
      IMPROVED from the item-161 swap (MAE 6.35 -> 6.26, bias +0.31 ->
      +0.25). And the same relationship item 71 found with FantasyPros still
      holds with the new source: the consensus alone has marginally better
      MAE, while the engine has clearly better bias — the blend keeps the
      source's accuracy while correcting some of its optimism. Coverage is
      now the full 1224 rather than 1203, since SportsDataIO covers every
      pool player.
    - No scoring change; labels, field names and one measurement series only.

165. **Shipped the real pennant logo — replacing the inline-SVG
    approximation from item 128 — plus a matching vector favicon.
    Presentation only, no engine change.** The user designed a proper mark
    (a felt pennant: cream field, blue helmet with a blackletter "LF",
    "Legit Football" script) and it went through three source formats before
    landing.
    - **The `.ai` file could be used without any design tooling installed.**
      No Illustrator CLI, no poppler, no ImageMagick on this machine — but
      an `.ai` is PDF-internally (`%PDF-1.6`), and macOS's built-in `sips`
      renders it AND preserves transparency, where Quick Look flattens onto
      white. Worth remembering: `sips -s format png --resampleWidth N
      file.ai` is a complete vector-to-transparent-raster path with zero
      dependencies.
    - **One real trap**: macOS's PDF renderer IGNORES a crop box's ORIGIN.
      Shrinking MediaBox/CropBox to the artwork's bounds produced a
      correctly-SIZED but EMPTY image, because content is drawn relative to
      the box's lower-left as if it were (0,0). Cropping had to be done on
      the raster instead. (`ArtBox` in the file gives the exact artwork
      bounds, which is how the crop rect was known at all.)
    - **The SVG export needed its viewBox tightened.** Illustrator centres
      the mark in a much larger, near-square artboard (291x230 for a 2.6:1
      pennant), so the raw export renders small and floating. Measured the
      real bounds with `getBBox()` in the browser (x 9.1, y 85.71, 282.26 x
      108.51) and set the viewBox to exactly that. Nothing else about the
      file changed; the untouched export is kept in `design/`.
    - **Raster stage worth recording even though it was replaced**: before
      the SVG arrived, the PNG looked soft, and the cause was NOT what it
      first appeared. The browser pane reports `naturalWidth` already
      divided by devicePixelRatio, which made a correctly-sized file look
      half-resolution — a false diagnosis corrected by fetching the served
      bytes with `curl`. The real causes were (1) a fixed-size `next/image`
      only puts 1x and 2x of the `width` prop in its srcset, so there is no
      zoom headroom, and (2) **Next 16 only serves qualities listed in
      `images.qualities`, which defaults to `[75]` alone** — a `quality={90}`
      request 400s and silently falls back. Both moot now that it's vector
      (`unoptimized`, since there is nothing to resize or re-encode and Next
      declines to process SVG without `dangerouslyAllowSVG`), and
      `next.config.ts` is back to defaults.
    - **Favicon is the helmet, lifted from the same vector** — elements
      30-39 of the pennant SVG on a cream rounded square, fills inlined
      rather than carrying over the export's generic `.cls-N` classes so it
      can be inlined anywhere without colliding. `src/app/icon.png` is kept
      alongside as a fallback; Next emits both, the SVG with `sizes="any"`,
      so SVG-capable browsers take it and Safari takes the PNG.
    - **Honest limit, tested rather than assumed**: rasterising both at
      16/32/48px showed vector does NOT rescue 16px — the blackletter LF
      averages into a smear at that size from any source. It wins at 32px
      and up (retina tabs, bookmarks, OS shortcuts) and on file size (3KB
      vs 37KB). A genuinely legible 16px icon needs a SIMPLIFIED mark, not
      a sharper one.
    - **Sidebar tagline renamed** "Fantasy Toolkit" -> "LEGITFOOTBALL
      PREMIUM" (already gold, via `--premium`). Note the Home page `<h1>`
      still reads "FANTASY TOOLKIT" — deliberately, the rename was scoped
      to the sidebar.
    - Files: `src/components/BrandPennant.tsx` (renders
      `public/legitfootball-pennant.svg` via `next/image` `unoptimized`),
      `src/app/icon.svg` + `icon.png`, `design/legitlogo2.ai` and
      `design/legitlogo2.svg` (sources, deliberately OUT of `public/`,
      which is served publicly and ships in every deploy). `LogoTile` and
      the old `icon.svg` mark are gone. Commits `f08d6e0`, `9a96c29`,
      `4e24bcd`, `fd998d8`, `aad2b26`.

166. **Swept every stale "the consensus means FantasyPros" assumption left
    by item 161 — one user-visible, six internal, and two that were already
    wrong before this session.** Prompted by item 164 being the SECOND
    downstream mislabel found after the source swap; rather than wait for a
    third, grepped every consensus reference in `src/`.
    - **User-visible**: the Backtest page's baseline table labelled the
      `expertConsensus` row "Higher FantasyPros weekly expert consensus rank
      (dynastyprocess/data)". On the primary pipeline that row is now
      SportsDataIO. Since the source genuinely differs BY PIPELINE, the
      label now names both rather than pretending to one.
    - **Stale internal docs corrected**:
      `PlayerComparisonInput.expertConsensusR2pPts`,
      `BacktestRunData.expertConsensusByPlayerIdWeek`,
      `BacktestWeekSlice`'s copy, `buildInput`'s live-lookup comment,
      `liveAggregates`' "stays live" note, and two `config.ts` lines.
    - **Two predate this session, which is the more useful finding.** Both
      `baselines.ts`'s `pickByExpertConsensus` doc and `weekData.ts` claimed
      the consensus map is "only ever populated by the nflverse-only
      pipeline" and "no_pick on the primary SportsDataIO pipeline" —
      untrue since **item 70** wired it into `loadRun.ts`. Anyone reading
      `weekData.ts` would have concluded the primary pipeline had no
      consensus at all.
    - **Deliberately left as genuinely FantasyPros**: `lib/fantasypros/*`,
      Legit Rankings' redraft blend and `fantasyProsPositionRank` (it reads
      the redraft file directly), `loadRunNflverseOnly` (the only source
      with 2022-2024 history), and `nflverse/schedules.ts`'s week-start
      helper, which exists to date FantasyPros commits.
    - **Naming decision**: `expertConsensusR2pPts` was NOT renamed across
      the engine. It now documents as "the external consensus estimate"
      rather than any one vendor — a rename would touch a dozen files and
      every historical doc reference for no functional gain. If it reads as
      leftover FantasyPros branding later, the doc comment is the
      disambiguator.
    - Docs and one label only; broad backtest byte-identical at 61.80%.
      Commit `7092476`.

167. **Recolored the pennant to the navy + volt colorway — the logo now
    uses the app's own accent. Presentation only; no engine change.** The
    mark shipped by item 165 was cream field / royal `#2b3990` helmet and
    script, with a white LF — no relationship to the Nash/volt palette
    (item 141). Picked from a seven-colorway sheet the user provided; the
    chosen option was the only one using BOTH brand colors, and the only
    light-field one that also carries green (a dark-field pennant would
    half-disappear against the constant-dark sidebar).
    - **Did NOT extract the chosen pennant from the sheet** — it is 245
      paths with no ids, and carving one out of seven is fiddly and
      lossy. It is the same artwork as the shipped mark, only recolored,
      so the shipped SVG (already tightened to the artwork's real bounds,
      item 165) was recolored in place instead. Confirmed the mapping by
      bucketing the sheet's paths by starting coordinate into the chosen
      pennant's quadrant and tallying classes — the class ROLES line up
      one-for-one with the shipped file's (20 field/counter paths vs 24,
      7 navy, 2 lettermark, 2 dark outline).
    - **Final fills**: field + script counters `#eadec4` -> pewter
      `#e0dedc`; helmet + script `#2b3990` -> deep navy `#1f2353`;
      LF lettermark `#fff` -> volt `#c8ff00`. Facemask gray and the dark
      outlines are unchanged.
    - **The one real gotcha, worth remembering before any future
      recolor**: the wooden pole and the pennant FIELD shared class
      `cls-5` in the shipped file, but they are different colors in this
      colorway (pole stays cream, field goes pewter). A blanket
      `cls-5` swap turns the pole pewter while its neighbouring
      cross-sticks (`cls-7`/`cls-8`/`cls-9`, separate cream classes) stay
      cream, which looks broken. A new `.cls-pole` class now holds the
      three pole elements — the pole body path, one cross-stick polygon,
      and the shaft rect.
    - **Volt came from `--accent`, not from the source art.** The user
      said the sheet had been updated to volt; the SVG on disk was
      unchanged (same mtime, still `#8dc63f`), and the two newer `.ai`
      files could not be rendered (`sips` errors — likely saved without
      "Create PDF Compatible File", unlike the item-165 source). So the
      value was applied directly from the token rather than sampled,
      which is arguably better: the logo and the UI accent are now
      guaranteed identical rather than merely close.
    - **Favicon followed the same treatment** (`src/app/icon.svg` — the
      helmet lifted from the pennant): navy helmet, volt LF, and its
      rounded-square tile moved cream -> pewter to match the new field.
      `icon.png` regenerated from it for the Safari fallback.
    - **Verified live in the running app**, not just as a standalone
      render: the desktop sidebar rail and the mobile top bar both render
      correctly, and in the rail the volt LF now reads as the same colour
      as the active-nav highlight and the scoring chip — the tie-in that
      did not exist before.

168. **Restored the replacement-level (value-over-replacement) normalization
    for uneven trades — reversing item 152's iteration 3, on a concrete
    failing case the user hit.** Reported: giving D'Andre Swift + DK Metcalf
    for Jahmyr Gibbs graded as not-a-win when an elite RB for two mids is
    plainly the good side.
    - **Reproduced before changing anything, and the engine was NOT at
      fault.** The per-game valuations are right: Gibbs 21.8/gm, Swift 12.6,
      Metcalf 11.1 (Gibbs' season average 21.6 vs Swift's 14.3, and his
      consensus projection 21.8 — the elite gap is fully present). The
      failure was entirely in how the SIDES were compared: raw rest-of-season
      sums, 401.7 vs 369.8, giving "fair" with a caveat note. Raw totals
      accumulate with headcount, so two startable players out-total one elite
      no matter how big the talent gap, because nothing accounts for the fact
      that you can only start so many each week.
    - **The fix is item 138's model, restored.** Credit the shorter side one
      replacement-level filler per freed roster spot (`REPLACEMENT_PER_GAME`,
      the empirically-derived startable-pool cutoff value), priced at the
      extra players' own positions and remaining games. Extras are the
      LOWEST-value players on the longer side. Even-count trades get zero
      filler, so 1-for-1 and 2-for-2 are byte-identical.
    - **Why this is not the arbitrary "stud premium" item 152 rejected.**
      Crediting the short side a replacement filler is algebraically identical
      to comparing the two sides' points ABOVE replacement — the standard way
      fantasy value is measured, and the same VOR the Top 100 already uses
      (item 140). Item 152 iteration 2's `EXTRA_PLAYER_VALUE_RATIO = 0.4` WAS
      a tuned judgment call and deserved rejecting; iteration 3 then threw out
      the empirically-grounded VOR credit along with it. That was too
      conservative, and this report is the evidence.
    - **It also re-couples live with the backtest.** `multiPlayerTradeBacktest.ts`
      never stopped applying the filler (item 152 deliberately decoupled the
      two), so since then the live tool graded uneven trades a different way
      than the backtest validated. They now measure the same thing again.
      The backtest itself is provably untouched by this item — it does not
      import `evaluateTrade` at all (only mentions it in a comment).
    - **Three UI inconsistencies this surfaced and fixed**, all from
      `netValue` no longer equalling `getTotal - giveTotal`: the balance meter
      drew the longer side's bar longer while the verdict said it lost; the
      gold "Higher value" tag sat next to a visibly smaller number; and the
      summary strip showed give/get/net that didn't reconcile. Now
      `TradeEvaluation` also exposes `adjustedGiveTotal`/`adjustedGetTotal`
      (equal to the raw totals on even trades) — the meter uses those with a
      "+ N open spot" sub-label, the strip gains a "Spot you free"/"Spot you
      fill" cell so every number adds up, and the tag reads "Better side".
      The per-player cards and each column's header total stay RAW, so they
      still sum to what is displayed above them.
    - **Verified live end to end**: the reported trade now grades "good"
      (+175.9, freed spot credited ~208); the mirror is exactly symmetric at
      −175.9; 1-for-1 and 2-for-2 have `netValue` exactly equal to
      `getTotal - giveTotal` with no note; 3-for-1 correctly credits two
      spots; and the credit is scoring-format aware (Standard's WR filler is
      138.2 against PPR's 207.7, matching `REPLACEMENT_PER_GAME`). Waiver
      drop suggestions and the Home trade widget are unaffected — both are
      always 1-for-1. `tsc`/lint clean.
    - **Honest limitation, unchanged from item 138**: the credit assumes the
      freed spot is genuinely refillable at replacement level, which is right
      for a normal roster but overstates the gain for someone whose bench is
      already all waiver-tier. The tool does not know the user's full roster
      in the general case, and every mainstream trade calculator makes the
      same assumption.

169. **Audited the Waiver Wire's D/ST-K gating (working) and its "top
    target" selection (three real defects, all fixed).** Prompted by a user
    asking whether the streaming-position gate had regressed and whether the
    top-target logic makes sense. First half was a false alarm; the second
    half was not.
    - **The D/ST-K gate works — verified against the user's own connected
      league, not just by reading the code.** Their league rosters
      `QB/RB/RB/WR/WR/WR/TE/FLEX/FLEX/FLEX` and no DEF or K slot, and the
      page correctly renders only QB/RB/WR/TE tabs. `streamingPositionFlags`
      is threaded through both the Waivers page and the Home widget.
      **The one real gap, deliberately left alone**: it defaults BOTH on when
      slots are unknown — no Sleeper connection, or a connection saved before
      `rosterPositions` was captured — so a manual-roster user in a no-kicker
      league has no way to turn them off. `DEFAULT_SLOTS` does include K and
      DST, so showing them is defensible as a default, and the Lineup page's
      manual slot editor is component-local `useState` (not persisted, not
      shared), so Waivers can't read it today. Closing that properly means
      promoting slot config to a shared persistent store — see Open Items.
    - **`waiverValue` was computed from volume alone, and it was surfacing
      below-replacement players.** It read
      `recentVolumeAvg × POINTS_PER_VOLUME_UNIT − REPLACEMENT_PER_GAME` — the
      VOR framing was right, but the projection feeding it ignored every other
      signal the engine has (expert consensus, matchup, efficiency, form), and
      contradicted the engine's own tuning: PPR RBs carry
      `VOLUME_BLEND_WEIGHT = 0` precisely because volume adds nothing there
      beyond form and consensus (item 144). Measured on real data rather than
      argued: the old formula's #2 and #3 cross-position targets were Tyrone
      Tracy Jr. (finalScore 7.1) and Aaron Jones Sr. (9.5), both of which the
      app's OWN projection puts below replacement, while Omarion Hampton
      (14.8, the best real projection in the pool) sat 6th. Now
      `finalScore − REPLACEMENT_PER_GAME` — the same VOR basis the Top 100
      (item 140) and the trade tool (item 168) use, and free, since these
      candidates already have a real breakdown computed for the drop
      suggestion.
    - **Scope note that matters**: this changes the SPOTLIGHT only. The
      per-position lists stay ranked by recent volume, which is what the
      waiver backtest actually validated (item 142 — volume beat gap/residual
      and random by 2-3 PPG of real forward production). That backtest never
      tested a finalScore-based ranker, because `scoreWaiverPool` is
      deliberately a cheap bulk pass that doesn't run the engine per player;
      the spotlight is chosen from ~40 already-scored candidates, so it can
      afford the better number and the list can't. Whether the list would
      also do better on finalScore is untested and would be expensive to
      test — flagged, not assumed.
    - **The spotlight was recommending a player who literally can't play.**
      With the user's real exclusions applied, the top target was Ricky
      Pearsall, listed **Out** — he ranked first because `scorePlayer` doesn't
      penalize an Out player's projection at all (the engine handles injuries
      by EXCLUSION in `compareBreakdowns`, not in the score), so his was
      simply the least-bad number in a thin pool. `pickTopTarget` now makes
      two passes, healthy first, falling back to a sidelined player only if
      the pool has nothing else — the same "prefer available, but still fill
      the slot if that's all there is" rule `compareBreakdowns` already uses.
      Sidelined players still appear in the lists, tagged, since they can be a
      legitimate stash.
    - **The honest-framing problem the fix exposed.** In their 12-team league
      every single free agent projects BELOW replacement — which is true and
      unsurprising once 200+ players are rostered, but the old volume-implied
      number produced comfortable-looking positives that hid it, and the panel
      still says "TOP TARGET THIS WEEK" either way. The spotlight now carries
      a caveat when its own pick is below replacement ("Thin week — this is
      the best available, but it still projects below a startable RB in your
      format. Worth it for depth or an injury cover, not as a lineup
      upgrade."), matching this project's standing "don't force false
      confidence" rule.
    - **Verified live end to end** on the user's real roster and league: the
      spotlight moved from Pearsall (Out) to Ty Johnson (healthy RB) with the
      thin-week caveat rendering; the roster-need penalty is visibly doing its
      job (their QB/WR/TE surpluses are docked, RB — where they're at need —
      is not); D/ST and K stay absent. `tsc`/lint clean.

170. **"Is Ty Johnson really the best pickup? He's a backup RB" — no, and
    tracing it found two more defects in the top-target selection.** A direct
    follow-up to item 169, and a good example of why a plausible-looking
    recommendation is worth challenging.
    - **He was 12th-best by actual value and won on a technicality.** Pure
      VOR across the healthy pool: Aaron Rodgers -3.85, Jacoby Brissett
      -4.03, Colby Parkinson -4.16, ... Ty Johnson **-6.52**, the lowest
      `finalScore` (5.6) of anyone near the top. He surfaced because the
      roster-need penalty put RB at zero and docked every other position 3
      points.
    - **Defect 1 — `starterNeedByPosition` double-counted flex.** It added
      each flex slot's FULL count to both RB and WR (and left TE out of FLEX
      entirely, though Sleeper's FLEX takes RB/WR/TE). For the user's
      10-starter league it computed a "need" of 13 skill starters — QB 1,
      RB 5, WR 6, TE 1 — so a roster with 5 RBs showed NO surplus at RB, and
      RB became the only unpenalised position. Now each flex slot is split
      evenly across the positions it accepts, via the existing
      `SLOT_ELIGIBILITY` map. The needs now sum to exactly the real number of
      starting slots (10), which is the invariant that should have caught
      this: one flex spot can only ever hold one player.
    - **Defect 2 — roster need was a primary term, so it decided the
      answer.** `SURPLUS_PENALTY_PER_PLAYER = 3` is large next to the value
      spread across a thin waiver pool (the whole healthy top eight spanned
      2.7 points here), so subtracting it outright meant the least-penalised
      position won regardless of how much worse its best player was. It's now
      a TIEBREAK: take every candidate within `TOP_TARGET_VALUE_BAND` (2
      points) of the best available value, then prefer the position the roster
      actually needs, breaking further ties on value. The pick is therefore
      always close to the best value on the board, while still steering away
      from a position the user is stacked at.
    - **Result on the user's real roster and league**: top target moved from
      Ty Johnson (RB, value -6.52, projection 5.6) to **Colby Parkinson**
      (TE, value -4.16, within 0.3 of the best on the board, at a position
      they have no surplus at). The two best raw values are backup QBs, and
      they're correctly passed over — the user already rosters two QBs in a
      one-QB league, so a third is worthless to them. That is exactly the job
      the need penalty should be doing, and now it does it without overriding
      value.
    - **The honest headline finding stands**: every free agent in this league
      projects below replacement, so the right answer really is "there is no
      good pickup this week," which item 169's thin-week caveat now says
      plainly on the spotlight.
    - Verified live end to end on the real connected league; `tsc`/lint clean.

171. **Backtested whether the Waiver Wire's per-position LISTS should rank by
    the engine's projection rather than recent volume — they should, clearly,
    and it shipped.** Item 169 changed the cross-position spotlight to a
    projection basis but deliberately left the lists on volume, because that
    was the ordering item 142 actually validated and testing the alternative
    looked expensive. This ran that test.
    - **Why it had never been tested**: `scoreWaiverPool` is a deliberately
      cheap bulk pass that does NOT run the engine, so item 142's harness
      could only compare strategies computable from the pool rows (volume,
      points, gap, residual, random). Grading a projection-based ranking means
      running `buildBacktestComparisonInput` + `scorePlayer` over the whole
      eligible pool, per cutoff, per season — which needs the full
      `loadNflverseOnlyRunData` slice, not just the game log.
    - **Harness verified before any new number was trusted**, per the standing
      rule from items 43/44/74: the rebuilt harness reproduces item 142's
      published figures for every pre-existing strategy on the waiver-tier
      pool — volumeOnly 11.99, pointsOnly 11.98, residual 10.18, blindPool
      8.87, gap 9.01 (item 142 recorded 9.00). Since the old numbers come back
      identical, the new one is measuring the same thing.
    - **Result — pooled 2022-2025, cutoffs 5-13, mean forward PPG over the
      next 4 weeks, on the realistic waiver-tier pool** (startable/rostered
      tier excluded):

      | strategy | PPG | QB | RB | WR | TE | 2022 | 2023 | 2024 | 2025 |
      |---|---|---|---|---|---|---|---|---|---|
      | finalScore (shortlist) | **12.82** | 15.7 | 12.1 | 13.6 | 9.9 | 12.2 | 12.9 | 13.7 | 12.6 |
      | finalScore (full pool) | 12.81 | 15.7 | 12.1 | 13.6 | 9.9 | 12.1 | 12.9 | 13.7 | 12.6 |
      | volumeOnly (was shipped) | 11.99 | 14.0 | 11.3 | 13.2 | 9.6 | 11.5 | 12.0 | 12.8 | 11.7 |
      | pointsOnly | 11.98 | 14.8 | 10.8 | 13.0 | 9.4 | 11.1 | 12.3 | 12.9 | 11.7 |
      | residual | 10.18 | 13.5 | 9.9 | 10.0 | 7.6 | 10.3 | 10.4 | 10.3 | 9.8 |
      | gap | 9.01 | 13.7 | 8.2 | 8.2 | 6.2 | 9.1 | 8.7 | 9.4 | 8.8 |
      | blindPool (random) | 8.87 | 14.1 | 8.4 | 8.8 | 6.8 | 8.7 | 9.0 | 9.1 | 8.6 |

      **+0.83 PPG over volume, and the cleanest shape this document asks
      for**: better at every position AND in every season, no tradeoff to put
      to the user. Same story on the unrestricted pool (16.85 vs 15.43).
    - **A volume shortlist gives up nothing, which is what made it shippable.**
      Scoring the entire eligible pool is impractical live (hundreds of engine
      calls per request), so the two-stage version was measured rather than
      assumed: narrowing to the top 25 per position by volume and then
      re-ranking by projection scores **12.82** against the full pool's 12.81
      — identical within noise. A tighter top-15 shortlist scores 12.74, a
      real if small loss, so 25 is the shipped `SHORTLIST_PER_POSITION`.
      In live terms that is 100 engine calls per request instead of 40 — a
      real cost, but the same order of magnitude, and a warm request measured
      ~7.6s end to end.
    - **Shipped**: `rankWaiverCandidates` now returns
      `SHORTLIST_PER_POSITION` (25) per position instead of 10, and
      `buildWaiverCandidateDetails` — which already computes a real breakdown
      for every candidate it's handed — sorts by `finalScore` and cuts to 10.
      Each candidate's reasoning now leads with the projection it's ordered
      by, keeping the volume line as support. The landing copy moved off
      "ranked by opportunity" to describe what the tool now actually does.
    - **The permanent harness now grades what ships**, rather than only the
      strategies that predate it: `finalScoreShortlist` (the live behaviour)
      and `finalScore` (the full-pool ceiling it's measured against) are both
      permanent entries in `WAIVER_STRATEGY_IDS`. This is the item-163 lesson
      applied preemptively — a backtest that measures something the live tool
      no longer does is worse than no backtest.
    - **Note on why volume still looked good in item 142**: it beats gap,
      residual and random by 2-3 PPG, and that finding stands. It just isn't
      the best available ranking once the full engine is on the table — which
      item 142 couldn't see, because the engine was too expensive to run over
      the pool at the time. The buy-low framing is unaffected: it remains a
      per-candidate tag, not a sort key.
    - Verified live end to end on the user's real connected league; the lists
      now pull in genuinely better projections from deeper volume ranks (e.g.
      an RB ranked 16th by volume surfacing above one ranked 3rd).
      `tsc`/lint clean.

172. **Promoted the starting-lineup slot config from Lineup-page state to a
    shared, persisted setting — closing the gap item 169 flagged, where a
    manual-roster user had no way to stop Waivers recommending kickers and
    defenses.** The gate itself always worked; it just had nothing to read.
    - **The problem was ownership, not logic.** `streamingPositionFlags`
      defaults BOTH streaming positions on when slots are unknown, and slots
      were only ever known from a connected Sleeper league — the manual
      alternative was `useState` inside `LineupTool`, invisible to every other
      page. So a manual-roster user in a no-kicker league got kickers
      recommended forever, with a working editor sitting one page away that
      couldn't affect it.
    - **New `lib/useRosterSlots.ts`**, on the same `createPersistentStore`
      pattern as the roster, scoring format and Sleeper connection (item 88).
      The store holds `Record<SlotType, number> | null`, and **`null` meaning
      "never set" is load-bearing, not laziness**: it's what lets a connected
      league's real slots seed the answer for someone who has never opened the
      editor, while still letting an explicit edit win afterwards.
      `useEffectiveRosterSlots()` resolves the precedence — explicit edit,
      then connected league, then `DEFAULT_SLOTS` — and is now the single
      definition of "what does this user's lineup look like."
    - **Replaced five separate answers to that question.**
      `HomeLineupWidget`, `HomeTradeWidget` and `LineupTool` each had their own
      inline "parse the league, else fall back" block; `WaiverTool` and
      `HomeWaiverWidget` had none and passed raw `rosterPositions` around. All
      five now call the one hook. `computeRosterNeedPenalty` and the new
      `streamingPositionFlagsFromSlots` take resolved slots rather than raw
      Sleeper strings, since every caller now has them.
    - **One real trap, hit and fixed during the work**: the hook's return value
      goes into effect and memo dependency arrays, and
      `parseSleeperRosterPositions` builds a fresh object on every call — an
      unstable reference would have made `HomeWaiverWidget` refetch in an
      infinite loop. The hook memoizes on the underlying inputs.
    - **`LineupTool`'s league-sync effect got smaller, not bigger.** It used to
      copy the league's slots into local state on connect; the hook's fallback
      does that now, so all the effect still does is clear a stale explicit
      edit when the connected league CHANGES, so the new league's shape takes
      over rather than the old league's edits following the user across.
    - **Discoverability was half the fix.** A setting that only exists on the
      Lineup page is not a real answer for a Waivers user, so the editor now
      also lives in the app-wide roster modal (reachable from the sidebar and
      the mobile top bar on every page), under "Starting lineup · N starters",
      with one line saying what the Lineup page's own copy doesn't: Waivers
      reads this too, and a spot set to 0 won't be suggested.
    - **Verified live across all three regimes**, since the risk here is
      regressing the connected-league path while fixing the manual one:
      manual roster with K/DST set to 0 → Waivers returns QB/RB/WR/TE only
      (impossible before); manual roster with no config at all → D/ST and K
      still shown, the unchanged default; Sleeper connected with no stored
      edit → the league's real slots still win and D/ST/K stay absent, exactly
      as before. Also confirmed an edit in the Lineup editor writes through to
      the shared store and the summary updates, and that the Lineup Optimizer
      still fills a full 10-of-10 lineup off the league's detected slots.
      `tsc`/lint clean.

173. **Fixed the Backtest page on mobile — the page scrolled sideways and the
    result rows were unreadable at phone width.** Presentation only; no
    engine, data or backtest-logic change.
    - **Root cause was the shared `SegmentedControl`, not the Backtest page.**
      Measured rather than eyeballed: at 375px the document scrolled to 627px,
      and the single element responsible was the four-option **Mode** group —
      "Single pair / Broad (many pairs) / Trade assistant / Projection
      accuracy" is 603px of `whitespace-nowrap` pills. Two things had to be
      true for that to break the page, and both were: the control had no
      internal scroll container, AND it sits in a `flex` row where a flex
      item's default `min-width: auto` means it will not shrink below its
      content. So it pushed the whole document 250px wider than the screen.
    - **Fixed in the shared component**, so all four pages that use it benefit
      (Backtest, Legit Rankings, Player Stats, the player detail page):
      `min-w-0 max-w-full` on the group so it can shrink, `overflow-x-auto` on
      the pill track so it scrolls inside its own bounds, and `shrink-0` on
      the pills so they keep their size while it does. Same "wide content
      scrolls in its own container" convention the result tables already
      follow. The scrollbar is hidden (new `.segmented-scroll` rule) because
      the track is ~34px tall and a native bar would eat a third of it.
    - **Second problem, separate from the overflow: the result rows were
      squeezed.** Both summary components lay label and value out side by side
      with `justify-between`, which is fine on a desktop row and bad at 375px —
      several baseline labels run two or three lines ("Recent volume
      (targets/touches/attempts)", "Team pace/game script…"), so the label
      collided with the percentage and forced the correct/incorrect detail
      into a ragged narrow column. Both `BacktestSummary`'s `AccuracyBanner`
      and `ProjectionSummary`'s `ProjectionRow` now stack vertically below
      `sm` and keep the side-by-side layout above it.
    - **Third, smaller: the player-picker counter wrapped to three lines**
      ("0 / of / 4") when its label was long, as on Backtest's "Look up
      specific players (optional)". `shrink-0` and `whitespace-nowrap` on the
      counter in `PlayerMultiSelect` — which fixes it everywhere the picker
      appears, not just here.
    - **Verified by measurement, not just by looking**: `/backtest` at 375px
      now reports `scrollWidth === clientWidth === 375` in the controls state,
      with Broad results rendered, and with Projection results rendered
      (including its player table, which correctly scrolls inside its own
      `overflow-x-auto` parent while the page does not). `/rankings` and
      `/stats` — the other pages sharing the changed components — also measure
      clean. Desktop is unchanged: all four Mode pills still sit on one row and
      the summary rows are still side by side at 1440px. `tsc`/lint clean.
    - **Follow-up: shortened the Mode labels so all four fit without
      scrolling.** The scroll container fixed the broken page but left
      "Projection accuracy" off-screen on a phone until you swiped — fine as a
      fallback, worse than just fitting. Labels are now "Pair / Broad / Trade /
      Projection", measured at 320px of track against 327px of available
      column, so the group no longer overflows at all (`scrollWidth ===
      clientWidth` on the track itself, not just the page). What each mode
      does moved into a new `MODE_DESCRIPTIONS` line under the controls, which
      is a better home for it than a pill label — previously only Projection
      mode explained itself, and "(many pairs)" was doing that job badly for
      Broad. Desktop gains from it too: the three control groups now sit on
      one row with room to spare.
    - Worth remembering for the next one of these: a page-level horizontal
      scroll almost always traces to a single non-shrinking flex item, and
      `document.scrollWidth` vs `clientWidth` plus a walk of every element's
      `getBoundingClientRect().right` finds it in one pass — far faster than
      reading screenshots, which is how the earlier grid-overflow bug in item
      109 was found only after it shipped.

174. **Replaced the FantasyPros redraft rank in Legit Rankings with
    SportsDataIO's own season projections — the last live tool still reading
    the community scrape, and a cleaner input than what it replaced.**
    Follows items 161/162, which moved the weekly consensus and the trade
    valuation to the same source.
    - **Probed what was actually available before choosing**, rather than
      going from the docs. The legacy Players feed (what runs the app today)
      turned out to be a dead end: 28 fields, NO `DepthOrder` — that's on the
      2026 v3 feed only (item 156) — and its `AverageDraftPosition` covers
      only 666 of 923 skill players with stale-looking values (466, 230, 642).
      Season projections were the real find: 2,068 rows / 797 skill players /
      79 fields, with a sane board (Lamar 362.8, Josh Allen 360.8, Chase
      330.4, Bijan 316.1).
    - **Points are a better input than a rank, and that isn't a stylistic
      preference.** The rank version needed `FP_NORMALIZATION_CAP` — a hack
      added in item 78 because normalizing WR46 against a 239-deep published
      list inflated it to ~80/100 and let it outrank a real WR6. Projected
      points are proportionate by construction (a mediocre player's
      projection is genuinely low), so the cap is gone, along with the
      name/team key helper: SportsDataIO's feed is keyed by the same PlayerID
      as everything else, so there is **no name join to miss on** — verified
      0 unmatched across all four ranked pools.
    - **Before/after on the real board** (weekly, PPR — the check that
      matters, since a source swap that quietly reshuffles the rankings is a
      different product):

      | | old (FantasyPros rank) | new (SDIO projection) |
      |---|---|---|
      | QB | Allen 100, Maye 92, Lamar 92, Burrow 89 | Allen 100, Hurts 91, Maye 91, Lamar 89 |
      | RB | Bijan 99, Gibbs 99, CMC 93, Taylor 88 | Bijan 100, Gibbs 99, CMC 90, Taylor 84 |
      | WR | Chase 99, Nacua 99, St. Brown 99 | Nacua 100, Chase 99, St. Brown 97 |
      | TE | McBride 99, Bowers 96, Loveland 85 | McBride 100, Bowers 95, Loveland 80 |

      Same players, same broad order, small shuffles — which is the right
      outcome: it says the two sources agree on the big picture, so this is a
      dependency change rather than a ranking change. The one systematic
      difference is that mid-tier scores compress downward (Chase Brown
      82->76, Olave 88->82, Loveland 85->80) — exactly the rank-inflation the
      cap was papering over, now gone at the source.
    - **Every live tool is now free of the FantasyPros scrape.** The only
      remaining consumer anywhere is `loadRunNflverseOnly.ts`, the 2022-2025
      backtest pipeline, which genuinely needs it — SportsDataIO's projections
      401 for those seasons (item 161), so it is the only consensus source
      with history. `fantasypros/liveConsensus.ts` was already unused (kept as
      item 161's revert path) and `getSeasonRedraftRankByKey` is now reachable
      only from it.
    - **Swept the stale doc comments in the same pass** rather than leaving
      them for a later session to trip over — the item-166 lesson, applied
      immediately: eleven references in `buildRankings.ts` still said
      "FantasyPros" for what is now the SportsDataIO projection, and the
      exposed field was renamed `fantasyProsPositionRank` ->
      `consensusProjectedPoints` (a points value now, not a rank; it is
      informational only and not rendered).
    - **Unchanged deliberately**: `ENGINE_WEIGHT` and `SEASON_ENGINE_WEIGHT`
      keep their values and their standing caveat — rankings have no pick
      ground truth to tune against (items 78/139), so these stay reasoned
      defaults. The cross-position VOR that drives the Top 100 already read
      the weekly SportsDataIO consensus (item 161) and is untouched.
    - Verified live end to end: all four position boards plus the Top 100
      (100 entries, mix RB 29 / WR 34 / TE 18 / QB 19) render correctly with
      real data. `tsc`/lint clean.

175. **Wired SportsDataIO's advanced metrics into Legit Rankings — expected
    fantasy points, scoped to RB/WR/TE after checking that QB doesn't hold
    up.** Resolves Open Item #36. Two real mistakes were caught before
    shipping, both by measuring rather than reasoning.
    - **Why Rankings and nowhere else**: the marquee advanced fields exist
      only at SEASON level (`AdvancedPlayerSeasons`, ~445 fields — confirmed
      live for 2025 despite the bulk season endpoints 401ing, item 155's
      quirk). Season-shaped data can't feed the week-by-week engine and can't
      be backtested (item 160), but Rankings is a season-value ranking with no
      pick ground truth anyway, so it's the one place the shape fits.
    - **Blended as a refinement of OUR side, not a third axis.** The score
      stays "our read vs the market's" and `ENGINE_WEIGHT` keeps its meaning;
      what changed is what "our read" means:
      `ourView = (1-w)*engineNorm + w*expectedNorm`, `w = 0.3`. The engine
      scores what a player DID; expected points score what their usage was
      WORTH, which strips the touchdown luck raw production carries. Another
      reasoned default, same standing no-ground-truth caveat as the other two
      weights.
    - **Mistake 1, caught by spot-checking the board: expected points are a
      season TOTAL.** The first pass blended the raw total, which punishes a
      player for games missed — precisely the injury-shortened case a
      forward-looking ranking must not get wrong. It showed up immediately as
      Brock Bowers dropping 95 -> 85: his 151.6 expected points read as poor
      until you notice it's over 12 games, a healthy 12.6 a game. Now divided
      by the row's own `Games`, with a 4-game floor (matching the engine's
      recent-form window) below which the rate is too thin to trust. Bowers
      lands at 89.
    - **Mistake 2, caught by testing rather than accepting a plausible
      result: QB.** With per-game expected points, Lamar Jackson fell QB4 ->
      QB9 against a market that has him near the top — a big enough move to
      be worth verifying instead of shipping. Correlating expected points per
      game against real points per game across the 2025 ranked pools:

      | position | r |
      |---|---|
      | TE | 0.96 |
      | RB | 0.92 |
      | WR | 0.91 |
      | **QB** | **0.66** |

      QB is the clear outlier, with large residuals both directions (Josh
      Allen under-modelled by 2.6/game, Joe Burrow over-modelled by 2.8) —
      consistent with an opportunity model that handles designed quarterback
      rushing poorly, and consistent with this app's own long record of QB
      signals behaving unlike skill positions (items 24-30/41/66). Scoped to
      RB/WR/TE, the same position-scoping discipline as item 15's QB
      exemption and item 33's TE exemption. QB's board is now byte-identical
      to before, and the Lamar concern evaporates with it.
    - **Cost is handled by a shortlist, measured not assumed.** This is one
      HTTP call per player against pools of hundreds, so the engine+consensus
      blend is computed over the whole pool first and only the top
      `ADVANCED_SHORTLIST` (45) is refined — the same two-pass discipline as
      the waiver ranking (item 171), and deep enough to cover anything
      displayed (largest position cap is 25; the Top 100 has never drawn more
      than ~34 from one position). A 0.3-of-our-view weight can reorder that
      shortlist but was never going to lift a player out of the tail into the
      displayed rows, which is what makes it safe rather than merely cheap.
      Observed cold cost ~13s for a position's 45 calls, then cached; QB now
      skips the fetch entirely.
    - **Net effect on the board is modest and defensible**, which is what a
      30% refinement of one half should look like: RB — McCaffrey 3rd -> 2nd
      on a genuinely elite 26.4 expected points a game against Bijan's and
      Gibbs' ~18.7; WR — Smith-Njigba edges past St. Brown (19.1 vs 17.3);
      TE — Pitts past Warren (12.1 vs 10.6). Everything else holds.
    - **Fails open throughout**: this rides on the separate advanced
      evaluation subscription (Open Item #35). A missing player, a
      sub-4-game player, or the whole feed being unavailable leaves
      `expectedPointsByPlayerId` empty and the ranking falls back to exactly
      the item-174 behaviour — verified by the fact that QB, which now never
      fetches, produces byte-identical output.
    - Verified live: all four boards plus the Top 100 render with real data,
      100% expected-points coverage on every displayed RB/WR/TE. `tsc`/lint
      clean.

176. **Player Stats: replaced the "2025 season totals · 83 players · click a
    player…" caption with a real Season toggle (2025 / 2026).**
    Presentation plus a small route change; no engine or scoring change.
    - **The season options are derived, not hardcoded** —
      `[lastCompletedSeason, lastCompletedSeason + 1]`, read from the response
      the page already receives. So the pair rolls forward on its own instead
      of needing an edit every September, and the toggle stays hidden until
      the first response says where the calendar actually is.
    - **`/api/stats` gained an optional `season`**, honoured only within
      `MIN_STATS_SEASON`(2025)`..lastCompletedSeason + 1` and otherwise
      falling back to the default. That range is not arbitrary: the readers
      are season-routed across two subscriptions (item 158), so an
      out-of-range year would 401 rather than return anything useful.
      Verified all three paths — 2025 returns 83 QBs, 2026 returns 0 rows
      without erroring (confirming the v3 route works, since the legacy key
      would have 401'd), and 1999 falls back to 2025.
    - **The upcoming season needed its own empty state, and this is the part
      worth remembering.** The existing zero-results branch says "No QB
      matches ..." — written for a search that missed, and it would have
      rendered as a failed search with an empty query for a season that
      simply hasn't kicked off. Now a genuinely empty pool (as opposed to an
      empty *filter* result) shows "No 2026 stats yet — that season hasn't
      kicked off; stats appear once games are played", and the search-miss
      copy only fires when there were rows to filter in the first place.
    - The caption's other content was redundant rather than lost: the season
      is in the toggle, "click a player for their game log" is already in the
      page subheading, and the row count was noise.
    - **Follow-up: made the season LIST roll forward properly, not just the
      default.** The default already worked and needed no change —
      `getSeasonContext` resolves `lastCompletedSeason` from the last
      completed WEEK, so it flips to the new season the moment its week 1
      finishes, which is exactly when a stats browser should stop defaulting
      to last year. The real defect was the option list: a naive
      `[lastCompleted, lastCompleted + 1]` would have silently DROPPED 2025
      the week 2026 kicked off, so the archive would vanish precisely when
      there was finally something to compare it against. Options are now every
      servable season (`MIN_STATS_SEASON`..last completed), plus the
      not-yet-started one only while it's genuinely next up — in season it is
      over a year away and just clutter.
    - **Verified the FUTURE behaviour, not only today's**, by patching
      `window.fetch` in the page to rewrite the response's `context` and
      re-running — the component can't tell it's a fixture, so this exercises
      the real derivation:

      | simulated | options | default |
      |---|---|---|
      | today (offseason, 2025 complete) | 2025, 2026 | 2025 |
      | mid-2026 season | 2025, 2026 | **2026** |
      | after 2026 ends | 2025, 2026, 2027 | 2026 |
      | mid-2027 season | 2025, 2026, 2027 | **2027** |

      Worth recording one trap in that exercise rather than the result alone:
      an intermediate run appeared to show a wrong default, and it was the
      test harness — it re-clicked the position that was already selected, so
      no refetch happened and it was reading the previous scenario's data. The
      fixture, not the app.
    - Verified live at desktop and 375px: toggle switches both ways (2025 → 83
      rows, 2026 → the empty state, back to 2025 → 83 rows), and the page
      still measures `scrollWidth === clientWidth` on mobile with a fourth
      control group added. `tsc`/lint clean.

177. **Probed SportsDataIO's betting/props endpoints (the untested item from
    155/156). They are entitled, and materially better than The Odds API on
    every axis except the one that would let them become a signal.** Research
    only — no code shipped.
    - **Two separate product families, both live on the 2026 key
      (`v3/nfl/odds`):**
      1. **`PlayerPropsByWeek/{season}/{week}`** — a flat per-player line
         feed. 1,117 rows / 136 players / 15 market types for 2026 week 1,
         keyed by **PlayerID** (no name join, unlike The Odds API). Markets:
         passing/rushing/receiving yards, attempts, completions, receptions,
         TDs, interceptions — and, notably, **"Fantasy Points" and "Fantasy
         Points PPR"**, a market-implied fantasy line directly comparable to
         the engine's own `finalScore`.
      2. **Sportsbook Group** — `BettingEventsByDate/{date}` →
         `BettingMarkets/{eventId}`. 496 markets for one game, 354 of them
         player props, with real per-book prices (FanDuel, Caesars,
         Consensus…) across 17 books including DraftKings, BetMGM,
         PrizePicks, Underdog and Sleeper. `ActiveSportsbooks` lists them.
    - **Coverage is the standout difference.** Props are already posted for
      the WHOLE 2026 season — week 1 1,117 rows, week 2 and 3 1,520 each,
      week 5 1,429, week 8 1,378, in August. The Odds API's free tier had
      **zero** props for 2026 week 1 six weeks out (item 98), because real
      books post props days before kickoff. Plus no name join, no
      500-requests/month quota, and one fewer third-party dependency and env
      var.
    - **The wall is unchanged, and it's the one that matters for scoring:
      historical props 401.** Tried 2025REG and 2024REG against both the 2026
      and legacy keys, and the legacy `api/nfl/odds` host — all 401 or 404.
      So props still cannot be backtested, exactly as item 98 found for The
      Odds API's paid-only history. They stay a display/context feature, not
      a signal. **Open Item #24 stays open**, and its premise is now
      confirmed from a second vendor rather than assumed.
    - **One honest uncertainty about family (1):** whether those lines are
      live book consensus or SportsDataIO's own modelled lines can't be
      determined from the payload — there is no `SportsBook` field on that
      endpoint, the payouts vary continuously (-153, -150, -147…) rather than
      clustering at a few book prices, and real books do not post week-8
      props in August. Family (2) is unambiguously real per-book prices.
      Worth knowing which before leaning on family (1) for anything beyond
      display.
    - **Shipped the swap (same session).** `src/lib/oddsapi/` is deleted, along
      with `ODDS_API_KEY` — the app now has one fewer third-party dependency
      and one fewer env var. Replaced by `sportsdata/playerProps.ts` (server
      reader) + `sportsdata/playerPropTypes.ts` (plain display types with no
      `server-only` import, so the client card can `import type` them — the
      same split the deleted module used). New `oddsV3` base and a
      `playerProps` revalidate (1h). `/api/props` keeps its shape, so the
      client-side deferred fetch (item 141) is unchanged.
    - **The upcoming week is derived from `lastCompletedWeek`, not
      `isInSeason`** — deliberately. `isInSeason` flips true a few days before
      a season's first week completes (item 47), and in that window
      `lastCompletedSeason` still trails by a year, so asking it directly
      would request week 19 of a finished season. `lastCompletedWeek >= 18`
      means "roll to next season, week 1"; otherwise it's this season's next
      week.
    - **It works in the offseason, which is the whole point**: a real
      comparison now renders populated lines where The Odds API returned an
      empty object every time. Bijan Robinson, 2026 week 1 — market Fantasy
      Points PPR 20.5 against our projection of 21.7, plus rush yards 86.5,
      receptions 4.5, total TDs 1.5.
    - **Caught a real labelling error before shipping.** The first pass
      labelled the `Total Touchdowns` market "Anytime TD". It isn't — it's an
      over/under on touchdowns scored (Bijan's line is O/U 1.5), while an
      anytime-TD price is a yes/no at around +122. Mislabelling a real betting
      line is worse than showing none, so it reads "Total TDs". The genuine
      anytime market exists, but only in the Sportsbook Group family, not this
      feed.
    - **Coverage is partial and degrades honestly**: the week-1 feed carries
      136 players — the top of each offence — so a deeper player (DK Metcalf,
      confirmed absent rather than mis-joined) simply keeps the existing
      "lines post closer to kickoff" state.
    - **Still contingent on the 2026 subscription** past 15 Sept, same as item
      175's advanced metrics. If it lapses the section falls back to its empty
      state rather than breaking, but it would need re-pointing.

178. **Mapped exactly what SportsDataIO would need to supply if the legacy
    key went away — and found that 2025 is unreachable on the 2026
    subscription, which makes the legacy key load-bearing rather than
    legacy.** Probe-only; no code change. Corrects one claim in item 156.
    - **The finding that matters most: the 2026 key cannot reach 2025 at
      all.** Verified across every product — `BoxScoresFinal`,
      `PlayerGameStatsByWeek`, `PlayerSeasonStats`, weekly and season
      projections, `Schedules`, `Byes` — all 401 for 2025REG/2025. The single
      exception is `AdvancedPlayerInfo`, which still returns 2025 per-player
      rows (item 155's quirk).
    - **Three consequences, in severity order:**
      1. **Today, dropping the legacy key doesn't degrade the app, it kills
         it.** Every tool runs on the last COMPLETED season — 2025 — and 2026
         has no played games. No stats, no scores, no projections.
      2. **After the 2026 rollover, the primary backtest pipeline dies
         permanently.** That pipeline IS 2025-on-SportsDataIO. Losing it
         leaves only the nflverse 2022-2025 pipeline — a different source
         from the one the live tools run on, which is precisely the
         cross-pipeline hazard item 53 documented (a signal that validated
         on nflverse and REVERSED on SportsDataIO).
      3. The Player Stats 2025 tab (item 176) would return nothing.
    - **So the historical ask is 2022-2025, not 2022-2024.** 2025 is not
      archive-nice-to-have; it is the season the app currently serves AND the
      only season it validates on. Buying 2022-2024 while letting 2025 lapse
      would leave four seasons of history with a hole where the only
      SportsDataIO-validated season used to be.
    - **Already entitled and verified on the 2026 key** (enough to RUN the
      app once 2026 has games): `scores` (Teams, Timeframes, Byes,
      Schedules), `stats` (BoxScoresFinal, PlayerSeasonStats), `projections`
      (weekly + season), `odds` (PlayerPropsByWeek, GameOddsByWeek,
      BettingEvents/BettingMarkets), and `advanced-metrics` on its own key.
    - **`Schedules` is strictly better than the nflverse release it would
      replace** — worth knowing before any migration. It carries
      `ForecastWindSpeed`/`ForecastTempHigh`/`ForecastTempLow`,
      `StadiumDetails.Type` (dome vs outdoor), `PointSpread` and `OverUnder`
      alongside the fixtures. That's next opponent, weather AND the D/ST-K
      implied totals from one endpoint — and unlike nflverse it has a real
      pregame FORECAST, which is why cards currently read "Forecast pending"
      for outdoor games.
    - **NOT entitled today, and one is a functional regression rather than a
      nice-to-have:**
      - **Injuries.** `stats/json/Injuries` 401s, `scores/json/Players`
        401s, and `PlayersByAvailable` — the one that does work — returns
        `InjuryStatus`/`DepthOrder` EMPTY across all 6,249 rows. The legacy
        `fantasy/json/Players` feed is currently the only source of live
        injury status (172 players flagged), and `comparePlayers`'
        Out/Doubtful exclusion runs off it. Without this the app stops
        knowing who is out.
      - **Depth charts.** `scores/json/DepthCharts` 401s. Optional — it only
        drives item 100's confidence floor — but it is what would delete the
        ~554k-row nflverse depth-chart parse, half the cold-start cost.
    - **Corrects item 156**, which recorded that the new plan's Players feed
      carries `InjuryStatus` and `DepthOrder`. Measured now, it does not:
      that endpoint isn't entitled on this subscription, and the accessible
      variant has both fields blank. Recorded here rather than edited into
      156, so the earlier observation and this correction both stand.
    - **What SportsDataIO would still not cover, and whether it matters:**
      - **EPA and success rate** — play-by-play derived, in no SDIO product.
        **No live impact**: `RB_EPA_BLEND_WEIGHT`, `QB_RUSH_EPA_BLEND_WEIGHT`,
        `QB_SUCCESS_RATE_BLEND_WEIGHT` and `REDZONE_BLEND_WEIGHT_RB` are all
        `0`. They feed backtest baselines only.
      - **Air-yards SHARE** — advanced carries `AirYards` but not the share
        the WR signal uses (item 148); derivable by summing team air yards.
      - **Weekly roster status (RES/IR)** — item 57's source is nflverse's
        `weekly_rosters`; a historical injuries product would have to
        substitute.
    - **One-line version for the sales conversation**: injuries to keep
      parity, 2022-2025 history on stats + projections to validate the
      engine's biggest signal on the data actually served, depth charts for
      the performance win. Everything else is already in hand.

179. **Replaced the initials avatars with the player's jersey — real team
    colours, real squad number.** Presentation, plus one small lookup
    endpoint; no engine or scoring change.
    - **Every value is real data**, which is what made this worth doing
      rather than a decoration: SportsDataIO's `/Teams` carries each club's
      `PrimaryColor`/`SecondaryColor`, and 890 of 925 skill players have a
      `Number`. Chase renders in Bengals black with a real #1, Nacua in Rams
      blue #12, McCaffrey in 49ers red #23 — spot-checked against reality.
    - **Contrast is computed, not taken from the feed.** A team's own
      secondary colour is frequently unreadable on its primary — Atlanta's is
      black on red — so the number's colour comes from the primary's relative
      luminance. That makes it legible for all 32 clubs rather than most.
    - **The torso is deliberately wider than a real shirt.** The first pass
      used a realistic silhouette and two-digit numbers were cramped at the
      28px the lineup rows use. The number is the point of the avatar, so the
      shape gives way to it — checked at 54/40/34/28px before wiring
      anything in.
    - **`Number` is optional on `Player`, and read with `!= null` rather than
      a truthiness check.** Jahmyr Gibbs wears **0**, which is falsy in JS —
      a truthy guard would have silently rendered him blank. Optional because
      the synthetic `Player` rows the backtest, nflverse game-log and D/ST
      layers construct have no squad number.
    - **Wired through one lookup endpoint (`/api/jersey-data`), not six
      response types.** Squad number and team colour are cosmetic, and
      `PlayerScoreBreakdown` is a scoring type — putting display data on it
      would have spread this across the engine for no benefit. The endpoint
      returns 32 teams' colours plus a playerId->number map, fetched once per
      session via `useJerseyData` and shared by every jersey on the page
      (`useSyncExternalStore` over a module-level cache — the same primitive
      `createPersistentStore` uses, and the reason this isn't
      state-in-an-effect).
    - **Applied everywhere an avatar appears**: the shared picker, Legit
      Rankings rows, the trade board, waiver candidates and lineup starters.
      The Player Stats detail page and all three Home "This week" widgets were
      missed in this pass and picked up later, which surfaced a real
      duplication: the D/ST-and-K fallback
      (those have no jersey, so they keep a position-tinted team-code tile) was
      written independently in `WaiverResult` and `LineupResult` and simply
      OMITTED in `TradeResult`, where a traded defence rendered as a blank
      shirt. Rather than make that four and five copies, it was extracted into
      one shared `PlayerAvatar` in `Jersey.tsx` that every surface now uses —
      which fixed the TradeResult gap as a side effect. `RankingsResult` and
      `PlayerMultiSelect` still call bare `Jersey`, correctly: rankings exclude
      D/ST and K entirely (item 78) and the picker shows them with their own
      position chip.
      **It also corrected this item's own K handling.** Kickers were grouped
      with D/ST as the other "streaming" position and given the team-code tile
      too — but that conflated a fantasy-roster concept with a rendering one. A
      kicker is a person who wears a shirt and the data has his number (Butker
      is 7); D/ST is the only entry with a synthetic PlayerID and no number to
      show. Only D/ST falls back now, so a kicker shows a real jersey
      everywhere — which matters most on Player Stats, where kickers are
      first-class and D/ST is excluded outright.
      **D/ST and K keep the position-tinted team-code tile** — a team defence
      has no jersey to show.
    - **The tradeoff, taken deliberately.** The initials were
      position-coloured (QB violet, RB teal, WR blue, TE rose), which was a
      scanning cue in mixed lists — the Top 100, the waivers "All" tab, the
      lineup bench. Jerseys trade that for team identity. Position isn't lost
      (those lists already carry a position chip next to the name) but it is
      no longer what the eye catches first. Put to the user with two
      alternatives — jerseys only where team matters, or jerseys plus a
      position-coloured edge — and they chose the clean swap.
    - Fails open at every step: no team, no number, or a failed
      `/api/jersey-data` fetch all render a neutral shirt rather than a wrong
      number or a broken page. Verified live across Rankings, the trade
      board, the picker and the waiver board. `tsc`/lint clean.

180. **Trade valuation moved from raw rest-of-season points to value over
    replacement — a real correctness bug the user caught: the Home widget
    offered Patrick Mahomes for Jaxon Smith-Njigba, a trade no opposing
    manager would ever accept.** Reproduced first rather than assumed:
    `/api/trade?give=18890&get=23157` returned Mahomes 302.8 vs JSN 320.6, a
    +17.8 raw gap inside the 25.6-point "fair" band, so it graded **fair** and
    the suggester (which only ever proposes "fair" trades, item 77) happily
    surfaced it.
    - **Root cause: raw rest-of-season point totals are not comparable across
      positions, and the error is big enough to invert verdicts.** Every league
      starts a QB, and the worst startable QB already scores ~17.5 a game — so
      ~98% of Mahomes' 302.8 is a baseline you can replace off waivers for
      nothing. A WR's replacement level is ~12.2. In points above replacement
      the same trade is Mahomes **5.8** vs JSN **112.9** — a +107 fleece, not a
      coin flip. This is the identical class of bug item 140 fixed for the Top
      100 ("why is Trey McBride so high"), and the same currency items 138/168
      already used for uneven trades; 1-for-1 cross-position trades were simply
      the case nobody had applied it to.
    - **The fix subsumes the model it replaces rather than sitting beside it.**
      `evaluateTrade` now subtracts each player's own replacement level over
      their own remaining games, instead of crediting the shorter side a
      replacement filler for the count difference. Crediting a filler per freed
      roster spot was always value-over-replacement applied only to the count
      difference — doing it per player covers cross-position trades too. Checked
      the uneven case didn't move as a side effect: Pollard+Warren → Chase lands
      at +163.7 where the old filler model gives +164.95 on the same
      projections, a 1.25-point difference. **Same-position trades are exactly
      unchanged** (both sides shed the identical baseline), confirmed live on
      WR-for-WR, RB-for-RB and QB-for-QB: net equals the raw difference to the
      decimal.
    - **Derived the two missing replacement levels rather than defaulting them
      to zero, which would have introduced a NEW bug.** `REPLACEMENT_PER_GAME`
      only covered skill positions, and a 0 for D/ST and K would have made a
      kicker's raw points count entirely as value — a 159-point kicker would
      have outranked a 112-VOR elite WR. Computed both by the same method as the
      skill numbers (startable cutoff #12, min 8 games, full 2025 season, via a
      temporary diagnostic route deleted after): **K 8.41/game** (J.Bates, 143
      over 17) and **D/ST 6.71/game** (NO, 114 over 17). Both format-invariant —
      neither scores receptions. Verified after: Butker → Nacua now reads 16.2
      vs 130.3 rather than 159.1 vs 338.0, which is the honest picture of what a
      kicker is worth in a trade. The constant is now
      `Record<ScoringFormat, Record<ExtendedPosition, number>>`; the skill values
      are untouched, so `multiPlayerTradeBacktest.ts` (which guards on
      `isSkillPosition`) is unaffected.
    - **The "roughly even" band still scales off the RAW totals, deliberately.**
      Scaling it off VOR instead would have shrunk the tolerance by ~3x and
      turned a lot of previously-fair trades into good/bad calls — a separate,
      unvalidated change riding along on a bug fix. Keeping it on raw totals
      means the tolerance for calling a trade fair is unchanged in absolute
      points and only WHICH difference is measured moved.
    - **`suggestLeagueTrade` had the same bug at both ends, not just in the
      verdict — this is why a QB was the chip in the first place.** It picked
      the "surplus" as the best bench player and the "need" as the weakest
      starter, both by raw rest-of-season points. On raw points a benched
      starting-caliber QB is the most valuable bench asset on almost any roster,
      and a QB is essentially never anyone's weakest starter. Both, plus the
      candidate filter and the closest-in-value sort and the does-this-help-them
      check, now go through a shared `tradeValue()` helper on the same VOR
      basis. Arithmetic consequence worth stating plainly: Mahomes' 5.8 is below
      basically any startable bench skill player, so he stops being offered as
      the chip at all — and even if he were, +107 no longer clears the
      "fair"-only gate.
    - **Two smaller real bugs fixed in passing**: `suggestLeagueTrade` and
      `suggestDrop` both called `evaluateTrade` without the `format` argument,
      silently grading every suggestion in PPR regardless of the user's selected
      format. Harmless while the model was raw sums for 1-for-1s; not harmless
      once replacement levels (which differ sharply by format — WR 12.22 PPR vs
      8.13 Standard) enter the math.
    - **The trade BACKTESTS were deliberately left on raw points**, which
      decouples them from the live tool again after item 168 coupled them. They
      grade a different question — *which side actually outscores the other* —
      where real points scored are the ground truth and there is nothing to
      normalize; "is this trade fair" has no ground truth to backtest at all.
      `multiPlayerTradeBacktest.ts` keeps its item-138 uneven-count filler
      (removing a count confound from a PREDICTION, which is a different
      argument). Confirmed unaffected by re-running it: pooled numbers
      byte-identical.
    - **UI follow-through** (`TradeResult.tsx`), since three things read the
      adjusted totals: the balance meter now compares VOR with a caption saying
      so ("Value above a replacement starter…"), the "+N open spot" credit badge
      is gone (no longer a concept), and the summary strip's roster-spot cell
      became a **Positional value** cell so every number still reconciles —
      `(get − give) + positional = net`. Verified live end to end: give 302.8,
      get 320.6, positional +89.3, net +107.0, verdict "You come out ahead."
    - **Not changed, and worth knowing why**: `optimizeLineup` still ranks on
      raw `finalScore`. Within a slot only eligible positions compete, and for a
      SUPER_FLEX slot you genuinely do want the most points, not the most value
      over replacement — lineup slots and trade value are different questions.
    - **One honest limitation**: the replacement levels are 1-QB-league levels.
      In a superflex/2-QB league QBs are genuinely scarcer and their real
      replacement level is far lower, so this now UNDER-values quarterbacks
      there. `evaluateTrade` has no access to the roster slots (the Home widget
      does, the `/api/trade` route doesn't), so making it slot-aware is real
      threading work rather than a constant swap. See Open Item #39.

181. **The waiver drop suggestion recommended dropping a STARTER and then
    graded its own recommendation "Bad move for you — you give up about 75.4
    points." Fixed by dropping from the bench instead of by position.** Spotted
    on the user's real Home page next to item 180's work: the top waiver target
    was Colby Parkinson (TE) with "Suggested drop: Jake Ferguson" — Ferguson
    being a FLEX starter in their lineup.
    - **The verdict was correct; the suggestion was incoherent.** `suggestDrops`
      picked the user's worst rostered player at the SAME position as the
      pickup. They roster two tight ends and both start, so the "worst TE" was
      necessarily a starter, and cutting a starter for a worse waiver player is
      never right — so the honest grade came back "bad," and the feature ended
      up arguing against itself. A suggestion the tool tells you not to take
      isn't a suggestion.
    - **The same-position rule was the real defect, not the copy.** Real
      managers drop whoever is least useful, which is a BENCH question, not a
      positional one — you don't have to drop a TE to add a TE. `suggestDrops`
      now runs the same `optimizeLineup` the Lineup Optimizer does to split
      starters from bench (so it needed the league's slots: `/api/waivers`
      gained an optional `slots` param, sent by both waiver clients, which
      already had `useEffectiveRosterSlots` from item 172 and defaults to
      `DEFAULT_SLOTS`), then picks the lowest-value BENCH player regardless of
      position.
    - **"Least valuable" is value over replacement, not raw points** — item
      180's currency, and it matters here for the same reason: on raw points a
      backup QB looks like the most valuable thing on any bench and would never
      be cut. `valueOverReplacement` was exported from `evaluateTrade.ts` and
      `suggestLeagueTrade`'s private `tradeValue` collapsed onto it, so there's
      one definition rather than three.
    - **It only ever proposes a drop the pickup actually beats.** If your worst
      bench player still outvalues everything on waivers, the honest answer is
      that nothing there is worth a roster spot, so it returns nothing rather
      than manufacturing a losing move. That is what structurally removes the
      "bad move" case — the copy change follows from the logic rather than
      papering over it, and `moveHeadline`'s bad branch is gone along with the
      now-dead `VERDICT_DOT` map.
    - **Verified on the same real league that produced the report**: the drop
      moved from Jake Ferguson (a starter, −75.4) to **Ollie Gordon II**, a
      bench RB projecting **1.9 points a game** — obviously the right cut — and
      every one of the 40 surfaced candidates across all four positions now
      grades positive against him. Confirmed rendered on both surfaces (the Home
      widget and the Waivers spotlight card); item 169's "thin week" caveat
      still fires alongside it, which is the correct pairing: a real best-drop
      AND an honest warning that the pickup is still below a startable TE.
      One copy bug caught in the browser rather than reasoned about — both call
      sites already print the dropped player's name as a label, so the shared
      sentence naming them again read "Suggested drop: Ollie Gordon II. Ollie
      Gordon II is the least valuable player on your bench"; the sentence now
      names nobody.
    - **A deliberate consequence worth knowing**: the drop is now the same
      player for every candidate on the board (you only have one worst bench
      player), where before each position suggested a different one. That's
      correct — the variety was an artifact of the bug — but it does mean a
      board of ten candidates repeats one name.

182. **Made player names click through to their stats page, on the surfaces
    where that's a plain link — and found the two where it isn't.** The
    destination already existed (`/stats/[playerId]`, item 159) and the stats
    leaderboard already linked that way; nothing else did.
    - **New `PlayerLink.tsx`**, one guarded wrapper rather than a bare `<Link>`
      per call site, because two cases must NOT link.
      **D/ST is the important one**: `/api/stats/900028` returns **200**, not a
      404 — it renders a real page with zero games and all-zero totals, since
      SportsDataIO models a team defence as a team stat with no player row and
      the stats pages exclude D/ST throughout (item 159). Landing there reads as
      broken rather than honest, so a defence renders as plain text. A player
      with no resolved ID does too. Verified on a real Steelers-D/ST-for-Bijan
      trade: only Bijan is a link.
    - **Wired into six surfaces**: Legit Rankings rows, Start/Sit player cards,
      the trade board, and all three Home "This week" widgets. Verified live —
      100 links on the Top 100 (clicking one really navigates), 13 across the
      Home widgets (10 lineup slots + waiver target + both trade sides), and
      both Start/Sit cards.
    - **Three surfaces deliberately left alone, each for a structural reason,
      not an oversight:**
      - **Waivers and Lineup rows**: the entire row is a `<button>` (click to
        expand reasoning), and an `<a>` nested inside a `<button>` is invalid
        HTML. Linking there means reworking the expand interaction first —
        shrinking the target to the chevron, or converting the row to a div
        with its own click and keyboard handling. A UX decision more than a
        coding one; see Open Item #40.
      - **The Home rankings board**: each row is ALREADY a `<Link>` to
        `/rankings`, and links don't nest either. Changing where that row points
        is a behaviour change, not an addition.
      - **`PlayerMultiSelect`**: clicking there selects a player; a link would
        hijack it.
    - The Backtest tables (`ProjectionPlayerTable`, `BacktestWeekTable`,
      `TradeBacktestTable`) are plain and could take the same treatment — left
      out only because this pass was scoped to the user-facing tools.

### Open items (as of item 182 — pick up here)
**Everything is committed and pushed to `main` (HEAD `cd72d4b`), working
tree CLEAN.** Items 167-179 span three themes: finishing the move onto
SportsDataIO, a run of Waiver Wire correctness fixes, and UI work.

**READ FIRST if you touch data sources:** the legacy key is NOT legacy. It
is the only thing serving 2025, and every tool runs on the last completed
season. Dropping it today stops the app; see item 178.

**Current headline numbers** (unchanged by items 167-181 — none of them
touched engine weights; items 180-181 changed only LIVE trade and waiver-drop
valuation, not any backtest):

| measure | value |
|---|---|
| primary 2025 broad, skill positions | 61.80% |
| pooled 2022-2025 (nflverse, FantasyPros) | 58.68% |
| trade backtest, nflverse multiseason 1-for-1 | 61.40% |
| trade backtest, multi-player 2-for-2 | 60.02% |
| projection accuracy, engine | MAE 6.26 / bias +0.25 |
| waiver ranking, pooled forward PPG | 12.82 (was 11.99 on volume) |

**What changed, by theme:**

- **SportsDataIO now feeds every live tool.** Rankings moved off the
  FantasyPros scrape to SDIO season projections (item 174), advanced metrics
  refine the rankings blend for RB/WR/TE (item 175), and betting lines moved
  off The Odds API (item 177). `src/lib/oddsapi/` and `ODDS_API_KEY` are
  gone. **FantasyPros survives in exactly one place** — the nflverse
  2022-2025 backtest pipeline, which has no alternative.
- **Waiver Wire had four real defects, all fixed and mostly backtested**
  (items 169-172): the top target ranked on volume alone and surfaced
  below-replacement players; it could recommend a player listed Out; the
  starter-need math double-counted flex slots; and the lists themselves were
  volume-ranked when the engine's projection is measurably better
  (backtested, +0.83 forward PPG, better at every position and season).
- **Slot config is now a shared persisted setting** (item 172), so a
  manual-roster user can finally stop Waivers recommending kickers.
- **UI**: Backtest fits on a phone (item 173), Player Stats has a season
  toggle (item 176), and avatars are now the player's jersey in real team
  colours with their real squad number (item 179).
- **The waiver drop suggestion drops from your BENCH, not your worst player
  at the pickup's position** (item 181) — the old rule cut starters on shallow
  rosters and then graded its own advice "bad move". Only ever suggests a drop
  the pickup actually beats.
- **Trades are graded on VALUE OVER REPLACEMENT, not raw points** (item 180)
  — a user-reported bug where the Home widget offered Mahomes for JSN and
  called it fair. Raw rest-of-season totals aren't comparable across
  positions (~98% of a QB's total is replaceable off waivers). Same-position
  trades are exactly unchanged; the trade backtests are deliberately still on
  raw points and were re-run to confirm byte-identical.

**Traps recorded in those items, worth not re-learning:**
- `Number` is read with `!= null`, not truthiness — Gibbs wears 0 (item 179).
- `getSeasonContext` resolves from the last completed WEEK, so it rolls into
  the new season on its own; what needs care is keeping PRIOR seasons listed
  (item 176).
- A page-level horizontal scroll traces to a single non-shrinking flex item;
  measure `scrollWidth` vs `clientWidth` rather than reading screenshots
  (item 173).
- Hooks returning derived objects must memoize — an unstable reference in a
  dependency array refetches forever (item 172).
- Raw fantasy points are never comparable ACROSS positions — anywhere a
  ranking or comparison spans positions it needs `REPLACEMENT_PER_GAME`.
  This has now bitten three separate features (items 140, 168, 180); check
  any new cross-position sort for it before shipping.

**Deliberately hybrid, do not "simplify"**: the primary 2025 pipeline uses
SportsDataIO projections; the nflverse-only 2022-2025 pipeline still uses
FantasyPros, because SportsDataIO's projections **401 for 2022-2024**. Each
pipeline uses the only source it can get for its seasons. Consequence: the
multi-season check no longer validates the source the live tools use — the
core risk in **Open Item #37**.

**Several shipped signals rest on SINGLE-SEASON evidence** (the consensus
swap, the trade blend, expected points), since history is paywalled. Items
24-30 are the long record of why that is a real risk, not a formality.

The paragraph below is an OLDER session's record (items 159-166), kept for
context — its "as of item 166" framing is historical:

The paragraph below is the PRIOR session's record (items 151-153), kept for
context — its "as of item 153" framing and HEAD `c043aef` are historical:
The paragraph below is the PRIOR session's record (items 151-153), kept for
context — its "as of item 153" framing and HEAD `c043aef` are historical:
**Everything through item 153 is committed and pushed to `main` (HEAD
`c043aef`), working tree CLEAN.** This session shipped items 151-153
(rankings Weekly/Season toggle `edb7753`; Trade Assistant uneven-trade
conservative rework `03405c7` + rename `cdd04c5`; item 153's FantasyPros
exposure analysis was investigation-only, no code) plus a full UI review and
fix batch (presentation-only, no engine/scoring change — same precedent as
items 133-135):
- **UI review** — audited every page at desktop (1440px) and mobile (375px)
  via the in-app browser + DOM contrast/focus/a11y checks. Rated ~7.5/10
  (strong on mobile, weak on desktop).
- `c6f3831` **quick wins**: global `:focus-visible` brand-accent (volt) ring
  replacing the browser-default blue; raised the flagged low-contrast labels;
  Trade "Analyze" disabled state → muted (not faded-volt) + a helper line;
  rankings rows drop the redundant per-row `(PPR)` so the projection number
  stops truncating.
- `9a8d25d` **desktop-width rework**: page headers were full-bleed while tools
  centered at inconsistent widths (2xl–7xl), leaving asymmetric voids on large
  screens. Gave each page header the same max-width as its tool (Rankings
  `max-w-5xl`, Trade/Lineup `4xl`, Backtest `5xl`, Waivers/Start-Sit already
  wide, Home capped `6xl`) so header+content align and center. Verified
  aligned/centered/no-overflow at 1440px; mobile unaffected (`max-w` >
  viewport = full width).
- `57fa698` **P2 polish**: glass cards more solid (`--surface` 44%→72%, blur
  26→16px) so hierarchy stops flattening; Home "Top five" score bars widen on
  md/lg to close the name→score gap; Start/Sit + Trade section labels →
  `<h2>`; extended the disabled-CTA fix to Start/Sit + Lineup. (Dropped the
  "condense rankings toggles" review item — no clean win; desktop was already
  one row and mobile's three are inherent to three multi-option controls.)
- `c043aef` **AA contrast sweep**: re-running the audit confirmed the fixes
  held but surfaced a systemic pattern — muted text app-wide at
  `text-foreground/40–/45` (~3.8–4.1:1, just under AA). Swept all to `/55`
  (~5.5:1) across components + the rank numbers. Re-audit: 0 low-contrast
  failures on Rankings (was 100)/Home/Trade; focus ring confirmed volt.

The numbered open items below are unchanged from prior sessions except:
**new Open Item #33 added** (FantasyPros/SDIO/nflverse licensing — see item
153). Nothing else below is started or fixed unless its own entry says so.

The paragraph below is the PRIOR session's record (items 149-150), kept for
context — its "as of item 150" framing and HEAD `cd7f26e` are historical:
**That session was fully committed and pushed to `main` (HEAD `cd7f26e`),
working tree CLEAN.** Two engine items (149, 150 — written up above) plus a
batch of UI/functional changes (committed, no numbered items, same precedent
as items 133-135). In commit order after the prior session's handoff
(`b921a2c`):
- **Small Home/sidebar copy**: rename Home rankings heading to "Top five
  players" (`cee5b12`); uppercase HALF/STD in the sidebar scoring control
  (`40b51a7`); trim Home `<h1>` to "FANTASY TOOLKIT" (`787b4f1`).
- **Start/Sit cold-start perf** (`58d3c08`): the first compare after a Vercel
  deploy (which wipes the persistent Data Cache) was blocking on two heavy
  nflverse parses — the depth-chart file (confidence floor only) and the
  play-by-play red-zone aggregate (WR drop-rate only). Timeout-guarded both
  (`withColdTimeout` in `lib/cache/liveAggregates.ts`, `COLD_FETCH_TIMEOUT_MS`)
  so the request returns fast and the real parse finishes via `after()`,
  warming the cache for the next request (self-healing). Extended to ALL live
  routes (`e7e5138`) — trade/lineup/waivers/rankings/trade-suggestion all
  share the play-by-play parse; only compare had the guard. Neither dropped
  signal changes the actual pick. Also deferred the display-only betting props
  to a client-side `/api/props` fetch after the verdict renders (was committed
  earlier, `2ddaaa0`, prior session).
- **"Calculating" number animation** (`1e52771`, extended `b7a1381`): new
  shared `CountUpNumber.tsx` — hero numbers scramble around the answer with a
  decaying jitter and settle on mount (SSR-safe, respects
  prefers-reduced-motion). Wired into Start/Sit (confidence % + projections),
  Trade (net value), Lineup (projected total), Waivers (spotlight stats).
- **Auto-scroll to results** (`96b76f3`, `b7a1381`): Start/Sit, Trade, Waivers,
  Lineup each scroll their result into view on render (`scroll-mt-24` clears
  the mobile top bar).
- **Start/Sit "Opponent" line** (`9b45f94`, moved into the Status column
  `2c1f1a9`): each skill card states how many points the next opponent's
  defense has allowed per game to that position, in the selected format
  (reads `matchupContext.allowedPerGame`, already format-aware). Lives in the
  Weather/Status aside.
- **Mobile dropdown z-index fixes** (`ac300b9` Start/Sit, `852109d` Trade): the
  search panels' `backdrop-blur-xl` created a stacking context with no
  z-index, so the open player-search dropdown was painted over by the Recent-
  comparisons rail / the trade result below. Added `relative z-20` to each
  search card. Audited the other tools — Backtest (plain containers) and the
  roster modal (picker is last, not clipped) don't have the issue.
- **Home tool-card copy** (`8f9f73d`): replaced the corny rhetorical-question
  titles ("Who should you start?" etc.) with plain value statements, matching
  item 127's page-heading fix; tightened descriptions; corrected the Rankings
  card, which overclaimed "every player" (it shows the top per position + the
  Top 100).
- **Waivers: gate D/ST and K on league slots** (`df41f44`): a connected
  Sleeper league that doesn't roster a DEF/K slot no longer gets D/ST/K
  targets. New `streamingPositionFlags(rosterPositions)` in
  `lib/lineup/rosterSlots.ts` (both true when slots unknown — manual rosters
  unchanged) → `includeDst`/`includeK` query params on `/api/waivers`, used by
  the Waivers page AND the Home widget. The route omits the excluded positions
  AND skips their scan (the 32-team D/ST scan is the expensive one — a perf
  win too).
- **Waivers: top 10 per position** (`bb19a99`): `CANDIDATES_PER_POSITION`
  6→10 in both `rankCandidates.ts` and `rankExtendedCandidates.ts`. Same
  commit fixed the Favorable/Tough matchup pill overlapping the GapBar labels
  at intermediate desktop widths (kept the gap bar on its own full-width row
  until `lg` instead of `sm`, so pill and labels never share horizontal
  space).
- **Removed the Home newsletter signup** (`cd7f26e`): deleted
  `NewsletterSignup.tsx` and the unused `/api/subscribe` route (never wired to
  a provider). Makes former Open Item #21 obsolete (see below).

Engine current best pooled 2022-2025: ~58.6% PPR / 57.6% Half-PPR / 58.9%
Standard (unchanged since item 150). Open-item deltas this session: **#31
RESOLVED** (item 150), **#32 ADDED** (`05a6539`, ESPN/Yahoo roster import),
**#21 now OBSOLETE** (newsletter removed), **#29 partially done** (cold-fetch
guard shipped on all routes + betting-props deferral done; a Vercel Cron
warmer and the real production before/after are what remain).

The paragraph below is the PRIOR session's record (items 142-148), kept for
context — its "as of item 148" framing and HEAD `645a438` are historical:

**That session shipped items 142-148 — all committed and pushed to
`main`, HEAD `645a438`, working tree CLEAN.** It began with small
UI polish (all committed, no numbered items, same precedent as items
133-135): trimming the repetitive tool name from each page's eyebrow +
dropping the title subheadings (`eb15679`), coloring the sidebar "Fantasy
Toolkit" tagline gold (`4519c12`), reformatting the Lineup starters from
separate cards into one consolidated row-list (`fca6ded`), and increasing
the Start/Sit verdict→first-card spacing (`408c69a`). Then, prompted by
"does the waiver target logic make sense," a run of waiver + engine work:
- **item 142** — waiver-ranking backtest (`c991f7e`) found the shipped
  "gap" ranking was no better than random; reframed the Waiver Wire tool
  around recent volume (studs excluded, buy-low demoted to a tag).
  **Resolves Open Item #9.**
- **item 143** — unified the waiver "top target" between the Home widget
  and the page (value-over-replacement) + roster-need weighting (`5fbb3ae`,
  doc `2521766`).
- **item 144** — per-position `VOLUME_BLEND_WEIGHT`; shipped RB=0 for PPR
  (`8bae42e`); Half-PPR/Standard swept + confirmed PPR-only (`b307e8c`).
- **item 145** — per-position `EXPERT_CONSENSUS_BLEND_WEIGHT`; shipped
  QB=0.8/TE=0.7, a clean no-tradeoff win (QB now leans 80% on consensus)
  (`f463271`).
- **item 146** — post-consensus re-sweep of the remaining active weights:
  WR drop rate 0.2→0.3, TE snap 0.4→0.2 PPR; QB rush confirmed at 0.3
  (`be20913`).
- **item 147** — dynamic consensus weighting by data quality: tested and
  REJECTED (both directions hurt), no code, documented negative finding
  (`a55b2ff`).
- **item 148** — integrated air-yards share as a WR signal at 0.1
  (`645a438`) — a small clean both-pipeline win and the counterexample to
  this session's "consensus crowds out new signals" pattern.
The net engine state after this session: current best pooled 2022-2025 is
~58.6% / primary 2025 ~60% skill. Remaining threads flagged in item 148:
air-yards is PPR-only (Half-PPR/Standard unswept), and the RB=0 / TE-snap
changes were also PPR-only. The numbered open items below were NOT touched
this session except: **Open Item #9 fully RESOLVED** (item 142). Nothing
else below is started or fixed unless its own entry says so.

The paragraph below is the PRIOR session's record (items 136-141), kept
for context — its "as of item 141" framing and HEAD `014615b`/`cd97b87`
are historical:

**Item 141 (the Nash/volt + glass redesign) — committed and pushed to
`main`, HEAD `014615b` at that time, working tree CLEAN. The one open
thread carried out of that session is perf fix #2 (cap the heavy cold
fetches on `/api/compare` — see the end of item 141).** The paragraph
below is the session-before's record (items 136-140), kept for context —
its "as of item 140" framing and HEAD `cd97b87` are historical:

**Everything through item 140 was committed and pushed to `main` (HEAD
`cd97b87` at that time).** That session
shipped items 136-140 (each with its own numbered write-up above):
- item 136 (prior-season fallback → live tools) — `940e354`
- item 137 (Backtest tooling fully scoring-format-aware) — `fa1cd37`
- item 138 (uneven-trade valuation fix, `REPLACEMENT_PER_GAME`) — `fadabd9`
- item 139 (Legit Rankings offseason-consensus fix; Lamar back to QB #6) — `05f41e2`
- item 140 (Top 100 ranked by value-over-replacement) — `fbec298`, plus two
  same-day follow-ups documented inside item 140's entry: the Top-100 score
  re-normalization fix (`3403b2c`) and the consensus-blended cross-position
  VOR that fixed "Shough above Lamar" (`cd97b87`).
This session also did some Start/Sit "glassmorphism" DESIGN exploration up
front (published Artifacts only — the de-magazined/glass almanac full-page
mockup), which shipped NO code and was set aside ("take a break from
design"); the live app is unchanged by it, so it has no numbered item — same
precedent as item 135.
**The prior session (items 133-135) is committed and pushed to `main` (HEAD
before item 136 was `0e7b2eb`).** Items 133-134 are real shipped code (with
commit hashes inline in each entry); item 135 is design exploration that
shipped NO code — Artifacts only, the live app is unchanged. The numbered
open items below were NOT touched this session except as noted here —
nothing below is started or fixed unless its own entry says so. This
session's open-item changes: items **6, 14, 19 fully RESOLVED**; items **12,
15 PARTIALLY resolved** (12: Half-PPR/Standard done, D/ST-K + 2022-24 seasons
still open; 15: format-awareness done, skill-only + weeks-2-4 still open);
item **30 ADDED** (lean Legit Rankings harder on consensus — deferred by the
user). Item 5 (3+-player-per-side trade shapes) remains open/unbuilt.

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
**This session (items 112-122) — the app-wide editorial "almanac"
rollout plus a few follow-ups — is all committed and pushed to `main`
(HEAD `779f9c7`), working tree clean:** the almanac was extended to every
remaining page and the shell (`5866836` Trade + shared two-theme
foundation + pine/espresso sidebar + Start/Sit night edition, `66c2086`
Waivers, `8def0b8` Lineup, `266e6ee` Rankings, `faca7ca` sidebar rail +
mobile drawer, `18578d0` Home, `2605c6d` Backtest — this last one
resolves Open Item #28); then `a49c5e3` (Start/Sit "recent low/high"
relabel fix), a Fraunces heading-font experiment that was tried and
reverted with no repo artifact (item 120), `80715bb` (Start/Sit stat
hover tooltips), and `779f9c7` (Cinzel→Archivo engraved-label font).
**IMPORTANT for the design system:** the whole app is now editorial
(warm paper by day / espresso "night edition" by dark, via the shared
`--alm-*` tokens + `.matchup-page` skin); fonts are Jost display
(`--font-jost`), Archivo engraved labels (`--font-engraved`), Inter body,
JetBrains mono. The Overview/Conventions paragraphs describing the older
dark/emerald "data-grade" system (item 80) are now historical for
everything except the shared `AppShell` sidebar, which stays a constant
dark espresso rail by design. Everything above (items
96-122, all code and write-ups) is committed and pushed to `main` — the
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
6. **RESOLVED (item 137): the scoring-format toggle is now universal
   across the backtest tooling.** Item 51 made the nflverse-only backtest
   and every naive baseline format-aware; item 52 re-swept the active
   blend weights per format; item 137 closed the last actionable gap —
   `tradeBacktest.ts`/`multiPlayerTradeBacktest.ts` (the Trade Analyzer's
   own backtests) are now format-aware, and the Backtest UI gained a
   scoring-format control that threads the format into all four modes
   (which surfaced that the UI had never exposed format for ANY mode, not
   just trade). One non-actionable observation remains, NOT a to-do:
   Half-PPR/Standard whole-model pick accuracy still trails PPR's somewhat
   (primary pipeline: 55.2%/56.5% vs. 57.5%; pooled nflverse-only:
   55.3%/54.8% vs. 56.5%) — item 52 confirmed this isn't fixable by
   further per-format weight tuning (RB signals, drop rate, and QB rushing
   terms all showed no real format-specific case), so the residual gap is
   structural (e.g. `blendedScore` itself, or `POINTS_PER_*` conversion
   factors interacting with position pools differently per format), an
   inherent property of a PPR-tuned engine rather than an unfinished task.
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
9. **The Waiver Wire ranking backtest — RESOLVED, see item 142.** The gap
   ranking WAS finally graded as a ranking heuristic: it was no better than
   random on real forward production, `residual` beat it every season but
   still trailed, and plain volume-rank won by ~2-3 PPG. The tool was
   reframed around recent volume as a result (studs excluded via
   `STARTABLE_TIER_DEPTH`, buy-low demoted to a tag). One related thread
   stays open: `suggestDrop.ts`'s drop-candidate suggestion is
   same-position only — no flex-spot cross-position logic (mirrors the same
   scoping decision the Trade Analyzer never needed to make, since it's
   user-driven there) — a candidate for a dedicated pass if this tool gets
   real usage.
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
    - **Half-PPR/Standard — RESOLVED (item 137).** The projection route
      already accepted `scoringFormat`; item 137 added the Backtest UI's
      scoring-format control that threads it, so Half-PPR/Standard
      projection accuracy is now user-accessible and verified (2025 RB:
      Half MAE 6.24/bias +1.08, Standard 6.32/+1.59, vs. PPR 6.45/+0.35).
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
14. **RESOLVED (item 136): the prior-season fallback is now wired into
    the live tools.** All five live scoring routes (`/api/compare`,
    `/api/trade`, `/api/lineup`, `/api/waivers`, `/api/trade-suggestion`)
    fetch `getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason
    - 1, format)` once per request and thread it through
    `scoreExtendedPlayer` (and `suggestDrops`/`suggestLeagueTrade`), the
    same trailing-optional-param pattern expert consensus already used.
    Confirmed reachable (`getScorablePlayerById`'s `isRosterable` branch
    resolves a rostered zero-current-season player) and a proven no-op for
    every player with any current-season data. Deliberately skipped the
    two no-op call sites (rankings, waiver-candidate detail — both gate on
    recent games, so the fallback could never fire there). No longer open —
    see item 136.
15. **The prior-season fallback is skill-positions-only** (D/ST and K use
    their own scorers, which have no blendedScore fallback branch). As of
    item 136 the live wiring IS format-aware (the prior-season average is
    computed in the selected scoring format), so the "PPR-derived only"
    part of this item is closed for the live tool. Still untested: whether
    the fallback should ever partially blend into weeks 2-4
    (thin-but-nonzero current-season samples) rather than only firing on a
    strict zero — item 67 deliberately scoped this to the narrowest fix
    that answers "why can't you project week 1," not a reweighting of the
    `RECENT_WEIGHT` formula, which would need its own real backtest sweep.
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
19. **RESOLVED (item 138): uneven-trade over-valuation is fixed.** A
    replacement-level roster-spot normalization (`REPLACEMENT_PER_GAME` in
    config.ts, position-aware/format-aware, derived from the 2025
    startable-pool cutoff) now credits the shorter side a waiver-level
    filler for the count difference, in both `evaluateTrade.ts` (live,
    with a `rosterNote` surfaced in the UI) and `multiPlayerTradeBacktest.ts`
    (backtest, applied to both projection and actual). Even-count trades
    (1-for-1 / 2-for-2) are byte-identical; the live 2-for-1 verdict is now
    fair (a stud + a freed waiver spot correctly beats two mid players), and
    the backtest's naive "more players" heuristic correctly collapsed to
    17.7% (was 61.2%). One honest residual, NOT a to-do: the 2-for-1
    backtest's 80.5% is dominated by the (correct) consolidation-value
    signal rather than isolating per-player projection skill, so 2-for-2
    (55.5%) stays the clean skill measure — the primary win here is the
    live tool. **Still unbuilt (see #5)**: 3+-player-per-side shapes beyond
    2-for-2/2-for-1.
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
21. **OBSOLETE — the Home newsletter signup was removed (commit `cd7f26e`).**
    `NewsletterSignup.tsx` and the `/api/subscribe` route were deleted (the
    signup band was never wired to a provider). If a newsletter signup is
    wanted again later, it's a fresh build, not a wiring task — so this item
    is closed rather than pending. (Original text, for context: the band
    POSTed to `/api/subscribe`, which forwarded to an unset
    `NEWSLETTER_FORM_ENDPOINT` env var and returned an honest "signup isn't
    connected yet" — it just needed the provider's form-POST URL, blocked on
    which platform Legitfootball runs on.)
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
24. **Player props are display-only, and now confirmed un-backtestable from
    a SECOND vendor (items 98, 177).** As of item 177 the lines come from
    SportsDataIO's `PlayerPropsByWeek`, not The Odds API — better on every
    axis that matters for display (whole-season coverage in August where the
    free Odds API tier had none, keyed by PlayerID so no name join, no
    monthly quota). `src/lib/oddsapi/` and `ODDS_API_KEY` are deleted.
    **What stays open is unchanged**: historical props 401 on every key and
    host, so a props-derived SIGNAL (a passing-yards or rush-attempt line is
    a more direct usage measure than target share) still cannot be
    backtested. That's now confirmed from two independent vendors rather
    than assumed from one. Two smaller follow-ups: the populated card has
    only ever been verified against 2026 week-1 lines, so it wants a real
    in-season check once games start; and whether the flat feed's lines are
    live book consensus or SportsDataIO's own modelled numbers is not
    determinable from the payload (the Sportsbook Group family IS
    unambiguously per-book — see item 177).
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
28. **RESOLVED (items 112-118): the editorial "almanac" look now spans the
    whole app.** Every page (Start/Sit, Trade, Waivers, Lineup, Legit
    Rankings, Home, Backtest) is editorial in both a light and a "night
    edition" theme, and the sidebar was recolored to a constant dark
    pine/espresso rail — see items 112-118, plus item 116 (mobile drawer),
    120 (Fraunces heading experiment, reverted), 121 (stat tooltips), and
    122 (Cinzel→Archivo labels). The original map below is kept as the
    historical record of how it was approached; it is done. Original text:
    Right now only Start/Sit is editorial (warm paper / pine-green /
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
29. **Confirm the item-126 caching speedup on a real Vercel deploy, then
    do the two small remainders — the core is BUILT (item 126).** The
    persistent cache shipped as `src/lib/cache/liveAggregates.ts` using
    Next.js's Data Cache (`unstable_cache`), NOT Vercel Blob — the
    aggregated outputs fit Next's ~2MB entry limit (after columnar
    encoding for the two big raw arrays), so no external store was needed.
    Correctness is verified byte-identical (item 126). **Since then, a
    cold-fetch timeout guard was added on top of the cache (commits `58d3c08`
    / `e7e5138`): `withColdTimeout` / `COLD_FETCH_TIMEOUT_MS` in
    `lib/cache/liveAggregates.ts` bounds the two heaviest cold parses
    (depth-chart, play-by-play red-zone) so the FIRST request after a deploy
    (which wipes the Data Cache) returns fast and the real parse warms the
    cache via `after()` — applied to all live routes, not just compare. The
    betting-props deferral below is also DONE.** What's left:
    - **Confirm real cold/warm latency on a Vercel deploy** — this is the
      one thing that couldn't be measured locally (the shared dev server
      can't be restarted/read from this session). Expected ~13s cold →
      ~1-2s once the Data Cache is populated (the live floor is the two
      deliberately-kept-live volatile fetches: injuries ~1.35s + consensus
      ~1s, in parallel). Also worth a spot-check that a live compare
      returns an identical pick/`finalScore` to before (should — the
      byte-identical verification already proves the inputs are unchanged).
    - **DONE — Defer the display-only betting props** (The Odds API) to a
      client-side `/api/props` fetch after the verdict renders (`2ddaaa0`),
      so the Odds API round-trip never delays the comparison. A no-op right
      now (offseason → props empty), a real in-season UX win.
    - **OPTIONAL: a Vercel Cron warmer** — largely unnecessary because
      `unstable_cache`'s stale-while-revalidate serves the stale value fast
      while refreshing in the background, so users only ever eat the cold
      parse on the very first population. Add only if the first-hit-after-
      revalidate cost proves noticeable in practice.
    - **Watch (residual tradeoffs)**: the 24h `revalidate` bounds
      freshness for the CACHED sources (fine — they're finalized weekly
      data, and the game-day-volatile ones are kept live); and nflverse
      schema drift (LAR/LA, `season_type`/`game_type` — the doc has
      several) would now surface as a cache miss / stale entry rather than
      a loud request-time error. **Vercel Blob/KV is no longer needed** —
      dropped from this item.
30. **Legit Rankings could lean harder on the consensus (deferred from item
    139, user's call) — and the source has since changed.** As of item 174
    the season-long half of the Legit Score is SportsDataIO's own season
    PROJECTION (points), not FantasyPros' redraft RANK, which also removed
    the `FP_NORMALIZATION_CAP` hack that existed only because ranks
    normalize badly. Item 175 then made the engine's half smarter (expected
    points). The open question is unchanged in substance: `ENGINE_WEIGHT`
    (0.65 at full data) and `SEASON_ENGINE_WEIGHT` (0.25) are reasoned
    defaults with no ground truth to tune against, and lowering the engine
    share would track the market more closely at the cost of the app's own
    view. A related, subtler lever if revisited: `dataQuality: "full"`
    over-trusts a full-but-unrepresentative sample (an injury-shortened
    season counts as "full"), so a disagreement-aware weight would target
    that more precisely than a flat change.
31. **RESOLVED in item 150** — air-yards non-PPR conversion factor is now
    per-format (`Record` {ppr:40.43, half_ppr:33.16, standard:25.87}), with
    Half-PPR weight 0.15 (a real signal at drop 0.4, both pipelines up) and
    Standard weight 0 (genuinely nothing; its pre-fix primary edge was the
    conv-factor artifact). The original write-up below is kept as the record
    of the bug. **Air-yards non-PPR used the wrong (PPR) conversion factor —
    a latent bug surfaced but deliberately NOT fixed in item 149.**
    `POINTS_PER_AIR_YARDS_SHARE_UNIT_WR` (40.43) is a plain PPR-derived
    scalar, and `AIR_YARDS_SHARE_BLEND_WEIGHT` (0.1) is also a scalar, so in
    Half-PPR and Standard the air-yards modifier blends the running score
    toward a PPR-SCALED estimate (~1.5x too large for Standard's lower point
    scale). Item 149 recomputed the correct per-format factors (half 33.16,
    std 25.87 off the shipped 40.43 × the measured format ratio) and found
    that with the CORRECT factor air-yards adds essentially nothing to either
    non-PPR format — it's a reception-correlated PPR signal. Two ways to fix,
    neither a clean transfer (why it wasn't shipped): (a) make the weight
    PPR-only (`Record` {ppr:0.1, half_ppr:0, standard:0}) — clean for
    Half-PPR (both pipelines up slightly) but costs ~1pp primary-2025
    Standard WR, and that primary "loss" is removing a conv-artifact "gain",
    not a real signal; (b) make the CONVERSION FACTOR a per-format `Record`
    (like `POINTS_PER_DROP_RATE_UNIT`/`POINTS_PER_SNAP_SHARE_UNIT_TE` already
    are) and keep weight 0.1 — corrects the scaling, and the sweep showed
    that also lands air-yards at ~zero marginal value for non-PPR. Cleanest
    is probably (a): air-yards is genuinely a PPR-only signal (item 148's own
    scoping), so disabling it for non-PPR is honest even at the small primary
    cost. Left for a deliberate decision since it's a real (if tiny)
    tradeoff, not a clean win. The live/pooled numbers today reflect the
    buggy state (weight 0.1 × PPR factor 40.43) on non-PPR, so revisiting
    this also slightly moves those baselines.
32. **Roster import from platforms other than Sleeper (ESPN, Yahoo, etc.)
    — deferred, not started.** Sleeper (item 59) was chosen because it's
    uniquely easy: a fully public, free, no-auth read API keyed by
    username. Every other platform is a meaningfully bigger lift, and the
    notes below are from general knowledge — verify each live before
    building, since these APIs change without notice:
    - **ESPN** — biggest user base, cheapest to prototype, so the
      recommended NEXT one if this is picked up. Unofficial JSON endpoint
      (`fantasy.espn.com/apis/v3/games/ffl/seasons/...`), keyed by **league
      ID** (not a username). Public leagues read with no auth; **private
      leagues** (most of them) need the user to copy two cookies from their
      browser — `espn_s2` and `SWID` — and paste them in. No official/
      supported API, and ESPN has broken the endpoint before. Doable,
      moderate effort, clunky private-league UX.
    - **Yahoo** — has an *official* Fantasy Sports API, but requires full
      **OAuth2**: register an app with Yahoo, each user logs in through a
      Yahoo consent screen, then token storage/refresh. The most stable/
      legitimate non-Sleeper option but the heaviest build (auth flow) and
      heaviest UX. A larger, later project than ESPN.
    - **CBS** — OAuth-gated like Yahoo, smaller user base — low priority.
    - **NFL.com / NFL Fantasy** — platform discontinued/migrated; no
      reliable public API worth targeting.
    - **Verified live (item 157), superseding "from general knowledge"
      above for these two points:** (a) FantasyPros' own sync page lists
      Yahoo, ESPN, Sleeper and CBS as primary, plus a long tail
      (MyFantasyLeague, Fleaflicker, Fantrax, RT Sports, FFPC, FFWC,
      NFC/BB10s, FanStar, DataForce, FFReality, LeagueTycoon) **and an
      explicit "Other (Manual Import)"** — even a large commercial operation
      falls back to manual entry for part of the market, which is a useful
      sanity check on how solvable the long tail is. (b) Yahoo's developer
      page confirms **OAuth 2.0** with app registration, covers leagues/
      teams/players/matchups across NFL/MLB/NBA/NHL, throttles excessive
      use, forbids reverse-engineering or separating the underlying data,
      and — the part with UI consequences — **mandates attribution**:
      "Fantasy data provided by Yahoo Fantasy" plus their official logo,
      unmodified. Access is governed by an **API Access and Use Agreement**
      that was NOT read; there is no blanket non-commercial prohibition on
      the public page (unlike Sleeper), so treat commercial use as
      "not obviously prohibited" rather than permitted. See Open Item #33.
    - **The real cost of Yahoo isn't the API, it's what it drags in.**
      OAuth means a client secret, a registered redirect URI, and per-user
      access/refresh tokens. Refresh tokens shouldn't live in localStorage,
      so Yahoo would force this project's first genuine session/persistence
      layer — the exact thing the architecture has deliberately avoided (no
      database, no auth, everything in localStorage). That's the reason to
      rank it "cleanest experience, heaviest build," not the request
      shapes.
    - **Before building ANY of these, get data rather than guessing.** The
      newsletter has ~16k subscribers; a one-question poll ("which platform
      is your league on?") answers which integration is worth it far more
      cheaply than building the wrong one. Recommended in-session and not
      yet done.
    - **Common thread:** none match Sleeper's "just type your username" —
      every one needs a league ID + pasted cookies (ESPN) or a real OAuth
      login (Yahoo/CBS). The existing `lib/sleeper/resolveRoster.ts`
      name-based join to SportsDataIO PlayerIDs would be reused regardless
      of source (all these platforms have their own player IDs with no
      shared key to this app's SportsDataIO space, same as Sleeper). The
      stale "No league/team import integrations" line under Things to Avoid
      is already contradicted by the shipped Sleeper import — this item is
      about *additional* sources, not whether import is in scope.
33. **Data-source commercial-licensing decisions — FantasyPros, SportsDataIO,
    nflverse, Sleeper (opened by item 153, not started).** Four linked open
    decisions, in priority order. All four are LIVE in shipped code, so none
    of them is hypothetical:
    - **FantasyPros consensus (the trigger) — LARGELY CLOSED as of items
      161/174.** No live tool reads the community scrape any more: the weekly
      consensus moved to SportsDataIO projections (item 161) and the rankings
      blend followed (item 174). It survives ONLY in
      `loadRunNflverseOnly.ts`, the 2022-2025 backtest pipeline, because
      SportsDataIO's projections 401 for those seasons — so the residual
      exposure is a validation dependency, not a product one. The original
      analysis below stands as the record of what the fallback would cost.
      Original note: our consensus signal comes via
      the `dynastyprocess/data` community scrape, not a licensed feed — a real
      commercial-use risk. Item 153 quantified the fallback: losing it costs
      ~QB −14pp primary (unrecoverable) and ~−3pp overall (re-tuned), with RB
      recoverable by restoring `VOLUME_BLEND_WEIGHT.ppr.RB`. If we ever ship a
      FantasyPros-free build, the tested fallback = zero the per-position
      `EXPERT_CONSENSUS_BLEND_WEIGHT` **and** revert the consensus-dependent
      retunes (RB volume), then re-sweep every weight (they were all tuned with
      consensus present). Live-tool integration would also need the live
      current-snapshot path removed/replaced.
    - **SportsDataIO paid tier (the candidate fix):** could replace FantasyPros
      *only* via their **projections** product, and only if those projections
      are **historically backtestable** (point-in-time archive/replay) — the
      make-or-break question to confirm with them. Separately, confirm the free
      tier serves **live 2026 in-season weekly stats** (the foundational data);
      if not, a paid tier is needed to operate in-season regardless. A
      sales-call requirements checklist + inquiry email were drafted in-chat
      (not committed) — reuse them. Buying it is the user's action (account
      creation isn't something this assistant does).
    - **Sleeper — the most concrete of the four, because the restriction is
      explicit rather than unknown.** `docs.sleeper.com` states the API is
      "free to use for **non-commercial purposes**" and that "for commercial
      use of the Sleeper API, please reach out to us directly to discuss
      licensing" (read live, Aug 2026). This app ships Sleeper league import
      today (`src/lib/sleeper/`, item 59-60), and it's being built as a
      candidate tool for a newsletter with ~16k subscribers — so whether that
      counts as commercial is a question to put to Sleeper, not to assume
      either way. Cheapest of the four to resolve: one email, and Sleeper runs
      a partner program, so a small read-only integration may well be free.
      If the answer is no, the fallback already exists and is not fatal —
      manual roster entry via `PlayerMultiSelect` predates the Sleeper import
      (item 58) and still works; what's lost is one-click sync and the
      league-wide waiver exclusion (item 60), which would degrade to
      "your own roster only."
    - **nflverse (the larger, un-reviewed exposure):** feeds ~a dozen live
      signals + the entire 2022-2024 backtest, and is NOT substitutable by SDIO
      (no snap/target/air-yards at any tier). Its commercial-use terms have
      never been reviewed — arguably the bigger licensing question than
      FantasyPros. A proper exposure analysis for nflverse (which signals die/
      degrade/survive without it, what's substitutable) is unstarted; item 153
      flagged it as where a licensing review should actually start.
34. **Three UI review findings deliberately left undone (item 154).** All
    presentation-only, all ranked below what that item shipped:
    - **Home's three "This week" widgets sit empty in prime position.** The
      lineup / top-waiver-target / suggested-trade cards (item 77) occupy the
      first screenful above the tool grid, and for a user with no roster
      connected they're three honest-but-empty CTAs. The empty states are
      correct (this app's standing no-dummy-data rule), but the placement
      spends the best real estate on nothing. Options if picked up: collapse
      them into a single "connect your roster" band until a roster exists,
      or move the row below the tool grid until it has real content.
    - **The offseason "Betting lines" block reserves a full card section to
      say nothing.** `ComparisonResult.tsx` always renders the section for
      skill positions with a "lines post closer to kickoff" message — that
      was deliberate (item 98: a hidden-when-empty section is invisible for
      the ~6 weeks until props post, and the user specifically noticed its
      absence), so this is a real tradeoff, not an oversight. Worth
      revisiting only once real props exist in-season and the empty state
      stops being the common case.
    - **The stat-grid magnitude bars use fixed reference maxima**, so "full"
      doesn't communicate anything to the reader — a 52% success rate and a
      +0.14 EPA/dropback both render as near-full bars against invented
      scales. The displayed NUMBER is always real (that part is fine); it's
      the bar that implies a comparison it isn't making. A real fix would
      scale each bar against that position's actual distribution, which
      means deriving per-position reference points the same empirical way
      this app's conversion factors were derived — a small data task, not a
      styling one, which is why it wasn't bundled into item 154.

35. **SportsDataIO v3 — migration DONE (item 158); what's left is a
    subscription decision and one verification. Items 177/178 filled in the
    detail: the betting endpoints ARE entitled (and now ship, item 177), but
    injuries and depth charts are NOT, and 2025 is unreachable on the 2026
    key — see item 178 for the full requirements list and why the legacy key
    is load-bearing rather than legacy.** The engineering is
    finished: all eight readers are season-routed, verified on both paths.
    Remaining:
    - **Buy (or don't) the 2026 subscription.** The evaluation is free only
      through **15 Sept 2026**. If it lapses, the 2026 v3 path 401s and the
      app has no data source for the season — the legacy key covers 2025
      only. This is now the single biggest operational risk.
    - **Re-verify the v3 path against real regular-season data** once 2026
      week 1 completes. Item 158 could only verify against preseason, since
      the new key can't see 2025 and the legacy key can't see 2026. That
      week is also when the app switches over by itself, so do it then.
    - **Historical seasons (2022-2025) are paid and excluded from the
      evaluation** — their stated reason is that historical data is
      "one and done." Without them the SportsDataIO-based backtest pipeline
      (currently the PRIMARY validation pipeline, 2025) dies and validation
      falls back to nflverse-only. Survivable — that pipeline exists and is
      well-tested — but a real methodological downgrade, because item 53
      documented a signal that validated cleanly on one pipeline and
      REVERSED on the other. Get pricing (their contact, "Zach") before
      deciding.
    - **Flip the non-season endpoints to v3** (`Players`, `Teams`,
      `Timeframes`) once the 2026 plan is bought. Deliberately left on
      legacy by item 158 so an always-on path doesn't depend on an
      evaluation key. One-line change per reader; the v3 bases already
      exist.
    - **Untested, worth probing**: the Sportsbook Group betting endpoints
      (docs: `sportsdata.io/help/betting-endpoints-by-sportsbook-group`;
      this account's groups at `sportsdata.io/members/sportsbook-groups`).
      If they work they could replace The Odds API (item 98), currently on a
      500-request/month free tier.
    - **The prize, still unclaimed.** (1) Retiring the live tools' nflverse
      dependency — Open Item #33's largest exposure — since Advanced Metrics
      carries first-party snap share, target share, air yards, separation,
      red-zone/goal-line touches and drop rate. (2) Deleting the ~98MB
      play-by-play parse behind red-zone touches (items 27/125/126) and the
      ~554k-row depth-chart parse behind item 100's confidence floor — the
      Players feed carries `InjuryStatus` and `DepthOrder` directly. (3) New
      signals worth a real backtest IF history is purchased:
      `RouteParticipation`, `YardsPerRouteRun`, `ExpectedFantasyPoints`,
      `OpportunityShare`, `TargetQualityRating`.
    - **Bulk advanced metrics are 2026-ONLY. This is the blocker for
      advanced stats on a whole leaderboard, and it clears itself in
      September (see item 159).** Probed exhaustively rather than assumed:
      every bulk advanced path that EXISTS returns `401` for 2025 and `200`
      for 2026 — `AdvancedPlayerGameStats/{season}REG/{week}`,
      `AdvancedPlayerSeasonStats/{season}/{team}`,
      `AdvancedPlayerSeasonStats/{season}/all`. The 2026 calls come back with
      ZERO rows only because the season hasn't kicked off.
      `AdvancedPlayerGameStatsByWeek` and `AdvancedPlayerSeasonStatsByTeam`
      `404` — they don't exist under those names. So this is a season
      ENTITLEMENT, not a missing product, and no code change works around it.
      Three consequences worth having written down:
      (a) `AdvancedPlayerInfo/{PlayerId}` stays the ONLY 2025-reachable
      advanced path (item 155's quirk) — which is exactly why the player
      DETAIL pages carry advanced metrics and the LEADERBOARD does not;
      filling a 252-row WR table that way is 252 HTTP calls per page load.
      (b) Once 2026 week 1 completes, one call per week covers the whole
      league, and the leaderboard can move to first-party advanced data,
      retiring the nflverse name-join there. Do it in the same pass as the
      v3 regular-season verification above — same week, same data.
      (c) Header auth (`Ocp-Apim-Subscription-Key`) DOES work against
      advanced-metrics, closing item 155's "treat header auth as unknown,
      not disproven". It needs no special-casing in `client.ts`.
    - **The legacy key has no snap-count product by any route** — the `stats`
      package and `PlayerSeasonSnapCounts` both `404`, and none of
      `PlayerGameStatsByWeek`'s 81 fields carries snaps. So snap share and
      air-yards share genuinely cannot come from the legacy subscription;
      nflverse is the only league-wide source for those until 2026 lights up.
      **Target share and opportunity share are the exception — computable
      exactly from SportsDataIO alone**, with zero extra calls: sum
      `ReceivingTargets` (and `RushingAttempts`) per team across
      `PlayerSeasonStats`, then divide. Verified against nflverse and lands
      within ~1-2pp (Chase 30.4% vs 32.1%, McCaffrey 23.8% vs 23.4% — the gap
      is season-total vs per-game-average, not an error). Worth remembering
      as the no-dependency fallback if nflverse ever has to go (Open Item
      #33), and as a way to drop the name-join misses on that one column.
    - **Do not let the legacy subscription lapse** until 2026 data is
      flowing and verified in production. It is the only key serving the app
      today.
36. **RESOLVED (item 175): season-level advanced metrics now refine Legit
    Rankings.** Expected fantasy points per game feed the engine's half of
    the blend at 0.3, scoped to RB/WR/TE — QB was excluded after measuring
    that expected points track real production at r=0.92/0.91/0.96 for
    RB/WR/TE but only 0.66 at QB. Two mistakes were caught before shipping
    (the feed's expected points are a season TOTAL, and the first per-game
    version moved Lamar Jackson enough to be worth verifying) — see item 175.
    Still contingent on the advanced subscription surviving past 15 Sept.
37. **Re-validate the SportsDataIO consensus swap across seasons once
    2022-2025 projections are purchasable — the one real weakness in item
    161.** The swap is shipped on **single-season evidence** for the engine's
    single biggest lever (QB leans 80% on it). Verified live that
    `PlayerGameProjectionStatsByWeek` `401`s for 2022REG, 2023REG and
    2024REG on the current subscription and returns 200 only for 2025, so
    cross-season validation is impossible today. Items 24-30 are this
    project's long record of single-season tuning being misleading, so this
    is a genuine open risk, not a formality.
    - **What to do when history is available**: re-run the source swap and
      the per-position weight sweep against the pooled multi-season sample
      the way items 145/146 did, and check whether the conservative weights
      (`QB 0.8 / RB 0.9 / WR 0.5 / TE 0.9`) still hold. Specifically worth
      re-checking: whether RB really wants a weight near 1.0 — its 2025
      optimum sat on the boundary, which would mean the engine adds nothing
      to an RB's score, and that is either a real finding about RB or a
      single-season artifact.
    - **The ask is 2022-2025, not 2022-2024 (item 178).** 2025 is reachable
      ONLY on the legacy key — every 2025 path 401s on the 2026 key — so
      letting it lapse would delete the primary backtest pipeline entirely,
      leaving only nflverse, a different source from the one the live tools
      serve. Buying 2022-2024 alone would leave four seasons of history with
      a hole where the only SportsDataIO-validated season used to be.
    - **This is a much stronger case for buying historical access than YPRR
      was** (item 160, where the answer was "don't buy"): here the
      single-season evidence is favorable and the purchase would be
      confirming something promising rather than re-checking a rejection.
      Fold into the Open Item #35 pricing conversation.
    - **Second-order cost already accepted**: the pooled 2022-2025 pipeline
      still runs on FantasyPros, so the app's multi-season check no longer
      validates the consensus source the live tools actually use. Buying
      history would close that gap too, letting both pipelines run the same
      source.
    - **Revert path if it goes wrong**: `fantasypros/liveConsensus.ts` is
      kept and marked unused, the historical FantasyPros reader is still
      live for the nflverse pipeline, and the old weights are recorded in
      config.ts's comment (`RB 0.5 / TE 0.7`).

38. **RESOLVED in item 163** — the trade backtests now pass the full
    `sliceWeekData` arguments, so they grade the engine that actually ships
    (consensus included) rather than one without its largest signal. Pooled
    1-for-1 went 53.01% -> 61.40% and 2-for-2 54.35% -> 60.02%; every
    previously published trade-backtest figure is superseded. The dropped
    `format` argument, a second bug in the same call, is fixed too.

40. **Player names don't link to stats from the Waivers and Lineup rows —
    blocked on an interaction change, not a missing link (item 182).** Both
    render the whole row as a `<button>` so clicking anywhere expands the
    reasoning, and an `<a>` inside a `<button>` is invalid HTML. Two ways out:
    shrink the expand target to the chevron and let the row be a link, or keep
    the row clickable as a div with its own `onClick` plus `onKeyDown` for
    Enter/Space and a `role`/`tabIndex` so it stays keyboard-accessible. The
    first is simpler and makes expanding deliberate; the second preserves the
    big click target people are used to. Either way `PlayerLink` already exists
    and carries the D/ST guard, so the link itself is a one-liner — the work is
    entirely in the row. Same question applies to the Home rankings board, whose
    row already links to `/rankings`.

39. **`REPLACEMENT_PER_GAME` is a 1-QB-league table, so item 180's trade
    valuation under-values quarterbacks in superflex/2-QB leagues — not
    started.** Trades are now graded on value over replacement (item 180),
    which is correct for the standard case and a large improvement over raw
    points everywhere, but QB replacement is pinned at 17.47/game — the 12th
    QB, i.e. one starter per team. In a superflex or 2-QB league roughly twice
    as many QBs start, so the real replacement QB is far worse and an elite QB
    is worth much more than this model says. The app already knows the league's
    slots (`SlotType` includes `SUPER_FLEX`, and item 172 promoted slot config
    to a shared persisted store), so the data exists — but `evaluateTrade` takes
    no slot argument and `/api/trade` doesn't resolve them, so this is real
    threading work plus a second QB replacement level (derivable the same way:
    the ~24th QB's per-game average), not a constant swap. Same caveat applies
    to `suggestLeagueTrade`'s `tradeValue()`. Worth doing if superflex users
    turn up; harmless for the standard leagues the tool is built around.

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
  per-week-reader shape as `weeklyStats.ts`). **As of item 158 this
  directory is SEASON-ROUTED**: `seasonRouting.ts` (`V3_MIN_SEASON = 2026`,
  `usesV3()`, `seasonYearFromApiSeason()`) decides, per call, whether a
  season-scoped reader hits the legacy hosts with
  `SPORTSDATA_LEGACY_API_KEY` (2025 and earlier) or the v3 hosts with
  `SPORTSDATA_API_KEY` (2026+) — the two subscriptions cover DISJOINT
  seasons, so neither can serve both. `client.ts`'s `API_BASES` therefore
  pairs each base with the env var supplying its key (`fantasy`, `odds`,
  `scoresV3`, `statsV3`), and `sportsDataFetch` takes an optional
  `skipCache` for payloads whose caller immediately trims them.
  `boxScores.ts` (item 158) reads `BoxScoresFinal` — the Final-Only
  equivalent of `PlayerGameStatsByWeek` — and is the 2026+ source for
  THREE readers at once (`weeklyStats.ts`/`defense.ts`/`teamGameStats.ts`
  each take their slice from its `PlayerGames`/`FantasyDefenseGames`/
  `TeamGames`), which also retires the `odds` base for 2026+. It fetches
  with the shared cache bypassed and caches only the trimmed slices,
  because the raw response is ~12MB/week (item 27's memory lesson).
  `projections.ts` (item 161) reads SportsDataIO's own weekly point
  projections — the engine's consensus signal since it replaced the
  FantasyPros scrape — season-routed like every other reader (legacy host
  <=2025, the v3 `projectionsV3` package 2026+). `liveProjections.ts`
  (`getLiveProjectedPointsByPlayerId`) is its live, offseason-aware
  counterpart: the upcoming week's projection in-season, the coming
  season's projection divided by projected games between seasons, since
  there is no upcoming week then. `seasonProjectionMap.ts` (item 162)
  loads season-long projections keyed by PlayerID for rest-of-season trade
  valuation. `advancedMetrics.ts`
  (item 159) reads the NFL Advanced Metrics product via the per-player
  `AdvancedPlayerInfo/{PlayerId}` endpoint on its own key
  (`SPORTSDATA_ADVANCED_API_KEY`, base `advancedV3`) — the only advanced path
  that reaches 2025. `defenseTeams.ts` (item
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
  `SNAP_SHARE_BLEND_WEIGHT_TE` is *also* `Record<ScoringFormat, number>`
  as of item 52 (Standard 0.5 vs. PPR/Half-PPR's 0.4). `VOLUME_BLEND_WEIGHT`
  went further and is now `Record<ScoringFormat, Record<SkillPosition,
  number>>` (item 144) — after a per-position PPR sweep found the broad
  "volume is redundant now that expert consensus carries the score"
  hypothesis was a pooled-nflverse artifact that didn't transfer to the
  primary pipeline (QB craters without its volume weight there), EXCEPT for
  RB: `ppr.RB` is now 0 (form + consensus already capture RB value; item 44
  had already zeroed RB's red-zone/EPA terms for the same "over-signaled"
  reason), validated on both pipelines. QB/WR/TE stay at their format values
  (PPR/Half-PPR 0.9, Standard 1.0). A follow-up sweep confirmed RB=0 is
  PPR-only and does NOT transfer — Half-PPR RB stays 0.9, Standard RB stays
  1.0 (Standard's primary RB craters 56.9→49.0 at w=0; Standard RB points
  are yardage/TD-only, so touch-volume de-noises there where PPR receptions
  make it redundant). Every other weight (WR drop rate, both QB rushing
  terms) showed no format- or position-specific case and stayed a plain
  shared scalar.
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
  against every remaining opponent on their real schedule. As of item 162
  that extrapolation is then BLENDED 50/50 with SportsDataIO's season-long
  projection pro-rated to the games remaining (`blendRestOfSeason`,
  `REST_OF_SEASON_PROJECTION_BLEND` in `config.ts`) — extrapolation alone
  scored 58.33% on synthetic trades against the blend's 64.88%, because
  multiplying a recent-form-driven weekly score across ten games
  extrapolates hot and cold streaks. Falls back to whichever side exists,
  so a player the projection feed doesn't cover still gets the plain
  extrapolation. `toNflverseTeam`/`toSdioTeam` (the LAR/LA team-code mapping) are
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
- `src/lib/trade/` — `evaluateTrade.ts` (item 47), the Trade Assistant's
  evaluation layer. Deliberately thin: reuses `scorePlayer()`'s
  `finalScore` as a standalone per-player value (see item 47's
  architectural note) rather than introducing a second scoring model,
  and reuses `CLOSE_CALL_ABS_POINTS`/`CLOSE_CALL_RELATIVE_PCT` from
  `recommendation/config.ts` for the good/fair/bad threshold rather than
  a separately-tuned one — there's no backtest ground truth to tune a
  trade-specific threshold against yet. **As of item 180 it grades on
  VALUE OVER REPLACEMENT, not raw rest-of-season points** — every player's
  projection minus `REPLACEMENT_PER_GAME` for their own position over their
  own remaining games. `giveTotal`/`getTotal` stay RAW (they have to equal
  the sum of the player cards); `adjustedGiveTotal`/`adjustedGetTotal` are
  the VOR sums, and `adjustedGet - adjustedGive === netValue` always. The
  "roughly even" threshold still scales off the RAW totals, so the tolerance
  is unchanged in absolute points — only which difference is measured moved.
  `valueNote` (renamed from `rosterNote`) explains the adjustment whenever it
  moves the net by a point or more, and subsumes item 138/168's uneven-trade
  roster-spot note. Same-position trades are exactly unchanged.
  `suggestLeagueTrade.ts` uses the same currency via its own `tradeValue()`
  helper for every cross-position choice it makes (weakest lineup spot, best
  bench chip, closest-in-value target). The two trade BACKTESTS deliberately
  stay on raw points — they grade a different question (which side actually
  outscores the other, where raw points are the ground truth), so they are
  untouched by this and remain byte-identical.
- `src/lib/waivers/` — the Waiver Wire tool's evaluation layer (item 58).
  `rankCandidates.ts` does a cheap, bulk pass across the whole active
  player pool (NOT the full `buildComparisonInput`/`scorePlayer`
  pipeline — that's reserved for the few candidates actually surfaced).
  **As of item 142 it ranks by recent VOLUME among waiver-eligible
  players** (`DEFAULT_WAIVER_STRATEGY = "volume"`) — the
  startable/rostered tier (`STARTABLE_TIER_DEPTH`) is excluded on top of
  the caller's own rostered/league exclusions, and "buy-low" (production
  lagging volume, `residualScore > 0`) is a per-candidate tag, not the
  sort key — after a backtest of the ranking itself found the old "gap"
  sort no better than random on real forward production (item 142). The
  ranking is now split into a pure, data-injected core — `scoreWaiverPool`
  (builds the eligible pool per position, applying the volume + efficiency
  floors, with all metrics computed) plus `selectWaiverCandidates`
  (a strategy's gate/sort/slice) — so the live tool AND the waiver backtest
  run the identical logic (`gap`/`residual` stay selectable via
  `?rankBy=`). A real backtest earlier found trend/delta framing adds
  nothing over absolute level (see item 58), so this was never a trend
  signal. As of item 83, a candidate also has to
  clear a real yards-per-unit efficiency floor (`getEfficiencyStat`,
  `EFFICIENCY_FLOOR_RATIO=0.75`) against the position's real full-season
  baseline (`computeEfficiencyBaseline`, fed full-season
  `getPlayerSeasonStats` live or every game row through the cutoff in the
  backtest — a ratio-of-sums over hundreds of real
  attempts/touches/targets, not the thin recent-candidate pool a first,
  rejected version used) — closes a real false positive where a badly-
  performing backup QB forced into volume still ranked as a top target on
  the opportunity-vs-production gap alone. `buildWaiverReport.ts` runs the real
  engine for just the surfaced top-N candidates. It also computes each
  candidate's `waiverValue` (value over replacement: `recentVolumeAvg ×
  POINTS_PER_VOLUME_UNIT − REPLACEMENT_PER_GAME`, item 143) — the
  cross-position "best pickup" score that drives the single top-target
  spotlight/widget (position-fair, unlike raw volume/residual). It reuses
  `PlayerScoreBreakdown.notes` verbatim rather than inventing new copy
  (same discipline as `ComparisonResult.tsx`/`TradeResult.tsx`), with one
  filtered exception — `scorePlayer`'s WR-only handcuff note is dropped
  in favor of a plain roster-context line, since the shipped note always
  reads "worth roughly 0.0 extra points" (`TEAMMATE_OUT_BUMP_WEIGHT_WR`
  is zeroed, item 35) and reads as self-contradictory next to this
  feature's own context line. `suggestDrop.ts` reuses `lib/trade/`'s
  `evaluateTrade`/`toTradePlayerResult` and
  `recommendation/restOfSeason.ts`'s `projectRestOfSeason` verbatim — a
  drop+add is a 1-for-1 trade evaluation, not a new comparison
  mechanism. **As of item 181 the drop candidate is the least valuable
  player on your BENCH by value over replacement, any position** — not the
  worst rostered player at the pickup's own position, which on a shallow
  roster picked a STARTER and produced a suggestion the tool then graded
  "bad move". Needs the league's starting slots (an optional `slots` param
  on `/api/waivers`) to know who's benched, via `optimizeLineup`; returns
  nothing when the pickup doesn't beat that player. As of item 62,
  `suggestDrop.ts` scores both rostered players and pickup candidates through
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
- `src/lib/stats/` — the player stat pages' data layer (item 159), read-only
  over data the app already fetches; nothing here feeds scoring.
  `leaderboard.ts` builds a position's season table from ONE
  `PlayerSeasonStats` call (which carries team/position too — the only join
  is onto the player list for full display names). `playerStats.ts` builds a
  single player's season totals + week-by-week game log, assembling weeks in
  bounded batches of 4 because SportsDataIO has no per-player season endpoint
  on this plan (both plausible paths 404) and firing all 18 at once is item
  27's memory-pressure shape. `columns.ts` is shared, client-safe (no
  `server-only`) column definitions — a column is a FUNCTION of the row, not
  a plain key, so derived rates (catch %, yards per target) sit alongside
  stored ones and sorting reads both through the same accessor.
  `advanced.ts` aggregates SportsDataIO advanced rows for the detail page;
  `leaderboardAdvanced.ts` builds league-wide snap/target/air-yards share
  from nflverse for the browser. **The two advanced sources are different on
  purpose** — every BULK advanced path 401s for 2025, so only the per-player
  endpoint can serve a detail page and only nflverse can serve a 252-row
  table. See item 159 and Open Item #35; this collapses to one first-party
  source once 2026 has games.
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
  `averageDropRate`/`averageQbRushEpa`/`averageAirYardsShare` —
  `averageQbRushEpa` QB-only (reading the same `rushEpaPerPlay` field RB's
  EPA signal uses, just for a QB's own carries; see item 41),
  `averageAirYardsShare` WR-only (the shipped WR air-yards signal, item
  148)) —
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
- `src/lib/sportsdata/playerProps.ts` + `playerPropTypes.ts` — the
  Start/Sit cards' display-only betting lines (item 177, replacing the
  deleted `src/lib/oddsapi/`). Reads `PlayerPropsByWeek` off the `oddsV3`
  base; the types file deliberately has NO `server-only` import so the
  client card can `import type` it. Never touches `PlayerScoreBreakdown` or
  any scoring path — historical props 401 on every key, so props cannot be
  backtested and therefore cannot be a signal.
- `src/lib/sportsdata/teamColors.ts` + `src/components/Jersey.tsx` +
  `src/lib/useJerseyData.ts` + `/api/jersey-data` — the jersey avatars
  (item 179). Team colours and squad numbers are real; the number's ink
  colour is computed from the primary's relative luminance rather than taken
  from the feed. Wired through one lookup endpoint rather than six response
  types, because squad number and team colour are cosmetic and
  `PlayerScoreBreakdown` is a scoring type. `useJerseyData` is
  `useSyncExternalStore` over a module-level cache, so every jersey on a
  page shares one fetch.
- `src/lib/useRosterSlots.ts` — the user's starting-lineup shape, shared
  across Lineup, Waivers and the Home widgets (item 172). `null` means
  "never set", which is what lets a connected Sleeper league seed the answer
  while still letting an explicit edit win. `useEffectiveRosterSlots()` is
  the single definition of "what does this user's lineup look like" and
  memoizes, because its value lands in effect dependency arrays.
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
  fully format-aware too as of item 51 — `tradeBacktest.ts`/
  `multiPlayerTradeBacktest.ts` became format-aware in item 137, so every
  backtest is format-aware now (`format` defaults to `"ppr"` throughout,
  so untouched callers are unchanged). As of item
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
  `waiverBacktest.ts` (item 142) is a fourth parallel feature (route
  `/api/backtest/waiver-nflverse-multiseason`) — grades the Waiver Wire
  RANKING itself, not the engine: for each (season, cutoff) it ranks
  candidates through the real shipped core (`scoreWaiverPool`/
  `selectWaiverCandidates` from `lib/waivers/rankCandidates.ts`) and
  measures each surfaced candidate's actual forward production (mean PPG
  over the next 4 weeks), A/Bing volume vs. gap vs. residual vs. naive
  baselines across two pool variants (full vs. startable-tier-removed).
  Pooled 2022-2025 nflverse-only; validation-only/no-UI. Found the shipped
  gap sort was no better than random and drove the item-142 reframe.
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
  own. Two more optional params (session after item 150, commit
  `df41f44`): `includeDst`/`includeK` (default `true`) — a connected
  Sleeper league that doesn't roster a DEF/K slot passes `false`
  (computed client-side by `streamingPositionFlags` in
  `lib/lineup/rosterSlots.ts`, used by both the Waivers page and the Home
  widget), and the route then both OMITS that position from the response
  AND skips its scan in `rankExtendedWaiverCandidates` (the 32-team D/ST
  scan is the expensive one, so it's a perf win too). Skill and streaming
  candidate lists both surface up to 10 per position
  (`CANDIDATES_PER_POSITION = 10`, raised from 6 the same session).
  `src/app/api/sleeper/leagues` and `src/app/api/sleeper/roster`
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
  `src/app/api/stats` and `src/app/api/stats/[playerId]` (item 159 — the
  leaderboard and one player's season + game log; the latter carries
  `maxDuration = 30` since a cold cache means walking every completed week).
  `src/app/api/backtest/pair`,
  `src/app/api/backtest/broad` (also `scoringFormat`-aware, item 50),
  `src/app/api/backtest/broad-nflverse`,
  `src/app/api/backtest/pair-nflverse`,
  `src/app/api/backtest/broad-nflverse-multiseason`,
  `src/app/api/backtest/trade`, `src/app/api/backtest/trade-nflverse`,
  `src/app/api/backtest/trade-nflverse-multiseason` (the trade-backtest
  trio is items 48-49; the other nflverse-suffixed routes are items
  24/36/39 — all out-of-sample validation only),
  `src/app/api/backtest/waiver-nflverse-multiseason` (item 142 — grades
  the waiver ranking by real forward production, pooled 2022-2025),
  `src/app/api/backtest/
  projection` (item 65 — MAE/RMSE/bias grading, 2025/PPR/skill-only for
  now; `positions` and an optional `ids` param are independent — the
  route reads `positions` off the raw query value directly rather than
  through `parsePositionsParam`'s own default-to-all-positions
  behavior, specifically so an empty `positions` param can mean "run
  zero pool positions," not "give me everything," when the request is
  really just a player-specific lookup) — Route Handlers that
  orchestrate the lib layers above and return trimmed JSON (never proxy
  raw upstream payloads, never leak the API key).
- `src/components/` — `BrandPennant.tsx` (item 165 — the pennant logo,
  rendered from `public/legitfootball-pennant.svg` via `next/image`
  `unoptimized`, since a vector has nothing for the optimizer to resize and
  Next declines to process SVG without `dangerouslyAllowSVG`; the mark
  carries the wordmark itself, so it REPLACES rather than sits beside a
  text lockup). `AppShell.tsx` (item 64 — the persistent sidebar
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
  As of the session after item 150, `ComparisonResult.tsx` also renders an
  "Opponent" line in each skill card's Weather/Status aside — how many
  points the next opponent's defense allows per game to that position
  (`matchupContext.allowedPerGame`, format-aware) — and its hero numbers
  (confidence %, projections) animate via the shared `CountUpNumber.tsx`
  (a scramble-and-settle "calculating" effect, SSR-safe, honors
  prefers-reduced-motion). `CountUpNumber.tsx` is reused by
  `TradeResult`/`LineupResult`/`WaiverResult` for their hero numbers too,
  and each of those tools' page components scrolls its result into view on
  render (`scroll-mt-24`). As of item 64, `StartSitTool.tsx`
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
  `WaiverResult.tsx`'s exported `pickTopTarget`/`computeRosterNeedPenalty`
  (item 143) — the SAME helpers the Waiver page's spotlight uses, so the
  widget and page always agree on the top target (value over replacement,
  minus a roster-need penalty), rather than the old first-position-in-order
  pick. `RankingsTool.tsx`/
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
  computation. As of item 154, `RankingsTool.tsx`'s three toggle groups and
  `BacktestTool.tsx`'s mode/scoring/season groups both render through a
  shared `SegmentedControl.tsx` (a labeled pill group with a
  `tone: "primary" | "secondary"` — only a page's primary axis carries the
  accent, so several adjacent groups stop reading as one control with
  everything lit; `SCORING_FORMAT_OPTIONS` is exported from
  `ScoringFormatToggle.tsx` so neither page redeclares the option list),
  and `RankingsResult.tsx`'s rows carry desktop-only matchup and
  score-meter cells plus the shared `--pos-*` position-colored avatar.
  `StatsBrowser.tsx`/`PlayerStatsView.tsx` (item 159 — the sortable
  leaderboard at `/stats` with a search filter and a Standard/Advanced
  column toggle, and the per-player page at `/stats/[playerId]` with the
  same toggle on its game log; rows with no value always sort LAST in both
  directions, since "—" is missing data rather than a low score). And
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
- `npm run build` — production build. **If a dev server is running on this
  same directory, building in place fights it over `.next`.** To build
  without disturbing it, copy the project to a scratch dir (excluding
  `node_modules`/`.next`/`.git`), **hardlink** node_modules across with
  `cp -al` (~7s, no real disk cost — `/private/tmp` and the project are on
  the same APFS volume), and run `npx next build` there. Do NOT symlink
  `node_modules`: Turbopack rejects it outright with "Symlink
  [project]/node_modules is invalid, it points out of the filesystem root."
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
