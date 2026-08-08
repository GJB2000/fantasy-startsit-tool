"use client";

import type { GameWeather } from "@/lib/nflverse/schedules";
import type { PlayerProps } from "@/lib/oddsapi/types";
import type { ComparisonResult as ComparisonResultData, PlayerScoreBreakdown } from "@/lib/recommendation/types";
import type { ScoringFormat } from "@/lib/sportsdata/types";
import styles from "./ComparisonResult.module.css";

interface ComparisonResultProps {
  result: ComparisonResultData;
  contextNote: string;
  scoringFormat: ScoringFormat;
  /** Display-only betting lines per playerId (The Odds API) — empty in the offseason before books post props. */
  propsByPlayerId?: Record<number, PlayerProps>;
}

const FORMAT_LABEL: Record<ScoringFormat, string> = {
  ppr: "PPR",
  half_ppr: "Half PPR",
  standard: "Standard",
};

function isSkillCardPosition(position: string | null): boolean {
  return position === "QB" || position === "RB" || position === "WR" || position === "TE";
}

const DOME_ROOFS = new Set(["dome", "closed"]);

/** nflverse's schedule only carries actual recorded conditions, not a pregame forecast — wind/temp are frequently blank for games that haven't happened yet. Roof type is a fixed stadium property, so it's always knowable in advance. */
function formatWeather(weather: GameWeather | null): string {
  if (!weather) return "Not yet available";
  if (DOME_ROOFS.has(weather.roof)) return "Dome";
  if (weather.temp == null && weather.wind == null) return "Forecast pending";
  const parts: string[] = [];
  if (weather.temp != null) parts.push(`${weather.temp}°F`);
  if (weather.wind != null) parts.push(`${weather.wind} mph wind`);
  return parts.join(" · ");
}

function matchupLabel(diffFromAverage: number): { text: string; tone: "good" | "bad" | "neutral" } {
  if (diffFromAverage > 1.5) return { text: "Favorable", tone: "good" };
  if (diffFromAverage < -1.5) return { text: "Tough matchup", tone: "bad" };
  return { text: "Average matchup", tone: "neutral" };
}

