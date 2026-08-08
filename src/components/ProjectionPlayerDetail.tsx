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

interface CloserCounts {
  engine: number;
  fantasyPros: number;
  tie: number;
  graded: number;
}

/**
 * "Got it right" for a single-player projection table means "was closer
 * to the real score that week" — a smaller absolute error wins, not a
 * pairwise pick the way every other backtest accuracy number in this app
 * works (there's only one player here, not two to rank against each
 * other). Only counts weeks where BOTH projections and a real actual
 * score exist — a bye week or a week either source has no data for
 * can't be judged either way.
 */
function countCloserWeeks(weeks: PlayerWeekProjection[]): CloserCounts {
  let engine = 0;
  let fantasyPros = 0;
  let tie = 0;
  for (const w of weeks) {
    if (w.diff == null || w.fantasyProsDiff == null) continue;
    const engineError = Math.abs(w.diff);
    const fantasyProsError = Math.abs(w.fantasyProsDiff);
    if (engineError < fantasyProsError) engine++;
    else if (fantasyProsError < engineError) fantasyPros++;
    else tie++;
  }
  return { engine, fantasyPros, tie, graded: engine + fantasyPros + tie };
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
  const closer = countCloserWeeks(detail.weeks);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">
          {detail.displayName}{" "}
          <span className="text-foreground/45">
            {detail.position ?? "—"}
            {detail.team ? ` · ${detail.team}` : ""}
          </span>
        </span>
        <span className="font-mono text-xs text-foreground/45">
          {summary.mae != null
            ? `MAE ${summary.mae.toFixed(1)} (RMSE ${summary.rmse!.toFixed(1)}, bias ${signedLabel(summary.bias)}, n=${summary.n})`
            : "No graded weeks in this range"}
        </span>
      </div>
      {closer.graded > 0 && (
        <div className="font-mono text-xs text-foreground/45">
          Closer to actual: <span className="font-semibold text-foreground">Engine {closer.engine}</span>
          {" · "}
          <span className="font-semibold text-foreground">FantasyPros {closer.fantasyPros}</span>
          {closer.tie > 0 ? ` · Tied ${closer.tie}` : ""}
          {` (of ${closer.graded} weeks with both projections)`}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/15 text-left font-engraved text-[10.5px] uppercase tracking-[0.08em] text-foreground/50">
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
              <tr key={w.week} className="border-b border-foreground/[0.07]">
                <td className="py-2 pr-3 font-mono">{w.week}</td>
                <td className="py-2 pr-3 font-mono">{w.predicted != null ? w.predicted.toFixed(1) : "—"}</td>
                <td className="py-2 pr-3 font-mono">
                  {w.fantasyProsProjection != null ? w.fantasyProsProjection.toFixed(1) : "—"}
                </td>
                <td className="py-2 pr-3 font-mono">{w.played ? (w.actual != null ? w.actual.toFixed(1) : "—") : "Bye/DNP"}</td>
                <td className="py-2 pr-3 font-mono font-medium">{signedLabel(w.diff)}</td>
                <td className="py-2 pr-3 font-mono font-medium">{signedLabel(w.fantasyProsDiff)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-foreground/10 text-left font-semibold">
              <td className="py-2 pr-3">Total</td>
              <td className="py-2 pr-3 font-mono">{totals.predicted != null ? totals.predicted.toFixed(1) : "—"}</td>
              <td className="py-2 pr-3 font-mono">
                {totals.fantasyProsProjection != null ? totals.fantasyProsProjection.toFixed(1) : "—"}
              </td>
              <td className="py-2 pr-3 font-mono">{totals.actual != null ? totals.actual.toFixed(1) : "—"}</td>
              <td className="py-2 pr-3 font-mono">{signedLabel(totals.diff)}</td>
              <td className="py-2 pr-3 font-mono">{signedLabel(totals.fantasyProsDiff)}</td>
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
 * `countCloserWeeks` adds a "who got it right more" counter — for a
 * single player there's no pairwise pick to grade the way every other
 * accuracy number in this app works, so "right" means "closer to the
 * real score that week" (smaller absolute error), counted only over
 * weeks where both projections and a real actual exist.
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
