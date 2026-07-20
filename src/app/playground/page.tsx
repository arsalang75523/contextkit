"use client";

import { type ReactNode, useMemo, useState } from "react";
import { BadgeCheck, CircleDollarSign, FileText, Network, PackageCheck, Play, RotateCcw, Search, Sparkles, Terminal, Zap } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrEndpoints, endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

const playgroundEndpoints = endpoints.filter((item) => item.slug !== "memory-enrichment");

const seed = `City operations team is preparing a continuation handoff for a six-month night-bus pilot across three neighborhoods.

Late-shift hospital workers and airport staff currently wait 35-50 minutes after midnight. The goal is to reduce average wait time below 18 minutes without increasing the annual operating budget.

Current plan: keep the daytime bus network unchanged, add three overnight loop routes, and use smaller electric shuttles for low-demand segments. The transit authority approved a temporary depot lease near the airport, but charging capacity is limited to eight vehicles at once.

Important constraints: union rules require two consecutive rest days for drivers, the hospital district needs service before 5:30 AM shift change, and the airport authority will only allow curb access if buses arrive within assigned 10-minute windows.

Completed work includes ridership interviews, stop safety audits, proposed route maps, a driver staffing model, and a draft airport agreement. Open issues are charger scheduling, weekend driver coverage, and whether the east neighborhood loop should run every 20 or 30 minutes.

Turn this into a concise state update for the next planning agent, preserving goals, decisions, blockers, constraints, and immediate next steps.`;

const skillCompileCommand = bankrX402Command("skill-compile", {
  mode: "skill-compile",
  messages: [
    { role: "user", content: "Repair a Bankr x402 timeout without changing the response contract, then verify the paid path." },
    { role: "assistant", content: "Compared origin and gateway latency, moved long work before payment, and preserved the schema. Executed curl against the paid endpoint; exact output: HTTP/2 200 and mode=compact. Reusable lesson: precompute slow work and keep the paid forwarding call bounded." }
  ]
});

const repositoryFiles = [
  { path: "SKILL.md", content: "---\\nname: bankr-x402-timeout-recovery\\ndescription: Tested bounded forwarding for Bankr x402.\\nlicense: MIT\\n---\\n# Bankr x402 timeout recovery" },
  { path: "skill.json", content: '{"schemaVersion":1,"name":"bankr-x402-timeout-recovery","version":"1.0.0","runtime":"node22","entrypoint":"src/index.js","testCommand":"npm test"}' },
  { path: "LICENSE", content: "MIT License" },
  { path: "package.json", content: '{"name":"bankr-x402-timeout-recovery","version":"1.0.0","type":"module","scripts":{"test":"node --test tests/*.test.js"}}' },
  { path: "package-lock.json", content: '{"name":"bankr-x402-timeout-recovery","version":"1.0.0","lockfileVersion":3,"packages":{"":{"name":"bankr-x402-timeout-recovery","version":"1.0.0"}}}' },
  { path: "config.schema.json", content: '{"type":"object","properties":{"backendUrl":{"type":"string"}},"required":["backendUrl"]}' },
  { path: "src/index.js", content: "export const boundedTimeout = (originMs) => Math.min(originMs + 8000, 55000);" },
  { path: "tests/timeout.test.js", content: "import test from 'node:test'; import assert from 'node:assert/strict'; import { boundedTimeout } from '../src/index.js'; test('bounded', () => assert.equal(boundedTimeout(42000), 50000));" },
  { path: "examples/basic.js", content: "import { boundedTimeout } from '../src/index.js'; console.log(boundedTimeout(42000));" }
];

const skillValidateCommand = bankrX402Command("skill-validate", { mode: "skill-validate", skillId: "exp_REPLACE_ME", publishToken: "pub_REPLACE_ME", repository: "bankr-x402-timeout-recovery", version: "1.0.0", files: repositoryFiles });
const skillPushCommand = bankrX402Command("skill-push", { mode: "skill-push", skillId: "exp_REPLACE_ME", publishToken: "pub_REPLACE_ME", repository: "bankr-x402-timeout-recovery", version: "1.0.0", files: repositoryFiles });
const skillPublishCommand = bankrX402Command("skill-repository-publish", { mode: "skill-repository-publish", skillId: "exp_REPLACE_ME", publishToken: "pub_REPLACE_ME", userApproved: true, priceUsd: 0.05 });

