"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Start/Sit" },
  { href: "/trade", label: "Trade Analyzer" },
  { href: "/waivers", label: "Waivers" },
  { href: "/backtest", label: "Backtest" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-b border-black/[0.06] bg-surface-glass backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.08]">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-7 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent/70">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-accent-ink">
              <path
                d="M4 12c2-5 5-8 8-8s6 3 8 8c-2 5-5 8-8 8s-6-3-8-8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              />
              <path
                d="M8 12h8M11 9l1.5 3-1.5 3M13 9l-1.5 3 1.5 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Legitfootball</span>
        </Link>

        <div className="flex gap-0.5 rounded-full bg-foreground/[0.06] p-[3px] text-[13px] font-medium">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 transition-colors ${
                  active ? "bg-surface text-foreground shadow-sm" : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
