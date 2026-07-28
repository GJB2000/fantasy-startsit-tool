import { BacktestTool } from "@/components/BacktestTool";
import { PageHeader } from "@/components/PageHeader";

export default function BacktestPage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball · Validation"
        title="Backtest the recommendation engine"
        description="Replay the engine against a completed season, using only data that would have been known before each week's games, and see how often it called it right."
      />
      <BacktestTool />
    </main>
  );
}
