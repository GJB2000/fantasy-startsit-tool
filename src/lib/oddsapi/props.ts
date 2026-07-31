import { normalizePlayerName } from "@/lib/nflverse/playerMatch";
import { oddsApiGet } from "./client";
import type { PlayerProps, PropLine, PropPlayerInput } from "./types";

const SPORT = "americanfootball_nfl";
const EVENTS_TTL = 6 * 60 * 60; // schedule barely changes; events are free anyway
const PROPS_TTL = 60 * 60; // per-event props — cached hard to protect the 500/mo quota

// The prop markets we fetch per event (one request covers all positions'
// needs). Kept to a compact set — each market adds to the per-request
// credit cost on the free tier.
const PROP_MARKETS = [
  "player_pass_yds",
  "player_pass_tds",
  "player_rush_yds",
  "player_reception_yds",
  "player_receptions",
  "player_anytime_td",
];

const MARKET_LABEL: Record<string, string> = {
  player_pass_yds: "Pass yds",
  player_pass_tds: "Pass TDs",
  player_rush_yds: "Rush yds",
  player_reception_yds: "Rec yds",
  player_receptions: "Receptions",
  player_anytime_td: "Anytime TD",
};

// Which markets to surface per position, in display order.
const MARKETS_BY_POSITION: Record<string, string[]> = {
  QB: ["player_pass_yds", "player_pass_tds", "player_rush_yds"],
  RB: ["player_rush_yds", "player_receptions", "player_anytime_td"],
  WR: ["player_reception_yds", "player_receptions", "player_anytime_td"],
  TE: ["player_reception_yds", "player_receptions", "player_anytime_td"],
};

// SportsDataIO team code -> The Odds API's full team name (confirmed
// against a live events response: "Seattle Seahawks", "Los Angeles Rams",
// etc.). Used to find which upcoming game a player is in.
const TEAM_FULL_NAME: Record<string, string> = {
  ARI: "Arizona Cardinals",
  ATL: "Atlanta Falcons",
  BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills",
  CAR: "Carolina Panthers",
  CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals",
  CLE: "Cleveland Browns",
  DAL: "Dallas Cowboys",
  DEN: "Denver Broncos",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  HOU: "Houston Texans",
  IND: "Indianapolis Colts",
  JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs",
  LAC: "Los Angeles Chargers",
  LAR: "Los Angeles Rams",
  LV: "Las Vegas Raiders",
  MIA: "Miami Dolphins",
  MIN: "Minnesota Vikings",
  NE: "New England Patriots",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PHI: "Philadelphia Eagles",
  PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans",
  WAS: "Washington Commanders",
};

interface OddsEvent {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}
interface Outcome {
  name: string;
  description?: string;
  price?: number;
  point?: number;
}
interface Market {
  key: string;
  outcomes: Outcome[];
}
export interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}
interface EventOdds {
  id: string;
  bookmakers: Bookmaker[];
}

function americanOdds(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

/**
 * Pure extraction of a player's display lines from one event's bookmaker
 * data — separated from the fetch so it's unit-testable against a fixture
 * (the populated card can't be exercised in the offseason, when no real
 * props exist). For each position-relevant market, takes the first
 * bookmaker that lists it for this player: the over/under `point` for
 * yardage/reception/TD-total markets, the American odds for anytime-TD.
 */
export function extractPlayerLines(
  bookmakers: Bookmaker[],
  playerName: string,
  position: string
): { lines: PropLine[]; bookmaker: string } {
  const norm = normalizePlayerName(playerName);
  const wanted = MARKETS_BY_POSITION[position] ?? [];
  const lines: PropLine[] = [];
  let bookmaker = "";

  for (const market of wanted) {
    for (const bm of bookmakers) {
      const m = bm.markets?.find((mm) => mm.key === market);
      if (!m) continue;
      const outcomes = m.outcomes.filter((o) => {
        const d = o.description ? normalizePlayerName(o.description) : null;
        const nm = o.name ? normalizePlayerName(o.name) : null;
        return d === norm || nm === norm;
      });
      if (outcomes.length === 0) continue;

      if (market === "player_anytime_td") {
        const scored = outcomes.find((o) => o.name?.toLowerCase() !== "no" && typeof o.price === "number");
        if (scored?.price != null) lines.push({ label: MARKET_LABEL[market], value: americanOdds(scored.price) });
      } else {
        const withPoint = outcomes.find((o) => o.point != null);
        if (withPoint?.point != null) lines.push({ label: MARKET_LABEL[market], value: String(withPoint.point) });
      }
      if (!bookmaker) bookmaker = bm.title;
      break;
    }
  }
  return { lines, bookmaker };
}

/**
 * Player props for a set of players (skill positions only), from The Odds
 * API's current/upcoming game lines — display-only context for the
 * Start/Sit cards, never fed into scoring.
 *
 * Fails open at every step: no key, an API/quota error, the offseason (no
 * props posted yet), or a player The Odds API doesn't line all resolve to
 * "no props for that player" rather than an error — betting lines are a
 * nice-to-have, never load-bearing. Returns only players who actually have
 * at least one line.
 */
export async function getPropsForPlayers(players: PropPlayerInput[]): Promise<Record<number, PlayerProps>> {
  const skill = players.filter((p) => p.position && MARKETS_BY_POSITION[p.position] && p.team && TEAM_FULL_NAME[p.team]);
  if (skill.length === 0) return {};

  let events: OddsEvent[];
  try {
    events = await oddsApiGet<OddsEvent[]>(`/sports/${SPORT}/events`, EVENTS_TTL);
  } catch {
    return {};
  }
  if (!Array.isArray(events) || events.length === 0) return {};
  const sorted = [...events].sort((a, b) => a.commence_time.localeCompare(b.commence_time));

  // Each player -> their next scheduled game (earliest event their team is in).
  const eventByPlayer = new Map<number, OddsEvent>();
  const neededEventIds = new Set<string>();
  for (const p of skill) {
    const full = TEAM_FULL_NAME[p.team!];
    const ev = sorted.find((e) => e.home_team === full || e.away_team === full);
    if (ev) {
      eventByPlayer.set(p.playerId, ev);
      neededEventIds.add(ev.id);
    }
  }
  if (neededEventIds.size === 0) return {};

  const propsByEvent = new Map<string, EventOdds>();
  await Promise.all(
    [...neededEventIds].map(async (id) => {
      try {
        propsByEvent.set(
          id,
          await oddsApiGet<EventOdds>(
            `/sports/${SPORT}/events/${id}/odds?regions=us&markets=${PROP_MARKETS.join(",")}&oddsFormat=american`,
            PROPS_TTL
          )
        );
      } catch {
        // one bad event shouldn't sink the rest
      }
    })
  );

  const result: Record<number, PlayerProps> = {};
  for (const p of skill) {
    const ev = eventByPlayer.get(p.playerId);
    if (!ev) continue;
    const odds = propsByEvent.get(ev.id);
    if (!odds || !odds.bookmakers?.length) continue;

    const { lines, bookmaker } = extractPlayerLines(odds.bookmakers, p.name, p.position!);
    if (lines.length > 0) {
      result[p.playerId] = { bookmaker, game: `${ev.away_team} @ ${ev.home_team}`, lines };
    }
  }

  return result;
}
