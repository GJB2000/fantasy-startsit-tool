import { BROAD_MODE_POOL_SIZE } from "./config";
import type { BacktestWeekSlice } from "./weekData";
import type { SkillPosition } from "@/lib/sportsdata/types";

export interface CandidatePair {
  position: SkillPosition;
  playerIds: [number, number];
}

/**
 * Broad-mode pairing for one position/week: rank players who actually
 * played that week by season-to-date PPR average (through the prior
 * week only), restrict to a realistic "startable" depth, then pair
 * ADJACENT ranks. This produces genuinely close, realistic start/sit
 * dilemmas rather than random blowout pairings that would trivially
 * inflate accuracy.
 *
 * Requiring Played===1 in the target week is a test-set eligibility
 * choice (we need a real outcome to grade against) — it uses hindsight
 * on PARTICIPATION only, never on performance, so it doesn't leak
 * predictive information into the comparison itself.
 */
export function buildPairsForWeek(weekSlice: BacktestWeekSlice, position: SkillPosition): CandidatePair[] {
  const pool = weekSlice.targetWeekRows.filter((r) => r.Played === 1 && r.Position === position);

  const ranked = pool
    .map((r) => ({ playerId: r.PlayerID, seasonToDate: weekSlice.seasonToDateTable.get(r.PlayerID) }))
    .filter((p) => p.seasonToDate != null && p.seasonToDate.Played > 0)
    .map((p) => ({
      playerId: p.playerId,
      avgPpr: p.seasonToDate!.FantasyPointsPPR / p.seasonToDate!.Played,
    }))
    .sort((a, b) => b.avgPpr - a.avgPpr)
    .slice(0, BROAD_MODE_POOL_SIZE[position]);

  const pairs: CandidatePair[] = [];
  for (let i = 0; i + 1 < ranked.length; i += 2) {
    pairs.push({ position, playerIds: [ranked[i].playerId, ranked[i + 1].playerId] });
  }
  return pairs;
}

export function buildAllPairsForWeek(
  weekSlice: BacktestWeekSlice,
  positions: SkillPosition[]
): CandidatePair[] {
  return positions.flatMap((position) => buildPairsForWeek(weekSlice, position));
}
