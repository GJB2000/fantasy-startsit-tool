import type { BaselineId } from "@/lib/backtest/baselines";
import type { BacktestSummary as BacktestSummaryData } from "@/lib/backtest/grading";

interface AccuracyBannerProps {
  label: string;
  summary: BacktestSummaryData;
}

function AccuracyBanner({ label, summary }: AccuracyBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <span>
        {summary.accuracyPct != null ? `${summary.accuracyPct.toFixed(1)}%` : "—"}{" "}
        <span className="text-zinc-500">
          ({summary.correct}-{summary.incorrect}
          {summary.push > 0 ? `, ${summary.push} push` : ""}
          {summary.noPick > 0 ? `, ${summary.noPick} no-pick` : ""})
        </span>
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </div>
  );
}

interface BacktestSummaryViewProps {
  summary: BacktestSummaryData;
  byPosition?: Record<string, BacktestSummaryData>;
  baselineSummaries?: Record<BaselineId, BacktestSummaryData>;
  baselineLabels?: Record<BaselineId, string>;
  confidenceBreakdown?: { confident: BacktestSummaryData; closeCall: BacktestSummaryData };
}

export function BacktestSummaryView({
  summary,
  byPosition,
  baselineSummaries,
  baselineLabels,
  confidenceBreakdown,
}: BacktestSummaryViewProps) {
  return (
    <div className="space-y-5">
      <Section title="Engine accuracy">
        <AccuracyBanner label="Overall" summary={summary} />
        {byPosition &&
          Object.entries(byPosition).map(([position, posSummary]) => (
            <AccuracyBanner key={position} label={position} summary={posSummary} />
          ))}
      </Section>

      {baselineSummaries && baselineLabels && (
        <Section title="vs. naive baselines (same weeks & matchups)">
          {(Object.entries(baselineSummaries) as [BaselineId, BacktestSummaryData][]).map(
            ([id, baselineSummary]) => (
              <AccuracyBanner key={id} label={baselineLabels[id]} summary={baselineSummary} />
            )
          )}
        </Section>
      )}

      {confidenceBreakdown && (
        <Section title="By self-reported confidence">
          <AccuracyBanner label="Confident picks" summary={confidenceBreakdown.confident} />
          <AccuracyBanner label="Close calls" summary={confidenceBreakdown.closeCall} />
        </Section>
      )}
    </div>
  );
}
