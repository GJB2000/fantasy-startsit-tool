"use client";

import { useRouter } from "next/navigation";
import { usePendingRestoreComparison } from "@/lib/usePendingRestoreComparison";
import { useRecentComparisons, type RecentComparison } from "@/lib/useRecentComparisons";
import { RecentComparisonsPanel } from "./StartSitRail";

/** Thin client wrapper so the (server) Home page can show real session history without itself needing to be a client component. Clicking an entry hands it off (in-memory) and navigates to /start-sit, which re-opens it. */
export function RecentComparisonsHomeCard() {
  const { recent } = useRecentComparisons();
  const router = useRouter();
  const [, setPending] = usePendingRestoreComparison();

  function handleSelect(entry: RecentComparison) {
    setPending(entry);
    router.push("/start-sit");
  }

  return <RecentComparisonsPanel recent={recent} onSelect={handleSelect} />;
}
