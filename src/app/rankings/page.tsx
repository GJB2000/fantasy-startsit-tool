import { RankingsTool } from "@/components/RankingsTool";

export default function RankingsPage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mx-auto w-full max-w-5xl mb-7">
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
          PLAYER RANKINGS
        </h1>
      </header>
      <RankingsTool />
    </main>
  );
}
