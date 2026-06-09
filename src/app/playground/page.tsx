"use client";

import { useMemo, useState, useTransition } from "react";
import { Calculator, RotateCcw, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

const seed = `[
  {"role":"system","content":"You are helping deploy a production AI infrastructure platform called ContextKit."},
  {"role":"user","content":"ContextKit is deployed on Hetzner with Bankr-hosted x402. Summarize deployment state, fixes, and next steps for another AI agent."}
]`;

export default function PlaygroundPage() {
  const [endpoint, setEndpoint] = useState("summarize");
  const [input, setInput] = useState(seed);
  const [apiKey, setApiKey] = useState("");
  const [tokenResult, setTokenResult] = useState<object | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const active = useMemo(() => endpoints.find((item) => item.slug === endpoint) ?? endpoints[0], [endpoint]);
  const payload = useMemo(() => {
    try {
      return { messages: JSON.parse(input) };
    } catch {
      return { messages: [] };
    }
  }, [input]);
  const command = useMemo(() => bankrX402Command(active.slug, payload), [active.slug, payload]);

  function estimateTokens() {
    setError("");
    startTransition(() => {
      void (async () => {
        try {
          const messages = JSON.parse(input);
          const response = await fetch("/api/tokens/estimate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({ modelFamily: "openai", input: messages })
          });
          setTokenResult(await response.json());
        } catch (err) {
          setError(err instanceof Error ? err.message : "Invalid JSON input.");
        }
      })();
    });
  }

  return (
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Interactive Playground</p>
        <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Build real Bankr x402 calls.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          ContextKit does not ask for an x402 password. Paid calls are made by Bankr CLI, Bankr agents, or an x402-compatible wallet/client. This playground builds real commands and lets API-key users inspect token counts.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-md border border-line bg-white/[0.035] p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {endpoints.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setEndpoint(item.slug)}
                  className={`rounded-md border px-3 py-2 text-sm transition ${endpoint === item.slug ? "border-mint bg-mint/10 text-mint" : "border-line text-white/65 hover:text-white"}`}
                >
                  {item.slug}
                </button>
              ))}
            </div>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-h-[430px] w-full resize-y rounded-md border border-line bg-ink/70 p-4 font-mono text-sm leading-7 text-white outline-none focus:border-mint/60"
            />
            <div className="mt-4 grid gap-3 rounded-md border border-line bg-carbon/60 p-4">
              <label htmlFor="api-key" className="text-sm text-white/55">
                Optional API key for token estimation
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="api-key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_... or ck_test_..." className="h-11 flex-1 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
                <button type="button" onClick={estimateTokens} disabled={isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-mint px-5 text-sm font-medium text-ink disabled:opacity-50">
                  <Calculator className="h-4 w-4" /> Estimate tokens
                </button>
                <button type="button" onClick={() => setInput(seed)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line px-5 text-sm text-white/75">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
            </div>
          </section>
          <section className="space-y-5 rounded-md border border-line bg-carbon/72 p-5">
            <div className="rounded-md border border-mint/25 bg-mint/10 p-4">
              <p className="font-mono text-sm text-mint">{bankrHostedUrl(active.slug)}</p>
              <p className="mt-2 text-sm text-white/60">{active.price} via Bankr-hosted x402. No ContextKit API key required for this hosted paid endpoint.</p>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-white/45">
                <Terminal className="h-4 w-4" /> Copyable paid request
              </div>
              <CodeBlock code={command} />
            </div>
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">API key token estimate</p>
              <CodeBlock code={JSON.stringify(error ? { error } : tokenResult ?? { status: "Enter an API key to estimate tokens without paying x402." }, null, 2)} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
