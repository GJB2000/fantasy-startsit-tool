interface BacktestCaveatNoteProps {
  /** The currently-selected backtest season, e.g. "2024" — interpolated into the nflverse caveat below. */
  season?: string;
  /** True when displaying an nflverse-only validation season instead of the primary 2025 SportsDataIO pipeline. */
  showNflverseCaveat?: boolean;
}

export function BacktestCaveatNote({ season, showNflverseCaveat = false }: BacktestCaveatNoteProps) {
  return (
    <div className="space-y-2">
      <div className="rounded-[3px] border border-caution/40 bg-caution/10 p-3 text-xs text-caution">
        <strong>Heads up:</strong>{" "}
        historical injury status can&apos;t be reconstructed from this data source
        (archived records only ever show None/Out/Probable, never Questionable/Doubtful
        — and Out is indistinguishable from simply not playing). This backtest evaluates
        the recent-form and matchup-difficulty logic only, not the live tool&apos;s
        injury-flagging behavior.
      </div>
      {showNflverseCaveat && (
        <div className="rounded-[3px] border border-info/40 bg-info/10 p-3 text-xs text-info">
          <strong>{season ?? "This season"} is an out-of-sample check:</strong>{" "}
          SportsDataIO doesn&apos;t serve {season ?? "this"}{" "}
          data on this plan, so this runs
          the exact same, unchanged engine config against a second, independently-sourced
          season (nflverse) to see whether the 2025-tuned weights actually generalize. Team
          pace/game-script data isn&apos;t available for this source, so that one
          baseline always reports no-pick here.
        </div>
      )}
    </div>
  );
}
