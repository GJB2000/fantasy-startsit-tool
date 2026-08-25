import type { ExtendedPosition } from "@/lib/sportsdata/types";

/**
 * Every starting-lineup slot type this app knows how to fill. Mirrors
 * the real slot codes Sleeper's league `roster_positions` uses (see
 * parseSleeperRosterPositions below), narrowed to the ones this app can
 * actually fill — Sleeper's own list also includes IDP-style flex slots
 * (defensive-player leagues), which this app has no player pool for at
 * all and so can't support.
 */
export const SLOT_TYPES = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DST",
  "FLEX",
  "SUPER_FLEX",
  "WRRB_FLEX",
  "REC_FLEX",
] as const;

export type SlotType = (typeof SLOT_TYPES)[number];

/** Which ExtendedPosition(s) can fill each slot type. Single-position slots list just themselves; the rest are the real flex variants Sleeper leagues actually use. */
export const SLOT_ELIGIBILITY: Record<SlotType, readonly ExtendedPosition[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  K: ["K"],
  DST: ["DST"],
  FLEX: ["RB", "WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  REC_FLEX: ["WR", "TE"],
};

/** Display label for each slot type — matches common fantasy-site shorthand. */
export const SLOT_LABEL: Record<SlotType, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DST: "D/ST",
  FLEX: "FLEX",
  SUPER_FLEX: "SUPER FLEX",
  WRRB_FLEX: "WR/RB FLEX",
  REC_FLEX: "WR/TE FLEX",
};

/**
 * A standard 9-starter lineup (1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K,
 * 1 D/ST) — used when no Sleeper league is connected, since there's no
 * real league settings to read. Matches the most common real fantasy
 * format (also Sleeper's own default league type).
 */
export const DEFAULT_SLOTS: Record<SlotType, number> = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DST: 1,
  FLEX: 1,
  SUPER_FLEX: 0,
  WRRB_FLEX: 0,
  REC_FLEX: 0,
};

/** Maps Sleeper's own position code for a team defense to this app's. Every other Sleeper starting-slot code already matches a SlotType 1:1. */
const SLEEPER_TO_SLOT_TYPE: Record<string, SlotType | undefined> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DST",
  FLEX: "FLEX",
  SUPER_FLEX: "SUPER_FLEX",
  WRRB_FLEX: "WRRB_FLEX",
  REC_FLEX: "REC_FLEX",
};

/**
 * Counts real starting slots from a Sleeper league's raw
 * `roster_positions` array (e.g. ["QB","RB","RB","WR","WR","TE","FLEX",
 * "FLEX","DEF","BN","BN",...]) — bench/taxi/IR entries and anything this
 * app doesn't support (IDP flex slots, etc.) are silently ignored rather
 * than causing an error, since they're not starting-lineup decisions at
 * all.
 */
export function parseSleeperRosterPositions(rosterPositions: string[]): Record<SlotType, number> {
  const counts: Record<SlotType, number> = { ...DEFAULT_SLOTS };
  for (const key of SLOT_TYPES) counts[key] = 0;

  for (const raw of rosterPositions) {
    const slotType = SLEEPER_TO_SLOT_TYPE[raw];
    if (slotType) counts[slotType] += 1;
  }
  return counts;
}

/**
 * Whether a connected Sleeper league rosters a D/ST and/or K slot — used by
 * the waiver tools to avoid recommending streaming targets the league can't
 * even start. Returns both true when slots aren't known (no connection, or a
 * connection saved before rosterPositions was captured): we don't filter on
 * an unknown format.
 */
export function streamingPositionFlags(
  rosterPositions: string[] | null | undefined
): { includeDst: boolean; includeK: boolean } {
  if (!rosterPositions || rosterPositions.length === 0) return { includeDst: true, includeK: true };
  return streamingPositionFlagsFromSlots(parseSleeperRosterPositions(rosterPositions));
}

/**
 * Same question, asked of an already-resolved slot config — which is what
 * every caller now has, since a manual-roster user's slots are a real, shared
 * setting rather than an unknown (see lib/useRosterSlots.ts).
 */
export function streamingPositionFlagsFromSlots(
  slots: Record<SlotType, number>
): { includeDst: boolean; includeK: boolean } {
  return { includeDst: slots.DST > 0, includeK: slots.K > 0 };
}

/** Human-readable one-line summary of a slot config (e.g. "1 QB · 2 RB · 2 WR · 1 TE · 1 FLEX · 1 K · 1 D/ST"), for the collapsed lineup-slots header. Zero-count slot types are omitted. */
export function summarizeSlots(counts: Record<SlotType, number>): string {
  const parts = SLOT_TYPES.filter((t) => counts[t] > 0).map((t) => `${counts[t]} ${SLOT_LABEL[t]}`);
  return parts.length > 0 ? parts.join(" · ") : "No slots set";
}

/** Total number of starting slots across every position — for a compact "N starters" summary. */
export function totalStarters(counts: Record<SlotType, number>): number {
  return SLOT_TYPES.reduce((sum, t) => sum + counts[t], 0);
}

/** Compact `<SlotType><count>` pairs (e.g. "QB1,RB2,WR2,TE1,FLEX1,K1,DST1") — a GET-friendly encoding for the roster-slot config, symmetric with parseSlotsParam below. Zero-count slot types are omitted. */
export function serializeSlots(counts: Record<SlotType, number>): string {
  return SLOT_TYPES.filter((t) => counts[t] > 0)
    .map((t) => `${t}${counts[t]}`)
    .join(",");
}

const SLOT_TOKEN_RE = /^([A-Z_]+)(\d+)$/;

/** Inverse of serializeSlots — unrecognized tokens are ignored rather than erroring, so a malformed/stale query string just degrades to whichever slots it could parse. */
export function parseSlotsParam(raw: string | null): Record<SlotType, number> {
  const counts: Record<SlotType, number> = { ...DEFAULT_SLOTS };
  for (const key of SLOT_TYPES) counts[key] = 0;
  if (!raw) return counts;

  for (const token of raw.split(",")) {
    const match = token.match(SLOT_TOKEN_RE);
    if (!match) continue;
    const [, slotTypeRaw, countRaw] = match;
    if ((SLOT_TYPES as readonly string[]).includes(slotTypeRaw)) {
      counts[slotTypeRaw as SlotType] = Number(countRaw);
    }
  }
  return counts;
}
