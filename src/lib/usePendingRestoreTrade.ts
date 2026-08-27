import { createPersistentStore, usePersistentStore } from "./createPersistentStore";
import type { PlayerSummary, ScoringFormat } from "@/lib/sportsdata/types";

export interface TradeSelection {
  give: PlayerSummary[];
  get: PlayerSummary[];
  scoringFormat: ScoringFormat;
}

/**
 * What the Trade Assistant last actually analyzed. Written on a successful
 * run, read by BackToToolLink so it can tell whether the player you clicked
 * really came from that trade before offering to restore it. This is the
 * equivalent of useRecentComparisons for Start/Sit — a record of what you ran —
 * except in-memory, since nothing surfaces a trade history the way the Recent
 * comparisons rail does, so there's nothing to gain from persisting it.
 */
const lastTradeStore = createPersistentStore<TradeSelection | null>({ storageKey: null, defaultValue: null });

/**
 * The hand-off slot: "re-open this trade, but from another page". Mirrors
 * usePendingRestoreComparison exactly, and for the same reasons — a client
 * transition (/stats → /trade) keeps a module-level store alive, while a hard
 * refresh deliberately drops it rather than firing a stale restore on a fresh
 * load. TradeAnalyzer reads it once on mount, restores, and clears it.
 */
const pendingRestoreStore = createPersistentStore<TradeSelection | null>({ storageKey: null, defaultValue: null });

export function useLastTrade(): [TradeSelection | null, (next: TradeSelection | null) => void] {
  return [usePersistentStore(lastTradeStore), lastTradeStore.set];
}

export function usePendingRestoreTrade(): [TradeSelection | null, (next: TradeSelection | null) => void] {
  return [usePersistentStore(pendingRestoreStore), pendingRestoreStore.set];
}
