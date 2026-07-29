export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  /** The league's real starting-lineup slots, e.g. ["QB","RB","RB","WR","WR","TE","FLEX","FLEX","DEF","BN",...] — includes non-starting entries (BN/TAXI/IR) too, which callers must filter out. See lib/lineup/rosterSlots.ts for the parser. */
  roster_positions: string[];
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  /** Additional owners beyond owner_id, for leagues with co-managed teams. */
  co_owners: string[] | null;
  /** Sleeper player_ids — mostly numeric-string skill/other player IDs, but can also include team-defense codes (e.g. "CLE") for D/ST slots. */
  players: string[] | null;
}

export interface SleeperPlayer {
  player_id: string;
  full_name?: string;
  position?: string;
  team?: string | null;
}
