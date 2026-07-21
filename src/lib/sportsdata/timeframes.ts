import { REVALIDATE, sportsDataFetch, SportsDataError } from "./client";
import type { Timeframe } from "./types";

export interface SeasonContext {
  lastCompletedSeason: number;
  lastCompletedApiSeason: string;
  lastCompletedWeek: number;
  recentWeeks: number[];
  isInSeason: boolean;
}

const REGULAR_SEASON = 1;
const RECENT_WEEK_COUNT = 4;

export async function getSeasonContext(): Promise<SeasonContext> {
  const timeframes = await sportsDataFetch<Timeframe[]>("/Timeframes/all", {
    revalidate: REVALIDATE.timeframes,
  });

  const now = new Date();
  const regularSeasonFrames = timeframes.filter((t) => t.SeasonType === REGULAR_SEASON);

  const completed = regularSeasonFrames
    .filter((t) => new Date(t.EndDate) < now)
    .sort((a, b) => new Date(a.EndDate).getTime() - new Date(b.EndDate).getTime());

  const last = completed.at(-1);
  if (!last || last.ApiWeek == null) {
    throw new SportsDataError("Could not resolve the last completed NFL regular-season week");
  }

  const lastCompletedWeek = Number(last.ApiWeek);
  const start = Math.max(1, lastCompletedWeek - (RECENT_WEEK_COUNT - 1));
  const recentWeeks = Array.from(
    { length: lastCompletedWeek - start + 1 },
    (_, i) => start + i
  );

  const isInSeason = regularSeasonFrames.some(
    (t) => new Date(t.StartDate) <= now && now <= new Date(t.EndDate)
  );

  return {
    lastCompletedSeason: last.Season,
    lastCompletedApiSeason: last.ApiSeason,
    lastCompletedWeek,
    recentWeeks,
    isInSeason,
  };
}
