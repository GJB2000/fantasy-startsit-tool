import { useMemo } from "react";
import { DEFAULT_SLOTS, parseSleeperRosterPositions, SLOT_TYPES, type SlotType } from "@/lib/lineup/rosterSlots";
import { createPersistentStore, usePersistentStore } from "./createPersistentStore";
import { useSleeperConnection } from "./useSleeperConnection";

/**
 * The user's starting-lineup shape — how many QB/RB/WR/TE/FLEX/K/DST spots
 * they start each week.
 *
 * Shared rather than page-local because it is not a Lineup-page concern: the
 * Waiver tools need it too, to know whether to surface D/ST and K at all and
 * how much surplus a position has. It used to be `useState` inside
 * LineupTool, which meant a manual-roster user had no way to tell Waivers
 * their league doesn't roster a kicker — see CLAUDE.md item 172.
 *
 * `null` means "never set", which is deliberately distinct from "set to the
 * default": it lets a connected Sleeper league's real slots seed the answer
 * for a user who has never opened the slots editor, while still letting an
 * explicit edit win afterwards. See useEffectiveRosterSlots.
 */
const store = createPersistentStore<Record<SlotType, number> | null>({
  storageKey: "rosterSlots",
  defaultValue: null,
  parse: (raw) => {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Partial<Record<SlotType, unknown>>;
    const slots = { ...DEFAULT_SLOTS };
    for (const type of SLOT_TYPES) {
      const value = record[type];
      // Ignore anything malformed rather than rejecting the whole config — a
      // slot type added after this was saved just keeps its default.
      if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        slots[type] = Math.floor(value);
      }
    }
    return slots;
  },
  serialize: (value) => (value === null ? null : JSON.stringify(value)),
});

/** The raw stored config (null when the user has never set one) plus its setter. */
export function useRosterSlots(): [Record<SlotType, number> | null, (slots: Record<SlotType, number>) => void] {
  return [usePersistentStore(store), store.set];
}

/**
 * The slot configuration every tool should actually use, in precedence order:
 * an explicit edit, then a connected Sleeper league's real slots, then a
 * standard lineup. Returns `fromLeague` so a caller can say where it came
 * from.
 */
export function useEffectiveRosterSlots(): {
  slots: Record<SlotType, number>;
  setSlots: (slots: Record<SlotType, number>) => void;
  fromLeague: boolean;
} {
  const [stored, setSlots] = useRosterSlots();
  const [connection] = useSleeperConnection();
  const rosterPositions = connection?.rosterPositions;

  // Memoized because parseSleeperRosterPositions builds a fresh object every
  // call, and callers put the result in effect/memo dependency arrays — an
  // unstable reference here would refetch on every render.
  return useMemo(() => {
    const leagueSlots =
      rosterPositions && rosterPositions.length > 0 ? parseSleeperRosterPositions(rosterPositions) : null;
    return {
      slots: stored ?? leagueSlots ?? DEFAULT_SLOTS,
      setSlots,
      fromLeague: stored == null && leagueSlots != null,
    };
  }, [stored, rosterPositions, setSlots]);
}

/** Clears an explicit slot edit, so a connected league (or the default) takes over again. */
export function resetRosterSlots(): void {
  store.set(null);
}
