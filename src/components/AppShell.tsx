"use client";

import { useEffect, useState } from "react";
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

const RAIL_BG = "linear-gradient(185deg, #241d13 0%, #1a150d 100%)";
const RAIL_BORDER = "rgba(220, 195, 150, 0.13)";

/** The Legitfootball mark: block "L", a vertical football with laces, block "F". */
function LogoTile({ size = 30 }: { size?: number }) {
  const bg = "#191817";
  const fg = "#f4efe4";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[7px]"
      style={{
        width: size,
        height: size,
        background: bg,
        boxShadow: "0 4px 14px -5px rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(244, 239, 228, 0.12)",
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: size * 0.72, height: size * 0.72 }}>
        {/* L */}
        <path d="M17 30 H28 V61 H39 V70 H17 Z" fill={fg} />
        {/* F */}
        <path d="M72 30 H91 V39 H83 V45.5 H88 V54.5 H83 V70 H72 Z" fill={fg} />
        {/* Football */}
        <ellipse cx="50" cy="50" rx="12.5" ry="22" fill={fg} />
        <line x1="50" y1="33" x2="50" y2="67" stroke={bg} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="44.5" y1="43" x2="55.5" y2="43" stroke={bg} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="44.5" y1="50" x2="55.5" y2="50" stroke={bg} strokeWidth="2.2" strokeLinecap="round" />
        <line x1="44.5" y1="57" x2="55.5" y2="57" stroke={bg} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/**
 * Site-wide navigation shell — a persistent sidebar kept a fixed dark
 * "espresso rail" in BOTH light and night mode (a deliberate constant
 * spine / masthead, unlike the editorial pages it frames, which switch
 * with the theme). Styled to the almanac: a Jost wordmark under an
 * engraved "Fantasy Almanac" line, engraved section/footer labels,
 * pine-green active state on warm espresso. Below the `md` breakpoint it
 * collapses to a slim top bar with a hamburger that slides the same rail
 * in as a left drawer (with a scrim), rather than a horizontal scrolling
 * strip.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scoringFormat] = useScoringFormat();
  const [rosterOpen, setRosterOpen] = useRosterModal();
  const [connection] = useSleeperConnection();
  const { rostered } = useRosteredPlayers();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer whenever the route changes (covers link taps,
  // including to the current page where onClick alone wouldn't re-fire).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberately syncing drawer state to route changes (an external navigation event), not deriving state from props.
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-full w-full flex-col md:flex-row">
      {/* Mobile top bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-2.5 md:hidden"
        style={{ background: RAIL_BG, borderColor: RAIL_BORDER }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-[4px] text-[#d8cdb8] transition-colors hover:bg-white/[0.06]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <LogoTile size={26} />
          <span className="font-jost text-[15px] font-semibold text-[#f0e9db]">Legitfootball</span>
        </Link>
        <button
          type="button"
          onClick={() => setRosterOpen(true)}
          aria-label="Manage your roster"
          className="flex items-center gap-1.5 rounded-[4px] bg-white/[0.06] px-2.5 py-1.5 text-[12px] font-medium text-[#d8cdb8] transition-colors hover:bg-white/[0.1]"
        >
          <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none">
            <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {connection && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#6fcfa0" }} />}
          <span className="font-mono text-[11px] font-bold text-[#f0e9db]">{rostered.length}</span>
        </button>
      </div>

      {/* Mobile drawer scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Rail — desktop static sidebar / mobile left drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[262px] flex-col gap-7 overflow-y-auto border-r px-4 py-6 transition-transform duration-300 ease-out md:sticky md:top-0 md:z-auto md:h-screen md:w-[236px] md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: RAIL_BG, borderColor: RAIL_BORDER }}
      >
        {/* masthead */}
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2.5 px-1">
            <LogoTile />
            <span className="flex flex-col leading-none">
              <span className="font-jost text-[16px] font-semibold text-[#f0e9db]">Legitfootball</span>
              <span className="mt-1 font-engraved text-[8.5px] uppercase tracking-[0.18em] text-[#b89768]">
                Fantasy Almanac
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#9a8f7a] transition-colors hover:bg-white/[0.06] md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          <span className="mb-1.5 px-2.5 font-engraved text-[9px] uppercase tracking-[0.18em] text-[#8a7f6c]">Tools</span>
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-[4px] px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                  active ? "" : "text-[#9a8f7a] hover:bg-white/5 hover:text-[#ece5d5]"
                }`}
                style={active ? { background: "rgba(79, 168, 120, 0.16)", color: "#6fcfa0" } : undefined}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t pt-4" style={{ borderColor: RAIL_BORDER }}>
          <button
            type="button"
            onClick={() => setRosterOpen(true)}
            className="flex flex-col gap-0.5 rounded-[4px] bg-white/[0.04] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.08]"
          >
            <span className="flex items-center justify-between">
              <span className="font-engraved text-[9.5px] uppercase tracking-[0.12em] text-[#9a8f7a]">My roster</span>
              <span className="font-mono text-[11px] font-bold text-[#f0e9db]">{rostered.length}</span>
            </span>
            <span className="truncate text-[11px] text-[#8a7f6c]">
              {connection ? connection.leagueName : "Connect Sleeper →"}
            </span>
          </button>
          <div className="flex items-center justify-between rounded-[4px] bg-white/[0.04] px-2.5 py-2">
            <span className="font-engraved text-[9.5px] uppercase tracking-[0.12em] text-[#9a8f7a]">Scoring</span>
            <span
              className="font-mono rounded-[3px] px-2 py-0.5 text-[11px] font-bold text-[#f0e9db]"
              style={{ background: "rgba(79, 168, 120, 0.28)" }}
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
