"use client";

import { useEffect, useRef, useState } from "react";

const CONFIRM_WINDOW_MS = 3000;

interface ConfirmButtonProps {
  onConfirm: () => void;
  label: string;
  confirmLabel: string;
  /** Layout only (padding/rounding/size) — color is owned by this component so the armed state can stand out. */
  className?: string;
}

/**
 * Click-again-to-confirm button — avoids a native window.confirm() dialog,
 * which breaks out of this app's own styling entirely. First click arms it
 * (label swaps to confirmLabel, styled as a danger action, for a few
 * seconds); a second click within that window fires onConfirm. Clicking
 * elsewhere or letting it time out disarms it without side effects.
 */
export function ConfirmButton({ onConfirm, label, confirmLabel, className }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!armed) return;
    function handlePointerDown(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setArmed(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [armed]);

  function handleClick() {
    if (armed) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timeoutRef.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      className={`${className ?? ""} font-semibold uppercase tracking-wide transition-colors ${
        armed ? "bg-bad/12 text-bad" : "text-foreground/40 hover:bg-bad/10 hover:text-bad"
      }`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
