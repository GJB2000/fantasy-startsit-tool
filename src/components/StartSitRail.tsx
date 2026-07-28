import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { RecentComparison } from "@/lib/useRecentComparisons";

function matchupLabel(diffFromAverage: number): { text: string; tone: "good" | "bad" | "neutral" } {
  if (diffFromAverage > 1.5) return { text: "favorable matchup", tone: "good" };
  if (diffFromAverage < -1.5) return { text: "tough matchup", tone: "bad" };
  return { text: "roughly average", tone: "neutral" };
}

const TONE_CLASSES: Record<"good" | "bad" | "neutral", string> = {
  good: "bg-good/12 text-good",
  bad: "bg-bad/12 text-bad",
  neutral: "bg-foreground/8 text-foreground/55",
};

function MatchupContextPanel({ result }: { result: ComparisonResultData }) {
  const rows = result.players.filter((p) => p.matchupContext != null);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
          <rect x="3" y="11" width="4" height="9" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="10" y="6" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.6" />
          <rect x="17" y="3" width="4" height="17" rx="1" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        Matchup context
      </div>
      <div className="flex flex-col">
        {rows.map((p) => {
          const ctx = p.matchupContext!;
          const { text, tone } = matchupLabel(ctx.diffFromAverage);
          return (
            <div
              key={p.playerId}
              className="flex items-center justify-between gap-2 border-t border-foreground/[0.07] py-2 first:border-none first:pt-0"
            >
              <span className="text-[12.5px] font-medium">
                {ctx.opponentTeam} <span className="text-foreground/45">vs. {ctx.position}</span>
              </span>
              <span className={`font-rounded whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[tone]}`}>
                #{ctx.rank} of {ctx.teamCount} · {text}
              </span>
            </div>
          );
        })}
      </div>
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
 * The right-rail context panels next to the Start/Sit comparison —
 * both built from data the app already has: matchupContext already
 * flows through PlayerScoreBreakdown for skill positions (D/ST/K just
 * render nothing here, degrading the same way the rest of the app
 * treats fields those positions don't have), and recent comparisons are
 * a genuine session history via useRecentComparisons, not placeholder
 * content.
 */
export function StartSitRail({ result, recent }: StartSitRailProps) {
  return (
    <div className="flex flex-col gap-4">
      {result && <MatchupContextPanel result={result} />}
      <RecentComparisonsPanel recent={recent} />
    </div>
  );
}
