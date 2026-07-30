export type SkillPosition = "QB" | "RB" | "WR" | "TE";

export const SKILL_POSITIONS: readonly SkillPosition[] = ["QB", "RB", "WR", "TE"];

export function isSkillPosition(position: string): position is SkillPosition {
  return (SKILL_POSITIONS as readonly string[]).includes(position);
}

/**
 * D/ST and K, deliberately kept as a SEPARATE type from SkillPosition
 * rather than folded into it — the whole skill-position engine
 * (volume.ts, aggregate.ts, snap share/target share/etc.) is built
 * around fields (targets, touches, pass attempts) that have no meaning
 * for a team defense or a kicker. D/ST and K get their own, much
 * simpler scorer (recommendation/scoreDefense.ts / scoreKicker.ts) —
 * see CLAUDE.md's D/ST & K item for the backtest behind that split and
 * why the two positions aren't treated symmetrically.
 */
export type ExtendedPosition = SkillPosition | "DST" | "K";

export const EXTENDED_POSITIONS: readonly ExtendedPosition[] = [...SKILL_POSITIONS, "DST", "K"];

export function isExtendedPosition(position: string): position is ExtendedPosition {
  return (EXTENDED_POSITIONS as readonly string[]).includes(position);
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
    // .trim() handles D/ST's synthetic entries, which have an empty
    // FirstName (a team defense isn't a person) — a no-op for every
    // real player, which always has a non-empty FirstName.
    name: `${player.FirstName} ${player.LastName}`.trim(),
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
  Receptions: number;
  PassingAttempts: number;
  PassingYards: number;
  RushingAttempts: number;
  RushingYards: number;
  ReceivingTargets: number;
  ReceivingYards: number;
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
  Receptions: number;
  PassingYards: number;
  RushingYards: number;
  ReceivingYards: number;
}

/**
 * League scoring convention for receptions — the one dimension real
 * leagues actually vary on here. SportsDataIO's `FantasyPoints` (0/catch)
 * and `FantasyPointsPPR` (1/catch) already bracket the range and are
 * otherwise identical (confirmed live: FantasyPointsPPR - FantasyPoints
 * equals Receptions exactly, at both the game and season level), so
 * half-PPR is just their midpoint — no new data source needed.
 */
export type ScoringFormat = "ppr" | "half_ppr" | "standard";

export function getFantasyPoints(
  row: { FantasyPoints: number; FantasyPointsPPR: number; Receptions: number },
  format: ScoringFormat
): number {
  switch (format) {
    case "ppr":
      return row.FantasyPointsPPR;
    case "half_ppr":
      return row.FantasyPointsPPR - 0.5 * row.Receptions;
    case "standard":
      return row.FantasyPoints;
  }
}

const SCORING_FORMATS: readonly ScoringFormat[] = ["ppr", "half_ppr", "standard"];

/** Parses a `scoringFormat` query param, defaulting to "ppr" (today's implicit behavior) for anything missing or unrecognized. */
export function parseScoringFormat(raw: string | null): ScoringFormat {
  return (SCORING_FORMATS as readonly string[]).includes(raw ?? "") ? (raw as ScoringFormat) : "ppr";
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

export interface TeamGameStat {
  Season: number;
  Week: number;
  Team: string;
  Opponent: string;
  OffensivePlays: number;
  PassingAttempts: number;
  RushingAttempts: number;
}
