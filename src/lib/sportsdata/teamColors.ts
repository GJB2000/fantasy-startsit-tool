import "server-only";
import { REVALIDATE, sportsDataFetch } from "./client";

export interface TeamColors {
  primary: string;
  secondary: string;
  /** Whether light or dark text reads better on `primary` — computed, not taken from the feed, because a team's own secondary colour is often unreadable on its primary (Atlanta's is black on red). */
  ink: "light" | "dark";
}

interface TeamRow {
  Key: string;
  PrimaryColor: string | null;
  SecondaryColor: string | null;
}

/** Relative luminance, so the number on a jersey is always legible regardless of team. */
function inkFor(hex: string): "light" | "dark" {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "dark" : "light";
}

/** Team colours by SportsDataIO team key, for the jersey avatars. 32 rows, cached hard — these change roughly never. */
export async function getTeamColors(): Promise<Record<string, TeamColors>> {
  const teams = await sportsDataFetch<TeamRow[]>("/Teams", { revalidate: REVALIDATE.teamStats });
  const out: Record<string, TeamColors> = {};
  for (const t of teams) {
    const primary = t.PrimaryColor ? `#${t.PrimaryColor}` : "#333333";
    out[t.Key] = {
      primary,
      secondary: t.SecondaryColor ? `#${t.SecondaryColor}` : "#ffffff",
      ink: inkFor(t.PrimaryColor ?? "333333"),
    };
  }
  return out;
}
