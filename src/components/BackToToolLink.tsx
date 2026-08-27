"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePendingRestoreComparison } from "@/lib/usePendingRestoreComparison";
import { useRecentComparisons } from "@/lib/useRecentComparisons";
import { useLastTrade, usePendingRestoreTrade } from "@/lib/usePendingRestoreTrade";
import { usePendingRerun } from "@/lib/usePendingRerun";

/**
 * Only these can be returned to, matched exactly. An allowlist rather than
 * "any same-origin path" so a hand-edited `?from=` can't be used to dress an
 * arbitrary URL up as our own navigation.
 */
const TOOL_LABEL: Record<string, string> = {
  "/": "Home",
  "/start-sit": "Start/Sit",
  "/trade": "Trade Assistant",
  "/waivers": "Waivers",
  "/lineup": "Lineup",
  "/rankings": "Legit Rankings",
  "/stats": "Player Stats",
};

/**
 * "Back to <tool>" on a player's stats card, shown only when you actually
 * arrived from one (PlayerLink sets `?from=`). Typing the URL directly, or
 * landing from outside, shows nothing rather than a back link to somewhere you
 * were never at.
 *
 * Start/Sit and the Trade Assistant get more than a plain link. Both hold
 * their result in component state, so returning would otherwise re-mount an
 * empty tool — back on the page, but not back at what you were looking at.
 * Clicking hands the run off to an in-memory restore slot
 * (usePendingRestoreComparison / usePendingRestoreTrade) that the tool reads
 * on mount and re-runs.
 *
 * Both are guarded on the recorded run actually containing this player, so a
 * stale or unrelated run can't be restored — if the guard fails it degrades to
 * a plain link, which is still better than being stranded. Start/Sit reads the
 * top of useRecentComparisons (running a comparison records it there); the
 * Trade Assistant records its own last run, since nothing surfaces trade
 * history to read from.
 *
 * Waivers and Lineup need less: they have no selection to carry, since their
 * inputs (roster, slots, format) are already persisted — so returning just
 * flags the tool to run again on arrival (usePendingRerun). No per-player
 * guard there for the same reason: re-running is idempotent and can't restore
 * the "wrong" board the way a stale selection could.
 */
export function BackToToolLink({ playerId }: { playerId: number }) {
  const params = useSearchParams();
  const { recent } = useRecentComparisons();
  const [, setPendingComparison] = usePendingRestoreComparison();
  const [lastTrade] = useLastTrade();
  const [, setPendingTrade] = usePendingRestoreTrade();
  const [, setPendingRerun] = usePendingRerun();

  const from = params.get("from");
  const label = from ? TOOL_LABEL[from] : undefined;
  if (!from || !label) return null;

  const comparison =
    from === "/start-sit" && recent[0]?.players.some((p) => p.playerId === playerId) ? recent[0] : null;
  const trade =
    from === "/trade" &&
    [...(lastTrade?.give ?? []), ...(lastTrade?.get ?? [])].some((p) => p.playerId === playerId)
      ? lastTrade
      : null;

  return (
    <Link
      href={from}
      onClick={() => {
        if (comparison) setPendingComparison(comparison);
        if (trade) setPendingTrade(trade);
        if (from === "/waivers" || from === "/lineup") setPendingRerun(from);
      }}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/55 transition-colors hover:text-accent"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to {label}
    </Link>
  );
}
