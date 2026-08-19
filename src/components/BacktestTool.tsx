"use client";

import { useState } from "react";
import type { BaselineId } from "@/lib/backtest/baselines";
import type {
  BacktestSummary as BacktestSummaryData,
  ConfidenceBreakdown,
  WeekGradeResult,
} from "@/lib/backtest/grading";
import type { ProjectionSummary as ProjectionSummaryData } from "@/lib/backtest/projectionGrading";
import type { PlayerProjectionDetail } from "@/lib/backtest/playerProjectionLookup";
import type { PlayerProjectionSummary } from "@/lib/backtest/runProjectionBacktest";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import type { TradeGradeResult } from "@/lib/backtest/tradeBacktest";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { BacktestCaveatNote } from "./BacktestCaveatNote";
import { BacktestSummaryView } from "./BacktestSummary";
import { BacktestWeekTable } from "./BacktestWeekTable";
import { PlayerMultiSelect } from "./PlayerMultiSelect";
import { ProjectionPlayerDetailView } from "./ProjectionPlayerDetail";
import { ProjectionPlayerTable } from "./ProjectionPlayerTable";
import { ProjectionSummaryView } from "./ProjectionSummary";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { TradeBacktestTable } from "./TradeBacktestTable";

type Mode = "pair" | "broad" | "trade" | "projection";
// Every season but 2025 runs against nflverse-only data, for every mode —
// see runBacktest()'s route selection. Single-pair mode resolves the
// SportsDataIO player selection into that season's nflverse name space
// server-side (see runBacktestNflverseOnly.ts), so the same search box
// works for every season.
type Season = "2025" | "2024" | "2023" | "2022";
const SEASON_OPTIONS = ["2025", "2024", "2023", "2022"] as const;
const ALL_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
// D/ST and K only have real backtest support on the primary 2025
// SportsDataIO pipeline (Broad mode only, not Trade analyzer) — see
// CLAUDE.md's D/ST & K backtest item. Kept as a separate list rather
// than folded into ALL_POSITIONS so Trade analyzer mode (which shares
// this same checkbox row) never renders them.
const EXTENDED_ONLY_POSITIONS = ["DST", "K"] as const;
const WEEK_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);
const AS_OF_WEEK_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 1);

interface PairResponse {
  weekResults: WeekGradeResult[];
  summary: BacktestSummaryData;
  baselineSummaries: Record<BaselineId, BacktestSummaryData>;
  baselineLabels: Record<BaselineId, string>;
  confidenceBreakdown: ConfidenceBreakdown;
}

interface BroadResponse {
  byPosition: Record<string, BacktestSummaryData>;
  overall: BacktestSummaryData;
  baselineSummaries: Record<BaselineId, BacktestSummaryData>;
  baselineLabels: Record<BaselineId, string>;
  confidenceBreakdown: ConfidenceBreakdown;
}

interface TradeResponse {
  overall: BacktestSummaryData;
  byPosition: Record<string, BacktestSummaryData>;
  results: TradeGradeResult[];
}

interface ProjectionResponse {
  overall: ProjectionSummaryData | null;
  byPosition: Record<string, ProjectionSummaryData> | null;
  baselineOverall: ProjectionSummaryData | null;
  baselineByPosition: Record<string, ProjectionSummaryData> | null;
  expertConsensusOverall: ProjectionSummaryData | null;
  expertConsensusByPosition: Record<string, ProjectionSummaryData> | null;
  byPlayer: PlayerProjectionSummary[] | null;
  playerDetail: PlayerProjectionDetail[] | null;
}

