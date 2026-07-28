import type { ProjectionSummary as ProjectionSummaryData } from "@/lib/backtest/projectionGrading";

interface ProjectionBanner {
  label: string;
  summary: ProjectionSummaryData;
}

function ProjectionRow({ label, summary }: ProjectionBanner) {
  if (summary.n === 0 || summary.mae == null) {
    return (
      <div className="flex items-center justify-between rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-zinc-500">— (n=0)</span>
      </div>
    );
  }

  const biasLabel = summary.bias! >= 0 ? `+${summary.bias!.toFixed(1)}` : summary.bias!.toFixed(1);

  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <span>
        <span className="font-semibold">{summary.mae.toFixed(1)} MAE</span>{" "}
        <span className="text-zinc-500">
          (RMSE {summary.rmse!.toFixed(1)}, bias {biasLabel}, n={summary.n})
        </span>
      </span>
    </div>
  );
}

interface ProjectionSummaryViewProps {
  overall: ProjectionSummaryData;
  byPosition?: Record<string, ProjectionSummaryData>;
  baselineOverall?: ProjectionSummaryData;
  baselineByPosition?: Record<string, ProjectionSummaryData>;
}

/**
 * MAE/RMSE/bias are all in fantasy points — a genuinely different kind
 * of number from every other backtest view in this app (which report a
 * pick-accuracy percentage). Deliberately mirrors BacktestSummaryView's
 * plain banner-row layout rather than introducing a new visual language,
 * since this is still the internal/secondary validation tool.
 */
export function ProjectionSummaryView({ overall, byPosition, baselineOverall, baselineByPosition }: ProjectionSummaryViewProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Engine projection error</h3>
        <ProjectionRow label="Overall" summary={overall} />
        {byPosition &&
          Object.entries(byPosition).map(([position, summary]) => (
            <ProjectionRow key={position} label={position} summary={summary} />
          ))}
      </div>

      {baselineOverall && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            vs. naive baseline (season-to-date average, same player-weeks)
          </h3>
          <ProjectionRow label="Overall" summary={baselineOverall} />
          {baselineByPosition &&
            Object.entries(baselineByPosition).map(([position, summary]) => (
              <ProjectionRow key={position} label={position} summary={summary} />
            ))}
        </div>
      )}
    </div>
  );
}
