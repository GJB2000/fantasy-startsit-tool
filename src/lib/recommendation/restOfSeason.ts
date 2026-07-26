import { isSkillPosition } from "@/lib/sportsdata/types";
import { getMatchupContext, type PositionDefenseTable } from "@/lib/sportsdata/positionDefense";
import type { RemainingGame } from "@/lib/nflverse/schedules";
import { computeMatchupModifier } from "./engine";
import type { PlayerScoreBreakdown } from "./types";

// The only SportsDataIO/nflverse team-code mismatch found (Rams) — see
// CLAUDE.md item 34. Every other code matches, confirmed against a live
// pull of both sources' full 32-team lists.
const SDIO_TO_NFLVERSE_TEAM: Record<string, string> = { LAR: "LA" };
const NFLVERSE_TO_SDIO_TEAM: Record<string, string> = { LA: "LAR" };

function toNflverseTeam(sdioTeam: string): string {
  return SDIO_TO_NFLVERSE_TEAM[sdioTeam] ?? sdioTeam;
}

function toSdioTeam(nflverseTeam: string): string {
  return NFLVERSE_TO_SDIO_TEAM[nflverseTeam] ?? nflverseTeam;
}

export interface RestOfSeasonProjection {
  gamesRemaining: number;
  total: number | null;
  perGameRate: number | null;
}

const EMPTY_PROJECTION: RestOfSeasonProjection = { gamesRemaining: 0, total: null, perGameRate: null };

/**
 * Core projection math, shared by live mode (below, nflverse-sourced
 * remaining schedule) and the trade backtest (lib/backtest/tradeBacktest.ts,
 * which sources "remaining opponents" from a completed season's own
 * already-known box scores instead) — deliberately opponent-team-code
 * agnostic, since the two callers use different team-code spaces
 * upstream. `baseRate` is a player's per-game rate with their own
 * matchup-modifier already stripped out (see projectRestOfSeason below).
 */
export function sumProjectedPoints(
  baseRate: number,
  opponents: string[],
  position: string,
  positionDefenseTable: PositionDefenseTable
): number {
  let total = 0;
  for (const opponentTeam of opponents) {
    const matchupContext = isSkillPosition(position) ? getMatchupContext(positionDefenseTable, opponentTeam, position) : null;
    total += baseRate + computeMatchupModifier(matchupContext);
  }
  return total;
}

/**
 * Projects a player's rest-of-season value by re-running just the
 * matchup-modifier piece of scorePlayer() against every remaining
 * opponent on their schedule, instead of only their last completed one.
 * Everything else about the player (recent form, volume, snap share, etc.)
 * is held constant at its current rate — deliberately, per the same
 * "recent-form engine wouldn't need to change" reasoning in CLAUDE.md's
 * next-opponent-lookup note: only the opponent identification is
 * forward-looking here, not a full week-by-week performance forecast.
 * `positionDefenseTable` reflects defenses' *last completed season*
 * tendencies, applied prospectively — a real, honest approximation, not a
 * fresh in-season read on this year's defenses.
 */
export function projectRestOfSeason(
  breakdown: PlayerScoreBreakdown,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  positionDefenseTable: PositionDefenseTable
): RestOfSeasonProjection {
  const position = breakdown.position;
  if (breakdown.finalScore == null || !breakdown.team || !position || !isSkillPosition(position)) {
    return EMPTY_PROJECTION;
  }

  const games = remainingOpponentsByTeam.get(toNflverseTeam(breakdown.team)) ?? [];
  if (games.length === 0) {
    return EMPTY_PROJECTION;
  }

  const baseRate = breakdown.finalScore - breakdown.matchupModifier;
  const total = sumProjectedPoints(baseRate, games.map((g) => toSdioTeam(g.opponent)), position, positionDefenseTable);

  return { gamesRemaining: games.length, total, perGameRate: total / games.length };
}
