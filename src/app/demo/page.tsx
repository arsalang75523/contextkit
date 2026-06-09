"use client";

import { useMemo, useState, useTransition } from "react";
import { CodeBlock } from "@/components/code-block";
import { bankrX402Command } from "@/lib/bankr-x402";

const starter = `user: We are building ContextKit, a Bankr-native context infrastructure API for autonomous AI agents.
assistant: The backend runs on Hetzner with Docker Compose, Next.js, Hono, Postgres, and Drizzle migrations.
user: Bankr-hosted x402 endpoints live at x402.bankr.bot and forward paid requests to internal ContextKit endpoints.
assistant: Production fixes included Docker env forwarding, public HTTPS resource URLs, and robust JSON parsing for fenced LLM responses.
user: The product has four paid services: summarize, compress-context, handoff, and extract-profile. Summarize costs $0.002, compress-context costs $0.003, handoff costs $0.003, and profile costs $0.004.
assistant: The dashboard should support signup, login, API key creation, revocation, usage analytics, webhook management, payment history, and token savings charts.
user: New users should not be asked for an x402 password. They should copy a Bankr x402 command, run it from a Bankr-authenticated terminal, approve payment, and receive JSON.
assistant: ContextKit API keys are separate. They are for dashboards, analytics, token estimates, webhook management, and advanced direct API usage.
user: Webhooks need registration, signed delivery, replay, delivery logs, and secret rotation. Billing should show Bankr-hosted x402 payments that ContextKit records after paid requests are forwarded.
assistant: The next production priorities are real account onboarding, better dashboard UX, webhook UI, payment reconciliation, monitoring, backups, and a real domain.
user: Summarize this deployment state for a new AI agent and preserve exact next steps without repeating every implementation detail.`;

type TokenResult = {
  inputTokens?: number;
  compressedTokens?: number;
  reductionPercent?: number;
  error?: unknown;
};

export default function DemoPage() {
  const [apiKey, setApiKey] = useState("");
  const [text, setText] = useState(starter);
  const [compressed, setCompressed] = useState("ContextKit deployed on Hetzner; Bankr-hosted x402 forwards paid calls to internal endpoints; next: polish metrics, docs, and dashboard.");
  const [tokens, setTokens] = useState<TokenResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const messages = useMemo(() => linesToMessages(text), [text]);
  const summarizeCommand = useMemo(() => bankrX402Command("summarize", { messages }), [messages]);
  const compressCommand = useMemo(() => bankrX402Command("compress-context", { messages }), [messages]);

  function estimate() {
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/tokens/estimate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({ modelFamily: "openai", input: messages, compressed })
        });
        setTokens(await response.json());
      })();
    });
  }

  const reduction = Math.max(0, tokens?.reductionPercent ?? 0);

  return (
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Killer Demo</p>
        <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Show real value without fake payment fields.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          This page separates the two real workflows: Bankr-hosted x402 commands for paid AI generation, and ContextKit API keys for measuring tokens or reading dashboard data.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-mint/20 bg-mint/10 p-4">
            <h2 className="font-semibold text-white">Paid generation</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Copy the Bankr x402 command, run it in a Bankr-authenticated terminal, approve USDC payment, and get the JSON response.</p>
          </div>
          <div className="rounded-md border border-aqua/20 bg-aqua/10 p-4">
            <h2 className="font-semibold text-white">Token measurement</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Paste a ContextKit API key only if you want this page to estimate tokens without running a paid generation request.</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4 rounded-md border border-line bg-white/[0.035] p-5">
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-[320px] w-full rounded-md border border-line bg-ink/80 p-4 font-mono text-sm leading-7 text-white outline-none focus:border-mint" />
            <textarea value={compressed} onChange={(event) => setCompressed(event.target.value)} className="min-h-[120px] w-full rounded-md border border-line bg-ink/80 p-4 font-mono text-sm leading-7 text-white outline-none focus:border-mint" />
            <div className="flex flex-col gap-3 sm:flex-row">
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_... for token estimate" className="h-11 flex-1 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
              <button type="button" onClick={estimate} disabled={isPending} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink disabled:opacity-50">
                {isPending ? "Measuring..." : "Measure tokens"}
              </button>
            </div>
          </section>
          <section className="rounded-md border border-line bg-carbon/72 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Original", tokens?.inputTokens ?? 0],
                ["Compressed", tokens?.compressedTokens ?? 0],
                ["Reduction", `${reduction}%`],
                ["x402", "Bankr"]
              ].map(([label, value]) => (
                <div key={label} className="rounded border border-line bg-ink/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 h-4 rounded bg-white/10">
              <div className="h-4 rounded bg-mint transition-all" style={{ width: `${Math.min(100, reduction)}%` }} />
            </div>
            <div className="mt-5 grid gap-4">
              <Panel title="Paid summarize command" value={summarizeCommand} />
              <Panel title="Paid compression command" value={compressCommand} />
              <Panel title="Measured token result" value={JSON.stringify(tokens ?? { status: "Add an API key and measure tokens." }, null, 2)} />
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

function Panel({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h2 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">{title}</h2>
      <CodeBlock code={value} />
    </div>
  );
}
