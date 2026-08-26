import { optimizeLineup } from "@/lib/lineup/optimizeLineup";
import type { SlotType } from "@/lib/lineup/rosterSlots";
import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectExtendedRestOfSeason, scoreExtendedPlayer } from "@/lib/recommendation/scoreExtended";
import type { SeasonProjectionMap } from "@/lib/recommendation/restOfSeason";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import {
  evaluateTrade,
  toTradePlayerResult,
  valueOverReplacement,
  type TradeEvaluation,
} from "@/lib/trade/evaluateTrade";
import type { WaiverCandidate } from "./buildWaiverReport";

export interface DropSuggestion {
  evaluation: TradeEvaluation;
}

/**
 * Suggests who to drop to make room for a pickup: the least valuable player on
 * your BENCH, by value over replacement, whatever position they play.
 *
 * The obvious-looking rule — drop your worst player at the SAME position — is
 * what this replaced, and it was wrong in the common case. On a shallow roster
 * your worst player at a position is frequently a STARTER (two tight ends, both
 * in the lineup), so it would tell you to cut a starter for a worse waiver
 * player and then honestly grade its own suggestion "Bad move for you — you
 * give up about 75 points." A suggestion the tool simultaneously argues against
 * isn't a suggestion. Real managers drop whoever is least useful, which is a
 * bench question, not a positional one — and "least useful" is value over
 * replacement, not raw points, or a backup QB looks untouchable (see item 180).
 *
 * Knowing who is on the bench needs the league's starting slots, so this runs
 * the same optimizeLineup the Lineup Optimizer does. A roster with no bench
 * (everyone starts) gets no suggestion rather than a bad one.
 *
 * Only surfaced when the pickup genuinely beats that player. If your worst
 * bench player is still better than the best thing on waivers, the honest
 * answer is that there's nothing here worth a roster spot — so it returns
 * nothing rather than manufacturing a losing move.
 *
 * Still graded through the same evaluateTrade()/projectRestOfSeason() pipeline
 * the Trade Assistant uses (item 47) — a drop+add is a 1-for-1 trade where one
 * side is auto-selected — and through scoreExtendedPlayer, so a rostered D/ST
 * or K is valued correctly rather than silently mishandled.
 */
export async function suggestDrops(
  candidates: WaiverCandidate[],
  rosteredPlayerIds: number[],
  /** The league's real starting slots — decides who counts as bench. */
  slotCounts: Record<SlotType, number>,
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

  // Who's actually droppable: everyone the optimal lineup leaves on the bench.
  // TradePlayerResult extends PlayerScoreBreakdown, so the already-scored
  // results feed optimizeLineup directly — no second scoring pass.
  const benchIds = new Set(
    optimizeLineup(rosteredResults, slotCounts).bench.flatMap((b) =>
      b.playerId != null ? [b.playerId] : []
    )
  );
  const droppable = rosteredResults.filter(
    (r) => r.playerId != null && benchIds.has(r.playerId) && r.restOfSeasonTotal != null
  );
  if (droppable.length === 0) return suggestions;

  const worstBench = droppable.reduce((min, r) =>
    valueOverReplacement(r, format) < valueOverReplacement(min, format) ? r : min
  );
  const worstBenchValue = valueOverReplacement(worstBench, format);

  for (const candidate of candidates) {
    const pickupProjection = projectExtendedRestOfSeason(
      candidate.breakdown,
      remainingOpponentsByTeam,
      impliedTotalsByTeamWeek,
      positionDefenseTable,
      seasonProjections
    );
    const pickupResult = toTradePlayerResult(candidate.breakdown, pickupProjection);
    if (pickupResult.restOfSeasonTotal == null) continue;
    // Nothing to gain — say nothing rather than recommend a losing swap.
    if (valueOverReplacement(pickupResult, format) <= worstBenchValue) continue;

    suggestions.set(candidate.playerId, { evaluation: evaluateTrade([worstBench], [pickupResult], format) });
  }

  return suggestions;
}
