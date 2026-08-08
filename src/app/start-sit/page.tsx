import { StartSitTool } from "@/components/StartSitTool";

export default function StartSitPage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mb-7">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Legitfootball · Start / Sit
        </span>
        <h1
          className="mt-2 text-[34px] leading-none tracking-[-0.01em] text-foreground"
          style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
        >
          START / SIT
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-foreground/60">
          Who to start when two players compete for one spot.
        </p>
      </header>
      <StartSitTool />
    </main>
  );
}
