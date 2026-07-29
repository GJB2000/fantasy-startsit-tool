import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RecentComparisonsHomeCard } from "@/components/RecentComparisonsHomeCard";

const TOOLS = [
  {
    href: "/start-sit",
    label: "Start/Sit",
    title: "Who should you start?",
    description:
      "Pick two or more players fighting for the same roster spot and get a straight answer, with the reasoning behind it.",
    icon: (
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/trade",
    label: "Trade Analyzer",
    title: "Is this trade worth it?",
    description:
      "Enter who you'd give up and who you'd get back — we'll project rest-of-season value and grade the deal.",
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
    title: "Who's worth a pickup?",
    description: "We surface players whose opportunity is running ahead of their production, with a suggested drop.",
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
    title: "Who should start this week?",
    description:
      "Import your roster from Sleeper or add players by hand, tell us your league's slots, and we'll fill out your best lineup.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="10" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="16" width="10" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.7" />
      </>
    ),
  },
  {
    href: "/backtest",
    label: "Backtest",
    title: "Does the engine actually work?",
    description: "Replay the recommendation engine against a completed season and see how often it called it right.",
    icon: <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  },
];

export default function HomePage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball"
        title="Your fantasy toolkit"
        description="Five tools, one engine — start/sit calls, trade grades, waiver targets, full-lineup optimization, and the backtested accuracy behind all of it."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-2xl border border-foreground/10 bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
                  {tool.icon}
                </svg>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">{tool.label}</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">{tool.title}</h2>
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

      <div className="mt-4 max-w-sm">
        <RecentComparisonsHomeCard />
      </div>
    </main>
  );
}
