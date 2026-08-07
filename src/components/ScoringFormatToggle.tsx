"use client";

import type { ScoringFormat } from "@/lib/sportsdata/types";

const OPTIONS: { value: ScoringFormat; label: string }[] = [
  { value: "ppr", label: "PPR" },
  { value: "half_ppr", label: "Half PPR" },
  { value: "standard", label: "Standard" },
];

interface ScoringFormatToggleProps {
  value: ScoringFormat;
  onChange: (format: ScoringFormat) => void;
  /** Editorial ("almanac") variant — squared, hairline-bordered, engraved-caps segments. */
  editorial?: boolean;
}

export function ScoringFormatToggle({ value, onChange, editorial = false }: ScoringFormatToggleProps) {
  if (editorial) {
    return (
      <div className="inline-flex overflow-hidden rounded-[3px] border border-foreground/25 text-[10px]">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{ fontFamily: "var(--font-engraved)" }}
            className={`whitespace-nowrap px-3 py-1.5 uppercase tracking-[0.08em] transition-colors [&:not(:first-child)]:border-l [&:not(:first-child)]:border-foreground/20 ${
              value === option.value ? "bg-accent text-accent-ink" : "text-foreground/55 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex gap-0.5 rounded-full bg-foreground/[0.06] p-[3px] text-[13px] font-medium">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${
            value === option.value ? "bg-surface text-foreground shadow-sm" : "text-foreground/55 hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
