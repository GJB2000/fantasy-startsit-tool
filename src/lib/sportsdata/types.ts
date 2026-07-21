export type SkillPosition = "QB" | "RB" | "WR" | "TE";

export const SKILL_POSITIONS: readonly SkillPosition[] = ["QB", "RB", "WR", "TE"];

export function isSkillPosition(position: string): position is SkillPosition {
  return (SKILL_POSITIONS as readonly string[]).includes(position);
}

export interface Player {
  PlayerID: number;
  Team: string | null;
  FirstName: string;
  LastName: string;
  Position: string;
  Status: string;
  PhotoUrl: string | null;
  ByeWeek: number | null;
  InjuryStatus: string | null;
}

export interface PlayerSummary {
  playerId: number;
  name: string;
  position: string;
  team: string | null;
  injuryStatus: string | null;
  photoUrl: string | null;
}

export function toPlayerSummary(player: Player): PlayerSummary {
  return {
    playerId: player.PlayerID,
    name: `${player.FirstName} ${player.LastName}`,
    position: player.Position,
    team: player.Team,
    injuryStatus: player.InjuryStatus,
    photoUrl: player.PhotoUrl,
  };
}

export interface PlayerSeasonStat {
  PlayerID: number;
  Season: number;
  Team: string;
  Position: string;
  Played: number;
  Started: number;
  FantasyPoints: number;
  FantasyPointsPPR: number;
}

export interface PlayerGameStat {
  PlayerID: number;
  Season: number;
  Week: number;
  Team: string;
  Opponent: string;
  Position: string;
  Played: number;
  Started: number;
  FantasyPoints: number;
  FantasyPointsPPR: number;
  InjuryStatus: string | null;
  ReceivingTargets: number;
  RushingAttempts: number;
  PassingAttempts: number;
}

export interface Timeframe {
  SeasonType: number;
  Season: number;
  Week: number | null;
  Name: string;
  ApiSeason: string;
  ApiWeek: string | null;
  StartDate: string;
  EndDate: string;
}

export interface ByeWeek {
  Season: number;
  Team: string;
  Week: number;
}
