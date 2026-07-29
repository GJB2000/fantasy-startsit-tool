import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import { SLOT_ELIGIBILITY, SLOT_LABEL, type SlotType } from "./rosterSlots";

export interface LineupSlot {
  slotType: SlotType;
  label: string;
  /** 1-based position within this slot type, only meaningful when a slot type has more than one (e.g. "RB" #1 vs #2) — the UI can drop it when count is 1. */
  slotIndex: number;
  /** Null when no eligible, unassigned player exists on the roster for this slot — an honest empty slot, not a crash or a silently dropped row. */
  breakdown: PlayerScoreBreakdown | null;
}

export interface LineupOptimizationResult {
  slots: LineupSlot[];
  bench: PlayerScoreBreakdown[];
}

/** Prefer a healthy, available player over one who's on a bye or ruled out — mirrors compareBreakdowns' own "prefer healthy, but still fill the slot if that's all there is" philosophy (engine.ts), just applied to N-way slot assignment instead of a single pairwise comparison. */
function isAvailable(b: PlayerScoreBreakdown): boolean {
  return !b.isOnByeThisWeek && b.injuryStatus !== "Out" && b.injuryStatus !== "Doubtful";
}

// A large-but-finite sentinel rather than -Infinity, so two null-score
// players compare as a real (equal, not NaN) number during sort.
const NO_SCORE_SENTINEL = -1_000_000;

// Fixed single-position slots are filled first, each with that
// position's own top players — since only that position can fill them
// anyway, there's no reason not to give it first pick. Flex-type slots
// are filled afterward from whatever's left over, narrowest-eligibility
// first (a WR/RB-only flex before a full RB/WR/TE flex before a
// QB-eligible super flex) — the standard greedy order for this "fixed
// slots then shared flex" structure, optimal for the common case of 0-2
// total flex slots. Not a full weighted-assignment solver: an unusual
// league with several overlapping flex types (e.g. both FLEX and
// SUPER_FLEX active at once) is handled by this same heuristic, not
// proven optimal for every such combination — not worth a
// Hungarian-algorithm-level solve for what's normally a rare
// configuration.
const FIXED_SLOT_ORDER: SlotType[] = ["QB", "RB", "WR", "TE", "K", "DST"];
const FLEX_SLOT_ORDER: SlotType[] = ["WRRB_FLEX", "REC_FLEX", "FLEX", "SUPER_FLEX"];

export function optimizeLineup(
  breakdowns: PlayerScoreBreakdown[],
  slotCounts: Record<SlotType, number>
): LineupOptimizationResult {
  const pool = breakdowns.filter((b): b is PlayerScoreBreakdown & { playerId: number } => b.playerId != null);
  const assignedIds = new Set<number>();
  const slots: LineupSlot[] = [];

  function takeBest(slotType: SlotType): PlayerScoreBreakdown | null {
    const eligible = SLOT_ELIGIBILITY[slotType];
    const candidates = pool.filter(
      (b) => !assignedIds.has(b.playerId) && b.position != null && (eligible as readonly string[]).includes(b.position)
    );
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const aAvailable = isAvailable(a);
      const bAvailable = isAvailable(b);
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      return (b.finalScore ?? NO_SCORE_SENTINEL) - (a.finalScore ?? NO_SCORE_SENTINEL);
    });

    const best = candidates[0];
    assignedIds.add(best.playerId);
    return best;
  }

  for (const slotType of [...FIXED_SLOT_ORDER, ...FLEX_SLOT_ORDER]) {
    const count = slotCounts[slotType] ?? 0;
    for (let i = 0; i < count; i++) {
      slots.push({ slotType, label: SLOT_LABEL[slotType], slotIndex: i + 1, breakdown: takeBest(slotType) });
    }
  }

  const bench = pool.filter((b) => !assignedIds.has(b.playerId));

  return { slots, bench };
}
