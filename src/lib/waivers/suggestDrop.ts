import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectExtendedRestOfSeason, scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import type { SeasonProjectionMap } from "@/lib/recommendation/restOfSeason";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
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
 * Uses scoreExtendedPlayer/projectExtendedRestOfSeason (not the skill-
 * only buildComparisonInput/scorePlayer/projectRestOfSeason) so a
 * rostered D/ST or K is scored correctly too, not silently mishandled.
 */
export async function suggestDrops(
  candidates: WaiverCandidate[],
  rosteredPlayerIds: number[],
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>,
  projectedPointsByPlayerId: Map<number, number> = new Map(),
  priorSeasonPprAvgByNormalizedName: Map<string, number> = new Map(),
  /** Season-long projections blended into rest-of-season value; omit for pure extrapolation. */
  seasonProjections: SeasonProjectionMap = new Map()
): Promise<Map<number, DropSuggestion>> {
  const suggestions = new Map<number, DropSuggestion>();
  if (rosteredPlayerIds.length === 0 || candidates.length === 0) return suggestions;

  const rosteredResults = await Promise.all(
    rosteredPlayerIds.map(async (id) => {
      const breakdown = await scoreExtendedPlayer(
        id,
        context,
        format,
        positionDefenseTable,
        nflversePlayerWeekTable,
        remainingOpponentsByTeam,
        teamWeatherByTeamWeek,
        impliedTotalsByTeamWeek,
        projectedPointsByPlayerId,
        priorSeasonPprAvgByNormalizedName
      );
      const projection = projectExtendedRestOfSeason(
        breakdown,
        remainingOpponentsByTeam,
        impliedTotalsByTeamWeek,
        positionDefenseTable,
        seasonProjections
      );
      return toTradePlayerResult(breakdown, projection);
    })
  );

  for (const candidate of candidates) {
    const sameSpot = rosteredResults.filter((r) => r.position === candidate.position);
    if (sameSpot.length === 0) continue;

    const worst = sameSpot.reduce((min, r) =>
      (r.restOfSeasonTotal ?? Infinity) < (min.restOfSeasonTotal ?? Infinity) ? r : min
    );

    const pickupProjection = projectExtendedRestOfSeason(
      candidate.breakdown,
      remainingOpponentsByTeam,
      impliedTotalsByTeamWeek,
      positionDefenseTable,
      seasonProjections
    );
    const pickupResult = toTradePlayerResult(candidate.breakdown, pickupProjection);

    suggestions.set(candidate.playerId, { evaluation: evaluateTrade([worst], [pickupResult], format) });
  }

  return suggestions;
}
