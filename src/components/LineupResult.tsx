"use client";

import { useState } from "react";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import type { SlotType } from "@/lib/lineup/rosterSlots";
import { ChevronIcon } from "./CollapsibleSection";

export interface LineupSlotResponse {
  slotType: SlotType;
  label: string;
  slotIndex: number;
  breakdown: PlayerScoreBreakdown | null;
}

interface LineupResultProps {
  slots: LineupSlotResponse[];
  bench: PlayerScoreBreakdown[];
  scoringFormat: ScoringFormat;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

// Position accent CSS vars (globals.css, theme-aware) — a scanning cue, not
// semantic color. Same tokens WaiverResult/PlayerMultiSelect use, so a player
// reads the same color everywhere in the app.
const POS_VAR: Record<string, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
  K: "var(--pos-k)",
  DST: "var(--pos-dst)",
};
function posVar(position: string | null): string {
  return (position && POS_VAR[position]) ?? "var(--foreground)";
}
function isStreaming(position: string | null): boolean {
  return position === "DST" || position === "K";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function injuryBadgeClasses(status: string) {
  if (status === "Out" || status === "Doubtful") return "bg-bad/15 text-bad";
  return "bg-caution/15 text-caution";
}

function slotHeading(slot: LineupSlotResponse, countAtType: number): string {
  return countAtType > 1 ? `${slot.label} ${slot.slotIndex}` : slot.label;
}

type MatchupTone = "good" | "tough" | "neutral";
const MATCHUP_PILL: Record<MatchupTone, string> = {
  good: "text-good bg-good/12 border-good/30",
  tough: "text-bad bg-bad/12 border-bad/30",
  neutral: "text-caution bg-caution/12 border-caution/30",
};

function matchupPill(breakdown: PlayerScoreBreakdown): { text: string; tone: MatchupTone } | null {
  const m = breakdown.matchupContext;
  if (!m) return null;
  if (m.diffFromAverage > 1.5) return { text: "Favorable", tone: "good" };
  if (m.diffFromAverage < -1.5) return { text: "Tough", tone: "tough" };
  return { text: "Neutral", tone: "neutral" };
}

function Avatar({ breakdown, size }: { breakdown: PlayerScoreBreakdown; size: number }) {
  const color = posVar(breakdown.position);
  const streaming = isStreaming(breakdown.position);
  return (
    <span
      className="flex shrink-0 items-center justify-center font-display font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        fontSize: Math.round(size * (streaming ? 0.3 : 0.4)),
        color: streaming ? "var(--premium-ink)" : "#fff",
        background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 58%, #000))`,
      }}
    >
      {streaming ? breakdown.team ?? initials(breakdown.displayName) : initials(breakdown.displayName)}
    </span>
  );
}

function SlotChip({ heading }: { heading: string }) {
  return (
    <span className="rounded-md bg-foreground/[0.06] px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-foreground/55">
      {heading}
    </span>
  );
}

function opponentLabel(breakdown: PlayerScoreBreakdown): string | null {
  const opp = breakdown.nextOpponent?.team ?? breakdown.matchupContext?.opponentTeam;
  return opp ? `vs ${opp}` : null;
}

