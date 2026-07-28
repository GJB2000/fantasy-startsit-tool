"use client";

import { useState } from "react";
import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { useRecentComparisons } from "@/lib/useRecentComparisons";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { ComparisonResult } from "./ComparisonResult";
import { PlayerSearchInput } from "./PlayerSearchInput";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { StartSitRail } from "./StartSitRail";

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
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const { recent, addComparison } = useRecentComparisons();

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
      const res = await fetch(`/api/compare?ids=${ids}&scoringFormat=${scoringFormat}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResponse(data);
      const result: ComparisonResultData = data.result;
      const recommended = result.players.find((p) => p.playerId === result.recommendedPlayerId);
      addComparison({
        headline: result.headline,
        recommendedName: recommended?.displayName ?? null,
        otherNames: result.players.filter((p) => p.playerId !== result.recommendedPlayerId).map((p) => p.displayName),
        isCloseCall: result.isCloseCall,
        hasLimitedData: result.hasLimitedData,
      });
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-foreground/10 bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">Comparing</span>
            <ScoringFormatToggle
              value={scoringFormat}
              onChange={(format) => {
                setScoringFormat(format);
                setResponse(null);
              }}
            />
          </div>

          <div className="space-y-2.5">
            {selectedPlayers.map((player) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-surface-sunken px-4 py-3 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-sm font-bold text-accent">
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
                  onClick={() => removePlayer(player.playerId)}
                  className="rounded-full p-1.5 text-foreground/35 transition-colors hover:bg-bad/10 hover:text-bad"
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
            className="mt-5 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? "Comparing…" : "Compare"}
          </button>

          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        </div>

        {response && (
          <ComparisonResult
            result={response.result}
            contextNote={response.context.contextNote}
            scoringFormat={scoringFormat}
          />
        )}
      </div>

      <StartSitRail result={response?.result ?? null} recent={recent} />
    </div>
  );
}
