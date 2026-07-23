interface BacktestCaveatNoteProps {
  /** True when displaying the 2024 nflverse-only validation source instead of the primary 2025 SportsDataIO pipeline. */
  showNflverseCaveat?: boolean;
}

export function BacktestCaveatNote({ showNflverseCaveat = false }: BacktestCaveatNoteProps) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
        <strong>Heads up:</strong>{" "}
        historical injury status can&apos;t be reconstructed from this data source
        (archived records only ever show None/Out/Probable, never Questionable/Doubtful
        — and Out is indistinguishable from simply not playing). This backtest evaluates
        the recent-form and matchup-difficulty logic only, not the live tool&apos;s
        injury-flagging behavior.
      </div>
      {showNflverseCaveat && (
        <div className="rounded-md border border-sky-500/40 bg-sky-500/10 p-3 text-xs text-sky-700 dark:text-sky-400">
          <strong>2024 is an out-of-sample check:</strong>{" "}
          SportsDataIO doesn&apos;t serve 2024 data on this plan, so this runs the exact
          same, unchanged engine config against a second, independently-sourced season
          (nflverse) to see whether the 2025-tuned weights actually generalize. Team
          pace/game-script data isn&apos;t available for this source, so that one
          baseline always reports no-pick here.
        </div>
      )}
    </div>
  );
}