function StatusPills({ breakdown }: { breakdown: PlayerScoreBreakdown }) {
  const showData = breakdown.dataQuality !== "full";
  if (!breakdown.isOnByeThisWeek && !breakdown.injuryStatus && !showData) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {breakdown.isOnByeThisWeek && (
        <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[11px] text-foreground/55">Bye week</span>
      )}
      {breakdown.injuryStatus && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${injuryBadgeClasses(breakdown.injuryStatus)}`}>
          {breakdown.injuryStatus}
        </span>
      )}
      {showData && (
        <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[11px] text-foreground/55">
          {breakdown.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
        </span>
      )}
    </div>
  );
}

function EmptySlotCard({ heading }: { heading: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-foreground/15 bg-surface p-5">
      <SlotChip heading={heading} />
      <p className="mt-3 text-sm text-foreground/50">
        No eligible player on your roster for this slot — add one to fill it.
      </p>
    </div>
  );
}

function StarterCard({
  heading,
  breakdown,
  formatLabel,
}: {
  heading: string;
  breakdown: PlayerScoreBreakdown;
  formatLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const matchup = matchupPill(breakdown);
  const opp = opponentLabel(breakdown);
  const color = posVar(breakdown.position);
  const hasNotes = breakdown.notes.length > 0;

  return (
    <div
      className="overflow-hidden rounded-3xl border border-foreground/10 bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <SlotChip heading={heading} />
          <div className="text-right">
            <div className="font-mono text-[26px] font-bold leading-none tabular-nums">
              {breakdown.finalScore != null ? breakdown.finalScore.toFixed(1) : "—"}
            </div>
            <div className="mt-1 text-[10.5px] uppercase tracking-wide text-foreground/40">proj · {formatLabel}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Avatar breakdown={breakdown} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold tracking-tight">{breakdown.displayName}</h3>
            <p className="mt-0.5 truncate text-[12.5px] text-foreground/45">
              {breakdown.position ?? ""}
              {breakdown.team ? ` · ${breakdown.team}` : ""}
              {opp ? ` · ${opp}` : ""}
            </p>
          </div>
          {matchup && (
            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${MATCHUP_PILL[matchup.tone]}`}>
              {matchup.text}
            </span>
          )}
        </div>

        <div className="mt-3">
          <StatusPills breakdown={breakdown} />
        </div>

        {hasNotes && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-foreground/50 transition-colors hover:text-foreground"
            aria-expanded={open}
          >
            Why this pick
            <ChevronIcon open={open} />
          </button>
        )}
      </div>

      {hasNotes && open && (
        <div className="border-t border-foreground/[0.07] px-5 pb-5 pt-4">
          <ul className="flex flex-col gap-2.5">
            {breakdown.notes.map((note, i) => (
              <li key={i} className="relative pl-4 text-sm leading-relaxed text-foreground/70">
                <span className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-full bg-accent" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BenchRow({ breakdown }: { breakdown: PlayerScoreBreakdown }) {
  return (
    <div className="flex items-center gap-3 border-t border-foreground/[0.07] px-4 py-3 first:border-none">
      <Avatar breakdown={breakdown} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium">{breakdown.displayName}</p>
        <p className="truncate text-[11.5px] text-foreground/45">
          {breakdown.position ?? ""}
          {breakdown.team ? ` · ${breakdown.team}` : ""}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums text-foreground/70">
        {breakdown.finalScore != null ? breakdown.finalScore.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export function LineupResult({ slots, bench, scoringFormat }: LineupResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const countBySlotType = slots.reduce<Record<string, number>>((acc, s) => {
    acc[s.slotType] = (acc[s.slotType] ?? 0) + 1;
    return acc;
  }, {});

  const filled = slots.filter((s) => s.breakdown != null);
  const projectedTotal = filled.reduce((sum, s) => sum + (s.breakdown?.finalScore ?? 0), 0);
  const emptyCount = slots.length - filled.length;

  const sortedBench = [...bench].sort((a, b) => (b.finalScore ?? -Infinity) - (a.finalScore ?? -Infinity));

  return (
    <div className="mt-6 space-y-8">
      {/* projected-total header */}
      <div className="flex items-center justify-between gap-4 overflow-hidden rounded-3xl border border-foreground/10 p-6 shadow-sm [background:radial-gradient(120%_140%_at_100%_0%,color-mix(in_srgb,var(--accent)_11%,transparent),transparent_55%),var(--surface)]">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Optimal lineup
          </div>
          <h2 className="mt-1.5 font-display text-[24px] font-bold leading-none">Your best starting lineup</h2>
          <p className="mt-2 text-[12.5px] text-foreground/50">
            {filled.length} of {slots.length} slots filled
            {emptyCount > 0 ? ` · ${emptyCount} still open` : ""} · {formatLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[38px] font-bold leading-none tabular-nums text-accent">
            {projectedTotal.toFixed(1)}
          </div>
          <div className="mt-1 text-[10.5px] uppercase tracking-wide text-foreground/40">projected points</div>
        </div>
      </div>

      {/* starters */}
      <div>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Starters</h3>
        <div className="flex flex-col gap-4">
          {slots.map((slot, i) => {
            const heading = slotHeading(slot, countBySlotType[slot.slotType] ?? 1);
            return slot.breakdown ? (
              <StarterCard key={`${slot.slotType}-${i}`} heading={heading} breakdown={slot.breakdown} formatLabel={formatLabel} />
            ) : (
              <EmptySlotCard key={`${slot.slotType}-${i}`} heading={heading} />
            );
          })}
        </div>
      </div>

      {/* bench */}
      {sortedBench.length > 0 && (
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
            Bench <span className="font-mono text-foreground/35">{sortedBench.length}</span>
          </h3>
          <div className="overflow-hidden rounded-2xl border border-foreground/10 bg-surface">
            {sortedBench.map((breakdown) => (
              <BenchRow key={breakdown.playerId} breakdown={breakdown} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
