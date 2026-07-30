import { useEffect, useState } from "react";
import type { PlayerSummary } from "@/lib/sportsdata/types";

const STORAGE_KEY = "rosteredPlayers";

/**
 * Client-side-only roster list (localStorage, no backend/account system —
 * same "no persistence" scope as useScoringFormat.ts), letting the waiver
 * tool filter out players the user already has without connecting a real
 * league. Starts empty both during SSR and on the client's first render,
 * then syncs from localStorage after mount — same hydration-mismatch
 * avoidance as useScoringFormat.ts.
 */
export function useRosteredPlayers(): {
  rostered: PlayerSummary[];
  addRostered: (player: PlayerSummary) => void;
  removeRostered: (playerId: number) => void;
  clearRostered: () => void;
} {
  const [rostered, setRostered] = useState<PlayerSummary[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) after mount, same documented exception as useScoringFormat.ts.
        setRostered(parsed);
      }
    } catch {
      // Corrupt/foreign localStorage value — ignore and start empty rather than throw.
    }
  }, []);

  function addRostered(player: PlayerSummary) {
    setRostered((prev) => {
      if (prev.some((p) => p.playerId === player.playerId)) return prev;
      const next = [...prev, player];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function removeRostered(playerId: number) {
    setRostered((prev) => {
      const next = prev.filter((p) => p.playerId !== playerId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearRostered() {
    setRostered([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return { rostered, addRostered, removeRostered, clearRostered };
}
