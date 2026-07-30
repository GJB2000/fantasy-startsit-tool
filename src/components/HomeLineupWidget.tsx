"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import { DEFAULT_SLOTS, parseSleeperRosterPositions, serializeSlots, type SlotType } from "@/lib/lineup/rosterSlots";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import type { LineupSlotResponse } from "./LineupResult";

interface LineupResponse {
  slots: LineupSlotResponse[];
  bench: PlayerScoreBreakdown[];
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
            <rect x="3" y="4" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
            <rect x="3" y="10" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
            <rect x="3" y="16" width="10" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          This week&apos;s lineup
        </div>
        <Link href="/lineup" className="text-[11px] font-semibold text-accent hover:underline">
          Open
        </Link>
      </div>
      {children}
    </div>
  );
}

function SlotRow({ slot }: { slot: LineupSlotResponse }) {
  const b = slot.breakdown;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-foreground/[0.07] py-2 first:border-none first:pt-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-9 shrink-0 text-[10.5px] font-semibold uppercase tracking-wide text-foreground/40">
          {slot.label}
        </span>
        {b ? (
          <span className="truncate text-[12.5px] font-medium">{b.displayName}</span>
        ) : (
          <span className="truncate text-[12.5px] text-foreground/40">Empty — add a player</span>
        )}
      </div>
      {b?.finalScore != null && (
        <span className="font-mono shrink-0 text-[12.5px] font-semibold tabular-nums text-foreground/70">
          {b.finalScore.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/**
 * Compact Home-page summary of the Lineup Optimizer — reuses the exact
 * same /api/lineup route and slot-derivation logic as LineupTool.tsx
 * (real Sleeper league slots when connected, DEFAULT_SLOTS otherwise),
 * just auto-fetched on mount against whatever roster/format is already
 * saved rather than requiring the user to click through to /lineup
 * first. No editing here — that's what "Open" links to.
 */
export function HomeLineupWidget() {
  const { rostered } = useRosteredPlayers();
  const [sleeperConnection] = useSleeperConnection();
  const [scoringFormat] = useScoringFormat();
  const [response, setResponse] = useState<LineupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotCounts = useMemo<Record<SlotType, number>>(() => {
    if (sleeperConnection && sleeperConnection.rosterPositions.length > 0) {
      return parseSleeperRosterPositions(sleeperConnection.rosterPositions);
    }
    return DEFAULT_SLOTS;
  }, [sleeperConnection]);

  useEffect(() => {
    if (rostered.length === 0) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/lineup response (an external system), keyed on the roster/format/slots deps below; the cancelled-flag cleanup already guards against a stale response landing after a newer request starts.
    setLoading(true);
    setError(null);
    const idsParam = rostered.map((p) => p.playerId).join(",");
    const slotsParam = serializeSlots(slotCounts);
    fetch(`/api/lineup?scoringFormat=${scoringFormat}&ids=${idsParam}&slots=${encodeURIComponent(slotsParam)}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setResponse(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rostered, scoringFormat, slotCounts]);

  if (rostered.length === 0) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/45">
          Add your roster on the Lineup page to see this week&apos;s suggested starters here.
        </p>
      </WidgetShell>
    );
  }

  if (loading && !response) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/45">Building your lineup…</p>
      </WidgetShell>
    );
  }

  if (error) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-bad">{error}</p>
      </WidgetShell>
    );
  }

  if (!response) return <WidgetShell>{null}</WidgetShell>;

  const emptySlotCount = response.slots.filter((s) => s.breakdown == null).length;

  return (
    <WidgetShell>
      <div className="flex flex-col">
        {response.slots.map((slot, i) => (
          <SlotRow key={`${slot.slotType}-${i}`} slot={slot} />
        ))}
      </div>
      {emptySlotCount > 0 && (
        <p className="mt-2 text-[11px] text-caution">
          {emptySlotCount} slot{emptySlotCount === 1 ? "" : "s"} unfilled — add more players to complete your lineup.
        </p>
      )}
    </WidgetShell>
  );
}
