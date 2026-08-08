import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Archivo, Barlow_Condensed, Inter, JetBrains_Mono, Jost } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

// Self-hosted at build time (no external requests) — same privacy/perf
// posture as the previous system-font stack, just a real webfont now
// instead of relying on the OS. Barlow Condensed = display/headlines,
// Inter = body, JetBrains Mono = every stat/number in the app (see
// globals.css's --font-mono, which every component already routes
// through via one `font-mono` utility class).
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono-loaded",
  display: "swap",
});

// Editorial "almanac" faces (app-wide, via --font-jost / --font-engraved and
// the CSS-module result sheets): Jost stands in for Futura for display names +
// big figures, and Archivo — a modern grotesk — for the uppercase, letter-
// spaced labels (eyebrows / section headers / stat labels). The --font-engraved
// variable name is kept for historical reasons (it previously held Cinzel);
// everything downstream routes through that one var.
const jost = Jost({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

const cinzel = Archivo({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-engraved",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Legitfootball — Fantasy Football Tools",
  description: "Start/sit calls, trade grades, and waiver targets — real data, a straight answer, and the reasoning behind it.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the theme override from a cookie so the correct data-theme is
  // rendered server-side — no flash of the wrong theme before hydration.
  // Absent ("system") falls through to the CSS prefers-color-scheme media
  // query. The client keeps this cookie in sync (see AppShell/useTheme).
  const themeCookie = (await cookies()).get("theme")?.value;
  const dataTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined;

  return (
    // suppressHydrationWarning: defensive against attributes some browser
    // extensions inject on <html>; the data-theme above is rendered on both
    // server and client from the same cookie, so it doesn't itself mismatch.
    <html
      lang="en"
      data-theme={dataTheme}
      suppressHydrationWarning
      className={`h-full antialiased ${barlowCondensed.variable} ${inter.variable} ${jetbrainsMono.variable} ${jost.variable} ${cinzel.variable}`}
    >
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
