import type { Player, PlayerGameStat, PlayerSeasonStat } from "@/lib/sportsdata/types";
import type { MatchupContext } from "@/lib/sportsdata/positionDefense";
import type { GameWeather } from "@/lib/nflverse/schedules";

/** A player's next scheduled opponent — SportsDataIO team code, for display consistency with everything else in this app. */
export interface NextOpponent {
  team: string;
  week: number;
}

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
  /** QB-only: EPA on the QB's own rush attempts, distinct from epaPerPlay's QB mapping (qbEpaPerDropback, a passing-EPA signal already tested and rejected — see item 31). See CLAUDE.md's QB-rushing-EPA follow-up to item 40. */
  qbRushEpaPerPlay: number | null;
  /** WR-only share of team air yards (nflverse) — downfield-role signal, a different axis than target count. See CLAUDE.md item 148. */
  airYardsShare: number | null;
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
  qbRushEpaPerPlay: null,
  airYardsShare: null,
};

export interface PlayerComparisonInput {
  requestedPlayerId: number;
  player: Player | null;
  playerLabel: string | null;
  seasonStat: PlayerSeasonStat | null;
  recentGames: PlayerGameStat[];
  /**
   * Prior-season per-game average (nflverse, name-joined — see
   * priorSeasonAverage.ts), used ONLY as a last-resort blendedScore
   * fallback when a player has zero games in BOTH recentGames and
   * seasonStat this season (week 1 most commonly, but also a rookie
   * call-up or a player returning from a long absence at any point
   * in-season). Never blended against real current-season data — see
   * engine.ts's scorePlayer for why that's a deliberate scope limit, not
   * an oversight.
   */
  priorSeasonPprAvg: number | null;
  /**
   * FantasyPros' weekly consensus rank-to-points estimate for this
   * player/week, when available — see fantasypros/weeklyConsensus.ts.
   * Populated in backtest mode from a pinned historical git commit (the
   * nflverse-only pipeline; see loadRunNflverseOnly.ts) and in live mode
   * from the file's current branch HEAD (buildInput.ts, via
   * getCurrentExpertConsensusByNormalizedName — no week dimension needed
   * there, just "what does the consensus say right now"). A standalone
   * baseline built on the same signal (`pickByExpertConsensus`,
   * baselines.ts) validated exceptionally strong (57-60% pooled pick
   * accuracy across all four skill positions) before this field was
   * added — see item 69/70.
   */
  expertConsensusR2pPts: number | null;
  byeWeek: number | null;
  isOnByeThisWeek: boolean;
  matchupContext: MatchupContext | null;
  /** Forward-looking, live-mode-only (see buildInput.ts) — the schedule/weather counterpart to matchupContext's backward-looking last opponent. Always null in backtest mode. */
  nextOpponent: NextOpponent | null;
  /** Weather for the nextOpponent game, when known — nflverse's schedule only carries actual recorded conditions (not a pregame forecast), so wind/temp are frequently null for games that haven't happened yet; roof type (e.g. a dome) is known in advance regardless, since it's a fixed stadium property. */
  nextGameWeather: GameWeather | null;
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
  /** Real min/max PPR points actually scored across recentGames — not a statistical projection interval, just the honest range of what this player has actually produced lately. Null whenever recentPprAvg is (no recent games). */
  recentPprFloor: number | null;
  recentPprCeiling: number | null;
  seasonPprAvg: number | null;
  /** Total fantasy points this player has scored this season (in the selected scoring format) — a real, backward-looking cumulative number, not a projection. Full season total in the offseason; running total in-season. Null when no season stat is available. */
  seasonTotalPoints: number | null;
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
  airYardsShareAvg: number | null;
  airYardsModifier: number;
  qbRushEpaAvg: number | null;
  qbRushEpaModifier: number;
  teammateOutBumpModifier: number;
  expertConsensusR2pPts: number | null;
  expertConsensusModifier: number;
  targetShare: number | null;
  separation: number | null;
  finalScore: number | null;
  injuryStatus: string | null;
  isOnByeThisWeek: boolean;
  matchupContext: MatchupContext | null;
  nextOpponent: NextOpponent | null;
  nextGameWeather: GameWeather | null;
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
  /** Calibrated confidence (real historical pick accuracy %) for the gap between the pick and the field — see GAP_CONFIDENCE_CURVE. Null when there's no pick to score (no players found). */
  confidence: number | null;
  headline: string;
  reasoning: string[];
}
