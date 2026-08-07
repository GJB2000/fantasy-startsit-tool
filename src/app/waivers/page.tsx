import { WaiverTool } from "@/components/WaiverTool";

export default function WaiversPage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mb-7">
        <span
          className="text-[11px] uppercase tracking-[0.14em] text-accent"
          style={{ fontFamily: "var(--font-engraved)" }}
        >
          Legitfootball · Waiver Wire
        </span>
        <h1
          className="mt-2 text-[34px] leading-none tracking-[-0.01em] text-foreground"
          style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
        >
          Who&apos;s worth a pickup?
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-foreground/60">
          We look for players getting real opportunity — volume, snaps, targets — who haven&apos;t been paid off in points
          yet. Mark who&apos;s already on your roster and we&apos;ll suggest who to drop.
        </p>
      </header>
      <WaiverTool />
    </main>
  );
}
