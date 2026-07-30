import type { ScoringFormat } from "@/lib/sportsdata/types";

export interface RankingEntryResponse {
  playerId: number | null;
  displayName: string;
  position: string | null;
  team: string | null;
  finalScore: number | null;
  recentPprAvg: number | null;
  seasonPprAvg: number | null;
  gamesUsedForRecent: number;
  injuryStatus: string | null;
  isOnByeThisWeek: boolean;
  dataQuality: "full" | "limited" | "insufficient";
  notes: string[];
  positionRank: number;
  legitScore: number;
  fantasyProsPositionRank: number | null;
}

interface RankingsResultProps {
  rankings: RankingEntryResponse[];
  /** Display label only ("QB", "Overall", …) — not a real ExtendedPosition, since the "Overall" view spans all four rankable positions at once. */
  positionLabel: string;
  scoringFormat: ScoringFormat;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

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
 * of an already-real 1-100 number, not a new grading concept. `--accent`
 * and `--good` are the same emerald in this design system (deliberately
 * — brand and "good" reinforce each other here), so the old accent/good
 * split at 60/85 would now render as two identical-looking greens;
 * collapsed into one 70+ tier instead so every band still reads as
 * visually distinct.
 */
function legitScoreClasses(score: number): string {
  if (score >= 90) return "bg-premium/15 text-premium";
  if (score >= 70) return "bg-good/15 text-good";
  if (score >= 45) return "bg-caution/15 text-caution";
  return "bg-bad/12 text-bad";
}

function RankingRow({ entry, formatLabel }: { entry: RankingEntryResponse; formatLabel: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-foreground/[0.07] px-4 py-3.5 first:border-none">
      <span className="w-6 shrink-0 text-right font-mono text-[13px] font-bold text-foreground/35">
        {entry.positionRank}
      </span>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-[13px] font-bold text-accent">
        {initials(entry.displayName)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-[14px] font-semibold tracking-tight">{entry.displayName}</h3>
          {entry.isOnByeThisWeek && (
            <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[10px] text-foreground/55">Bye</span>
          )}
          {entry.injuryStatus && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${injuryBadgeClasses(entry.injuryStatus)}`}>
              {entry.injuryStatus}
            </span>
          )}
        </div>
        <p className="truncate text-[12px] text-foreground/45">
          {entry.position}
          {entry.team ? ` · ${entry.team}` : ""}
          {entry.finalScore != null && ` · ${entry.finalScore.toFixed(1)} proj. pts (${formatLabel})`}
          {entry.fantasyProsPositionRank != null && ` · FantasyPros ${entry.position}${entry.fantasyProsPositionRank}`}
        </p>
        {entry.notes[0] && <p className="mt-1 truncate text-[12px] leading-snug text-foreground/55">{entry.notes[0]}</p>}
      </div>
      <span className={`font-mono shrink-0 rounded-2xl px-3 py-2 text-center text-[18px] font-bold tabular-nums ${legitScoreClasses(entry.legitScore)}`}>
        {entry.legitScore}
      </span>
    </div>
  );
}

export function RankingsResult({ rankings, positionLabel, scoringFormat }: RankingsResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];

  if (rankings.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-foreground/50">
        Not enough current data to rank {positionLabel} right now — check back once more games have been played.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-foreground/10 bg-surface shadow-sm">
      {rankings.map((entry) => (
        <RankingRow key={entry.playerId ?? entry.displayName} entry={entry} formatLabel={formatLabel} />
      ))}
    </div>
  );
}
