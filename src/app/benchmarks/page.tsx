import { BarChart3, Gauge, Timer } from "lucide-react";
import { Section } from "@/components/section";

const benchmarkRows = [
  {
    mode: "Summarize compact",
    input: "1,690 tokens",
    output: "330 tokens",
    reduction: "80%",
    note: "Best for agent continuation state with readable structure."
  },
  {
    mode: "Summarize micro",
    input: "1,357 tokens",
    output: "35 tokens",
    reduction: "97%",
    note: "Best for ultra-short machine checkpoints."
  },
  {
    mode: "Compress context",
    input: "190 tokens",
    output: "67 tokens",
    reduction: "65%",
    note: "Best for reusable project memory packets."
  },
  {
    mode: "Long-context precompute",
    input: "2,710 tokens",
    output: "663 tokens",
    reduction: "76%",
    note: "Best for large documents uploaded before paid x402 fetch."
  }
] as const;

const beforeAfter = {
  before:
    "City operations team is preparing a continuation handoff for a six-month night-bus pilot across three neighborhoods. Late-shift hospital workers and airport staff currently wait 35-50 minutes after midnight. The goal is to reduce average wait time below 18 minutes without increasing the annual operating budget. Current plan keeps the daytime network unchanged, adds three overnight loops, and uses smaller electric shuttles. Blockers include charging capacity, weekend driver coverage, and airport curb windows.",
  after:
    "Night-bus pilot: reduce post-midnight waits below 18m without budget increase. Plan: three overnight loops, small electric shuttles, unchanged daytime network. Issues: eight-vehicle charging cap, weekend driver coverage, airport 10m curb windows. Next: charger schedule, driver coverage, airport terms."
};

export default function BenchmarksPage() {
  return (
    <main>
      <Section eyebrow="Benchmarks" title="Context compression examples for autonomous agents.">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard icon={BarChart3} label="Best compact reduction" value="80%" />
          <MetricCard icon={Gauge} label="Best micro reduction" value="97%" />
          <MetricCard icon={Timer} label="Long context input" value="2,710 tokens" />
        </div>

        <div className="mt-8 overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-4 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/45">
            <span>Mode</span>
            <span>Input</span>
            <span>Output</span>
            <span>Reduction</span>
          </div>
          {benchmarkRows.map((row) => (
            <div key={row.mode} className="grid grid-cols-4 gap-3 border-t border-line px-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-white">{row.mode}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{row.note}</p>
              </div>
              <p className="font-mono text-white/70">{row.input}</p>
              <p className="font-mono text-mint">{row.output}</p>
              <p className="font-mono text-aqua">{row.reduction}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-md border border-line bg-white/[0.035] p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-white/42">Before</p>
            <p className="mt-4 text-sm leading-7 text-white/62">{beforeAfter.before}</p>
          </article>
          <article className="rounded-md border border-mint/25 bg-mint/10 p-5">
            <p className="text-sm uppercase tracking-[0.18em] text-mint">After ContextKit</p>
            <p className="mt-4 font-mono text-sm leading-7 text-white/75">{beforeAfter.after}</p>
          </article>
        </div>
      </Section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.035] p-5">
      <Icon className="h-5 w-5 text-mint" />
      <p className="mt-4 text-sm text-white/48">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
