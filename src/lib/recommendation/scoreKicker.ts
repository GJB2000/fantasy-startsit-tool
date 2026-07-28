import type { BacktestWeekSlice } from "@/lib/backtest/weekData";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { getByeWeekForTeam } from "@/lib/sportsdata/byes";
import { getActiveExtendedPlayerById } from "@/lib/sportsdata/players";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import { getFantasyPoints, type Player, type PlayerGameStat, type ScoringFormat } from "@/lib/sportsdata/types";
import { getRecentGameStatsForPlayer } from "@/lib/sportsdata/weeklyStats";
import { RECENT_WEEK_COUNT } from "./config";
import { toNflverseTeam, toSdioTeam } from "./restOfSeason";
import { average, blendRecentAndSeason, dataQualityFor, skillFieldDefaults } from "./scoreExtendedShared";
import type { NextOpponent, PlayerScoreBreakdown } from "./types";

// Empirically-derived (OLS regression, K FantasyPoints ~ own team's
// implied point total, full 2025 season, n=543 — see CLAUDE.md's D/ST &
// K item): slope +0.175, notably smaller than D/ST's matchup effect.
// Standalone-backtested at 55.4% pairwise accuracy — real, but weaker
// than simply ranking kickers by season-to-date average (60.1%), which
// blendedScore below already captures most of. Kept as a modest,
// capped modifier rather than the primary driver, unlike D/ST.
const POINTS_PER_IMPLIED_TOTAL_POINT = 0.175;
const LEAGUE_AVG_IMPLIED_TOTAL = 22.5;
const K_MATCHUP_CAP = 2.0;

export function computeKickerMatchupModifier(teamImpliedTotal: number | null): number {
  if (teamImpliedTotal == null) return 0;
  const raw = (teamImpliedTotal - LEAGUE_AVG_IMPLIED_TOTAL) * POINTS_PER_IMPLIED_TOTAL_POINT;
  return Math.min(K_MATCHUP_CAP, Math.max(-K_MATCHUP_CAP, raw));
}

export interface KickerComparisonInput {
  playerId: number;
  displayName: string;
  team: string | null;
  injuryStatus: string | null;
  recentGames: PlayerGameStat[];
  seasonGames: PlayerGameStat[];
  isOnByeThisWeek: boolean;
  nextOpponent: NextOpponent | null;
  nextGameWeather: GameWeather | null;
  teamImpliedTotal: number | null;
}

export async function buildKickerComparisonInput(
  playerId: number,
  context: SeasonContext,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>
): Promise<KickerComparisonInput | null> {
  const player = await getActiveExtendedPlayerById(playerId);
  if (!player || player.Position !== "K") return null;

  const allSeasonWeeks = Array.from({ length: context.lastCompletedWeek }, (_, i) => i + 1);
  const [recentGames, seasonGames, byeWeek] = await Promise.all([
    getRecentGameStatsForPlayer(context.lastCompletedApiSeason, context.recentWeeks, playerId),
    getRecentGameStatsForPlayer(context.lastCompletedApiSeason, allSeasonWeeks, playerId),
    player.Team ? getByeWeekForTeam(context.lastCompletedSeason, player.Team) : Promise.resolve(null),
  ]);

  let nextOpponent: NextOpponent | null = null;
  let nextGameWeather: GameWeather | null = null;
  let teamImpliedTotal: number | null = null;
  if (player.Team) {
    const nflverseTeam = toNflverseTeam(player.Team);
    const nextGame = remainingOpponentsByTeam.get(nflverseTeam)?.[0] ?? null;
    if (nextGame) {
      nextOpponent = { team: toSdioTeam(nextGame.opponent), week: nextGame.week };
      nextGameWeather = teamWeatherByTeamWeek.get(`${nflverseTeam}/${nextGame.week}`) ?? null;
      teamImpliedTotal = impliedTotalsByTeamWeek.get(`${nflverseTeam}/${nextGame.week}`) ?? null;
    }
  }

  return {
    playerId,
    displayName: `${player.FirstName} ${player.LastName}`.trim(),
    team: player.Team,
    injuryStatus: player.InjuryStatus,
    recentGames,
    seasonGames,
    isOnByeThisWeek: byeWeek !== null && byeWeek === context.lastCompletedWeek,
    nextOpponent,
    nextGameWeather,
    teamImpliedTotal,
  };
}

