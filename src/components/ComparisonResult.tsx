"use client";

import type { GameWeather } from "@/lib/nflverse/schedules";
import type { PlayerProps } from "@/lib/oddsapi/types";
import type { ComparisonResult as ComparisonResultData, PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";

interface ComparisonResultProps {
  result: ComparisonResultData;
  contextNote: string;
  scoringFormat: ScoringFormat;
  /** Display-only betting lines per playerId (The Odds API) — empty in the offseason before books post props. */
  propsByPlayerId?: Record<number, PlayerProps>;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

// Betting-line props only apply to the skill positions we fetch markets
// for (see oddsapi/props.ts) — not K or D/ST, so the section is gated to
// these, whether or not there's data yet.
function isSkillCardPosition(position: string | null): boolean {
  return position === "QB" || position === "RB" || position === "WR" || position === "TE";
}

const DOME_ROOFS = new Set(["dome", "closed"]);

/**
 * nflverse's schedule only carries actual recorded conditions, not a
 * pregame forecast — wind/temp are frequently blank for games that
 * haven't happened yet. Roof type is a fixed stadium property, so it's
 * always knowable in advance regardless of how far out the game is.
 */
function formatWeather(weather: GameWeather | null): string {
  if (!weather) return "Not yet available";
  if (DOME_ROOFS.has(weather.roof)) return "Dome";
  if (weather.temp == null && weather.wind == null) return "Forecast not yet available";
  const parts: string[] = [];
  if (weather.temp != null) parts.push(`${weather.temp}°F`);
  if (weather.wind != null) parts.push(`${weather.wind} mph wind`);
  return parts.join(" · ");
}

function matchupLabel(diffFromAverage: number): { text: string; tone: "good" | "bad" | "neutral" } {
  if (diffFromAverage > 1.5) return { text: "favorable", tone: "good" };
  if (diffFromAverage < -1.5) return { text: "tough", tone: "bad" };
  return { text: "average", tone: "neutral" };
}

const MATCHUP_TONE_CLASSES: Record<"good" | "bad" | "neutral", string> = {
  good: "bg-good/12 text-good",
  bad: "bg-bad/12 text-bad",
  neutral: "bg-foreground/8 text-foreground/55",
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-foreground/35" fill="none">
      <path
        d="M12 3l7 3v5c0 4.2-2.9 7.5-7 8.5-4.1-1-7-4.3-7-8.5V6l7-3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-foreground/35" fill="none">
      <path
        d="M7 18h9a3.5 3.5 0 00.4-6.98A5 5 0 007 9.5 3.75 3.75 0 007 18z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BettingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-foreground/35" fill="none">
      <path
        d="M4 8.5l7-3.2a2 2 0 011.7 0l7 3.2M4 8.5v7l7 3.2a2 2 0 001.7 0l7-3.2v-7M4 8.5l8 3.7 8-3.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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

interface ConfidenceRates {
  confident: number;
  limitedData: number;
  closeCall: number;
}

/**
 * Real per-position pick accuracy for each of the three confidence
 * buckets — QB/RB/WR/TE pulled from the pooled 2022-2025 nflverse-only
 * multiseason backtest (/api/backtest/broad-nflverse-multiseason,
 * filtered per position), the same pooled cross-season source item 45's
 * original z-test used for the old pooled 51/52/59 numbers, just broken
 * out by position instead of combined. D/ST and K come from the primary
 * 2025 SportsDataIO pipeline only (/api/backtest/broad?positions=DST|K)
 * — the nflverse-only pipeline has no D/ST/K support at all (see
 * CLAUDE.md Open Items), so these two rest on one season, not a
 * four-season pool — a real difference in rigor from the skill
 * positions, not hidden here.
 *
 * A genuinely useful finding from pulling these real numbers, not
 * assumed going in: the pooled ordering (closeCall worst, confident
 * middle, limitedData best) does NOT hold per position. RB's confident
 * bucket (61.6%) actually beats its own limited-data bucket (59.6%);
 * K's confident bucket (38.7%, n=31) is the WORST of its three, below a
 * coin flip; D/ST's close-call bucket (64.3%) is nowhere near a coin
 * flip. The label text below is written generically for exactly this
 * reason — it no longer claims a specific cross-bucket ranking, since
 * that ranking isn't universal. Sample sizes vary a lot by bucket
 * (close-call buckets in particular are often n<60) — read the number as
 * real signal, not decimal-point precision.
 */
const CONFIDENCE_BY_POSITION: Record<string, ConfidenceRates> = {
  QB: { confident: 55, limitedData: 65, closeCall: 45 },
  RB: { confident: 62, limitedData: 60, closeCall: 52 },
  WR: { confident: 53, limitedData: 61, closeCall: 49 },
  TE: { confident: 59, limitedData: 56, closeCall: 56 },
  DST: { confident: 64, limitedData: 66, closeCall: 64 },
  K: { confident: 39, limitedData: 55, closeCall: 50 },
};

/** Only used if a recommended player's position somehow isn't in the table above — the old pooled-across-everything numbers, not a real position's rate. */
const POOLED_CONFIDENCE: ConfidenceRates = { confident: 52, limitedData: 59, closeCall: 51 };

const POSITION_DISPLAY_LABEL: Record<string, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  DST: "D/ST",
  K: "K",
};

function getConfidence(result: ComparisonResultData): { pct: number; tone: Tone; label: string } {
  const winner = result.players.find((p) => p.playerId === result.recommendedPlayerId);
  const position = winner?.position ?? null;

  // Calibrated confidence (real accuracy % for this projection gap — see
  // GAP_CONFIDENCE_CURVE) is the number when available: it scales with the
  // specific players, so a blowout reads far more confident than a
  // toss-up, unlike the old coarse buckets.
  if (result.confidence != null) {
    const pct = result.confidence;
    const winnerName = winner ? winner.displayName.split(" ").slice(-1)[0] : "this pick";
    if (pct < 56) return { pct, tone: "caution", label: "Coin flip — essentially a toss-up" };
    if (pct < 66) return { pct, tone: "info", label: `Lean ${winnerName} — a modest edge` };
    if (pct < 74) return { pct, tone: "good", label: "Confident pick — a clear edge" };
    return { pct, tone: "good", label: "Strong pick — about as sure as it gets here" };
  }

  // Fallback: the older 3-bucket, position-aware confidence (item 86).
  const rates = (position && CONFIDENCE_BY_POSITION[position]) || POOLED_CONFIDENCE;
  const positionLabel = (position && POSITION_DISPLAY_LABEL[position]) || "this position";
  if (result.isCloseCall) {
    return { pct: rates.closeCall, tone: "caution", label: `Close call — a genuinely tight score gap for ${positionLabel}` };
  }
  if (result.hasLimitedData) {
    return { pct: rates.limitedData, tone: "info", label: `Limited recent data for at least one ${positionLabel}` };
  }
  return { pct: rates.confident, tone: "good", label: `Confident pick for ${positionLabel}` };
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

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-foreground/35" fill="none">
      <path
        d="M3 12h4l2-5 4 10 2-5h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Health status from real fields — the player's injury designation, bye, or "Active" (no injury listed). Never overclaims: "Active" means not injury-listed, not a guarantee of full health. */
function healthStatusValue(player: PlayerScoreBreakdown): string {
  if (player.injuryStatus) return player.injuryStatus;
  if (player.isOnByeThisWeek) return "On bye";
  return "Active";
}

function healthToneClass(player: PlayerScoreBreakdown): string {
  if (player.injuryStatus === "Out" || player.injuryStatus === "Doubtful") return "text-bad";
  if (player.injuryStatus) return "text-caution"; // Questionable and the like
  if (player.isOnByeThisWeek) return "text-foreground/60";
  return "text-good";
}

/**
 * One-sentence "case for starting" — the single most compelling REAL
 * positive on this player's breakdown, in priority order (favorable
 * matchup → recent form/ceiling → projection). No fabricated data; every
 * branch reads an already-computed field.
 */
function buildCaseFor(player: PlayerScoreBreakdown): string {
  const pos = (player.position && POSITION_DISPLAY_LABEL[player.position]) || "this spot";
  const m = player.matchupContext;
  const games = player.gamesUsedForRecent;
  if (m && matchupLabel(m.diffFromAverage).tone === "good") {
    return `Draws a favorable matchup — ${m.opponentTeam} has been one of the softer defenses against ${pos}s lately.`;
  }
  if (player.recentPprAvg != null && player.recentPprCeiling != null) {
    return `In form lately — averaging ${player.recentPprAvg.toFixed(1)} PPR over the last ${games} game${
      games === 1 ? "" : "s"
    }, with a ceiling of ${player.recentPprCeiling.toFixed(1)}.`;
  }
  if (player.finalScore != null) {
    return `Projects for ${player.finalScore.toFixed(1)} PPR points this week.`;
  }
  return `Limited recent data, but still worth a look here.`;
}

/**
 * One-sentence "case against starting" — the single most relevant REAL
 * risk, in priority order (injury → bye → tough matchup → thin data →
 * boom/bust floor). Falls back to an honest "few red flags" when a player
 * genuinely has none.
 */
function buildCaseAgainst(player: PlayerScoreBreakdown): string {
  const pos = (player.position && POSITION_DISPLAY_LABEL[player.position]) || "this spot";
  const m = player.matchupContext;
  if (player.injuryStatus) {
    return `Injury risk — currently listed ${player.injuryStatus}.`;
  }
  if (player.isOnByeThisWeek) {
    return `On a bye this week — won't score at all.`;
  }
  if (m && matchupLabel(m.diffFromAverage).tone === "bad") {
    return `Tough matchup — ${m.opponentTeam} has been one of the stingier defenses against ${pos}s.`;
  }
  if (player.dataQuality !== "full") {
    return `Thin recent sample — limited data makes this projection less certain.`;
  }
  if (
    player.recentPprFloor != null &&
    player.recentPprAvg != null &&
    player.recentPprFloor < player.recentPprAvg * 0.6
  ) {
    return `Boom-or-bust — has dipped as low as ${player.recentPprFloor.toFixed(1)} in a recent game.`;
  }
  return `Few red flags — the main risk is normal week-to-week variance.`;
}

/**
 * A player's real recent floor-to-ceiling range (min/max of
 * recentPprFloor/Ceiling — real box-score numbers, not a statistical
 * projection interval; see PlayerScoreBreakdown's doc comment) shown as a
 * shaded band, with a marker at our actual projection (finalScore) so you
 * can see exactly where the projection sits relative to what they've
 * recently produced. The scale spans 0..max but is EXTENDED to include the
 * projection itself, so if the engine projects a player above their recent
 * ceiling (real — finalScore layers matchup/volume/consensus modifiers on
 * top of recent scoring), the marker sits truthfully to the right of the
 * band rather than being clipped or hidden. A single-game sample
 * (floor===ceiling) is labeled honestly rather than drawing a fake range.
 */
function FloorCeilingBar({ player }: { player: PlayerScoreBreakdown }) {
  const { recentPprFloor: floor, recentPprCeiling: ceiling, finalScore: proj } = player;
  if (floor == null || ceiling == null) return null;

  if (floor === ceiling) {
    return (
      <p className="mt-2 text-[11px] text-foreground/40">
        Only one recent game to go on — {floor.toFixed(1)} pts.
      </p>
    );
  }

  // Anchored to include 0 and the projection, so a real negative game
  // (possible for D/ST, whose FantasyPoints can go negative) or a
  // projection above the recent ceiling both stay on the bar honestly
  // rather than clipping to a full-width fill.
  const scaleMin = Math.min(floor, proj ?? floor, 0);
  const scaleMax = Math.max(ceiling, proj ?? ceiling, 1) * 1.05;
  const scaleRange = scaleMax - scaleMin || 1;
  const toPct = (v: number) => ((v - scaleMin) / scaleRange) * 100;
  const floorPct = toPct(floor);
  const ceilingPct = toPct(ceiling);

  return (
    <div className="mt-2">
      <div className="relative h-1.5 w-full rounded-full bg-foreground/10">
        <div
          className="absolute h-full rounded-full bg-accent/25"
          style={{ left: `${floorPct}%`, width: `${ceilingPct - floorPct}%` }}
        />
        {proj != null && (
          <div
            className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface"
            style={{ left: `${toPct(proj)}%` }}
            title={`Projection ${proj.toFixed(1)}`}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-foreground/40">
        <span>Floor {floor.toFixed(1)}</span>
        <span>Ceiling {ceiling.toFixed(1)}</span>
      </div>
    </div>
  );
}

// Per-position opportunity/volume stat: RB touches, WR/TE targets, all
// from recentVolumeAvg (the real volume signal). QB is handled separately
// (buildQbStatSlots) with a passing-focused grid.
const VOLUME_UNIT_LABEL: Record<string, string> = {
  RB: "Touches/gm",
  WR: "Targets/gm",
  TE: "Targets/gm",
};

// Reference maxima for the small magnitude bars under each stat — a fixed
// visual scale (like the confidence bar's 0-100), NOT fabricated player
// data: the displayed number is always the player's real value; the bar
// just fills proportionally toward a "strong" level for that stat.
const RECENT_PPR_BAR_MAX = 25;
const VOLUME_BAR_MAX: Record<string, number> = { QB: 12, RB: 25, WR: 12, TE: 12 };
const DROP_RATE_BAR_MAX = 0.15;
const RZ_TOUCH_BAR_MAX: Record<string, number> = { RB: 6, QB: 3 };
// QB passing-grid bar references. Pass attempts ~40 = a high-volume game;
// success rate ~0.55 = elite. EPA/dropback is signed, so its bar maps a
// typical range (poor ≈ -0.2 → elite ≈ +0.3) onto 0-1 with 0 (league
// average) landing at ~40% fill — the displayed number is always the real,
// signed value.
const PASS_ATT_BAR_MAX = 40;
const QB_SUCCESS_RATE_BAR_MAX = 0.55;
const QB_EPA_BAR_MIN = -0.2;
const QB_EPA_BAR_RANGE = 0.5;

interface StatSlot {
  label: string;
  /** Real, formatted value — or null, which renders as "—" (never a fabricated placeholder). */
  value: string | null;
  /** 0-1 magnitude bar fill, or null to omit the bar (when there's no real value). */
  fill: number | null;
}

/** Slot 4: the position's real secondary signal — red-zone touches (RB), red-zone rushes (QB), drop rate (WR/TE). Never forces a stat a position doesn't have. */
function buildRzDropSlot(player: PlayerScoreBreakdown): StatSlot {
  const pos = player.position;
  if (pos === "RB" && player.redZoneTouchesAvg != null) {
    return {
      label: "Red-zone touches/gm",
      value: player.redZoneTouchesAvg.toFixed(1),
      fill: clamp01(player.redZoneTouchesAvg / RZ_TOUCH_BAR_MAX.RB),
    };
  }
  if (pos === "QB" && player.redZoneTouchesAvg != null) {
    return {
      label: "Red-zone rushes/gm",
      value: player.redZoneTouchesAvg.toFixed(1),
      fill: clamp01(player.redZoneTouchesAvg / RZ_TOUCH_BAR_MAX.QB),
    };
  }
  if ((pos === "WR" || pos === "TE") && player.dropRateAvg != null) {
    return {
      label: "Drop rate",
      value: `${(player.dropRateAvg * 100).toFixed(0)}%`,
      fill: clamp01(player.dropRateAvg / DROP_RATE_BAR_MAX),
    };
  }
  const label = pos === "WR" || pos === "TE" ? "Drop rate" : "Red-zone touches/gm";
  return { label, value: null, fill: null };
}

/** A recent-avg (PPR) slot — slot 1 for every position. */
function recentAvgSlot(player: PlayerScoreBreakdown, formatLabel: string): StatSlot {
  return player.recentPprAvg != null
    ? {
        label: `Recent avg (${formatLabel})`,
        value: player.recentPprAvg.toFixed(1),
        fill: clamp01(player.recentPprAvg / RECENT_PPR_BAR_MAX),
      }
    : { label: `Recent avg (${formatLabel})`, value: null, fill: null };
}

/**
 * QB-specific stat grid — a passing profile, all real breakdown fields:
 * recent scoring, pass volume, and two efficiency signals (success rate,
 * EPA per dropback). Deliberately replaces the generic rush-attempts /
 * snap-share / red-zone-rushes slots, which are far less telling for a QB
 * (snap share is ~always near 100%, rushing is a small slice for most
 * passers). "—" for any a given QB's data genuinely lacks.
 */
function buildQbStatSlots(player: PlayerScoreBreakdown, formatLabel: string): StatSlot[] {
  const passAtt: StatSlot =
    player.recentVolumeAvg != null
      ? {
          label: "Pass attempts/gm",
          value: player.recentVolumeAvg.toFixed(1),
          fill: clamp01(player.recentVolumeAvg / PASS_ATT_BAR_MAX),
        }
      : { label: "Pass attempts/gm", value: null, fill: null };

  const successRate: StatSlot =
    player.successRateAvg != null
      ? {
          label: "Success rate",
          value: `${(player.successRateAvg * 100).toFixed(0)}%`,
          fill: clamp01(player.successRateAvg / QB_SUCCESS_RATE_BAR_MAX),
        }
      : { label: "Success rate", value: null, fill: null };

  const epa: StatSlot =
    player.epaPerPlayAvg != null
      ? {
          label: "EPA/dropback",
          value: (player.epaPerPlayAvg >= 0 ? "+" : "") + player.epaPerPlayAvg.toFixed(2),
          fill: clamp01((player.epaPerPlayAvg - QB_EPA_BAR_MIN) / QB_EPA_BAR_RANGE),
        }
      : { label: "EPA/dropback", value: null, fill: null };

  return [recentAvgSlot(player, formatLabel), passAtt, successRate, epa];
}

/**
 * The fixed 2x2 stat grid, real fields only. Any slot without real data
 * for the given position renders "—" rather than a fabricated number
 * (e.g. QB has no drop rate; D/ST and K have no volume/snap/red-zone
 * signals at all). Numbers are all real breakdown fields already computed
 * by the engine — this just selects the four per-position slots and adds a
 * magnitude bar. QB gets its own passing-focused grid (buildQbStatSlots).
 */
function buildStatSlots(player: PlayerScoreBreakdown, formatLabel: string): StatSlot[] {
  const pos = player.position;

  if (pos === "QB") return buildQbStatSlots(player, formatLabel);

  // Slot 1 — recent avg (PPR).
  const recentAvg = recentAvgSlot(player, formatLabel);

  // Slot 2 — position-specific opportunity/volume (RB touches, WR/TE targets).
  const opportunity: StatSlot =
    pos && VOLUME_UNIT_LABEL[pos] && player.recentVolumeAvg != null
      ? {
          label: VOLUME_UNIT_LABEL[pos],
          value: player.recentVolumeAvg.toFixed(1),
          fill: clamp01(player.recentVolumeAvg / (VOLUME_BAR_MAX[pos] ?? 20)),
        }
      : { label: (pos && VOLUME_UNIT_LABEL[pos]) || "Opportunity", value: null, fill: null };

  // Slot 3 — snap share (real wherever nflverse snap data exists).
  const snapShare: StatSlot =
    player.snapShareAvg != null
      ? { label: "Snap share", value: `${(player.snapShareAvg * 100).toFixed(0)}%`, fill: clamp01(player.snapShareAvg) }
      : { label: "Snap share", value: null, fill: null };

  // Slot 4 — red-zone or drop rate, whichever is the position's real signal.
  return [recentAvg, opportunity, snapShare, buildRzDropSlot(player)];
}

function StatTile({ slot }: { slot: StatSlot }) {
  return (
    <div className="rounded-2xl bg-foreground/[0.03] px-3 py-2.5">
      <p className="text-[10.5px] text-foreground/45">{slot.label}</p>
      <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums">{slot.value ?? "—"}</p>
      {slot.fill != null && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-accent/60" style={{ width: `${slot.fill * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function StartBenchPill({ isRecommended }: { isRecommended: boolean }) {
  if (isRecommended) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-good/12 px-2.5 py-1 text-[11px] font-semibold text-good">
        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Start
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-foreground/8 px-2.5 py-1 text-[11px] font-semibold text-foreground/55">
      Bench lean
    </span>
  );
}

/**
 * Item 2 — the opponent + defensive-rank line. Colored by MATCHUP
 * FAVORABILITY (diffFromAverage, via matchupLabel): favorable = green,
 * tough = red. NOTE the rank number direction is the opposite of what it
 * might read like: our rank sorts descending by points allowed, so #1 =
 * the defense that allows the MOST (weakest, most favorable) and #32 =
 * the stingiest. The "favorable/tough/average" word is kept alongside the
 * number so the color and the rank stay unambiguous together.
 */
function OpponentLine({ player }: { player: PlayerScoreBreakdown }) {
  const m = player.matchupContext;
  if (!m) return null;
  const { tone, text } = matchupLabel(m.diffFromAverage);
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.03] px-3 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-foreground/60">
        <ShieldIcon />
        <span className="truncate">
          {player.team ?? "—"} vs {m.opponentTeam}
          {player.nextOpponent ? ` · Wk ${player.nextOpponent.week}` : ""}
        </span>
      </span>
      <span
        className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${MATCHUP_TONE_CLASSES[tone]}`}
      >
        <span className="font-mono">
          #{m.rank} of {m.teamCount}
        </span>{" "}
        · {text}
      </span>
    </div>
  );
}

function ContextItem({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10.5px] text-foreground/45">
        {icon}
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-[12px] font-semibold ${valueClass ?? "text-foreground/80"}`}>{value}</div>
    </div>
  );
}

function PlayerCard({
  player,
  rank,
  isRecommended,
  formatLabel,
  props,
}: {
  player: PlayerScoreBreakdown;
  rank: number;
  isRecommended: boolean;
  formatLabel: string;
  props?: PlayerProps;
}) {
  const statSlots = buildStatSlots(player, formatLabel);
  const next = player.nextOpponent;

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition-all ${
        isRecommended ? "border-good/40 bg-good/[0.04]" : "border-foreground/10 bg-surface"
      }`}
    >
      {/* 1 — header: rank circle, name, Start/Bench pill */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/12 font-mono text-sm font-bold tabular-nums text-accent">
          {rank}
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
        <StartBenchPill isRecommended={isRecommended} />
      </div>

      {/* 2 — opponent + defensive-rank line */}
      <OpponentLine player={player} />

      {/* 3 — big projection + real floor→ceiling range with projection marker */}
      <div className="mt-4 border-t border-foreground/[0.07] pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Our projection</span>
        <p className="mt-0.5 font-mono text-[32px] font-bold leading-none tabular-nums">
          {player.finalScore != null ? player.finalScore.toFixed(1) : "—"}
        </p>
        <FloorCeilingBar player={player} />
      </div>

      {/* 4 — metrics grid + context column (opponent / weather / health) beside it */}
      <div className="mt-4 grid gap-3 border-t border-foreground/[0.07] pt-4 sm:grid-cols-[1fr_170px]">
        <div className="grid grid-cols-2 gap-2">
          {statSlots.map((slot, i) => (
            <StatTile key={`${slot.label}-${i}`} slot={slot} />
          ))}
        </div>
        <div className="flex flex-col gap-2.5 sm:border-l sm:border-foreground/[0.07] sm:pl-3">
          <ContextItem
            icon={<CloudIcon />}
            label="Weather"
            value={next ? formatWeather(player.nextGameWeather) : "—"}
          />
          <ContextItem
            icon={<HealthIcon />}
            label="Health status"
            value={healthStatusValue(player)}
            valueClass={healthToneClass(player)}
          />
        </div>
      </div>

      {/* 5 — Case For / Case Against (replaces the old "Why this pick" toggle) */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-foreground/[0.07] pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-good">Case For</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/70">{buildCaseFor(player)}</p>
        </div>
        <div className="border-l border-foreground/[0.07] pl-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-bad">Case Against</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground/70">{buildCaseAgainst(player)}</p>
        </div>
      </div>

      {/* 6 — betting lines (display-only market context, not our projection).
          Always shown for skill positions so the placement is visible even
          before books post props — same "the section exists, data pending"
          treatment the card gives weather in the offseason. */}
      {isSkillCardPosition(player.position) && (
        <div className="mt-4 border-t border-foreground/[0.07] pt-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">
            <BettingIcon />
            Betting lines
            {props && props.lines.length > 0 && (
              <span className="ml-auto font-normal normal-case tracking-normal text-foreground/35">{props.bookmaker}</span>
            )}
          </div>
          {props && props.lines.length > 0 ? (
            <>
              <div className="mt-2 flex flex-wrap gap-2">
                {props.lines.map((line, i) => (
                  <div key={`${line.label}-${i}`} className="rounded-lg bg-surface-sunken px-2.5 py-1.5">
                    <div className="text-[10px] text-foreground/45">{line.label}</div>
                    <div className="font-mono text-[13px] font-semibold tabular-nums">{line.value}</div>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-foreground/35">Market lines — shown for context, not part of our projection.</p>
            </>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-foreground/45">
              Sportsbook lines post closer to kickoff — they&rsquo;ll show here (pass/rush/receiving yards, receptions, anytime TD) once this week&rsquo;s game is on the board.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ComparisonResult({ result, contextNote, scoringFormat, propsByPlayerId }: ComparisonResultProps) {
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

      <div className="flex flex-col gap-4">
        {rankedPlayers.map((player, i) => (
          <PlayerCard
            key={player.playerId ?? `unresolved-${i}`}
            player={player}
            rank={i + 1}
            isRecommended={player.playerId === result.recommendedPlayerId}
            formatLabel={formatLabel}
            props={player.playerId != null ? propsByPlayerId?.[player.playerId] : undefined}
          />
        ))}
      </div>
    </div>
  );
}
