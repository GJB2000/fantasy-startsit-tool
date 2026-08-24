import { StatsBrowser } from "@/components/StatsBrowser";

export default function StatsPage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mx-auto mb-7 w-full max-w-6xl">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          LEGITFOOTBALL
        </span>
        <h1
          className="mt-2 text-[34px] leading-none tracking-[-0.01em] text-foreground"
          style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
        >
          PLAYER STATS
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-foreground/60">
          Full season stats by position. Sort any column, click a player for their week-by-week game log.
        </p>
      </header>
      <StatsBrowser />
    </main>
  );
}
