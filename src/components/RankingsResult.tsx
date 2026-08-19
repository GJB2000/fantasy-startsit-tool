import type { ScoringFormat } from "@/lib/sportsdata/types";

export interface RankingEntryResponse {
  playerId: number | null;
  displayName: string;
  position: string | null;
  team: string | null;
  finalScore: number | null;
  recentPprAvg: number | null;
  seasonPprAvg: number | null;
  seasonTotalPoints: number | null;
  gamesUsedForRecent: number;
  injuryStatus: string | null;
  isOnByeThisWeek: boolean;
  dataQuality: "full" | "limited" | "insufficient";
  notes: string[];
  positionRank: number;
  legitScore: number;
  fantasyProsPositionRank: number | null;
  restOfSeasonPoints: number | null;
  restOfSeasonGames: number;
}

interface RankingsResultProps {
  rankings: RankingEntryResponse[];
  /** Display label only ("QB", "Overall", …) — not a real ExtendedPosition, since the "Overall" view spans all four rankable positions at once. */
  positionLabel: string;
  scoringFormat: ScoringFormat;
  /** In "season" mode the meta line shows real season points scored so far; in "weekly" it shows the forward projection. */
  mode: "weekly" | "season";
  /** Offseason (false) shows 0 season points so far — the new season hasn't started, so nobody has scored yet. In-season shows the real running total. */
  isInSeason: boolean;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function injuryBadgeClasses(status: string) {
  if (status === "Out" || status === "Doubtful") return "bg-bad/15 text-bad";
  return "bg-caution/15 text-caution";
}

/**
 * Full literal class strings, not interpolated — Tailwind's static
 * scanner can't resolve a template like `bg-${token}`, same constraint
 * documented elsewhere in this app (TradeResult.tsx/WaiverResult.tsx).
 *
 * 90+ gets the gold "premium" treatment — a real blue-chip tier on top
 * of an already-real 1-100 number, not a new grading concept. The middle
 * tier uses `--info` rather than `--caution` on purpose: in the editorial
 * "almanac" palette this page renders in, `--caution` and `--premium` are
 * both brass, so a caution middle tier would be indistinguishable from
 * the 90+ elite band — `--info` (a muted blue) keeps all four bands
 * visually distinct (premium/good/info/bad).
 */
function legitScoreClasses(score: number): string {
  if (score >= 90) return "bg-premium/15 text-premium";
  if (score >= 70) return "bg-good/15 text-good";
  if (score >= 45) return "bg-info/15 text-info";
  return "bg-bad/12 text-bad";
}

function RankingRow({
  entry,
  mode,
  isInSeason,
}: {
  entry: RankingEntryResponse;
  mode: "weekly" | "season";
  isInSeason: boolean;
}) {
  // Offseason: nobody has scored in the new season yet, so "season points
  // so far" is 0 (the value on the breakdown is last season's completed
  // total). In-season it's the real running total.
  const seasonPts = isInSeason ? entry.seasonTotalPoints : 0;
  return (
    <div className="flex items-center gap-3 border-t border-foreground/[0.09] px-4 py-3.5 first:border-none">
      <span className="w-6 shrink-0 text-right font-jost text-[16px] font-semibold text-foreground/40">
        {entry.positionRank}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-accent/12 font-jost text-[13px] font-semibold text-accent">
        {initials(entry.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate font-jost text-[15px] font-semibold tracking-tight">{entry.displayName}</h3>
          {entry.isOnByeThisWeek && (
            <span className="rounded-[3px] bg-foreground/8 px-1.5 py-0.5 text-[10px] text-foreground/55">Bye</span>
          )}
          {entry.injuryStatus && (
            <span className={`rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium ${injuryBadgeClasses(entry.injuryStatus)}`}>
              {entry.injuryStatus}
            </span>
          )}
        </div>
        <p className="truncate text-[12px] text-foreground/60">
          {entry.position}
          {entry.team ? ` · ${entry.team}` : ""}
          {mode === "season"
            ? seasonPts != null && ` · ${seasonPts.toFixed(1)} season pts`
            : entry.finalScore != null && ` · ${entry.finalScore.toFixed(1)} proj. pts`}
        </p>
        {mode === "season" && entry.restOfSeasonPoints != null && (
          <p className="mt-0.5 truncate text-[12px] text-foreground/55">
            Projected {entry.restOfSeasonPoints.toFixed(1)} pts rest of season · {entry.restOfSeasonGames} games
          </p>
        )}
      </div>
      <span className={`font-jost shrink-0 rounded-[4px] px-3 py-2 text-center text-[19px] font-semibold tabular-nums ${legitScoreClasses(entry.legitScore)}`}>
        {entry.legitScore}
      </span>
    </div>
  );
}

export function RankingsResult({ rankings, positionLabel, mode, isInSeason }: RankingsResultProps) {
  if (rankings.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-foreground/50">
        Not enough current data to rank {positionLabel} right now — check back once more games have been played.
      </p>
    );
  }

  return (
    <div className="glass-card mt-6 overflow-hidden rounded-2xl border border-foreground/12">
      {rankings.map((entry) => (
        <RankingRow key={entry.playerId ?? entry.displayName} entry={entry} mode={mode} isInSeason={isInSeason} />
      ))}
    </div>
  );
}
