import { WaiverTool } from "@/components/WaiverTool";

export default function WaiversPage() {
  return (
    <main className="relative flex-1 overflow-hidden bg-background px-6 py-16 font-sans text-foreground sm:py-20">
      <div
        aria-hidden
        className="hero-glow pointer-events-none absolute left-1/2 top-[-160px] h-[420px] w-[640px] -translate-x-1/2"
      />
      <div className="relative mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          Legitfootball · Waiver Wire
        </span>
        <h1 className="mt-5 text-[2.75rem] font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl">
          Who&apos;s worth
          <br />
          <span className="text-foreground/45">a pickup?</span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-foreground/60">
          We look for players getting real opportunity — volume, snaps, targets — who haven&apos;t
          been paid off in points yet. Mark who&apos;s already on your roster, and we&apos;ll
          filter them out and suggest who to drop.
        </p>
      </div>
      <WaiverTool />
    </main>
  );
}
