import type { PlayerSummary } from "@/lib/sportsdata/types";
import { createPersistentStore, usePersistentStore } from "./createPersistentStore";

/**
 * Client-side-only roster list (localStorage, no backend/account system —
 * same "no persistence" scope as useScoringFormat.ts), letting the waiver
 * and lineup tools work off a roster without a real league. Backed by one
 * shared module-level store (see createPersistentStore), so importing from
 * Sleeper in the roster-manager modal, marking a waiver candidate as
 * rostered, and the sidebar's player count all read and write the same
 * list and stay in sync.
 */
const store = createPersistentStore<PlayerSummary[]>({
  storageKey: "rosteredPlayers",
  defaultValue: [],
  parse: (raw) => {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlayerSummary[]) : null;
  },
});

function addRostered(player: PlayerSummary) {
  const prev = store.get();
  if (prev.some((p) => p.playerId === player.playerId)) return;
  store.set([...prev, player]);
}

function removeRostered(playerId: number) {
  store.set(store.get().filter((p) => p.playerId !== playerId));
}

function clearRostered() {
  store.set([]);
}

export function useRosteredPlayers(): {
  rostered: PlayerSummary[];
  addRostered: (player: PlayerSummary) => void;
  removeRostered: (playerId: number) => void;
  clearRostered: () => void;
} {
  const rostered = usePersistentStore(store);
  return { rostered, addRostered, removeRostered, clearRostered };
}
