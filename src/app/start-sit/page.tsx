import { PageHeader } from "@/components/PageHeader";
import { StartSitTool } from "@/components/StartSitTool";

export default function StartSitPage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball · Start/Sit Tool"
        title="Who should you start?"
        description="Pick two (or more) players fighting for the same roster spot. We'll pull their real recent stats and matchup data and give you a straight answer — with the reasoning behind it."
      />
      <StartSitTool />
    </main>
  );
}
