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

interface BacktestSummaryViewProps {
  summary: BacktestSummaryData;
  byPosition?: Record<string, BacktestSummaryData>;
}

export function BacktestSummaryView({ summary, byPosition }: BacktestSummaryViewProps) {
  return (
    <div className="space-y-2">
      <AccuracyBanner label="Overall accuracy" summary={summary} />
      {byPosition &&
        Object.entries(byPosition).map(([position, posSummary]) => (
          <AccuracyBanner key={position} label={position} summary={posSummary} />
        ))}
    </div>
  );
}
