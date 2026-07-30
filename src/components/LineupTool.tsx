"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import { DEFAULT_SLOTS, parseSleeperRosterPositions, serializeSlots, type SlotType } from "@/lib/lineup/rosterSlots";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useRosterModal } from "@/lib/useRosterModal";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { LineupResult, type LineupSlotResponse } from "./LineupResult";
import { RosterSlotsEditor } from "./RosterSlotsEditor";
import { RosterSummaryButton } from "./RosterSummaryButton";
import { ScoringFormatToggle } from "./ScoringFormatToggle";

interface LineupResponse {
  slots: LineupSlotResponse[];
  bench: PlayerScoreBreakdown[];
  context: { contextNote: string };
}

export function LineupTool() {
  const { rostered } = useRosteredPlayers();
  const [sleeperConnection] = useSleeperConnection();
  const [, setRosterOpen] = useRosterModal();
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [slotCounts, setSlotCounts] = useState<Record<SlotType, number>>(DEFAULT_SLOTS);
  const [response, setResponse] = useState<LineupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-derive slot counts from the real, connected Sleeper league whenever
  // the connected league actually changes — a starting point, not a lock
  // (the editor below stays freely editable regardless). Tracks the last
  // league we auto-filled from so further manual edits aren't clobbered
  // on every render, only when the underlying league changes.
  const lastAppliedLeagueId = useRef<string | null>(null);
  useEffect(() => {
    if (sleeperConnection) {
      if (sleeperConnection.leagueId === lastAppliedLeagueId.current) return;
      lastAppliedLeagueId.current = sleeperConnection.leagueId;
      setSlotCounts(
        sleeperConnection.rosterPositions.length > 0
          ? parseSleeperRosterPositions(sleeperConnection.rosterPositions)
          : DEFAULT_SLOTS
      );
    } else if (lastAppliedLeagueId.current !== null) {
      lastAppliedLeagueId.current = null;
      setSlotCounts(DEFAULT_SLOTS);
    }
  }, [sleeperConnection]);

  async function handleBuildLineup() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const idsParam = rostered.map((p) => p.playerId).join(",");
      const slotsParam = serializeSlots(slotCounts);
      const res = await fetch(
        `/api/lineup?scoringFormat=${scoringFormat}&ids=${idsParam}&slots=${encodeURIComponent(slotsParam)}`
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

      <div className="mt-5 rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm">
        <RosterSlotsEditor slots={slotCounts} onChange={setSlotCounts} />
      </div>

      <button
        type="button"
        onClick={handleBuildLineup}
        disabled={loading || rostered.length === 0}
        className="mt-5 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "Building your lineup…" : "Build my lineup"}
      </button>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}

      {response && (
        <>
          <p className="mt-6 text-center text-xs text-foreground/45">{response.context.contextNote}</p>
          <LineupResult slots={response.slots} bench={response.bench} scoringFormat={scoringFormat} />
        </>
      )}
    </div>
  );
}
