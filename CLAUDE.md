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
  isn't reconstructable from this data source, which is why backtest
  mode always treats injury status as unknown rather than reading it.

## Recommendation Logic Philosophy
This is the most important section — the "brain" of the tool.
- Start with transparent, rules-based logic (not a black-box model).
  Every recommendation should be explainable in plain English.
- Factors to weigh (adjust weighting here as we tune it):
  - Recent performance (last 4 weeks) — weighted more heavily than
    season-long average
  - Opponent/matchup difficulty for the player's position
  - Recent volume/opportunity (targets for WR/TE, rushing attempts +
    targets for RB, pass attempts for QB) vs. a per-position reference —
    the single strongest signal found so far. See "Backtesting & Tuning
    History" below for the full validation story and why the weights in
    `lib/recommendation/config.ts` are set where they are.
  - Injury status (Questionable/Doubtful/Out) — flag prominently, but
    don't treat "Questionable" as an automatic bench
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
durable pattern — re-validate once a second season of data exists.

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
    than chased further, to avoid over-tuning to a single season).

## Voice & Tone
- This tool represents [Legitfootball]'s newsletter brand. Match that
  voice: [Clear, concise and simple].
- Explanations should read like a sharp, trusted friend giving advice —
  not a generic dashboard or a wall of stats.

## Conventions
- `src/lib/sportsdata/` — low-level SportsDataIO fetch client and typed
  data-access functions (`client.ts`, `players.ts`, `seasonStats.ts`,
  `weeklyStats.ts`, `byes.ts`, `timeframes.ts`, `positionDefense.ts`,
  `seasonToDatePlayerStats.ts`). Server-only (guarded via the
  `server-only` package) — never import this from a `"use client"` file.
  **Caching**: `client.ts` uses a simple in-process TTL `Map`, not Next's
  `fetch` Data Cache — several SportsDataIO endpoints (`/Players`,
  `/PlayerSeasonStats`, `/PlayerGameStatsByWeek`) return 4-6MB payloads,
  and Next's Data Cache silently refuses to cache anything over 2MB (it
  logs a warning and just re-fetches every time). The in-process cache
  works for any payload size but resets on cold starts — an accepted
  tradeoff at this app's scale rather than adding real cache infra.
- `src/lib/recommendation/` — the pure, framework-agnostic scoring
  engine (`engine.ts`, `config.ts`, `types.ts`, `volume.ts`) plus two
  bridging files that are the only impure pieces: `buildInput.ts` (live
  mode) and `buildBacktestInput.ts` (backtest mode, fully synchronous —
  reads from a pre-fetched batch instead of making its own calls). Both
  feed the *same* unmodified `scorePlayer`/`comparePlayers`. Tunable
  weights live in `config.ts` — adjust there as the logic gets tuned,
  per the Recommendation Logic Philosophy section above. `volume.ts`'s
  `getVolumeStat()` reads `ReceivingTargets`/`RushingAttempts`/
  `PassingAttempts` off `PlayerGameStat` — these fields were already
  present in every SportsDataIO response but unused until the volume
  signal was added; `sportsDataFetch()` casts the raw JSON rather than
  whitelisting fields, so extending `PlayerGameStat` in
  `sportsdata/types.ts` needed zero fetch/mapping changes anywhere.
- `src/lib/backtest/` — the backtesting feature: `loadRun.ts` (the only
  network I/O — fetches every needed week once per request), `weekData.ts`
  (pure per-week slicing/aggregation from that batch), `grading.ts`
  (correct/incorrect/push/no_pick outcomes + accuracy summary, plus
  `summarizeByCloseCall` for confidence-calibration checks), `baselines.ts`
  (naive strategies — prior-week points, season-to-date average — graded
  by the identical `gradeOutcome` rules as the engine, over the same
  weeks/matchups, so accuracy is directly comparable), `pairing.ts`
  (broad-mode adjacent-rank pairing methodology), `runBacktest.ts`
  (orchestration), `config.ts`/`params.ts` (tunables, query parsing).
  Historical injury status is always treated as unknown in this mode —
  the archived data can't distinguish "Questionable but played" from a
  healthy player (see Data Source Notes). Both API routes return
  `baselineSummaries` and `confidenceBreakdown` alongside the engine's
  own accuracy so results are never reported in isolation from a
  baseline/calibration check.
- `src/app/api/players`, `src/app/api/compare`, `src/app/api/backtest/pair`,
  `src/app/api/backtest/broad` — Route Handlers that orchestrate the
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
