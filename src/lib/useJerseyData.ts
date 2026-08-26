"use client";

import { useSyncExternalStore } from "react";
import type { TeamColors } from "@/lib/sportsdata/teamColors";

export interface JerseyData {
  colors: Record<string, TeamColors>;
  numbers: Record<number, number>;
}

const EMPTY: JerseyData = { colors: {}, numbers: {} };

// Module-level so every jersey on the page shares ONE fetch, and so the data
// survives navigation between tools within a session.
let cache: JerseyData | null = null;
let inFlight: Promise<JerseyData> | null = null;
const listeners = new Set<() => void>();

function load(): Promise<JerseyData> {
  if (cache) return Promise.resolve(cache);
  inFlight ??= fetch("/api/jersey-data")
    .then((res) => (res.ok ? res.json() : EMPTY))
    .catch(() => EMPTY)
    .then((data: JerseyData) => {
      cache = data;
      inFlight = null;
      for (const l of listeners) l();
      return data;
    });
  return inFlight;
}

/**
 * Team colours + squad numbers for the jersey avatars.
 *
 * useSyncExternalStore rather than state-in-an-effect: this IS an external
 * store (a module-level cache shared by every jersey on the page), which is
 * the same primitive createPersistentStore uses for the roster and scoring
 * format. Returns empty until loaded — a jersey with no data renders a
 * neutral shirt, never a wrong number.
 */
export function useJerseyData(): JerseyData {
  const data = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      void load();
      return () => listeners.delete(onChange);
    },
    () => cache ?? EMPTY,
    () => EMPTY
  );
  return data;
}
