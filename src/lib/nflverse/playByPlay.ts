import { fetchNflverseCsv } from "./client";
import { getFtnChartingByPlay } from "./ftnCharting";
import { getGsisIdToDisplayName } from "./players";
import type { RedZoneTouchRow } from "./types";

const REVALIDATE_SECONDS = 24 * 60 * 60;
const RED_ZONE_YARDLINE = 20;
const GOAL_LINE_YARDLINE = 5;

// pbp has 300+ columns; this is every one actually read below. Passed to
// fetchNflverseCsv so the rest are never retained in the 24h cache — see
// client.ts's parseCsv for why that mattered for reliability.
const PBP_COLUMNS = [
  "season_type",
  "season",
  "week",
  "yardline_100",
  "rush_attempt",
  "rusher_player_id",
  "pass_attempt",
  "receiver_player_id",
  "passer_player_id",
  "qb_dropback",
  "epa",
  "success",
  "game_id",
  "play_id",
] as const;

interface RawAccumulator {
  season: number;
  week: number;
  playerDisplayName: string;
  redZoneRushAttempts: number;
  redZoneTargets: number;
  goalLineRushAttempts: number;
  goalLineTargets: number;
  rushEpaSum: number;
  rushPlayCount: number;
  rushSuccessCount: number;
  dropbackEpaSum: number;
  dropbackCount: number;
  dropbackSuccessCount: number;
  targetEpaSum: number;
  targetCount: number;
  targetSuccessCount: number;
  chartedTargetCount: number;
  dropCount: number;
  createdReceptionCount: number;
}

function rate(sum: number, count: number): number | null {
  return count > 0 ? sum / count : null;
}

/**
 * Red-zone touches (rush attempts + targets inside the opponent's
 * 20-yard line) per player per game, aggregated from nflverse's full
 * play-by-play (`pbp` release) — there's no pre-aggregated red-zone file
 * in nflverse, unlike snap share/target share/NextGen Stats, so this is
 * the one signal in the family that needs real play-level aggregation
 * (deliberately held for later — see "Backtesting & Tuning History").
 * Play-by-play identifies players by `gsis_id`; resolved to a display
 * name via the `players` crosswalk release before returning, so the
 * caller can join it the same way as every other nflverse source (by
 * normalized name — see playerMatch.ts).
 *
 * Also tracks a tighter goal-line cutoff (yardline_100<=5), EPA-per-play,
 * success rate, and FTN Charting's drop/created-reception rate (all
 * role-scoped: rush attempts for RB, dropbacks — passes+sacks+scrambles
 * — for QB, targets for WR/TE) in the same pass, since they're all read
 * from the same already-fetched, already-paid-for pbp rows — see
 * CLAUDE.md's unused-data-audit follow-up and item 30's goal-line
 * addition for the precedent. EPA/success/drop/created-reception are
 * converted to a per-week rate here (not left as raw counts, unlike
 * red/goal zone), matching every other per-week rate field in
 * NflverseWeekStat. FTN Charting has no player ID of its own — it's
 * joined here by (game_id, play_id) onto this same pbp row, using pbp's
 * own receiver_player_id to attribute a charted target to a player (see
 * ftnCharting.ts).
 */
