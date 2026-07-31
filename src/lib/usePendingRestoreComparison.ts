import { createPersistentStore, usePersistentStore } from "./createPersistentStore";
import type { RecentComparison } from "./useRecentComparisons";

/**
 * A hand-off slot for "re-open this comparison, but from another page"
 * (the Home recent-comparisons widget → the Start/Sit tool). In-memory, NOT
 * persisted: navigating Home → /start-sit is a client transition (no
 * reload), so the module-level store survives it, and it deliberately does
 * NOT survive a hard refresh/new tab — a stale pending restore firing on a
 * fresh page load would be surprising. StartSitTool reads it once on mount,
 * restores that comparison, and clears it.
 */
const store = createPersistentStore<RecentComparison | null>({ storageKey: null, defaultValue: null });

export function usePendingRestoreComparison(): [RecentComparison | null, (next: RecentComparison | null) => void] {
  const pending = usePersistentStore(store);
  return [pending, store.set];
}
