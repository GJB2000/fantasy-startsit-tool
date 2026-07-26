import { TradeAnalyzer } from "@/components/TradeAnalyzer";

export default function TradePage() {
  return (
    <main className="flex-1 bg-background px-6 py-12 font-sans text-foreground sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          Legitfootball · Trade Analyzer
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Is this trade worth it?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
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
