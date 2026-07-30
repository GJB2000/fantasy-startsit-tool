"use client";

import { useState, type ReactNode } from "react";

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface CollapsibleSectionProps {
  label: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  /** Rendered next to the toggle, outside the toggle button itself — e.g. a "Clear" action. */
  action?: ReactNode;
}

/** Same expand/collapse pattern as ComparisonResult.tsx's "Why this pick" toggle, factored out for reuse. */
export function CollapsibleSection({ label, defaultOpen = true, children, className, action }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/40"
          aria-expanded={open}
        >
          <span className="truncate">{label}</span>
          <ChevronIcon open={open} />
        </button>
        {action}
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