/**
 * Backtest mode's synchronous equivalent of buildKickerComparisonInput
 * — mirrors buildBacktestDstInput's relationship to
 * buildDstComparisonInput exactly. Unlike D/ST (which has no per-player
 * identity in allWeeklyRows), K's raw rows already live there
 * (Position="K", confirmed live), so recentGames/seasonGames come from
 * weekSlice's generic (non-skill-filtered) player lookups —
 * recentGamesByPlayer already works for any position; seasonGamesByPlayer
 * is the season-long counterpart, added alongside this feature since
 * weekSlice.seasonToDateTable itself filters K out by design (it backs
 * skill-position-only concepts, see pairing.ts's buildKickerPairsForWeek
 * doc comment). Injury status reads nflverse's real pregame weekly
 * report the same non-leaky way buildBacktestComparisonInput does for
 * skill positions, rather than SportsDataIO's retroactive field.
 */
export function buildBacktestKickerInput(
  playerId: number,
  player: Player,
  targetWeek: number,
  weekSlice: BacktestWeekSlice,
  byesByTeam: Map<string, number>
): KickerComparisonInput {
  const weekRow = weekSlice.targetWeekRows.find((r) => r.PlayerID === playerId);
  const team = weekRow?.Team ?? player.Team;
  const recentGames = weekSlice.recentGamesByPlayer(playerId);
  const seasonGames = weekSlice.seasonGamesByPlayer(playerId);
  const byeWeek = team ? (byesByTeam.get(team) ?? null) : null;

  const weekStat = weekSlice.nflverseStatForWeek(playerId, targetWeek);
  const injuryStatus = weekStat?.rosterStatus === "RES" ? "Out" : (weekStat?.injuryStatus ?? null);

  let nextOpponent: NextOpponent | null = null;
  let teamImpliedTotal: number | null = null;
  if (weekRow && team) {
    nextOpponent = { team: weekRow.Opponent, week: targetWeek };
    const nflverseTeam = toNflverseTeam(team);
    teamImpliedTotal = weekSlice.impliedTotalsByTeamWeek.get(`${nflverseTeam}/${targetWeek}`) ?? null;
  }

  return {
    playerId,
    displayName: `${player.FirstName} ${player.LastName}`.trim(),
    team,
    injuryStatus,
    recentGames,
    seasonGames,
    isOnByeThisWeek: byeWeek !== null && byeWeek === targetWeek,
    nextOpponent,
    nextGameWeather: null,
    teamImpliedTotal,
  };
}

