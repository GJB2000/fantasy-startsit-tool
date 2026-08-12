"use client";

import { useMemo, useState } from "react";
import type { TradeEvaluation, TradeVerdict } from "@/lib/trade/evaluateTrade";
import type { MatchupContext } from "@/lib/sportsdata/positionDefense";
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
  /** Rank by recent volume (skill) or this week's matchup (streaming) — the "opportunity" node. Lower is better. */
  volumeRank: number;
  /** Rank by recent points (skill) or season-long (streaming) — the "production" node. */
  pointsRank: number;
  positionLabel: string;
  productionLabel: string;
  /** Production is lagging the volume — show the buy-low tag + gap bar. Absent for D/ST and K. */
  isBuyLow?: boolean;
  /** Expected points from volume minus points scored; orders the buy-low spotlight. Absent for D/ST and K. */
  residualScore?: number;
  reasoning: string[];
  injuryStatus: string | null;
  dropSuggestion: TradeEvaluation | null;
  /** Full engine breakdown, already carried in the API response — we read matchup + consensus off it. */
  breakdown?: {
    matchupContext: MatchupContext | null;
    expertConsensusR2pPts: number | null;
  } | null;
}

interface WaiverResultProps {
  candidatesByPosition: Record<ExtendedPosition, WaiverCandidateResponse[]>;
  scoringFormat: ScoringFormat;
  onMarkRostered: (playerId: number, displayName: string, position: string, team: string | null) => void;
  /** Only meaningful in manual mode — once a Sleeper league is connected, the whole league's rosters are already excluded automatically, and this button's "add to my roster" behavior isn't correct for a candidate who actually turns out to be on an opponent's team. */
  showRosteredButton: boolean;
  /** The API's dynamic context note (e.g. "also excluding N players rostered by other teams"). */
  contextNote?: string;
}

// D/ST and K last — they're a different kind of signal (this week's
// matchup vs. season rank, not opportunity vs. production), so they're
// visually the "also worth a look" tail of the page, not mixed into the
// skill-position flow. Exported so the Home page's compact waiver widget
// can pick the same "best" candidate this page would show first, rather
// than re-deriving its own priority order.
export const POSITION_ORDER: ExtendedPosition[] = ["QB", "RB", "WR", "TE", "DST", "K"];

const POSITION_FULL: Record<ExtendedPosition, string> = {
  QB: "Quarterback",
  RB: "Running back",
  WR: "Wide receiver",
  TE: "Tight end",
  DST: "Streaming defenses",
  K: "Streaming kickers",
};

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

// Per-position depth the gap bar's track is scaled to (rank 1 = far left,
// scale = far right). Chosen roughly at each position's rosterable depth so
// the green opportunity→production span stays proportional and readable.
const GAP_SCALE: Record<string, number> = { QB: 36, RB: 72, WR: 84, TE: 36, DST: 32, K: 32 };

const UNIT_SHORT: Record<string, string> = { QB: "pass att", RB: "touches", WR: "targets", TE: "targets" };

// Position accent CSS vars (globals.css, theme-aware) — a scanning cue, not
// semantic color. Applied via inline style since they aren't Tailwind utilities.
const POS_VAR: Record<string, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
  K: "var(--pos-k)",
  DST: "var(--pos-dst)",
};
function posVar(position: string): string {
  return POS_VAR[position] ?? "var(--foreground)";
}

// Full literal class strings, not interpolated — Tailwind's static scanner
// can't resolve a template like `bg-${token}`, only complete class names
// it finds verbatim in source (same constraint TradeResult.tsx documents).
const VERDICT_DOT: Record<TradeVerdict, string> = {
  good: "bg-good",
  bad: "bg-bad",
  fair: "bg-caution",
  unknown: "bg-info",
};

