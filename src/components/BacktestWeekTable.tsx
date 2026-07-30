import type { BacktestOutcome, WeekGradeResult } from "@/lib/backtest/grading";

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

interface BacktestWeekTableProps {
  weekResults: WeekGradeResult[];
}

export function BacktestWeekTable({ weekResults }: BacktestWeekTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-foreground/10 text-left text-foreground/45">
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
              <tr key={wr.week} className="border-b border-foreground/[0.07]">
                <td className="py-2 pr-3 font-mono">{wr.week}</td>
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
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${outcomeStyles[wr.outcome]}`}>
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