export function scoreKicker(input: KickerComparisonInput, format: ScoringFormat): PlayerScoreBreakdown {
  // Honest, position-specific caveat: unlike D/ST, neither candidate K
  // signal (team implied total, dome/wind) cleanly beat a naive
  // season-average baseline in backtesting (55.4%/51.4% vs. 60.1%) —
  // kickers are genuinely harder to predict than skill positions, and
  // this recommendation leans more on recent form than a validated
  // matchup edge. See CLAUDE.md's D/ST & K item for the full backtest.
  const notes: string[] = [
    "Kickers are inherently harder to predict than skill positions — treat this as a rougher estimate, leaning mostly on recent scoring rather than a strong matchup signal.",
  ];
  const gamesUsedForRecent = input.recentGames.length;
  const recentPprAvg =
    gamesUsedForRecent > 0 ? average(input.recentGames.map((g) => getFantasyPoints(g, format))) : null;
  const seasonPprAvg =
    input.seasonGames.length > 0 ? average(input.seasonGames.map((g) => getFantasyPoints(g, format))) : null;
  const blendedScore = blendRecentAndSeason(recentPprAvg, seasonPprAvg, gamesUsedForRecent);

  if (recentPprAvg == null && seasonPprAvg != null) {
    notes.push("No games in the recent-form window — using season average only.");
  }
  if (gamesUsedForRecent > 0 && gamesUsedForRecent < RECENT_WEEK_COUNT) {
    notes.push(`Small sample: only ${gamesUsedForRecent} of the last ${RECENT_WEEK_COUNT} weeks available.`);
  }
  // No separate "averaging N points" note — compareBreakdowns' shared
  // buildReasoning() already generates that line for every position.

  const matchupModifier = computeKickerMatchupModifier(input.teamImpliedTotal);
  if (input.nextOpponent && input.teamImpliedTotal != null) {
    notes.push(
      `${input.team} is implied for about ${input.teamImpliedTotal.toFixed(1)} points against ${input.nextOpponent.team} this week.`
    );
  } else if (input.nextOpponent) {
    notes.push(`Betting lines for the ${input.nextOpponent.team} matchup aren't set yet.`);
  }

  // Context only, not weighted — backtested at 51.4% standalone (n=201,
  // 2025 season), close to chance. See CLAUDE.md's D/ST & K item.
  if (input.nextGameWeather) {
    const w = input.nextGameWeather;
    if (w.roof === "dome" || w.roof === "closed") {
      notes.push("Playing in a dome — no weather concerns for kicking.");
    } else if (w.wind != null) {
      notes.push(`Recorded wind for this matchup: ${w.wind} mph.`);
    }
  }

  if (input.injuryStatus === "Questionable") {
    notes.push("Listed as Questionable — worth watching, but not an automatic bench.");
  } else if (input.injuryStatus === "Doubtful" || input.injuryStatus === "Out") {
    notes.push(`Listed as ${input.injuryStatus} — significant risk of not playing.`);
  }
  if (input.isOnByeThisWeek) {
    notes.push("On a bye — not available to start.");
  }

  const finalScore = blendedScore == null ? null : blendedScore + matchupModifier;
  const dataQuality = dataQualityFor(blendedScore, gamesUsedForRecent, RECENT_WEEK_COUNT);

  return {
    playerId: input.playerId,
    displayName: input.displayName,
    position: "K",
    team: input.team,
    recentPprAvg,
    seasonPprAvg,
    gamesUsedForRecent,
    blendedScore,
    matchupModifier,
    finalScore,
    injuryStatus: input.injuryStatus,
    isOnByeThisWeek: input.isOnByeThisWeek,
    nextOpponent: input.nextOpponent,
    nextGameWeather: input.nextGameWeather,
    dataQuality,
    notes,
    ...skillFieldDefaults(),
  };
}

export interface RestOfSeasonProjection {
  gamesRemaining: number;
  total: number | null;
  perGameRate: number | null;
}

/** Same shape/rationale as scoreDefense.ts's projectDstRestOfSeason — see that comment for why implied totals naturally fall back to a plain base rate for games more than ~1 week out. */
export function projectKickerRestOfSeason(
  breakdown: PlayerScoreBreakdown,
  team: string | null,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  impliedTotalsByTeamWeek: Map<string, number>
): RestOfSeasonProjection {
  const empty: RestOfSeasonProjection = { gamesRemaining: 0, total: null, perGameRate: null };
  if (breakdown.finalScore == null || !team) return empty;

  const nflverseTeam = toNflverseTeam(team);
  const games = remainingOpponentsByTeam.get(nflverseTeam) ?? [];
  if (games.length === 0) return empty;

  const baseRate = breakdown.finalScore - breakdown.matchupModifier;
  let total = 0;
  for (const g of games) {
    const teamImplied = impliedTotalsByTeamWeek.get(`${nflverseTeam}/${g.week}`) ?? null;
    total += baseRate + computeKickerMatchupModifier(teamImplied);
  }
  return { gamesRemaining: games.length, total, perGameRate: total / games.length };
}
