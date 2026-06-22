"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Activity, ArrowRight, BrainCircuit, Clock, Coins, FileOutput, Gauge, Play, RotateCcw, Sparkles, Workflow } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrX402Command } from "@/lib/bankr-x402";

const starter = `user: We are coordinating a six-month night-bus pilot for late-shift hospital workers, airport staff, and hospitality employees across three neighborhoods.
assistant: The project goal is to reduce average wait time after midnight from 35-50 minutes to under 18 minutes without increasing the approved annual transit budget.
user: The current plan keeps the daytime bus network unchanged, adds three overnight loop routes, and uses smaller electric shuttles for low-demand segments.
assistant: The transit authority approved a temporary depot lease near the airport, but charging capacity is limited to eight vehicles at once and must be scheduled carefully.
user: Driver scheduling is constrained by union rules requiring two consecutive rest days, and weekend coverage is still unresolved for the east neighborhood loop.
assistant: The hospital district needs reliable arrivals before the 5:30 AM shift change. The airport authority will only allow curb access if shuttles arrive inside assigned 10-minute windows.
user: Completed work includes ridership interviews, stop safety audits, proposed route maps, a driver staffing model, and a draft airport curb-access agreement.
assistant: Open decisions include whether the east loop should run every 20 or 30 minutes, whether to reserve two vehicles for airport overflow, and how to handle charger priority during cold weather.
user: The operations lead prefers concise weekly updates with clear risks, short action lists, and no long policy background unless a decision requires it.
assistant: Immediate next steps are to finalize charger scheduling, confirm weekend driver coverage, negotiate the airport window penalties, and prepare a city council briefing for next Tuesday.
user: Create a concise demo output that summarizes, compresses, hands off, and extracts durable planning memory from this transit pilot conversation.`;

type DemoResult = {
  requestId?: string;
  outputs?: {
    summary?: unknown;
    compression?: { compressedContext?: string; [key: string]: unknown };
    handoff?: unknown;
    profile?: unknown;
    memory?: unknown;
  };
  metrics?: {
    inputTokens?: number;
    compressedTokens?: number;
    outputTokens?: number;
    compressionReductionPercent?: number;
    fullOutputReductionPercent?: number;
    latencyMs?: number;
    totalX402CostUsd?: number;
  };
  quota?: { used?: number; remaining?: number; limit?: number; resetAt?: string };
  error?: unknown;
};

