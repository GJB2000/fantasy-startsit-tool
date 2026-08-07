import type { Metadata } from "next";
import { Barlow_Condensed, Cinzel, Inter, JetBrains_Mono, Jost } from "next/font/google";
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

// Editorial "almanac" faces, used only by the Start/Sit result sheet
// (ComparisonResult.module.css): Jost stands in for Futura (display name +
// big figures), Cinzel for the engraved Copperplate-style small-caps labels.
const jost = Jost({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-engraved",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Legitfootball — Fantasy Football Tools",
  description: "Start/sit calls, trade grades, and waiver targets — real data, a straight answer, and the reasoning behind it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${barlowCondensed.variable} ${inter.variable} ${jetbrainsMono.variable} ${jost.variable} ${cinzel.variable}`}
    >
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
