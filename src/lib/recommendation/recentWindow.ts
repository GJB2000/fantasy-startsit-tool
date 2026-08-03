import type { SeasonContext } from "@/lib/sportsdata/timeframes";
import { RECENT_WEEK_COUNT } from "./config";

export interface RecentWindow {
  /** The weeks to fetch recent-form data over. */
  weeks: number[];
  /**
   * When set, take only each player's last N games actually PLAYED from
   * those weeks (see `takeRecentPlayed`); null means "use every played
   * game in `weeks`" (the plain calendar window).
   */
  limit: number | null;
}

/**
 * The recent-form window, one source of truth for every recent-week scan
 * (live scoring, Legit Rankings eligibility, Waiver Wire candidate
 * ranking). In-season it's the last few CALENDAR weeks — the behavior the
 * backtest validates, where a recently-injured player is often still
 * limited the next week, so those games genuinely predict it. In the
 * OFFSEASON we're projecting a future season's Week 1 off last season's
 * tail, where a recent injury is long healed and its half-games are stale
 * noise — so widen the lookback and keep only the last RECENT_WEEK_COUNT
 * games actually PLAYED, backfilling past the absence with real
 * pre-injury games (e.g. Lamar Jackson: out/limited weeks 15-18, whose
 * calendar window was three half-games at ~13 pass attempts, tanking the
 * 0.9-weight volume signal). Gated on isInSeason so it only changes the
 * offseason regime the backtest can't represent. See "Backtesting &
 * Tuning History" items 101/(item 27 open-item follow-up).
 */
export function getRecentWindow(context: SeasonContext): RecentWindow {
  if (context.isInSeason) {
    return { weeks: context.recentWeeks, limit: null };
  }
  const start = Math.max(1, context.lastCompletedWeek - RECENT_WEEK_COUNT * 2 + 1);
  const weeks = Array.from({ length: context.lastCompletedWeek - start + 1 }, (_, i) => start + i);
  return { weeks, limit: RECENT_WEEK_COUNT };
}

/**
 * Trim a player's chronologically-ascending list of PLAYED games to the
 * window's limit (the last N), or return it unchanged when there's no
 * limit (in-season). Callers that fetch bulk rows per week and group them
 * per player use this after grouping.
 */
export function takeRecentPlayed<T>(playedGamesAsc: T[], limit: number | null): T[] {
  return limit != null ? playedGamesAsc.slice(-limit) : playedGamesAsc;
}
