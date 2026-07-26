import { TradeAnalyzer } from "@/components/TradeAnalyzer";

export default function TradePage() {
  return (
    <main className="relative flex-1 overflow-hidden bg-background px-6 py-16 font-sans text-foreground sm:py-20">
      <div
        aria-hidden
        className="hero-glow pointer-events-none absolute left-1/2 top-[-160px] h-[420px] w-[640px] -translate-x-1/2"
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Legitfootball · Trade Analyzer
        </span>
        <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl">
          Is this trade
          <br />
          <span className="text-foreground/45">worth it?</span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-foreground/60">
          Enter who you&apos;d give up and who you&apos;d get back — any number on each
          side. We&apos;ll project each player&apos;s value across their remaining
          schedule this season, matchup by matchup, and give you a straight answer on
          who wins the deal.
        </p>
      </div>
      <TradeAnalyzer />
    </main>
  );
}
