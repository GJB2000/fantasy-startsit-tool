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
    <div className="mx-auto w-full max-w-2xl">
      <div className="space-y-3">
        {selectedPlayers.map((player) => (
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
        className="mt-4 w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
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
