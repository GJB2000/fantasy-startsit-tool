// Plain display types for player props — deliberately NO "server-only"
// import (unlike playerProps.ts), so ComparisonResult.tsx (a client
// component) can `import type` these without pulling server-only fetch code
// into the client bundle. Display-only context, never part of
// PlayerScoreBreakdown or any scoring path.

export interface PropLine {
  /** e.g. "Pass yds", "Receptions" */
  label: string;
  /** The over/under line, e.g. "245.5" */
  value: string;
}

export interface PlayerProps {
  /** "TEAM vs OPP", for context. */
  game: string;
  lines: PropLine[];
}
