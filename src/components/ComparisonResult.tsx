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

export function ComparisonResult({ result, contextNote }: ComparisonResultProps) {
  return (
    <div className="mt-8 space-y-6">
      <div
        className={`rounded-lg border p-4 ${
          result.isCloseCall
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-emerald-500/40 bg-emerald-500/10"
        }`}
      >
        <p className="text-lg font-semibold">{result.headline}</p>
        <p className="mt-1 text-xs text-zinc-500">{contextNote}</p>
      </div>

      <ul className="list-disc space-y-1.5 pl-5 text-sm">
        {result.reasoning.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        {result.players.map((player, i) => (
          <div
            key={player.playerId ?? `unresolved-${i}`}
            className={`rounded-lg border p-4 ${
              player.playerId === result.recommendedPlayerId
                ? "border-emerald-500/50"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
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
                <span className="rounded bg-zinc-400/20 px-1.5 py-0.5 text-xs text-zinc-500">
                  Bye week
                </span>
              )}
              {player.injuryStatus && (
                <span className={`rounded px-1.5 py-0.5 text-xs ${injuryBadgeClasses(player.injuryStatus)}`}>
                  {player.injuryStatus}
                </span>
              )}
              {player.dataQuality !== "full" && (
                <span className="rounded bg-zinc-400/20 px-1.5 py-0.5 text-xs text-zinc-500">
                  {player.dataQuality === "limited" ? "Limited data" : "Insufficient data"}
                </span>
              )}
            </div>

            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Last {player.gamesUsedForRecent || 0} games (PPR avg)</dt>
                <dd>{player.recentPprAvg != null ? player.recentPprAvg.toFixed(1) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Season avg (PPR)</dt>
                <dd>{player.seasonPprAvg != null ? player.seasonPprAvg.toFixed(1) : "—"}</dd>
              </div>
              {player.matchupContext && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">
                    Last matchup ({player.matchupContext.opponentTeam})
                  </dt>
                  <dd>
                    #{player.matchupContext.rank} of {player.matchupContext.teamCount}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
