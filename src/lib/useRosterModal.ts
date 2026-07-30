import { createPersistentStore, usePersistentStore } from "./createPersistentStore";

/**
 * Shared open/closed state for the roster-manager modal (in-memory, not
 * persisted — a modal shouldn't reopen on reload). Kept in the same shared
 * store so any component can open it: the sidebar's roster button, and each
 * tool page's compact "Manage" summary, all target the single modal that
 * AppShell renders once.
 */
const store = createPersistentStore<boolean>({ storageKey: null, defaultValue: false });

export function useRosterModal(): [boolean, (open: boolean) => void] {
  const open = usePersistentStore(store);
  return [open, store.set];
}
