import type { TradeEvaluation, TradePlayerResult, TradeVerdict } from "@/lib/trade/evaluateTrade";

interface TradeResultProps {
  evaluation: TradeEvaluation;
  contextNote: string;
}

const VERDICT_STYLES: Record<TradeVerdict, { border: string; bg: string; icon: string }> = {
  good: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: "✅" },
  bad: { border: "border-red-500/30", bg: "bg-red-500/10", icon: "🚫" },
  fair: { border: "border-amber-500/30", bg: "bg-amber-500/10", icon: "⚖️" },
  unknown: { border: "border-sky-500/30", bg: "bg-sky-500/10", icon: "🔎" },
};

function PlayerValueCard({ player }: { player: TradePlayerResult }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{player.displayName}</span>
        {player.position && (
          <span className="text-xs text-zinc-500">
            {player.position}
            {player.team ? ` · ${player.team}` : ""}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="text-xs text-zinc-500">Rest of season</span>
        <span className="font-mono text-sm tabular-nums">
          {player.restOfSeasonTotal != null ? `${player.restOfSeasonTotal.toFixed(1)} pts` : "—"}
        </span>
      </div>
      {player.restOfSeasonTotal != null && (
        <div className="mt-0.5 flex items-baseline justify-between text-xs text-zinc-500">
          <span>{player.gamesRemaining} games left</span>
          <span className="font-mono tabular-nums">{(player.restOfSeasonPerGame ?? 0).toFixed(1)}/gm</span>
        </div>
      )}
    </div>
  );
}

function SideColumn({ label, players, total }: { label: string; players: TradePlayerResult[]; total: number | null }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-500">{label}</h3>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {total != null ? `${total.toFixed(1)} pts` : "—"}
        </span>
      </div>
      <div className="space-y-2">
        {players.map((player, i) => (
          <PlayerValueCard key={player.playerId ?? `unresolved-${i}`} player={player} />
        ))}
      </div>
    </div>
  );
}

export function TradeResult({ evaluation, contextNote }: TradeResultProps) {
  const style = VERDICT_STYLES[evaluation.verdict];

  return (
    <div className="mt-8 space-y-6">
      <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${style.border} ${style.bg}`}>
        <span className="text-lg leading-none">{style.icon}</span>
        <div>
          <p className="text-lg font-semibold leading-snug">{evaluation.headline}</p>
          <p className="mt-1 text-xs text-zinc-500">{contextNote}</p>
        </div>
      </div>

      {evaluation.reasoning.length > 0 && (
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          {evaluation.reasoning.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <SideColumn label="You give" players={evaluation.give} total={evaluation.giveTotal} />
        <SideColumn label="You get" players={evaluation.get} total={evaluation.getTotal} />
      </div>
    </div>
  );
}
