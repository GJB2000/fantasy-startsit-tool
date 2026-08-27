import { useEffect, useRef } from "react";
import { createPersistentStore, usePersistentStore } from "./createPersistentStore";

/**
 * "Re-run this tool's board when you land on it" — set by BackToToolLink when
 * you return from a player's stats card.
 *
 * Waivers and Lineup need less than Start/Sit and the Trade Assistant did.
 * There's no selection to carry: their inputs (roster, slots, scoring format)
 * are already persisted, so restoring is just running again on arrival. Hence
 * a bare pathname rather than a captured run.
 *
 * In-memory, same reasoning as the other restore slots — a client transition
 * (/stats → /waivers) keeps a module-level store alive, while a hard refresh
 * drops it rather than firing a surprise fetch on a fresh load.
 */
const store = createPersistentStore<string | null>({ storageKey: null, defaultValue: null });

export function usePendingRerun(): [string | null, (next: string | null) => void] {
  return [usePersistentStore(store), store.set];
}

/**
 * Consumes a pending re-run for `toolPath` and fires `run` once.
 *
 * The `ready` gate matters: the persisted stores hydrate in an effect, so a
 * naive mount-effect run could fire with an empty roster and fetch a board for
 * nobody. In practice they're already hydrated on a client transition (the
 * sidebar reads them on every page), but the flag is claimed immediately and
 * held locally so it can't be lost while waiting, or linger to fire on some
 * later unrelated visit.
 */
export function useRerunOnReturn(toolPath: string, ready: boolean, run: () => void) {
  const [pending, setPending] = usePendingRerun();
  const claimedRef = useRef(false);
  const ranRef = useRef(false);
  const runRef = useRef(run);
  // Kept fresh in an effect rather than assigned during render, so the latest
  // closure is used without touching a ref mid-render.
  useEffect(() => {
    runRef.current = run;
  });

  useEffect(() => {
    if (pending === toolPath) {
      claimedRef.current = true;
      setPending(null);
    }
    if (!claimedRef.current || ranRef.current || !ready) return;
    claimedRef.current = false;
    ranRef.current = true;
    runRef.current();
  }, [pending, ready, toolPath, setPending]);
}
