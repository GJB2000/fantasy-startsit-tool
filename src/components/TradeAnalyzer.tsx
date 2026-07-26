"use client";

import { useState } from "react";
import type { TradeEvaluation } from "@/lib/trade/evaluateTrade";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { PlayerSearchInput } from "./PlayerSearchInput";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { TradeResult } from "./TradeResult";

const MAX_PER_SIDE = 4;

interface TradeResponse {
  evaluation: TradeEvaluation;
  context: { contextNote: string };
}

function PlayerChip({ player, onRemove }: { player: PlayerSummary; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-surface px-4 py-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-xs font-bold text-accent">
          {player.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <span className="text-sm">
          <span className="font-semibold">{player.name}</span>{" "}
          <span className="text-foreground/50">
            {player.position}
            {player.team ? ` · ${player.team}` : ""}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1.5 text-foreground/35 transition-colors hover:bg-bad/10 hover:text-bad"
        aria-label={`Remove ${player.name}`}
      >
        ✕
      </button>
    </div>
  );
}

function TradeSide({
  label,
  players,
  otherSideIds,
  onAdd,
  onRemove,
}: {
  label: string;
  players: PlayerSummary[];
  otherSideIds: number[];
  onAdd: (player: PlayerSummary) => void;
  onRemove: (playerId: number) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{label}</h2>
      <div className="space-y-2.5">
        {players.map((player) => (
          <PlayerChip key={player.playerId} player={player} onRemove={() => onRemove(player.playerId)} />
        ))}
        {players.length < MAX_PER_SIDE && (
          <PlayerSearchInput
            onSelect={onAdd}
            excludeIds={[...players.map((p) => p.playerId), ...otherSideIds]}
            placeholder={players.length === 0 ? "Search a player…" : "Search another player…"}
          />
        )}
      </div>
    </div>
  );
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
        <TradeSide
          label="You give"
          players={givePlayers}
          otherSideIds={getPlayers.map((p) => p.playerId)}
          onAdd={addTo(setGivePlayers)}
          onRemove={removeFrom(setGivePlayers)}
        />
        <TradeSide
          label="You get"
          players={getPlayers}
          otherSideIds={givePlayers.map((p) => p.playerId)}
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
