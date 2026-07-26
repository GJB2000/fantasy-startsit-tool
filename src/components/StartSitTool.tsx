"use client";

import { useState } from "react";
import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { ComparisonResult } from "./ComparisonResult";
import { PlayerSearchInput } from "./PlayerSearchInput";

const MAX_PLAYERS = 4;

interface CompareResponse {
  result: ComparisonResultData;
  context: { contextNote: string };
}

export function StartSitTool() {
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerSummary[]>([]);
  const [response, setResponse] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addPlayer(player: PlayerSummary) {
    setSelectedPlayers((prev) =>
      prev.length >= MAX_PLAYERS ? prev : [...prev, player]
    );
    setResponse(null);
  }

  function removePlayer(playerId: number) {
    setSelectedPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    setResponse(null);
  }

  async function handleCompare() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const ids = selectedPlayers.map((p) => p.playerId).join(",");
      const res = await fetch(`/api/compare?ids=${ids}`);
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
    <div className="mx-auto mt-10 w-full max-w-2xl">
      <div className="space-y-2.5">
        {selectedPlayers.map((player) => (
          <div
            key={player.playerId}
            className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
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
              onClick={() => removePlayer(player.playerId)}
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              aria-label={`Remove ${player.name}`}
            >
              ✕
            </button>
          </div>
        ))}

        {selectedPlayers.length < MAX_PLAYERS && (
          <PlayerSearchInput
            onSelect={addPlayer}
            excludeIds={selectedPlayers.map((p) => p.playerId)}
            placeholder={
              selectedPlayers.length === 0
                ? "Search your first player…"
                : "Search another player…"
            }
          />
        )}
      </div>

      <button
        type="button"
        onClick={handleCompare}
        disabled={selectedPlayers.length < 2 || loading}
        className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-600"
      >
        {loading ? "Comparing…" : "Compare"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {response && (
        <ComparisonResult result={response.result} contextNote={response.context.contextNote} />
      )}
    </div>
  );
}
