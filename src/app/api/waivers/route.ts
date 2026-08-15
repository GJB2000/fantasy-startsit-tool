import { getLiveExpertConsensusByNormalizedName } from "@/lib/fantasypros/liveConsensus";
import { getPriorSeasonPprAveragesByNormalizedName } from "@/lib/nflverse/priorSeasonAverage";
import { getLiveNflversePlayerWeekTable } from "@/lib/recommendation/nflverseLive";
import { type RemainingGame } from "@/lib/nflverse/schedules";
import {
  getGameWeatherCached,
  getImpliedTotalsCached,
  getPositionDefenseTableCached,
  getRemainingOpponentsCached,
  COLD_FETCH_TIMEOUT_MS,
} from "@/lib/cache/liveAggregates";
import { getSeasonContext } from "@/lib/sportsdata/timeframes";
import { parseScoringFormat, SKILL_POSITIONS } from "@/lib/sportsdata/types";
import { buildWaiverCandidateDetails, type WaiverCandidate } from "@/lib/waivers/buildWaiverReport";
import { rankWaiverCandidates, type WaiverRankStrategy } from "@/lib/waivers/rankCandidates";
import { rankExtendedWaiverCandidates } from "@/lib/waivers/rankExtendedCandidates";
import { suggestDrops } from "@/lib/waivers/suggestDrop";

// Same margin as /api/compare and /api/trade — a cold nflverse cache
// means aggregating the full play-by-play release (~5-7s) on top of a
// full-player-pool scan (rankWaiverCandidates) rather than just a
// handful of requested players.
export const maxDuration = 30;

