"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Wraps a player's name so it navigates to their stats page.
 *
 * D/ST deliberately does NOT link. SportsDataIO models a team defence as a
 * team stat with no player row, so the stats pages exclude it throughout
 * (item 159) and `/stats/<synthetic id>` renders a real page with zero games
 * and all-zero totals. Landing there reads as broken rather than honest, so a
 * defence renders as plain text instead. Same for a player we couldn't resolve
 * to an ID at all.
 *
 * Carries the page you're leaving as `?from=`, so the stats card can offer a
 * way back to the tool you clicked from rather than stranding you (see
 * BackToToolLink).
 *
 * Deliberately NOT used inside the player picker (clicking there selects a
 * player) or inside the Waivers/Lineup rows, whose whole row is a <button> —
 * an <a> nested in a <button> is invalid HTML, so those need their expand
 * interaction reworked first.
 */
export function PlayerLink({
  playerId,
  position,
  className = "",
  children,
}: {
  playerId: number | null;
  position: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (playerId == null || position === "DST") return <>{children}</>;
  const href = pathname ? `/stats/${playerId}?from=${encodeURIComponent(pathname)}` : `/stats/${playerId}`;
  return (
    <Link href={href} className={`transition-colors hover:text-accent ${className}`}>
      {children}
    </Link>
  );
}
