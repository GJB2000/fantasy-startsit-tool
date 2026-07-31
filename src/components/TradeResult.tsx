import type { TradeEvaluation, TradePlayerResult, TradeVerdict } from "@/lib/trade/evaluateTrade";
import type { ScoringFormat } from "@/lib/sportsdata/types";

interface TradeResultProps {
  evaluation: TradeEvaluation;
  contextNote: string;
  scoringFormat: ScoringFormat;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

// Each verdict maps to a CSS color token (used inline as var(--TONE) — not a
// Tailwind class — so the dynamic color works without Tailwind's static
// scanner needing every literal) plus its own copy.
const VERDICT_TONE: Record<TradeVerdict, string> = {
  good: "good",
  fair: "caution",
  bad: "bad",
  unknown: "info",
};

const VERDICT_TAG: Record<TradeVerdict, string> = {
  good: "Accept this trade",
  fair: "Roughly even",
  bad: "Consider passing",
  unknown: "Not enough data",
};

const VERDICT_PHRASE: Record<TradeVerdict, string> = {
  good: "You come out ahead.",
  fair: "Roughly a wash.",
  bad: "You give up value.",
  unknown: "We can't call this one.",
};

/** Per-game rate reference for the small magnitude bars — a fixed visual scale (an elite skill player rest-of-season rate), not fabricated data; the displayed number is always real. */
const PER_GAME_BAR_MAX = 20;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Highest rest-of-season projection on a side — the "marquee" player. */
function bestPlayer(players: TradePlayerResult[]): TradePlayerResult | null {
  let best: TradePlayerResult | null = null;
  for (const p of players) {
    if (p.restOfSeasonTotal != null && (best == null || p.restOfSeasonTotal > (best.restOfSeasonTotal ?? -Infinity))) {
      best = p;
    }
  }
  return best;
}

function names(players: TradePlayerResult[]): string {
  const list = players.map((p) => p.displayName);
  if (list.length <= 1) return list[0] ?? "these players";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * 1-2 sentences making the case FOR accepting — derived from the real
 * evaluation (net value, the marquee player you'd get, roster
 * consolidation), never the raw per-player reasoning strings.
 */
function buildReasonsToAccept(e: TradeEvaluation): string {
  const bestGet = bestPlayer(e.get);
  const parts: string[] = [];

  if (e.netValue != null && e.netValue > 0) {
    parts.push(
      `You come out ahead by about ${Math.round(e.netValue)} points of rest-of-season value — the return is worth more than what you send away.`
    );
    if (bestGet?.restOfSeasonPerGame != null) {
      parts.push(`${bestGet.displayName} headlines the haul at roughly ${bestGet.restOfSeasonPerGame.toFixed(1)} points a game.`);
    }
  } else if (bestGet?.restOfSeasonTotal != null) {
    parts.push(
      `You'd add ${bestGet.displayName} — about ${Math.round(bestGet.restOfSeasonTotal)} projected points (${(bestGet.restOfSeasonPerGame ?? 0).toFixed(1)}/game) the rest of the way, a real ceiling boost.`
    );
    if (e.get.length < e.give.length) {
      parts.push(`Consolidating ${e.give.length} players into ${e.get.length} upgrades the top of your lineup.`);
    }
  } else {
    parts.push(`You'd bring in ${names(e.get)}.`);
  }

  return parts.slice(0, 2).join(" ");
}

/**
 * 1-2 sentences making the case AGAINST — the value or depth you'd give up.
 */
function buildReasonsToReject(e: TradeEvaluation): string {
  const bestGive = bestPlayer(e.give);
  const parts: string[] = [];

  if (e.netValue != null && e.netValue < 0) {
    parts.push(
      `You'd come out behind by about ${Math.round(Math.abs(e.netValue))} points of rest-of-season value — you're paying more than you get back.`
    );
  } else if (bestGive?.restOfSeasonTotal != null) {
    parts.push(`You'd give up ${bestGive.displayName}, about ${Math.round(bestGive.restOfSeasonTotal)} projected points of production to replace.`);
  } else {
    parts.push(`You'd part with ${names(e.give)}.`);
  }

  if (e.get.length < e.give.length) {
    parts.push(`And you're trading ${e.give.length} players for ${e.get.length}, so you'll thin your depth and have a lineup spot to fill.`);
  } else if (e.verdict === "fair") {
    parts.push(`The two sides project close enough that it may not be worth shaking up your roster.`);
  }

  return parts.slice(0, 2).join(" ");
}

function VerdictIcon({ verdict }: { verdict: TradeVerdict }) {
  if (verdict === "good") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M5 13l4 4L19 7" stroke="var(--good)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (verdict === "bad") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="var(--bad)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (verdict === "fair") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M8 7l8 10M16 7l-8 10" stroke="var(--caution)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9.2" stroke="var(--caution)" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--info)" strokeWidth="2" />
      <path d="M15.5 15.5L20 20" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BalanceRow({ label, total, proportion, accent }: { label: string; total: number; proportion: number; accent: boolean }) {
  return (
    <div className="grid grid-cols-[76px_1fr_auto] items-center gap-3">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-foreground/40">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-surface-sunken shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${clamp01(proportion) * 100}%`,
            background: accent
              ? "linear-gradient(90deg, var(--accent-secondary), var(--accent))"
              : "color-mix(in srgb, var(--foreground) 24%, transparent)",
            boxShadow: accent ? "0 0 16px -2px color-mix(in srgb, var(--accent) 45%, transparent)" : undefined,
          }}
        />
      </span>
      <span className="min-w-[56px] text-right font-mono text-sm font-bold tabular-nums">{total.toFixed(1)}</span>
    </div>
  );
}

