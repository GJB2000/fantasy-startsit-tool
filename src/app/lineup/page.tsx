import { PageHeader } from "@/components/PageHeader";
import { LineupTool } from "@/components/LineupTool";

export default function LineupPage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball · Lineup Optimizer"
        title="Who should start this week?"
        description="Import your roster from Sleeper or add players by hand, tell us how many starters go at each spot, and we'll fill out your best lineup — with the same reasoning behind every call as everywhere else in this app."
      />
      <LineupTool />
    </main>
  );
}
