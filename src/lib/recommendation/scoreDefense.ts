import type { BacktestWeekSlice } from "@/lib/backtest/weekData";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { getByeWeekForTeam } from "@/lib/sportsdata/byes";
import { getDstPlayerById, isDstPlayerId } from "@/lib/sportsdata/defenseTeams";
import { getRecentDefenseStatsForTeam, type TeamDefenseGameStat } from "@/lib/sportsdata/defense";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import { RECENT_WEEK_COUNT } from "./config";
import { toNflverseTeam, toSdioTeam } from "./restOfSeason";
import { average, blendRecentAndSeason, dataQualityFor, skillFieldDefaults } from "./scoreExtendedShared";
import type { NextOpponent, PlayerScoreBreakdown } from "./types";

// Empirically-derived (OLS regression, D/ST FantasyPoints ~ opponent
// implied point total, full 2025 season, n=544 team-weeks — see
// CLAUDE.md's D/ST & K item): slope -0.486, i.e. a D/ST loses about
// half a point for every point its opponent is implied to score above
// the league-average implied total. Standalone-backtested at 63.8%
// pairwise accuracy (vs. 50.4% for a plain season-average baseline) —
// clearly the stronger of the two candidate D/ST signals tested; the
// other (recent turnover/sack rate) came back at exactly 50.0% and is
// surfaced as a note only, not weighted into the score.
const POINTS_LOST_PER_IMPLIED_TOTAL_POINT = 0.486;
const LEAGUE_AVG_IMPLIED_TOTAL = 22.5;
const DST_MATCHUP_CAP = 5.0;

export function computeDstMatchupModifier(opponentImpliedTotal: number | null): number {
  if (opponentImpliedTotal == null) return 0;
  const raw = (LEAGUE_AVG_IMPLIED_TOTAL - opponentImpliedTotal) * POINTS_LOST_PER_IMPLIED_TOTAL_POINT;
  return Math.min(DST_MATCHUP_CAP, Math.max(-DST_MATCHUP_CAP, raw));
}

export interface DstComparisonInput {
  playerId: number;
  displayName: string;
  team: string;
  recentGames: TeamDefenseGameStat[];
  seasonGames: TeamDefenseGameStat[];
  isOnByeThisWeek: boolean;
  nextOpponent: NextOpponent | null;
  nextGameWeather: GameWeather | null;
  opponentImpliedTotal: number | null;
}

export async function buildDstComparisonInput(
  playerId: number,
  context: SeasonContext,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  impliedTotalsByTeamWeek: Map<string, number>,
  teamWeatherByTeamWeek: Map<string, GameWeather> = new Map()
): Promise<DstComparisonInput | null> {
  const player = await getDstPlayerById(playerId);
  if (!player?.Team) return null;

  const allSeasonWeeks = Array.from({ length: context.lastCompletedWeek }, (_, i) => i + 1);
  const [recentGames, seasonGames, byeWeek] = await Promise.all([
    getRecentDefenseStatsForTeam(context.lastCompletedApiSeason, context.recentWeeks, player.Team),
    getRecentDefenseStatsForTeam(context.lastCompletedApiSeason, allSeasonWeeks, player.Team),
    getByeWeekForTeam(context.lastCompletedSeason, player.Team),
  ]);

  const nflverseTeam = toNflverseTeam(player.Team);
  const nextGame = remainingOpponentsByTeam.get(nflverseTeam)?.[0] ?? null;
  const nextOpponent: NextOpponent | null = nextGame
    ? { team: toSdioTeam(nextGame.opponent), week: nextGame.week }
    : null;
  const opponentImpliedTotal = nextGame
    ? (impliedTotalsByTeamWeek.get(`${nextGame.opponent}/${nextGame.week}`) ?? null)
    : null;
  const nextGameWeather = nextGame
    ? (teamWeatherByTeamWeek.get(`${nflverseTeam}/${nextGame.week}`) ?? null)
    : null;

  return {
    playerId,
    displayName: player.LastName,
    team: player.Team,
    recentGames,
    seasonGames,
    isOnByeThisWeek: byeWeek !== null && byeWeek === context.lastCompletedWeek,
    nextOpponent,
    nextGameWeather,
    opponentImpliedTotal,
  };
}