export default function DemoPage() {
  const [text, setText] = useState(starter);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const messages = useMemo(() => linesToMessages(text), [text]);
  const paidCommands = useMemo(() => [
    ["Summarize", bankrX402Command("summarize", { messages })],
    ["Compress context", bankrX402Command("compress-context", { messages })],
    ["Agent handoff", bankrX402Command("handoff", { messages })],
    ["Extract profile", bankrX402Command("extract-profile", { messages, mode: "extract-profile" })],
    ["Memory enrichment", bankrX402Command("extract-profile", { messages, mode: "memory-enrichment" })]
  ], [messages]);
  const allEndpointsCommand = useMemo(() => paidCommands.map(([label, command]) => `# ${label}\n${command}`).join("\n\n"), [paidCommands]);
  const inputTokens = result?.metrics?.inputTokens ?? 0;
  const compressedTokens = result?.metrics?.compressedTokens ?? 0;
  const reduction = result?.metrics?.compressionReductionPercent ?? 0;

  function runDemo() {
    setError("");
    setResult(null);
    setIsRunning(true);
    void (async () => {
      try {
        const response = await fetch("/api/demo/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages })
        });
        const payload = (await response.json()) as DemoResult;
        setResult(payload);
        if (!response.ok) setError(JSON.stringify(payload, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Demo request failed.");
      } finally {
        setIsRunning(false);
      }
    })();
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:py-10">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-44 top-36 h-[34rem] w-[34rem] rounded-full bg-mint/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute -right-48 top-96 h-[32rem] w-[32rem] rounded-full bg-aqua/[0.065] blur-[110px]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.55rem] border border-white/[0.13] bg-carbon/80 shadow-[0_24px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42 sm:px-7"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> Demo pipeline / live</span><span className="hidden sm:inline">one request, five continuity outputs</span><span className="text-mint">3 runs / day</span></div>
          <div className="grid gap-7 px-6 py-8 sm:px-9 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-10">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Full pipeline demo</div><h1 className="mt-5 text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Watch one conversation become reusable agent state.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Run real summarize, compression, handoff, profile, and memory extraction in one request. The outputs are generated by ContextKit, not hardcoded examples.</p></div>
            <div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><Info icon={<BrainCircuit className="h-4 w-4" />} title="Read conversation" text="Plain agent messages become structured input." /><Info icon={<Workflow className="h-4 w-4" />} title="Run five primitives" text="Summary, compression, handoff, profile, memory." /><Info icon={<FileOutput className="h-4 w-4" />} title="Inspect real output" text="Tokens, latency, cost, and continuation payloads." /></div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-[1.45rem] border border-line bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-5">
              <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">01 / Source conversation</p><h2 className="mt-2 text-xl font-semibold text-white">Context in</h2></div>
              <button type="button" onClick={() => setText(starter)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-white/70 transition hover:border-white/25 hover:text-white">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-white/38"><span>Plain text accepted</span><span>{messages.length} messages</span></div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-[520px] w-full rounded-xl border border-line bg-ink/80 p-4 font-mono text-sm leading-7 text-white outline-none transition focus:border-mint/60 focus:shadow-[0_0_0_3px_rgba(115,243,195,0.08)]" />
            <button type="button" onClick={runDemo} disabled={isRunning} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">
              {isRunning ? <Spinner /> : <Play className="h-4 w-4" />} {isRunning ? "Running full pipeline..." : "Run full ContextKit demo"}<ArrowRight className="h-4 w-4" />
            </button>
            {error ? <pre className="whitespace-pre-wrap rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
          </section>

          <section className="rounded-[1.45rem] border border-line bg-carbon/72 p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-line pb-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua">02 / Continuity outputs</p><h2 className="mt-2 text-xl font-semibold text-white">Pipeline results</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-aqua/25 bg-aqua/[0.07]"><Activity className="h-4 w-4 text-aqua" /></span></div>
            <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-4">
              <Metric icon={<Activity className="h-4 w-4" />} label="Original" value={inputTokens} />
              <Metric icon={<Gauge className="h-4 w-4" />} label="Compressed" value={compressedTokens} />
              <Metric icon={<Clock className="h-4 w-4" />} label="Latency" value={`${result?.metrics?.latencyMs ?? 0}ms`} />
              <Metric icon={<Coins className="h-4 w-4" />} label="API value" value={`$${result?.metrics?.totalX402CostUsd ?? "0.000"}`} />
            </div>

            <div className="mt-5 rounded-xl border border-line bg-ink/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">Compression reduction</span>
                <span className="font-semibold text-mint">{reduction}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-mint to-aqua transition-all" style={{ width: `${Math.min(100, Math.max(0, reduction))}%` }} />
              </div>
              <p className="mt-3 text-xs text-white/45">
                Quota: {result?.quota?.used ?? 0}/{result?.quota?.limit ?? 3} used today. Remaining: {result?.quota?.remaining ?? 3}.
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              <Panel title="Summary output" value={JSON.stringify(result?.outputs?.summary ?? { status: "Run the demo to generate a real summary." }, null, 2)} />
              <Panel title="Compressed context" value={result?.outputs?.compression?.compressedContext ?? "Run the demo to generate compressed context."} />
              <Panel title="Agent handoff payload" value={JSON.stringify(result?.outputs?.handoff ?? { status: "Run the demo to generate handoff JSON." }, null, 2)} />
              <Panel title="Extracted profile" value={JSON.stringify(result?.outputs?.profile ?? { status: "Run the demo to generate profile JSON." }, null, 2)} />
              <Panel title="Memory enrichment" value={JSON.stringify(result?.outputs?.memory ?? { status: "Run the demo to generate memory enrichment JSON." }, null, 2)} />
              <div>
                <h2 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Run every endpoint</h2>
                <p className="mb-3 text-sm leading-6 text-white/55">
                  Bankr-hosted x402 commands are paid one endpoint at a time. Memory enrichment uses the same <code>contextkit-profile</code> hosted endpoint with <code>{'mode:"memory-enrichment"'}</code>.
                </p>
                <Panel title="Full pipeline command" value={allEndpointsCommand} />
                <p className="mt-3 text-xs leading-5 text-white/40">
                  For single-endpoint commands, use the Playground or API reference. This demo keeps one copy of the full pipeline command to avoid repeated endpoint blocks.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function linesToMessages(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [role, ...content] = line.split(":");
      const normalizedRole = role === "assistant" || role === "system" || role === "tool" ? role : "user";
      return { role: normalizedRole, content: content.join(":").trim() || line };
    });
}

function Info({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 bg-carbon/90 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06] text-mint">{icon}</span>
      <div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-white/52">{text}</p></div>
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="bg-ink/70 p-4">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">
        <span className="text-mint">{icon}</span> {label}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-[-0.025em] text-white">{value}</p>
    </div>
  );
}

function Panel({ title, value }: { title: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink/45">
      <h2 className="border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{title}</h2>
      <div className="p-4"><CodeBlock code={value} /></div>
    </div>
  );
}
