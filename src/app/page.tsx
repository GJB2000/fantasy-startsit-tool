import { StartSitTool } from "@/components/StartSitTool";

export default function Home() {
  return (
    <main className="flex-1 bg-background px-6 py-12 font-sans text-foreground sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">Who should you start?</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Pick two (or more) players fighting for the same roster spot. We&apos;ll pull
          their real recent stats and matchup data and give you a straight answer —
          with the reasoning behind it.
        </p>
      </div>
      <StartSitTool />
    </main>
  );
}
