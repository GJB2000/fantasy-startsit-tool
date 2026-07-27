import { buildComparisonInput } from "@/lib/recommendation/buildInput";
import { scorePlayer } from "@/lib/recommendation/engine";
import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectRestOfSeason } from "@/lib/recommendation/restOfSeason";
import type { RemainingGame } from "@/lib/nflverse/schedules";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import { evaluateTrade, toTradePlayerResult, type TradeEvaluation } from "@/lib/trade/evaluateTrade";
import type { WaiverCandidate } from "./buildWaiverReport";

export interface DropSuggestion {
  evaluation: TradeEvaluation;
}

/**
 * For each pickup candidate, suggests dropping whichever of the user's
 * OWN rostered players at the SAME position projects worst the rest of
 * the season, then grades "drop X, add Y" through the exact same
 * evaluateTrade()/projectRestOfSeason() pipeline the live Trade Analyzer
 * already uses for a real 2-sided trade (item 47) — not a new comparison
 * mechanism, just a 1-for-1 trade where one side is auto-selected.
 * Same-position only for v1 (no flex-spot cross-position logic) — the
 * simplest correct behavior for "which roster spot does this replace."
 */
export async function suggestDrops(
  candidates: WaiverCandidate[],
  rosteredPlayerIds: number[],
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>
): Promise<Map<number, DropSuggestion>> {
  const suggestions = new Map<number, DropSuggestion>();
  if (rosteredPlayerIds.length === 0 || candidates.length === 0) return suggestions;

  const rosteredInputs = await Promise.all(
    rosteredPlayerIds.map((id) => buildComparisonInput(id, context, positionDefenseTable, nflversePlayerWeekTable))
  );
  const rosteredResults = rosteredInputs.map((input) => {
    const breakdown = scorePlayer(input, format);
    const projection = projectRestOfSeason(breakdown, remainingOpponentsByTeam, positionDefenseTable);
    return toTradePlayerResult(breakdown, projection);
  });

  for (const candidate of candidates) {
    const sameSpot = rosteredResults.filter((r) => r.position === candidate.position);
    if (sameSpot.length === 0) continue;

    const worst = sameSpot.reduce((min, r) =>
      (r.restOfSeasonTotal ?? Infinity) < (min.restOfSeasonTotal ?? Infinity) ? r : min
    );

    const pickupProjection = projectRestOfSeason(candidate.breakdown, remainingOpponentsByTeam, positionDefenseTable);
    const pickupResult = toTradePlayerResult(candidate.breakdown, pickupProjection);

    suggestions.set(candidate.playerId, { evaluation: evaluateTrade([worst], [pickupResult]) });
  }

  return suggestions;
}