type MatchupTone = "good" | "tough" | "neutral";
const MATCHUP_PILL: Record<MatchupTone, string> = {
  good: "text-good bg-good/12 border-good/30",
  tough: "text-bad bg-bad/12 border-bad/30",
  neutral: "text-caution bg-caution/12 border-caution/30",
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

function matchupPill(candidate: WaiverCandidateResponse): { text: string; tone: MatchupTone } | null {
  const m = candidate.breakdown?.matchupContext;
  if (!m) return null;
  if (m.diffFromAverage > 1.5) return { text: "Favorable", tone: "good" };
  if (m.diffFromAverage < -1.5) return { text: "Tough", tone: "tough" };
  return { text: "Neutral", tone: "neutral" };
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

function Avatar({ candidate, size }: { candidate: WaiverCandidateResponse; size: number }) {
  const color = posVar(candidate.position);
  const streaming = isStreamingPosition(candidate.position);
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
      {streaming ? (candidate.team ?? initials(candidate.displayName)) : initials(candidate.displayName)}
    </span>
  );
}

function PosChip({ position }: { position: ExtendedPosition }) {
  return (
    <span
      className="rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider"
      style={{
        background: posVar(position),
        color: isStreamingPosition(position) ? "var(--premium-ink)" : "#fff",
      }}
    >
      {position}
    </span>
  );
}

/** Tag for a candidate whose recent production is lagging their recent volume — a value pickup. */
function BuyLowTag({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span
      className={`shrink-0 rounded-[3px] border border-accent/45 bg-accent/12 font-engraved uppercase tracking-[0.1em] text-accent ${
        size === "lg" ? "px-2 py-0.5 text-[10.5px]" : "px-1.5 py-0.5 text-[9.5px]"
      }`}
    >
      Buy-low
    </span>
  );
}

/** The buy-low illustration: a position-rank axis with the "opportunity" node (volume/this-week, green) sitting ahead of the "production" node (points/season, hollow), the green span between them = the gap. Shown for streaming (this-week vs. season) and for skill buy-lows. */
function GapBar({ candidate, size }: { candidate: WaiverCandidateResponse; size: "sm" | "lg" }) {
  const scale = GAP_SCALE[candidate.position] ?? 60;
  const streaming = isStreamingPosition(candidate.position);
  const op = Math.min(100, Math.max(2, (candidate.volumeRank / scale) * 100));
  const pr = Math.min(100, Math.max(2, (candidate.pointsRank / scale) * 100));
  const lo = Math.min(op, pr);
  const width = Math.abs(pr - op);
  const gap = Math.abs(candidate.pointsRank - candidate.volumeRank);
  const node = size === "lg" ? 14 : 12;

  return (
    <div>
      {size === "lg" && (
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-engraved text-[10.5px] uppercase tracking-[0.14em] text-foreground/50">
            {streaming ? "This week vs. season · " : "Usage vs. output · "}
            {candidate.position} rank
          </span>
          <span className="rounded-[3px] border border-accent/45 bg-accent/12 px-2 py-0.5 font-mono text-[11px] font-bold text-accent">
            +{gap} gap
          </span>
        </div>
      )}
      <div className={`relative rounded-full border border-foreground/[0.06] bg-foreground/[0.09] ${size === "lg" ? "h-2.5" : "h-2"}`}>
        <div
          className="absolute -inset-y-px rounded-full"
          style={{ left: `${lo}%`, width: `${width}%`, background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent))" }}
        />
        <span
          className="absolute top-1/2 rounded-full bg-accent"
          style={{ left: `${op}%`, width: node, height: node, transform: "translate(-50%,-50%)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent)" }}
        />
        <span
          className="absolute top-1/2 rounded-full border-2 border-foreground/25 bg-surface"
          style={{ left: `${pr}%`, width: node, height: node, transform: "translate(-50%,-50%)" }}
        />
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3 text-[12px]">
        <span className="font-semibold text-accent">
          <span className="font-mono">{candidate.positionLabel}</span>{" "}
          <span className="text-[10px] uppercase tracking-wide text-foreground/40">{streaming ? "this week" : "opportunity"}</span>
        </span>
        <span className="text-right text-foreground/55">
          <span className="font-mono font-bold">{candidate.productionLabel}</span>{" "}
          <span className="text-[10px] uppercase tracking-wide text-foreground/40">{streaming ? "season" : "production"}</span>
        </span>
      </div>
    </div>
  );
}

function RosteredButton({
  candidate,
  onMarkRostered,
}: {
  candidate: WaiverCandidateResponse;
  onMarkRostered: WaiverResultProps["onMarkRostered"];
}) {
  return (
    <button
      type="button"
      onClick={() => onMarkRostered(candidate.playerId, candidate.displayName, candidate.position, candidate.team)}
      className="whitespace-nowrap rounded-[3px] border border-foreground/15 px-2.5 py-1 text-[11px] font-medium text-foreground/50 transition-colors hover:border-foreground/30 hover:text-foreground"
    >
      Already rostered
    </button>
  );
}

function DropSuggestion({ evaluation, formatLabel }: { evaluation: TradeEvaluation; formatLabel: string }) {
  const dropped = evaluation.give[0];
  if (!dropped) return null;
  return (
    <div className="mt-4 rounded-[3px] border border-foreground/12 bg-foreground/[0.025] p-3.5">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${VERDICT_DOT[evaluation.verdict]}`} />
        <span className="font-engraved text-[11px] uppercase tracking-[0.08em] text-foreground/50">
          Suggested drop: {dropped.displayName}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/65">{moveHeadline(evaluation)}</p>
      <p className="mt-0.5 text-[11px] text-foreground/40">Rest-of-season value, {formatLabel}.</p>
    </div>
  );
}

function SpotlightCard({
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
  const unit = UNIT_SHORT[candidate.position] ?? "touches";
  const consensus = candidate.breakdown?.expertConsensusR2pPts ?? null;
  const matchup = matchupPill(candidate);

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-premium/50 p-6 shadow-[0_22px_54px_-26px_color-mix(in_srgb,var(--premium)_24%,transparent)] backdrop-blur-2xl [background:radial-gradient(120%_140%_at_100%_0%,color-mix(in_srgb,var(--premium)_14%,transparent),transparent_55%),color-mix(in_srgb,var(--surface)_46%,transparent)]">
      <span className="absolute right-6 top-0 rounded-b-[3px] bg-premium px-3 py-1 font-engraved text-[10.5px] uppercase tracking-[0.16em] text-premium-ink">
        Top target this week
      </span>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1.35fr_1fr] sm:items-center">
        <div>
          <div className="flex items-center gap-4">
            <Avatar candidate={candidate} size={54} />
            <div className="min-w-0">
              <h3 className="font-jost text-[28px] font-semibold leading-none tracking-[-0.01em]">{candidate.displayName}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-foreground/55">
                <PosChip position={candidate.position} />
                {candidate.isBuyLow && <BuyLowTag size="lg" />}
                <span>
                  {candidate.team ?? "FA"}
                  {candidate.breakdown?.matchupContext ? ` · vs ${candidate.breakdown.matchupContext.opponentTeam}` : ""}
                </span>
                {candidate.injuryStatus && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${injuryBadgeClasses(candidate.injuryStatus)}`}>
                    {candidate.injuryStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3">
            <div>
              <div className="font-jost text-[26px] font-semibold leading-none">
                {candidate.recentVolumeAvg.toFixed(1)}
                <span className="ml-1 text-[13px] font-medium text-foreground/40">/gm</span>
              </div>
              <div className="mt-1 text-[11px] text-foreground/40">{unit}, last {candidate.gamesUsedForRecent}</div>
            </div>
            <div>
              <div className="font-jost text-[26px] font-semibold leading-none">
                {candidate.recentPprAvg.toFixed(1)}
                <span className="ml-1 text-[13px] font-medium text-foreground/40">pts</span>
              </div>
              <div className="mt-1 text-[11px] text-foreground/40">recent {formatLabel}</div>
            </div>
            {consensus != null && consensus > 0 && (
              <div>
                <div className="font-jost text-[26px] font-semibold leading-none text-accent">
                  {consensus.toFixed(1)}
                  <span className="ml-1 text-[13px] font-medium text-foreground/40">pts</span>
                </div>
                <div className="mt-1 text-[11px] text-foreground/40">consensus proj.</div>
              </div>
            )}
          </div>

          {candidate.reasoning[0] && (
            <p className="mt-4 max-w-[46ch] border-l-2 border-accent pl-3 text-[13.5px] leading-relaxed text-foreground/70">
              {candidate.reasoning[0]}
            </p>
          )}
        </div>

        <div>
          <GapBar candidate={candidate} size="lg" />
          {matchup && (
            <div className="mt-4">
              <span className={`rounded-[3px] border px-2.5 py-1 text-[11.5px] font-semibold ${MATCHUP_PILL[matchup.tone]}`}>
                {matchup.text} matchup
              </span>
            </div>
          )}
          {candidate.dropSuggestion ? (
            <DropSuggestion evaluation={candidate.dropSuggestion} formatLabel={formatLabel} />
          ) : (
            <p className="mt-4 text-[13px] text-foreground/50">
              Connect a roster to see a swap — <span className="font-semibold text-accent">drop your weakest bench {candidate.position}</span>, graded on rest-of-season value.
            </p>
          )}
          {showRosteredButton && (
            <div className="mt-4">
              <RosteredButton candidate={candidate} onMarkRostered={onMarkRostered} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WaiverCandidateRow({
  candidate,
  rank,
  formatLabel,
  showRosteredButton,
  onMarkRostered,
}: {
  candidate: WaiverCandidateResponse;
  rank: number;
  formatLabel: string;
  showRosteredButton: boolean;
  onMarkRostered: WaiverResultProps["onMarkRostered"];
}) {
  const [expanded, setExpanded] = useState(false);
  const streaming = isStreamingPosition(candidate.position);
  const unit = UNIT_SHORT[candidate.position] ?? "touches";
  const matchup = matchupPill(candidate);
  const stat = streaming ? candidate.recentPprAvg : candidate.recentVolumeAvg;
  const statLabel = streaming ? `recent ${formatLabel}` : `${unit}/gm`;

  return (
    <div className="border-t border-foreground/[0.07] first:border-none">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="grid w-full grid-cols-[36px_1fr_auto] items-center gap-x-4 gap-y-4 px-4 py-4 text-left transition-colors hover:bg-foreground/[0.02] sm:grid-cols-[36px_minmax(150px,1.4fr)_minmax(0,1.7fr)_auto]"
        aria-expanded={expanded}
      >
        <span className="text-center font-jost text-[16px] font-semibold text-foreground/40">{String(rank).padStart(2, "0")}</span>

        <div className="flex min-w-0 items-center gap-3">
          <Avatar candidate={candidate} size={38} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-jost text-[15px] font-semibold tracking-tight">{candidate.displayName}</h3>
              {candidate.isBuyLow && <BuyLowTag />}
              {candidate.injuryStatus && (
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${injuryBadgeClasses(candidate.injuryStatus)}`}>
                  {candidate.injuryStatus}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[12px] text-foreground/45">
              {candidate.team ?? "FA"}
              {candidate.breakdown?.matchupContext ? ` · vs ${candidate.breakdown.matchupContext.opponentTeam}` : ""}
            </p>
          </div>
        </div>

        <div className="col-span-3 min-w-0 sm:col-span-1 sm:col-start-3">
          {streaming || candidate.isBuyLow ? (
            <GapBar candidate={candidate} size="sm" />
          ) : (
            <p className="text-[12px] leading-relaxed text-foreground/40">
              Producing in line with the workload — a volume play, not a buy-low.
            </p>
          )}
        </div>

        <div className="col-start-3 row-start-1 flex items-center justify-end gap-3 sm:col-start-4 sm:row-start-auto">
          {matchup && (
            <span className={`hidden shrink-0 rounded-[3px] border px-2.5 py-1 text-[11px] font-semibold sm:inline ${MATCHUP_PILL[matchup.tone]}`}>
              {matchup.text}
            </span>
          )}
          <div className="text-right">
            <div className="font-jost text-[18px] font-semibold tabular-nums">{stat.toFixed(1)}</div>
            <div className="text-[10px] text-foreground/40">{statLabel}</div>
          </div>
          <ChevronIcon open={expanded} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {showRosteredButton && (
            <div className="mb-3">
              <RosteredButton candidate={candidate} onMarkRostered={onMarkRostered} />
            </div>
          )}
          <div className="border-t border-foreground/[0.09] pt-3.5">
            <span className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">Why</span>
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

function Section({
  position,
  candidates,
  formatLabel,
  showRosteredButton,
  onMarkRostered,
}: {
  position: ExtendedPosition;
  candidates: WaiverCandidateResponse[];
  formatLabel: string;
  showRosteredButton: boolean;
  onMarkRostered: WaiverResultProps["onMarkRostered"];
}) {
  if (candidates.length === 0) return null;
  const streaming = isStreamingPosition(position);
  return (
    <div>
      <div className="mb-3 flex items-center gap-2.5">
        <PosChip position={position} />
        <span className="font-engraved text-[13px] uppercase tracking-[0.1em] text-foreground/60">{POSITION_FULL[position]}</span>
        <span className="h-px flex-1 bg-foreground/15" />
      </div>
      {streaming && (
        <p className="mb-3 text-[12px] text-foreground/40">
          Defenses swing week to week, so these rank by <b className="font-semibold text-foreground/60">this week&apos;s matchup</b> against their season baseline — a spot start, not a season hold.
        </p>
      )}
      <div className="glass-card overflow-hidden rounded-2xl border border-foreground/12">
        {candidates.map((candidate, i) => (
          <WaiverCandidateRow
            key={candidate.playerId}
            candidate={candidate}
            rank={i + 1}
            formatLabel={formatLabel}
            showRosteredButton={showRosteredButton}
            onMarkRostered={onMarkRostered}
          />
        ))}
      </div>
    </div>
  );
}

export function WaiverResult({
  candidatesByPosition,
  scoringFormat,
  showRosteredButton,
  onMarkRostered,
  contextNote,
}: WaiverResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const [tab, setTab] = useState<"ALL" | ExtendedPosition>("ALL");

  const total = useMemo(
    () => POSITION_ORDER.reduce((n, p) => n + (candidatesByPosition[p] ?? []).length, 0),
    [candidatesByPosition]
  );

  // Spotlight: the standout BUY-LOW — the skill candidate whose production
  // most lags their volume (biggest residual). The list is ranked by volume;
  // the spotlight calls out the best value within it. Null when nothing is a
  // buy-low (streaming positions use a different signal and are excluded).
  const spotlight = useMemo(() => {
    let best: WaiverCandidateResponse | null = null;
    let bestResidual = 0;
    for (const p of POSITION_ORDER) {
      if (isStreamingPosition(p)) continue;
      for (const c of candidatesByPosition[p] ?? []) {
        if (!c.isBuyLow) continue;
        const residual = c.residualScore ?? 0;
        if (residual > bestResidual) {
          bestResidual = residual;
          best = c;
        }
      }
    }
    return best;
  }, [candidatesByPosition]);

  if (total === 0) {
    return (
      <p className="mt-10 text-center text-sm text-foreground/50">
        No waiver targets to surface right now — check back after a few more weeks of games, or mark more of your roster
        so we can look deeper into the pool.
      </p>
    );
  }

  const availablePositions = POSITION_ORDER.filter((p) => (candidatesByPosition[p] ?? []).length > 0);
  const showSpotlight = tab === "ALL" && spotlight != null;
  const visiblePositions = tab === "ALL" ? availablePositions : [tab];

  return (
    <div className="mt-10">
      {contextNote && <p className="text-[12px] text-foreground/40">{contextNote}</p>}

      {showSpotlight && spotlight && (
        <SpotlightCard
          candidate={spotlight}
          formatLabel={formatLabel}
          showRosteredButton={showRosteredButton}
          onMarkRostered={onMarkRostered}
        />
      )}

      {/* tabs */}
      <div className="mt-8 flex flex-wrap gap-x-6 border-b border-foreground/15" role="tablist" aria-label="Positions">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ALL"}
          onClick={() => setTab("ALL")}
          className={`relative -mb-px py-2.5 font-engraved text-[12px] uppercase tracking-[0.08em] transition-colors ${tab === "ALL" ? "text-foreground" : "text-foreground/50 hover:text-foreground/80"}`}
        >
          All <span className="font-mono text-[11px] text-foreground/40">{total}</span>
          {tab === "ALL" && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
        </button>
        {availablePositions.map((p) => {
          const count = (candidatesByPosition[p] ?? []).length;
          const active = tab === p;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(p)}
              className={`relative -mb-px py-2.5 font-engraved text-[12px] uppercase tracking-[0.08em] transition-colors ${active ? "text-foreground" : "text-foreground/50 hover:text-foreground/80"}`}
            >
              {p === "DST" ? "D/ST" : p} <span className="font-mono text-[11px] text-foreground/40">{count}</span>
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent" />}
            </button>
          );
        })}
      </div>

      {/* sections */}
      <div className="mt-7 flex flex-col gap-8">
        {visiblePositions.map((position) => {
          let candidates = candidatesByPosition[position] ?? [];
          // The spotlight is shown as its own hero on the All tab, so don't
          // repeat it inside its own section there.
          if (showSpotlight && spotlight && position === spotlight.position) {
            candidates = candidates.filter((c) => c.playerId !== spotlight.playerId);
          }
          return (
            <Section
              key={position}
              position={position}
              candidates={candidates}
              formatLabel={formatLabel}
              showRosteredButton={showRosteredButton}
              onMarkRostered={onMarkRostered}
            />
          );
        })}
      </div>

      <p className="mt-10 max-w-[68ch] border-t border-foreground/10 pt-5 text-[12px] leading-relaxed text-foreground/40">
        <b className="text-foreground/55">How to read the board.</b> Players are ranked by recent{" "}
        <b className="text-foreground/55">usage</b> — the touches or targets already coming their way, the strongest
        signal for what&apos;s ahead. A <b className="text-foreground/55">Buy-low</b> tag (and the green→hollow bar) flags
        players whose points haven&apos;t yet caught up to that workload. Everyone already rostered in your league is
        filtered out, and every pickup can be paired with a same-position drop graded on rest-of-season value.
      </p>
    </div>
  );
}
