import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";

interface ComparisonResultProps {
  result: ComparisonResultData;
  contextNote: string;
}

function injuryBadgeClasses(status: string) {
  if (status === "Out" || status === "Doubtful") {
    return "bg-red-500/20 text-red-600 dark:text-red-400";
  }
  return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
}

function headlineIcon(result: ComparisonResultData) {
  if (result.isCloseCall) return "⚖️";
  if (result.hasLimitedData) return "🔎";
  return "✅";
}

export function ComparisonResult({ result, contextNote }: ComparisonResultProps) {
  return (
    <div className="mt-8 space-y-6">
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${
          result.isCloseCall
            ? "border-amber-500/30 bg-amber-500/10"
            : result.hasLimitedData
              ? "border-sky-500/30 bg-sky-500/10"
              : "border-emerald-500/30 bg-emerald-500/10"
        }`}
      >
        <span className="text-lg leading-none">{headlineIcon(result)}</span>
        <div>
          <p className="text-lg font-semibold leading-snug">{result.headline}</p>
          <p className="mt-1 text-xs text-zinc-500">{contextNote}</p>
        </div>
      </div>

      <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
        {result.reasoning.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.players.map((player, i) => {
          const isRecommended = player.playerId === result.recommendedPlayerId;
          return (
            <div
              key={player.playerId ?? `unresolved-${i}`}
              className={`relative rounded-xl border p-4 transition-shadow ${
                isRecommended
                  ? "border-emerald-500/40 bg-emerald-500/[0.03] shadow-md ring-1 ring-emerald-500/20 dark:bg-emerald-500/[0.06]"
                  : "border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                  Start
                </span>
              )}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{player.displayName}</h3>
                {player.position && (
                  <span className="text-xs text-zinc-500">
                    {player.position}
                    {player.team ? ` · ${player.team}` : ""}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {player.isOnByeThisWeek && (
                  <span className="rounded-full bg-zinc-400/20 px-2 py-0.5 text-xs text-zinc-500">
                    Bye week
                  </span>
                )}
                {player.injuryStatus && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${injuryBadgeClasses(player.injuryStatus)}`}>
                    {player.injuryStatus}
                  </span>
                )}
                {player.dataQuality !== "full" && (
                  <span className="rounded-full bg-zinc-400/20 px-2 py-0.5 text-xs text-zinc-500">
                    {player.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
                  </span>
                )}
              </div>

              <dl className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                <div className="flex justify-between py-1.5">
                  <dt className="text-zinc-500">Last {player.gamesUsedForRecent || 0} games (PPR avg)</dt>
                  <dd className="font-mono tabular-nums">
                    {player.recentPprAvg != null ? player.recentPprAvg.toFixed(1) : "—"}
                  </dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-zinc-500">Season avg (PPR)</dt>
                  <dd className="font-mono tabular-nums">
                    {player.seasonPprAvg != null ? player.seasonPprAvg.toFixed(1) : "—"}
                  </dd>
                </div>
                {player.recentVolumeAvg != null && (
                  <div className="flex justify-between py-1.5">
                    <dt className="text-zinc-500">Recent volume/game</dt>
                    <dd className="font-mono tabular-nums">{player.recentVolumeAvg.toFixed(1)}</dd>
                  </div>
                )}
                {player.matchupContext && (
                  <div className="flex justify-between py-1.5">
                    <dt className="text-zinc-500">
                      Last matchup ({player.matchupContext.opponentTeam})
                    </dt>
                    <dd className="font-mono tabular-nums">
                      #{player.matchupContext.rank} of {player.matchupContext.teamCount}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
