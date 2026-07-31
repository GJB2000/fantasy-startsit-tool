// Plain display types for player props — deliberately NO "server-only"
// import (unlike client.ts/props.ts), so ComparisonResult.tsx (a client
// component) can `import type` these without pulling the server-only
// fetch code into the client bundle. These are display-only context, not
// part of PlayerScoreBreakdown or any scoring path.

export interface PropLine {
  /** e.g. "Pass yds", "Receptions", "Anytime TD" */
  label: string;
  /** e.g. "245.5" for an over/under line, or "+130" for anytime-TD odds */
  value: string;
}

export interface PlayerProps {
  /** Sportsbook the lines came from, e.g. "DraftKings" — shown as attribution. */
  bookmaker: string;
  /** "Away @ Home", for context. */
  game: string;
  lines: PropLine[];
}

export interface PropPlayerInput {
  playerId: number;
  name: string;
  team: string | null;
  position: string | null;
}
