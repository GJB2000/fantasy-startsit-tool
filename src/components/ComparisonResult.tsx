"use client";

import { useState } from "react";
import type { ComparisonResult as ComparisonResultData, PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";

interface ComparisonResultProps {
  result: ComparisonResultData;
  contextNote: string;
  scoringFormat: ScoringFormat;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

function injuryBadgeClasses(status: string) {
  if (status === "Out" || status === "Doubtful") {
    return "bg-bad/15 text-bad";
  }
  return "bg-caution/15 text-caution";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Tone = "good" | "caution" | "info";

function HeadlineIcon({ tone }: { tone: Tone }) {
  if (tone === "caution") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M8 7l8 10M16 7l-8 10" stroke="var(--caution)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9.2" stroke="var(--caution)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (tone === "info") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--info)" strokeWidth="2" />
        <path d="M15.5 15.5L20 20" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
      <path d="M5 13l4 4L19 7" stroke="var(--good)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A real, historically-validated accuracy rate per bucket — not a
 * fabricated per-pick confidence score. See CLAUDE.md's backtesting
 * history, item 45 (a real two-proportion z-test against the pooled
 * 2022-2025 backtest): "limited data" picks are genuinely MORE reliable
 * than "confident" ones (58.8% vs. 52.4%), and a real "close call" really
 * is close to a coin flip (~51%, item 22). isCloseCall/hasLimitedData
 * themselves are computed exactly as before in comparePlayers() — this
 * only maps those two already-existing flags to already-known numbers
 * for display, the same three-way split the headline text already uses.
 */
function getConfidence(result: ComparisonResultData): { pct: number; tone: Tone; label: string } {
  if (result.isCloseCall) {
    return { pct: 51, tone: "caution", label: "Close call — historically about a coin flip" };
  }
  if (result.hasLimitedData) {
    return { pct: 59, tone: "info", label: "Limited data — but historically our most reliable calls" };
  }
  return { pct: 52, tone: "good", label: "Confident pick" };
}

// Generic, honest reference points on a 0-100 win-rate scale — NOT four
// real accuracy tiers this app has separately validated (there are only
// three real numbers: 51/52/59%, all from CLAUDE.md's backtesting
// history). Our own real numbers sit in a narrow, genuinely modest band
// and will almost always land in the "Coin flip"/"Lean" zones here,
// never reaching "Confident"/"Lock" — a deliberate choice (see the
// Start/Sit redesign conversation) to keep the scale's meaning
// universally readable rather than curve-fitting it to this app's own
// range, consistent with this app's "don't force false confidence"
// philosophy: the dot mostly sitting low is an honest reflection of how
// hard this prediction problem really is, not a bug in the scale.
const CONFIDENCE_SCALE_MARKS = [
  { pct: 50, label: "Coin flip" },
  { pct: 60, label: "Lean" },
  { pct: 75, label: "Confident" },
  { pct: 90, label: "Lock" },
];

function ConfidenceBar({ pct, tone, label }: { pct: number; tone: Tone; label: string }) {
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Confidence</span>
        <span className="font-mono text-sm font-bold tabular-nums" style={{ color: `var(--${tone})` }}>
          {pct}%
        </span>
      </div>
      <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `var(--${tone})` }}
        />
        {CONFIDENCE_SCALE_MARKS.map((m) => (
          <span
            key={m.label}
            className="absolute inset-y-0 w-px bg-foreground/25"
            style={{ left: `${m.pct}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1 h-3.5">
        {CONFIDENCE_SCALE_MARKS.map((m) => (
          <span
            key={m.label}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[9.5px] font-medium uppercase tracking-wide text-foreground/35"
            style={{ left: `${m.pct}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-foreground/45">
        {label} — based on how often picks like this one have actually been right, not a per-pick estimate.
      </p>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The real range this player has actually produced recently (min/max of
 * recentPprFloor/Ceiling — real box-score numbers, not a statistical
 * projection interval; see PlayerScoreBreakdown's doc comment). The
 * recent AVERAGE always falls between floor and ceiling by construction
 * (it's the mean of the same values), so the marker never needs
 * clamping. A single-game sample renders floor===ceiling as one point,
 * labeled honestly rather than drawing a fake range.
 */
function FloorCeilingBar({ player }: { player: PlayerScoreBreakdown }) {
  const { recentPprFloor: floor, recentPprCeiling: ceiling, recentPprAvg: avg } = player;
  if (floor == null || ceiling == null || avg == null) return null;

  if (floor === ceiling) {
    return (
      <p className="mt-2 text-[11px] text-foreground/40">
        Only one recent game to go on — {floor.toFixed(1)} pts.
      </p>
    );
  }

  // Anchored to 0, not just floor->ceiling, so a real negative game
  // (possible for D/ST, whose FantasyPoints can go negative) doesn't
  // produce a negative `left` percentage — that would visually clip to
  // a full-width bar rather than an honest partial range.
  const scaleMin = Math.min(floor, 0);
  const scaleMax = Math.max(ceiling, 1) * 1.05;
  const scaleRange = scaleMax - scaleMin || 1;
  const toPct = (v: number) => ((v - scaleMin) / scaleRange) * 100;
  const floorPct = toPct(floor);
  const ceilingPct = toPct(ceiling);
  const avgPct = toPct(avg);

  return (
    <div className="mt-2">
      <div className="relative h-1.5 w-full rounded-full bg-foreground/10">
        <div
          className="absolute h-full rounded-full bg-accent/30"
          style={{ left: `${floorPct}%`, width: `${ceilingPct - floorPct}%` }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface"
          style={{ left: `${avgPct}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-foreground/40">
        <span>Floor {floor.toFixed(1)}</span>
        <span>Ceiling {ceiling.toFixed(1)}</span>
      </div>
    </div>
  );
}

const VOLUME_UNIT_LABEL: Record<string, string> = {
  QB: "Pass attempts/gm",
  RB: "Touches/gm",
  WR: "Targets/gm",
  TE: "Targets/gm",
};

interface StatTile {
  label: string;
  value: string;
}

/** Position-specific real signals, already computed on the breakdown — no new data, just picking which fields matter per position for a compact grid instead of one long list. */
function buildStatTiles(player: PlayerScoreBreakdown, formatLabel: string): StatTile[] {
  const tiles: StatTile[] = [];

  if (player.recentPprAvg != null) {
    tiles.push({ label: `Recent avg (${formatLabel})`, value: player.recentPprAvg.toFixed(1) });
  }
  if (player.seasonPprAvg != null) {
    tiles.push({ label: `Season avg (${formatLabel})`, value: player.seasonPprAvg.toFixed(1) });
  }
  if (player.position && player.recentVolumeAvg != null) {
    tiles.push({
      label: VOLUME_UNIT_LABEL[player.position] ?? "Volume/gm",
      value: player.recentVolumeAvg.toFixed(1),
    });
  }
  if (player.position === "RB" && player.redZoneTouchesAvg != null) {
    tiles.push({ label: "Red-zone touches/gm", value: player.redZoneTouchesAvg.toFixed(1) });
  }
  if (player.position === "TE" && player.snapShareAvg != null) {
    tiles.push({ label: "Snap share", value: `${(player.snapShareAvg * 100).toFixed(0)}%` });
  }
  if (player.position === "WR" && player.dropRateAvg != null) {
    tiles.push({ label: "Drop rate", value: `${(player.dropRateAvg * 100).toFixed(0)}%` });
  }
  if (player.position === "QB" && player.recentQbRushAttemptsAvg != null) {
    tiles.push({ label: "Rush attempts/gm", value: player.recentQbRushAttemptsAvg.toFixed(1) });
  }

  return tiles.slice(0, 4);
}

function PlayerCard({
  player,
  isRecommended,
  formatLabel,
}: {
  player: PlayerScoreBreakdown;
  isRecommended: boolean;
  formatLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const statTiles = buildStatTiles(player, formatLabel);

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition-all ${
        isRecommended ? "border-good/40 bg-good/[0.04]" : "border-foreground/10 bg-surface"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-sm font-bold text-accent">
          {initials(player.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight">{player.displayName}</h3>
          {player.position && (
            <p className="text-xs text-foreground/45">
              {player.position}
              {player.team ? ` · ${player.team}` : ""}
            </p>
          )}
        </div>
        {isRecommended && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-good/12 px-2.5 py-1 text-[11px] font-semibold text-good">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Start
          </span>
        )}
      </div>

      {(player.isOnByeThisWeek || player.injuryStatus || player.dataQuality !== "full") && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {player.isOnByeThisWeek && (
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/55">Bye week</span>
          )}
          {player.injuryStatus && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${injuryBadgeClasses(player.injuryStatus)}`}>
              {player.injuryStatus}
            </span>
          )}
          {player.dataQuality !== "full" && (
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/55">
              {player.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-foreground/[0.07] pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
          Our projection
        </span>
        <p className="mt-0.5 font-mono text-[32px] font-bold leading-none tabular-nums">
          {player.finalScore != null ? player.finalScore.toFixed(1) : "—"}
        </p>
        <FloorCeilingBar player={player} />
      </div>

      {statTiles.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-foreground/[0.07] pt-4">
          {statTiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl bg-foreground/[0.03] px-3 py-2">
              <p className="text-[10.5px] text-foreground/45">{tile.label}</p>
              <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums">{tile.value}</p>
            </div>
          ))}
        </div>
      )}

      {player.notes.length > 0 && (
        <div className="mt-4 border-t border-foreground/[0.07] pt-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-left text-[12.5px] font-semibold text-foreground/70"
            aria-expanded={expanded}
          >
            Why this pick
            <ChevronIcon open={expanded} />
          </button>
          {expanded && (
            <ul className="mt-3 flex flex-col gap-2.5">
              {player.notes.map((line, i) => (
                <li key={i} className="relative pl-4 text-sm leading-relaxed text-foreground/70">
                  <span className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ComparisonResult({ result, contextNote, scoringFormat }: ComparisonResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const winner = result.players.find((p) => p.playerId === result.recommendedPlayerId) ?? null;
  const confidence = getConfidence(result);
  const badgeSoft = confidence.tone === "caution" ? "bg-caution/12" : confidence.tone === "info" ? "bg-info/12" : "bg-good/12";

  // Ranked by our own real projection (finalScore) — result.players
  // itself is in selection order, not ranked order, so this is a pure
  // display sort using an already-real field, not a new signal.
  const rankedPlayers = [...result.players].sort((a, b) => {
    if (a.finalScore == null) return 1;
    if (b.finalScore == null) return -1;
    return b.finalScore - a.finalScore;
  });

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-3xl border border-foreground/10 bg-surface p-6 shadow-sm">
        {winner ? (
          <>
            <div className="flex items-start gap-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badgeSoft}`}>
                <HeadlineIcon tone={confidence.tone} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Start</p>
                <h2 className="mt-0.5 truncate font-display text-[34px] font-bold leading-tight tracking-tight">
                  {winner.displayName}
                </h2>
              </div>
            </div>

            <ConfidenceBar pct={confidence.pct} tone={confidence.tone} label={confidence.label} />

            <p className="mt-4 border-t border-foreground/[0.07] pt-4 text-sm leading-relaxed text-foreground/70">
              {result.headline}
            </p>
            <p className="mt-1 text-xs text-foreground/45">{contextNote}</p>
          </>
        ) : (
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/12">
              <HeadlineIcon tone="info" />
            </span>
            <div>
              <p className="text-lg font-semibold leading-snug tracking-tight">{result.headline}</p>
              <p className="mt-1 text-xs text-foreground/45">{contextNote}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rankedPlayers.map((player, i) => (
          <PlayerCard
            key={player.playerId ?? `unresolved-${i}`}
            player={player}
            isRecommended={player.playerId === result.recommendedPlayerId}
            formatLabel={formatLabel}
          />
        ))}
      </div>
    </div>
  );
}
