"use client";

import { useEffect } from "react";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { CollapsibleSection } from "./CollapsibleSection";
import { ConfirmButton } from "./ConfirmButton";
import { PlayerMultiSelect } from "./PlayerMultiSelect";
import { SleeperImport } from "./SleeperImport";

/**
 * The single, app-wide roster manager — Sleeper connect/sync plus manual
 * roster editing — rendered once by AppShell and opened from anywhere
 * (the sidebar roster button, each tool page's "Manage" summary) via
 * useRosterModal. Replaces the two full-size, duplicated import panels
 * that used to live inline on the Waivers and Lineup pages. Themed like a
 * normal content surface (not the fixed-dark sidebar), so SleeperImport's
 * existing token-based styling renders correctly in both light and dark.
 */
export function RosterManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rostered, addRostered, removeRostered, clearRostered } = useRosteredPlayers();
  const [connection, setConnection] = useSleeperConnection();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleImportPlayers(players: PlayerSummary[]) {
    for (const player of players) addRostered(player);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mb-8 mt-[8vh] w-full max-w-lg rounded-3xl border border-foreground/10 bg-surface p-5 text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage your roster"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Your roster</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <SleeperImport connection={connection} onConnectionChange={setConnection} onImportPlayers={handleImportPlayers} />

        <CollapsibleSection
          label={`Your roster (${rostered.length})`}
          className="mt-4 border-t border-foreground/[0.07] pt-4"
          action={
            rostered.length > 0 && (
              <ConfirmButton
                onConfirm={clearRostered}
                label="Clear"
                confirmLabel="Click to confirm"
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px]"
              />
            )
          }
        >
          <PlayerMultiSelect
            selected={rostered}
            onAdd={addRostered}
            onRemove={removeRostered}
            placeholder={() => "Add another player manually…"}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}
