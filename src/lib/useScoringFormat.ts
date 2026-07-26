import { useEffect, useState } from "react";
import type { ScoringFormat } from "@/lib/sportsdata/types";

const STORAGE_KEY = "scoringFormat";

/**
 * Client-side-only preference (localStorage, no backend/account system —
 * consistent with this app's "no persistence" scope) shared by every live
 * tool that scores players, so picking a format once carries across
 * Start/Sit and the Trade Analyzer within a session. Defaults to "ppr" —
 * today's implicit behavior — both during SSR and on the very first
 * client render, then syncs from localStorage after mount. A lazy
 * useState initializer would read localStorage during the client's first
 * render too, which can disagree with the server-rendered "ppr" default
 * and trigger a hydration mismatch — this app is server-rendered, so
 * that's a real risk, not a hypothetical one. Syncing in an effect after
 * mount is React's own documented exception to "don't setState in an
 * effect": reading from an external system (localStorage) on mount.
 */
export function useScoringFormat(): [ScoringFormat, (format: ScoringFormat) => void] {
  const [format, setFormatState] = useState<ScoringFormat>("ppr");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ppr" || stored === "half_ppr" || stored === "standard") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage (an external system) after mount, the documented exception to this rule; a lazy useState initializer would risk a hydration mismatch instead, since this app is server-rendered.
      setFormatState(stored);
    }
  }, []);

  function setFormat(next: ScoringFormat) {
    setFormatState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  return [format, setFormat];
}