function parseIds(param: string | null): number[] {
  return (param ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = parseScoringFormat(url.searchParams.get("scoringFormat"));
  const rosteredIds = parseIds(url.searchParams.get("rostered"));
  // Players rostered by OTHER teams in a connected Sleeper league (see
  // lib/sleeper/resolveRoster.ts's leagueRosteredPlayerIds) — excluded
  // from the candidate pool same as the user's own roster, since a real
  // waiver-wire pickup has to be unowned league-wide, not just off the
  // user's own team. Kept separate from `rosteredIds` because only the
  // user's OWN roster is a valid drop-candidate pool.
  const leagueRosteredIds = parseIds(url.searchParams.get("leagueRostered"));
  // Default `volume` — rank available players by recent opportunity, the
  // backtest-winning strategy (lib/backtest/waiverBacktest.ts); "buy-low"
  // is now a tag, not the sort. `gap`/`residual` stay selectable for
  // comparison. Only affects skill positions — D/ST and K stream on their
  // own matchup logic. See rankCandidates.ts.
  const rankByParam = url.searchParams.get("rankBy");
  const rankBy: WaiverRankStrategy = rankByParam === "gap" || rankByParam === "residual" ? rankByParam : "volume";
  // Whether to surface D/ST and K targets. A connected Sleeper league that
  // doesn't roster those slots passes false, so we neither scan nor
  // recommend them. Default true (manual rosters / unknown-slot connections
  // keep both) — only an explicit "false" excludes.
  const includeDst = url.searchParams.get("includeDst") !== "false";
  const includeK = url.searchParams.get("includeK") !== "false";

  try {
    const context = await getSeasonContext();

    const [
      positionDefenseTable,
      nflversePlayerWeekTable,
      firstAttempt,
      expertConsensusByNormalizedName,
      priorSeasonPprAvgByNormalizedName,
    ] = await Promise.all([
      getPositionDefenseTableCached(context.lastCompletedApiSeason, context.lastCompletedWeek, format),
      getLiveNflversePlayerWeekTable(context.lastCompletedSeason, { redZoneTimeoutMs: COLD_FETCH_TIMEOUT_MS }),
      getRemainingOpponentsCached(context.lastCompletedSeason, context.lastCompletedWeek + 1).catch(
        () => new Map<string, RemainingGame[]>()
      ),
      getLiveExpertConsensusByNormalizedName(context).catch(() => new Map()),
      // Prior-season per-game average — fallback for a rostered player with
      // zero games this season (e.g. back from a long absence), used when
      // scoring drop candidates below (see buildInput.ts / scorePlayer).
      getPriorSeasonPprAveragesByNormalizedName(context.lastCompletedSeason - 1, format).catch(
        () => new Map<string, number>()
      ),
    ]);

    // Same season-rollforward fallback as /api/trade: try the current
    // season's remaining schedule first, roll forward to next season's
    // full slate if it has none left.
    let scheduleSeason = context.lastCompletedSeason;
    let remainingOpponentsByTeam = firstAttempt;
    if (remainingOpponentsByTeam.size === 0) {
      scheduleSeason = context.lastCompletedSeason + 1;
      remainingOpponentsByTeam = await getRemainingOpponentsCached(scheduleSeason, 1).catch(
        () => new Map<string, RemainingGame[]>()
      );
    }

    const excludeIds = new Set([...rosteredIds, ...leagueRosteredIds]);

    const [teamWeatherByTeamWeek, impliedTotalsByTeamWeek] = await Promise.all([
      getGameWeatherCached(scheduleSeason).catch(() => new Map()),
      getImpliedTotalsCached(scheduleSeason).catch(() => new Map()),
    ]);

    const [ranksByPosition, extendedCandidates] = await Promise.all([
      rankWaiverCandidates(context, format, excludeIds, rankBy),
      rankExtendedWaiverCandidates(
        context,
        format,
        excludeIds,
        remainingOpponentsByTeam,
        teamWeatherByTeamWeek,
        impliedTotalsByTeamWeek,
        { includeDst, includeK }
      ),
    ]);

    const skillDetailsByPosition = await Promise.all(
      SKILL_POSITIONS.map(async (position) => {
        const details = await buildWaiverCandidateDetails(
          ranksByPosition[position],
          context,
          format,
          positionDefenseTable,
          nflversePlayerWeekTable,
          expertConsensusByNormalizedName
        );
        return [position, details] as const;
      })
    );

    const detailsByPosition = [
      ...skillDetailsByPosition,
      ...(includeDst ? [["DST", extendedCandidates.DST] as const] : []),
      ...(includeK ? [["K", extendedCandidates.K] as const] : []),
    ];

    const allCandidates: WaiverCandidate[] = detailsByPosition.flatMap(([, details]) => details);

    const dropSuggestions = await suggestDrops(
      allCandidates,
      rosteredIds,
      context,
      format,
      positionDefenseTable,
      nflversePlayerWeekTable,
      remainingOpponentsByTeam,
      teamWeatherByTeamWeek,
      impliedTotalsByTeamWeek,
      expertConsensusByNormalizedName,
      priorSeasonPprAvgByNormalizedName
    );

    const candidatesByPosition = Object.fromEntries(
      detailsByPosition.map(([position, details]) => [
        position,
        details.map((candidate) => ({
          ...candidate,
          dropSuggestion: dropSuggestions.get(candidate.playerId)?.evaluation ?? null,
        })),
      ])
    );

    return Response.json({
      candidatesByPosition,
      context: {
        lastCompletedSeason: context.lastCompletedSeason,
        lastCompletedWeek: context.lastCompletedWeek,
        rankBy,
        contextNote:
          scheduleSeason === context.lastCompletedSeason
            ? `Ranked on current form through Week ${context.lastCompletedWeek} of the ${context.lastCompletedSeason} season — recent volume relative to recent points, at the same position.`
            : `The ${scheduleSeason} season hasn't started yet — ranked on current form from the completed ${context.lastCompletedSeason} season.`,
      },
    });
  } catch (err) {
    console.error("Failed to build waiver report:", err);
    return Response.json(
      { error: "Something went wrong pulling waiver data. Try again shortly." },
      { status: 502 }
    );
  }
}
