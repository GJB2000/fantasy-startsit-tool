"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProps } from "@/lib/oddsapi/types";
import type { ComparisonResult as ComparisonResultData } from "@/lib/recommendation/types";
import type { PlayerSummary, ScoringFormat } from "@/lib/sportsdata/types";
import { usePendingRestoreComparison } from "@/lib/usePendingRestoreComparison";
import { useRecentComparisons, type RecentComparison } from "@/lib/useRecentComparisons";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { ComparisonResult } from "./ComparisonResult";
import { PlayerMultiSelect } from "./PlayerMultiSelect";
import { ScoringFormatToggle } from "./ScoringFormatToggle";
import { StartSitRail } from "./StartSitRail";

const MAX_PLAYERS = 4;

interface CompareResponse {
  result: ComparisonResultData;
  context: { contextNote: string; lastCompletedSeason: number };
}

export function StartSitTool() {
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerSummary[]>([]);
  const [response, setResponse] = useState<CompareResponse | null>(null);
  const [propsByPlayerId, setPropsByPlayerId] = useState<Record<number, PlayerProps>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const { recent, addComparison } = useRecentComparisons();
  const [pendingRestore, setPendingRestore] = usePendingRestoreComparison();
  const restoredRef = useRef(false);
  // Guards the async betting-lines fetch against a stale response landing after
  // a newer comparison has started.
  const propsTokenRef = useRef("");

  function addPlayer(player: PlayerSummary) {
    setSelectedPlayers((prev) =>
      prev.length >= MAX_PLAYERS ? prev : [...prev, player]
    );
    setResponse(null);
  }

  function removePlayer(playerId: number) {
    setSelectedPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
    setResponse(null);
  }

  async function runComparison(players: PlayerSummary[], format: ScoringFormat) {
    if (players.length < 2) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setPropsByPlayerId({});
    const ids = players.map((p) => p.playerId).join(",");
    propsTokenRef.current = ids;
    try {
      const res = await fetch(`/api/compare?ids=${ids}&scoringFormat=${format}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResponse(data);
      // Betting lines load separately so they never delay the verdict.
      fetch(`/api/props?ids=${ids}`)
        .then((r) => (r.ok ? r.json() : { propsByPlayerId: {} }))
        .then((d) => {
          if (propsTokenRef.current === ids) setPropsByPlayerId(d.propsByPlayerId ?? {});
        })
        .catch(() => {});
      const result: ComparisonResultData = data.result;
      const recommended = result.players.find((p) => p.playerId === result.recommendedPlayerId);
      addComparison({
        headline: result.headline,
        recommendedName: recommended?.displayName ?? null,
        otherNames: result.players.filter((p) => p.playerId !== result.recommendedPlayerId).map((p) => p.displayName),
        isCloseCall: result.isCloseCall,
        hasLimitedData: result.hasLimitedData,
        players,
        scoringFormat: format,
      });
    } catch {
      setError("Couldn't reach the server. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  function handleCompare() {
    runComparison(selectedPlayers, scoringFormat);
  }

  // Re-open a past comparison from the rail: restore its exact players +
  // format and re-run it (fresh data, and reflected in the pickers above).
  function handleSelectRecent(entry: RecentComparison) {
    if (entry.players.length < 2) return;
    setSelectedPlayers(entry.players);
    setScoringFormat(entry.scoringFormat);
    runComparison(entry.players, entry.scoringFormat);
  }

  // Handed off from the Home recent-comparisons widget (usePendingRestoreComparison):
  // restore that comparison once on mount, then clear the slot. The ref guards
  // against React strict-mode's double-invoked mount effect re-running it.
  useEffect(() => {
    if (restoredRef.current || !pendingRestore) return;
    restoredRef.current = true;
    const entry = pendingRestore;
    setPendingRestore(null);
    handleSelectRecent(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRestore]);

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-foreground/12 bg-surface-glass p-5 shadow-[0_18px_46px_-24px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.14em] text-accent"
              style={{ fontFamily: "var(--font-engraved)" }}
            >
              Set the Matchup
            </span>
            <ScoringFormatToggle
              editorial
              value={scoringFormat}
              onChange={(format) => {
                setScoringFormat(format);
                setResponse(null);
              }}
            />
          </div>

          <PlayerMultiSelect
            editorial
            selected={selectedPlayers}
            onAdd={addPlayer}
            onRemove={removePlayer}
            max={MAX_PLAYERS}
            placeholder={(count) => (count === 0 ? "Search your first player…" : "Search another player…")}
          />

          <button
            type="button"
            onClick={handleCompare}
            disabled={selectedPlayers.length < 2 || loading}
            style={{ fontFamily: "var(--font-engraved)" }}
            className="mt-5 w-full rounded-full bg-accent px-4 py-3.5 text-[12px] uppercase tracking-[0.14em] text-accent-ink shadow-[0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_60%,transparent)] transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? "Comparing…" : "Compare"}
          </button>

          {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        </div>

        {response && (
          <ComparisonResult
            result={response.result}
            contextNote={response.context.contextNote}
            scoringFormat={scoringFormat}
            propsByPlayerId={propsByPlayerId}
            dataSeason={response.context.lastCompletedSeason}
          />
        )}
      </div>

      <StartSitRail recent={recent} onSelectRecent={handleSelectRecent} />
    </div>
  );
}
