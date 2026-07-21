import { BacktestTool } from "@/components/BacktestTool";

export default function BacktestPage() {
  return (
    <main className="flex-1 bg-background px-6 py-12 font-sans text-foreground sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">Backtest the recommendation engine</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Replay the engine against the completed 2025 season, using only data that
          would have been known before each week&apos;s games, and see how often it
          called it right.
        </p>
      </div>
      <BacktestTool />
    </main>
  );
}
