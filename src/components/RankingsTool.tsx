"use client";

import { useEffect, useState } from "react";
import { useScoringFormat } from "@/lib/useScoringFormat";
import { RankingsResult, type RankingEntryResponse } from "./RankingsResult";
import { SCORING_FORMAT_OPTIONS } from "./ScoringFormatToggle";
import { SegmentedControl } from "./SegmentedControl";

interface RankingsResponse {
  rankings: RankingEntryResponse[];
  context: { contextNote: string; isInSeason: boolean };
}

// The four rankable positions (D/ST and K were dropped — their "this
// week vs. season rank" streaming shape never fit this tool's "who's
// actually good" framing) plus a combined "Top 100" view — see
// buildRankings.ts's getLegitRankingsOverall for how that one's built
// (a merge of the four position lists' UNCAPPED rankings by their
// already-normalized legitScore, not a new scoring pass, then trimmed
// to the top 100 regardless of position). "OVERALL" isn't a real
// ExtendedPosition, so this tab list is its own type, not a reuse of
// the shared position constants — kept as the internal tab/query-param
// value even though the user-facing label is "Top 100".
type RankingsTab = "OVERALL" | "QB" | "RB" | "WR" | "TE";

const TAB_LABEL: Record<RankingsTab, string> = {
  OVERALL: "Top 100",
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
};

const TAB_OPTIONS: { value: RankingsTab; label: string }[] = (
  ["OVERALL", "QB", "RB", "WR", "TE"] as RankingsTab[]
).map((value) => ({ value, label: TAB_LABEL[value] }));

// "Weekly" = best play for the upcoming week (matchup-adjusted, form-led —
// the tool's original behavior). "Season" = best rest-of-season value,
// leaning on the season-long consensus and ignoring this week's matchup.
type RankingMode = "weekly" | "season";
const MODES: { value: RankingMode; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "season", label: "Season" },
];
const MODE_BLURB: Record<RankingMode, string> = {
  weekly: "Best plays for the upcoming week — matchup-adjusted, recent form leads.",
  season: "Best rest-of-season value — season-long consensus leads, matchup-agnostic.",
};

export function RankingsTool() {
  const [scoringFormat, setScoringFormat] = useScoringFormat();
  const [tab, setTab] = useState<RankingsTab>("OVERALL");
  const [mode, setMode] = useState<RankingMode>("weekly");
  const [response, setResponse] = useState<RankingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing with the /api/rankings response (an external system), keyed on the tab/mode/format deps below; the cancelled-flag cleanup guards against a stale response landing after a newer request starts.
    setLoading(true);
    setError(null);
    fetch(`/api/rankings?position=${tab}&scoringFormat=${scoringFormat}&mode=${mode}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          return;
        }
        setResponse(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't reach the server. Try again shortly.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, scoringFormat, mode]);

  return (
    <div className="mx-auto mt-6 w-full max-w-5xl">
      {/* Three independent axes, each labeled. Only "View" carries the accent —
          when all three groups were volt-filled and unlabeled they read as one
          control with three lit segments rather than three separate settings. */}
      <div className="flex flex-wrap items-end gap-x-7 gap-y-4">
        <SegmentedControl label="View" options={TAB_OPTIONS} value={tab} onChange={setTab} />
        <SegmentedControl label="Timeframe" options={MODES} value={mode} onChange={setMode} tone="secondary" />
        <SegmentedControl
          label="Scoring"
          options={SCORING_FORMAT_OPTIONS}
          value={scoringFormat}
          onChange={setScoringFormat}
          tone="secondary"
        />
      </div>
      <p className="mt-3 text-xs text-foreground/55">{MODE_BLURB[mode]}</p>

      {loading && <p className="mt-8 text-center text-sm text-foreground/50">Ranking every {TAB_LABEL[tab]}…</p>}
      {error && !loading && <p className="mt-8 text-center text-sm text-bad">{error}</p>}

      {response && !loading && (
        <>
          <p className="mt-6 text-xs text-foreground/55">{response.context.contextNote}</p>
          <RankingsResult
            rankings={response.rankings}
            positionLabel={TAB_LABEL[tab]}
            scoringFormat={scoringFormat}
            mode={mode}
            isInSeason={response.context.isInSeason}
          />
        </>
      )}
    </div>
  );
}
