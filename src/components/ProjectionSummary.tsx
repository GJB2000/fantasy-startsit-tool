import type { ProjectionSummary as ProjectionSummaryData } from "@/lib/backtest/projectionGrading";

interface ProjectionBanner {
  label: string;
  summary: ProjectionSummaryData;
}

function ProjectionRow({ label, summary }: ProjectionBanner) {
  if (summary.n === 0 || summary.mae == null) {
    return (
      <div className="flex flex-col gap-1 rounded-[4px] border border-foreground/12 bg-surface px-3.5 py-2.5 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="font-medium">{label}</span>
        <span className="text-foreground/55">— (n=0)</span>
      </div>
    );
  }

  const biasLabel = summary.bias! >= 0 ? `+${summary.bias!.toFixed(1)}` : summary.bias!.toFixed(1);

  return (
    <div className="flex flex-col gap-1 rounded-[4px] border border-foreground/12 bg-surface px-3.5 py-2.5 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="font-medium">{label}</span>
      <span className="shrink-0">
        <span className="font-jost text-[15px] font-semibold">{summary.mae.toFixed(1)} MAE</span>{" "}
        <span className="font-mono text-foreground/55">
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
  expertConsensusOverall?: ProjectionSummaryData;
  expertConsensusByPosition?: Record<string, ProjectionSummaryData>;
}

/**
 * MAE/RMSE/bias are all in fantasy points — a genuinely different kind
 * of number from every other backtest view in this app (which report a
 * pick-accuracy percentage). Deliberately mirrors BacktestSummaryView's
 * plain banner-row layout rather than introducing a new visual language,
 * since this is still the internal/secondary validation tool.
 */
export function ProjectionSummaryView({
  overall,
  byPosition,
  baselineOverall,
  baselineByPosition,
  expertConsensusOverall,
  expertConsensusByPosition,
}: ProjectionSummaryViewProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">Engine projection error</h3>
        <ProjectionRow label="Overall" summary={overall} />
        {byPosition &&
          Object.entries(byPosition).map(([position, summary]) => (
            <ProjectionRow key={position} label={position} summary={summary} />
          ))}
      </div>

      {baselineOverall && (
        <div className="space-y-2">
          <h3 className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">
            vs. naive baseline (season-to-date average, same player-weeks)
          </h3>
          <ProjectionRow label="Overall" summary={baselineOverall} />
          {baselineByPosition &&
            Object.entries(baselineByPosition).map(([position, summary]) => (
              <ProjectionRow key={position} label={position} summary={summary} />
            ))}
        </div>
      )}

      {expertConsensusOverall && (
        <div className="space-y-2">
          <h3 className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">
            vs. the consensus projection the engine itself blends in (same player-weeks, own coverage)
          </h3>
          <ProjectionRow label="Overall" summary={expertConsensusOverall} />
          {expertConsensusByPosition &&
            Object.entries(expertConsensusByPosition).map(([position, summary]) => (
              <ProjectionRow key={position} label={position} summary={summary} />
            ))}
        </div>
      )}
    </div>
  );
}
