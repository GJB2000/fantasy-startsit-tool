"use client";

import { useRecentComparisons } from "@/lib/useRecentComparisons";
import { RecentComparisonsPanel } from "./StartSitRail";

/** Thin client wrapper so the (server) Home page can show real session history without itself needing to be a client component. */
export function RecentComparisonsHomeCard() {
  const { recent } = useRecentComparisons();
  return <RecentComparisonsPanel recent={recent} />;
}
