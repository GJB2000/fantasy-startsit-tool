import type { Player, PlayerGameStat, PlayerSeasonStat } from "@/lib/sportsdata/types";
import type { MatchupContext } from "@/lib/sportsdata/positionDefense";

export type DataQuality = "full" | "limited" | "insufficient";

export interface PlayerComparisonInput {
  requestedPlayerId: number;
  player: Player | null;
  playerLabel: string | null;
  seasonStat: PlayerSeasonStat | null;
  recentGames: PlayerGameStat[];
  byeWeek: number | null;
  isOnByeThisWeek: boolean;
  matchupContext: MatchupContext | null;
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
  isCloseCall: boolean;
  headline: string;
  reasoning: string[];
}
