import type { Metadata } from "next";
import { Section } from "@/components/section";

export const metadata: Metadata = {
  title: "Benchmarks: Context Compression and Handoffs",
  description: "See ContextKit token reduction and continuation benchmarks for summaries, compressed context, handoffs, and agent memory.",
  alternates: { canonical: "/benchmarks" },
  openGraph: {
    title: "ContextKit Benchmarks",
    description: "Measure the context and token savings that keep long-running agents moving.",
    url: "/benchmarks"
  }
};

const benchmarks = [
  {
    endpoint: "summarize",
    mode: "micro",
    inputTokens: 1357,
    outputTokens: 35,
    reduction: "97%",
    payload: "Operational planning context",
    outputShape: '{ "mode", "micro", "metrics" }',
    useWhen: "Smallest possible continuation checkpoint for agents."
  },
  {
    endpoint: "summarize",
    mode: "compact",
    inputTokens: 1690,
    outputTokens: 330,
    reduction: "80%",
    payload: "Project state with blockers and next steps",
    outputShape: '{ "mode", "compact", "state", "metrics" }',
    useWhen: "Readable state snapshot for another agent."
  },
  {
    endpoint: "compress-context",
    mode: "default",
    inputTokens: 190,
    outputTokens: 67,
    reduction: "65%",
    payload: "Short project memory",
    outputShape: '{ "compressedContext", "state", "entities", "metrics" }',
    useWhen: "Reusable context packet before a larger model call."
  },
  {
    endpoint: "handoff",
    mode: "default",
    inputTokens: 612,
    outputTokens: 184,
    reduction: "70%",
    payload: "Successor-agent handoff",
    outputShape: '{ "project", "completed", "pending", "blockers", "startHere" }',
    useWhen: "Passing work from one agent or worker to another."
  },
  {
    endpoint: "extract-profile",
    mode: "memory-enrichment",
    inputTokens: 118,
    outputTokens: 74,
    reduction: "37%",
    payload: "Preference-change message",
    outputShape: '{ "activeMemories", "evolvingMemories", "conflicts", "confidence" }',
    useWhen: "Updating durable user memory records."
  },
  {
    endpoint: "context upload + summarize",
    mode: "compact",
    inputTokens: 2710,
    outputTokens: 663,
    reduction: "76%",
    payload: "Large infrastructure planning document",
    outputShape: '{ "contextId" } then paid summarize result',
    useWhen: "Large payloads that should be uploaded before paid x402 fetch."
  }
] as const;

const benchmarkNotes = [
  "Numbers are example runs from production-style agent planning payloads, not synthetic lorem ipsum.",
  "Output tokens include the useful response body for continuation, not only the natural-language summary line.",
  "Micro is optimized for total response minimization; compact is optimized for structured continuation state.",
  "Long-context flows upload content first, then fetch the precomputed result with Bankr x402 using contextId."
];

export default function BenchmarksPage() {
  return (
    <main>
      <Section eyebrow="Agent Benchmark Reference" title="Token reduction examples for ContextKit endpoints.">
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          This page is intentionally kept as a crawlable benchmark reference for agents and search systems. It is not shown in the main navigation.
        </p>

        <div className="mt-8 overflow-hidden rounded-md border border-line">
          <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr_1.3fr] gap-3 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.16em] text-white/45">
            <span>Endpoint</span>
            <span>Mode</span>
            <span>Input</span>
            <span>Output</span>
            <span>Reduction</span>
            <span>Best use</span>
          </div>
          {benchmarks.map((row) => (
            <div key={`${row.endpoint}-${row.mode}`} className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_0.7fr_1.3fr] gap-3 border-t border-line px-4 py-4 text-sm">
              <div>
                <p className="font-mono text-mint">{row.endpoint}</p>
                <p className="mt-1 text-xs leading-5 text-white/45">{row.payload}</p>
              </div>
              <p className="font-mono text-white/70">{row.mode}</p>
              <p className="font-mono text-white/70">{row.inputTokens}</p>
              <p className="font-mono text-aqua">{row.outputTokens}</p>
              <p className="font-mono text-mint">{row.reduction}</p>
              <div>
                <p className="text-white/65">{row.useWhen}</p>
                <p className="mt-1 font-mono text-xs leading-5 text-white/40">{row.outputShape}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {benchmarkNotes.map((note) => (
            <p key={note} className="rounded-md border border-line bg-white/[0.035] p-4 text-sm leading-6 text-white/60">
              {note}
            </p>
          ))}
        </div>
      </Section>
    </main>
  );
}