const DTAG_TONE: Record<"good" | "bad" | "neutral", string> = {
  good: styles.dtagGood,
  bad: styles.dtagBad,
  neutral: styles.dtagNeutral,
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

// ---- confidence (unchanged logic; see prior history for the numbers) ----
interface ConfidenceRates {
  confident: number;
  limitedData: number;
  closeCall: number;
}
const CONFIDENCE_BY_POSITION: Record<string, ConfidenceRates> = {
  QB: { confident: 55, limitedData: 65, closeCall: 45 },
  RB: { confident: 62, limitedData: 60, closeCall: 52 },
  WR: { confident: 53, limitedData: 61, closeCall: 49 },
  TE: { confident: 59, limitedData: 56, closeCall: 56 },
  DST: { confident: 64, limitedData: 66, closeCall: 64 },
  K: { confident: 39, limitedData: 55, closeCall: 50 },
};
const POOLED_CONFIDENCE: ConfidenceRates = { confident: 52, limitedData: 59, closeCall: 51 };
const POSITION_DISPLAY_LABEL: Record<string, string> = {
  QB: "QB", RB: "RB", WR: "WR", TE: "TE", DST: "D/ST", K: "K",
};

function getConfidencePct(result: ComparisonResultData): number {
  if (result.confidence != null) return result.confidence;
  const winner = result.players.find((p) => p.playerId === result.recommendedPlayerId);
  const rates = (winner?.position && CONFIDENCE_BY_POSITION[winner.position]) || POOLED_CONFIDENCE;
  if (result.isCloseCall) return rates.closeCall;
  if (result.hasLimitedData) return rates.limitedData;
  return rates.confident;
}

/** Short tier word for the engraved descriptor line. */
function confTier(pct: number): string {
  if (pct < 56) return "Coin flip";
  if (pct < 66) return "Lean";
  if (pct < 74) return "Confident";
  return "Strong pick";
}

// Same reference points on the 0-100 win-rate scale used everywhere else.
const CONFIDENCE_SCALE_MARKS = [
  { pct: 50, label: "Coin flip" },
  { pct: 60, label: "Lean" },
  { pct: 75, label: "Confident" },
  { pct: 90, label: "Lock" },
];

// ---- health ----
function healthStatusValue(player: PlayerScoreBreakdown): string {
  if (player.injuryStatus) return player.injuryStatus;
  if (player.isOnByeThisWeek) return "On bye";
  return "Active";
}
function healthToneClass(player: PlayerScoreBreakdown): string | undefined {
  if (player.injuryStatus === "Out" || player.injuryStatus === "Doubtful") return styles.aiBad;
  if (player.injuryStatus) return styles.aiBad;
  if (player.isOnByeThisWeek) return undefined;
  return styles.aiGood;
}

// ---- case for / against (unchanged copy logic) ----
function buildCaseFor(player: PlayerScoreBreakdown): string {
  const pos = (player.position && POSITION_DISPLAY_LABEL[player.position]) || "this spot";
  const m = player.matchupContext;
  const games = player.gamesUsedForRecent;
  if (m && matchupLabel(m.diffFromAverage).tone === "good") {
    return `Draws a favorable matchup — ${m.opponentTeam} has been one of the softer defenses against ${pos}s lately.`;
  }
  if (player.recentPprAvg != null && player.recentPprCeiling != null) {
    return `In form lately — averaging ${player.recentPprAvg.toFixed(1)} PPR over the last ${games} game${
      games === 1 ? "" : "s"
    }, with a recent high of ${player.recentPprCeiling.toFixed(1)}.`;
  }
  if (player.finalScore != null) {
    return `Projects for ${player.finalScore.toFixed(1)} PPR points this week.`;
  }
  return `Limited recent data, but still worth a look here.`;
}
function buildCaseAgainst(player: PlayerScoreBreakdown): string {
  const pos = (player.position && POSITION_DISPLAY_LABEL[player.position]) || "this spot";
  const m = player.matchupContext;
  if (player.injuryStatus) return `Injury risk — currently listed ${player.injuryStatus}.`;
  if (player.isOnByeThisWeek) return `On a bye this week — won't score at all.`;
  if (m && matchupLabel(m.diffFromAverage).tone === "bad") {
    return `Tough matchup — ${m.opponentTeam} has been one of the stingier defenses against ${pos}s.`;
  }
  if (player.dataQuality !== "full") return `Thin recent sample — limited data makes this projection less certain.`;
  if (player.recentPprFloor != null && player.recentPprAvg != null && player.recentPprFloor < player.recentPprAvg * 0.6) {
    return `Boom-or-bust — has dipped as low as ${player.recentPprFloor.toFixed(1)} in a recent game.`;
  }
  return `Few red flags — the main risk is normal week-to-week variance.`;
}

// ---- per-position stat grid (same fields as before) ----
const VOLUME_UNIT_LABEL: Record<string, string> = { RB: "Touches / game", WR: "Targets / game", TE: "Targets / game" };
const RECENT_PPR_BAR_MAX = 25;
const VOLUME_BAR_MAX: Record<string, number> = { QB: 12, RB: 25, WR: 12, TE: 12 };
const DROP_RATE_BAR_MAX = 0.15;
const RZ_TOUCH_BAR_MAX: Record<string, number> = { RB: 6, QB: 3 };
const PASS_ATT_BAR_MAX = 40;
const QB_SUCCESS_RATE_BAR_MAX = 0.55;
const QB_EPA_BAR_MIN = -0.2;
const QB_EPA_BAR_RANGE = 0.5;

interface StatSlot {
  label: string;
  value: string | null;
  fill: number | null;
}

function buildRzDropSlot(player: PlayerScoreBreakdown): StatSlot {
  const pos = player.position;
  if (pos === "RB" && player.redZoneTouchesAvg != null) {
    return { label: "Red-zone / game", value: player.redZoneTouchesAvg.toFixed(1), fill: clamp01(player.redZoneTouchesAvg / RZ_TOUCH_BAR_MAX.RB) };
  }
  if (pos === "QB" && player.redZoneTouchesAvg != null) {
    return { label: "Red-zone rushes", value: player.redZoneTouchesAvg.toFixed(1), fill: clamp01(player.redZoneTouchesAvg / RZ_TOUCH_BAR_MAX.QB) };
  }
  if ((pos === "WR" || pos === "TE") && player.dropRateAvg != null) {
    return { label: "Drop rate", value: `${(player.dropRateAvg * 100).toFixed(0)}%`, fill: clamp01(player.dropRateAvg / DROP_RATE_BAR_MAX) };
  }
  const label = pos === "WR" || pos === "TE" ? "Drop rate" : "Red-zone / game";
  return { label, value: null, fill: null };
}
function recentAvgSlot(player: PlayerScoreBreakdown, formatLabel: string): StatSlot {
  return player.recentPprAvg != null
    ? { label: `Recent avg · ${formatLabel}`, value: player.recentPprAvg.toFixed(1), fill: clamp01(player.recentPprAvg / RECENT_PPR_BAR_MAX) }
    : { label: `Recent avg · ${formatLabel}`, value: null, fill: null };
}
function buildQbStatSlots(player: PlayerScoreBreakdown, formatLabel: string): StatSlot[] {
  const passAtt: StatSlot = player.recentVolumeAvg != null
    ? { label: "Pass att / game", value: player.recentVolumeAvg.toFixed(1), fill: clamp01(player.recentVolumeAvg / PASS_ATT_BAR_MAX) }
    : { label: "Pass att / game", value: null, fill: null };
  const successRate: StatSlot = player.successRateAvg != null
    ? { label: "Success rate", value: `${(player.successRateAvg * 100).toFixed(0)}%`, fill: clamp01(player.successRateAvg / QB_SUCCESS_RATE_BAR_MAX) }
    : { label: "Success rate", value: null, fill: null };
  const epa: StatSlot = player.epaPerPlayAvg != null
    ? { label: "EPA / dropback", value: (player.epaPerPlayAvg >= 0 ? "+" : "") + player.epaPerPlayAvg.toFixed(2), fill: clamp01((player.epaPerPlayAvg - QB_EPA_BAR_MIN) / QB_EPA_BAR_RANGE) }
    : { label: "EPA / dropback", value: null, fill: null };
  return [recentAvgSlot(player, formatLabel), passAtt, successRate, epa];
}
function buildStatSlots(player: PlayerScoreBreakdown, formatLabel: string): StatSlot[] {
  const pos = player.position;
  if (pos === "QB") return buildQbStatSlots(player, formatLabel);
  const recentAvg = recentAvgSlot(player, formatLabel);
  const opportunity: StatSlot = pos && VOLUME_UNIT_LABEL[pos] && player.recentVolumeAvg != null
    ? { label: VOLUME_UNIT_LABEL[pos], value: player.recentVolumeAvg.toFixed(1), fill: clamp01(player.recentVolumeAvg / (VOLUME_BAR_MAX[pos] ?? 20)) }
    : { label: (pos && VOLUME_UNIT_LABEL[pos]) || "Opportunity", value: null, fill: null };
  const snapShare: StatSlot = player.snapShareAvg != null
    ? { label: "Snap share", value: `${(player.snapShareAvg * 100).toFixed(0)}%`, fill: clamp01(player.snapShareAvg) }
    : { label: "Snap share", value: null, fill: null };
  return [recentAvg, opportunity, snapShare, buildRzDropSlot(player)];
}

// ---- presentation ----
function RangeLine({ player }: { player: PlayerScoreBreakdown }) {
  const { recentPprFloor: floor, recentPprCeiling: ceiling, finalScore: proj } = player;
  if (floor == null || ceiling == null) return null;
  if (floor === ceiling) {
    return <div className={styles.rsingle}>Only one recent game to go on — {floor.toFixed(1)} pts</div>;
  }
  const scaleMin = Math.min(floor, proj ?? floor, 0);
  const scaleMax = Math.max(ceiling, proj ?? ceiling, 1) * 1.05;
  const range = scaleMax - scaleMin || 1;
  const toPct = (v: number) => ((v - scaleMin) / range) * 100;
  const floorPct = toPct(floor);
  const ceilingPct = toPct(ceiling);
  return (
    <div className={styles.rng}>
      <div className={styles.rtrack}>
        <span className={styles.rfill} style={{ left: `${floorPct}%`, width: `${ceilingPct - floorPct}%` }} />
        {proj != null && <span className={styles.rmark} style={{ left: `calc(${toPct(proj)}% - 0.75px)` }} />}
      </div>
      <div className={styles.rends}>
        <span>Recent low {floor.toFixed(1)}</span>
        <span>Recent high {ceiling.toFixed(1)}</span>
      </div>
    </div>
  );
}

function StatGrid({ player, formatLabel }: { player: PlayerScoreBreakdown; formatLabel: string }) {
  const slots = buildStatSlots(player, formatLabel);
  return (
    <div className={styles.stats}>
      {slots.map((s, i) => (
        <div key={`${s.label}-${i}`} className={styles.st}>
          <div className={styles.stL}>{s.label}</div>
          <div className={`${styles.stV} ${styles.n}`}>{s.value ?? "—"}</div>
          {s.fill != null && (
            <div className={styles.stB}>
              <i style={{ width: `${s.fill * 100}%` }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  rank,
  isRecommended,
  formatLabel,
  props,
}: {
  player: PlayerScoreBreakdown;
  rank: number;
  isRecommended: boolean;
  formatLabel: string;
  props?: PlayerProps;
}) {
  const m = player.matchupContext;
  const matchup = m ? matchupLabel(m.diffFromAverage) : null;
  const posLine = [player.position, player.team].filter(Boolean).join(" · ");
  const opp = m?.opponentTeam ?? player.nextOpponent?.team ?? null;
  const week = player.nextOpponent?.week;
  const skill = isSkillCardPosition(player.position);
  const betLines = props?.lines ?? [];

  return (
    <section className={`${styles.card} ${isRecommended ? "" : styles.bench} ${styles.rise}`} style={{ animationDelay: `${0.1 + rank * 0.06}s` }}>
      <div className={styles.chead}>
        <div className={`${styles.rk} ${styles.n}`}>{rank}</div>
        <div>
          <div className={styles.cname}>{player.displayName}</div>
          {posLine && <div className={styles.cmeta}>{posLine}</div>}
        </div>
        <div className={`${styles.tag} ${isRecommended ? styles.tagStart : styles.tagBench}`}>{isRecommended ? "Start" : "Bench"}</div>
      </div>

      <div className={`${styles.rule} ${styles.ruleHair}`} />

      <div className={styles.opp}>
        <div className={styles.oppWho}>
          {player.team ? <b>{player.team}</b> : "—"}
          {opp ? ` vs ${opp}` : ""}
          {week ? ` · Week ${week}` : ""}
        </div>
        {matchup && m && (
          <div className={`${styles.dtag} ${DTAG_TONE[matchup.tone]}`}>
            {matchup.text} · #{m.rank} of {m.teamCount}
          </div>
        )}
      </div>

      <div className={styles.rule} />

      <div className={styles.prow}>
        <div>
          <div className={styles.lab}>Projection</div>
          <div className={styles.pbig}>
            <span className={styles.n}>{player.finalScore != null ? player.finalScore.toFixed(1) : "—"}</span>
            <small>{formatLabel}</small>
          </div>
        </div>
        <RangeLine player={player} />
      </div>

      <div className={styles.rule} />

      <div className={styles.mid}>
        <StatGrid player={player} formatLabel={formatLabel} />
        <div className={styles.aside}>
          <div>
            <div className={styles.aiL}>Weather</div>
            <div className={styles.aiV}>{player.nextOpponent ? formatWeather(player.nextGameWeather) : "—"}</div>
          </div>
          <div>
            <div className={styles.aiL}>Health</div>
            <div className={`${styles.aiV} ${healthToneClass(player) ?? ""}`}>{healthStatusValue(player)}</div>
          </div>
        </div>
      </div>

      <div className={styles.rule} />

      <div className={styles.case}>
        <div className={styles.caseCol}>
          <div className={`${styles.caseH} ${styles.caseFor}`}>Case for</div>
          <p>{buildCaseFor(player)}</p>
        </div>
        <div className={styles.caseCol}>
          <div className={`${styles.caseH} ${styles.caseAgainst}`}>Case against</div>
          <p>{buildCaseAgainst(player)}</p>
        </div>
      </div>

      {skill && (
        <>
          <div className={styles.rule} />
          <div>
            <div className={styles.betH}>
              <div className={styles.lab}>Betting Lines</div>
              {betLines.length > 0 && <div className={styles.bk}>{props?.bookmaker}</div>}
            </div>
            {betLines.length > 0 ? (
              <>
                <div className={styles.betL}>
                  {betLines.map((line, i) => (
                    <div key={`${line.label}-${i}`} className={styles.bc}>
                      <div className={styles.bcL}>{line.label}</div>
                      <div className={`${styles.bcV} ${styles.n}`}>{line.value}</div>
                    </div>
                  ))}
                </div>
                <p className={styles.betf}>Market lines — shown for context, not part of our projection.</p>
              </>
            ) : (
              <p className={styles.betPending}>
                Sportsbook lines post closer to kickoff — pass, rush and receiving props will show here once this week&rsquo;s game is on the board.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export function ComparisonResult({ result, contextNote, scoringFormat, propsByPlayerId }: ComparisonResultProps) {
  const formatLabel = FORMAT_LABEL[scoringFormat];
  const winner = result.players.find((p) => p.playerId === result.recommendedPlayerId) ?? null;
  const confPct = getConfidencePct(result);

  const rankedPlayers = [...result.players].sort((a, b) => {
    if (a.finalScore == null) return 1;
    if (b.finalScore == null) return -1;
    return b.finalScore - a.finalScore;
  });

  const others = rankedPlayers.filter((p) => p.playerId !== winner?.playerId).map((p) => p.displayName);
  const overText = others.length === 0 ? null : others.length <= 2 ? others.join(" & ") : `${others.length} others`;

  const week = winner?.nextOpponent?.week;
  const fillWidth = `${Math.max(0, Math.min(100, confPct))}%`;

  return (
    <div className={`${styles.sheet} ${styles.grain} ${styles.rise}`}>
      <div className={styles.body}>
        <div className={styles.mast}>
          <div className={styles.mastL}>The Matchup</div>
          <div className={styles.mastR}>Legitfootball · Start / Sit</div>
        </div>
        <div className={styles.dateline}>
          {week ? <span>Week {week}</span> : null}
          <span>{formatLabel} Scoring</span>
          <span>{rankedPlayers.length}-Player Comparison</span>
        </div>

        {winner ? (
          <section className={styles.verdict}>
            <div className={styles.kick}>The Verdict</div>
            <h2 className={styles.vname}>{winner.displayName}</h2>
            {overText && (
              <p className={styles.vsub}>
                to start over <b>{overText}</b>
              </p>
            )}
            <div className={styles.vrule} />
            <div className={styles.vgrid}>
              <div>
                <div className={`${styles.cnum} ${styles.n}`}>
                  {confPct}
                  <small>%</small>
                </div>
                <div className={styles.cdesc}>{confTier(confPct)} · Confidence</div>
              </div>
              <div>
                <div className={styles.meter}>
                  <span className={styles.meterFill} style={{ width: fillWidth }} />
                  {CONFIDENCE_SCALE_MARKS.map((mk) => (
                    <span key={mk.label} className={styles.tk} style={{ left: `${mk.pct}%` }} />
                  ))}
                </div>
                <div className={styles.mscale}>
                  {CONFIDENCE_SCALE_MARKS.map((mk) => (
                    <span key={mk.label}>{mk.label}</span>
                  ))}
                </div>
                <p className={styles.vnote}>
                  Read from how often picks with this scoring gap have actually been right — a record, not a per-pick guess.
                </p>
              </div>
            </div>
            <p className={styles.vnote} style={{ marginTop: "16px" }}>
              {result.headline}
            </p>
          </section>
        ) : (
          <section className={styles.verdict}>
            <div className={styles.kick}>The Verdict</div>
            <p className={styles.unresolved}>{result.headline}</p>
          </section>
        )}

        {rankedPlayers.map((player, i) => (
          <PlayerCard
            key={player.playerId ?? `unresolved-${i}`}
            player={player}
            rank={i + 1}
            isRecommended={player.playerId === result.recommendedPlayerId}
            formatLabel={formatLabel}
            props={player.playerId != null ? propsByPlayerId?.[player.playerId] : undefined}
          />
        ))}

        <div className={styles.colophon}>
          <span>Legitfootball Almanac</span>
          <span>{formatLabel} · 2025</span>
        </div>

        {contextNote && (
          <p style={{ marginTop: "10px", fontSize: "11px", color: "var(--faint)", fontFamily: "var(--fb)" }}>{contextNote}</p>
        )}
      </div>
    </div>
  );
}
