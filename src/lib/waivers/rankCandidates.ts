import { getVolumeStat } from "@/lib/recommendation/volume";
import { getActivePlayers } from "@/lib/sportsdata/players";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import { getFantasyPoints, SKILL_POSITIONS, type PlayerGameStat, type ScoringFormat, type SkillPosition } from "@/lib/sportsdata/types";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";

const MIN_RECENT_GAMES = 2;
const CANDIDATES_PER_POSITION = 6;

export interface WaiverCandidateRank {
  playerId: number;
  position: SkillPosition;
  team: string | null;
  recentVolumeAvg: number;
  recentPprAvg: number;
  gamesUsedForRecent: number;
  /** 1 = most recent volume at the position. */
  volumeRank: number;
  /** 1 = most recent points at the position. */
  pointsRank: number;
  /** pointsRank - volumeRank; positive means opportunity is ahead of production. */
  gapScore: number;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Bulk ranking pass across the whole active skill-player pool —
 * deliberately NOT running the full buildComparisonInput/scorePlayer
 * pipeline here (that's reserved for the handful of top candidates
 * actually surfaced, see buildWaiverReport.ts), since this needs to scan
 * every active player cheaply rather than the few players a normal
 * comparison touches.
 *
 * Ranks by the GAP between a player's recent-volume rank and their
 * recent-points rank at the same position: a player getting
 * starter-level opportunity while still producing replacement-level
 * points is exactly the "opportunity outpacing production" profile a
 * waiver add is looking for. This is a ranking composition of one
 * already-validated primitive (recent volume level beats recent points
 * as a forward signal — the strongest standalone predictor found across
 * this whole app's backtesting history), not an independent predictive
 * claim of its own.
 *
 * Explicitly NOT a trend/delta signal: a real backtest of "opportunity
 * TREND vs. points TREND" (recent-N-games vs. a prior baseline window,
 * swept across window sizes and baseline definitions) came back
 * statistically indistinguishable from chance-level noise and clearly
 * weaker than just using absolute recent volume level — see CLAUDE.md's
 * waiver-wire investigation for the full sweep. This ranking uses
 * absolute LEVEL only, per that finding.
 */
export async function rankWaiverCandidates(
  context: SeasonContext,
  format: ScoringFormat,
  excludePlayerIds: Set<number>
): Promise<Record<SkillPosition, WaiverCandidateRank[]>> {
  const [activePlayers, weeklyRows] = await Promise.all([
    getActivePlayers(),
    Promise.all(context.recentWeeks.map((week) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, week))),
  ]);

  const recentGamesByPlayer = new Map<number, PlayerGameStat[]>();
  for (const rows of weeklyRows) {
    for (const row of rows) {
      if (row.Played !== 1) continue;
      const list = recentGamesByPlayer.get(row.PlayerID);
      if (list) list.push(row);
      else recentGamesByPlayer.set(row.PlayerID, [row]);
    }
  }
  for (const list of recentGamesByPlayer.values()) list.sort((a, b) => a.Week - b.Week);

  const byPosition = {} as Record<SkillPosition, WaiverCandidateRank[]>;

  for (const position of SKILL_POSITIONS) {
    type RawCandidate = Omit<WaiverCandidateRank, "volumeRank" | "pointsRank" | "gapScore">;
    const raw: RawCandidate[] = [];

    for (const player of activePlayers) {
      if (player.Position !== position || excludePlayerIds.has(player.PlayerID)) continue;
      const games = recentGamesByPlayer.get(player.PlayerID) ?? [];
      if (games.length < MIN_RECENT_GAMES) continue;

      const volumeValues = games.map(getVolumeStat).filter((v): v is number => v != null);
      if (volumeValues.length === 0) continue;

      raw.push({
        playerId: player.PlayerID,
        position,
        team: player.Team,
        recentVolumeAvg: average(volumeValues),
        recentPprAvg: average(games.map((g) => getFantasyPoints(g, format))),
        gamesUsedForRecent: games.length,
      });
    }

    const volumeRankById = new Map(
      [...raw].sort((a, b) => b.recentVolumeAvg - a.recentVolumeAvg).map((p, i) => [p.playerId, i + 1])
    );
    const pointsRankById = new Map(
      [...raw].sort((a, b) => b.recentPprAvg - a.recentPprAvg).map((p, i) => [p.playerId, i + 1])
    );

    // Self-relative floor, not a guessed absolute cutoff: only rank
    // within the top half of the position's own recent-volume
    // distribution — a gap score is meaningless noise for a player with
    // a token, one-off role.
    const volumeFloorRank = Math.max(1, Math.ceil(raw.length / 2));

    byPosition[position] = raw
      .map((p) => {
        const volumeRank = volumeRankById.get(p.playerId)!;
        const pointsRank = pointsRankById.get(p.playerId)!;
        return { ...p, volumeRank, pointsRank, gapScore: pointsRank - volumeRank };
      })
      .filter((p) => p.volumeRank <= volumeFloorRank && p.gapScore > 0)
      .sort((a, b) => b.gapScore - a.gapScore)
      .slice(0, CANDIDATES_PER_POSITION);
  }

  return byPosition;
}
