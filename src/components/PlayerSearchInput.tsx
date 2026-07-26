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
        className="w-full rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 text-foreground px-3.5 py-2.5 text-sm shadow-sm outline-none transition-shadow placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-800"
      />
      {isOpen && query.trim() && (loading || visibleResults.length > 0) && (
        <ul className="absolute z-10 mt-1.5 w-full max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 shadow-lg dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading && <li className="px-3.5 py-2.5 text-sm text-zinc-500">Searching…</li>}
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
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                >
                  <span>
                    {player.name}{" "}
                    <span className="text-zinc-500">
                      {player.position}
                      {player.team ? ` · ${player.team}` : ""}
                    </span>
                  </span>
                  {player.injuryStatus && (
                    <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-600 dark:text-amber-400">
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
