"use client";

import { useState } from "react";
import type { TradeEvaluation } from "@/lib/trade/evaluateTrade";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { PlayerSearchInput } from "./PlayerSearchInput";
import { TradeResult } from "./TradeResult";

const MAX_PER_SIDE = 4;

interface TradeResponse {
  evaluation: TradeEvaluation;
  context: { contextNote: string };
}

function PlayerChip({ player, onRemove }: { player: PlayerSummary; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          {player.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
        <span className="text-sm">
          <span className="font-medium">{player.name}</span>{" "}
          <span className="text-zinc-500">
            {player.position}
            {player.team ? ` · ${player.team}` : ""}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
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
      <h2 className="mb-2 text-sm font-semibold text-zinc-500">{label}</h2>
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
      const res = await fetch(`/api/trade?give=${give}&get=${get}`);
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
        className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
      >
        {loading ? "Analyzing…" : "Analyze trade"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {response && (
        <TradeResult evaluation={response.evaluation} contextNote={response.context.contextNote} />
      )}
    </div>
  );
}
