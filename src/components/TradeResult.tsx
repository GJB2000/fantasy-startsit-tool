import type { CSSProperties } from "react";
import type { TradeEvaluation, TradePlayerResult, TradeVerdict } from "@/lib/trade/evaluateTrade";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import { CountUpNumber } from "./CountUpNumber";
import styles from "./TradeResult.module.css";

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

// One tone per verdict, set inline as --tone — a theme-adaptive semantic token
// so it stays readable on both the dark and light verdict card.
const TONE: Record<TradeVerdict, string> = {
  good: "var(--accent)",
  fair: "var(--caution)",
  bad: "var(--bad)",
  unknown: "var(--info)",
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
  const stroke = "var(--tone)";
  if (verdict === "good") {
    return (
      <svg viewBox="0 0 24 24" className={styles.vicon} width="18" height="18" fill="none">
        <path d="M5 13l4 4L19 7" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (verdict === "bad") {
    return (
      <svg viewBox="0 0 24 24" className={styles.vicon} width="18" height="18" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (verdict === "fair") {
    return (
      <svg viewBox="0 0 24 24" className={styles.vicon} width="18" height="18" fill="none">
        <path d="M8 7l8 10M16 7l-8 10" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9.2" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={styles.vicon} width="18" height="18" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke={stroke} strokeWidth="2" />
      <path d="M15.5 15.5L20 20" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BalanceRow({ label, total, proportion, isGet }: { label: string; total: number; proportion: number; isGet: boolean }) {
  return (
    <div className={styles.balRow}>
      <span className={styles.balLab}>{label}</span>
      <span className={styles.balTrack}>
        <span
          className={`${styles.balFill} ${isGet ? styles.balFillGet : styles.balFillGive}`}
          style={{ width: `${clamp01(proportion) * 100}%` }}
        />
      </span>
      <span className={`${styles.balTot} ${styles.n}`}>{total.toFixed(1)}</span>
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
    <div className={`${styles.pcard} ${isHero ? styles.pcardHero : ""}`}>
      <div className={styles.pchead}>
        <span className={`${styles.pav} ${isGive ? "" : styles.pavGet}`}>{initials(player.displayName)}</span>
        <div>
          <div className={styles.pname}>{player.displayName}</div>
          {player.position && (
            <div className={styles.pmeta}>
              {player.position}
              {player.team ? ` · ${player.team}` : ""}
            </div>
          )}
        </div>
      </div>

      <div className={styles.pbody}>
        <div className={`${styles.ptot} ${styles.n}`}>
          {player.restOfSeasonTotal != null ? player.restOfSeasonTotal.toFixed(1) : "—"}
          <small>pts</small>
        </div>
        {player.restOfSeasonTotal != null ? (
          <div className={styles.pright}>
            <div className={`${styles.pgm} ${styles.n}`}>
              {perGame.toFixed(1)}
              <small>/gm</small>
            </div>
            <div className={styles.ptrack}>
              <span
                className={`${styles.pfill} ${isGive ? styles.pfillGive : styles.pfillGet}`}
                style={{ width: `${clamp01(perGame / PER_GAME_BAR_MAX) * 100}%` }}
              />
            </div>
            <div className={styles.pgames}>
              {player.gamesRemaining} game{player.gamesRemaining === 1 ? "" : "s"} left · {formatLabel}
            </div>
          </div>
        ) : (
          <div className={styles.pnone}>No projection</div>
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
    <div className={styles.side}>
      <div className={styles.sideHead}>
        <span className={styles.sideL}>
          <span className={styles.sideLab}>{label}</span>
          {isBetter && <span className={styles.sideTag}>Higher value</span>}
        </span>
        <span className={`${styles.sideTot} ${isGive ? "" : styles.sideTotGet} ${styles.n}`}>
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

function StripCell({ label, value, isNet, signed }: { label: string; value: number | null; isNet?: boolean; signed?: boolean }) {
  const text =
    value == null
      ? "—"
      : signed
        ? `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`
        : Number.isInteger(value)
          ? String(value)
          : value.toFixed(1);
  return (
    <div className={styles.sc}>
      <div className={styles.scL}>{label}</div>
      <div className={`${styles.scV} ${isNet ? styles.scNet : ""} ${styles.n}`}>{text}</div>
    </div>
  );
}

export function TradeResult({ evaluation, contextNote, scoringFormat }: TradeResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const { verdict, netValue, giveTotal, getTotal } = evaluation;

  const allPlayers = [...evaluation.give, ...evaluation.get];
  const gamesRemainingValues = allPlayers.map((p) => p.gamesRemaining).filter((g) => g > 0);
  const weeksLeft = gamesRemainingValues.length > 0 ? Math.max(...gamesRemainingValues) : null;

  // The single most valuable player in the deal gets an ink ring.
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

  const toneStyle = { "--tone": TONE[verdict] } as CSSProperties;

  return (
    <div className={`${styles.sheet} mt-6`} style={toneStyle}>
      <div className={styles.body}>
        {/* verdict hero */}
        <div className={styles.verdict}>
          <div className={styles.vhead}>
            <VerdictIcon verdict={verdict} />
            <span className={styles.kick}>{VERDICT_TAG[verdict]}</span>
          </div>
          <div className={styles.vgrid}>
            <div>
              <h2 className={styles.vphrase}>{VERDICT_PHRASE[verdict]}</h2>
              <p className={styles.vsub}>{evaluation.headline}</p>
              <p className={styles.vnote}>{contextNote}</p>
            </div>
            <div className={styles.netBlock}>
              <div className={styles.netLab}>Net value to you</div>
              <div className={`${styles.netNum} ${styles.n}`}>
                {netValue != null ? (
                  <>
                    {netValue >= 0 ? "+" : "−"}
                    <CountUpNumber value={Math.abs(netValue)} decimals={1} />
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className={styles.netSub}>
                projected points, rest of season{weeksLeft != null ? ` · ${weeksLeft} wks` : ""}
              </div>
            </div>
          </div>

          {balanceMax != null && giveTotal != null && getTotal != null && (
            <>
              <div className={styles.vrule} />
              <div className={styles.bal}>
                <BalanceRow label="You give" total={giveTotal} proportion={giveTotal / balanceMax} isGet={false} />
                <BalanceRow label="You get" total={getTotal} proportion={getTotal / balanceMax} isGet />
              </div>
            </>
          )}

          {evaluation.rosterNote && (
            <>
              <div className={styles.vrule} />
              <p className={styles.vnote}>{evaluation.rosterNote}</p>
            </>
          )}
        </div>

        {/* trade board */}
        <div className={styles.board}>
          <SideColumn
            label="You give"
            players={evaluation.give}
            total={giveTotal}
            formatLabel={formatLabel}
            isGive
            isBetter={betterSide === "give"}
            heroId={heroId}
          />
          <div className={styles.xnode}>
            <span className={styles.xdisc}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
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

        {/* breakdown: reasons + summary */}
        <div className={styles.breakdown}>
          <div className={styles.case}>
            <div className={styles.caseCol}>
              <div className={`${styles.caseH} ${styles.caseFor}`}>Reasons to accept</div>
              <p>{buildReasonsToAccept(evaluation)}</p>
            </div>
            <div className={styles.caseCol}>
              <div className={`${styles.caseH} ${styles.caseAgainst}`}>Reasons to reject</div>
              <p>{buildReasonsToReject(evaluation)}</p>
            </div>
          </div>

          <div className={styles.strip}>
            <StripCell label="You give" value={giveTotal} />
            <StripCell label="You get" value={getTotal} />
            <StripCell label="Net value" value={netValue} isNet signed />
            <StripCell label="Weeks left" value={weeksLeft} />
          </div>
        </div>
      </div>
    </div>
  );
}
