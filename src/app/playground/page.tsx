"use client";

import { useMemo, useState, useTransition } from "react";
import { Calculator, Play, RotateCcw, Terminal } from "lucide-react";
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
  const [runResult, setRunResult] = useState<object | null>(null);
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

  function runLivePlayground() {
    setError("");
    setRunResult(null);
    startTransition(() => {
      void (async () => {
        try {
          const messages = JSON.parse(input);
          const response = await fetch("/api/playground/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: active.slug, messages })
          });
          const result = (await response.json()) as Record<string, unknown>;
          setRunResult(result);
          if (!response.ok) {
            setError(JSON.stringify(result, null, 2));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Invalid JSON input.");
        }
      })();
    });
  }

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
        <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Test ContextKit like a real user.</h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          New users do not need a ContextKit API key to call the paid AI endpoints. They copy the Bankr x402 command, run it from a Bankr-authenticated terminal or agent, approve the USDC payment, and receive JSON back.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["1. Login once", "The live playground runs from your dashboard session and is limited to 3 real AI requests per account per day."],
            ["2. Paste messages", "Write JSON messages on the left, choose summarize, compress, handoff, or profile, then run the real ContextKit processor."],
            ["3. Production path", "For unlimited paid agent traffic, copy the Bankr-hosted x402 command and let Bankr handle payment."]
          ].map(([title, text]) => (
            <div key={title} className="rounded-md border border-line bg-white/[0.035] p-4">
              <h2 className="font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-md border border-line bg-white/[0.035] p-5">
            <div className="mb-4 rounded-md border border-aqua/20 bg-aqua/10 p-4 text-sm leading-6 text-white/65">
              Pick one service below. <span className="text-aqua">Summarize</span> is selected by default because it is the easiest first test. The other services are here too; clicking them changes the paid endpoint and command.
            </div>
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
                Optional ContextKit API key for token estimation
              </label>
              <p className="text-sm leading-6 text-white/45">
              This only measures token counts for developers who already have a ContextKit key. To run the full process here, use the live playground button below.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="api-key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_... or ck_test_..." className="h-11 flex-1 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
                <button type="button" onClick={runLivePlayground} disabled={isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-aqua px-5 text-sm font-medium text-ink disabled:opacity-50">
                  <Play className="h-4 w-4" /> Run full process
                </button>
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
              <p className="mt-2 text-sm text-white/60">
                {active.price} via Bankr-hosted x402. This is the real paid endpoint for <span className="text-mint">{active.slug}</span>. No ContextKit API key is required for this hosted paid endpoint.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Live ContextKit response</p>
              <p className="mb-3 text-sm leading-6 text-white/55">
                This calls <code>/api/playground/run</code> with your current dashboard session. Limit: 3 real AI runs per account per day.
              </p>
              <CodeBlock code={JSON.stringify(runResult ?? { status: "Login, paste messages, then click Run full process." }, null, 2)} />
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-white/45">
                <Terminal className="h-4 w-4" /> Copyable paid request
              </div>
              <p className="mb-3 text-sm leading-6 text-white/55">
                Copy this command into a terminal where <code>bankr login</code> is already configured. Bankr will ask for payment approval, then return the ContextKit JSON response.
              </p>
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
