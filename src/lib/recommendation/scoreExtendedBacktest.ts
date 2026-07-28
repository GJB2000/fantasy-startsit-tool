import type { BacktestWeekSlice } from "@/lib/backtest/weekData";
import { buildBacktestComparisonInput } from "@/lib/recommendation/buildBacktestInput";
import { scorePlayer } from "@/lib/recommendation/engine";
import { isDstPlayerId } from "@/lib/sportsdata/defenseTeams";
import type { Player, ScoringFormat } from "@/lib/sportsdata/types";
import { buildBacktestDstInput, scoreDst } from "./scoreDefense";
import { buildBacktestKickerInput, scoreKicker } from "./scoreKicker";
import { notFoundBreakdown } from "./scoreExtendedShared";
import type { PlayerScoreBreakdown } from "./types";

/**
 * Backtest mode's equivalent of scoreExtended.ts's live scoreExtendedPlayer
 * — same position-family dispatch (synthetic D/ST ID -> K -> skill),
 * just backed by a pre-fetched weekSlice instead of live fetches, so
 * Broad mode and Single Pair mode can grade D/ST and K's own (much
 * simpler) scorers instead of either crashing on a synthetic ID that
 * was never in allWeeklyRows (D/ST) or silently running K through the
 * skill-position engine's dozen-signal blend it was never tuned for
 * (K) — see CLAUDE.md's D/ST & K backtest item.
 */
export function scoreExtendedPlayerBacktest(
  playerId: number,
  targetWeek: number,
  weekSlice: BacktestWeekSlice,
  byesByTeam: Map<string, number>,
  anyPlayerById: Map<number, Player>,
  format: ScoringFormat
): PlayerScoreBreakdown {
  const player = anyPlayerById.get(playerId);

  if (isDstPlayerId(playerId)) {
    if (!player?.Team) return notFoundBreakdown(`Team ${playerId}`);
    const input = buildBacktestDstInput(playerId, player.Team, targetWeek, weekSlice, byesByTeam);
    return scoreDst(input);
  }

  if (player?.Position === "K") {
    const input = buildBacktestKickerInput(playerId, player, targetWeek, weekSlice, byesByTeam);
    return scoreKicker(input, format);
  }

  const input = buildBacktestComparisonInput(playerId, player ?? null, targetWeek, weekSlice, byesByTeam);
  return scorePlayer(input, format);
}
