import type { ScoringFormat } from "@/lib/sportsdata/types";
import { createPersistentStore, usePersistentStore } from "./createPersistentStore";

/**
 * Client-side-only scoring-format preference (localStorage, no backend/
 * account system — consistent with this app's "no persistence" scope),
 * shared by every live tool that scores players AND by the sidebar's
 * scoring indicator. Backed by one module-level store (see
 * createPersistentStore) so changing the format anywhere re-renders every
 * consumer — the sidebar indicator included, which previously read its own
 * independent copy and never updated.
 */
const store = createPersistentStore<ScoringFormat>({
  storageKey: "scoringFormat",
  defaultValue: "ppr",
  parse: (raw) => (raw === "ppr" || raw === "half_ppr" || raw === "standard" ? raw : null),
  serialize: (value) => value,
});

export function useScoringFormat(): [ScoringFormat, (format: ScoringFormat) => void] {
  const format = usePersistentStore(store);
  return [format, store.set];
}
