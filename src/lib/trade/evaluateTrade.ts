import { CLOSE_CALL_ABS_POINTS, CLOSE_CALL_RELATIVE_PCT, REPLACEMENT_PER_GAME } from "@/lib/recommendation/config";
import { type ExtendedPosition, type ScoringFormat } from "@/lib/sportsdata/types";
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
  /** RAW sum of each side's rest-of-season point projections — what the UI shows, so the side totals always equal the sum of the player cards. NOT what the verdict compares: see adjustedGiveTotal. */
  giveTotal: number | null;
  getTotal: number | null;
  /**
   * Each side's value OVER REPLACEMENT — every player's rest-of-season
   * projection minus what a freely-available waiver player at their position
   * would score over the same games (REPLACEMENT_PER_GAME). This is what the
   * verdict is actually based on, so `adjustedGetTotal - adjustedGiveTotal`
   * always equals `netValue`. Use these wherever the UI compares the two
   * sides, and the raw totals wherever it has to agree with the player cards.
   */
  adjustedGiveTotal: number | null;
  adjustedGetTotal: number | null;
  netValue: number | null;
  verdict: TradeVerdict;
  headline: string;
  reasoning: string[];
  /**
   * Explains the replacement-level adjustment whenever it materially changes
   * the comparison — a cross-position trade, or an uneven one. null when the
   * two sides are close enough in positional makeup that raw totals and
   * value-over-replacement say the same thing (e.g. WR-for-WR).
   */
  valueNote: string | null;
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
 * What a freely-available waiver player at this player's position would score
 * over the same remaining games (see REPLACEMENT_PER_GAME). Every position has
 * a real level, D/ST and K included — a kicker's raw points are almost all
 * replacement, which is exactly why he's barely a trade asset.
 */
function replacementRestOfSeason(p: TradePlayerResult, format: ScoringFormat): number {
  const position = p.position as ExtendedPosition | null;
  const levels = REPLACEMENT_PER_GAME[format];
  if (position == null || !(position in levels)) return 0;
  return levels[position] * p.gamesRemaining;
}

/**
 * A player's rest-of-season points ABOVE replacement — the currency a trade is
 * actually settled in. See REPLACEMENT_PER_GAME for why raw points aren't.
 */
function valueOverReplacement(p: TradePlayerResult, format: ScoringFormat): number {
  return (p.restOfSeasonTotal ?? 0) - replacementRestOfSeason(p, format);
}


/**
 * Grades a trade on each side's VALUE OVER REPLACEMENT, not on raw
 * rest-of-season point totals.
 *
 * Raw totals are not comparable across positions, and the gap is large enough
 * to invert real verdicts. Every league starts a quarterback, and the worst
 * startable QB already scores ~17.5 a game, so ~90% of an elite QB's raw
 * rest-of-season total is a baseline you can replace off waivers for nothing.
 * A WR's replacement level is ~12.2. Compared on raw points a good QB and a
 * good WR look interchangeable; compared on what they add above a freely
 * available starter, the WR can be worth several times more. Grading on raw
 * totals produced exactly that failure live — a QB-for-elite-WR swap graded
 * "fair" when no opposing manager would ever accept it.
 *
 * Subtracting each player's own replacement level fixes that and subsumes the
 * uneven-trade normalization it replaces: crediting the shorter side one
 * replacement-level filler per freed roster spot (the previous model, items 138
 * and 168) is algebraically the same thing as comparing points above
 * replacement, just applied only to the count difference. Doing it per player
 * covers cross-position trades too, and 2-for-1 verdicts land within a point of
 * where the filler model put them. Same-position trades are exactly unchanged —
 * both sides shed the identical baseline, so the difference is untouched.
 * The replacement levels are empirical (REPLACEMENT_PER_GAME, derived from the
 * real 2025 season), not a tuned fudge factor, and it's the same currency the
 * Top 100 cross-position ranking already settles in.
 *
 * The "roughly even" band still scales off the RAW totals, so the tolerance
 * for calling a trade fair stays where it was in absolute points — only WHICH
 * difference is measured changed. The threshold itself is reused unchanged
 * from the single-game comparison engine; there's no backtest ground truth for
 * "was this trade fair" to re-tune it against (the trade backtests grade a
 * different question — which side actually outscores the other — and so are
 * deliberately left on raw points).
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
      valueNote: null,
    };
  }

  const giveTotal = giveSide.total;
  const getTotal = getSide.total;

  // Both sides in points above replacement (see valueOverReplacement). This is
  // what the verdict compares; the raw totals above are what the player cards
  // show. On an uneven trade the shorter side keeps the extra spot's
  // replacement value implicitly, since it never had that baseline subtracted.
  const countedGive = giveSide.counted;
  const countedGet = getSide.counted;
  const adjustedGive = countedGive.reduce((sum, p) => sum + valueOverReplacement(p, format), 0);
  const adjustedGet = countedGet.reduce((sum, p) => sum + valueOverReplacement(p, format), 0);
  const netValue = adjustedGet - adjustedGive;

  // Only explain the adjustment when it actually moved the comparison —
  // otherwise (a WR-for-WR swap, say) it's noise the reader doesn't need.
  const rawNet = getTotal - giveTotal;
  const positionalSwing = netValue - rawNet;
  let valueNote: string | null = null;
  if (Math.abs(positionalSwing) >= 1) {
    const direction = positionalSwing > 0 ? "your way" : "against you";
    const counts =
      countedGive.length !== countedGet.length
        ? ` It also accounts for the roster spot${Math.abs(countedGive.length - countedGet.length) === 1 ? "" : "s"} an uneven trade frees or fills.`
        : "";
    valueNote = `Graded on value above a replacement starter, not raw points: a freely available starter at each position already scores most of what some positions put up, so the two sides' raw totals overstate how close they are. That swings the verdict about ${Math.abs(positionalSwing).toFixed(0)} points ${direction}.${counts}`;
    reasoning.push(valueNote);
  }

  const threshold = Math.max(
    CLOSE_CALL_ABS_POINTS,
    CLOSE_CALL_RELATIVE_PCT * Math.max(giveTotal, getTotal, 1)
  );

  let verdict: TradeVerdict;
  let headline: string;
  if (Math.abs(netValue) <= threshold) {
    verdict = "fair";
    headline = "Fair trade — roughly even value the rest of the season.";
  } else if (netValue > 0) {
    verdict = "good";
    headline = `Good trade for you — you gain about ${netValue.toFixed(1)} points of value the rest of the season.`;
  } else {
    verdict = "bad";
    headline = `Bad trade for you — you give up about ${Math.abs(netValue).toFixed(1)} points of value the rest of the season.`;
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
    valueNote,
  };
}
