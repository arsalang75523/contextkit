"use client";

import { useMemo, useState, useTransition } from "react";
import { Play, RotateCcw } from "lucide-react";
import { endpoints } from "@/content/docs";

const seed = `[
  {"role":"user","content":"We are building ContextKit, an x402-powered API for Bankr agents."},
  {"role":"assistant","content":"The product should summarize conversations, compress context, generate handoffs, and extract reusable user profiles."},
  {"role":"user","content":"Make it production-grade, developer-first, and easy to demo."}
]`;

export default function PlaygroundPage() {
  const [endpoint, setEndpoint] = useState("summarize");
  const [input, setInput] = useState(seed);
  const [apiKey, setApiKey] = useState("");
  const [payment, setPayment] = useState("");
  const [result, setResult] = useState<object | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = useMemo(() => endpoints.find((item) => item.slug === endpoint) ?? endpoints[0], [endpoint]);

  function run() {
    startTransition(() => {
      void (async () => {
        const response = await fetch(active.path, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-Payment": payment
          },
          body: JSON.stringify({ messages: JSON.parse(input) })
        });
        setResult(await response.json());
      })();
    });
  }

  return (
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Interactive Playground</p>
        <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Call the live ContextKit API.</h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/65">Paste messages, provide a real API key and x402 payment payload, then inspect the JSON response.</p>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-md border border-line bg-white/[0.035] p-5">
            <div className="mb-4 grid gap-3">
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_..." className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
              <input value={payment} onChange={(event) => setPayment(event.target.value)} placeholder="X-Payment x402 payload" className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
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
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={run} className="inline-flex h-11 items-center gap-2 rounded-md bg-mint px-5 text-sm font-medium text-ink">
                <Play className="h-4 w-4" /> Run request
              </button>
              <button type="button" onClick={() => setInput(seed)} className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-5 text-sm text-white/75">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </section>
          <section className="rounded-md border border-line bg-carbon/72 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-mint">{active.path}</p>
                <p className="mt-1 text-sm text-white/50">{active.price} via x402</p>
              </div>
              <span className="rounded bg-aqua/10 px-3 py-1 text-sm text-aqua">{Math.ceil(input.length / 4)} chars estimate</span>
            </div>
            <pre className="min-h-[430px] overflow-auto rounded-md border border-line bg-ink/80 p-4 font-mono text-sm leading-7 text-mint">
              {isPending ? "Requesting..." : JSON.stringify(result ?? { status: "Ready for live request." }, null, 2)}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
