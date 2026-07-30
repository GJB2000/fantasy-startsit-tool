"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRosteredPlayers } from "@/lib/useRosteredPlayers";
import { useRosterModal } from "@/lib/useRosterModal";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { useSleeperConnection } from "@/lib/useSleeperConnection";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import { RosterManager } from "./RosterManager";

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
    href: "/rankings",
    label: "Legit Rankings",
    icon: (
      <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none">
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M7 4h10v5a5 5 0 01-10 0V4z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M7 6H4v1a4 4 0 004 3.87M17 6h3v1a4 4 0 01-4 3.87" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
 * persistent sidebar, deliberately kept a fixed near-black in BOTH
 * light and dark mode (a "broadcast desk" choice, unlike every other
 * surface in this app, which follows the theme toggle) as a nod to the
 * app's dark/emerald "data-grade" branding. Collapses to a horizontal
 * scrolling bar below the `md` breakpoint rather than a hamburger menu,
 * since the link list is short enough to stay usable that way.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scoringFormat] = useScoringFormat();
  const [rosterOpen, setRosterOpen] = useRosterModal();
  const [connection] = useSleeperConnection();
  const { rostered } = useRosteredPlayers();

  return (
    <div className="flex min-h-full w-full flex-col md:flex-row">
      <aside
        className="flex shrink-0 flex-row items-center gap-3 overflow-x-auto border-b border-white/[0.07] px-4 py-3
          md:sticky md:top-0 md:h-screen md:w-[236px] md:flex-col md:items-stretch md:gap-7 md:overflow-visible md:border-b-0 md:border-r md:px-4 md:py-6"
        style={{ background: "linear-gradient(185deg, #10130f 0%, #0b0e0c 100%)" }}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5 px-1">
          <span
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
            style={{
              background: "linear-gradient(135deg, #00e07f, #00b868)",
              boxShadow: "0 4px 14px -4px rgba(0, 224, 127, 0.55)",
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke="#06120c" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 12l9-5M12 12v10M12 12L3 7" stroke="#06120c" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="hidden font-display text-[16px] font-bold tracking-tight text-white md:inline">
            Legitfootball
          </span>
        </Link>

        <nav className="flex flex-row gap-1 md:flex-col md:gap-0.5">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[9px] px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                  active ? "" : "text-[#7c8983] hover:bg-white/5 hover:text-[#e4ede8]"
                }`}
                style={active ? { background: "rgba(0, 224, 127, 0.16)", color: "#00e07f" } : undefined}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile-only roster entry point — the desktop footer block below is
            md:-only, so this pins a compact roster button to the right of the
            horizontal bar (sticky right-0 keeps it reachable while the nav
            scrolls). The left fade masks nav links scrolling underneath it. */}
        <div
          className="sticky right-0 flex shrink-0 items-center py-0.5 pl-4 md:hidden"
          style={{ background: "linear-gradient(90deg, transparent, #0b0e0c 45%)" }}
        >
          <button
            type="button"
            onClick={() => setRosterOpen(true)}
            aria-label="Manage your roster"
            className="flex items-center gap-1.5 rounded-[9px] bg-white/[0.06] px-2.5 py-1.5 text-[12px] font-medium text-[#cfe3d8] transition-colors hover:bg-white/[0.1]"
          >
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none">
              <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            {connection && (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#00e07f" }} />
            )}
            <span className="font-mono text-[11px] font-bold text-white">{rostered.length}</span>
          </button>
        </div>

        <div className="hidden md:mt-auto md:flex md:flex-col md:gap-2 md:border-t md:border-white/[0.07] md:pt-4">
          <button
            type="button"
            onClick={() => setRosterOpen(true)}
            className="flex flex-col gap-0.5 rounded-[9px] bg-white/[0.04] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.08]"
          >
            <span className="flex items-center justify-between text-xs">
              <span className="text-[#7c8983]">My roster</span>
              <span className="font-mono text-[11px] font-bold text-white">{rostered.length}</span>
            </span>
            <span className="truncate text-[11px] text-[#5f6b64]">
              {connection ? connection.leagueName : "Connect Sleeper →"}
            </span>
          </button>
          <div className="flex items-center justify-between rounded-[9px] bg-white/[0.04] px-2.5 py-2 text-xs">
            <span className="text-[#7c8983]">Scoring</span>
            <span
              className="font-mono rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
              style={{ background: "rgba(0, 224, 127, 0.25)" }}
            >
              {FORMAT_LABEL[scoringFormat]}
            </span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>

      <RosterManager open={rosterOpen} onClose={() => setRosterOpen(false)} />
    </div>
  );
}
