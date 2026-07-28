import { BROAD_MODE_POOL_SIZE } from "./config";
import type { BacktestWeekSlice } from "./weekData";
import { average } from "@/lib/recommendation/scoreExtendedShared";
import { getFantasyPoints, type ExtendedPosition, type ScoringFormat, type SkillPosition } from "@/lib/sportsdata/types";

export interface CandidatePair {
  position: ExtendedPosition;
  playerIds: [number, number];
}

export interface RankedPoolEntry {
  playerId: number;
  avgPoints: number;
}

/**
 * The "realistic startable pool" for one position/week: players who
 * actually played that week, ranked by season-to-date average (through
 * the prior week only, in the requested scoring format — which players
 * count as "adjacent rank" genuinely shifts by format, since
 * reception-heavy players rank differently under PPR vs. Standard),
 * restricted to BROAD_MODE_POOL_SIZE depth. Extracted out of
 * buildPairsForWeek (which just pairs this same ranked list adjacent)
 * so other consumers — e.g. the projection-accuracy backtest, which
 * grades every pool member individually rather than pairing them —
 * can reuse the identical pool definition without re-deriving it.
 *
 * Requiring Played===1 in the target week is a test-set eligibility
 * choice (we need a real outcome to grade against) — it uses hindsight
 * on PARTICIPATION only, never on performance, so it doesn't leak
 * predictive information into the comparison itself.
 */
export function buildRankedPoolForWeek(
  weekSlice: BacktestWeekSlice,
  position: SkillPosition,
  format: ScoringFormat = "ppr"
): RankedPoolEntry[] {
  const pool = weekSlice.targetWeekRows.filter((r) => r.Played === 1 && r.Position === position);

  return pool
    .map((r) => ({ playerId: r.PlayerID, seasonToDate: weekSlice.seasonToDateTable.get(r.PlayerID) }))
    .filter((p) => p.seasonToDate != null && p.seasonToDate.Played > 0)
    .map((p) => ({
      playerId: p.playerId,
      avgPoints: getFantasyPoints(p.seasonToDate!, format) / p.seasonToDate!.Played,
    }))
    .sort((a, b) => b.avgPoints - a.avgPoints)
    .slice(0, BROAD_MODE_POOL_SIZE[position]);
}

/**
 * Broad-mode pairing for one position/week: the ranked pool above,
 * paired adjacent-rank. This produces genuinely close, realistic
 * start/sit dilemmas rather than random blowout pairings that would
 * trivially inflate accuracy.
 */
export function buildPairsForWeek(
  weekSlice: BacktestWeekSlice,
  position: SkillPosition,
  format: ScoringFormat = "ppr"
): CandidatePair[] {
  const ranked = buildRankedPoolForWeek(weekSlice, position, format);

  const pairs: CandidatePair[] = [];
  for (let i = 0; i + 1 < ranked.length; i += 2) {
    pairs.push({ position, playerIds: [ranked[i].playerId, ranked[i + 1].playerId] });
  }
  return pairs;
}

/**
 * K's version of buildPairsForWeek — deliberately NOT a call to that
 * function with a widened type, since K rows are filtered OUT of
 * weekSlice.seasonToDateTable by design (buildSeasonToDatePlayerStatsFromRows
 * only aggregates isSkillPosition rows — see sportsdata/seasonToDatePlayerStats.ts
 * — because that table backs skill-position-specific concepts like
 * PositionDefenseTable that don't apply to a kicker). K's raw per-week
 * rows DO already flow through allWeeklyRows/weekSlice.targetWeekRows
 * (SportsDataIO's PlayerGameStatsByWeek response includes Position="K"
 * rows unfiltered — confirmed live), so this reuses
 * weekSlice.seasonGamesByPlayer (the position-agnostic season lookup
 * added alongside this feature) for the ranking basis instead.
 */
export function buildKickerPairsForWeek(weekSlice: BacktestWeekSlice, format: ScoringFormat = "ppr"): CandidatePair[] {
  const pool = weekSlice.targetWeekRows.filter((r) => r.Played === 1 && r.Position === "K");

  const ranked = pool
    .map((r) => ({ playerId: r.PlayerID, seasonGames: weekSlice.seasonGamesByPlayer(r.PlayerID) }))
    .filter((p) => p.seasonGames.length > 0)
    .map((p) => ({ playerId: p.playerId, avgPoints: average(p.seasonGames.map((g) => getFantasyPoints(g, format))) }))
    .sort((a, b) => b.avgPoints - a.avgPoints);

  const pairs: CandidatePair[] = [];
  for (let i = 0; i + 1 < ranked.length; i += 2) {
    pairs.push({ position: "K", playerIds: [ranked[i].playerId, ranked[i + 1].playerId] });
  }
  return pairs;
}

/**
 * D/ST's version — team-level, not player-level, so it ranks by team
 * code (via weekSlice.dstSeasonGamesByTeam/targetWeekDefenseRows) and
 * only converts to the synthetic D/ST PlayerID (dstPlayerIdByTeam, from
 * loadRun.ts) at the very end. No pool-size cap the way skill positions
 * have one (BROAD_MODE_POOL_SIZE) — with only 32 teams total, the whole
 * universe is already "realistic depth" (every team has exactly one
 * starting defense, unlike WR/RB where many bench-caliber players exist
 * per team). D/ST doesn't vary by scoring format, so `format` isn't
 * needed here (FantasyPoints is the only field TeamDefenseGameStat has).
 */
export function buildDstPairsForWeek(weekSlice: BacktestWeekSlice, dstPlayerIdByTeam: Map<string, number>): CandidatePair[] {
  const ranked = weekSlice.targetWeekDefenseRows
    .map((r) => ({ team: r.Team, seasonGames: weekSlice.dstSeasonGamesByTeam(r.Team) }))
    .filter((p) => p.seasonGames.length > 0)
    .map((p) => ({ team: p.team, avgPoints: average(p.seasonGames.map((g) => g.FantasyPoints)) }))
    .sort((a, b) => b.avgPoints - a.avgPoints);

  const pairs: CandidatePair[] = [];
  for (let i = 0; i + 1 < ranked.length; i += 2) {
    const idA = dstPlayerIdByTeam.get(ranked[i].team);
    const idB = dstPlayerIdByTeam.get(ranked[i + 1].team);
    if (idA == null || idB == null) continue;
    pairs.push({ position: "DST", playerIds: [idA, idB] });
  }
  return pairs;
}

export function buildAllPairsForWeek(
  weekSlice: BacktestWeekSlice,
  positions: SkillPosition[],
  format: ScoringFormat = "ppr"
): CandidatePair[] {
  return positions.flatMap((position) => buildPairsForWeek(weekSlice, position, format));
}

/**
 * The ExtendedPosition-aware entry point runBroadBacktest actually
 * calls — dispatches "DST"/"K" to their own pairing functions above and
 * every skill position through the original buildPairsForWeek, so a
 * mixed request (e.g. ["QB", "DST", "K"]) produces the right shape of
 * pair for each.
 */
export function buildAllExtendedPairsForWeek(
  weekSlice: BacktestWeekSlice,
  positions: ExtendedPosition[],
  format: ScoringFormat,
  dstPlayerIdByTeam: Map<string, number>
): CandidatePair[] {
  return positions.flatMap((position) => {
    if (position === "DST") return buildDstPairsForWeek(weekSlice, dstPlayerIdByTeam);
    if (position === "K") return buildKickerPairsForWeek(weekSlice, format);
    return buildPairsForWeek(weekSlice, position, format);
  });
}
