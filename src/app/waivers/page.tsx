import { PageHeader } from "@/components/PageHeader";
import { WaiverTool } from "@/components/WaiverTool";

export default function WaiversPage() {
  return (
    <main className="bg-background px-6 py-10 font-sans text-foreground sm:px-10 sm:py-12">
      <PageHeader
        eyebrow="Legitfootball · Waiver Wire"
        title="Who's worth a pickup?"
        description="We look for players getting real opportunity — volume, snaps, targets — who haven't been paid off in points yet. Mark who's already on your roster and we'll suggest who to drop."
      />
      <WaiverTool />
    </main>
  );
}
