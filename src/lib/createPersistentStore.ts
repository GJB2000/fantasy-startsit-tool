import { useEffect, useSyncExternalStore } from "react";

interface StoreOptions<T> {
  /** localStorage key, or null for an in-memory-only store (no persistence). */
  storageKey: string | null;
  defaultValue: T;
  /** Parse a stored raw string into a value, or return null to ignore it. Defaults to JSON.parse. */
  parse?: (raw: string) => T | null;
  /** Serialize a value to a raw string, or return null to remove the key. Defaults to JSON.stringify. */
  serialize?: (value: T) => string | null;
}

export interface PersistentStore<T> {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  get: () => T;
  set: (next: T) => void;
  hydrate: () => void;
}

/**
 * A single module-level store backed by localStorage, shared by every
 * component that reads it through `usePersistentStore`. Unlike a bare
 * `useState` + localStorage hook, all consumers subscribe to ONE value —
 * so a write from any component (a tool page's toggle, a sidebar control,
 * a modal) re-renders every other consumer in the same tab. This is the
 * fix for the class of bug where two independent hook instances silently
 * drifted apart (e.g. the sidebar's scoring indicator never updating when
 * a tool page changed the format).
 *
 * Hydration is deferred to an effect (see `usePersistentStore`) rather
 * than read during render, so the first client render matches the
 * server-rendered default and there's no hydration mismatch — the same
 * discipline the previous per-hook implementations used, just centralized.
 */
export function createPersistentStore<T>(options: StoreOptions<T>): PersistentStore<T> {
  const { storageKey, defaultValue } = options;
  const parse = options.parse ?? ((raw: string) => JSON.parse(raw) as T);
  const serialize = options.serialize ?? ((value: T) => JSON.stringify(value));

  let value: T = defaultValue;
  let hydrated = storageKey === null; // in-memory stores never need hydration
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  function readFromStorage(): T | undefined {
    if (storageKey === null) return undefined;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw == null) return undefined;
      const parsed = parse(raw);
      return parsed === null ? undefined : parsed;
    } catch {
      return undefined; // corrupt/foreign/unparseable value — ignore it
    }
  }

  function hydrate() {
    if (hydrated) return;
    hydrated = true;
    const stored = readFromStorage();
    if (stored !== undefined && !Object.is(stored, value)) {
      value = stored;
      notify();
    }
  }

  function set(next: T) {
    if (Object.is(next, value)) return;
    hydrated = true;
    value = next;
    if (storageKey !== null) {
      try {
        const raw = serialize(next);
        if (raw === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, raw);
      } catch {
        // storage full/unavailable — keep the in-memory value anyway
      }
    }
    notify();
  }

  // Keep separate tabs in sync too: a write in another tab fires a `storage`
  // event here (it never fires in the tab that made the change), so re-read
  // and notify our own subscribers.
  if (storageKey !== null && typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key !== storageKey) return;
      const stored = readFromStorage();
      const next = stored === undefined ? defaultValue : stored;
      value = next;
      notify();
    });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => value,
    getServerSnapshot: () => defaultValue,
    get: () => value,
    set,
    hydrate,
  };
}

export function usePersistentStore<T>(store: PersistentStore<T>): T {
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    store.hydrate();
  }, [store]);
  return value;
}
