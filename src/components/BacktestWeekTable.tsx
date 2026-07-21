import type { BacktestOutcome, WeekGradeResult } from "@/lib/backtest/grading";

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

interface BacktestWeekTableProps {
  weekResults: WeekGradeResult[];
}

export function BacktestWeekTable({ weekResults }: BacktestWeekTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
            <th className="py-2 pr-3">Week</th>
            <th className="py-2 pr-3">Recommended</th>
            <th className="py-2 pr-3">Actual scores</th>
            <th className="py-2 pr-3">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {weekResults.map((wr) => {
            const recommended = wr.result.players.find((p) => p.playerId === wr.result.recommendedPlayerId);
            return (
              <tr key={wr.week} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-3">{wr.week}</td>
                <td className="py-2 pr-3">{recommended?.displayName ?? "—"}</td>
                <td className="py-2 pr-3">
                  {wr.result.players
                    .map((p) => {
                      const actual = p.playerId != null ? wr.actualScores[p.playerId] : undefined;
                      return `${p.displayName}: ${actual ? actual.pprPoints.toFixed(1) : "—"}`;
                    })
                    .join(" vs ")}
                </td>
                <td className="py-2 pr-3">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${outcomeStyles[wr.outcome]}`}>
                    {outcomeLabels[wr.outcome]}
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
