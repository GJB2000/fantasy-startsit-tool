import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { toSdioTeam } from "@/lib/recommendation/restOfSeason";
import type { ExtendedPosition } from "@/lib/sportsdata/types";
import { fetchSeasonRedraftRankings } from "./client";

const POSITION_TO_PAGE_TYPE: Record<ExtendedPosition, string> = {
  QB: "redraft-qb",
  RB: "redraft-rb",
  WR: "redraft-wr",
  TE: "redraft-te",
  DST: "redraft-dst",
  K: "redraft-k",
};

// This source's own team-code quirk, distinct from (and in addition to)
// the already-documented nflverse LAR/LA mismatch elsewhere in this app
// (see restOfSeason.ts's toSdioTeam) — confirmed live by diffing this
// file's full 32-team redraft-dst list against SportsDataIO's own 32:
// every code matches except Jacksonville, which this source calls "JAC"
// where SportsDataIO (and nflverse) use "JAX". toSdioTeam alone doesn't
// know about this, since it's a translation table built for nflverse's
// conventions specifically, not this source's.
const FANTASYPROS_TEAM_FIXUPS: Record<string, string> = { JAC: "JAX" };

function toSdioTeamFromFantasyPros(fpTeam: string): string {
  return toSdioTeam(FANTASYPROS_TEAM_FIXUPS[fpTeam] ?? fpTeam);
}

export interface SeasonRedraftEntry {
  /** 1 = FantasyPros' consensus #1 player at the position for the upcoming season. */
  positionRank: number;
  /** The raw (often fractional) consensus expert-rank average this was computed from — kept for transparency, not displayed as the primary number (a whole-number positionRank reads far more clearly, e.g. "FantasyPros QB2"). */
  ecr: number;
}

/**
 * FantasyPros' CURRENT consensus REDRAFT (season-long, not weekly)
 * rankings for one position — a genuinely different signal from
 * weeklyConsensus.ts's `getCurrentExpertConsensusByNormalizedName`
 * (that one is "who's good THIS WEEK," reconstructed from the same repo's
 * separate daily weekly-rankings file). This one answers "who's expected
 * to be good over the WHOLE season" — the season-long redraft cheat-sheet
 * consensus, exactly the kind of stable signal Legit Rankings needs to
 * blend against the live engine's own single-week snapshot (see
 * rankings/buildRankings.ts for why: a player with a thin recent-game
 * sample can otherwise swing wildly on the engine's signal alone).
 *
 * Returns `normalizedName -> {positionRank, ecr}` for skill positions and
 * K (joined by player name, same normalizePlayerName join every other
 * external source in this app uses) or `sdioTeamCode -> {...}` for D/ST
 * (this file's own `team` column matches SportsDataIO's team-code
 * convention for 31 of 32 teams directly — the one exception, Jacksonville,
 * is fixed up explicitly, see FANTASYPROS_TEAM_FIXUPS above).
 *
 * Degrades to an empty map on any fetch failure or if the position has no
 * matching rows — same fail-open discipline as every other optional
 * external signal here, never a hard error for the whole rankings build.
 */
export async function getSeasonRedraftRankByKey(position: ExtendedPosition): Promise<Map<string, SeasonRedraftEntry>> {
  const result = new Map<string, SeasonRedraftEntry>();

  let rows: Record<string, string>[];
  try {
    rows = await fetchSeasonRedraftRankings();
  } catch {
    return result;
  }

  const pageType = POSITION_TO_PAGE_TYPE[position];
  const atPosition: { team: string; player: string; ecrNum: number }[] = rows
    .filter((row) => row.page_type === pageType)
    .map((row) => ({ team: row.team, player: row.player, ecrNum: Number(row.ecr) }))
    .filter((row) => Number.isFinite(row.ecrNum));
  atPosition.sort((a, b) => a.ecrNum - b.ecrNum);

  atPosition.forEach((row, i) => {
    const key = position === "DST" ? toSdioTeamFromFantasyPros(row.team) : normalizePlayerName(row.player);
    if (!key) return;
    // A handful of duplicate rows have shown up historically for other
    // dynastyprocess/data files this app reads (e.g. a name resolving
    // to two IDs) — keep the first (best-ranked) occurrence rather than
    // letting a later, worse-ranked duplicate silently overwrite it.
    if (!result.has(key)) result.set(key, { positionRank: i + 1, ecr: row.ecrNum });
  });

  return result;
}
