import type { PlayerProjectionDetail } from "@/lib/backtest/playerProjectionLookup";

function signedLabel(value: number | null): string {
  if (value == null) return "—";
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function DetailCard({ detail }: { detail: PlayerProjectionDetail }) {
  const { summary } = detail;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">
          {detail.displayName}{" "}
          <span className="text-zinc-500">
            {detail.position ?? "—"}
            {detail.team ? ` · ${detail.team}` : ""}
          </span>
        </span>
        <span className="text-xs text-zinc-500">
          {summary.mae != null
            ? `MAE ${summary.mae.toFixed(1)} (RMSE ${summary.rmse!.toFixed(1)}, bias ${signedLabel(summary.bias)}, n=${summary.n})`
            : "No graded weeks in this range"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
              <th className="py-2 pr-3">Week</th>
              <th className="py-2 pr-3">Projected</th>
              <th className="py-2 pr-3">Actual</th>
              <th className="py-2 pr-3">Diff</th>
            </tr>
          </thead>
          <tbody>
            {detail.weeks.map((w) => (
              <tr key={w.week} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-3">{w.week}</td>
                <td className="py-2 pr-3">{w.predicted != null ? w.predicted.toFixed(1) : "—"}</td>
                <td className="py-2 pr-3">{w.played ? (w.actual != null ? w.actual.toFixed(1) : "—") : "Bye/DNP"}</td>
                <td className="py-2 pr-3 font-medium">{signedLabel(w.diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ProjectionPlayerDetailProps {
  players: PlayerProjectionDetail[];
}

/**
 * Week-by-week projected/actual/diff for specific searched players —
 * the individual counterpart to ProjectionSummaryView/ProjectionPlayerTable's
 * pooled-position views, added on direct follow-up request ("I want to
 * be able to search for a player").
 */
export function ProjectionPlayerDetailView({ players }: ProjectionPlayerDetailProps) {
  if (players.length === 0) return null;

  return (
    <div className="space-y-6">
      {players.map((p) => (
        <DetailCard key={p.playerId} detail={p} />
      ))}
    </div>
  );
}
