import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Start/Sit — Fantasy Football Lineup Helper",
  description: "Compare two players competing for the same roster spot and get a clear, explained start/sit call.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex gap-4 border-b border-zinc-200 px-6 py-3 text-sm dark:border-zinc-800">
          <Link href="/" className="font-medium hover:underline">
            Start/Sit
          </Link>
          <Link href="/backtest" className="text-zinc-500 hover:underline">
            Backtest
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
