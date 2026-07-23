import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, CircleDollarSign, KeyRound, Network, ShieldCheck, Sparkles, Terminal, Webhook } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrEndpoints, endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

export const metadata: Metadata = {
  title: "API Reference: ContextKit Endpoints",
  description: "Explore the ContextKit API contract for summarize, compression, handoffs, profiles, MCP, and verified skill repository workflows.",
  alternates: { canonical: "/api-reference" },
  openGraph: {
    title: "ContextKit API Reference",
    description: "Typed endpoint contracts and copyable calls for ContextKit agents and developers.",
    url: "/api-reference"
  }
};

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

const repositoryLifecycle = [
  { label: "01 / compile", route: "/api/skills/compile", command: bankrX402Command("skill-compile", { mode: "skill-compile", messages: [{ role: "user", content: "Repair and verify the Bankr x402 timeout path." }, { role: "assistant", content: "Implemented bounded forwarding and observed HTTP/2 200 in the paid-path test." }] }) },
  { label: "02 / validate", route: "/api/skills/validate", command: bankrX402Command("skill-validate", { mode: "skill-validate", skillId: "exp_REPLACE_ME", publishToken: "pub_REPLACE_ME", repository: "bankr-x402-timeout-recovery", version: "1.0.0", files: repositoryFiles }) },
  { label: "03 / push", route: "/api/skills/push", command: bankrX402Command("skill-push", { mode: "skill-push", skillId: "exp_REPLACE_ME", publishToken: "pub_REPLACE_ME", repository: "bankr-x402-timeout-recovery", version: "1.0.0", files: repositoryFiles }) },
  { label: "04 / publish", route: "/api/skills/publish", command: bankrX402Command("skill-repository-publish", { mode: "skill-repository-publish", skillId: "exp_REPLACE_ME", publishToken: "pub_REPLACE_ME", userApproved: true, priceUsd: 0.05 }) },
  { label: "05 / inspect", route: "/api/skills/inspect", command: bankrX402Command("skill-inspect", { mode: "skill-inspect", skillId: "exp_REPLACE_ME" }) },
  { label: "06 / clone", route: "/api/skills/clone", command: bankrX402Command("skill-clone", { mode: "skill-clone", skillId: "exp_REPLACE_ME" }) }
] as const;

