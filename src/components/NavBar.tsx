"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Start/Sit" },
  { href: "/trade", label: "Trade Analyzer" },
  { href: "/backtest", label: "Backtest" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-200/80 bg-background/80 backdrop-blur dark:border-zinc-800/80">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">
            S
          </span>
          <span className="text-sm font-semibold tracking-tight">Legitfootball</span>
        </Link>
        <div className="flex gap-5 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative py-1 transition-colors ${
                  active
                    ? "font-medium text-foreground"
                    : "text-zinc-500 hover:text-foreground"
                }`}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-0 -bottom-[13px] h-0.5 rounded-full bg-indigo-600" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