export function BacktestTool() {
  const [mode, setMode] = useState<Mode>("pair");
  // Reuses the app-wide scoring format (same global store the sidebar and
  // every live tool share) — flipping it re-runs the backtest in that
  // format. Every backtest route accepts a scoringFormat param.
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [season, setSeason] = useState<Season>("2025");
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(18);
  const [asOfWeek, setAsOfWeek] = useState(8);
  const [positions, setPositions] = useState<string[]>([...ALL_POSITIONS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairResult, setPairResult] = useState<PairResponse | null>(null);
  const [pairResultSeason, setPairResultSeason] = useState<Season>("2025");
  const [broadResult, setBroadResult] = useState<BroadResponse | null>(null);
  const [broadResultSeason, setBroadResultSeason] = useState<Season>("2025");
  const [tradeResult, setTradeResult] = useState<TradeResponse | null>(null);
  const [tradeResultSeason, setTradeResultSeason] = useState<Season>("2025");
  const [projectionResult, setProjectionResult] = useState<ProjectionResponse | null>(null);
  const [lookupPlayers, setLookupPlayers] = useState<PlayerSummary[]>([]);

  function addPlayer(player: PlayerSummary) {
    setPlayers((prev) => (prev.length >= 2 ? prev : [...prev, player]));
    setPairResult(null);
  }

  function removePlayer(playerId: number) {
    setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    setPairResult(null);
  }

  const MAX_LOOKUP_PLAYERS = 4;

  function addLookupPlayer(player: PlayerSummary) {
    setLookupPlayers((prev) => (prev.length >= MAX_LOOKUP_PLAYERS ? prev : [...prev, player]));
    setProjectionResult(null);
  }

  function removeLookupPlayer(playerId: number) {
    setLookupPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    setProjectionResult(null);
  }

  function togglePosition(position: string) {
    setPositions((prev) =>
      prev.includes(position) ? prev.filter((p) => p !== position) : [...prev, position]
    );
  }

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setPairResult(null);
    setBroadResult(null);
    setTradeResult(null);
    setProjectionResult(null);

    const weeks = `${weekFrom}-${weekTo}`;

    try {
      if (mode === "projection") {
        if (positions.length === 0 && lookupPlayers.length === 0) {
          setError("Select at least one position, or search for a player.");
          return;
        }
        const query = new URLSearchParams({ weeks, positions: positions.join(","), scoringFormat });
        if (lookupPlayers.length > 0) {
          query.set("ids", lookupPlayers.map((p) => p.playerId).join(","));
        }
        const res = await fetch(`/api/backtest/projection?${query}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setProjectionResult(data);
      } else if (mode === "pair") {
        if (players.length !== 2) {
          setError("Select two players to backtest.");
          return;
        }
        const ids = players.map((p) => p.playerId).join(",");
        const path = season === "2025" ? "/api/backtest/pair" : "/api/backtest/pair-nflverse";
        const query = new URLSearchParams({ ids, weeks, scoringFormat });
        if (season !== "2025") query.set("season", season);
        const res = await fetch(`${path}?${query}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setPairResult(data);
        setPairResultSeason(season);
      } else if (mode === "broad") {
        if (positions.length === 0) {
          setError("Select at least one position.");
          return;
        }
        const posParam = positions.join(",");
        const path = season === "2025" ? "/api/backtest/broad" : "/api/backtest/broad-nflverse";
        const query = new URLSearchParams({ weeks, positions: posParam, scoringFormat });
        if (season !== "2025") query.set("season", season);
        const res = await fetch(`${path}?${query}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setBroadResult(data);
        setBroadResultSeason(season);
      } else {
        if (positions.length === 0) {
          setError("Select at least one position.");
          return;
        }
        const posParam = positions.join(",");
        const path = season === "2025" ? "/api/backtest/trade" : "/api/backtest/trade-nflverse";
        const query = new URLSearchParams({ asOfWeek: String(asOfWeek), positions: posParam, scoringFormat });
        if (season !== "2025") query.set("season", season);
        const res = await fetch(`${path}?${query}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setTradeResult(data);
        setTradeResultSeason(season);
      }
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-5xl space-y-6">
      <BacktestCaveatNote season={season} showNflverseCaveat={season !== "2025"} />

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("pair")}
          className={`rounded-[3px] px-3 py-1.5 font-engraved text-[11px] uppercase tracking-[0.06em] transition-colors ${
            mode === "pair"
              ? "bg-accent text-accent-ink"
              : "border border-foreground/15 text-foreground/70 hover:border-foreground/25"
          }`}
        >
          Single pair
        </button>
        <button
          type="button"
          onClick={() => setMode("broad")}
          className={`rounded-[3px] px-3 py-1.5 font-engraved text-[11px] uppercase tracking-[0.06em] transition-colors ${
            mode === "broad"
              ? "bg-accent text-accent-ink"
              : "border border-foreground/15 text-foreground/70 hover:border-foreground/25"
          }`}
        >
          Broad (many pairs)
        </button>
        <button
          type="button"
          onClick={() => setMode("trade")}
          className={`rounded-[3px] px-3 py-1.5 font-engraved text-[11px] uppercase tracking-[0.06em] transition-colors ${
            mode === "trade"
              ? "bg-accent text-accent-ink"
              : "border border-foreground/15 text-foreground/70 hover:border-foreground/25"
          }`}
        >
          Trade assistant
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("projection");
            setSeason("2025");
          }}
          className={`rounded-[3px] px-3 py-1.5 font-engraved text-[11px] uppercase tracking-[0.06em] transition-colors ${
            mode === "projection"
              ? "bg-accent text-accent-ink"
              : "border border-foreground/15 text-foreground/70 hover:border-foreground/25"
          }`}
        >
          Projection accuracy
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-engraved text-[10px] uppercase tracking-[0.08em] text-foreground/55">
          Scoring format
        </span>
        <ScoringFormatToggle value={scoringFormat} onChange={setScoringFormat} editorial />
      </div>

      {mode === "projection" ? (
        <>
          <p className="text-xs text-foreground/55">
            2025 season only — how close the engine&apos;s own score comes to real points scored, not just
            whether it picked the right player. Scored in the selected format above.
          </p>
          <PlayerMultiSelect
            editorial
            label="Look up specific players (optional)"
            selected={lookupPlayers}
            onAdd={addLookupPlayer}
            onRemove={removeLookupPlayer}
            max={MAX_LOOKUP_PLAYERS}
          />
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-foreground/55">Season</span>
          {SEASON_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSeason(s);
                setPairResult(null);
                setBroadResult(null);
                setTradeResult(null);
              }}
              className={`rounded-[3px] px-3 py-1.5 font-engraved text-[11px] uppercase tracking-[0.06em] transition-colors ${
                season === s ? "bg-accent text-accent-ink" : "border border-foreground/15 text-foreground/70 hover:border-foreground/25"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="text-xs text-foreground/55">
            {season === "2025" ? "primary, tuned" : "out-of-sample validation (nflverse-only)"}
          </span>
        </div>
      )}

      {mode === "pair" && (
        <PlayerMultiSelect
          editorial
          selected={players}
          onAdd={addPlayer}
          onRemove={removePlayer}
          max={2}
          placeholder={(count) => (count === 0 ? "Search your first player…" : "Search your second player…")}
        />
      )}

      {mode === "trade" && (
        <div className="rounded-[3px] border border-info/40 bg-info/10 p-3 text-xs text-info">
          <strong>Scope:</strong> synthetic 1-for-1 trades only, generated the same way broad-mode
          start/sit pairs are (adjacent-rank pairs at each position, ranked as of the week below).
          Grades the trade analyzer&apos;s rest-of-season projection against what each player
          actually scored, summed, over the season&apos;s real remaining weeks.
        </div>
      )}

      {(mode === "broad" || mode === "trade" || mode === "projection") && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {ALL_POSITIONS.map((position) => (
              <label
                key={position}
                className="flex items-center gap-1.5 rounded-[3px] border border-foreground/15 px-2.5 py-1"
              >
                <input
                  type="checkbox"
                  checked={positions.includes(position)}
                  onChange={() => togglePosition(position)}
                />
                {position}
              </label>
            ))}
            {mode === "broad" &&
              season === "2025" &&
              EXTENDED_ONLY_POSITIONS.map((position) => (
                <label
                  key={position}
                  className="flex items-center gap-1.5 rounded-[3px] border border-foreground/15 px-2.5 py-1"
                >
                  <input
                    type="checkbox"
                    checked={positions.includes(position)}
                    onChange={() => togglePosition(position)}
                  />
                  {position === "DST" ? "D/ST" : position}
                </label>
              ))}
          </div>
          {mode === "broad" && season === "2025" && (
            <p className="text-xs text-foreground/55">
              D/ST and K run on a much simpler model than the skill positions — recent scoring plus one
              matchup signal, not a blend of a dozen. D/ST&apos;s own signal backtested strong; K&apos;s was
              weaker than just ranking kickers by season average. Only available on the 2025 season for now.
            </p>
          )}
        </>
      )}

      {mode === "trade" ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            As of week
            <select
              value={asOfWeek}
              onChange={(e) => setAsOfWeek(Number(e.target.value))}
              className="rounded-[3px] border border-foreground/15 bg-surface px-1.5 py-1"
            >
              {AS_OF_WEEK_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <span className="text-xs text-foreground/55">
            trades are built from data through this week, then graded against weeks {asOfWeek + 1}-18
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            Weeks
            <select
              value={weekFrom}
              onChange={(e) => setWeekFrom(Number(e.target.value))}
              className="rounded-[3px] border border-foreground/15 bg-surface px-1.5 py-1"
            >
              {WEEK_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <span className="text-foreground/55">to</span>
          <select
            value={weekTo}
            onChange={(e) => setWeekTo(Number(e.target.value))}
            className="rounded-xl border border-foreground/15 bg-surface px-1.5 py-1"
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setWeekFrom(1);
              setWeekTo(18);
            }}
            className="text-xs text-foreground/55 underline"
          >
            All weeks
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={runBacktest}
        disabled={loading || (mode === "pair" && players.length !== 2)}
        style={{ fontFamily: "var(--font-engraved)" }}
        className="w-full rounded-[4px] bg-accent px-4 py-3.5 text-[12px] uppercase tracking-[0.14em] text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "Running…" : "Run backtest"}
      </button>

      {error && <p className="text-sm text-bad">{error}</p>}

      {pairResult && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-foreground/55">
            Showing {pairResultSeason} results ({pairResultSeason === "2025" ? "SportsDataIO" : "nflverse-only"})
          </p>
          <BacktestSummaryView
            summary={pairResult.summary}
            baselineSummaries={pairResult.baselineSummaries}
            baselineLabels={pairResult.baselineLabels}
            confidenceBreakdown={pairResult.confidenceBreakdown}
          />
          <BacktestWeekTable weekResults={pairResult.weekResults} />
        </div>
      )}

      {broadResult && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-foreground/55">
            Showing {broadResultSeason} results ({broadResultSeason === "2025" ? "SportsDataIO" : "nflverse-only"})
          </p>
          <BacktestSummaryView
            summary={broadResult.overall}
            byPosition={broadResult.byPosition}
            baselineSummaries={broadResult.baselineSummaries}
            baselineLabels={broadResult.baselineLabels}
            confidenceBreakdown={broadResult.confidenceBreakdown}
          />
        </div>
      )}

      {tradeResult && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-foreground/55">
            Showing {tradeResultSeason} results ({tradeResultSeason === "2025" ? "SportsDataIO" : "nflverse-only"}) —{" "}
            {tradeResult.results.length} synthetic trade{tradeResult.results.length === 1 ? "" : "s"}
          </p>
          <BacktestSummaryView summary={tradeResult.overall} byPosition={tradeResult.byPosition} />
          <TradeBacktestTable results={tradeResult.results} />
        </div>
      )}

      {projectionResult && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-foreground/55">Showing 2025 results (SportsDataIO, PPR)</p>

          {projectionResult.playerDetail && projectionResult.playerDetail.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">
                Player lookup — projected vs. actual by week
              </h3>
              <ProjectionPlayerDetailView players={projectionResult.playerDetail} />
            </div>
          )}

          {projectionResult.overall && (
            <>
              <ProjectionSummaryView
                overall={projectionResult.overall}
                byPosition={projectionResult.byPosition ?? undefined}
                baselineOverall={projectionResult.baselineOverall ?? undefined}
                baselineByPosition={projectionResult.baselineByPosition ?? undefined}
                expertConsensusOverall={projectionResult.expertConsensusOverall ?? undefined}
                expertConsensusByPosition={projectionResult.expertConsensusByPosition ?? undefined}
              />
              <div className="space-y-2">
                <h3 className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">
                  By player (worst MAE first)
                </h3>
                <ProjectionPlayerTable players={projectionResult.byPlayer ?? []} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