/**
 * Backtest mode's synchronous equivalent of buildDstComparisonInput —
 * reads from a pre-fetched weekSlice (see lib/backtest/weekData.ts)
 * instead of making live fetches, mirroring exactly how
 * buildBacktestInput.ts's buildBacktestComparisonInput relates to
 * buildInput.ts's buildComparisonInput for skill positions. Unlike live
 * mode's "next opponent" (forward-looking, hence null in
 * buildBacktestComparisonInput to avoid any leakage risk), the target
 * week's opponent here is a fully-known, already-played historical
 * fact — the actual matchup being predicted, not speculative future
 * data — so it's populated normally rather than nulled out.
 */
export function buildBacktestDstInput(
  playerId: number,
  team: string,
  targetWeek: number,
  weekSlice: BacktestWeekSlice,
  byesByTeam: Map<string, number>
): DstComparisonInput {
  const row = weekSlice.targetWeekDefenseRows.find((r) => r.Team === team);
  const recentGames = weekSlice.recentDefenseGamesByTeam(team);
  const seasonGames = weekSlice.dstSeasonGamesByTeam(team);
  const byeWeek = byesByTeam.get(team) ?? null;

  let nextOpponent: NextOpponent | null = null;
  let opponentImpliedTotal: number | null = null;
  if (row) {
    nextOpponent = { team: row.Opponent, week: targetWeek };
    const nflverseOpponent = toNflverseTeam(row.Opponent);
    opponentImpliedTotal = weekSlice.impliedTotalsByTeamWeek.get(`${nflverseOpponent}/${targetWeek}`) ?? null;
  }

  return {
    playerId,
    displayName: `${team} D/ST`,
    team,
    recentGames,
    seasonGames,
    isOnByeThisWeek: byeWeek !== null && byeWeek === targetWeek,
    nextOpponent,
    nextGameWeather: null,
    opponentImpliedTotal,
  };
}

