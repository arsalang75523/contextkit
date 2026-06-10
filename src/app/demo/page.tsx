"use client";

import { useMemo, useState } from "react";
import { Activity, Clock, Coins, Gauge, Play, RotateCcw } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrX402Command } from "@/lib/bankr-x402";

const starter = `user: We are building ContextKit, a Bankr-native context infrastructure API for autonomous AI agents.
assistant: The backend runs on Hetzner with Docker Compose, Next.js, Hono, Postgres, and Drizzle migrations.
user: Bankr-hosted x402 endpoints live at x402.bankr.bot and forward paid requests to internal ContextKit endpoints.
assistant: Production fixes included Docker env forwarding, public HTTPS resource URLs, and robust JSON parsing for fenced LLM responses.
user: The product has four paid services: summarize, compress-context, handoff, and extract-profile. Summarize costs $0.002, compress-context costs $0.003, handoff costs $0.003, and profile costs $0.004.
assistant: The dashboard supports signup, login, API key creation, revocation, usage analytics, webhook management, payment history, and token savings charts.
user: New users should not be asked for an x402 password. They should copy a Bankr x402 command, run it from a Bankr-authenticated terminal, approve payment, and receive JSON.
assistant: ContextKit API keys are separate. They are for dashboards, analytics, token estimates, webhook management, and advanced direct API usage.
user: Webhooks need registration, signed delivery, replay, delivery logs, and secret rotation. Billing should show Bankr-hosted x402 payments that ContextKit records after paid requests are forwarded.
assistant: The next production priorities are real account onboarding, better dashboard UX, webhook UI, payment reconciliation, monitoring, backups, and a real domain.
user: Create a concise demo output that proves ContextKit can summarize, compress, hand off, and extract user memory from this deployment context.`;

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
    ["Profile + hosted memory", bankrX402Command("extract-profile", { messages })],
    ["Direct memory enrichment", `curl -X POST https://YOUR_CONTEXTKIT_URL/api/memory-enrichment \\
  -H "Authorization: Bearer ck_live_..." \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ messages }).replaceAll("'", "'\\''")}'`]
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
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Killer Demo</p>
        <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Run the complete ContextKit context pipeline.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Paste a long conversation, run one real demo request, and see summarization, compression, agent handoff, profile extraction, token savings, latency, and x402 cost in one place.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Info title="Real processing" text="The demo calls Bankr LLM through ContextKit. Outputs are not hardcoded." />
          <Info title="Daily guardrail" text="Each logged-in account gets 3 full demo runs per day, because one demo runs all ContextKit AI services." />
          <Info title="Production path" text="For paid agent traffic, use Bankr-hosted x402 commands shown below." />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-md border border-line bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-white">Original conversation</h2>
              <button type="button" onClick={() => setText(starter)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm text-white/70">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-[520px] w-full rounded-md border border-line bg-ink/80 p-4 font-mono text-sm leading-7 text-white outline-none focus:border-mint" />
            <button type="button" onClick={runDemo} disabled={isRunning} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-mint px-5 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60">
              {isRunning ? <Spinner /> : <Play className="h-4 w-4" />} {isRunning ? "Running full pipeline..." : "Run full ContextKit demo"}
            </button>
            {error ? <pre className="whitespace-pre-wrap rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
          </section>

          <section className="rounded-md border border-line bg-carbon/72 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              <Metric icon={<Activity className="h-4 w-4" />} label="Original" value={inputTokens} />
              <Metric icon={<Gauge className="h-4 w-4" />} label="Compressed" value={compressedTokens} />
              <Metric icon={<Clock className="h-4 w-4" />} label="Latency" value={`${result?.metrics?.latencyMs ?? 0}ms`} />
              <Metric icon={<Coins className="h-4 w-4" />} label="API value" value={`$${result?.metrics?.totalX402CostUsd ?? "0.000"}`} />
            </div>

            <div className="mt-5 rounded-md border border-line bg-ink/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">Compression reduction</span>
                <span className="font-semibold text-mint">{reduction}%</span>
              </div>
              <div className="mt-3 h-4 rounded bg-white/10">
                <div className="h-4 rounded bg-mint transition-all" style={{ width: `${Math.min(100, Math.max(0, reduction))}%` }} />
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
                  Bankr-hosted x402 commands are paid one endpoint at a time. Memory enrichment remains available through the direct API-key route; hosted memory extraction is included in profile output.
                </p>
                <Panel title="Full pipeline command" value={allEndpointsCommand} />
                <div className="grid gap-4">
                  {paidCommands.map(([label, command]) => (
                    <Panel key={label} title={label} value={command} />
                  ))}
                </div>
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

function Info({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.035] p-4">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-line bg-ink/70 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/40">
        <span className="text-mint">{icon}</span> {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h2 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">{title}</h2>
      <CodeBlock code={value} />
    </div>
  );
}
