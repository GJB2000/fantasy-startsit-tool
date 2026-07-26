import type { BacktestOutcome } from "@/lib/backtest/grading";
import type { TradeGradeResult } from "@/lib/backtest/tradeBacktest";

const outcomeStyles: Record<BacktestOutcome, string> = {
  correct: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  incorrect: "bg-red-500/20 text-red-600 dark:text-red-400",
  push: "bg-zinc-400/20 text-zinc-500",
  no_pick: "bg-zinc-400/20 text-zinc-500",
};

const outcomeLabels: Record<BacktestOutcome, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  push: "Push",
  no_pick: "No pick",
};

function fmt(value: number | null): string {
  return value != null ? value.toFixed(1) : "—";
}

interface TradeBacktestTableProps {
  results: TradeGradeResult[];
}

export function TradeBacktestTable({ results }: TradeBacktestTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
            <th className="py-2 pr-3">Pos</th>
            <th className="py-2 pr-3">Give</th>
            <th className="py-2 pr-3">Get</th>
            <th className="py-2 pr-3">Predicted</th>
            <th className="py-2 pr-3">Actual (rest of season)</th>
            <th className="py-2 pr-3">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const predictedName =
              r.predictedWinnerId === r.give.playerId
                ? r.give.displayName
                : r.predictedWinnerId === r.get.playerId
                  ? r.get.displayName
                  : "—";
            return (
              <tr key={i} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-3">{r.position}</td>
                <td className="py-2 pr-3">
                  {r.give.displayName} ({fmt(r.give.projectedTotal)} proj.)
                </td>
                <td className="py-2 pr-3">
                  {r.get.displayName} ({fmt(r.get.projectedTotal)} proj.)
                </td>
                <td className="py-2 pr-3">{predictedName}</td>
                <td className="py-2 pr-3">
                  {fmt(r.give.actualTotal)} vs {fmt(r.get.actualTotal)}
                </td>
                <td className="py-2 pr-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${outcomeStyles[r.outcome]}`}>
                    {outcomeLabels[r.outcome]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
