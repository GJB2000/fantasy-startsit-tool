import { useEffect, useState } from "react";

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

const STORAGE_KEY = "sleeperConnection";

/**
 * Client-side-only (localStorage, same "no persistence" scope as
 * useScoringFormat.ts/useRosteredPlayers.ts) — remembers which Sleeper
 * username + league the user connected, so returning to the page offers
 * a one-click "Sync roster" instead of re-entering a username and
 * re-picking a league every time.
 */
export function useSleeperConnection(): [SleeperConnection | null, (next: SleeperConnection | null) => void] {
  const [connection, setConnectionState] = useState<SleeperConnection | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.username === "string" && typeof parsed.leagueId === "string") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) after mount, same documented exception as useScoringFormat.ts.
        setConnectionState({
          ...parsed,
          // Backward-compatible defaults for connections saved before these fields existed.
          leagueRosteredPlayerIds: Array.isArray(parsed.leagueRosteredPlayerIds) ? parsed.leagueRosteredPlayerIds : [],
          rosterPositions: Array.isArray(parsed.rosterPositions) ? parsed.rosterPositions : [],
        });
      }
    } catch {
      // Corrupt/foreign localStorage value — ignore and start disconnected rather than throw.
    }
  }, []);

  function setConnection(next: SleeperConnection | null) {
    setConnectionState(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }

  return [connection, setConnection];
}
