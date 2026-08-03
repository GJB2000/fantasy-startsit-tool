import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import type { ExtendedPosition } from "@/lib/sportsdata/types";
import { fetchCurrentSnapshot } from "./client";
import { getSeasonRedraftRankByKey } from "./seasonProjections";
import {
  getCurrentExpertConsensusByNormalizedName,
  type ExpertConsensusEntry,
} from "./weeklyConsensus";

// The weekly snapshot's `page` -> position, same mapping
// getCurrentExpertConsensusByNormalizedName uses (PPR pages, matching the
// PPR-denominated r2p_pts the engine's consensus term already expects).
const SKILL_PAGE_TO_POSITION: Record<string, ExtendedPosition> = {
  qb: "QB",
  "ppr-rb": "RB",
  "ppr-wr": "WR",
  "ppr-te": "TE",
};

const SKILL_POSITIONS: ExtendedPosition[] = ["QB", "RB", "WR", "TE"];

interface RankPoints {
  rank: number;
  pts: number;
}

/**
 * Points for a given position rank, linearly interpolated over the
 * weekly file's own rank -> r2p_pts curve (sorted ascending by rank),
 * clamped at both ends. The per-rank points scale (QB5 ~ 19-20, QB27 ~ 13)
 * is stable across time even when the snapshot's player->rank assignments
 * are stale, so it's a valid bridge for turning a season-redraft rank
 * (which carries no points of its own) into a points estimate.
 */
function pointsForRank(curve: RankPoints[], rank: number): number {
  if (rank <= curve[0].rank) return curve[0].pts;
  const last = curve[curve.length - 1];
  if (rank >= last.rank) return last.pts;
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].rank >= rank) {
      const a = curve[i - 1];
      const b = curve[i];
      const t = b.rank === a.rank ? 0 : (rank - a.rank) / (b.rank - a.rank);
      return a.pts + t * (b.pts - a.pts);
    }
  }
  return last.pts;
}

async function buildRankToPointsCurve(): Promise<Map<ExtendedPosition, RankPoints[]>> {
  const byPosition = new Map<ExtendedPosition, RankPoints[]>();
  let rows: Record<string, string>[];
  try {
    rows = await fetchCurrentSnapshot();
  } catch {
    return byPosition; // fail open
  }
  for (const row of rows) {
    const position = SKILL_PAGE_TO_POSITION[row.page];
    if (!position) continue;
    const rank = Number(row.rank);
    const pts = row.r2p_pts && row.r2p_pts !== "NA" ? Number(row.r2p_pts) : NaN;
    if (!Number.isFinite(rank) || !Number.isFinite(pts)) continue;
    const list = byPosition.get(position) ?? [];
    list.push({ rank, pts });
    byPosition.set(position, list);
  }
  for (const list of byPosition.values()) list.sort((a, b) => a.rank - b.rank);
  return byPosition;
}

/**
 * Offseason variant of getCurrentExpertConsensusByNormalizedName. The
 * weekly snapshot is worthless as a "who's good right now" signal in the
 * offseason — it's frozen at last season's final week, so an injured
 * star (e.g. Lamar Jackson, out at season's end -> the snapshot lists his
 * backup as Baltimore's starter) has no row at all, and the engine's
 * 0.5-weight consensus stabilizer silently doesn't fire for him. Instead
 * build the consensus from FantasyPros' CURRENT season-long REDRAFT
 * rankings (db_fpecr_latest.csv, forward-looking for the upcoming season,
 * already read for Legit Rankings — see seasonProjections.ts), converting
 * each player's redraft position rank into an r2p_pts estimate via the
 * weekly file's own rank->points curve. Degrades to an empty map on any
 * failure, same fail-open discipline as every other optional external
 * signal here.
 */
export async function getOffseasonExpertConsensusByNormalizedName(): Promise<
  Map<string, ExpertConsensusEntry>
> {
  const result = new Map<string, ExpertConsensusEntry>();

  const curveByPosition = await buildRankToPointsCurve();
  if (curveByPosition.size === 0) return result;

  const redraftByPosition = await Promise.all(
    SKILL_POSITIONS.map((position) => getSeasonRedraftRankByKey(position))
  );

  SKILL_POSITIONS.forEach((position, i) => {
    const curve = curveByPosition.get(position);
    if (!curve || curve.length === 0) return;
    for (const [normalizedName, entry] of redraftByPosition[i]) {
      result.set(normalizedName, {
        rank: entry.positionRank,
        r2pPts: pointsForRank(curve, entry.positionRank),
      });
    }
  });

  return result;
}

/**
 * The live expert-consensus map every scoring route feeds into the
 * engine's 0.5-weight consensus term — the current weekly snapshot
 * in-season (matchup/injury-aware for the upcoming week), or the
 * season-long redraft consensus in the offseason (see
 * getOffseasonExpertConsensusByNormalizedName for why the weekly snapshot
 * is unusable then). Gated on isInSeason, same regime split as the
 * offseason recent-form backfill (getRecentWindow).
 */
export async function getLiveExpertConsensusByNormalizedName(
  context: SeasonContext
): Promise<Map<string, ExpertConsensusEntry>> {
  return context.isInSeason
    ? getCurrentExpertConsensusByNormalizedName()
    : getOffseasonExpertConsensusByNormalizedName();
}
