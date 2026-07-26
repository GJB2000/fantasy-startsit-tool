"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerSummary } from "@/lib/sportsdata/types";

interface PlayerSearchInputProps {
  onSelect: (player: PlayerSummary) => void;
  excludeIds: number[];
  placeholder?: string;
}

export function PlayerSearchInput({ onSelect, excludeIds, placeholder }: PlayerSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
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
  }, [query]);

  const visibleResults = results.filter((p) => !excludeIds.includes(p.playerId));

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder ?? "Search a player…"}
        className="w-full rounded-2xl border border-foreground/10 bg-surface text-foreground px-4 py-3 text-sm shadow-sm outline-none transition-shadow placeholder:text-foreground/35 focus:border-accent focus:ring-4 focus:ring-accent/15"
      />
      {isOpen && query.trim() && (loading || visibleResults.length > 0) && (
        <ul className="absolute z-10 mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-foreground/10 bg-surface shadow-xl divide-y divide-foreground/[0.06]">
          {loading && <li className="px-4 py-2.5 text-sm text-foreground/50">Searching…</li>}
          {!loading &&
            visibleResults.map((player) => (
              <li key={player.playerId}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(player);
                    setQuery("");
                    setResults([]);
                    setIsOpen(false);
                  }}
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
  );
}
