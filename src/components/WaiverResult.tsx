"use client";

import { useState } from "react";
import type { TradeEvaluation, TradeVerdict } from "@/lib/trade/evaluateTrade";
import type { ExtendedPosition, ScoringFormat } from "@/lib/sportsdata/types";
import { ChevronIcon } from "./CollapsibleSection";

export interface WaiverCandidateResponse {
  playerId: number;
  displayName: string;
  position: ExtendedPosition;
  team: string | null;
  recentVolumeAvg: number;
  recentPprAvg: number;
  gamesUsedForRecent: number;
  positionLabel: string;
  productionLabel: string;
  reasoning: string[];
  injuryStatus: string | null;
  dropSuggestion: TradeEvaluation | null;
}

interface WaiverResultProps {
  candidatesByPosition: Record<ExtendedPosition, WaiverCandidateResponse[]>;
  scoringFormat: ScoringFormat;
  onMarkRostered: (playerId: number, displayName: string, position: string, team: string | null) => void;
  /** Only meaningful in manual mode — once a Sleeper league is connected, the whole league's rosters are already excluded automatically, and this button's "add to my roster" behavior isn't correct for a candidate who actually turns out to be on an opponent's team. */
  showRosteredButton: boolean;
}

// D/ST and K last — they're a different kind of signal (this week's
// matchup vs. season rank, not opportunity vs. production), so they're
// visually the "also worth a look" tail of the page, not mixed into the
// skill-position flow. Exported so the Home page's compact waiver widget
// can pick the same "best" candidate this page would show first, rather
// than re-deriving its own priority order.
export const POSITION_ORDER: ExtendedPosition[] = ["QB", "RB", "WR", "TE", "DST", "K"];

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

// Full literal class strings, not interpolated — Tailwind's static scanner
// can't resolve a template like `bg-${token}`, only complete class names
// it finds verbatim in source (same constraint TradeResult.tsx documents).
const VERDICT_DOT: Record<TradeVerdict, string> = {
  good: "bg-good",
  bad: "bg-bad",
  fair: "bg-caution",
  unknown: "bg-info",
};

/** D/ST and K use a "this week vs. this season" gap (real streaming logic), not skill positions' "volume vs. points" opportunity gap — see rankExtendedCandidates.ts. Exported for reuse by the Home page's compact waiver widget. */
export function isStreamingPosition(position: ExtendedPosition): boolean {
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

/**
 * A drop+add isn't a trade between two sides — there's no trade
 * partner, just you swapping one roster spot — so this rebuilds the
 * headline with "move" phrasing from evaluateTrade()'s own verdict/
 * netValue rather than reusing its "trade"-worded headline string
 * verbatim. Deliberately doesn't touch evaluateTrade() itself: that
 * function (and its headline) is shared with the real Trade Analyzer,
 * where "trade" is the correct word. Exported for reuse by the Home
 * page's compact waiver widget, which surfaces the same drop suggestion
 * in miniature rather than re-deriving its own headline text.
 */
export function moveHeadline(evaluation: TradeEvaluation): string {
  if (evaluation.verdict === "unknown" || evaluation.netValue == null) {
    return "Not enough data to grade this move.";
  }
  if (evaluation.verdict === "fair") {
    return "Fair move — roughly even value the rest of the season.";
  }
  if (evaluation.verdict === "good") {
    return `Good move for you — you gain about ${evaluation.netValue.toFixed(1)} points the rest of the season.`;
  }
  return `Bad move for you — you give up about ${Math.abs(evaluation.netValue).toFixed(1)} points the rest of the season.`;
}

function DropSuggestion({ evaluation, formatLabel }: { evaluation: TradeEvaluation; formatLabel: string }) {
  const dropped = evaluation.give[0];
  if (!dropped) return null;

  return (
    <div className="mt-4 rounded-2xl border border-foreground/[0.07] bg-foreground/[0.025] p-3.5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${VERDICT_DOT[evaluation.verdict]}`} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
          Suggested drop: {dropped.displayName}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/65">{moveHeadline(evaluation)}</p>
      <p className="mt-0.5 text-[11px] text-foreground/40">Rest-of-season value, {formatLabel}.</p>
    </div>
  );
}

function WaiverCandidateRow({
  candidate,
  formatLabel,
  showRosteredButton,
  onMarkRostered,
}: {
  candidate: WaiverCandidateResponse;
  formatLabel: string;
  showRosteredButton: boolean;
  onMarkRostered: WaiverResultProps["onMarkRostered"];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-foreground/[0.07] first:border-none">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-foreground/[0.02]"
        aria-expanded={expanded}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-[13px] font-bold text-accent">
          {initials(candidate.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-[14px] font-semibold tracking-tight">{candidate.displayName}</h3>
            {candidate.injuryStatus && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${injuryBadgeClasses(candidate.injuryStatus)}`}>
                {candidate.injuryStatus}
              </span>
            )}
          </div>
          <p className="truncate text-[12px] text-foreground/45">
            {candidate.position}
            {candidate.team ? ` · ${candidate.team}` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-good/12 px-2 py-0.5 text-[10px] font-semibold text-good">
              {candidate.positionLabel} {isStreamingPosition(candidate.position) ? "this week" : "by volume"}
            </span>
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-[10px] font-medium text-foreground/55">
              {candidate.productionLabel} {isStreamingPosition(candidate.position) ? "this season" : "by points"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-[15px] font-semibold tabular-nums">{candidate.recentPprAvg.toFixed(1)}</span>
          <span className="text-[10px] text-foreground/40">last {candidate.gamesUsedForRecent}g</span>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {showRosteredButton && (
            <button
              type="button"
              onClick={() => onMarkRostered(candidate.playerId, candidate.displayName, candidate.position, candidate.team)}
              className="mb-3 shrink-0 whitespace-nowrap rounded-full border border-foreground/10 px-2.5 py-1 text-[11px] font-medium text-foreground/50 transition-colors hover:border-foreground/20 hover:text-foreground"
            >
              Already rostered
            </button>
          )}

          <div className="border-t border-foreground/[0.07] pt-3.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Why</span>
            <ul className="mt-3 flex flex-col gap-2.5">
              {candidate.reasoning.map((line, i) => (
                <li key={i} className="relative pl-4 text-sm leading-relaxed text-foreground/70">
                  <span className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {candidate.dropSuggestion && <DropSuggestion evaluation={candidate.dropSuggestion} formatLabel={formatLabel} />}
        </div>
      )}
    </div>
  );
}

export function WaiverResult({
  candidatesByPosition,
  scoringFormat,
  showRosteredButton,
  onMarkRostered,
}: WaiverResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const hasAny = POSITION_ORDER.some((p) => (candidatesByPosition[p] ?? []).length > 0);

  if (!hasAny) {
    return (
      <p className="mt-10 text-center text-sm text-foreground/50">
        No standout opportunity-vs-production gaps right now — check back after a few more weeks of games, or once
        more of your roster is marked so we can look deeper into the pool.
      </p>
    );
  }

  return (
    <div className="mt-10 space-y-10">
      {POSITION_ORDER.map((position) => {
        const candidates = candidatesByPosition[position] ?? [];
        if (candidates.length === 0) return null;
        return (
          <div key={position}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{position}</h2>
            <div className="overflow-hidden rounded-3xl border border-foreground/10 bg-surface shadow-sm">
              {candidates.map((candidate) => (
                <WaiverCandidateRow
                  key={candidate.playerId}
                  candidate={candidate}
                  formatLabel={formatLabel}
                  showRosteredButton={showRosteredButton}
                  onMarkRostered={onMarkRostered}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
