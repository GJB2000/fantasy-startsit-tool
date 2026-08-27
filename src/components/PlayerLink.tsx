"use client";

import Link from "next/link";

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
  if (playerId == null || position === "DST") return <>{children}</>;
  return (
    <Link href={`/stats/${playerId}`} className={`transition-colors hover:text-accent ${className}`}>
      {children}
    </Link>
  );
}
