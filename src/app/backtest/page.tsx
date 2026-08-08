import { BacktestTool } from "@/components/BacktestTool";

export default function BacktestPage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mb-7">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Legitfootball · Validation
        </span>
        <h1
          className="mt-2 text-[34px] leading-none tracking-[-0.01em] text-foreground"
          style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
        >
          Backtest the recommendation engine
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/60">
          Replay the engine against a completed season, using only data that would have been known before each
          week&apos;s games, and see how often it called it right.
        </p>
      </header>
      <BacktestTool />
    </main>
  );
}
