"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { advancedColumns, formatColumn, standardColumns } from "@/lib/stats/columns";
import type { LeaderboardRow, StatsPosition } from "@/lib/stats/types";
import { SCORING_FORMAT_OPTIONS } from "./ScoringFormatToggle";
import { SegmentedControl } from "./SegmentedControl";

const POSITIONS: { value: StatsPosition; label: string }[] = [
  { value: "QB", label: "QB" },
  { value: "RB", label: "RB" },
  { value: "WR", label: "WR" },
  { value: "TE", label: "TE" },
  { value: "K", label: "K" },
];

const VIEWS = [
  { value: "standard" as const, label: "Standard" },
  { value: "advanced" as const, label: "Advanced" },
];

/**
 * Lowercase and drop everything that isn't a letter or digit, so "jamarr"
 * finds "Ja'Marr Chase" and "aj brown" finds "A.J. Brown".
 */
function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function StatsBrowser() {
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [position, setPosition] = useState<StatsPosition>("QB");
  const [view, setView] = useState<"standard" | "advanced">("standard");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [season, setSeason] = useState<number | null>(null);
  // null = "whatever the server defaults to" (the last completed season), so
  // the toggle doesn't need to know the calendar before the first response.
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [lastCompletedSeason, setLastCompletedSeason] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortId, setSortId] = useState("points");
  const [ascending, setAscending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/stats response (an external system), keyed on the position/format deps below; the cancelled flag guards against a stale response landing after a newer request starts.
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ position, scoringFormat });
    if (selectedSeason != null) params.set("season", String(selectedSeason));
    fetch(`/api/stats?${params}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't load stats.");
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        setRows(body.rows);
        setSeason(body.season);
        setLastCompletedSeason(body.context?.lastCompletedSeason ?? null);
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [position, scoringFormat, selectedSeason]);

  const columns = useMemo(
    () => (view === "advanced" ? advancedColumns(position) : standardColumns(position)),
    [view, position]
  );

  const sortColumn = columns.find((col) => col.id === sortId) ?? columns[0];

  /**
   * Rank is assigned BEFORE filtering, so a searched player keeps their real
   * standing in the current sort — a filtered table that renumbered from 1
   * would say the guy you looked up is the best at his position.
   *
   * Rows with no value for the sorted column always sort last, in both
   * directions: "—" is missing data, not a low score, so floating it to the
   * top on an ascending sort would be a lie.
   */
  const ranked = useMemo(() => {
    if (!rows) return null;
    return [...rows]
      .sort((a, b) => {
        const left = sortColumn.value(a);
        const right = sortColumn.value(b);
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return ascending ? left - right : right - left;
      })
      .map((row, index) => ({ row, rank: index + 1 }));
  }, [rows, sortColumn, ascending]);

  const visible = useMemo(() => {
    if (!ranked) return null;
    const needle = normalize(query);
    if (!needle) return ranked;
    return ranked.filter(
      ({ row }) => normalize(row.name).includes(needle) || normalize(row.team ?? "").startsWith(needle)
    );
  }, [ranked, query]);

  function toggleSort(id: string) {
    if (id === sortId) {
      setAscending((prev) => !prev);
    } else {
      setSortId(id);
      setAscending(false);
    }
  }

  // The completed season and the one after it — derived, not hardcoded, so
  // this rolls forward on its own. Hidden until the first response tells us
  // where the calendar actually is.
  const activeSeason = selectedSeason ?? season;
  const seasonOptions =
    lastCompletedSeason == null
      ? []
      : [lastCompletedSeason, lastCompletedSeason + 1].map((year) => ({
          value: String(year),
          label: String(year),
        }));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
        <SegmentedControl label="Position" options={POSITIONS} value={position} onChange={setPosition} />
        {seasonOptions.length > 1 && (
          <SegmentedControl
            label="Season"
            options={seasonOptions}
            value={String(activeSeason ?? "")}
            onChange={(next) => setSelectedSeason(Number(next))}
            tone="secondary"
          />
        )}
        <SegmentedControl label="Columns" options={VIEWS} value={view} onChange={setView} tone="secondary" />
        <SegmentedControl
          label="Scoring"
          options={SCORING_FORMAT_OPTIONS}
          value={scoringFormat}
          onChange={setScoringFormat}
          tone="secondary"
        />
        <div className="min-w-0 grow basis-[240px] sm:max-w-xs">
          <span className="mb-1.5 block font-engraved text-[9.5px] uppercase tracking-[0.12em] text-foreground/55">
            Search
          </span>
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-foreground/40"
              fill="none"
              aria-hidden
            >
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a player…"
              aria-label={`Search ${position} players`}
              className="w-full rounded-full border border-foreground/12 bg-surface-sunken py-1.5 pl-9 pr-8 text-[13px] text-foreground placeholder:text-foreground/40 focus:border-accent/50 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px] leading-none text-foreground/45 transition-colors hover:text-foreground"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-bad/30 bg-bad/10 px-4 py-3 text-[13px] text-foreground">
          {error}
        </div>
      )}

      {loading && !error && <p className="text-[13px] text-foreground/55">Loading {position} stats…</p>}

      {/* A search that misses in the current position is the obvious trap here
          — the table only ever holds one position, so looking up a RB while
          the QB tab is open finds nothing. Rather than a dead end, offer the
          other positions; the query carries over. */}
      {/* A season the feed has no rows for yet — most obviously an upcoming
          season before kickoff — is not a failed search, and the
          "no matches" copy below would read as one. */}
      {!loading && !error && ranked?.length === 0 && (
        <div className="rounded-[12px] border border-foreground/12 px-4 py-5 text-[13px] text-foreground/70">
          <p>No {season} stats yet.</p>
          <p className="mt-1.5 text-foreground/55">
            {lastCompletedSeason != null && season != null && season > lastCompletedSeason
              ? "That season hasn't kicked off — stats appear once games are played."
              : "Nothing came back for this position and season."}
          </p>
        </div>
      )}

      {!loading && !error && ranked != null && ranked.length > 0 && visible?.length === 0 && (
        <div className="rounded-[12px] border border-foreground/12 px-4 py-5 text-[13px] text-foreground/70">
          <p>
            No {position} matches “{query}”.
          </p>
          <p className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-foreground/55">Try</span>
            {POSITIONS.filter((option) => option.value !== position).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPosition(option.value)}
                className="rounded-full bg-foreground/8 px-2.5 py-1 font-engraved text-[10px] uppercase tracking-[0.08em] text-foreground/75 transition-colors hover:bg-foreground/15 hover:text-foreground"
              >
                {option.label}
              </button>
            ))}
          </p>
        </div>
      )}

      {!loading && !error && visible && visible.length > 0 && (
        <>
          <div className="glass-card overflow-x-auto rounded-[12px]">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-foreground/12">
                  <th className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/55">
                    Player
                  </th>
                  {columns.map((col) => (
                    <th key={col.id} className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className={`whitespace-nowrap font-engraved text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-foreground ${
                          sortColumn.id === col.id ? "text-accent" : "text-foreground/55"
                        }`}
                      >
                        {col.label}
                        {sortColumn.id === col.id && <span aria-hidden>{ascending ? " ↑" : " ↓"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(({ row, rank }) => (
                  <tr
                    key={row.playerId}
                    className="border-b border-foreground/8 last:border-b-0 hover:bg-foreground/[0.04]"
                  >
                    <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                      <Link href={`/stats/${row.playerId}`} className="flex items-center gap-2.5 hover:text-accent">
                        <span className="w-6 shrink-0 text-right font-mono text-[11px] text-foreground/45">
                          {rank}
                        </span>
                        <span className="whitespace-nowrap font-medium text-foreground">{row.name}</span>
                        <span className="whitespace-nowrap font-mono text-[11px] text-foreground/45">
                          {row.team ?? "FA"}
                        </span>
                      </Link>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={`px-3 py-2 text-right font-mono tabular-nums ${
                          sortColumn.id === col.id ? "text-foreground" : "text-foreground/75"
                        }`}
                      >
                        {formatColumn(col.value(row), col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {view === "advanced" && position !== "K" && (
            <p className="mt-3 text-[12px] text-foreground/45">
              Snap, target and air-yards share are per-game averages from nflverse, joined by name — a
              player whose name doesn&rsquo;t match shows “—” rather than a guess. The rate columns are
              derived from the season totals.
            </p>
          )}
        </>
      )}
    </div>
  );
}
