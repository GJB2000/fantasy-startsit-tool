import type { GameWeather } from "@/lib/nflverse/schedules";
import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { RecentComparison } from "@/lib/useRecentComparisons";

const DOME_ROOFS = new Set(["dome", "closed"]);

/**
 * nflverse's schedule only carries actual recorded conditions, not a
 * pregame forecast — wind/temp are frequently blank for games that
 * haven't happened yet. Roof type is a fixed stadium property, so it's
 * always knowable in advance regardless of how far out the game is.
 */
function formatWeather(weather: GameWeather | null): string {
  if (!weather) return "Not yet available";
  if (DOME_ROOFS.has(weather.roof)) return "Dome";
  if (weather.temp == null && weather.wind == null) return "Forecast not yet available";
  const parts: string[] = [];
  if (weather.temp != null) parts.push(`${weather.temp}°F`);
  if (weather.wind != null) parts.push(`${weather.wind} mph wind`);
  return parts.join(" · ");
}

function injuryBadgeClasses(status: string) {
  if (status === "Out" || status === "Doubtful") return "bg-bad/15 text-bad";
  return "bg-caution/15 text-caution";
}

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
              <span className={`font-mono whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE_CLASSES[tone]}`}>
                #{ctx.rank} of {ctx.teamCount} · {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

/**
 * Injury status + next-opponent/weather context per player, pulled out
 * of the main comparison cards into the sidebar — same real fields
 * (injuryStatus/nextOpponent/nextGameWeather) every player card already
 * carried, just relocated so the main cards can focus on the projection
 * and stat grid. Degrades the same way MatchupContextPanel does: a
 * player with nothing to show (no injury flag, no schedule data yet)
 * simply doesn't get a row.
 */
function InjuryWeatherPanel({ result }: { result: ComparisonResultData }) {
  const rows = result.players.filter((p) => p.injuryStatus || p.nextOpponent);
  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
          <path d="M12 3l7 3.2v5.3c0 4.6-3 7.9-7 9.2-4-1.3-7-4.6-7-9.2V6.2L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="16" r="0.9" fill="currentColor" />
        </svg>
        Injury &amp; weather
      </div>
      <div className="flex flex-col">
        {rows.map((p) => (
          <div key={p.playerId} className="border-t border-foreground/[0.07] py-2.5 first:border-none first:pt-0">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12.5px] font-medium">{p.displayName}</span>
              {p.injuryStatus && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${injuryBadgeClasses(p.injuryStatus)}`}>
                  {p.injuryStatus}
                </span>
              )}
            </div>
            {p.nextOpponent && (
              <p className="mt-1 text-[11.5px] text-foreground/45">
                Next: {p.nextOpponent.team} (Wk {p.nextOpponent.week}) · {formatWeather(p.nextGameWeather)}
              </p>
            )}
          </div>
        ))}
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
 * every one built from data the app already has: result.reasoning,
 * injuryStatus/nextOpponent/nextGameWeather, and matchupContext all
 * already flow through the comparison result/PlayerScoreBreakdown for
 * skill positions (D/ST/K just render fewer/no rows in each panel,
 * degrading the same way the rest of the app treats fields those
 * positions don't have), and recent comparisons are a genuine session
 * history via useRecentComparisons, not placeholder content.
 */
export function StartSitRail({ result, recent }: StartSitRailProps) {
  return (
    <div className="flex flex-col gap-4">
      {result && <KeyTakeawaysPanel result={result} />}
      {result && <InjuryWeatherPanel result={result} />}
      {result && <MatchupContextPanel result={result} />}
      <RecentComparisonsPanel recent={recent} />
    </div>
  );
}
