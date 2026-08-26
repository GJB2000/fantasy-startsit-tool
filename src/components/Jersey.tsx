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
