import type { Player, PlayerGameStat, PlayerSeasonStat } from "@/lib/sportsdata/types";
import type { MatchupContext } from "@/lib/sportsdata/positionDefense";

export type DataQuality = "full" | "limited" | "insufficient";

/**
 * Recent-window nflverse signals — snap share (TE), target share +
 * separation (WR, tiebreak only), red-zone touches (RB). Backtested
 * standalone before integration; see CLAUDE.md "Backtesting & Tuning
 * History" items 14-19. All null when nflverse data isn't available
 * (e.g. a fetch failure), which the engine treats as "no signal," not
 * zero.
 */
export interface NflverseSignals {
  snapShare: number | null;
  targetShare: number | null;
  separation: number | null;
  redZoneTouches: number | null;
}

export const EMPTY_NFLVERSE_SIGNALS: NflverseSignals = {
  snapShare: null,
  targetShare: null,
  separation: null,
  redZoneTouches: null,
};

export interface PlayerComparisonInput {
  requestedPlayerId: number;
  player: Player | null;
  playerLabel: string | null;
  seasonStat: PlayerSeasonStat | null;
  recentGames: PlayerGameStat[];
  byeWeek: number | null;
  isOnByeThisWeek: boolean;
  matchupContext: MatchupContext | null;
  nflverse: NflverseSignals;
}

export interface PlayerScoreBreakdown {
  playerId: number | null;
  displayName: string;
  position: string | null;
  team: string | null;
  recentPprAvg: number | null;
  seasonPprAvg: number | null;
  gamesUsedForRecent: number;
  blendedScore: number | null;
  matchupModifier: number;
  recentVolumeAvg: number | null;
  volumeModifier: number;
  redZoneTouchesAvg: number | null;
  redZoneModifier: number;
  snapShareAvg: number | null;
  snapShareModifier: number;
  recentQbRushAttemptsAvg: number | null;
  qbRushModifier: number;
  targetShare: number | null;
  separation: number | null;
  finalScore: number | null;
  injuryStatus: string | null;
  isOnByeThisWeek: boolean;
  matchupContext: MatchupContext | null;
  dataQuality: DataQuality;
  notes: string[];
}

export interface ComparisonResult {
  players: PlayerScoreBreakdown[];
  recommendedPlayerId: number | null;
  /** A genuinely close score gap between the top two candidates — historically close to a coin flip. */
  isCloseCall: boolean;
  /** Limited/insufficient recent data for at least one top candidate — historically *more* reliable than a "confident" pick, not less; kept distinct from isCloseCall for that reason. See CLAUDE.md item 22. */
  hasLimitedData: boolean;
  headline: string;
  reasoning: string[];
}
