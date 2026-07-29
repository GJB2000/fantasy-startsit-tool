"use client";

import { SLOT_LABEL, SLOT_TYPES, type SlotType } from "@/lib/lineup/rosterSlots";

interface RosterSlotsEditorProps {
  slots: Record<SlotType, number>;
  onChange: (next: Record<SlotType, number>) => void;
}

function StepperRow({
  slotType,
  count,
  onChange,
}: {
  slotType: SlotType;
  count: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-foreground/10 bg-surface px-3 py-2">
      <span className="text-[13px] font-medium text-foreground/70">{SLOT_LABEL[slotType]}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, count - 1))}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-foreground/10 text-foreground/50 transition-colors hover:border-foreground/25 hover:text-foreground"
          aria-label={`Fewer ${SLOT_LABEL[slotType]} slots`}
        >
          −
        </button>
        <span className="w-4 text-center font-rounded text-sm font-semibold tabular-nums">{count}</span>
        <button
          type="button"
          onClick={() => onChange(count + 1)}
          className="flex h-6 w-6 items-center justify-center rounded-full border border-foreground/10 text-foreground/50 transition-colors hover:border-foreground/25 hover:text-foreground"
          aria-label={`More ${SLOT_LABEL[slotType]} slots`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * A compact, always-editable grid of per-slot-type steppers — pre-filled
 * from the connected Sleeper league's real roster_positions when
 * available (see LineupTool.tsx), or DEFAULT_SLOTS otherwise, but never
 * locked to either: a real league's settings are a starting point, not
 * a constraint, since a user might reasonably want to try a different
 * lineup shape than their league's actual rules (e.g. checking "what if
 * I had 2 flex spots").
 */
export function RosterSlotsEditor({ slots, onChange }: RosterSlotsEditorProps) {
  function setCount(slotType: SlotType, count: number) {
    onChange({ ...slots, [slotType]: count });
  }

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Roster slots</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/50">
        How many starters at each spot — auto-filled from your Sleeper league when connected, always editable.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SLOT_TYPES.map((slotType) => (
          <StepperRow key={slotType} slotType={slotType} count={slots[slotType]} onChange={(next) => setCount(slotType, next)} />
        ))}
      </div>
    </div>
  );
}
