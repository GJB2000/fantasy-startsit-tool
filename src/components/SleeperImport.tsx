"use client";

import { useState } from "react";
import type { PlayerSummary } from "@/lib/sportsdata/types";
import type { SleeperConnection } from "@/lib/useSleeperConnection";

interface LeagueOption {
  leagueId: string;
  name: string;
  season: string;
  rosterPositions: string[];
}

interface SleeperImportProps {
  connection: SleeperConnection | null;
  onConnectionChange: (next: SleeperConnection | null) => void;
  onImportPlayers: (players: PlayerSummary[]) => void;
}

/**
 * Connection state is owned by the parent (WaiverTool.tsx) rather than
 * this component, since the fetch that ranks candidates also needs
 * `connection.leagueRosteredPlayerIds` — two separate useSleeperConnection()
 * hook instances (one here, one there) would each keep their own copy of
 * localStorage-synced state and wouldn't see each other's updates within
 * a render.
 */
export function SleeperImport({ connection, onConnectionChange, onImportPlayers }: SleeperImportProps) {
  const [username, setUsername] = useState("");
  const [leagues, setLeagues] = useState<LeagueOption[]>([]);
  const [pendingUser, setPendingUser] = useState<{ userId: string; username: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{ count: number; unmatched: string[] } | null>(null);

  async function handleFindLeagues() {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    setLeagues([]);
    setImportSummary(null);
    try {
      const res = await fetch(`/api/sleeper/leagues?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't find that Sleeper account.");
        return;
      }
      if (data.leagues.length === 0) {
        setError(`No NFL leagues found for "${username.trim()}".`);
        return;
      }
      setPendingUser({ userId: data.userId, username: data.username });
      setLeagues(data.leagues);
    } catch {
      setError("Couldn't reach Sleeper. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function importRoster(target: SleeperConnection) {
    setLoading(true);
    setError(null);
    setImportSummary(null);
    try {
      const res = await fetch(`/api/sleeper/roster?leagueId=${target.leagueId}&userId=${target.userId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't load that roster.");
        return;
      }
      onImportPlayers(data.players);
      // Refresh the stored connection with the latest leaguewide
      // rostered-players snapshot every time we sync, so it never goes
      // stale relative to the actual league.
      onConnectionChange({ ...target, leagueRosteredPlayerIds: data.leagueRosteredPlayerIds });
      setImportSummary({ count: data.players.length, unmatched: data.unmatched });
    } catch {
      setError("Couldn't reach Sleeper. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePickLeague(league: LeagueOption) {
    if (!pendingUser) return;
    const next: SleeperConnection = {
      username: pendingUser.username,
      userId: pendingUser.userId,
      leagueId: league.leagueId,
      leagueName: `${league.name} (${league.season})`,
      leagueRosteredPlayerIds: [],
      rosterPositions: league.rosterPositions,
    };
    onConnectionChange(next);
    setLeagues([]);
    setPendingUser(null);
    await importRoster(next);
  }

  function handleChangeLeague() {
    setUsername(connection?.username ?? "");
    onConnectionChange(null);
    setImportSummary(null);
    setError(null);
  }

  if (connection) {
    return (
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
          My roster — synced from Sleeper
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/50">
          Connected as <span className="font-medium text-foreground/70">{connection.username}</span> ·{" "}
          {connection.leagueName}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => importRoster(connection)}
            disabled={loading}
            className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-ink transition-opacity disabled:opacity-50"
          >
            {loading ? "Syncing…" : "Sync roster"}
          </button>
          <button
            type="button"
            onClick={handleChangeLeague}
            className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-xs font-medium text-foreground/55 transition-colors hover:text-foreground"
          >
            Change league
          </button>
        </div>
        {importSummary && (
          <p className="mt-2.5 text-xs text-foreground/50">
            Imported {importSummary.count} player{importSummary.count === 1 ? "" : "s"}.
            {importSummary.unmatched.length > 0 && (
              <> Couldn&apos;t match: {importSummary.unmatched.join(", ")}.</>
            )}
          </p>
        )}
        {connection.leagueRosteredPlayerIds.length > 0 && (
          <p className="mt-1.5 text-xs text-foreground/55">
            Also excluding {connection.leagueRosteredPlayerIds.length} player
            {connection.leagueRosteredPlayerIds.length === 1 ? "" : "s"} already rostered by other teams in this
            league.
          </p>
        )}
        {error && <p className="mt-2.5 text-xs text-bad">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/55">
        My roster — connect Sleeper
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-foreground/50">
        Enter your Sleeper username and we&apos;ll pull your real roster.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFindLeagues()}
          placeholder="Sleeper username"
          className="min-w-0 flex-1 rounded-2xl border border-foreground/10 bg-surface text-foreground px-4 py-2.5 text-sm shadow-sm outline-none transition-shadow placeholder:text-foreground/35 focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <button
          type="button"
          onClick={handleFindLeagues}
          disabled={loading || !username.trim()}
          className="shrink-0 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-opacity disabled:opacity-40"
        >
          {loading ? "Searching…" : "Find my leagues"}
        </button>
      </div>

      {error && <p className="mt-2.5 text-xs text-bad">{error}</p>}

      {leagues.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          <p className="text-xs text-foreground/50">Pick a league:</p>
          {leagues.map((league) => (
            <button
              key={league.leagueId}
              type="button"
              onClick={() => handlePickLeague(league)}
              disabled={loading}
              className="flex items-center justify-between rounded-2xl border border-foreground/10 bg-surface px-4 py-2.5 text-left text-sm shadow-sm transition-colors hover:border-accent/40 disabled:opacity-50"
            >
              <span className="font-medium">{league.name}</span>
              <span className="text-xs text-foreground/55">{league.season}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
