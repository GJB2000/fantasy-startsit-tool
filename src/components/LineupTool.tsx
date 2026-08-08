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
import { ChevronIcon } from "./CollapsibleSection";
import { LineupResult, type LineupSlotResponse } from "./LineupResult";
import { RosterSlotsEditor } from "./RosterSlotsEditor";
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
  const [slotsOpen, setSlotsOpen] = useState(false);

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
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[6px] border border-foreground/12 bg-surface shadow-sm">
        <div className="flex flex-col divide-y divide-foreground/[0.09] sm:flex-row sm:divide-x sm:divide-y-0">
          {/* Roster */}
          <button
            type="button"
            onClick={() => setRosterOpen(true)}
            className="group flex flex-1 items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-foreground/[0.02]"
          >
            <span className="min-w-0">
              <span className="block font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/50">Roster</span>
              <span className="mt-1 block leading-none">
                <span className="font-jost text-[20px] font-semibold">{rostered.length}</span>
                <span className="ml-1 text-[12px] text-foreground/50">players</span>
              </span>
              <span className="mt-1 block truncate text-[11px] text-foreground/45">
                {sleeperConnection ? sleeperConnection.leagueName : "Tap to connect or add"}
              </span>
            </span>
            <span className="shrink-0 rounded-[3px] border border-foreground/15 px-2.5 py-1 text-[11px] font-medium text-foreground/60 transition-colors group-hover:border-accent/40 group-hover:text-foreground">
              Manage
            </span>
          </button>

          {/* Slots */}
          <button
            type="button"
            onClick={() => setSlotsOpen((v) => !v)}
            className="flex flex-1 items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-foreground/[0.02]"
            aria-expanded={slotsOpen}
          >
            <span className="min-w-0">
              <span className="block font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/50">Slots</span>
              <span className="mt-1 block leading-none">
                <span className="font-jost text-[20px] font-semibold">{totalStarters(slotCounts)}</span>
                <span className="ml-1 text-[12px] text-foreground/50">starters</span>
              </span>
              <span className="mt-1 block truncate text-[11px] text-foreground/45">{summarizeSlots(slotCounts)}</span>
            </span>
            <ChevronIcon open={slotsOpen} />
          </button>
        </div>

        {slotsOpen && (
          <div className="border-t border-foreground/[0.09] bg-surface-sunken p-4">
            <RosterSlotsEditor slots={slotCounts} onChange={setSlotCounts} />
          </div>
        )}

        {/* Scoring */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground/[0.09] px-4 py-3">
          <span className="font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/50">Scoring</span>
          <ScoringFormatToggle
            editorial
            value={scoringFormat}
            onChange={(format) => {
              setScoringFormat(format);
              setResponse(null);
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleBuildLineup}
        disabled={loading || rostered.length === 0}
        style={{ fontFamily: "var(--font-engraved)" }}
        className="w-full rounded-[4px] bg-accent px-4 py-3.5 text-[12px] uppercase tracking-[0.14em] text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
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
      <div className="mx-auto w-full max-w-2xl">{controls}</div>

      {response && (
        <>
          <p className="mt-8 text-center text-xs text-foreground/45">{response.context.contextNote}</p>
          <LineupResult slots={response.slots} bench={response.bench} scoringFormat={scoringFormat} />
        </>
      )}
    </div>
  );
}
