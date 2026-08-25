import { CLOSE_CALL_ABS_POINTS, CLOSE_CALL_RELATIVE_PCT, REPLACEMENT_PER_GAME } from "@/lib/recommendation/config";
import { isSkillPosition, type ScoringFormat } from "@/lib/sportsdata/types";
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
  /** RAW sum of each side's rest-of-season point projections — what the UI shows, so the side totals always equal the sum of the player cards. On uneven trades the verdict and netValue are computed from these PLUS a replacement-level roster-spot adjustment (see rosterNote), so netValue deliberately does not equal getTotal - giveTotal there. */
  giveTotal: number | null;
  getTotal: number | null;
  /**
   * Side totals INCLUDING the replacement-level roster-spot adjustment — what
   * the verdict is actually based on, so `adjustedGetTotal - adjustedGiveTotal`
   * always equals `netValue`. Identical to the raw totals on even trades. Use
   * these wherever the UI compares the two sides, and the raw totals wherever
   * it has to agree with the sum of the player cards.
   */
  adjustedGiveTotal: number | null;
  adjustedGetTotal: number | null;
  netValue: number | null;
  verdict: TradeVerdict;
  headline: string;
  reasoning: string[];
  /**
   * Set on UNEVEN trades (unequal player counts) — explains the
   * replacement-level roster-spot adjustment applied to the verdict. null on
   * even trades, where no adjustment is made.
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

/**
 * A freed (or extra) roster spot from an uneven trade is worth a
 * replacement-level filler over that player's own remaining games (see
 * REPLACEMENT_PER_GAME). D/ST and K have no replacement constant here, so a
 * non-skill extra credits 0 — a minor, documented simplification, since
 * they're rare in multi-player trades and their replacement value is
 * lower/noisier anyway.
 */
function replacementRestOfSeason(p: TradePlayerResult, format: ScoringFormat): number {
  if (p.position == null || !isSkillPosition(p.position)) return 0;
  return REPLACEMENT_PER_GAME[format][p.position] * p.gamesRemaining;
}

/**
 * Sums each side's rest-of-season projections (see
 * recommendation/restOfSeason.ts), then — on UNEVEN trades — normalizes both
 * sides to the same number of roster spots before comparing. Raw point totals
 * accumulate with headcount, so without that normalization the side with more
 * bodies is structurally over-valued: two mid starters out-total one elite
 * even when the elite is plainly the better asset, because you can only start
 * so many players each week.
 *
 * The adjustment is value-over-replacement in disguise: crediting the shorter
 * side one replacement-level filler per freed roster spot is algebraically
 * identical to comparing the two sides' points ABOVE replacement, the standard
 * way fantasy value is measured. The replacement levels are empirical
 * (REPLACEMENT_PER_GAME — the startable-pool cutoff player's per-game value,
 * derived from the real 2025 season), not a tuned fudge factor, and
 * multiPlayerTradeBacktest.ts grades against the same normalization, so the
 * live tool and the backtest measure the same thing.
 *
 * The close-call threshold is reused unchanged from the single-game comparison
 * engine — there's no backtest ground truth for "was this trade good" to
 * re-tune it against.
 */
export function evaluateTrade(
  give: TradePlayerResult[],
  get: TradePlayerResult[],
  format: ScoringFormat = "ppr"
): TradeEvaluation {
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
      adjustedGiveTotal: null,
      adjustedGetTotal: null,
      netValue: null,
      verdict: "unknown",
      headline: "Not enough data to grade this trade.",
      reasoning: [...reasoning, "At least one side has no players with enough data to project."],
      rosterNote: null,
    };
  }

  const giveTotal = giveSide.total;
  const getTotal = getSide.total;

  // Uneven trade: normalize both sides to the same number of roster spots.
  // Consolidating frees spot(s) you refill off waivers, so the shorter side is
  // credited a replacement-level filler; taking on extra bodies displaces
  // players you'd otherwise stream, so the longer side is charged the same way.
  // The extras are the LOWEST-value players on the longer side (those are the
  // ones a freed spot actually replaces), and each filler is priced at that
  // player's own position and remaining games. Even-count trades get zero
  // filler, so 1-for-1 and 2-for-2 are unaffected.
  const countedGive = giveSide.counted;
  const countedGet = getSide.counted;
  const byLowestValue = (a: TradePlayerResult, b: TradePlayerResult) =>
    (a.restOfSeasonTotal ?? 0) - (b.restOfSeasonTotal ?? 0);

  let giveFiller = 0;
  let getFiller = 0;
  let rosterNote: string | null = null;
  const countDiff = countedGive.length - countedGet.length;
  if (countDiff > 0) {
    const extras = [...countedGive].sort(byLowestValue).slice(0, countDiff);
    getFiller = extras.reduce((sum, p) => sum + replacementRestOfSeason(p, format), 0);
    rosterNote = `Uneven trade: sending ${countedGive.length} players for ${countedGet.length} frees ${countDiff} roster spot${countDiff === 1 ? "" : "s"}, credited to your side at about ${getFiller.toFixed(0)} points of replacement (waiver) value the rest of the season. Consolidating depth into one better player is judged on more than raw point totals, since you can only start so many each week.`;
  } else if (countDiff < 0) {
    const extras = [...countedGet].sort(byLowestValue).slice(0, -countDiff);
    giveFiller = extras.reduce((sum, p) => sum + replacementRestOfSeason(p, format), 0);
    rosterNote = `Uneven trade: taking on ${countedGet.length} players for ${countedGive.length} uses ${-countDiff} extra roster spot${-countDiff === 1 ? "" : "s"}, charged at about ${giveFiller.toFixed(0)} points of replacement (waiver) value — those spots displace players you'd otherwise stream.`;
  }
  if (rosterNote) reasoning.push(rosterNote);

  const adjustedGive = giveTotal + giveFiller;
  const adjustedGet = getTotal + getFiller;
  const netValue = adjustedGet - adjustedGive;

  const threshold = Math.max(
    CLOSE_CALL_ABS_POINTS,
    CLOSE_CALL_RELATIVE_PCT * Math.max(adjustedGive, adjustedGet, 1)
  );

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
    adjustedGiveTotal: adjustedGive,
    adjustedGetTotal: adjustedGet,
    netValue,
    verdict,
    headline,
    reasoning,
    rosterNote,
  };
}
