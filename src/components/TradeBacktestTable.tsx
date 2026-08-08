import type { BacktestOutcome } from "@/lib/backtest/grading";
import type { TradeGradeResult } from "@/lib/backtest/tradeBacktest";

const outcomeStyles: Record<BacktestOutcome, string> = {
  correct: "bg-good/20 text-good",
  incorrect: "bg-bad/20 text-bad",
  push: "bg-foreground/10 text-foreground/50",
  no_pick: "bg-foreground/10 text-foreground/50",
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
          <tr className="border-b border-foreground/15 text-left font-engraved text-[10.5px] uppercase tracking-[0.08em] text-foreground/50">
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
              <tr key={i} className="border-b border-foreground/[0.07]">
                <td className="py-2 pr-3">{r.position}</td>
                <td className="py-2 pr-3">
                  {r.give.displayName} (<span className="font-mono">{fmt(r.give.projectedTotal)}</span> proj.)
                </td>
                <td className="py-2 pr-3">
                  {r.get.displayName} (<span className="font-mono">{fmt(r.get.projectedTotal)}</span> proj.)
                </td>
                <td className="py-2 pr-3">{predictedName}</td>
                <td className="py-2 pr-3 font-mono">
                  {fmt(r.give.actualTotal)} vs {fmt(r.get.actualTotal)}
                </td>
                <td className="py-2 pr-3">
                  <span className={`rounded-[3px] px-2 py-0.5 text-xs font-medium ${outcomeStyles[r.outcome]}`}>
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
