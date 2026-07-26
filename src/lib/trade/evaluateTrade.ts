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
  giveTotal: number | null;
  getTotal: number | null;
  netValue: number | null;
  verdict: TradeVerdict;
  headline: string;
  reasoning: string[];
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
 * Sums rest-of-season projections (see recommendation/restOfSeason.ts)
 * per side instead of a single next-game finalScore — see CLAUDE.md's
 * trade analyzer notes on why "one game" wasn't a good basis for grading
 * a trade. The close-call threshold is reused unchanged from the
 * single-game comparison engine; there's no backtest ground truth for
 * "was this trade good" to re-tune it against, so this is a carried-over
 * assumption (works fine in relative terms at this larger scale) rather
 * than something independently validated at season-total magnitude.
 */
export function evaluateTrade(give: TradePlayerResult[], get: TradePlayerResult[]): TradeEvaluation {
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
    };
  }

  const netValue = getResult.total - giveResult.total;
  const threshold = Math.max(
    CLOSE_CALL_ABS_POINTS,
    CLOSE_CALL_RELATIVE_PCT * Math.max(giveResult.total, getResult.total, 1)
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
  };
}
