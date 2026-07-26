import type { TradeEvaluation, TradePlayerResult, TradeVerdict } from "@/lib/trade/evaluateTrade";

interface TradeResultProps {
  evaluation: TradeEvaluation;
  contextNote: string;
}

// Full literal class strings, not interpolated — Tailwind's static scanner
// can't resolve a template like `bg-${token}/12`, only complete class names
// it finds verbatim in source.
const VERDICT_BADGE: Record<TradeVerdict, string> = {
  good: "bg-good/12",
  bad: "bg-bad/12",
  fair: "bg-caution/12",
  unknown: "bg-info/12",
};

function VerdictIcon({ verdict }: { verdict: TradeVerdict }) {
  if (verdict === "good") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M5 13l4 4L19 7" stroke="var(--good)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (verdict === "bad") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="var(--bad)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (verdict === "fair") {
    return (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
        <path d="M8 7l8 10M16 7l-8 10" stroke="var(--caution)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9.2" stroke="var(--caution)" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--info)" strokeWidth="2" />
      <path d="M15.5 15.5L20 20" stroke="var(--info)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PlayerValueCard({ player }: { player: TradePlayerResult }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{player.displayName}</span>
        {player.position && (
          <span className="text-xs text-foreground/45">
            {player.position}
            {player.team ? ` · ${player.team}` : ""}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-foreground/[0.07] pt-2">
        <span className="text-xs text-foreground/50">Rest of season</span>
        <span className="font-rounded text-[15px] font-semibold tabular-nums">
          {player.restOfSeasonTotal != null ? `${player.restOfSeasonTotal.toFixed(1)} pts` : "—"}
        </span>
      </div>
      {player.restOfSeasonTotal != null && (
        <div className="mt-1 flex items-baseline justify-between text-xs text-foreground/45">
          <span>{player.gamesRemaining} games left</span>
          <span className="font-rounded tabular-nums">{(player.restOfSeasonPerGame ?? 0).toFixed(1)}/gm</span>
        </div>
      )}
    </div>
  );
}

function SideColumn({ label, players, total }: { label: string; players: TradePlayerResult[]; total: number | null }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{label}</h3>
        <span className="font-rounded text-sm font-semibold tabular-nums">
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
  return (
    <div className="mt-8 space-y-5">
      <div className="rounded-3xl border border-foreground/10 bg-surface p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${VERDICT_BADGE[evaluation.verdict]}`}>
            <VerdictIcon verdict={evaluation.verdict} />
          </span>
          <div>
            <p className="text-lg font-semibold leading-snug tracking-tight">{evaluation.headline}</p>
            <p className="mt-1 text-xs text-foreground/45">{contextNote}</p>
          </div>
        </div>

        {evaluation.reasoning.length > 0 && (
          <div className="mt-5 border-t border-foreground/[0.07] pt-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40">Why</span>
            <ul className="mt-3 flex flex-col gap-2.5">
              {evaluation.reasoning.map((line, i) => (
                <li key={i} className="relative pl-4 text-sm leading-relaxed text-foreground/70">
                  <span className="absolute left-0 top-[0.55em] h-1.5 w-1.5 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SideColumn label="You give" players={evaluation.give} total={evaluation.giveTotal} />
        <SideColumn label="You get" players={evaluation.get} total={evaluation.getTotal} />
      </div>
    </div>
  );
}
