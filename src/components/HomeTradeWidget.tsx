"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TradeEvaluation, TradeVerdict } from "@/lib/trade/evaluateTrade";
import { serializeSlots } from "@/lib/lineup/rosterSlots";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useEffectiveRosterSlots } from "@/lib/useRosterSlots";
import { useSleeperConnection } from "@/lib/useSleeperConnection";

interface TradeSuggestionResponse {
  suggestion: { otherTeamName: string; evaluation: TradeEvaluation } | null;
  reason: string | null;
}

// Full literal class strings, not interpolated — Tailwind's static scanner
// can't resolve a template like `bg-${token}`, same constraint TradeResult.tsx/
// WaiverResult.tsx already document.
const VERDICT_DOT: Record<TradeVerdict, string> = {
  good: "bg-good",
  bad: "bg-bad",
  fair: "bg-caution",
  unknown: "bg-info",
};

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl border border-foreground/12 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-foreground/[0.09] pb-2.5">
        <div className="flex items-center gap-2 font-engraved text-[11px] uppercase tracking-[0.08em] text-foreground/70">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
            <path
              d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Suggested trade
        </div>
        <Link href="/trade" className="text-[11px] font-semibold text-accent hover:underline">
          Open
        </Link>
      </div>
      {children}
    </div>
  );
}

/**
 * Compact Home-page summary of a real, two-sided trade suggestion — a
 * genuinely different kind of widget from Lineup/Waiver's (see
 * suggestLeagueTrade.ts): it needs real per-team roster data from a
 * connected Sleeper league to find an actual opposing team with a
 * complementary need, so unlike those two it has no manual-roster
 * fallback — there's no second roster to match against without one.
 */
export function HomeTradeWidget() {
  const [sleeperConnection] = useSleeperConnection();
  const [scoringFormat] = useScoringFormat();
  const [response, setResponse] = useState<TradeSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared slot config: an explicit edit wins, then the connected league's
  // real slots, then a standard lineup (lib/useRosterSlots.ts).
  const { slots: slotCounts } = useEffectiveRosterSlots();

  useEffect(() => {
    if (!sleeperConnection) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/trade-suggestion response (an external system), keyed on the connection/format/slots deps below; the cancelled-flag cleanup already guards against a stale response landing after a newer request starts.
    setLoading(true);
    setError(null);
    const slotsParam = serializeSlots(slotCounts);
    fetch(
      `/api/trade-suggestion?leagueId=${sleeperConnection.leagueId}&userId=${sleeperConnection.userId}&scoringFormat=${scoringFormat}&slots=${encodeURIComponent(slotsParam)}`
    )
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setResponse(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sleeperConnection, scoringFormat, slotCounts]);

  if (!sleeperConnection) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/55">
          Connect Sleeper on the Waivers or Lineup page to see a real trade suggestion from your league here.
        </p>
      </WidgetShell>
    );
  }

  if (loading && !response) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/55">Scanning your league for a fair trade…</p>
      </WidgetShell>
    );
  }

  if (error) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-bad">{error}</p>
      </WidgetShell>
    );
  }

  if (!response) return <WidgetShell>{null}</WidgetShell>;

  if (!response.suggestion) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/55">
          {response.reason ?? "No fair trade found in your league right now."}
        </p>
      </WidgetShell>
    );
  }

  const { otherTeamName, evaluation } = response.suggestion;
  const give = evaluation.give[0];
  const get = evaluation.get[0];

  return (
    <WidgetShell>
      <p className="font-engraved text-[10px] uppercase tracking-[0.08em] text-foreground/55">With {otherTeamName}</p>
      <div className="mt-1.5 flex items-center gap-2 font-jost text-[14px] font-semibold tracking-tight">
        <span className="truncate">{give?.displayName ?? "—"}</span>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-foreground/35" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="truncate">{get?.displayName ?? "—"}</span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${VERDICT_DOT[evaluation.verdict]}`} />
        <p className="text-[12px] leading-relaxed text-foreground/65">{evaluation.headline}</p>
      </div>
    </WidgetShell>
  );
}
