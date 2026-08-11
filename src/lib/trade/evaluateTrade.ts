import { CLOSE_CALL_ABS_POINTS, CLOSE_CALL_RELATIVE_PCT, REPLACEMENT_PER_GAME } from "@/lib/recommendation/config";
import type { RestOfSeasonProjection } from "@/lib/recommendation/restOfSeason";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import { isSkillPosition, type ScoringFormat } from "@/lib/sportsdata/types";

export type TradeVerdict = "good" | "fair" | "bad" | "unknown";

export interface TradePlayerResult extends PlayerScoreBreakdown {
  gamesRemaining: number;
  restOfSeasonTotal: number | null;
  restOfSeasonPerGame: number | null;
}

export interface TradeEvaluation {
  give: TradePlayerResult[];
  get: TradePlayerResult[];
  giveTotal: number | null;
  getTotal: number | null;
  netValue: number | null;
  verdict: TradeVerdict;
  headline: string;
  reasoning: string[];
  /**
   * Set on UNEVEN trades (unequal player counts) — a plain-English note
   * explaining the replacement-level credit applied for the freed/extra
   * roster spot (see evaluateTrade). null on even trades, where no
   * adjustment happens.
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

function sideTotal(players: TradePlayerResult[]): { total: number | null; excludedNotes: string[] } {
  const excludedNotes: string[] = [];
  let total = 0;
  let countedAny = false;

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
    countedAny = true;
  }

  return { total: countedAny ? total : null, excludedNotes };
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
 * Sums rest-of-season projections (see recommendation/restOfSeason.ts)
 * per side instead of a single next-game finalScore — see CLAUDE.md's
 * trade analyzer notes on why "one game" wasn't a good basis for grading
 * a trade. The close-call threshold is reused unchanged from the
 * single-game comparison engine; there's no backtest ground truth for
 * "was this trade good" to re-tune it against, so this is a carried-over
 * assumption (works fine in relative terms at this larger scale) rather
 * than something independently validated at season-total magnitude.
 */
export function evaluateTrade(
  give: TradePlayerResult[],
  get: TradePlayerResult[],
  format: ScoringFormat = "ppr"
): TradeEvaluation {
  const giveResult = sideTotal(give);
  const getResult = sideTotal(get);
  const reasoning = [...giveResult.excludedNotes, ...getResult.excludedNotes];
  reasoning.push(...give.flatMap(playerLines), ...get.flatMap(playerLines));

  if (giveResult.total === null || getResult.total === null) {
    return {
      give,
      get,
      giveTotal: giveResult.total,
      getTotal: getResult.total,
      netValue: null,
      verdict: "unknown",
      headline: "Not enough data to grade this trade.",
      reasoning: [...reasoning, "At least one side has no players with enough data to project."],
      rosterNote: null,
    };
  }

  // Uneven trades: normalize both sides to the same number of startable
  // players before comparing. Consolidating players frees roster spot(s)
  // worth a replacement-level filler; taking on more players than you send
  // charges the extra spot(s) the same way. Without this the side with more
  // bodies is structurally over-valued (raw point totals accumulate with
  // headcount — a real bias the multi-player trade backtest surfaced, see
  // CLAUDE.md). Even-count trades: zero fillers, so 1-for-1 / 2-for-2 are
  // byte-identical to before.
  const countedGive = give.filter((p) => p.playerId !== null && p.restOfSeasonTotal !== null);
  const countedGet = get.filter((p) => p.playerId !== null && p.restOfSeasonTotal !== null);
  const byLowestValue = (a: TradePlayerResult, b: TradePlayerResult) =>
    (a.restOfSeasonTotal ?? 0) - (b.restOfSeasonTotal ?? 0);

  let giveFiller = 0;
  let getFiller = 0;
  let rosterNote: string | null = null;
  const countDiff = countedGive.length - countedGet.length;
  if (countDiff > 0) {
    // Give side has more players → your roster frees `countDiff` spots, each
    // refillable at replacement level, so the get side is credited for them.
    const extras = [...countedGive].sort(byLowestValue).slice(0, countDiff);
    getFiller = extras.reduce((sum, p) => sum + replacementRestOfSeason(p, format), 0);
    rosterNote = `Uneven trade: sending ${countedGive.length} players for ${countedGet.length} frees ${countDiff} roster spot${countDiff === 1 ? "" : "s"}, credited at about ${getFiller.toFixed(1)} points of replacement (waiver) value the rest of the season — so it's judged on more than raw point totals.`;
  } else if (countDiff < 0) {
    // Get side has more players → you take on extra bodies, each displacing a
    // waiver-level player you'd otherwise stream, so the give side is charged.
    const extras = [...countedGet].sort(byLowestValue).slice(0, -countDiff);
    giveFiller = extras.reduce((sum, p) => sum + replacementRestOfSeason(p, format), 0);
    rosterNote = `Uneven trade: taking on ${countedGet.length} players for ${countedGive.length} uses ${-countDiff} extra roster spot${-countDiff === 1 ? "" : "s"}, charged at about ${giveFiller.toFixed(1)} points of replacement (waiver) value — since it displaces players you'd otherwise stream.`;
  }
  if (rosterNote) reasoning.push(rosterNote);

  const adjustedGive = giveResult.total + giveFiller;
  const adjustedGet = getResult.total + getFiller;
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
    giveTotal: giveResult.total,
    getTotal: getResult.total,
    netValue,
    verdict,
    headline,
    reasoning,
    rosterNote,
  };
}
