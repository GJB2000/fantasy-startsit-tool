import "server-only";
import { REVALIDATE, sportsDataFetch } from "./client";
import type { PlayerProps, PropLine } from "./playerPropTypes";

/**
 * One sportsbook line for one player and market, as SportsDataIO returns it.
 * Keyed by PlayerID — the reason this replaced The Odds API, which had to be
 * joined on a normalized name (see CLAUDE.md item 177).
 */
interface PlayerPropRow {
  PlayerID: number;
  Name: string;
  Team: string | null;
  Opponent: string | null;
  /** The market, e.g. "Passing Yards", "Receptions", "Fantasy Points PPR". */
  Description: string;
  OverUnder: number | null;
  OverPayout: number | null;
  UnderPayout: number | null;
}

/**
 * Which markets to surface, per position, in display order. Deliberately a
 * short list: the feed carries 15 markets per player and a card showing all
 * of them is a data dump, not context.
 *
 * "Fantasy Points PPR" leads for every position — it's the market's own
 * version of the number the card is already showing, which makes it the one
 * line a reader can immediately compare against our projection.
 */
// Labels state exactly what the market IS. "Total Touchdowns" is an
// over/under on TDs scored, NOT an anytime-touchdown price — labelling it
// "Anytime TD" (as a first pass did) would misdescribe a real betting line,
// which is worse than showing no line at all.
const MARKETS_BY_POSITION: Record<string, { key: string; label: string }[]> = {
  QB: [
    { key: "Fantasy Points PPR", label: "Fantasy pts" },
    { key: "Passing Yards", label: "Pass yds" },
    { key: "Passing Touchdowns", label: "Pass TDs" },
    { key: "Rushing Yards", label: "Rush yds" },
  ],
  RB: [
    { key: "Fantasy Points PPR", label: "Fantasy pts" },
    { key: "Rushing Yards", label: "Rush yds" },
    { key: "Receptions", label: "Receptions" },
    { key: "Total Touchdowns", label: "Total TDs" },
  ],
  WR: [
    { key: "Fantasy Points PPR", label: "Fantasy pts" },
    { key: "Receiving Yards", label: "Rec yds" },
    { key: "Receptions", label: "Receptions" },
    { key: "Total Touchdowns", label: "Total TDs" },
  ],
  TE: [
    { key: "Fantasy Points PPR", label: "Fantasy pts" },
    { key: "Receiving Yards", label: "Rec yds" },
    { key: "Receptions", label: "Receptions" },
    { key: "Total Touchdowns", label: "Total TDs" },
  ],
};

/**
 * Display-only betting lines for the given players, for one week.
 *
 * Never touches PlayerScoreBreakdown or any scoring path: props have no
 * historical coverage on this subscription (item 177), so they can't be
 * backtested and therefore can't be a signal — only context.
 *
 * Returns {} for any player the feed doesn't cover, and the caller treats a
 * throw as "no lines" — a betting-lines panel is not worth failing a
 * comparison over.
 */
export async function getPlayerPropsByPlayerId(
  season: number,
  week: number,
  players: { playerId: number; position: string | null }[]
): Promise<Record<number, PlayerProps>> {
  if (players.length === 0) return {};

  const rows = await sportsDataFetch<PlayerPropRow[]>(
    `/PlayerPropsByWeek/${season}REG/${week}`,
    { revalidate: REVALIDATE.playerProps, base: "oddsV3" }
  );

  const byPlayer = new Map<number, PlayerPropRow[]>();
  for (const row of rows) {
    const list = byPlayer.get(row.PlayerID);
    if (list) list.push(row);
    else byPlayer.set(row.PlayerID, [row]);
  }

  const out: Record<number, PlayerProps> = {};
  for (const { playerId, position } of players) {
    const playerRows = byPlayer.get(playerId);
    const markets = position ? MARKETS_BY_POSITION[position] : undefined;
    if (!playerRows || playerRows.length === 0 || !markets) continue;

    const lines: PropLine[] = [];
    for (const market of markets) {
      const row = playerRows.find((r) => r.Description === market.key);
      if (row?.OverUnder == null) continue;
      lines.push({ label: market.label, value: String(row.OverUnder) });
    }
    if (lines.length === 0) continue;

    const first = playerRows[0];
    out[playerId] = {
      game: first.Opponent ? `${first.Team ?? "—"} vs ${first.Opponent}` : (first.Team ?? ""),
      lines,
    };
  }
  return out;
}