export default function ApiReferencePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-44 top-32 h-[34rem] w-[34rem] rounded-full bg-mint/[0.07] blur-[110px]" />
      <div className="relative mx-auto max-w-7xl px-5 pt-8 md:pt-10">
        <section className="overflow-hidden rounded-[1.55rem] border border-white/[0.13] bg-carbon/80 shadow-[0_24px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42 sm:px-7"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> ContextKit API / production</span><span className="hidden sm:inline">typed context compute for agents</span><span className="text-mint">x402 + SDK + MCP</span></div>
          <div className="grid gap-7 px-6 py-8 sm:px-9 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-10">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Agent access layer</div><h1 className="mt-5 text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Memory and verified skills. Three ways to connect.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Use public Bankr x402 calls, direct SDK/API-key routes, or remote MCP. Every path shares typed output, scoped payment, and the same evidence and publishing safeguards.</p></div>
            <div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><AccessPath href="/x402" icon={<CircleDollarSign className="h-4 w-4" />} title="Bankr-hosted x402" text="Pay in USDC and call from any Bankr agent." tone="mint" /><AccessPath href="/dashboard/login" icon={<KeyRound className="h-4 w-4" />} title="SDK + API key" text="Use scoped keys, account credits, and direct routes." tone="aqua" /><AccessPath href="/mcp-guide" icon={<Network className="h-4 w-4" />} title="Remote MCP" text="Connect agent hosts over Streamable HTTP." tone="mint" /></div>
          </div>
        </section>
      </div>

      <section className="relative mx-auto max-w-7xl px-5 py-16 md:py-20">
        <div className="flex flex-col gap-4 border-b border-line pb-7 md:flex-row md:items-end md:justify-between">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">01 / Get connected</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">Choose an access path, then ship your first context call.</h2></div>
          <p className="max-w-sm text-sm leading-6 text-white/52">Every path reaches the same ContextKit API. Choose based on your agent host and payment model.</p>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <ApiQuickstart number="01" eyebrow="Fastest" title="Call through Bankr" text="Use the four Bankr lanes. Core operations share contextkit-core and select work with endpoint/mode." code={bankrX402Command("summarize", { messages: [{ role: "user", content: "Summarize this agent context." }], mode: "compact" })} href="/x402" linkLabel="Bankr x402 guide" tone="mint" />
          <ApiQuickstart number="02" eyebrow="SDK / backend" title="Use scoped API credits" text="Create a dashboard account, issue an API key, and call direct routes. Credits run before an x402 fallback." code={`npm install @basedchef/contextkit\n\nconst client = new ContextKit({ apiKey: process.env.CONTEXTKIT_API_KEY });`} href="/dashboard/login" linkLabel="Create API key" tone="aqua" />
          <ApiQuickstart number="03" eyebrow="Agent host" title="Connect remote MCP" text="Use Streamable HTTP with OAuth or a scoped key. Tools inherit the same credit and safety controls." code={`https://contextkit.pro/mcp\n\nAuthorization: Bearer <CONTEXTKIT_API_KEY>`} href="/mcp-guide" linkLabel="MCP connection guide" tone="mint" />
        </div>
      </section>
      <section className="relative border-y border-line bg-white/[0.015] px-5 py-16 md:py-20">
        <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-line pb-7 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">02 / Endpoint reference</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">Typed context endpoints, paid and ready for agents.</h2></div><p className="max-w-sm text-sm leading-6 text-white/52">Request and response schemas, paid terminal calls, direct curl, and webhook behavior for every route.</p></div>
        <div className="mb-8 mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-mint/20 bg-mint/[0.06] p-5"><div className="flex items-center gap-2 text-mint"><CircleDollarSign className="h-4 w-4" /><p className="font-mono text-[10px] uppercase tracking-[0.16em]">Public paid path</p></div><h2 className="mt-3 text-xl font-semibold text-white">Bankr-hosted x402</h2><p className="mt-2 text-sm leading-6 text-white/60">Use the hosted URLs for public paid calls. Bankr settles payment, then forwards the request to ContextKit. No ContextKit API key is required.</p></div>
          <div className="rounded-xl border border-aqua/20 bg-aqua/[0.06] p-5"><div className="flex items-center gap-2 text-aqua"><KeyRound className="h-4 w-4" /><p className="font-mono text-[10px] uppercase tracking-[0.16em]">Developer path</p></div><h2 className="mt-3 text-xl font-semibold text-white">Direct SDK/API routes</h2><p className="mt-2 text-sm leading-6 text-white/60">Send a scoped `Authorization: Bearer` key. Account credits run paid endpoints first; insufficient balance returns an x402 challenge.</p></div>
        </div>
        <div className="mb-10 grid gap-5">
          {bankrEndpoints.map((endpoint) => (
            <article key={endpoint.slug} className="overflow-hidden rounded-[1.35rem] border border-mint/20 bg-mint/[0.035] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="break-all font-mono text-xs text-mint">POST {bankrHostedUrl(endpoint.slug)}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{endpoint.slug}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">{endpoint.description}</p>
                </div>
                <span className="rounded-xl border border-aqua/25 bg-aqua/[0.08] px-3 py-2 font-mono text-sm text-aqua">{endpoint.price}<span className="ml-1 text-[10px] text-aqua/60">/ req</span></span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {endpoint.modes.map((mode) => (
                  <span key={mode} className="rounded-full border border-line bg-ink/45 px-3 py-1 font-mono text-[10px] text-white/52">{mode}</span>
                ))}
              </div>
              {endpoint.slug === "contextkit-experience-write" ? <SkillWriteGate /> : null}
            </article>
          ))}
        </div>
        <section className="mb-12 overflow-hidden rounded-[1.35rem] border border-aqua/20 bg-aqua/[0.025]">
          <div className="border-b border-line p-5 sm:p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-aqua">Versioned skill repository / V1</p>
            <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-white">From proven transcript to a complete paid clone.</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/60">The contract is ordered and explicit: compile, validate without storing, push one immutable semantic version, publish after user approval, search or inspect metadata, then pay to clone every file. Public repository contents are never exposed by search or inspect.</p>
          </div>
          <div className="grid gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
            {repositoryLifecycle.map((step) => (
              <article key={step.label} className="min-w-0 bg-carbon/95 p-5">
                <div className="flex items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">{step.label}</p><code className="text-[10px] text-white/38">{step.route}</code></div>
                <div className="mt-4"><CodeBlock code={step.command} /></div>
              </article>
            ))}
          </div>
          <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <RepositoryRule title="Required" text="SKILL.md, skill.json, LICENSE." />
            <RepositoryRule title="Executable public" text="Also package.json, lockfile, config schema, src, tests, examples." />
            <RepositoryRule title="Security" text="SHA-256, safe paths, secret scan, no install hooks, 320KB decoded max." />
            <RepositoryRule title="Clone response" text="Full files, manifest, checksums, validation, license, no-overwrite target." />
          </div>
          <p className="border-t border-line px-5 py-4 text-sm leading-6 text-white/55 sm:px-7">Legacy <code>contextkit-verified-skill/v1</code> purchases still return their evidence-bearing <code>SKILL.md</code>. New repository versions use <code>contextkit-skill-repository/v1</code> and return the complete immutable tree.</p>
        </section>
        <div className="mb-8 border-b border-line pb-7"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-aqua">Direct API routes</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">Same compute, API-key access, account credits.</h2></div>
        <div className="space-y-8">
          {endpoints.map((endpoint) => {
            const request = JSON.stringify({
              messages: [{ role: "user", content: "Long-running agent conversation..." }],
              ...(endpoint.slug === "summarize" ? { mode: "compact" } : {}),
              ...(endpoint.slug === "extract-profile" ? { mode: "extract-profile" } : {}),
              ...(endpoint.slug === "memory-enrichment" ? { mode: "memory-enrichment" } : {})
            }, null, 2);
            const response = JSON.stringify(endpoint.response, null, 2);
            const payload = JSON.parse(request);
            const bankrCurl = bankrX402Command(endpoint.slug, payload);
            const directCurl = directApiCurl(endpoint.path, payload);
            return (
              <article key={endpoint.slug} className="overflow-hidden rounded-[1.35rem] border border-line bg-white/[0.03] p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
                  <div>
                    <p className="break-all font-mono text-xs text-mint">{endpoint.method} {bankrHostedUrl(endpoint.slug)}</p>
                    <h2 className="mt-3 max-w-4xl text-2xl font-semibold tracking-[-0.03em] text-white">{endpoint.description}</h2>
                    {endpoint.slug === "summarize" ? (
                      <div className="mt-4 grid gap-2 rounded-xl border border-mint/25 bg-mint/[0.07] p-3 text-sm leading-6 text-white/65 md:grid-cols-4">
                        <p><span className="font-semibold text-mint">micro</span>: default agent memory, smallest output.</p>
                        <p><span className="font-semibold text-mint">compact</span>: balanced production summary.</p>
                        <p><span className="font-semibold text-mint">extended</span>: human-readable compressed summary.</p>
                        <p><span className="font-semibold text-mint">debug</span>: full backward-compatible diagnostics.</p>
                      </div>
                    ) : null}
                    {endpoint.slug === "memory-enrichment" ? (
                      <p className="mt-4 max-w-3xl rounded-xl border border-aqua/25 bg-aqua/[0.07] p-3 text-sm leading-6 text-aqua">
                        Bankr memory enrichment is a mode of <code>contextkit-core</code>: send <code>{'endpoint:"memory-enrichment"'}</code> and <code>{'mode:"memory-enrichment"'}</code>. Direct API-key usage can still call <code>/api/memory-enrichment</code>.
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-xl border border-aqua/25 bg-aqua/[0.08] px-3 py-2 font-mono text-sm text-aqua">{endpoint.price}<span className="ml-1 text-[10px] text-aqua/60">/ req</span></span>
                </div>
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-line bg-ink/45">
                    <h3 className="border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Request</h3>
                    <div className="p-4"><CodeBlock code={request} /></div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-line bg-ink/45">
                    <h3 className="border-b border-line px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Response</h3>
                    <div className="p-4"><CodeBlock code={response} /></div>
                  </div>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-mint/20 bg-mint/[0.035]">
                    <div className="border-b border-mint/15 px-4 py-3"><h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Terminal className="h-3.5 w-3.5" /> Bankr-hosted x402 POST</h3><p className="mt-1 text-sm leading-6 text-white/55">Public paid path. Bankr handles settlement before forwarding.</p></div>
                    <div className="p-4"><CodeBlock code={bankrCurl} /></div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-aqua/20 bg-aqua/[0.035]">
                    <div className="border-b border-aqua/15 px-4 py-3"><h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-aqua"><KeyRound className="h-3.5 w-3.5" /> Direct API curl with API key</h3><p className="mt-1 text-sm leading-6 text-white/55">Server/SDK path. Credits run first; insufficient balance returns HTTP 402.</p></div>
                    <div className="p-4"><CodeBlock code={directCurl} /></div>
                  </div>
                </div>
                <p className="mt-5 flex items-center gap-2 text-sm text-white/60"><Webhook className="h-4 w-4 text-mint" /> Emits <code>{endpoint.event}</code> after successful generation and stores replayable audit state in ctx.files.</p>
              </article>
            );
          })}
        </div>
        </div>
      </section>
    </main>
  );
}

