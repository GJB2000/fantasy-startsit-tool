"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePendingRestoreComparison } from "@/lib/usePendingRestoreComparison";
import { useRecentComparisons } from "@/lib/useRecentComparisons";

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
 * Start/Sit gets more than a plain link. Its comparison lives in component
 * state, so returning would otherwise re-mount an empty picker — you'd be back
 * on the page but not back at your comparison. Clicking hands the comparison
 * to the in-memory restore slot the Home recent-comparisons widget already
 * uses (usePendingRestoreComparison), which StartSitTool reads on mount and
 * re-runs. Guarded on the most recent comparison actually containing this
 * player: running a comparison records it at the top of the recent list, so
 * that's the one you clicked from — and if it isn't, this falls back to a
 * plain link rather than restoring some unrelated comparison.
 *
 * The other tools return you to the tool but don't restore their result — see
 * the open item.
 */
export function BackToToolLink({ playerId }: { playerId: number }) {
  const params = useSearchParams();
  const { recent } = useRecentComparisons();
  const [, setPendingRestore] = usePendingRestoreComparison();

  const from = params.get("from");
  const label = from ? TOOL_LABEL[from] : undefined;
  if (!from || !label) return null;

  const restorable =
    from === "/start-sit" && recent[0]?.players.some((p) => p.playerId === playerId) ? recent[0] : null;

  return (
    <Link
      href={from}
      onClick={() => restorable && setPendingRestore(restorable)}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground/55 transition-colors hover:text-accent"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
        <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back to {label}
    </Link>
  );
}
