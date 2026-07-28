import { PageHeader } from "@/components/PageHeader";
import { TradeAnalyzer } from "@/components/TradeAnalyzer";

export default function TradePage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball · Trade Analyzer"
        title="Is this trade worth it?"
        description="Enter who you'd give up and who you'd get back — any number on each side. We'll project each player's value across their remaining schedule and give you a straight answer on who wins the deal."
      />
      <TradeAnalyzer />
    </main>
  );
}
