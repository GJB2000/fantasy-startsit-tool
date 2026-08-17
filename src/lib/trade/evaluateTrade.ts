import { CLOSE_CALL_ABS_POINTS, CLOSE_CALL_RELATIVE_PCT } from "@/lib/recommendation/config";
import type { RestOfSeasonProjection } from "@/lib/recommendation/restOfSeason";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";

export type TradeVerdict = "good" | "fair" | "bad" | "unknown";

export interface TradePlayerResult extends PlayerScoreBreakdown {
  gamesRemaining: number;
  restOfSeasonTotal: number | null;
  restOfSeasonPerGame: number | null;
}

export interface TradeEvaluation {
  give: TradePlayerResult[];
  get: TradePlayerResult[];
  /** Raw sum of each side's rest-of-season point projections — what the verdict and netValue are based on, and what the UI shows, so the side totals always equal the sum of the player cards. */
  giveTotal: number | null;
  getTotal: number | null;
  netValue: number | null;
  verdict: TradeVerdict;
  headline: string;
  reasoning: string[];
  /**
   * Set on UNEVEN trades (unequal player counts) — a plain-English caveat
   * that grading on total points favors the side with more bodies, and that
   * lineup scarcity means a deeper package out-totaling a single star isn't
   * automatically the better side. This is the transparent, backtest-aligned
   * stance: the totals stay honest (no synthetic roster-spot credit or
   * stud-premium discount) and the nuance is surfaced as a note for the user
   * to weigh. null on even trades.
   */
  rosterNote: string | null;
}

export function toTradePlayerResult(
  breakdown: PlayerScoreBreakdown,
  projection: RestOfSeasonProjection
): TradePlayerResult {
  return {
    ...breakdown,
    gamesRemaining: projection.gamesRemaining,
    restOfSeasonTotal: projection.total,
    restOfSeasonPerGame: projection.perGameRate,
  };
}

function sideTotal(players: TradePlayerResult[]): {
  total: number | null;
  counted: TradePlayerResult[];
  excludedNotes: string[];
} {
  const excludedNotes: string[] = [];
  const counted: TradePlayerResult[] = [];
  let total = 0;

  for (const p of players) {
    if (p.playerId === null) {
      excludedNotes.push(`${p.displayName} couldn't be matched to current data and was left out of the totals.`);
      continue;
    }
    if (p.restOfSeasonTotal === null) {
      excludedNotes.push(
        `Not enough data or remaining-schedule info on ${p.displayName} to project their rest of season — left out of the totals.`
      );
      continue;
    }
    total += p.restOfSeasonTotal;
    counted.push(p);
  }

  return { total: counted.length > 0 ? total : null, counted, excludedNotes };
}

function playerLines(p: TradePlayerResult): string[] {
  const lines: string[] = [];
  if (p.playerId === null || p.restOfSeasonTotal === null) return lines;

  if (p.recentPprAvg != null) {
    const seasonPart = p.seasonPprAvg != null ? ` (season average ${p.seasonPprAvg.toFixed(1)})` : "";
    lines.push(
      `${p.displayName}: averaging ${p.recentPprAvg.toFixed(1)} points over their last ${p.gamesUsedForRecent} game${p.gamesUsedForRecent === 1 ? "" : "s"}${seasonPart}.`
    );
  }
  for (const note of p.notes) {
    lines.push(`${p.displayName}: ${note}`);
  }
  lines.push(
    `${p.displayName}: projected for roughly ${p.restOfSeasonTotal.toFixed(1)} points over their remaining ${p.gamesRemaining} game${p.gamesRemaining === 1 ? "" : "s"} this season (~${(p.restOfSeasonPerGame ?? 0).toFixed(1)}/game, schedule-adjusted).`
  );
  return lines;
}

/** The single most valuable (highest-projected) player across the whole trade — named in the uneven-trade caveat so the user can weigh top-end talent against raw totals. */
function bestPlayer(counted: TradePlayerResult[]): TradePlayerResult | null {
  let best: TradePlayerResult | null = null;
  for (const p of counted) {
    if (p.restOfSeasonTotal != null && (best == null || p.restOfSeasonTotal > (best.restOfSeasonTotal ?? -Infinity))) {
      best = p;
    }
  }
  return best;
}

/**
 * Grades a trade on raw rest-of-season point totals (the projection engine's
 * own validated output — see recommendation/restOfSeason.ts). Deliberately
 * transparent and backtest-aligned: no stud-premium discount and no
 * roster-spot filler, so the side totals equal the sum of the player cards
 * and the verdict rests only on what the backtest can actually validate (the
 * point projections). For UNEVEN trades, total points structurally favor the
 * side with more players; rather than fudge the number, that nuance is
 * surfaced as a caveat note (see rosterNote). The close-call threshold is
 * reused unchanged from the single-game comparison engine — there's no
 * backtest ground truth for "was this trade good" to re-tune it against.
 */
export function evaluateTrade(give: TradePlayerResult[], get: TradePlayerResult[]): TradeEvaluation {
  const giveSide = sideTotal(give);
  const getSide = sideTotal(get);
  const reasoning = [...giveSide.excludedNotes, ...getSide.excludedNotes];
  reasoning.push(...give.flatMap(playerLines), ...get.flatMap(playerLines));

  if (giveSide.total === null || getSide.total === null) {
    return {
      give,
      get,
      giveTotal: giveSide.total,
      getTotal: getSide.total,
      netValue: null,
      verdict: "unknown",
      headline: "Not enough data to grade this trade.",
      reasoning: [...reasoning, "At least one side has no players with enough data to project."],
      rosterNote: null,
    };
  }

  const giveTotal = giveSide.total;
  const getTotal = getSide.total;
  const netValue = getTotal - giveTotal;

  // Uneven trade: total points favor the side with more players (they simply
  // accumulate more). Surface that as a caveat rather than adjusting the
  // number, and point at the single best player so the user can weigh
  // top-end talent against the raw totals.
  let rosterNote: string | null = null;
  if (giveSide.counted.length !== getSide.counted.length) {
    const best = bestPlayer([...giveSide.counted, ...getSide.counted]);
    const bestPart =
      best?.restOfSeasonTotal != null
        ? ` The single most valuable player here is ${best.displayName} (~${best.restOfSeasonTotal.toFixed(0)} projected).`
        : "";
    rosterNote = `Heads up: this grades on total projected points, so the side with more players is favored — they simply accumulate more. Because you can only start so many each week, a deeper package that out-totals one elite isn't automatically the better side; weigh the top-end talent too.${bestPart}`;
    reasoning.push(rosterNote);
  }

  const threshold = Math.max(CLOSE_CALL_ABS_POINTS, CLOSE_CALL_RELATIVE_PCT * Math.max(giveTotal, getTotal, 1));

  let verdict: TradeVerdict;
  let headline: string;
  if (Math.abs(netValue) <= threshold) {
    verdict = "fair";
    headline = "Fair trade — roughly even value the rest of the season.";
  } else if (netValue > 0) {
    verdict = "good";
    headline = `Good trade for you — you gain about ${netValue.toFixed(1)} points the rest of the season.`;
  } else {
    verdict = "bad";
    headline = `Bad trade for you — you give up about ${Math.abs(netValue).toFixed(1)} points the rest of the season.`;
  }

  return {
    give,
    get,
    giveTotal,
    getTotal,
    netValue,
    verdict,
    headline,
    reasoning,
    rosterNote,
  };
}
