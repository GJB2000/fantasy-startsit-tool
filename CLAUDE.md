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
  - Injury status (Questionable/Doubtful/Out) — flag prominently, but
    don't treat "Questionable" as an automatic bench
  - [Add more factors here as they're decided]
- When it's a close call statistically, say so. Don't force false
  confidence.
- Every recommendation must include a short, human-readable "why."

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
  engine (`engine.ts`, `config.ts`, `types.ts`) plus two bridging files
  that are the only impure pieces: `buildInput.ts` (live mode) and
  `buildBacktestInput.ts` (backtest mode, fully synchronous — reads
  from a pre-fetched batch instead of making its own calls). Both feed
  the *same* unmodified `scorePlayer`/`comparePlayers`. Tunable weights
  live in `config.ts` — adjust there as the logic gets tuned, per the
  Recommendation Logic Philosophy section above.
- `src/lib/backtest/` — the backtesting feature: `loadRun.ts` (the only
  network I/O — fetches every needed week once per request), `weekData.ts`
  (pure per-week slicing/aggregation from that batch), `grading.ts`
  (correct/incorrect/push/no_pick outcomes + accuracy summary),
  `pairing.ts` (broad-mode adjacent-rank pairing methodology),
  `runBacktest.ts` (orchestration), `config.ts`/`params.ts` (tunables,
  query parsing). Historical injury status is always treated as unknown
  in this mode — the archived data can't distinguish "Questionable but
  played" from a healthy player (see Data Source Notes).
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
