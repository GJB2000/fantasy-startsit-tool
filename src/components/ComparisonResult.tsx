import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";

interface ComparisonResultProps {
  result: ComparisonResultData;
  contextNote: string;
  scoringFormat: ScoringFormat;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

function injuryBadgeClasses(status: string) {
  if (status === "Out" || status === "Doubtful") {
    return "bg-bad/15 text-bad";
  }
  return "bg-caution/15 text-caution";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function HeadlineIcon({ result }: { result: ComparisonResultData }) {
  if (result.isCloseCall) {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M8 7l8 10M16 7l-8 10" stroke="var(--caution)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9.2" stroke="var(--caution)" strokeWidth="1.5" />
      </svg>
    );
  }
  if (result.hasLimitedData) {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--info)" strokeWidth="2" />
        <path d="M15.5 15.5L20 20" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
      <path d="M5 13l4 4L19 7" stroke="var(--good)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ComparisonResult({ result, contextNote, scoringFormat }: ComparisonResultProps) {
  const badgeSoft = result.isCloseCall ? "bg-caution/12" : result.hasLimitedData ? "bg-info/12" : "bg-good/12";
  const formatLabel = FORMAT_LABEL[scoringFormat];

  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-3xl border border-foreground/10 bg-surface p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badgeSoft}`}>
            <HeadlineIcon result={result} />
          </span>
          <div>
            <p className="text-lg font-semibold leading-snug tracking-tight">{result.headline}</p>
            <p className="mt-1 text-xs text-foreground/45">{contextNote}</p>
          </div>
        </div>

        <div className="mt-5 border-t border-foreground/[0.07] pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Why</span>
          <ul className="mt-3 flex flex-col gap-2.5">
            {result.reasoning.map((line, i) => (
              <li key={i} className="relative pl-4 text-sm leading-relaxed text-foreground/70">
                <span className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-full bg-accent" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.players.map((player, i) => {
          const isRecommended = player.playerId === result.recommendedPlayerId;
          return (
            <div
              key={player.playerId ?? `unresolved-${i}`}
              className={`rounded-3xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isRecommended ? "border-good/35 bg-good/[0.04]" : "border-foreground/10 bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-sm font-bold text-accent">
                  {initials(player.displayName)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold tracking-tight">{player.displayName}</h3>
                  {player.position && (
                    <p className="text-xs text-foreground/45">
                      {player.position}
                      {player.team ? ` · ${player.team}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {isRecommended && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-good/12 px-2.5 py-1 text-[11px] font-semibold text-good">
                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Start
                </span>
              )}

              {(player.isOnByeThisWeek || player.injuryStatus || player.dataQuality !== "full") && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {player.isOnByeThisWeek && (
                    <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/55">
                      Bye week
                    </span>
                  )}
                  {player.injuryStatus && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${injuryBadgeClasses(player.injuryStatus)}`}>
                      {player.injuryStatus}
                    </span>
                  )}
                  {player.dataQuality !== "full" && (
                    <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/55">
                      {player.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
                    </span>
                  )}
                </div>
              )}

              <dl className="mt-4 flex flex-col gap-2.5">
                <div className="flex justify-between border-t border-foreground/[0.07] pt-2.5 first:border-none first:pt-0">
                  <dt className="text-[13px] text-foreground/50">
                    Last {player.gamesUsedForRecent || 0} games ({formatLabel} avg)
                  </dt>
                  <dd className="font-rounded text-[15px] font-semibold tabular-nums">
                    {player.recentPprAvg != null ? player.recentPprAvg.toFixed(1) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-foreground/[0.07] pt-2.5">
                  <dt className="text-[13px] text-foreground/50">Season avg ({formatLabel})</dt>
                  <dd className="font-rounded text-[15px] font-semibold tabular-nums">
                    {player.seasonPprAvg != null ? player.seasonPprAvg.toFixed(1) : "—"}
                  </dd>
                </div>
                {player.recentVolumeAvg != null && (
                  <div className="flex justify-between border-t border-foreground/[0.07] pt-2.5">
                    <dt className="text-[13px] text-foreground/50">Recent volume/game</dt>
                    <dd className="font-rounded text-[15px] font-semibold tabular-nums">{player.recentVolumeAvg.toFixed(1)}</dd>
                  </div>
                )}
                {player.matchupContext && (
                  <div className="flex justify-between border-t border-foreground/[0.07] pt-2.5">
                    <dt className="text-[13px] text-foreground/50">
                      Last matchup ({player.matchupContext.opponentTeam})
                    </dt>
                    <dd className="font-rounded text-[15px] font-semibold tabular-nums">
                      #{player.matchupContext.rank} of {player.matchupContext.teamCount}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
