"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { streamingPositionFlags } from "@/lib/lineup/rosterSlots";
import type { ExtendedPosition } from "@/lib/sportsdata/types";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { computeRosterNeedPenalty, isStreamingPosition, moveHeadline, pickTopTarget, type WaiverCandidateResponse } from "./WaiverResult";

interface WaiverResponse {
  candidatesByPosition: Record<ExtendedPosition, WaiverCandidateResponse[]>;
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl border border-foreground/12 p-4">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-foreground/[0.09] pb-2.5">
        <div className="flex items-center gap-2 font-engraved text-[11px] uppercase tracking-[0.08em] text-foreground/70">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
            <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Top waiver target
        </div>
        <Link href="/waivers" className="text-[11px] font-semibold text-accent hover:underline">
          Open
        </Link>
      </div>
      {children}
    </div>
  );
}

/**
 * Compact Home-page summary of the Waiver Wire tool — reuses the exact
 * same /api/waivers route as WaiverTool.tsx, auto-fetched on mount, and
 * surfaces the single best pickup via the SAME pickTopTarget helper the
 * Waiver page's spotlight uses (value over replacement, position-fair), so
 * the widget and the page always agree on the top target.
 */
export function HomeWaiverWidget() {
  const { rostered } = useRosteredPlayers();
  const [sleeperConnection] = useSleeperConnection();
  const [scoringFormat] = useScoringFormat();
  const [response, setResponse] = useState<WaiverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rostered.length === 0) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/waivers response (an external system), keyed on the roster/format/connection deps below; the cancelled-flag cleanup already guards against a stale response landing after a newer request starts.
    setLoading(true);
    setError(null);
    const rosteredParam = rostered.map((p) => p.playerId).join(",");
    const leagueRosteredParam = (sleeperConnection?.leagueRosteredPlayerIds ?? []).join(",");
    const { includeDst, includeK } = streamingPositionFlags(sleeperConnection?.rosterPositions);
    fetch(
      `/api/waivers?scoringFormat=${scoringFormat}&rostered=${rosteredParam}&leagueRostered=${leagueRosteredParam}&includeDst=${includeDst}&includeK=${includeK}`
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
  }, [rostered, scoringFormat, sleeperConnection]);

  if (rostered.length === 0) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/55">
          Add your roster on the Waivers page to see a suggested pickup here.
        </p>
      </WidgetShell>
    );
  }

  if (loading && !response) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/55">Scanning the player pool…</p>
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

  const top = pickTopTarget(
    response.candidatesByPosition,
    computeRosterNeedPenalty(rostered, sleeperConnection?.rosterPositions ?? [])
  );

  if (!top) {
    return (
      <WidgetShell>
        <p className="text-[12px] leading-relaxed text-foreground/55">
          No standout opportunity-vs-production gaps right now — check back after a few more weeks of games.
        </p>
      </WidgetShell>
    );
  }

  const streaming = isStreamingPosition(top.position);

  return (
    <WidgetShell>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-accent/12 font-jost text-xs font-semibold text-accent">
          {top.position}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-jost text-[14px] font-semibold tracking-tight">{top.displayName}</p>
          <p className="truncate text-[11px] text-foreground/55">
            {top.position}
            {top.team ? ` · ${top.team}` : ""}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className="rounded-[3px] bg-good/12 px-2 py-0.5 text-[10.5px] font-semibold text-good">
          {top.positionLabel} {streaming ? "this week" : "by volume"}
        </span>
        <span className="rounded-[3px] bg-foreground/8 px-2 py-0.5 text-[10.5px] font-medium text-foreground/55">
          {top.productionLabel} {streaming ? "this season" : "by points"}
        </span>
      </div>
      {top.reasoning[0] && <p className="mt-2.5 text-[12px] leading-relaxed text-foreground/65">{top.reasoning[0]}</p>}
      {top.dropSuggestion?.give[0] && (
        <p className="mt-2 border-t border-foreground/[0.09] pt-2 text-[11px] leading-relaxed text-foreground/55">
          <span className="font-medium text-foreground/60">Suggested drop: {top.dropSuggestion.give[0].displayName}.</span>{" "}
          {moveHeadline(top.dropSuggestion)}
        </p>
      )}
    </WidgetShell>
  );
}
