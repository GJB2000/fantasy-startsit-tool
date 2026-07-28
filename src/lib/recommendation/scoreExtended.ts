import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { buildComparisonInput } from "@/lib/recommendation/buildInput";
import { scorePlayer } from "@/lib/recommendation/engine";
import type { NflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { projectRestOfSeason, type RestOfSeasonProjection } from "@/lib/recommendation/restOfSeason";
import type { PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import { getActiveExtendedPlayerById, getAnyExtendedPlayerById } from "@/lib/sportsdata/players";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import { buildDstComparisonInput, isDst, projectDstRestOfSeason, scoreDst } from "./scoreDefense";
import { buildKickerComparisonInput, projectKickerRestOfSeason, scoreKicker } from "./scoreKicker";
import { notFoundBreakdown } from "./scoreExtendedShared";
import type { PlayerScoreBreakdown } from "./types";

/**
 * Single entry point every live tool (compare/trade/waivers) calls
 * instead of buildComparisonInput+scorePlayer directly — detects
 * whether a requested ID is a skill player, a kicker, or a synthetic
 * D/ST entry, and routes to the matching (much simpler, non-blended)
 * scorer for the latter two. See CLAUDE.md's D/ST & K item for why
 * these two positions get their own scorer rather than being folded
 * into scorePlayer().
 */
export async function scoreExtendedPlayer(
  playerId: number,
  context: SeasonContext,
  format: ScoringFormat,
  positionDefenseTable: PositionDefenseTable,
  nflversePlayerWeekTable: NflversePlayerWeekTable,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>
): Promise<PlayerScoreBreakdown> {
  if (isDst(playerId)) {
    const input = await buildDstComparisonInput(
      playerId,
      context,
      remainingOpponentsByTeam,
      impliedTotalsByTeamWeek,
      teamWeatherByTeamWeek
    );
    return input ? scoreDst(input) : notFoundBreakdown(`Team ${playerId}`);
  }

  const player = await getActiveExtendedPlayerById(playerId);
  if (player?.Position === "K") {
    const input = await buildKickerComparisonInput(
      playerId,
      context,
      remainingOpponentsByTeam,
      teamWeatherByTeamWeek,
      impliedTotalsByTeamWeek
    );
    return input ? scoreKicker(input, format) : notFoundBreakdown(`${player.FirstName} ${player.LastName}`.trim());
  }

  const input = await buildComparisonInput(
    playerId,
    context,
    positionDefenseTable,
    nflversePlayerWeekTable,
    remainingOpponentsByTeam,
    teamWeatherByTeamWeek
  );
  return scorePlayer(input, format);
}

/** Honest fallback label for a totally unrecognized ID (not a skill player, K, or D/ST). */
export async function extendedPlayerLabel(playerId: number): Promise<string> {
  const player = await getAnyExtendedPlayerById(playerId);
  return player ? `${player.FirstName} ${player.LastName}`.trim() : `Player ${playerId}`;
}

/**
 * Trade Analyzer's rest-of-season projection, dispatched by the
 * breakdown's own `position` field (already known once scoreExtendedPlayer
 * has run, so no second ID-family lookup is needed here) rather than
 * skill positions' `restOfSeason.ts`'s position-defense-table matchup
 * math, which has no meaning for a team defense or a kicker.
 */
export function projectExtendedRestOfSeason(
  breakdown: PlayerScoreBreakdown,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  impliedTotalsByTeamWeek: Map<string, number>,
  positionDefenseTable: PositionDefenseTable
): RestOfSeasonProjection {
  if (breakdown.position === "DST") {
    return projectDstRestOfSeason(breakdown, breakdown.team, remainingOpponentsByTeam, impliedTotalsByTeamWeek);
  }
  if (breakdown.position === "K") {
    return projectKickerRestOfSeason(breakdown, breakdown.team, remainingOpponentsByTeam, impliedTotalsByTeamWeek);
  }
  return projectRestOfSeason(breakdown, remainingOpponentsByTeam, positionDefenseTable);
}
