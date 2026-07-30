"use client";

import { useState } from "react";
import type { ExtendedPosition } from "@/lib/sportsdata/types";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useRosterModal } from "@/lib/useRosterModal";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { RosterSummaryButton } from "./RosterSummaryButton";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { WaiverResult, type WaiverCandidateResponse } from "./WaiverResult";

interface WaiverResponse {
  candidatesByPosition: Record<ExtendedPosition, WaiverCandidateResponse[]>;
  context: { contextNote: string };
}

export function WaiverTool() {
  const { rostered, addRostered } = useRosteredPlayers();
  const [sleeperConnection] = useSleeperConnection();
  const [, setRosterOpen] = useRosterModal();
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

  const filteredCandidatesByPosition = response
    ? (Object.fromEntries(
        Object.entries(response.candidatesByPosition).map(([position, candidates]) => [
          position,
          candidates.filter((c) => !dismissedIds.has(c.playerId)),
        ])
      ) as Record<ExtendedPosition, WaiverCandidateResponse[]>)
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

      <RosterSummaryButton
        count={rostered.length}
        connection={sleeperConnection}
        onManage={() => setRosterOpen(true)}
      />

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