export function scoreDst(input: DstComparisonInput): PlayerScoreBreakdown {
  // Honest, position-specific framing rather than a blanket "trust us
  // less" disclaimer — D/ST's opponent-implied-total signal backtested
  // clearly stronger than most skill-position signals (63.8% pairwise
  // accuracy vs. a 50.4% naive baseline), so this recommendation is
  // simpler than start/sit's (recent form + one matchup signal, not a
  // dozen blended factors), not necessarily less trustworthy. See
  // CLAUDE.md's D/ST & K item for the full backtest.
  const notes: string[] = [
    "D/ST uses a simpler model than skill positions: recent scoring plus how good the upcoming opponent's offense is implied to be, not a blend of a dozen signals.",
  ];
  const gamesUsedForRecent = input.recentGames.length;
  const recentPprValues = input.recentGames.map((g) => g.FantasyPoints);
  const recentPprAvg = gamesUsedForRecent > 0 ? average(recentPprValues) : null;
  const recentPprFloor = gamesUsedForRecent > 0 ? Math.min(...recentPprValues) : null;
  const recentPprCeiling = gamesUsedForRecent > 0 ? Math.max(...recentPprValues) : null;
  const seasonPprAvg = input.seasonGames.length > 0 ? average(input.seasonGames.map((g) => g.FantasyPoints)) : null;
  const blendedScore = blendRecentAndSeason(recentPprAvg, seasonPprAvg, gamesUsedForRecent);

  if (recentPprAvg == null && seasonPprAvg != null) {
    notes.push("No games in the recent-form window — using season average only.");
  }
  if (gamesUsedForRecent > 0 && gamesUsedForRecent < RECENT_WEEK_COUNT) {
    notes.push(`Small sample: only ${gamesUsedForRecent} of the last ${RECENT_WEEK_COUNT} weeks available.`);
  }
  // No separate "averaging N points" note here — compareBreakdowns'
  // shared buildReasoning() already generates that line for every
  // position directly from recentPprAvg/seasonPprAvg/gamesUsedForRecent
  // below, same as it does for skill positions.

  const matchupModifier = computeDstMatchupModifier(input.opponentImpliedTotal);
  if (input.nextOpponent && input.opponentImpliedTotal != null) {
    const direction = input.opponentImpliedTotal < LEAGUE_AVG_IMPLIED_TOTAL ? "a favorable" : "a tough";
    notes.push(
      `Next opponent (${input.nextOpponent.team}) is implied for about ${input.opponentImpliedTotal.toFixed(1)} points this week — ${direction} matchup.`
    );
  } else if (input.nextOpponent) {
    notes.push(`Betting lines for the ${input.nextOpponent.team} matchup aren't set yet.`);
  }

  // Context only, not weighted — backtested at exactly 50.0% standalone
  // (n=226, 2025 season), no better than chance. See CLAUDE.md's D/ST & K
  // item for the full comparison against the implied-total signal above.
  const recentTurnoversSacks = input.recentGames.map((g) => g.Sacks + g.Interceptions + g.FumblesRecovered);
  if (recentTurnoversSacks.length > 0) {
    notes.push(`Averaging ${average(recentTurnoversSacks).toFixed(1)} sacks+takeaways/game recently.`);
  }

  if (input.isOnByeThisWeek) {
    notes.push("On a bye — not available to start.");
  }

  const finalScore = blendedScore == null ? null : blendedScore + matchupModifier;
  const dataQuality = dataQualityFor(blendedScore, gamesUsedForRecent, RECENT_WEEK_COUNT);

  return {
    playerId: input.playerId,
    displayName: input.displayName,
    position: "DST",
    team: input.team,
    recentPprAvg,
    recentPprFloor,
    recentPprCeiling,
    seasonPprAvg,
    gamesUsedForRecent,
    blendedScore,
    matchupModifier,
    finalScore,
    injuryStatus: null,
    isOnByeThisWeek: input.isOnByeThisWeek,
    nextOpponent: input.nextOpponent,
    nextGameWeather: input.nextGameWeather,
    dataQuality,
    notes,
    ...skillFieldDefaults(),
  };
}

export function isDst(playerId: number): boolean {
  return isDstPlayerId(playerId);
}

export interface RestOfSeasonProjection {
  gamesRemaining: number;
  total: number | null;
  perGameRate: number | null;
}

/**
 * Rest-of-season projection for the Trade Analyzer, mirroring
 * restOfSeason.ts's shape for skill positions but deliberately simpler:
 * implied totals are only known for whichever game is closest (nflverse's
 * schedule confirms lines aren't set for games more than ~1 week out —
 * only 51 of 272 2026 games had lines when this was built), so
 * `computeDstMatchupModifier` naturally returns 0 for every farther-out
 * week and the projection quietly falls back to the recent-form base
 * rate there — an honest simplification, not a bug, same "can't know
 * that far ahead" precedent as this app's weather-forecast display.
 */
export function projectDstRestOfSeason(
  breakdown: PlayerScoreBreakdown,
  team: string | null,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  impliedTotalsByTeamWeek: Map<string, number>
): RestOfSeasonProjection {
  const empty: RestOfSeasonProjection = { gamesRemaining: 0, total: null, perGameRate: null };
  if (breakdown.finalScore == null || !team) return empty;

  const games = remainingOpponentsByTeam.get(toNflverseTeam(team)) ?? [];
  if (games.length === 0) return empty;

  const baseRate = breakdown.finalScore - breakdown.matchupModifier;
  let total = 0;
  for (const g of games) {
    const opponentImplied = impliedTotalsByTeamWeek.get(`${g.opponent}/${g.week}`) ?? null;
    total += baseRate + computeDstMatchupModifier(opponentImplied);
  }
  return { gamesRemaining: games.length, total, perGameRate: total / games.length };
}
