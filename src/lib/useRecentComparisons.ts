import { useEffect, useState } from "react";
import type { PlayerSummary, ScoringFormat } from "@/lib/sportsdata/types";

const STORAGE_KEY = "recentComparisons";
const MAX_ENTRIES = 5;

export interface RecentComparison {
  id: string;
  headline: string;
  recommendedName: string | null;
  otherNames: string[];
  isCloseCall: boolean;
  hasLimitedData: boolean;
  timestamp: number;
  /** The players and format this comparison was run with, so clicking it in the rail can restore the exact selection and re-run it. Older stored entries (saved before this field existed) parse to an empty array and just aren't clickable. */
  players: PlayerSummary[];
  scoringFormat: ScoringFormat;
}

/**
 * Client-side-only history of real Start/Sit calls the user has actually
 * run this browser (localStorage, no backend/account system — same
 * "no persistence" scope as useRosteredPlayers.ts/useScoringFormat.ts).
 * Backs the "Recent comparisons" rail on the Start/Sit page and Home —
 * genuine usage history, not placeholder content.
 */
export function useRecentComparisons(): {
  recent: RecentComparison[];
  addComparison: (entry: Omit<RecentComparison, "id" | "timestamp">) => void;
} {
  const [recent, setRecent] = useState<RecentComparison[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Backward-compatible defaults for entries saved before players/scoringFormat existed.
        const sanitized: RecentComparison[] = parsed.map((e) => ({
          ...e,
          players: Array.isArray(e.players) ? e.players : [],
          scoringFormat: e.scoringFormat ?? "ppr",
        }));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) after mount, same documented exception as useScoringFormat.ts.
        setRecent(sanitized);
      }
    } catch {
      // Corrupt/foreign localStorage value — ignore and start empty rather than throw.
    }
  }, []);

  function addComparison(entry: Omit<RecentComparison, "id" | "timestamp">) {
    setRecent((prev) => {
      // De-dupe by the exact set of players, so re-running (or clicking) an
      // existing comparison moves it to the top instead of stacking a copy.
      const ids = new Set(entry.players.map((p) => p.playerId));
      const isSameSet = (e: RecentComparison) =>
        e.players.length === ids.size && e.players.every((p) => ids.has(p.playerId));
      const deduped = ids.size > 0 ? prev.filter((e) => !isSameSet(e)) : prev;

      const next = [{ ...entry, id: `${Date.now()}`, timestamp: Date.now() }, ...deduped].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { recent, addComparison };
}
