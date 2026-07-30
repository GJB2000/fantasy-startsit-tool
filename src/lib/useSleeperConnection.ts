import { createPersistentStore, usePersistentStore } from "./createPersistentStore";

export interface SleeperConnection {
  username: string;
  userId: string;
  leagueId: string;
  leagueName: string;
  /** Every player rostered by ANY team in this league (including the user's own) — refreshed on each sync, used to exclude already-owned players from waiver candidates league-wide, not just the user's own roster. */
  leagueRosteredPlayerIds: number[];
  /** The league's real starting-lineup slots (raw Sleeper roster_positions, including non-starting BN/TAXI/IR entries) — used by the Lineup Optimizer (lib/lineup/rosterSlots.ts) to auto-fill a real slot configuration instead of guessing. */
  rosterPositions: string[];
}

/**
 * Client-side-only Sleeper connection (localStorage, same "no persistence"
 * scope as useScoringFormat.ts/useRosteredPlayers.ts) — remembers which
 * Sleeper username + league the user connected. Backed by one shared
 * module-level store (see createPersistentStore) so the sidebar roster
 * control, the roster-manager modal, and every tool page all read and
 * write the same connection without prop-threading or drifting apart.
 */
const store = createPersistentStore<SleeperConnection | null>({
  storageKey: "sleeperConnection",
  defaultValue: null,
  parse: (raw) => {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === "string" && typeof parsed.leagueId === "string") {
      return {
        ...parsed,
        // Backward-compatible defaults for connections saved before these fields existed.
        leagueRosteredPlayerIds: Array.isArray(parsed.leagueRosteredPlayerIds) ? parsed.leagueRosteredPlayerIds : [],
        rosterPositions: Array.isArray(parsed.rosterPositions) ? parsed.rosterPositions : [],
      } as SleeperConnection;
    }
    return null;
  },
  serialize: (value) => (value === null ? null : JSON.stringify(value)),
});

export function useSleeperConnection(): [SleeperConnection | null, (next: SleeperConnection | null) => void] {
  const connection = usePersistentStore(store);
  return [connection, store.set];
}