const skillSearchCommand = bankrX402Command("skill-search", {
  query: "x402 timeout recovery",
  ecosystems: ["x402"],
  compatibility: ["codex"],
  verifiedOnly: true,
  limit: 5
});

const skillInspectCommand = bankrX402Command("skill-inspect", { mode: "skill-inspect", skillId: "exp_REPLACE_ME" });
const skillCloneCommand = bankrX402Command("skill-clone", { mode: "skill-clone", skillId: "exp_REPLACE_ME" });

export default function PlaygroundPage() {
  const [endpoint, setEndpoint] = useState("summarize");
  const [summaryMode, setSummaryMode] = useState<"micro" | "compact" | "extended" | "debug">("compact");
  const [profileMode, setProfileMode] = useState<"extract-profile" | "memory-enrichment">("extract-profile");
  const [input, setInput] = useState(seed);
  const [runResult, setRunResult] = useState<object | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const active = useMemo(() => playgroundEndpoints.find((item) => item.slug === endpoint) ?? playgroundEndpoints[0], [endpoint]);
  const activeBankr = useMemo(() => bankrEndpointForOperation(active.slug), [active.slug]);
  const inputText = input.trim() || "Summarize this context.";
  const messages = useMemo(() => playgroundMessages(endpoint, inputText), [endpoint, inputText]);
  const selectedProfileMode = endpoint === "memory-enrichment" ? "memory-enrichment" : profileMode;
  const payload = useMemo(() => {
    if (endpoint === "summarize") return { messages, mode: summaryMode };
    if (endpoint === "extract-profile" || endpoint === "memory-enrichment") return { messages, mode: selectedProfileMode };
    return { messages };
  }, [endpoint, messages, selectedProfileMode, summaryMode]);
  const command = useMemo(() => bankrX402Command(active.slug, payload), [active.slug, payload]);
  const longContextCommands = useMemo(() => {
    const params = new URLSearchParams({ endpoint: active.slug });
    if (active.slug === "summarize") params.set("mode", summaryMode);
    if (active.slug === "extract-profile" || active.slug === "memory-enrichment") {
      params.set("endpoint", "extract-profile");
      params.set("mode", selectedProfileMode);
    }
    const callPayload = active.slug === "summarize"
      ? { contextId: "ctx_REPLACE_ME", mode: summaryMode }
      : active.slug === "extract-profile" || active.slug === "memory-enrichment"
        ? { contextId: "ctx_REPLACE_ME", mode: selectedProfileMode }
      : { contextId: "ctx_REPLACE_ME" };
    const marker = heredocMarker(input);
    const jsonUpload = needsJsonWrappedInput(active.slug);
    const jsonPayload = JSON.stringify({
      messages,
      precompute: {
        endpoint: active.slug === "memory-enrichment" ? "extract-profile" : active.slug,
        ...(active.slug === "summarize" ? { mode: summaryMode } : {}),
        ...(active.slug === "extract-profile" || active.slug === "memory-enrichment" ? { mode: selectedProfileMode } : {})
      }
    }, null, 2).replaceAll("'", "'\\''");
    return {
      upload: jsonUpload ? `cat > context-payload.json <<'${marker}'
${jsonPayload}
${marker}

curl -X POST "https://contextkit.pro/api/context/upload" \\
  -H "Content-Type: application/json" \\
  --data-binary @context-payload.json` : `cat > long-context.txt <<'${marker}'
${input.trim() || "Paste the long conversation or document here."}
${marker}

curl -X POST "https://contextkit.pro/api/context/upload-text?${params.toString()}" \\
  -H "Content-Type: text/plain" \\
  --data-binary @long-context.txt`,
      call: bankrX402Command(active.slug, callPayload)
    };
  }, [active.slug, input, messages, selectedProfileMode, summaryMode]);

  function runLivePlayground() {
    setRunResult(null);
    setIsRunning(true);
    void (async () => {
      try {
        const response = await fetch("/api/playground/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: active.slug,
            messages,
            mode: active.slug === "summarize"
              ? summaryMode
              : active.slug === "extract-profile" || active.slug === "memory-enrichment"
                ? selectedProfileMode
                : undefined
          })
        });
        const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          const error = result.error && typeof result.error === "object" ? result.error as Record<string, unknown> : {};
          setRunResult({
            error: String(error.message ?? "ContextKit could not complete this playground request."),
            code: String(error.code ?? "playground_request_failed"),
            status: response.status,
            requestId: error.requestId ?? null,
            quota: result.quota ?? null
          });
          return;
        }
        setRunResult(result);
      } catch (err) {
        setRunResult({ error: err instanceof Error ? err.message : "Request failed." });
      } finally {
        setIsRunning(false);
      }
    })();
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:py-10">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-44 top-36 h-[32rem] w-[32rem] rounded-full bg-mint/[0.07] blur-[105px]" />
      <div className="pointer-events-none absolute -right-48 top-80 h-[30rem] w-[30rem] rounded-full bg-aqua/[0.07] blur-[105px]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.55rem] border border-white/[0.13] bg-carbon/80 shadow-[0_24px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42 sm:px-7"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> Playground / live execution</span><span className="hidden sm:inline">sandboxed agent context runner</span><span className="text-aqua">3 runs / day</span></div>
          <div className="grid gap-7 px-6 py-8 sm:px-9 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-10">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Interactive Playground</div><h1 className="mt-5 text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Run an agent context task before you wire it in.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Paste plain text, select the operation, and inspect the real ContextKit response. Production agents can use the generated Bankr x402 request with no ContextKit API key.</p></div>
            <div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><PlaygroundStep icon={<FileText className="h-4 w-4" />} title="Paste natural text" text="No JSON, escaping, or message formatting." /><PlaygroundStep icon={<Zap className="h-4 w-4" />} title="Run a real request" text="Authenticated accounts receive 3 live runs daily." /><PlaygroundStep icon={<CircleDollarSign className="h-4 w-4" />} title="Copy the paid path" text="Bankr settles USDC then returns JSON." /></div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
          <section className="min-w-0 rounded-[1.45rem] border border-line bg-white/[0.03] p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">01 / Context composer</p><h2 className="mt-2 text-xl font-semibold text-white">Choose an operation, then give it context.</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-mint/25 bg-mint/[0.07]"><Network className="h-4 w-4 text-mint" /></span></div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {playgroundEndpoints.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => setEndpoint(item.slug)}
                  className={`min-w-0 rounded-xl border px-3 py-3 text-left text-xs transition xl:text-sm ${endpoint === item.slug ? "border-mint/50 bg-mint/[0.1] text-mint shadow-[inset_0_0_20px_rgba(115,243,195,0.05)]" : "border-line bg-ink/35 text-white/60 hover:border-white/25 hover:text-white"}`}
                >
                  <span className="block break-words font-medium">{item.slug}</span>
                  <span className="mt-1 block font-mono text-[10px] text-white/35">Bankr {bankrEndpointForOperation(item.slug).price}</span>
                </button>
              ))}
            </div>
            {endpoint === "summarize" ? (
              <div className="mt-5 rounded-xl border border-mint/20 bg-mint/[0.055] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold text-white">Summarize mode</h2><p className="mt-1 max-w-xl text-sm leading-6 text-white/57">Micro is optimized for agents, compact balances detail and cost, extended reads like a handoff.</p></div><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-mint">selected: {summaryMode}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["micro", "compact", "extended", "debug"] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => setSummaryMode(mode)} className={`rounded-lg border px-3 py-2 text-xs transition sm:text-sm ${summaryMode === mode ? "border-mint bg-mint/15 text-mint" : "border-line text-white/58 hover:text-white"}`}>{mode}</button>
                  ))}
                </div>
              </div>
            ) : null}
            {endpoint === "extract-profile" || endpoint === "memory-enrichment" ? (
              <div className="mt-5 rounded-xl border border-mint/20 bg-mint/[0.055] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold text-white">Profile mode</h2><p className="mt-1 text-sm leading-6 text-white/57">Hosted Bankr calls use <code>contextkit-core</code> for both profile and memory extraction.</p></div><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-mint">{selectedProfileMode}</span></div>
                <div className="mt-4 grid grid-cols-2 gap-2">{(["extract-profile", "memory-enrichment"] as const).map((mode) => <button key={mode} type="button" onClick={() => setProfileMode(mode)} className={`rounded-lg border px-3 py-2 text-xs transition sm:text-sm ${selectedProfileMode === mode ? "border-mint bg-mint/15 text-mint" : "border-line text-white/58 hover:text-white"}`}>{mode}</button>)}</div>
              </div>
            ) : null}
            <label className="mt-5 block"><span className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/42"><span>Source context</span><span>{input.length.toLocaleString()} characters</span></span><textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Paste any conversation, project notes, document, or handoff context here." className="min-h-[390px] w-full resize-y rounded-xl border border-line bg-ink/75 p-4 text-sm leading-7 text-white outline-none transition placeholder:text-white/28 focus:border-mint/60 focus:shadow-[0_0_0_3px_rgba(115,243,195,0.08)]" /></label>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-carbon/65 p-3 sm:flex-row"><button type="button" onClick={runLivePlayground} disabled={isRunning} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-aqua px-5 text-sm font-semibold text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60">{isRunning ? <Spinner /> : <Play className="h-4 w-4" />}{isRunning ? "Running ContextKit..." : "Run live request"}</button><button type="button" onClick={() => setInput(seed)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line px-5 text-sm text-white/72 transition hover:border-white/25 hover:text-white"><RotateCcw className="h-4 w-4" /> Reset sample</button></div>
          </section>
          <section className="min-w-0 space-y-5 rounded-[1.45rem] border border-line bg-carbon/72 p-5 sm:p-6">
            <div className="overflow-hidden rounded-xl border border-mint/25 bg-mint/[0.06]">
              <div className="flex items-center justify-between border-b border-mint/15 px-4 py-3"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">02 / Active endpoint</span><span className="rounded-full border border-mint/20 bg-mint/[0.08] px-2 py-1 font-mono text-[10px] text-mint">{activeBankr.price}</span></div>
              <div className="p-4">
                <p className="break-all font-mono text-sm leading-6 text-mint">{bankrHostedUrl(active.slug)}</p>
                <p className="mt-3 text-sm leading-6 text-white/60">Bankr lane: <span className="text-mint">{activeBankr.slug}</span> at <span className="text-mint">{activeBankr.price}</span>. Operation selected by payload: <span className="text-aqua">{active.slug}</span>.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-line bg-ink/55"><div className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/43">03 / Live response</p><p className="mt-1 text-sm text-white/58">3 real AI requests per account per day.</p></div><span className="h-2 w-2 animate-pulse rounded-full bg-mint" /></div><div className="p-4"><CodeBlock code={JSON.stringify(runResult ?? { status: "Paste context and run a live request." }, null, 2)} /></div></div>
            <div className="overflow-hidden rounded-xl border border-line bg-ink/45"><div className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/43"><Terminal className="h-4 w-4 text-aqua" /> 04 / Paid terminal request</div><div className="p-4"><p className="mb-3 text-sm leading-6 text-white/56">Run this after <code>bankr login</code>. Bankr asks for payment approval, then returns ContextKit JSON.</p>{needsJsonWrappedInput(active.slug) ? <p className="mb-3 rounded-lg border border-aqua/20 bg-aqua/[0.07] p-3 text-sm leading-6 text-aqua">This endpoint wraps your text as a JSON message so extraction receives valid conversation input.</p> : null}<CodeBlock code={command} /></div></div>
            <div className="overflow-hidden rounded-xl border border-line bg-ink/45"><div className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/43"><Terminal className="h-4 w-4 text-aqua" /> 05 / Long context workflow</div><div className="p-4"><p className="mb-4 text-sm leading-6 text-white/56">Upload and precompute large content first. Copy the returned <code>contextId</code> into the payment request.</p><div className="space-y-4"><div><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/38">1. Upload and precompute</p><CodeBlock code={longContextCommands.upload} /></div><div className="rounded-lg border border-aqua/20 bg-aqua/[0.07] p-3 text-sm leading-6 text-aqua">Copy the upload response&apos;s <code>contextId</code>, then replace <code>ctx_REPLACE_ME</code> below.</div><div><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-white/38">2. Pay and fetch result</p><CodeBlock code={longContextCommands.call} /></div></div></div></div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-[1.45rem] border border-mint/20 bg-carbon/80">
          <div className="flex flex-col gap-4 border-b border-line px-5 py-6 sm:px-7 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-mint">Verified Skill Registry / Bankr x402</p>
              <h2 className="mt-2 max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">Compile proof. Push every file. Clone an immutable skill repository.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/52">Repository V1 separates transcript proof from file proof. Validation rejects missing contracts, unsafe paths, secrets, install hooks, identity mismatches, and decoded bundles above 320KB before anything becomes public.</p>
          </div>
          <div className="grid gap-px bg-line lg:grid-cols-2 xl:grid-cols-3">
            <RegistryLane
              icon={<BadgeCheck className="h-4 w-4" />}
              step="01 / Compile"
              title="Prove the reusable method"
              text="Compile completed work into a private evidence-backed skillId. Generic claims and unverified transcripts are rejected."
              code={skillCompileCommand}
              price="$0.01"
            />
            <RegistryLane
              icon={<PackageCheck className="h-4 w-4" />}
              step="02 / Validate"
              title="Dry-run the complete bundle"
              text="Require SKILL.md, skill.json, LICENSE and, for executable public skills, package metadata, lockfile, config schema, source, tests, and examples."
              code={skillValidateCommand}
              price="$0.01"
            />
            <RegistryLane
              icon={<PackageCheck className="h-4 w-4" />}
              step="03 / Push"
              title="Store immutable semver"
              text="Create a content-addressed version with per-file SHA-256 checksums. A published version cannot be overwritten."
              code={skillPushCommand}
              price="$0.01"
            />
            <RegistryLane
              icon={<BadgeCheck className="h-4 w-4" />}
              step="04 / Publish"
              title="Approve the public listing"
              text="Use the dedicated repository-publish mode only after the user approves. The executable and evidence policies still run server-side."
              code={skillPublishCommand}
              price="$0.01"
            />
            <RegistryLane
              icon={<Search className="h-4 w-4" />}
              step="05 / Search + inspect"
              title="Preview metadata, not paid files"
              text="Search by problem and inspect digest, manifest, semantic version, and validation without revealing repository contents."
              code={`${skillSearchCommand}\n\n${skillInspectCommand}`}
              price="$0.01"
            />
            <RegistryLane
              icon={<PackageCheck className="h-4 w-4" />}
              step="06 / Paid clone"
              title="Receive the complete file tree"
              text="The $0.05 clone returns source, tests, examples, config, lockfile, checksums, manifest, validation, and safe no-overwrite materialization instructions."
              code={skillCloneCommand}
              price="$0.05"
            />
          </div>
          <div className="border-t border-line bg-mint/[0.035] px-5 py-4 text-sm leading-6 text-white/58 sm:px-7">
            Exact flow: <code>compile → skill-validate → skill-push → skill-repository-publish → skill-search/inspect → skill-clone</code>. Bankr-hosted writes reuse the compile response&apos;s one-draft <code>publishToken</code>. Legacy SKILL.md purchases remain available, while repository-backed clones return <code>contextkit-skill-repository/v1</code> with every file and checksum.
          </div>
        </section>
      </div>
    </main>
  );
}

