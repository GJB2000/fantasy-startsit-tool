import { PageHeader } from "@/components/PageHeader";
import { RankingsTool } from "@/components/RankingsTool";

export default function RankingsPage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball · Legit Rankings"
        title="Who's actually good right now?"
        description="Every rankable player at a position, scored 1-100 by blending our own engine's current-form snapshot with FantasyPros' season-long consensus — so one noisy recent game doesn't tank a normally-great player's rank."
      />
      <RankingsTool />
    </main>
  );
}
