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
  /** Tighter yardline_100<=5 cutoff, QB-rushing candidate signal — see CLAUDE.md item 30 follow-up. */
  goalLineTouches: number | null;
  /** Role-scoped (dropback for QB, rush for RB, target for WR/TE) — see CLAUDE.md item 31. */
  successRate: number | null;
  /** Same role-scoping, EPA-per-play instead of the binary success flag — see CLAUDE.md item 31. */
  epaPerPlay: number | null;
  /** FTN Charting, target-scoped (WR/TE) — see CLAUDE.md item 32. */
  dropRate: number | null;
}

export const EMPTY_NFLVERSE_SIGNALS: NflverseSignals = {
  snapShare: null,
  targetShare: null,
  separation: null,
  redZoneTouches: null,
  goalLineTouches: null,
  successRate: null,
  epaPerPlay: null,
  dropRate: null,
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
  /**
   * Whether a same-position teammate is currently listed Out/Doubtful
   * ("handcuff" bump) — a current-week, pregame-knowable fact computed
   * from a different source per mode: nflverse's injury report joined
   * against a historical team+position roster in backtest mode
   * (weekSlice.hasLimitedTeammate), SportsDataIO's live Player.InjuryStatus
   * in live mode — same live-vs-backtest split as the engine's existing
   * injury flagging. See CLAUDE.md's unused-data-audit follow-up.
   */
  hasLimitedTeammate: boolean;
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
  goalLineTouchesAvg: number | null;
  qbGoalLineModifier: number;
  successRateAvg: number | null;
  qbSuccessRateModifier: number;
  epaPerPlayAvg: number | null;
  rbEpaModifier: number;
  dropRateAvg: number | null;
  dropRateModifier: number;
  teammateOutBumpModifier: number;
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