function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />;
}

function PlaygroundStep({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 bg-carbon/90 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06] text-mint">{icon}</span><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-sm leading-6 text-white/52">{text}</p></div></div>;
}

function RegistryLane({ icon, step, title, text, code, price }: { icon: ReactNode; step: string; title: string; text: string; code: string; price: string }) {
  return (
    <article className="min-w-0 bg-carbon/95 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mint">{icon}{step}</span>
        <span className="rounded-full border border-aqua/20 bg-aqua/[0.07] px-2.5 py-1 font-mono text-[10px] text-aqua">{price}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-white/54">{text}</p>
      <div className="mt-5"><CodeBlock code={code} /></div>
    </article>
  );
}

function heredocMarker(value: string) {
  const markers = ["CONTEXTKIT_LONG_CONTEXT", "CONTEXTKIT_INPUT", "CONTEXTKIT_TEXT"];
  return markers.find((marker) => !value.includes(marker)) ?? `CONTEXTKIT_${Date.now()}`;
}

function needsJsonWrappedInput(endpoint: string) {
  return endpoint === "compress-context" || endpoint === "extract-profile" || endpoint === "memory-enrichment";
}

function playgroundMessages(endpoint: string, inputText: string) {
  if (!needsJsonWrappedInput(endpoint)) {
    return [{ role: "user" as const, content: inputText }];
  }

  return [
    {
      role: "user" as const,
      content: JSON.stringify([
        {
          role: "user",
          content: inputText
        }
      ])
    }
  ];
}

function bankrEndpointForOperation(slug: string) {
  if (slug === "summarize" || slug === "compress-context" || slug === "handoff" || slug === "extract-profile" || slug === "memory-enrichment") {
    return bankrEndpoints[0];
  }
  return bankrEndpoints.find((endpoint) => endpoint.modes.includes(slug)) ?? bankrEndpoints[0];
}
