import type { PlayerProjectionSummary } from "@/lib/backtest/runProjectionBacktest";

interface ProjectionPlayerTableProps {
  players: PlayerProjectionSummary[];
}

/**
 * Per-player breakdown of the same MAE/RMSE/bias metrics
 * ProjectionSummaryView shows pooled by position — sorted worst (highest
 * MAE) first server-side (see runProjectionBacktest.ts), so the players
 * the engine struggles with most are immediately visible rather than
 * averaged away into a position-level number.
 */
export function ProjectionPlayerTable({ players }: ProjectionPlayerTableProps) {
  if (players.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-300 text-left text-zinc-500 dark:border-zinc-700">
            <th className="py-2 pr-3">Player</th>
            <th className="py-2 pr-3">Pos</th>
            <th className="py-2 pr-3">Team</th>
            <th className="py-2 pr-3">MAE</th>
            <th className="py-2 pr-3">RMSE</th>
            <th className="py-2 pr-3">Bias</th>
            <th className="py-2 pr-3">Games</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const bias = p.summary.bias;
            const biasLabel = bias == null ? "—" : bias >= 0 ? `+${bias.toFixed(1)}` : bias.toFixed(1);
            return (
              <tr key={p.playerId} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-3">{p.displayName}</td>
                <td className="py-2 pr-3">{p.position}</td>
                <td className="py-2 pr-3">{p.team ?? "—"}</td>
                <td className="py-2 pr-3 font-medium">{p.summary.mae?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-3">{p.summary.rmse?.toFixed(1) ?? "—"}</td>
                <td className="py-2 pr-3">{biasLabel}</td>
                <td className="py-2 pr-3">{p.summary.n}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
