"use client";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** Small engraved caption above the group. Without one, several adjacent groups read as a single confusing control rather than independent settings. */
  label?: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * "primary" is the page's main axis (volt fill). "secondary" is a
   * supporting setting and gets a quiet fill, so only ONE group on a page
   * reads as the active choice — three simultaneously-volt groups in a row
   * look like one control with three lit segments.
   */
  tone?: "primary" | "secondary";
}

/**
 * Full literal class strings, not interpolated — Tailwind's static scanner
 * can't resolve a template like `bg-${token}`, the same constraint
 * documented in RankingsResult.tsx/TradeResult.tsx/WaiverResult.tsx.
 */
const ACTIVE_CLASSES: Record<"primary" | "secondary", string> = {
  primary: "bg-accent font-semibold text-accent-ink",
  secondary: "bg-foreground/12 font-semibold text-foreground",
};

/**
 * The app's shared pill segmented control. Used wherever a page stacks
 * more than one of these next to each other (Legit Rankings, Backtest),
 * so each axis is labeled and only the primary one carries the accent.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  tone = "primary",
}: SegmentedControlProps<T>) {
  return (
    <div>
      {label && (
        <span className="mb-1.5 block font-engraved text-[9.5px] uppercase tracking-[0.12em] text-foreground/55">
          {label}
        </span>
      )}
      <div className="inline-flex gap-0.5 rounded-full bg-surface-sunken p-[3px]">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 font-engraved text-[11px] uppercase tracking-[0.08em] transition-colors ${
              value === option.value ? ACTIVE_CLASSES[tone] : "text-foreground/55 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