function PlayerValueCard({
  player,
  formatLabel,
  isHero,
  isGive,
}: {
  player: TradePlayerResult;
  formatLabel: string;
  isHero: boolean;
  isGive: boolean;
}) {
  const perGame = player.restOfSeasonPerGame ?? 0;
  return (
    <div
      className={`rounded-2xl border bg-surface p-3.5 shadow-sm transition-transform hover:-translate-y-0.5 ${
        isHero ? "border-accent/35" : "border-foreground/10"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${
            isGive ? "bg-foreground/[0.06] text-foreground/55" : "bg-accent/12 text-accent"
          }`}
        >
          {initials(player.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight">{player.displayName}</div>
          {player.position && (
            <div className="text-[11.5px] text-foreground/45">
              <span className="font-semibold text-foreground/60">{player.position}</span>
              {player.team ? ` · ${player.team}` : ""}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3 border-t border-foreground/[0.07] pt-2.5">
        <div className="font-mono text-[26px] font-bold leading-none tabular-nums">
          {player.restOfSeasonTotal != null ? player.restOfSeasonTotal.toFixed(1) : "—"}
          <span className="ml-1 text-[11px] font-semibold text-foreground/40">pts</span>
        </div>
        {player.restOfSeasonTotal != null ? (
          <div className="min-w-[94px] text-right">
            <div className="font-mono text-[12.5px] font-bold tabular-nums">
              {perGame.toFixed(1)}
              <span className="font-medium text-foreground/40">/gm</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${clamp01(perGame / PER_GAME_BAR_MAX) * 100}%`,
                  background: isGive
                    ? "color-mix(in srgb, var(--foreground) 22%, transparent)"
                    : "linear-gradient(90deg, var(--accent-secondary), var(--accent))",
                }}
              />
            </div>
            <div className="mt-1 text-[10.5px] text-foreground/40">
              {player.gamesRemaining} game{player.gamesRemaining === 1 ? "" : "s"} left · {formatLabel}
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-foreground/40">No projection</div>
        )}
      </div>
    </div>
  );
}

function SideColumn({
  label,
  players,
  total,
  formatLabel,
  isGive,
  isBetter,
  heroId,
}: {
  label: string;
  players: TradePlayerResult[];
  total: number | null;
  formatLabel: string;
  isGive: boolean;
  isBetter: boolean;
  heroId: number | null;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <span className="flex items-center gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-wider text-foreground/40">{label}</span>
          {isBetter && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider"
              style={{
                color: "var(--premium)",
                background: "color-mix(in srgb, var(--premium) 14%, transparent)",
                border: "1px solid color-mix(in srgb, var(--premium) 38%, transparent)",
              }}
            >
              Higher value
            </span>
          )}
        </span>
        <span
          className="font-mono text-[15px] font-bold tabular-nums"
          style={!isGive ? { color: "var(--accent)" } : undefined}
        >
          {total != null ? total.toFixed(1) : "—"}
        </span>
      </div>
      {players.map((player, i) => (
        <PlayerValueCard
          key={player.playerId ?? `unresolved-${i}`}
          player={player}
          formatLabel={formatLabel}
          isHero={player.playerId != null && player.playerId === heroId}
          isGive={isGive}
        />
      ))}
    </div>
  );
}

function StripCell({ label, value, tone, signed }: { label: string; value: number | null; tone?: string; signed?: boolean }) {
  const text =
    value == null
      ? "—"
      : signed
        ? `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`
        : Number.isInteger(value)
          ? String(value)
          : value.toFixed(1);
  return (
    <div className="flex flex-col gap-1.5 border-foreground/10 px-4 py-4 [&:not(:first-child)]:border-l">
      <span className="text-[10.5px] font-semibold uppercase tracking-wider text-foreground/40">{label}</span>
      <span className="font-mono text-[22px] font-bold leading-none tabular-nums" style={tone ? { color: `var(--${tone})` } : undefined}>
        {text}
      </span>
    </div>
  );
}

export function TradeResult({ evaluation, contextNote, scoringFormat }: TradeResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const { verdict, netValue, giveTotal, getTotal } = evaluation;
  const tone = VERDICT_TONE[verdict];

  const allPlayers = [...evaluation.give, ...evaluation.get];
  const gamesRemainingValues = allPlayers.map((p) => p.gamesRemaining).filter((g) => g > 0);
  const weeksLeft = gamesRemainingValues.length > 0 ? Math.max(...gamesRemainingValues) : null;

  // The single most valuable player in the deal gets an accent ring.
  let heroId: number | null = null;
  let heroMax = -Infinity;
  for (const p of allPlayers) {
    if (p.restOfSeasonTotal != null && p.playerId != null && p.restOfSeasonTotal > heroMax) {
      heroMax = p.restOfSeasonTotal;
      heroId = p.playerId;
    }
  }

  const betterSide: "give" | "get" | null = verdict === "good" ? "get" : verdict === "bad" ? "give" : null;
  const balanceMax = giveTotal != null && getTotal != null ? Math.max(giveTotal, getTotal, 1) : null;

  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* Verdict hero */}
      <div
        className="relative overflow-hidden rounded-3xl bg-surface p-6 shadow-sm"
        style={{ border: `1px solid color-mix(in srgb, var(--${tone}) 28%, transparent)` }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--${tone}) 10%, transparent), transparent 55%)` }}
        />
        <div className="relative grid gap-5 sm:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: `color-mix(in srgb, var(--${tone}) 16%, transparent)` }}
              >
                <VerdictIcon verdict={verdict} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: `var(--${tone})` }}>
                {VERDICT_TAG[verdict]}
              </span>
            </div>
            <h2
              className="mt-3.5 font-display font-bold leading-[0.95] tracking-tight text-balance"
              style={{ fontSize: "clamp(32px, 5.6vw, 52px)" }}
            >
              {VERDICT_PHRASE[verdict]}
            </h2>
            <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-foreground/60">{evaluation.headline}</p>
            <p className="mt-1.5 text-xs text-foreground/40">{contextNote}</p>
          </div>

          <div className="self-center border-t border-foreground/[0.07] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Net value to you</div>
            <div
              className="mt-1 font-mono font-extrabold leading-none tabular-nums"
              style={{ fontSize: "clamp(40px, 8vw, 62px)", color: `var(--${tone})` }}
            >
              {netValue != null ? `${netValue >= 0 ? "+" : "−"}${Math.abs(netValue).toFixed(1)}` : "—"}
            </div>
            <div className="mt-2 text-xs text-foreground/45">
              projected points, <span className="font-medium text-foreground/70">rest of season</span>
              {weeksLeft != null ? ` · ${weeksLeft} weeks left` : ""}
            </div>
          </div>

          {balanceMax != null && giveTotal != null && getTotal != null && (
            <div className="grid gap-2.5 border-t border-foreground/[0.07] pt-4 sm:col-span-2">
              <BalanceRow label="You give" total={giveTotal} proportion={giveTotal / balanceMax} accent={false} />
              <BalanceRow label="You get" total={getTotal} proportion={getTotal / balanceMax} accent />
            </div>
          )}
        </div>
      </div>

      {/* Trade board */}
      <div className="grid items-start gap-3 sm:grid-cols-[1fr_44px_1fr]">
        <SideColumn
          label="You give"
          players={evaluation.give}
          total={giveTotal}
          formatLabel={formatLabel}
          isGive
          isBetter={betterSide === "give"}
          heroId={heroId}
        />
        <div className="hidden self-center pt-14 sm:flex sm:justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-foreground/15 bg-surface text-foreground/50 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <SideColumn
          label="You get"
          players={evaluation.get}
          total={getTotal}
          formatLabel={formatLabel}
          isGive={false}
          isBetter={betterSide === "get"}
          heroId={heroId}
        />
      </div>

      {/* Reasons to accept / reject — both sides of the case, 1-2 sentences each */}
      <div className="rounded-3xl border border-foreground/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-good">Reasons to accept</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">{buildReasonsToAccept(evaluation)}</p>
          </div>
          <div className="border-t border-foreground/[0.07] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-bad">Reasons to reject</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/70">{buildReasonsToReject(evaluation)}</p>
          </div>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-foreground/10 bg-surface shadow-sm sm:grid-cols-4">
        <StripCell label="You give" value={giveTotal} />
        <StripCell label="You get" value={getTotal} />
        <StripCell label="Net value" value={netValue} tone={tone} signed />
        <StripCell label="Weeks left" value={weeksLeft} />
      </div>
    </div>
  );
}
