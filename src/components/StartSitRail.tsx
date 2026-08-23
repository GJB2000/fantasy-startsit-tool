import type { RecentComparison } from "@/lib/useRecentComparisons";

export function RecentComparisonsPanel({
  recent,
  onSelect,
  editorial = false,
}: {
  recent: RecentComparison[];
  /** When provided, each entry with stored players becomes clickable — re-opening that comparison. */
  onSelect?: (entry: RecentComparison) => void;
  /** Editorial ("almanac") variant — squared, engraved-caps header. */
  editorial?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        editorial ? "glass-card border-foreground/12" : "border-foreground/10 bg-surface shadow-sm"
      }`}
    >
      <div
        className={`mb-3 flex items-center gap-2 ${editorial ? "border-b border-foreground/15 pb-2.5 text-[11px] uppercase tracking-[0.1em] text-foreground/70" : "text-[12.5px] font-semibold"}`}
        style={editorial ? { fontFamily: "var(--font-engraved)" } : undefined}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent" fill="none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        Recent comparisons
      </div>
      {recent.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-foreground/55">
          Run a comparison and it&apos;ll show up here — nothing yet this session.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {recent.map((entry) => {
            const content = (
              <>
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
                        <span className="text-foreground/55"> over {entry.otherNames.join(", ")}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-foreground/55">{entry.headline}</span>
                  )}
                </p>
              </>
            );

            const canSelect = onSelect && entry.players.length >= 2;
            return canSelect ? (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect!(entry)}
                title="Re-open this comparison"
                className="-mx-1.5 flex items-start gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-foreground/[0.06]"
              >
                {content}
              </button>
            ) : (
              <div key={entry.id} className="flex items-start gap-2 px-1.5 py-1">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The right-rail context panel next to the Start/Sit comparison. Matchup
 * context, injury status, and next-opponent/weather live in each player
 * card instead (ComparisonResult.tsx), so this rail is just genuine
 * session history (useRecentComparisons), not placeholder content.
 *
 * Sticky from `lg` up, where the layout is two columns: a full result runs
 * far taller than this short panel, so without it the rail scrolls away and
 * leaves ~300px of blank column beside the player cards for the rest of the
 * page. The parent grid sets `items-start`, so rows aren't stretched and
 * sticky has room to travel. Below `lg` the grid collapses to one column and
 * the rail simply stacks under the result, where sticky would have no travel
 * — hence the breakpoint prefix on every part of this.
 *
 * Deliberately NO `overflow-y-auto`/`max-h` here, though a scroll guard looks
 * like the obvious companion to sticky. It was tried and reverted: an overflow
 * container clips at its own square-cornered padding box, and this panel fills
 * the wrapper exactly, so the card's soft drop shadow (which paints OUTSIDE its
 * border box) got sliced into a hard rectangle — reading as a sharp-edged
 * outline around the rail. The guard was defensive only: useRecentComparisons
 * caps history at 5 entries (~250px against an ~850px viewport), so it could
 * never actually fire. If the rail ever gains taller content, put the overflow
 * on an inner element rather than this wrapper.
 */
export function StartSitRail({
  recent,
  onSelectRecent,
}: {
  recent: RecentComparison[];
  onSelectRecent?: (entry: RecentComparison) => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
      {/* StartSitRail only renders on the editorial Start/Sit page. */}
      <RecentComparisonsPanel recent={recent} onSelect={onSelectRecent} editorial />
    </div>
  );
}
