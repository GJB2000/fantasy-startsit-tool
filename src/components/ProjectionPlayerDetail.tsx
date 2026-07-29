import type { PlayerProjectionDetail, PlayerWeekProjection } from "@/lib/backtest/playerProjectionLookup";

function signedLabel(value: number | null): string {
  if (value == null) return "—";
  return value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

/** Sums whichever weeks actually have a value for this column — bye/missing weeks simply don't contribute, rather than being treated as zero. */
function sumColumn(weeks: PlayerWeekProjection[], pick: (w: PlayerWeekProjection) => number | null): number | null {
  const values = weeks.map(pick).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((total, v) => total + v, 0);
}

function DetailCard({ detail }: { detail: PlayerProjectionDetail }) {
  const { summary } = detail;
  const totals = {
    predicted: sumColumn(detail.weeks, (w) => w.predicted),
    fantasyProsProjection: sumColumn(detail.weeks, (w) => w.fantasyProsProjection),
    actual: sumColumn(detail.weeks, (w) => w.actual),
    diff: sumColumn(detail.weeks, (w) => w.diff),
    fantasyProsDiff: sumColumn(detail.weeks, (w) => w.fantasyProsDiff),
  };

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
              <th className="py-2 pr-3">Projected (engine)</th>
              <th className="py-2 pr-3">Projected (FantasyPros)</th>
              <th className="py-2 pr-3">Actual</th>
              <th className="py-2 pr-3">Diff (engine)</th>
              <th className="py-2 pr-3">Diff (FantasyPros)</th>
            </tr>
          </thead>
          <tbody>
            {detail.weeks.map((w) => (
              <tr key={w.week} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-3">{w.week}</td>
                <td className="py-2 pr-3">{w.predicted != null ? w.predicted.toFixed(1) : "—"}</td>
                <td className="py-2 pr-3">
                  {w.fantasyProsProjection != null ? w.fantasyProsProjection.toFixed(1) : "—"}
                </td>
                <td className="py-2 pr-3">{w.played ? (w.actual != null ? w.actual.toFixed(1) : "—") : "Bye/DNP"}</td>
                <td className="py-2 pr-3 font-medium">{signedLabel(w.diff)}</td>
                <td className="py-2 pr-3 font-medium">{signedLabel(w.fantasyProsDiff)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-300 text-left font-semibold dark:border-zinc-700">
              <td className="py-2 pr-3">Total</td>
              <td className="py-2 pr-3">{totals.predicted != null ? totals.predicted.toFixed(1) : "—"}</td>
              <td className="py-2 pr-3">
                {totals.fantasyProsProjection != null ? totals.fantasyProsProjection.toFixed(1) : "—"}
              </td>
              <td className="py-2 pr-3">{totals.actual != null ? totals.actual.toFixed(1) : "—"}</td>
              <td className="py-2 pr-3">{signedLabel(totals.diff)}</td>
              <td className="py-2 pr-3">{signedLabel(totals.fantasyProsDiff)}</td>
            </tr>
          </tfoot>
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
 * be able to search for a player"). Also shows FantasyPros' own weekly
 * consensus estimate alongside the engine's for direct comparison —
 * previously only pulled ad hoc via a temporary diagnostic route each
 * time a specific player's numbers were requested; promoted into this
 * permanent view instead of re-building the one-off script every time.
 * Diff stays engine-vs-actual only — FantasyPros' number is a display
 * column, not folded into any summary math here. A separate
 * fantasyProsDiff column mirrors diff's shape for that number, and a
 * totals row (sumColumn) sums each column over whichever weeks actually
 * have a value — bye/missing weeks don't contribute, rather than being
 * treated as zero — so the net over/under-projection across the whole
 * range is visible at a glance without re-deriving it from the header's
 * bias figure (which is engine-only and MAE-based, not a raw sum).
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
