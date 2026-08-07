import { LineupTool } from "@/components/LineupTool";

export default function LineupPage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mb-7">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Legitfootball · Lineup Optimizer
        </span>
        <h1
          className="mt-2 text-[34px] leading-none tracking-[-0.01em] text-foreground"
          style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
        >
          Who should start this week?
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/60">
          Import your roster from Sleeper or add players by hand, tell us how many starters go at each spot, and
          we&apos;ll fill out your best lineup — with the same reasoning behind every call as everywhere else in this app.
        </p>
      </header>
      <LineupTool />
    </main>
  );
}
