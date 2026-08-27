"use client";

import { useJerseyData } from "@/lib/useJerseyData";

/**
 * A player's jersey: real team colours, real squad number.
 *
 * Replaces initials as the avatar. Every value is real data — SportsDataIO's
 * /Teams carries each club's primary colour, and 96% of skill players have a
 * squad number. A player without one (or on no team) falls back to a plain
 * shirt, never a fabricated number.
 */
export function Jersey({
  playerId,
  team,
  size = 34,
}: {
  playerId: number | null;
  team: string | null;
  size?: number;
}) {
  const { colors, numbers } = useJerseyData();
  const number = playerId != null ? (numbers[playerId] ?? null) : null;
  const c = (team && colors[team]) || { primary: "#3a3f52", secondary: "#ffffff", ink: "light" as const };
  const ink = c.ink === "light" ? "#ffffff" : "#12151c";
  const label = number == null ? "" : String(number);

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" width={size} height={size} role="presentation">
        {/* A wider torso than a real shirt: the number is the point of this
            avatar, and at 28px a realistic silhouette leaves no room for two
            digits. Shoulders are suggested, not drawn in detail. */}
        <path
          d="M12.6 7.2 L20 10.4 L27.4 7.2 L34 10.8 A1.7 1.7 0 0 1 34.7 13 L32.2 18.4 A1.6 1.6 0 0 1 30.1 19.2 L29 18.7 V33 A1.7 1.7 0 0 1 27.3 34.7 H12.7 A1.7 1.7 0 0 1 11 33 V18.7 L9.9 19.2 A1.6 1.6 0 0 1 7.8 18.4 L5.3 13 A1.7 1.7 0 0 1 6 10.8 Z"
          fill={c.primary}
        />
        <path d="M12.6 7.2 L20 10.4 L27.4 7.2 L25.1 5.9 A10.5 10.5 0 0 1 14.9 5.9 Z" fill={c.secondary} opacity={0.85} />
        {label && (
          <text
            x="20"
            y="29"
            textAnchor="middle"
            fill={ink}
            style={{
              fontFamily: "var(--font-jost), sans-serif",
              fontWeight: 600,
              fontSize: label.length > 1 ? 16 : 18,
              letterSpacing: label.length > 1 ? "-0.05em" : "-0.02em",
            }}
          >
            {label}
          </text>
        )}
      </svg>
    </span>
  );
}

// Position accent CSS vars (globals.css, theme-aware) — a scanning cue, not
// semantic color. Applied inline since they aren't Tailwind utilities.
const POS_VAR: Record<string, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
  K: "var(--pos-k)",
  DST: "var(--pos-dst)",
};

/**
 * The player avatar every surface should use: a real jersey for a real person,
 * and a position-tinted team-code tile for a D/ST, which is a team rather than
 * a player and so has no jersey or squad number of its own.
 *
 * Only D/ST falls back. Kickers were originally lumped in with it as the other
 * "streaming" position, but that conflated a fantasy-roster concept with a
 * rendering one — a kicker is a person who wears a shirt, and the data has his
 * number (Butker is 7). D/ST is the only entry here with a synthetic PlayerID
 * and no number to show.
 *
 * That fallback is the whole reason this exists as one component. It was
 * written independently in WaiverResult and LineupResult and simply omitted in
 * TradeResult (so a traded defence rendered as a blank shirt), and adding the
 * avatar to the Home widgets would have made four and five copies of the same
 * branch. One definition means the surfaces can't drift.
 */
export function PlayerAvatar({
  playerId,
  team,
  position,
  size = 34,
}: {
  playerId: number | null;
  team: string | null;
  position: string | null;
  size?: number;
}) {
  if (position !== "DST") {
    return <Jersey playerId={playerId} team={team} size={size} />;
  }
  const color = POS_VAR[position] ?? "var(--foreground)";
  return (
    <span
      className="flex shrink-0 items-center justify-center font-display font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        fontSize: Math.round(size * 0.3),
        color: "var(--premium-ink)",
        background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 58%, #000))`,
      }}
    >
      {team ?? ""}
    </span>
  );
}
