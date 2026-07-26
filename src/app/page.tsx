import { StartSitTool } from "@/components/StartSitTool";

export default function Home() {
  return (
    <main className="flex-1 bg-background px-6 py-12 font-sans text-foreground sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          Legitfootball · Start/Sit Tool
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Who should you start?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
          Pick two (or more) players fighting for the same roster spot. We&apos;ll pull
          their real recent stats and matchup data and give you a straight answer —
          with the reasoning behind it.
        </p>
      </div>
      <StartSitTool />
    </main>
  );
}
