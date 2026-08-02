"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerSummary } from "@/lib/sportsdata/types";

interface PlayerMultiSelectProps {
  selected: PlayerSummary[];
  onAdd: (player: PlayerSummary) => void;
  onRemove: (playerId: number) => void;
  /** Omit for an unbounded selection (e.g. a whole roster) — no counter, input never disables. */
  max?: number;
  label?: string;
  /** IDs to exclude beyond `selected` itself — e.g. the trade analyzer's other side. */
  extraExcludeIds?: number[];
  placeholder?: (selectedCount: number) => string;
  maxReachedPlaceholder?: string;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Position accent CSS vars (defined in globals.css, theme-aware). Used
// only as a scanning aid in the picker, never as semantic color.
const POS_VAR: Record<string, string> = {
  QB: "var(--pos-qb)",
  RB: "var(--pos-rb)",
  WR: "var(--pos-wr)",
  TE: "var(--pos-te)",
  K: "var(--pos-k)",
  DST: "var(--pos-dst)",
};
function posVar(position: string): string {
  return POS_VAR[position] ?? "var(--foreground)";
}

function defaultPlaceholder(selectedCount: number): string {
  return selectedCount === 0 ? "Search a player…" : "Search another player…";
}

/**
 * Player avatar — a position-tinted initials tile. (SportsDataIO's
 * low-res headshots were too muddy to be worth showing; reverted to
 * initials, keeping the position color as the scanning cue.)
 */
function Avatar({ player, size }: { player: PlayerSummary; size: number }) {
  const color = posVar(player.position);
  return (
    <span
      className="flex shrink-0 items-center justify-center font-display font-semibold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        fontSize: Math.round(size * 0.4),
        background: `linear-gradient(150deg, ${color}, color-mix(in srgb, ${color} 55%, #000))`,
      }}
    >
      {initials(player.name)}
    </span>
  );
}

function SelectedCard({ player, onRemove }: { player: PlayerSummary; onRemove: () => void }) {
  return (
    <div className="relative flex items-center gap-2.5 rounded-2xl border border-foreground/10 bg-surface-sunken py-2 pl-2 pr-3.5 shadow-sm">
      <Avatar player={player} size={36} />
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-semibold leading-tight tracking-tight">{player.name}</div>
        <div className="text-[11px] text-foreground/45">
          {player.position}
          {player.team ? ` · ${player.team}` : ""}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-foreground/15 bg-surface text-[11px] text-foreground/40 shadow-sm transition-colors hover:border-bad hover:text-bad"
        aria-label={`Remove ${player.name}`}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Shared player-selection pattern used everywhere a tool lets a user pick
 * one or more players: real headshots + position-coded avatars, chips
 * above the input as cards, a slot-dot counter, and a search field that
 * disables with an explanatory placeholder once max is reached. Fully
 * controlled — selection state stays owned by each tool; this component
 * only renders the interaction and does its own search fetch.
 */
export function PlayerMultiSelect({
  selected,
  onAdd,
  onRemove,
  max,
  label,
  extraExcludeIds,
  placeholder = defaultPlaceholder,
  maxReachedPlaceholder,
}: PlayerMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const atMax = max != null && selected.length >= max;
  const excludeIds = [...selected.map((p) => p.playerId), ...(extraExcludeIds ?? [])];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || atMax) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.players ?? []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, atMax]);

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const visibleResults = results.filter((p) => !excludeIds.includes(p.playerId));

  function handleSelect(player: PlayerSummary) {
    onAdd(player);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div>
      {(label || max != null) && (
        <div className="mb-2.5 flex items-center justify-between gap-3">
          {label ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">{label}</span>
          ) : (
            <span />
          )}
          {max != null && (
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1" aria-hidden>
                {Array.from({ length: max }, (_, i) => (
                  <span
                    key={i}
                    className={`h-[5px] w-5 rounded-full transition-colors ${
                      i < selected.length ? "bg-accent" : "bg-foreground/15"
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-xs text-foreground/45 tabular-nums">
                {selected.length} of {max}
              </span>
            </div>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2.5">
          {selected.map((player) => (
            <SelectedCard key={player.playerId} player={player} onRemove={() => onRemove(player.playerId)} />
          ))}
        </div>
      )}

      <div className="relative" ref={containerRef}>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (!atMax && query.trim() && results.length > 0) setIsOpen(true);
          }}
          disabled={atMax}
          placeholder={
            atMax
              ? (maxReachedPlaceholder ?? `Maximum ${max} selected — remove one to add another`)
              : placeholder(selected.length)
          }
          className="w-full rounded-2xl border border-foreground/15 bg-surface pl-11 pr-4 py-3.5 text-sm text-foreground shadow-sm outline-none transition-shadow placeholder:text-foreground/35 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isOpen && !atMax && query.trim() && (loading || visibleResults.length > 0) && (
          <ul className="absolute z-10 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-foreground/10 bg-surface shadow-xl">
            {loading && <li className="px-4 py-3 text-sm text-foreground/50">Searching…</li>}
            {!loading &&
              visibleResults.map((player) => (
                <li key={player.playerId} className="border-t border-foreground/[0.06] first:border-t-0">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(player)}
                    className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/[0.08]"
                  >
                    <Avatar player={player} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold tracking-tight">{player.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-foreground/45">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-white"
                          style={{ background: posVar(player.position) }}
                        >
                          {player.position}
                        </span>
                        {player.team ?? ""}
                        {player.injuryStatus && (
                          <span className="rounded-full bg-caution/15 px-2 py-0.5 text-[10px] font-semibold text-caution">
                            {player.injuryStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                      Add
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
