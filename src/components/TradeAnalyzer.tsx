"use client";

import { useState } from "react";
import type { TradeEvaluation } from "@/lib/trade/evaluateTrade";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { PlayerMultiSelect } from "./PlayerMultiSelect";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { TradeResult } from "./TradeResult";

const MAX_PER_SIDE = 4;

interface TradeResponse {
  evaluation: TradeEvaluation;
  context: { contextNote: string };
}

export function TradeAnalyzer() {
  const [givePlayers, setGivePlayers] = useState<PlayerSummary[]>([]);
  const [getPlayers, setGetPlayers] = useState<PlayerSummary[]>([]);
  const [response, setResponse] = useState<TradeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringFormat, setScoringFormat] = useScoringFormat();

  function addTo(setter: typeof setGivePlayers) {
    return (player: PlayerSummary) => {
      setter((prev) => (prev.length >= MAX_PER_SIDE ? prev : [...prev, player]));
      setResponse(null);
    };
  }

  function removeFrom(setter: typeof setGivePlayers) {
    return (playerId: number) => {
      setter((prev) => prev.filter((p) => p.playerId !== playerId));
      setResponse(null);
    };
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const give = givePlayers.map((p) => p.playerId).join(",");
      const get = getPlayers.map((p) => p.playerId).join(",");
      const res = await fetch(`/api/trade?give=${give}&get=${get}&scoringFormat=${scoringFormat}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResponse(data);
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground/40">Scoring</span>
        <ScoringFormatToggle
          value={scoringFormat}
          onChange={(format) => {
            setScoringFormat(format);
            setResponse(null);
          }}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <PlayerMultiSelect
          label="You give"
          selected={givePlayers}
          max={MAX_PER_SIDE}
          extraExcludeIds={getPlayers.map((p) => p.playerId)}
          onAdd={addTo(setGivePlayers)}
          onRemove={removeFrom(setGivePlayers)}
        />
        <PlayerMultiSelect
          label="You get"
          selected={getPlayers}
          max={MAX_PER_SIDE}
          extraExcludeIds={givePlayers.map((p) => p.playerId)}
          onAdd={addTo(setGetPlayers)}
          onRemove={removeFrom(setGetPlayers)}
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={givePlayers.length === 0 || getPlayers.length === 0 || loading}
        className="mt-5 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "Analyzing…" : "Analyze trade"}
      </button>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {response && (
        <TradeResult
          evaluation={response.evaluation}
          contextNote={response.context.contextNote}
          scoringFormat={scoringFormat}
        />
      )}
    </div>
  );
}
