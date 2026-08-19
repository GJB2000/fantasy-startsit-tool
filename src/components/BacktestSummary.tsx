import type { BaselineId } from "@/lib/backtest/baselines";
import type { BacktestSummary as BacktestSummaryData } from "@/lib/backtest/grading";

interface AccuracyBannerProps {
  label: string;
  summary: BacktestSummaryData;
}

function AccuracyBanner({ label, summary }: AccuracyBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-[4px] border border-foreground/12 bg-surface px-3.5 py-2.5 text-sm shadow-sm">
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">
        <span className="font-jost text-[15px] font-semibold">
          {summary.accuracyPct != null ? `${summary.accuracyPct.toFixed(1)}%` : "—"}
        </span>{" "}
        <span className="font-mono text-foreground/55">
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
      <h3 className="font-engraved text-[11px] uppercase tracking-[0.1em] text-foreground/50">{title}</h3>
      {children}
    </div>
  );
}

interface BacktestSummaryViewProps {
  summary: BacktestSummaryData;
  byPosition?: Record<string, BacktestSummaryData>;
  baselineSummaries?: Record<BaselineId, BacktestSummaryData>;
  baselineLabels?: Record<BaselineId, string>;
  confidenceBreakdown?: {
    confident: BacktestSummaryData;
    limitedData: BacktestSummaryData;
    closeCall: BacktestSummaryData;
  };
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
          <AccuracyBanner label="Limited data" summary={confidenceBreakdown.limitedData} />
          <AccuracyBanner label="Close calls" summary={confidenceBreakdown.closeCall} />
        </Section>
      )}
    </div>
  );
}
