"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpNumberProps {
  /** The final value to settle on. */
  value: number;
  /** Decimal places to render (0 for %, 1 for projections). */
  decimals?: number;
  /** Total animation length in ms. */
  durationMs?: number;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Renders a number that briefly "calculates" — the digits scramble around the
 * answer with a decaying jitter and settle onto the exact value on mount (and
 * again whenever `value` changes, e.g. a re-run comparison). SSR renders the
 * final value, so there's no hydration mismatch and no-JS still shows the real
 * number; the scramble is purely a client-side flourish. Honors
 * prefers-reduced-motion by showing the final value immediately.
 */
export function CountUpNumber({ value, decimals = 0, durationMs = 900, className }: CountUpNumberProps) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      rafRef.current = requestAnimationFrame(() => setDisplay(value));
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      };
    }

    const magnitude = Math.max(Math.abs(value), 1);
    const start = performance.now();
    let lastPaint = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      if (t >= 1) {
        setDisplay(value);
        rafRef.current = null;
        return;
      }
      // Jitter around the answer, decaying to zero as it settles (ease-out).
      // Throttle the paints (~40ms) so the digits read as flicker, not a blur.
      if (now - lastPaint > 40) {
        const eased = 1 - Math.pow(1 - t, 3);
        const jitterAmp = magnitude * 0.7 * (1 - eased);
        setDisplay(Math.max(0, value + (Math.random() * 2 - 1) * jitterAmp));
        lastPaint = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
