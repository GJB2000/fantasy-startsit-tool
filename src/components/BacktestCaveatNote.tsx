export function BacktestCaveatNote() {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
      <strong>Heads up:</strong>{" "}
      historical injury status can&apos;t be reconstructed from this data source
      (archived records only ever show None/Out/Probable, never Questionable/Doubtful
      — and Out is indistinguishable from simply not playing). This backtest evaluates
      the recent-form and matchup-difficulty logic only, not the live tool&apos;s
      injury-flagging behavior.
    </div>
  );
}
