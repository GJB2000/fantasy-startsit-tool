import { useEffect, useState } from "react";

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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) after mount, same documented exception as useScoringFormat.ts.
        setRecent(parsed);
      }
    } catch {
      // Corrupt/foreign localStorage value — ignore and start empty rather than throw.
    }
  }, []);

  function addComparison(entry: Omit<RecentComparison, "id" | "timestamp">) {
    setRecent((prev) => {
      const next = [{ ...entry, id: `${Date.now()}`, timestamp: Date.now() }, ...prev].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { recent, addComparison };
}
