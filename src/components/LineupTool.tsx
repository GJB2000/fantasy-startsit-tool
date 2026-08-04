"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import {
  DEFAULT_SLOTS,
  parseSleeperRosterPositions,
  serializeSlots,
  summarizeSlots,
  totalStarters,
  type SlotType,
} from "@/lib/lineup/rosterSlots";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useRosterModal } from "@/lib/useRosterModal";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { CollapsibleSection } from "./CollapsibleSection";
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

  const controls = (
    <div className="space-y-2.5">
      <RosterSummaryButton
        count={rostered.length}
        connection={sleeperConnection}
        onManage={() => setRosterOpen(true)}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-surface px-4 py-3 shadow-sm">
        <span className="text-[11px] font-medium uppercase tracking-wide text-foreground/45">Scoring</span>
        <ScoringFormatToggle
          value={scoringFormat}
          onChange={(format) => {
            setScoringFormat(format);
            setResponse(null);
          }}
        />
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-surface px-4 py-3 shadow-sm">
        <CollapsibleSection
          defaultOpen={false}
          label={
            <span className="normal-case">
              <span className="font-semibold uppercase tracking-wide text-foreground/60">
                Roster slots · {totalStarters(slotCounts)} starters
              </span>
              <span className="ml-1.5 hidden text-foreground/40 sm:inline">{summarizeSlots(slotCounts)}</span>
            </span>
          }
        >
          <RosterSlotsEditor slots={slotCounts} onChange={setSlotCounts} />
        </CollapsibleSection>
      </div>

      <button
        type="button"
        onClick={handleBuildLineup}
        disabled={loading || rostered.length === 0}
        className="mt-1 w-full rounded-full bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "Building your lineup…" : "Build my lineup"}
      </button>

      {rostered.length === 0 && !error && (
        <p className="text-center text-[12px] text-foreground/45">Add players to your roster to build a lineup.</p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );

  return (
    <div className="mx-auto mt-10 w-full max-w-3xl">
      <div className="mx-auto w-full max-w-xl">{controls}</div>

      {response && (
        <>
          <p className="mt-8 text-center text-xs text-foreground/45">{response.context.contextNote}</p>
          <LineupResult slots={response.slots} bench={response.bench} scoringFormat={scoringFormat} />
        </>
      )}
    </div>
  );
}
