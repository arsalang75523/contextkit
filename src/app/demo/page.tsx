"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/code-block";

const starter = `user: We are building a Bankr-native AI agent that needs to preserve long conversations.
assistant: The agent should summarize completed work, compress repeated context, and hand off tasks to specialized workers.
user: It must use x402 payments, send webhooks, and track real token savings.
assistant: We should extract user preferences and keep the next agent aligned on constraints.`;

type DemoResult = {
  inputTokens: number;
  compressedTokens: number;
  reductionPercent: number;
  latencyMs: number;
  summarize: unknown;
  compression: { compressedContext?: string; quality?: unknown };
  handoff: unknown;
  profile: unknown;
};

export default function DemoPage() {
  const [apiKey, setApiKey] = useState("");
  const [payment, setPayment] = useState("");
  const [text, setText] = useState(starter);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    const startedAt = performance.now();
    const messages = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [role, ...content] = line.split(":");
        return { role: role === "assistant" ? "assistant" : "user", content: content.join(":").trim() || line };
      });

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Payment": payment
      };
      const [summaryRes, compressionRes, handoffRes, profileRes] = await Promise.all([
        fetch("/api/summarize", { method: "POST", headers, body: JSON.stringify({ messages }) }),
        fetch("/api/compress-context", { method: "POST", headers, body: JSON.stringify({ messages }) }),
        fetch("/api/handoff", { method: "POST", headers, body: JSON.stringify({ messages }) }),
        fetch("/api/extract-profile", { method: "POST", headers, body: JSON.stringify({ messages }) })
      ]);

      const payloads = await Promise.all([summaryRes, compressionRes, handoffRes, profileRes].map((response) => response.json()));
      const failed = [summaryRes, compressionRes, handoffRes, profileRes].find((response) => !response.ok);
      if (failed) {
        setError(JSON.stringify(payloads, null, 2));
        return;
      }

      const compression = payloads[1] as DemoResult["compression"] & { compressedContext: string };
      const tokenRes = await fetch("/api/tokens/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ input: messages, compressed: compression.compressedContext, modelFamily: "openai" })
      });
      const tokens = (await tokenRes.json()) as Pick<DemoResult, "inputTokens" | "compressedTokens" | "reductionPercent">;

      setResult({
        ...tokens,
        latencyMs: Math.round(performance.now() - startedAt),
        summarize: payloads[0],
        compression,
        handoff: payloads[2],
        profile: payloads[3]
      });
    } finally {
      setLoading(false);
    }
  }

  const reduction = result?.reductionPercent ?? 0;

  return (
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Killer Demo</p>
        <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Measure context compression on a real request.</h1>
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-line bg-white/[0.035] p-5">
            <div className="grid gap-3">
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_... or ck_test_..." className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
              <input value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="X-Payment x402 payload" className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
              <textarea value={text} onChange={(event) => setText(event.target.value)} className="min-h-[360px] rounded-md border border-line bg-ink/80 p-4 font-mono text-sm leading-7 text-white outline-none focus:border-mint" />
              <button type="button" onClick={run} disabled={loading} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink disabled:opacity-50">
                {loading ? "Processing..." : "Run real ContextKit flow"}
              </button>
            </div>
          </section>
          <section className="rounded-md border border-line bg-carbon/72 p-5">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Original", result?.inputTokens ?? 0],
                ["Compressed", result?.compressedTokens ?? 0],
                ["Reduction", `${reduction}%`],
                ["Latency", `${result?.latencyMs ?? 0}ms`]
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
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Panel title="Compressed Context" value={result?.compression?.compressedContext ?? error ?? "Run the demo to see live output."} />
              <Panel title="Structured Handoff" value={JSON.stringify(result?.handoff ?? {}, null, 2)} />
              <Panel title="Extracted Profile" value={JSON.stringify(result?.profile ?? {}, null, 2)} />
              <Panel title="Quality + Summary" value={JSON.stringify({ summary: result?.summarize, quality: result?.compression?.quality }, null, 2)} />
            </div>
          </section>
        </div>
      </div>
    </main>
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
