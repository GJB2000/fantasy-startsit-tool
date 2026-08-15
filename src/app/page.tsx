import Link from "next/link";
import { HomeLineupWidget } from "@/components/HomeLineupWidget";
import { HomeRankingsBoard } from "@/components/HomeRankingsBoard";
import { HomeTradeWidget } from "@/components/HomeTradeWidget";
import { HomeWaiverWidget } from "@/components/HomeWaiverWidget";
import { RecentComparisonsHomeCard } from "@/components/RecentComparisonsHomeCard";

const TOOLS = [
  {
    href: "/start-sit",
    label: "Start/Sit",
    title: "Settle a tough lineup call",
    description:
      "Compare players competing for the same spot and get a clear pick, with the reasoning behind it.",
    icon: (
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/trade",
    label: "Trade Analyzer",
    title: "Know if a trade is worth it",
    description:
      "Enter both sides and get a good, fair, or bad verdict based on rest-of-season value.",
    icon: (
      <path
        d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    href: "/waivers",
    label: "Waivers",
    title: "Find your best pickup",
    description: "Ranks the available pool by recent opportunity and flags buy-low targets, with a drop to pair.",
    icon: (
      <>
        <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/lineup",
    label: "Lineup",
    title: "Build your best lineup",
    description:
      "Import your roster, set your league's slots, and get the highest-projected starting lineup.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="10" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="16" width="10" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
  },
  {
    href: "/rankings",
    label: "Legit Rankings",
    title: "See the position rankings",
    description: "The top QBs, RBs, WRs, and TEs scored 1–100 by the same engine as every tool — plus a cross-position Top 100.",
    icon: (
      <>
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M7 4h10v5a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M7 6H4v1a4 4 0 004 3.87M17 6h3v1a4 4 0 01-4 3.87" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/backtest",
    label: "Backtest",
    title: "See how the engine performs",
    description: "Replay the engine against completed seasons and see how often it got the call right.",
    icon: <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  },
];

export default function HomePage() {
  return (
    <main className="matchup-page min-h-full px-6 py-10 font-sans sm:px-10 sm:py-12">
      <header className="mb-7">
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
          FANTASY TOOLKIT
        </h1>
      </header>

      <HomeRankingsBoard />

      <div className="mb-8">
        <h2 className="mb-3 font-engraved text-[12px] uppercase tracking-[0.1em] text-foreground/50">This week</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <HomeLineupWidget />
          <HomeWaiverWidget />
          <HomeTradeWidget />
          <RecentComparisonsHomeCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group glass-card rounded-2xl border border-foreground/12 p-5 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-accent/12 text-accent">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                  {tool.icon}
                </svg>
              </span>
              <span className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">{tool.label}</span>
            </div>
            <h2 className="mt-3 font-jost text-[19px] font-semibold tracking-[-0.01em]">{tool.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/55">{tool.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
              Open
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