function AccessPath({ href, icon, title, text, tone }: { href: string; icon: ReactNode; title: string; text: string; tone: "mint" | "aqua" }) {
  const color = tone === "mint" ? "text-mint" : "text-aqua";
  return <Link href={href} className="group flex gap-3 bg-carbon/90 p-4 transition hover:bg-white/[0.04]"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-ink/50 ${color}`}>{icon}</span><div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-white/52">{text}</p></div><ArrowRight className={`ml-auto mt-1 h-4 w-4 ${color} opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100`} /></Link>;
}

function ApiQuickstart({ number, eyebrow, title, text, code, href, linkLabel, tone }: { number: string; eyebrow: string; title: string; text: string; code: string; href: string; linkLabel: string; tone: "mint" | "aqua" }) {
  const color = tone === "mint" ? "text-mint border-mint/25 bg-mint/[0.06]" : "text-aqua border-aqua/25 bg-aqua/[0.06]";
  return <article className="overflow-hidden rounded-[1.3rem] border border-line bg-carbon/70"><div className="border-b border-line px-5 py-5"><div className="flex items-center justify-between"><p className={`font-mono text-xs ${tone === "mint" ? "text-mint" : "text-aqua"}`}>{number}</p><span className={`rounded-full border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${color}`}>{eyebrow}</span></div><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-white/58">{text}</p></div><div className="p-4"><CodeBlock code={code} /><Link href={href} className={`mt-4 inline-flex items-center gap-2 text-sm ${tone === "mint" ? "text-mint" : "text-aqua"} transition hover:text-white`}>{linkLabel} <ArrowRight className="h-3.5 w-3.5" /></Link></div></article>;
}

function SkillWriteGate() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-aqua/20 bg-ink/55">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3"><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-aqua"><ShieldCheck className="h-3.5 w-3.5" /> Strict write policy</p><span className="font-mono text-[10px] text-white/40">write $0.01 / buyer install $0.05</span></div>
      <div className="grid gap-px bg-line md:grid-cols-3">
        <div className="bg-carbon/90 p-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-coral">Rejected</p><p className="mt-2 text-sm leading-6 text-white/55">Greetings, generic notes, plans, placeholders, project diaries, private paths, and unsupported claims.</p></div>
        <div className="bg-carbon/90 p-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-mint">Private repository</p><p className="mt-2 text-sm leading-6 text-white/55">Compile one grounded PASS, validate the complete file contract, then push a SHA-256-addressed immutable semantic version.</p></div>
        <div className="bg-carbon/90 p-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber">Public listing</p><p className="mt-2 text-sm leading-6 text-white/55">Executable bundle, three independent PASS proofs, score 75+, license, safety validation, ownership, and explicit repository-publish approval.</p></div>
      </div>
    </div>
  );
}

function RepositoryRule({ title, text }: { title: string; text: string }) {
  return <div className="bg-carbon/90 p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua">{title}</p><p className="mt-2 text-sm leading-6 text-white/55">{text}</p></div>;
}

function directApiCurl(path: string, payload: unknown) {
  const body = JSON.stringify(payload).replaceAll("'", "'\\''");
  return `curl -X POST https://contextkit.pro${path} \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
}
