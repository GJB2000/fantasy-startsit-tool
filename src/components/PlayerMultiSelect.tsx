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

function defaultPlaceholder(selectedCount: number): string {
  return selectedCount === 0 ? "Search a player…" : "Search another player…";
}

function Chip({ player, onRemove }: { player: PlayerSummary; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-foreground/10 bg-surface py-1.5 pl-1.5 pr-2 text-xs shadow-sm">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/12 text-[10px] font-bold text-accent">
        {initials(player.name)}
      </span>
      <span className="rounded-full bg-foreground/[0.07] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
        {player.position}
      </span>
      <span className="font-medium text-foreground">{player.name}</span>
      {player.team && <span className="text-foreground/40">{player.team}</span>}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-1 text-foreground/35 transition-colors hover:bg-bad/10 hover:text-bad"
        aria-label={`Remove ${player.name}`}
      >
        ✕
      </button>
    </div>
  );
}

/**
 * Shared player-selection pattern used everywhere a tool lets a user pick
 * one or more players: chips above the input, an empty/ready input after
 * each pick, a selected-count vs. max counter, and a disabled input with
 * an explanatory placeholder once max is reached (rather than the input
 * disappearing). Fully controlled — selection state stays owned by each
 * tool (some of it backed by shared hooks like useRosteredPlayers), this
 * component only renders the interaction and does its own search fetch.
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
        <div className="mb-2 flex items-center justify-between gap-3">
          {label ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground/40">{label}</span>
          ) : (
            <span />
          )}
          {max != null && (
            <span className="font-mono text-xs text-foreground/45">
              {selected.length}/{max} selected
            </span>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {selected.map((player) => (
            <Chip key={player.playerId} player={player} onRemove={() => onRemove(player.playerId)} />
          ))}
        </div>
      )}

      <div className="relative" ref={containerRef}>
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
          className="w-full rounded-2xl border border-foreground/10 bg-surface text-foreground px-4 py-3 text-sm shadow-sm outline-none transition-shadow placeholder:text-foreground/35 focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isOpen && !atMax && query.trim() && (loading || visibleResults.length > 0) && (
          <ul className="absolute z-10 mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-foreground/10 bg-surface shadow-xl divide-y divide-foreground/[0.06]">
            {loading && <li className="px-4 py-2.5 text-sm text-foreground/50">Searching…</li>}
            {!loading &&
              visibleResults.map((player) => (
                <li key={player.playerId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(player)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent/[0.07]"
                  >
                    <span>
                      {player.name}{" "}
                      <span className="text-foreground/50">
                        {player.position}
                        {player.team ? ` · ${player.team}` : ""}
                      </span>
                    </span>
                    {player.injuryStatus && (
                      <span className="ml-2 rounded-full bg-caution/15 px-2 py-0.5 text-xs font-medium text-caution">
                        {player.injuryStatus}
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
