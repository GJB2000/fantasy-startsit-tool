import { buildDstComparisonInput, scoreDst } from "@/lib/recommendation/scoreDefense";
import { buildKickerComparisonInput, scoreKicker } from "@/lib/recommendation/scoreKicker";
import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { GameWeather, RemainingGame } from "@/lib/nflverse/schedules";
import { getFantasyDefenseByWeek } from "@/lib/sportsdata/defense";
import { getAllDstPlayers } from "@/lib/sportsdata/defenseTeams";
import { getActiveExtendedPlayers } from "@/lib/sportsdata/players";
import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import { getPlayerGameStatsByWeek } from "@/lib/sportsdata/weeklyStats";
import type { WaiverCandidate } from "./buildWaiverReport";

const CANDIDATES_PER_POSITION = 10;

/**
 * D/ST and K's waiver mechanism, deliberately different from
 * rankCandidates.ts's skill-position "opportunity outpacing production"
 * gap — that framing has no analog for a team defense or kicker (there's
 * no "volume" concept). Instead this is real streaming logic: rank by
 * this week's matchup-adjusted score (finalScore, already reflecting
 * the validated implied-total signal) against the player's own
 * season-to-date rank, surfacing whoever's current matchup meaningfully
 * outperforms their season-long profile — same "gap" narrative shape as
 * skill positions, just built from a position-appropriate pair of
 * signals instead of reusing volume/points.
 */
export async function rankExtendedWaiverCandidates(
  context: SeasonContext,
  format: ScoringFormat,
  excludePlayerIds: Set<number>,
  remainingOpponentsByTeam: Map<string, RemainingGame[]>,
  teamWeatherByTeamWeek: Map<string, GameWeather>,
  impliedTotalsByTeamWeek: Map<string, number>,
  // Which streaming positions to scan — a connected Sleeper league that
  // doesn't roster a D/ST or K slot passes false so those targets are
  // never surfaced (see /api/waivers). Both default true (manual rosters
  // and connections without known slots keep both). Skipping a position
  // also skips its scan entirely — the D/ST scan (32 teams) is the
  // expensive one, so this is a real perf win, not just a display filter.
  opts?: { includeDst?: boolean; includeK?: boolean }
): Promise<{ DST: WaiverCandidate[]; K: WaiverCandidate[] }> {
  const includeDst = opts?.includeDst ?? true;
  const includeK = opts?.includeK ?? true;
  if (!includeDst && !includeK) return { DST: [], K: [] };

  const allExtended = await getActiveExtendedPlayers();
  const kPlayerIds = includeK ? allExtended.filter((p) => p.Position === "K").map((p) => p.PlayerID) : [];
  const dstPlayers = includeDst ? await getAllDstPlayers() : [];
  const dstPlayerIds = dstPlayers.map((p) => p.PlayerID);

  // Pre-warm the per-week caches ONCE before scanning every team/kicker.
  // Without this, buildDstComparisonInput/buildKickerComparisonInput
  // each independently re-fetch the same weeks per entity — 32 teams x
  // up to 18 weeks is hundreds of concurrent, mostly-identical requests
  // fired before any of them could populate sportsDataFetch's cache. Hit
  // live as a real "fetch failed" network error under that load, not a
  // hypothetical — sequenced (not Promise.all'd together) for the same
  // peak-connection-pressure reason item 27 already staged nflverse's
  // fetches for the backtest pipeline. Only warm what's actually scanned.
  const allWeeks = Array.from({ length: context.lastCompletedWeek }, (_, i) => i + 1);
  if (includeDst) await Promise.all(allWeeks.map((w) => getFantasyDefenseByWeek(context.lastCompletedApiSeason, w)));
  if (includeK) await Promise.all(allWeeks.map((w) => getPlayerGameStatsByWeek(context.lastCompletedApiSeason, w)));

  async function rankOne(
    ids: number[],
    position: "DST" | "K",
    build: (id: number) => Promise<PlayerScoreBreakdown | null>
  ): Promise<WaiverCandidate[]> {
    const eligibleIds = ids.filter((id) => !excludePlayerIds.has(id));
    const breakdowns = (await Promise.all(eligibleIds.map(build))).filter(
      (b): b is PlayerScoreBreakdown => b != null && b.playerId != null && b.finalScore != null
    );

    const byWeekRank = [...breakdowns].sort((a, b) => b.finalScore! - a.finalScore!);
    const bySeasonRank = [...breakdowns].sort((a, b) => (b.seasonPprAvg ?? -Infinity) - (a.seasonPprAvg ?? -Infinity));
    const weekRankById = new Map(byWeekRank.map((b, i) => [b.playerId!, i + 1]));
    const seasonRankById = new Map(bySeasonRank.map((b, i) => [b.playerId!, i + 1]));

    return byWeekRank
      .filter((b) => (weekRankById.get(b.playerId!) ?? Infinity) < (seasonRankById.get(b.playerId!) ?? Infinity))
      .slice(0, CANDIDATES_PER_POSITION)
      .map((b) => {
        const weekRank = weekRankById.get(b.playerId!)!;
        const seasonRank = seasonRankById.get(b.playerId!)!;
        return {
          playerId: b.playerId!,
          displayName: b.displayName,
          position,
          team: b.team,
          recentVolumeAvg: 0,
          recentPprAvg: b.recentPprAvg ?? 0,
          gamesUsedForRecent: b.gamesUsedForRecent,
          volumeRank: weekRank,
          pointsRank: seasonRank,
          positionLabel: `${position}${weekRank}`,
          productionLabel: `${position}${seasonRank}`,
          reasoning: [
            `${position}${weekRank} by this week's matchup, well ahead of their ${position}${seasonRank} season-long rank — a real streaming spot.`,
            ...b.notes,
          ],
          injuryStatus: b.injuryStatus,
          hasLimitedTeammate: false,
          breakdown: b,
        } satisfies WaiverCandidate;
      });
  }

  const [DST, K] = await Promise.all([
    includeDst
      ? rankOne(dstPlayerIds, "DST", async (id) => {
          const input = await buildDstComparisonInput(
            id,
            context,
            remainingOpponentsByTeam,
            impliedTotalsByTeamWeek,
            teamWeatherByTeamWeek
          );
          return input ? scoreDst(input) : null;
        })
      : Promise.resolve([] as WaiverCandidate[]),
    includeK
      ? rankOne(kPlayerIds, "K", async (id) => {
          const input = await buildKickerComparisonInput(
            id,
            context,
            remainingOpponentsByTeam,
            teamWeatherByTeamWeek,
            impliedTotalsByTeamWeek
          );
          return input ? scoreKicker(input, format) : null;
        })
      : Promise.resolve([] as WaiverCandidate[]),
  ]);

  return { DST, K };
}
