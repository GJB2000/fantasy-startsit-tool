"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScoringFormat } from "@/lib/useScoringFormat";
import type { ScoringFormat } from "@/lib/sportsdata/types";

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

const LINKS: { href: string; label: string; icon: React.ReactNode }[] = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/start-sit",
    label: "Start/Sit",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <path d="M8 7l-5 5 5 5M16 7l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/trade",
    label: "Trade Analyzer",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <path
          d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/waivers",
    label: "Waivers",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/lineup",
    label: "Lineup",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <rect x="3" y="4" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="10" width="18" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="16" width="10" height="4" rx="1.3" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: "/backtest",
    label: "Backtest",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <path d="M4 20V10M12 20V4M20 20v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * Site-wide navigation shell — replaces the old top NavBar with a
 * persistent sidebar, deliberately kept a fixed dark navy in BOTH light
 * and dark mode (a "broadcast desk" choice, unlike every other surface
 * in this app, which follows the theme toggle) as a nod to the app's
 * existing Prime Time (navy/electric-blue) branding. Collapses to a
 * horizontal scrolling bar below the `md` breakpoint rather than a
 * hamburger menu, since the link list is short enough to stay usable
 * that way.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scoringFormat] = useScoringFormat();

  return (
    <div className="flex min-h-full w-full flex-col md:flex-row">
      <aside
        className="flex shrink-0 flex-row items-center gap-3 overflow-x-auto border-b border-white/[0.07] px-4 py-3
          md:sticky md:top-0 md:h-screen md:w-[236px] md:flex-col md:items-stretch md:gap-7 md:overflow-visible md:border-b-0 md:border-r md:px-4 md:py-6"
        style={{ background: "linear-gradient(185deg, #0b1220 0%, #060a13 100%)" }}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5 px-1">
          <span
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
            style={{
              background: "linear-gradient(135deg, #2f7dff, #1552c9)",
              boxShadow: "0 4px 14px -4px rgba(47, 125, 255, 0.7)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 12l9-5M12 12v10M12 12L3 7" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="hidden text-[14.5px] font-bold tracking-tight text-white md:inline">Legitfootball</span>
        </Link>

        <nav className="flex flex-row gap-1 md:flex-col md:gap-0.5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                  active ? "text-white" : "text-[#7788a8] hover:bg-white/5 hover:text-[#dbe4f5]"
                }`}
                style={active ? { background: "rgba(47, 125, 255, 0.16)" } : undefined}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:mt-auto md:flex md:flex-col md:gap-2 md:border-t md:border-white/[0.07] md:pt-4">
          <div className="flex items-center justify-between rounded-[9px] bg-white/[0.04] px-2.5 py-2 text-xs">
            <span className="text-[#7788a8]">Scoring</span>
            <span
              className="font-rounded rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ background: "rgba(47, 125, 255, 0.25)" }}
            >
              {FORMAT_LABEL[scoringFormat]}
            </span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
