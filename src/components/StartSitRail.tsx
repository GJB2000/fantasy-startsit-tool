import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { RecentComparison } from "@/lib/useRecentComparisons";

/**
 * Summarizes the comparison at a glance — no new data, just result.reasoning
 * (the pairwise comparison-level summary comparePlayers() already builds)
 * surfaced somewhere now that the main card leads with the verdict rather
 * than a "Why this pick" toggle covering the whole comparison.
 */
function KeyTakeawaysPanel({ result }: { result: ComparisonResultData }) {
  if (result.reasoning.length === 0) return null;

  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
          <path d="M12 3l2.2 6.8H21l-5.6 4.1 2.2 6.8-5.6-4.2-5.6 4.2 2.2-6.8L3 9.8h6.8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
        Key takeaways
      </div>
      <ul className="flex flex-col gap-2.5">
        {result.reasoning.map((line, i) => (
          <li key={i} className="relative pl-4 text-[12.5px] leading-relaxed text-foreground/70">
            <span className="absolute left-0 top-[0.5em] h-1.5 w-1.5 rounded-full bg-accent" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecentComparisonsPanel({ recent }: { recent: RecentComparison[] }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Recent comparisons
      </div>
      {recent.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-foreground/45">
          Run a comparison and it&apos;ll show up here — nothing yet this session.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recent.map((entry) => (
            <div key={entry.id} className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  entry.isCloseCall ? "bg-caution" : entry.hasLimitedData ? "bg-info" : "bg-good"
                }`}
              />
              <p className="text-[12px] leading-snug">
                {entry.recommendedName ? (
                  <>
                    <span className="font-semibold">Start</span> {entry.recommendedName}
                    {entry.otherNames.length > 0 && (
                      <span className="text-foreground/45"> over {entry.otherNames.join(", ")}</span>
                    )}
                  </>
                ) : (
                  <span className="text-foreground/55">{entry.headline}</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface StartSitRailProps {
  result: ComparisonResultData | null;
  recent: RecentComparison[];
}

/**
 * The right-rail context panels next to the Start/Sit comparison.
 * Matchup context, injury status, and next-opponent/weather now live in
 * each player card instead (ComparisonResult.tsx) rather than duplicated
 * here — this rail is just the comparison-level summary (Key takeaways,
 * from result.reasoning) plus genuine session history
 * (useRecentComparisons), not placeholder content.
 */
export function StartSitRail({ result, recent }: StartSitRailProps) {
  return (
    <div className="flex flex-col gap-4">
      {result && <KeyTakeawaysPanel result={result} />}
      <RecentComparisonsPanel recent={recent} />
    </div>
  );
}
