"use client";

import { useState } from "react";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import type { SlotType } from "@/lib/lineup/rosterSlots";
import { ChevronIcon } from "./CollapsibleSection";
import { CountUpNumber } from "./CountUpNumber";

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
        <span className="rounded-[3px] bg-foreground/8 px-2 py-0.5 text-[11px] text-foreground/55">Bye week</span>
      )}
      {breakdown.injuryStatus && (
        <span className={`rounded-[3px] px-2 py-0.5 text-[11px] font-medium ${injuryBadgeClasses(breakdown.injuryStatus)}`}>
          {breakdown.injuryStatus}
        </span>
      )}
      {showData && (
        <span className="rounded-[3px] bg-foreground/8 px-2 py-0.5 text-[11px] text-foreground/55">
          {breakdown.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
        </span>
      )}
    </div>
  );
}

function EmptySlotRow({ heading }: { heading: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-foreground/[0.07] px-4 py-3.5 first:border-none">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-foreground/25 text-[18px] leading-none text-foreground/30">
        +
      </span>
      <div className="min-w-0">
        <div className="font-engraved text-[9.5px] uppercase tracking-[0.11em] text-foreground/40">{heading}</div>
        <p className="mt-0.5 text-[12.5px] text-foreground/45">No eligible player on your roster — add one to fill it.</p>
      </div>
    </div>
  );
}

function StarterRow({
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
  const hasNotes = breakdown.notes.length > 0;

  return (
    <div className="border-t border-foreground/[0.07] first:border-none">
      <button
        type="button"
        onClick={() => hasNotes && setOpen((v) => !v)}
        aria-expanded={hasNotes ? open : undefined}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${hasNotes ? "hover:bg-foreground/[0.02]" : "cursor-default"}`}
      >
        <Avatar breakdown={breakdown} size={40} />
        <div className="min-w-0 flex-1">
          <div className="font-engraved text-[9.5px] uppercase tracking-[0.11em] text-foreground/40">{heading}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="truncate font-jost text-[15px] font-semibold tracking-tight">{breakdown.displayName}</h3>
            <StatusPills breakdown={breakdown} />
          </div>
          <p className="truncate text-[11.5px] text-foreground/45">
            {breakdown.position ?? ""}
            {breakdown.team ? ` · ${breakdown.team}` : ""}
            {opp ? ` · ${opp}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {matchup && (
            <span className={`hidden shrink-0 rounded-[3px] border px-2.5 py-1 text-[11px] font-semibold sm:inline ${MATCHUP_PILL[matchup.tone]}`}>
              {matchup.text}
            </span>
          )}
          <div className="text-right">
            <div className="font-jost text-[19px] font-semibold leading-none tabular-nums">
              {breakdown.finalScore != null ? breakdown.finalScore.toFixed(1) : "—"}
            </div>
            <div className="mt-1 font-engraved text-[9.5px] uppercase tracking-[0.08em] text-foreground/40">proj · {formatLabel}</div>
          </div>
          {hasNotes ? <ChevronIcon open={open} /> : <span className="w-4 shrink-0" />}
        </div>
      </button>

      {hasNotes && open && (
        <div className="px-4 pb-4 pl-[68px]">
          <ul className="flex flex-col gap-2.5 border-t border-foreground/[0.07] pt-3.5">
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
      <span className="shrink-0 font-jost text-[16px] font-semibold tabular-nums text-foreground/70">
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
      <div className="glass-card-accent flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-accent/25 p-6">
        <div>
          <div className="font-engraved text-[11px] uppercase tracking-[0.16em] text-accent">
            Optimal lineup
          </div>
          <h2 className="mt-1.5 font-jost text-[25px] font-semibold leading-none tracking-[-0.01em]">Your best starting lineup</h2>
          <p className="mt-2 text-[12.5px] text-foreground/50">
            {filled.length} of {slots.length} slots filled
            {emptyCount > 0 ? ` · ${emptyCount} still open` : ""} · {formatLabel}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-jost text-[40px] font-semibold leading-none tabular-nums text-accent">
            <CountUpNumber value={projectedTotal} decimals={1} />
          </div>
          <div className="mt-1 font-engraved text-[10.5px] uppercase tracking-[0.08em] text-foreground/40">projected points</div>
        </div>
      </div>

      {/* starters */}
      <div>
        <h3 className="mb-3 font-engraved text-[12px] uppercase tracking-[0.1em] text-foreground/50">Starters</h3>
        <div className="glass-card overflow-hidden rounded-2xl border border-foreground/12">
          {slots.map((slot, i) => {
            const heading = slotHeading(slot, countBySlotType[slot.slotType] ?? 1);
            return slot.breakdown ? (
              <StarterRow key={`${slot.slotType}-${i}`} heading={heading} breakdown={slot.breakdown} formatLabel={formatLabel} />
            ) : (
              <EmptySlotRow key={`${slot.slotType}-${i}`} heading={heading} />
            );
          })}
        </div>
      </div>

      {/* bench */}
      {sortedBench.length > 0 && (
        <div>
          <h3 className="mb-3 font-engraved text-[12px] uppercase tracking-[0.1em] text-foreground/50">
            Bench <span className="font-mono text-foreground/35">{sortedBench.length}</span>
          </h3>
          <div className="glass-card overflow-hidden rounded-2xl border border-foreground/12">
            {sortedBench.map((breakdown) => (
              <BenchRow key={breakdown.playerId} breakdown={breakdown} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
