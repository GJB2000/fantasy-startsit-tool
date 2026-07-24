"use client";

import { useState } from "react";
import type { BaselineId } from "@/lib/backtest/baselines";
import type {
  BacktestSummary as BacktestSummaryData,
  ConfidenceBreakdown,
  WeekGradeResult,
} from "@/lib/backtest/grading";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { BacktestCaveatNote } from "./BacktestCaveatNote";
import { BacktestSummaryView } from "./BacktestSummary";
import { BacktestWeekTable } from "./BacktestWeekTable";
import { PlayerSearchInput } from "./PlayerSearchInput";

type Mode = "pair" | "broad";
// 2024 runs against nflverse-only data for both modes — see
// runBacktest()'s route selection. Single-pair mode resolves the
// SportsDataIO player selection into nflverse's 2024 name space
// server-side (see runBacktestNflverseOnly.ts), so the same search box
// works for both seasons.
type Season = "2025" | "2024";
const ALL_POSITIONS = ["QB", "RB", "WR", "TE"] as const;
const WEEK_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

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

export function BacktestTool() {
  const [mode, setMode] = useState<Mode>("pair");
  const [season, setSeason] = useState<Season>("2025");
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [weekFrom, setWeekFrom] = useState(1);
  const [weekTo, setWeekTo] = useState(18);
  const [positions, setPositions] = useState<string[]>([...ALL_POSITIONS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairResult, setPairResult] = useState<PairResponse | null>(null);
  const [pairResultSeason, setPairResultSeason] = useState<Season>("2025");
  const [broadResult, setBroadResult] = useState<BroadResponse | null>(null);
  const [broadResultSeason, setBroadResultSeason] = useState<Season>("2025");

  function addPlayer(player: PlayerSummary) {
    setPlayers((prev) => (prev.length >= 2 ? prev : [...prev, player]));
    setPairResult(null);
  }

  function removePlayer(playerId: number) {
    setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    setPairResult(null);
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

    const weeks = `${weekFrom}-${weekTo}`;

    try {
      if (mode === "pair") {
        if (players.length !== 2) {
          setError("Select two players to backtest.");
          return;
        }
        const ids = players.map((p) => p.playerId).join(",");
        const path = season === "2024" ? "/api/backtest/pair-nflverse" : "/api/backtest/pair";
        const query = new URLSearchParams({ ids, weeks });
        if (season === "2024") query.set("season", "2024");
        const res = await fetch(`${path}?${query}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setPairResult(data);
        setPairResultSeason(season);
      } else {
        if (positions.length === 0) {
          setError("Select at least one position.");
          return;
        }
        const posParam = positions.join(",");
        const path = season === "2024" ? "/api/backtest/broad-nflverse" : "/api/backtest/broad";
        const query = new URLSearchParams({ weeks, positions: posParam });
        if (season === "2024") query.set("season", "2024");
        const res = await fetch(`${path}?${query}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setBroadResult(data);
        setBroadResultSeason(season);
      }
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-2xl space-y-6">
      <BacktestCaveatNote showNflverseCaveat={season === "2024"} />

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("pair")}
          className={`rounded-md px-3 py-1.5 ${
            mode === "pair"
              ? "bg-foreground text-background"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Single pair
        </button>
        <button
          type="button"
          onClick={() => setMode("broad")}
          className={`rounded-md px-3 py-1.5 ${
            mode === "broad"
              ? "bg-foreground text-background"
              : "border border-zinc-300 dark:border-zinc-700"
          }`}
        >
          Broad (many pairs)
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-zinc-500">Season</span>
        {(["2025", "2024"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSeason(s);
              setPairResult(null);
              setBroadResult(null);
            }}
            className={`rounded-md px-3 py-1.5 ${
              season === s ? "bg-foreground text-background" : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="text-xs text-zinc-500">
          {season === "2025" ? "primary, tuned" : "out-of-sample validation (nflverse-only)"}
        </span>
      </div>

      {mode === "pair" && (
        <div className="space-y-3">
          {players.map((player) => (
            <div
              key={player.playerId}
              className="flex items-center justify-between rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2"
            >
              <span className="text-sm">
                {player.name}{" "}
                <span className="text-zinc-500">
                  {player.position}
                  {player.team ? ` · ${player.team}` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removePlayer(player.playerId)}
                className="text-sm text-zinc-500 hover:text-foreground"
                aria-label={`Remove ${player.name}`}
              >
                ✕
              </button>
            </div>
          ))}
          {players.length < 2 && (
            <PlayerSearchInput
              onSelect={addPlayer}
              excludeIds={players.map((p) => p.playerId)}
              placeholder={players.length === 0 ? "Search your first player…" : "Search your second player…"}
            />
          )}
        </div>
      )}

      {mode === "broad" && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {ALL_POSITIONS.map((position) => (
              <label
                key={position}
                className="flex items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 dark:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={positions.includes(position)}
                  onChange={() => togglePosition(position)}
                />
                {position}
              </label>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          Weeks
          <select
            value={weekFrom}
            onChange={(e) => setWeekFrom(Number(e.target.value))}
            className="rounded-md border border-zinc-300 bg-background px-1.5 py-1 dark:border-zinc-700"
          >
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <span className="text-zinc-500">to</span>
        <select
          value={weekTo}
          onChange={(e) => setWeekTo(Number(e.target.value))}
          className="rounded-md border border-zinc-300 bg-background px-1.5 py-1 dark:border-zinc-700"
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
          className="text-xs text-zinc-500 underline"
        >
          All weeks
        </button>
      </div>

      <button
        type="button"
        onClick={runBacktest}
        disabled={loading || (mode === "pair" && players.length !== 2)}
        className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
      >
        {loading ? "Running…" : "Run backtest"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {pairResult && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-zinc-500">
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
          <p className="text-xs font-medium text-zinc-500">
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
    </div>
  );
}
