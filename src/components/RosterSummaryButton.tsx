"use client";

import type { SleeperConnection } from "@/lib/useSleeperConnection";

/**
 * Compact, in-context entry point to the shared roster manager, used on the
 * Waivers and Lineup pages in place of the full inline Sleeper-import panel
 * that used to live on each. Shows the current roster size and connection
 * status; the actual connect/sync/edit flow opens in AppShell's single
 * RosterManager modal (via useRosterModal). Also the way mobile reaches the
 * roster manager, since the sidebar footer is desktop-only.
 */
export function RosterSummaryButton({
  count,
  connection,
  onManage,
}: {
  count: number;
  connection: SleeperConnection | null;
  onManage: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onManage}
      className="flex w-full items-center justify-between gap-3 rounded-3xl border border-foreground/10 bg-surface px-5 py-4 text-left shadow-sm transition-colors hover:border-accent/40"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">
          Your roster · {count} player{count === 1 ? "" : "s"}
        </span>
        <span className="mt-0.5 block truncate text-xs text-foreground/50">
          {connection ? `Synced from ${connection.leagueName}` : "Connect Sleeper or add players manually"}
        </span>
      </span>
      <span className="shrink-0 rounded-full border border-foreground/10 px-3.5 py-1.5 text-xs font-medium text-foreground/70">
        Manage
      </span>
    </button>
  );
}
