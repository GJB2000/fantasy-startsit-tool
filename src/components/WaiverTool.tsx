"use client";

import { useState } from "react";
import type { PlayerSummary, SkillPosition } from "@/lib/sportsdata/types";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { PlayerSearchInput } from "./PlayerSearchInput";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { SleeperImport } from "./SleeperImport";
import { WaiverResult, type WaiverCandidateResponse } from "./WaiverResult";

interface WaiverResponse {
  candidatesByPosition: Record<SkillPosition, WaiverCandidateResponse[]>;
  context: { contextNote: string };
}

function RosterChip({ player, onRemove }: { player: PlayerSummary; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-surface py-1.5 pl-3 pr-1.5 text-xs shadow-sm">
      <span className="font-medium">{player.name}</span>
      <span className="text-foreground/45">{player.position}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-foreground/35 transition-colors hover:bg-bad/10 hover:text-bad"
        aria-label={`Remove ${player.name} from roster`}
      >
        ✕
      </button>
    </div>
  );
}

export function WaiverTool() {
  const { rostered, addRostered, removeRostered } = useRosteredPlayers();
  const [sleeperConnection, setSleeperConnection] = useSleeperConnection();
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [response, setResponse] = useState<WaiverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  async function handleFind() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setDismissedIds(new Set());
    try {
      const rosteredParam = rostered.map((p) => p.playerId).join(",");
      const leagueRosteredParam = (sleeperConnection?.leagueRosteredPlayerIds ?? []).join(",");
      const res = await fetch(
        `/api/waivers?scoringFormat=${scoringFormat}&rostered=${rosteredParam}&leagueRostered=${leagueRosteredParam}`
      );
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

  function handleMarkRostered(playerId: number, displayName: string, position: string, team: string | null) {
    addRostered({ playerId, name: displayName, position, team, injuryStatus: null, photoUrl: null });
    setDismissedIds((prev) => new Set(prev).add(playerId));
  }

  function handleImportPlayers(players: PlayerSummary[]) {
    for (const player of players) addRostered(player);
  }

  const filteredCandidatesByPosition = response
    ? (Object.fromEntries(
        Object.entries(response.candidatesByPosition).map(([position, candidates]) => [
          position,
          candidates.filter((c) => !dismissedIds.has(c.playerId)),
        ])
      ) as Record<SkillPosition, WaiverCandidateResponse[]>)
    : null;

  return (
    <div className="mx-auto mt-10 w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-foreground/40">Scoring</span>
        <ScoringFormatToggle
          value={scoringFormat}
          onChange={(format) => {
            setScoringFormat(format);
            setResponse(null);
          }}
        />
      </div>

      <div className="rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm">
        <SleeperImport
          connection={sleeperConnection}
          onConnectionChange={setSleeperConnection}
          onImportPlayers={handleImportPlayers}
        />

        {rostered.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-foreground/[0.07] pt-4">
            {rostered.map((player) => (
              <RosterChip key={player.playerId} player={player} onRemove={() => removeRostered(player.playerId)} />
            ))}
          </div>
        )}
        <div className="mt-3">
          <PlayerSearchInput
            onSelect={addRostered}
            excludeIds={rostered.map((p) => p.playerId)}
            placeholder="Add another player manually…"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleFind}
        disabled={loading}
        className="mt-5 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "Scanning the player pool…" : "Find waiver targets"}
      </button>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {response && filteredCandidatesByPosition && (
        <>
          <p className="mt-6 text-center text-xs text-foreground/45">{response.context.contextNote}</p>
          <WaiverResult
            candidatesByPosition={filteredCandidatesByPosition}
            scoringFormat={scoringFormat}
            showRosteredButton={!sleeperConnection}
            onMarkRostered={handleMarkRostered}
          />
        </>
      )}
    </div>
  );
}