export async function getRedZoneTouches(season: number): Promise<RedZoneTouchRow[]> {
  const [rows, gsisIdToName, ftnByPlay] = await Promise.all([
    fetchNflverseCsv("pbp", `play_by_play_${season}.csv.gz`, REVALIDATE_SECONDS, PBP_COLUMNS),
    getGsisIdToDisplayName(),
    getFtnChartingByPlay(season),
  ]);

  const totals = new Map<string, RawAccumulator>();

  function getOrCreate(gsisId: string, week: number): RawAccumulator | null {
    const name = gsisIdToName.get(gsisId);
    if (!name) return null;
    const key = `${gsisId}/${week}`;
    let existing = totals.get(key);
    if (!existing) {
      existing = {
        season,
        week,
        playerDisplayName: name,
        redZoneRushAttempts: 0,
        redZoneTargets: 0,
        goalLineRushAttempts: 0,
        goalLineTargets: 0,
        rushEpaSum: 0,
        rushPlayCount: 0,
        rushSuccessCount: 0,
        dropbackEpaSum: 0,
        dropbackCount: 0,
        dropbackSuccessCount: 0,
        targetEpaSum: 0,
        targetCount: 0,
        targetSuccessCount: 0,
        chartedTargetCount: 0,
        dropCount: 0,
        createdReceptionCount: 0,
      };
      totals.set(key, existing);
    }
    return existing;
  }

  for (const row of rows) {
    if (row.season_type !== "REG" || Number(row.season) !== season) continue;
    const week = Number(row.week);
    const epa = Number(row.epa);
    const hasEpa = Number.isFinite(epa);
    const isSuccess = row.success === "1";

    if (row.rush_attempt === "1" && row.rusher_player_id) {
      const stat = getOrCreate(row.rusher_player_id, week);
      if (stat) {
        stat.rushPlayCount += 1;
        if (hasEpa) stat.rushEpaSum += epa;
        if (isSuccess) stat.rushSuccessCount += 1;

        const yardline = Number(row.yardline_100);
        if (Number.isFinite(yardline) && yardline <= RED_ZONE_YARDLINE) {
          stat.redZoneRushAttempts += 1;
          if (yardline <= GOAL_LINE_YARDLINE) stat.goalLineRushAttempts += 1;
        }
      }
    }

    if (row.qb_dropback === "1" && row.passer_player_id) {
      const stat = getOrCreate(row.passer_player_id, week);
      if (stat) {
        stat.dropbackCount += 1;
        if (hasEpa) stat.dropbackEpaSum += epa;
        if (isSuccess) stat.dropbackSuccessCount += 1;
      }
    }

    if (row.pass_attempt === "1" && row.receiver_player_id) {
      const stat = getOrCreate(row.receiver_player_id, week);
      if (stat) {
        stat.targetCount += 1;
        if (hasEpa) stat.targetEpaSum += epa;
        if (isSuccess) stat.targetSuccessCount += 1;

        const yardline = Number(row.yardline_100);
        if (Number.isFinite(yardline) && yardline <= RED_ZONE_YARDLINE) {
          stat.redZoneTargets += 1;
          if (yardline <= GOAL_LINE_YARDLINE) stat.goalLineTargets += 1;
        }

        const charted = ftnByPlay.get(`${row.game_id}/${row.play_id}`);
        if (charted) {
          stat.chartedTargetCount += 1;
          if (charted.isDrop) stat.dropCount += 1;
          if (charted.isCreatedReception) stat.createdReceptionCount += 1;
        }
      }
    }
  }

  return Array.from(totals.values()).map((acc) => ({
    season: acc.season,
    week: acc.week,
    playerDisplayName: acc.playerDisplayName,
    redZoneRushAttempts: acc.redZoneRushAttempts,
    redZoneTargets: acc.redZoneTargets,
    goalLineRushAttempts: acc.goalLineRushAttempts,
    goalLineTargets: acc.goalLineTargets,
    rushEpaPerPlay: rate(acc.rushEpaSum, acc.rushPlayCount),
    rushSuccessRate: rate(acc.rushSuccessCount, acc.rushPlayCount),
    qbEpaPerDropback: rate(acc.dropbackEpaSum, acc.dropbackCount),
    qbSuccessRate: rate(acc.dropbackSuccessCount, acc.dropbackCount),
    recEpaPerTarget: rate(acc.targetEpaSum, acc.targetCount),
    recSuccessRate: rate(acc.targetSuccessCount, acc.targetCount),
    dropRate: rate(acc.dropCount, acc.chartedTargetCount),
    createdReceptionRate: rate(acc.createdReceptionCount, acc.chartedTargetCount),
  }));
}
