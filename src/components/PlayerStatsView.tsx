"use client";

import { BackToToolLink } from "./BackToToolLink";
import { PlayerAvatar } from "./Jersey";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { ADVANCED_GAME_COLUMNS, formatMetric } from "@/lib/stats/advanced";
import { STAT_COLUMNS, formatStat } from "@/lib/stats/columns";
import { isStatsPosition, type PlayerStatsDetail } from "@/lib/stats/types";
import { SCORING_FORMAT_OPTIONS } from "./ScoringFormatToggle";
import { SegmentedControl } from "./SegmentedControl";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-engraved text-[9.5px] uppercase tracking-[0.12em] text-foreground/55">{label}</span>
      <span className="font-mono text-[19px] tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function PlayerStatsView({ playerId }: { playerId: number }) {
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [detail, setDetail] = useState<PlayerStatsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logView, setLogView] = useState<"standard" | "advanced">("standard");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/stats/[playerId] response (an external system), keyed on the deps below; the cancelled flag guards against a stale response landing after a newer request.
    setLoading(true);
    setError(null);
    fetch(`/api/stats/${playerId}?scoringFormat=${scoringFormat}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body.error ?? "Couldn't load that player.");
          return;
        }
        setDetail(body.detail);
      })
      .catch(() => !cancelled && setError("Couldn't load that player."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [playerId, scoringFormat]);

  if (loading) return <p className="text-[13px] text-foreground/55">Loading game log…</p>;
  if (error || !detail)
    return (
      <div className="rounded-[10px] border border-bad/30 bg-bad/10 px-4 py-3 text-[13px] text-foreground">
        {error ?? "Couldn't load that player."}
      </div>
    );

  const { player, totals, gameLog, advanced, positionRank, positionCount } = detail;
  const statColumns = isStatsPosition(player.position) ? STAT_COLUMNS[player.position] : [];
  const advancedColumns =
    advanced && isStatsPosition(player.position) ? ADVANCED_GAME_COLUMNS[player.position] : [];
  const showAdvancedLog = logView === "advanced" && advancedColumns.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card rounded-[14px] p-5 sm:p-6">
        <BackToToolLink playerId={playerId} />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <PlayerAvatar playerId={playerId} team={player.team} position={player.position} size={48} />
            <div>
              <h2
                className="text-[26px] leading-none text-foreground"
                style={{ fontFamily: "var(--font-jost)", fontWeight: 600 }}
              >
                {player.name}
              </h2>
              <p className="mt-1.5 font-mono text-[12px] text-foreground/55">
                {player.team ?? "Free agent"}
                {positionRank && positionCount ? ` · ${player.position}${positionRank} of ${positionCount}` : ""}
                {player.byeWeek ? ` · Bye ${player.byeWeek}` : ""}
              </p>
            </div>
          </div>
          <SegmentedControl
            label="Scoring"
            options={SCORING_FORMAT_OPTIONS}
            value={scoringFormat}
            onChange={setScoringFormat}
            tone="secondary"
          />
        </div>

        {player.injuryStatus && (
          <p className="mt-4 inline-block rounded-full bg-caution/15 px-2.5 py-1 font-engraved text-[10px] uppercase tracking-[0.1em] text-caution">
            {player.injuryStatus}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-foreground/10 pt-5 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Games" value={String(totals.games)} />
          <Stat label="Points" value={formatStat(totals.points, 1)} />
          <Stat label="Per game" value={formatStat(totals.pointsPerGame, 1)} />
          {statColumns.slice(0, 9).map((col) => (
            <Stat key={col.key} label={col.label} value={formatStat(totals[col.key])} />
          ))}
        </div>
      </div>

      {advanced && (
        <div className="glass-card rounded-[14px] p-5 sm:p-6">
          <h3 className="font-engraved text-[10px] uppercase tracking-[0.12em] text-foreground/55">
            Advanced metrics
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {advanced.summary.map((metric) => (
              <Stat
                key={metric.label}
                label={metric.label}
                value={formatMetric(metric.value, metric.format)}
              />
            ))}
          </div>
          {advanced.summary.some((metric) => metric.isAverage) && (
            <p className="mt-4 border-t border-foreground/10 pt-3 text-[12px] text-foreground/45">
              Share metrics are per-game averages — the team totals they divide by aren&rsquo;t
              exposed, so they can&rsquo;t be summed across the season the way the counting stats
              are.
            </p>
          )}
        </div>
      )}

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-engraved text-[10px] uppercase tracking-[0.12em] text-foreground/55">
            {detail.season} game log
          </h3>
          {advancedColumns.length > 0 && (
            <SegmentedControl
              options={[
                { value: "standard" as const, label: "Standard" },
                { value: "advanced" as const, label: "Advanced" },
              ]}
              value={logView}
              onChange={setLogView}
              tone="secondary"
            />
          )}
        </div>
        {gameLog.length === 0 ? (
          <p className="text-[13px] text-foreground/55">No games recorded this season.</p>
        ) : (
          <div className="glass-card overflow-x-auto rounded-[12px]">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-foreground/12">
                  {["WK", "OPP"].map((label) => (
                    <th
                      key={label}
                      className="px-3 py-2.5 text-left font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/55"
                    >
                      {label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-right font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/55">
                    PTS
                  </th>
                  {showAdvancedLog
                    ? advancedColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2.5 text-right font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/55"
                        >
                          {col.label}
                        </th>
                      ))
                    : statColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-3 py-2.5 text-right font-engraved text-[10px] uppercase tracking-[0.1em] text-foreground/55"
                        >
                          {col.label}
                        </th>
                      ))}
                </tr>
              </thead>
              <tbody>
                {gameLog.map((game) => (
                  <tr key={game.week} className="border-b border-foreground/8 last:border-b-0">
                    <td className="px-3 py-2 font-mono text-[12px] text-foreground/75">{game.week}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-foreground/75">
                      {game.homeOrAway === "AWAY" ? "@" : game.homeOrAway === "HOME" ? "vs" : ""} {game.opponent ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                      {game.played ? formatStat(game.points, 1) : "DNP"}
                    </td>
                    {showAdvancedLog
                      ? advancedColumns.map((col) => {
                          const row = advanced?.byWeek[game.week];
                          return (
                            <td
                              key={col.key}
                              className="px-3 py-2 text-right font-mono tabular-nums text-foreground/75"
                            >
                              {game.played && row ? formatMetric(row[col.key] as number | undefined, col.format) : "—"}
                            </td>
                          );
                        })
                      : statColumns.map((col) => (
                          <td key={col.key} className="px-3 py-2 text-right font-mono tabular-nums text-foreground/75">
                            {game.played ? formatStat(game[col.key]) : "—"}
                          </td>
                        ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link href="/stats" className="text-[13px] text-foreground/55 transition-colors hover:text-accent">
        ← All player stats
      </Link>
    </div>
  );
}
