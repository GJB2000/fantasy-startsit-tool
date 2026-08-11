"use client";

import { useState } from "react";
import type { ExtendedPosition } from "@/lib/sportsdata/types";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useRosterModal } from "@/lib/useRosterModal";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import { RosterSummaryButton } from "./RosterSummaryButton";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { WaiverResult, type WaiverCandidateResponse } from "./WaiverResult";

interface WaiverResponse {
  candidatesByPosition: Record<ExtendedPosition, WaiverCandidateResponse[]>;
  context: { contextNote?: string };
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] bg-accent/15 font-mono text-[11px] font-bold text-accent">
      {n}
    </span>
  );
}

/**
 * A schematic, illustrative version of WaiverResult's signature gap bar —
 * generic axis labels, no player data — used purely to teach the buy-low
 * concept before a search runs. Deliberately mirrors GapBar's look (green
 * "opportunity" node ahead of a hollow "production" node, +gap tag) so the
 * real board reads as familiar once results land.
 */
function SchematicGapBar() {
  const op = 24; // opportunity node position (recent usage rank — better)
  const pr = 66; // production node position (recent points rank — lagging)
  return (
    <div className="rounded-[3px] border border-foreground/10 bg-surface-sunken p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span
          className="text-[10.5px] uppercase tracking-[0.14em] text-foreground/50"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Usage vs. output · position rank
        </span>
        <span
          className="rounded-[3px] border border-accent/45 bg-accent/12 px-2.5 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          buy-low gap
        </span>
      </div>
      <div className="relative h-2.5 rounded-full border border-foreground/[0.06] bg-foreground/[0.09]">
        <div
          className="absolute -inset-y-px rounded-full"
          style={{
            left: `${op}%`,
            width: `${pr - op}%`,
            background: "linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent))",
          }}
        />
        <span
          className="absolute top-1/2 rounded-full bg-accent"
          style={{ left: `${op}%`, width: 14, height: 14, transform: "translate(-50%,-50%)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent)" }}
        />
        <span
          className="absolute top-1/2 rounded-full border-2 border-foreground/25 bg-surface"
          style={{ left: `${pr}%`, width: 14, height: 14, transform: "translate(-50%,-50%)" }}
        />
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3 text-[12px]">
        <span className="font-semibold text-accent">
          Recent usage <span className="text-[10px] uppercase tracking-wide text-foreground/40">opportunity</span>
        </span>
        <span className="text-right text-foreground/55">
          Recent points <span className="text-[10px] uppercase tracking-wide text-foreground/40">production</span>
        </span>
      </div>
    </div>
  );
}

const HERO_FEATURES: { title: string; body: string }[] = [
  { title: "Opportunity over output", body: "Ranked by the touches and targets the points haven't caught up to yet." },
  { title: "A drop to pair with it", body: "Every pickup comes with a same-position drop, graded on rest-of-season value." },
  { title: "Your league, filtered out", body: "Connect Sleeper and everyone already rostered — yours and opponents' — is excluded." },
];

function MethodHero() {
  return (
    <section className="glass-card-accent overflow-hidden rounded-2xl border border-accent/25 p-6 sm:p-7">
      <span
        className="text-[11px] uppercase tracking-[0.16em] text-accent"
        style={{ fontFamily: "var(--font-engraved)" }}
      >
        The buy-low signal
      </span>
      <h2
        className="mt-2 text-[27px] leading-[1.05] tracking-[-0.01em] sm:text-[31px]"
        style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
      >
        Catch the breakout before your league does
      </h2>
      <p className="mt-2.5 max-w-[52ch] text-[13.5px] leading-relaxed text-foreground/60">
        We rank every available player two ways — recent opportunity and recent points. When the
        usage is already there but the scoring hasn&apos;t followed, that&apos;s a player worth grabbing early.
      </p>

      <div className="mt-5">
        <SchematicGapBar />
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {HERO_FEATURES.map((f) => (
          <li key={f.title} className="flex gap-3">
            <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent/15">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="text-[13px] leading-snug">
              <b className="font-semibold">{f.title}.</b>{" "}
              <span className="text-foreground/55">{f.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WaiverTool() {
  const { rostered, addRostered } = useRosteredPlayers();
  const [sleeperConnection] = useSleeperConnection();
  const [, setRosterOpen] = useRosterModal();
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [response, setResponse] = useState<WaiverResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

  async function handleFind() {
    setLoading(true);
    setError(null);
    setResponse(null);
    setDismissedIds(new Set());
    try {
      const rosteredParam = rostered.map((p) => p.playerId).join(",");
      const leagueRosteredParam = (sleeperConnection?.leagueRosteredPlayerIds ?? []).join(",");
      const res = await fetch(
        `/api/waivers?scoringFormat=${scoringFormat}&rostered=${rosteredParam}&leagueRostered=${leagueRosteredParam}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResponse(data);
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  function handleMarkRostered(playerId: number, displayName: string, position: string, team: string | null) {
    addRostered({ playerId, name: displayName, position, team, injuryStatus: null, photoUrl: null });
    setDismissedIds((prev) => new Set(prev).add(playerId));
  }

  const filteredCandidatesByPosition = response
    ? (Object.fromEntries(
        Object.entries(response.candidatesByPosition).map(([position, candidates]) => [
          position,
          candidates.filter((c) => !dismissedIds.has(c.playerId)),
        ])
      ) as Record<ExtendedPosition, WaiverCandidateResponse[]>)
    : null;

  const controls = (
    <div className="glass-card rounded-2xl border border-foreground/12 p-5 sm:p-6">
      <div className="border-b border-foreground/15 pb-3">
        <div
          className="text-[12px] uppercase tracking-[0.1em] text-foreground/70"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Set up your search
        </div>
        <p className="mt-1.5 text-[12.5px] text-foreground/45">Two quick inputs, then we scan the pool.</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <StepDot n={1} />
          <span className="text-[13.5px] font-semibold">Scoring format</span>
        </span>
        <ScoringFormatToggle
          editorial
          value={scoringFormat}
          onChange={(format) => {
            setScoringFormat(format);
            setResponse(null);
          }}
        />
      </div>

      <div className="mt-4 border-t border-foreground/[0.09] pt-4">
        <span className="mb-2.5 flex items-center gap-2.5">
          <StepDot n={2} />
          <span className="text-[13.5px] font-semibold">Your roster</span>
        </span>
        <RosterSummaryButton
          editorial
          count={rostered.length}
          connection={sleeperConnection}
          onManage={() => setRosterOpen(true)}
        />
      </div>

      <button
        type="button"
        onClick={handleFind}
        disabled={loading}
        style={{ fontFamily: "var(--font-engraved)" }}
        className="mt-5 w-full rounded-full bg-accent px-4 py-3.5 text-[12px] uppercase tracking-[0.14em] text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        {loading ? "Scanning the player pool…" : "Find waiver targets"}
      </button>

      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );

  return (
    <div className="mx-auto mt-10 w-full max-w-5xl">
      {response ? (
        <div className="mx-auto w-full max-w-xl">{controls}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
          <MethodHero />
          {controls}
        </div>
      )}

      {response && filteredCandidatesByPosition && (
        <WaiverResult
          candidatesByPosition={filteredCandidatesByPosition}
          scoringFormat={scoringFormat}
          showRosteredButton={!sleeperConnection}
          onMarkRostered={handleMarkRostered}
          contextNote={response.context.contextNote}
        />
      )}
    </div>
  );
}
