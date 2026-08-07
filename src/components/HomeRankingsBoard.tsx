"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useScoringFormat } from "@/lib/useScoringFormat";
import type { RankingEntryResponse } from "./RankingsResult";

// The /api/rankings route returns the full engine breakdowns (see
// buildRankings.ts's LegitRankingEntry, which extends PlayerScoreBreakdown),
// so matchupContext rides along in the JSON even though RankingsResult's
// own typed slice doesn't declare it. We use it here for the opponent +
// favorable/tough line under each name.
interface HomeRankingEntry extends RankingEntryResponse {
  matchupContext: { opponentTeam: string; diffFromAverage: number } | null;
}

// How many players to surface on the Home board — a preview of the full
// Top 100, not the whole list.
const TOP_N = 5;

// Same thresholds ComparisonResult.tsx's matchupLabel uses, so "favorable"
// / "tough" mean the same thing everywhere in the app. Note the rank
// number direction is counterintuitive (see positionDefense.ts) — we key
// off diffFromAverage, not the raw rank, exactly like ComparisonResult.
function matchupLabel(diff: number): { text: string; className: string } {
  if (diff > 1.5) return { text: "favorable", className: "text-good" };
  if (diff < -1.5) return { text: "tough", className: "text-bad" };
  return { text: "even matchup", className: "text-foreground/45" };
}

function BoardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-engraved text-[12px] uppercase tracking-[0.1em] text-foreground/50">Top of the board</h2>
        <Link href="/rankings" className="text-[12px] font-semibold text-accent hover:underline">
          Full Top 100 →
        </Link>
      </div>
      <div className="overflow-hidden rounded-[6px] border border-foreground/12 bg-surface shadow-sm">{children}</div>
    </section>
  );
}

function BoardMessage({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "bad" }) {
  return (
    <p className={`px-4 py-6 text-center text-[13px] ${tone === "bad" ? "text-bad" : "text-foreground/45"}`}>{children}</p>
  );
}

/**
 * A compact "Top of the board" preview on the Home page — the five
 * highest Legit Scores across all positions, pulled live from the exact
 * same /api/rankings?position=OVERALL route the Legit Rankings tool uses.
 * Self-fetches on mount (like the other Home widgets) so the rankings
 * computation, which can be slow on a cold cache, never blocks the rest
 * of the page from rendering.
 */
export function HomeRankingsBoard() {
  const [scoringFormat] = useScoringFormat();
  const [rankings, setRankings] = useState<HomeRankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/rankings response (an external system), keyed on the scoring-format dep below; the cancelled-flag cleanup guards against a stale response landing after a newer request starts.
    setError(null);
    fetch(`/api/rankings?position=OVERALL&scoringFormat=${scoringFormat}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't load the board.");
          return;
        }
        setRankings(data.rankings ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server.");
      });
    return () => {
      cancelled = true;
    };
  }, [scoringFormat]);

  if (error) {
    return (
      <BoardShell>
        <BoardMessage tone="bad">{error}</BoardMessage>
      </BoardShell>
    );
  }

  if (!rankings) {
    return (
      <BoardShell>
        <BoardMessage>Ranking the board…</BoardMessage>
      </BoardShell>
    );
  }

  if (rankings.length === 0) {
    return (
      <BoardShell>
        <BoardMessage>Not enough current data to rank the board yet — check back once more games have been played.</BoardMessage>
      </BoardShell>
    );
  }

  return (
    <BoardShell>
      {rankings.slice(0, TOP_N).map((entry, i) => {
        const elite = entry.legitScore >= 90;
        const label = entry.matchupContext ? matchupLabel(entry.matchupContext.diffFromAverage) : null;
        return (
          <Link
            key={entry.playerId ?? entry.displayName}
            href="/rankings"
            className="flex items-center gap-3 border-t border-foreground/[0.09] px-4 py-3 transition-colors first:border-none hover:bg-surface-sunken"
          >
            <span className="w-5 shrink-0 text-right font-jost text-[15px] font-semibold tabular-nums text-foreground/40">
              {i + 1}
            </span>
            <span className="inline-flex h-8 min-w-[44px] shrink-0 items-center justify-center rounded-[3px] bg-surface-sunken px-2 font-engraved text-[10px] uppercase tracking-[0.08em] text-foreground/55">
              {entry.position}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-jost text-[18px] font-semibold leading-tight">{entry.displayName}</span>
                {elite && (
                  <span className="shrink-0 rounded-[3px] bg-premium px-1.5 py-0.5 font-engraved text-[9px] uppercase tracking-[0.08em] text-premium-ink">
                    Elite
                  </span>
                )}
              </div>
              <p className="truncate text-[11.5px] text-foreground/45">
                {entry.team ?? "—"}
                {label && (
                  <>
                    {" · vs "}
                    {entry.matchupContext?.opponentTeam}
                    {" · "}
                    <span className={label.className}>{label.text}</span>
                  </>
                )}
              </p>
            </div>
            <span className="hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-sunken sm:block">
              <span
                className="block h-full rounded-full"
                style={{ width: `${entry.legitScore}%`, background: elite ? "var(--premium)" : "var(--accent)" }}
              />
            </span>
            <span
              className={`w-10 shrink-0 text-right font-jost text-[24px] font-semibold tabular-nums ${elite ? "text-premium" : "text-foreground"}`}
            >
              {entry.legitScore}
            </span>
          </Link>
        );
      })}
    </BoardShell>
  );
}
