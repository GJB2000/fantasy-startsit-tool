import type { PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import type { SlotType } from "@/lib/lineup/rosterSlots";

export interface LineupSlotResponse {
  slotType: SlotType;
  label: string;
  slotIndex: number;
  breakdown: PlayerScoreBreakdown | null;
}

interface LineupResultProps {
  slots: LineupSlotResponse[];
  bench: PlayerScoreBreakdown[];
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

function slotHeading(slot: LineupSlotResponse, countAtType: number): string {
  return countAtType > 1 ? `${slot.label} ${slot.slotIndex}` : slot.label;
}

function EmptySlotCard({ heading }: { heading: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-foreground/15 bg-surface p-5 shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{heading}</span>
      <p className="mt-3 text-sm text-foreground/50">
        No eligible player on your roster for this slot — add one to fill it.
      </p>
    </div>
  );
}

function StarterCard({ heading, breakdown, formatLabel }: { heading: string; breakdown: PlayerScoreBreakdown; formatLabel: string }) {
  return (
    <div className="rounded-3xl border border-good/35 bg-good/[0.04] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{heading}</span>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-sm font-bold text-accent">
          {initials(breakdown.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-tight">{breakdown.displayName}</h3>
          <p className="text-xs text-foreground/45">
            {breakdown.position}
            {breakdown.team ? ` · ${breakdown.team}` : ""}
          </p>
        </div>
      </div>

      {(breakdown.isOnByeThisWeek || breakdown.injuryStatus || breakdown.dataQuality !== "full") && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {breakdown.isOnByeThisWeek && (
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/55">Bye week</span>
          )}
          {breakdown.injuryStatus && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${injuryBadgeClasses(breakdown.injuryStatus)}`}>
              {breakdown.injuryStatus}
            </span>
          )}
          {breakdown.dataQuality !== "full" && (
            <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-foreground/55">
              {breakdown.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
            </span>
          )}
        </div>
      )}

      <dl className="mt-4 flex flex-col gap-2.5">
        <div className="flex justify-between border-t border-foreground/[0.07] pt-2.5 first:border-none first:pt-0">
          <dt className="text-[13px] text-foreground/50">Projected score ({formatLabel})</dt>
          <dd className="font-mono text-[15px] font-semibold tabular-nums">
            {breakdown.finalScore != null ? breakdown.finalScore.toFixed(1) : "—"}
          </dd>
        </div>
      </dl>

      {breakdown.notes.length > 0 && (
        <div className="mt-4 border-t border-foreground/[0.07] pt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Why</span>
          <ul className="mt-3 flex flex-col gap-2.5">
            {breakdown.notes.map((note, i) => (
              <li key={i} className="relative pl-4 text-sm leading-relaxed text-foreground/70">
                <span className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-full bg-accent" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BenchRow({ breakdown, formatLabel }: { breakdown: PlayerScoreBreakdown; formatLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-surface px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{breakdown.displayName}</p>
        <p className="text-xs text-foreground/45">
          {breakdown.position}
          {breakdown.team ? ` · ${breakdown.team}` : ""}
        </p>
      </div>
      <span className="font-mono shrink-0 text-sm font-semibold tabular-nums text-foreground/70">
        {breakdown.finalScore != null ? `${breakdown.finalScore.toFixed(1)} ${formatLabel}` : "—"}
      </span>
    </div>
  );
}

export function LineupResult({ slots, bench, scoringFormat }: LineupResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const countBySlotType = slots.reduce<Record<string, number>>((acc, s) => {
    acc[s.slotType] = (acc[s.slotType] ?? 0) + 1;
    return acc;
  }, {});

  const sortedBench = [...bench].sort((a, b) => (b.finalScore ?? -Infinity) - (a.finalScore ?? -Infinity));

  return (
    <div className="mt-10 space-y-10">
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Your lineup</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {slots.map((slot, i) => {
            const heading = slotHeading(slot, countBySlotType[slot.slotType] ?? 1);
            return slot.breakdown ? (
              <StarterCard key={`${slot.slotType}-${i}`} heading={heading} breakdown={slot.breakdown} formatLabel={formatLabel} />
            ) : (
              <EmptySlotCard key={`${slot.slotType}-${i}`} heading={heading} />
            );
          })}
        </div>
      </div>

      {sortedBench.length > 0 && (
        <div>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Bench</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {sortedBench.map((breakdown) => (
              <BenchRow key={breakdown.playerId} breakdown={breakdown} formatLabel={formatLabel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
