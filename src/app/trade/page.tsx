import { TradeAnalyzer } from "@/components/TradeAnalyzer";

export default function TradePage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mb-7">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Legitfootball · Trade Analyzer
        </span>
        <h1
          className="mt-2 text-[34px] leading-none tracking-[-0.01em] text-foreground"
          style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
        >
          Is this trade worth it?
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/60">
          Enter who you&apos;d give up and who you&apos;d get back — any number on each side. We&apos;ll project each
          player&apos;s value across their remaining schedule and give you a straight answer on who wins the deal.
        </p>
      </header>
      <TradeAnalyzer />
    </main>
  );
}
