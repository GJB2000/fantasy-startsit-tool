"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { STAT_COLUMNS, formatStat } from "@/lib/stats/columns";
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

type NumericKey = {
  [K in keyof LeaderboardRow]: LeaderboardRow[K] extends number ? K : never;
}[keyof LeaderboardRow];

interface Column {
  key: NumericKey;
  label: string;
  /** One decimal place for rates/averages; counting stats stay whole. */
  decimals?: number;
}

const COLUMNS: Record<StatsPosition, Column[]> = Object.fromEntries(
  (Object.keys(STAT_COLUMNS) as StatsPosition[]).map((position) => [
    position,
    [
      { key: "points", label: "PTS", decimals: 1 },
      { key: "pointsPerGame", label: "PPG", decimals: 1 },
      { key: "games", label: "G" },
      ...STAT_COLUMNS[position],
    ] as Column[],
  ])
) as Record<StatsPosition, Column[]>;

export function StatsBrowser() {
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [position, setPosition] = useState<StatsPosition>("QB");
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [season, setSeason] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<NumericKey>("points");
  const [ascending, setAscending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/stats response (an external system), keyed on the position/format deps below; the cancelled flag guards against a stale response landing after a newer request starts.
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ position, scoringFormat });
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
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [position, scoringFormat]);

  const columns = COLUMNS[position];

  const sorted = useMemo(() => {
    if (!rows) return null;
    return [...rows].sort((a, b) => (ascending ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [rows, sortKey, ascending]);

  function toggleSort(key: NumericKey) {
    if (key === sortKey) {
      setAscending((prev) => !prev);
    } else {
      setSortKey(key);
      setAscending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end gap-x-8 gap-y-4">
        <SegmentedControl label="Position" options={POSITIONS} value={position} onChange={setPosition} />
        <SegmentedControl
          label="Scoring"
          options={SCORING_FORMAT_OPTIONS}
          value={scoringFormat}
          onChange={setScoringFormat}
          tone="secondary"
        />
      </div>

      {season && (
        <p className="mb-4 text-[13px] text-foreground/55">
          {season} season totals · {sorted?.length ?? 0} players · click a player for their game log
        </p>
      )}

      {error && (
        <div className="rounded-[10px] border border-bad/30 bg-bad/10 px-4 py-3 text-[13px] text-foreground">
          {error}
        </div>
      )}

      {loading && !error && <p className="text-[13px] text-foreground/55">Loading {position} stats…</p>}

      {!loading && !error && sorted && (
        <div className="glass-card overflow-x-auto rounded-[12px]">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-foreground/12">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/55">
                  Player
                </th>
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`font-engraved text-[10px] uppercase tracking-[0.1em] transition-colors hover:text-foreground ${
                        sortKey === col.key ? "text-accent" : "text-foreground/55"
                      }`}
                    >
                      {col.label}
                      {sortKey === col.key && <span aria-hidden>{ascending ? " ↑" : " ↓"}</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, index) => (
                <tr key={row.playerId} className="border-b border-foreground/8 last:border-b-0 hover:bg-foreground/[0.04]">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                    <Link href={`/stats/${row.playerId}`} className="flex items-center gap-2.5 hover:text-accent">
                      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-foreground/45">
                        {index + 1}
                      </span>
                      <span className="whitespace-nowrap font-medium text-foreground">{row.name}</span>
                      <span className="whitespace-nowrap font-mono text-[11px] text-foreground/45">
                        {row.team ?? "FA"}
                      </span>
                    </Link>
                  </td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-right font-mono tabular-nums ${
                        sortKey === col.key ? "text-foreground" : "text-foreground/75"
                      }`}
                    >
                      {formatStat(row[col.key], col.decimals)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
