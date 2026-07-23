"use client";

import { type ComponentType, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Cable,
  Check,
  CircleDollarSign,
  Copy,
  FileJson,
  Gauge,
  KeyRound,
  Network,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { Architecture } from "@/components/architecture";
import { Button } from "@/components/button";
import { GetStartedCard } from "@/components/get-started-card";
import { LiveMetrics } from "@/components/live-metrics";
import { Section } from "@/components/section";
import { bankrEndpoints } from "@/content/docs";

const capabilities = [
  ["Core Memory", "Summarize, compress, handoff, profile", BrainCircuit, "contextkit-core"],
  ["Skill Repository", "Compile, validate, and push immutable source bundles", Gauge, "contextkit-experience-write"],
  ["Repository Search", "Find verified skills by problem and ecosystem", Bot, "contextkit-experience-search"],
  ["Skill Clone", "Buy complete source repositories through x402", FileJson, "contextkit-experience-buy"]
] as const;

const responseStream = [
  "gate: generic input rejected",
  "evidence: 3 hard PASS results",
  "mcp.v2: private skill compiled",
  "publish: user approved",
  "buyer: bankr x402 paid",
  "creator: 0.05 USDC earned"
];

const memoryNodes = [
  ["01", "Compile", "non-trivial work", "mint"],
  ["02", "Verify", "hard proof only", "aqua"],
  ["03", "Install", "x402 purchase", "amber"],
  ["04", "Earn", "creator revenue", "coral"]
] as const;

export default function HomePage() {
  const [releaseVersion, setReleaseVersion] = useState("v1.2.4");

  useEffect(() => {
    fetch("/api/public/version")
      .then((response) => response.ok ? response.json() as Promise<{ version?: string }> : null)
      .then((payload) => {
        if (payload?.version) setReleaseVersion(payload.version);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="overflow-hidden">
      <section className="agent-hero relative isolate min-h-[calc(100vh-62px)] px-5 pb-8 pt-6 md:pt-8">
        <div className="agent-grid absolute inset-0 -z-20" />
        <div className="agent-orb agent-orb-one absolute -left-40 top-12 -z-10 h-[34rem] w-[34rem] rounded-full" />
        <div className="agent-orb agent-orb-two absolute -right-36 top-24 -z-10 h-[30rem] w-[30rem] rounded-full" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between border-y border-line/80 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/44 md:text-xs">
            <span className="flex items-center gap-2"><Network className="h-3.5 w-3.5 text-mint" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> ContextKit Network / Online</span>
            <span className="hidden sm:inline">Completed work becomes tested, cloneable skill repositories.</span>
            <span className="text-mint">{releaseVersion}</span>
          </div>
          <div className="mb-6 grid gap-2 border-b border-line pb-4 sm:grid-cols-3">
            <Signal label="01 / Capture" text="MCP submits completed reusable work." />
            <Signal label="02 / Verify" text="Hard evidence or the write is rejected." />
            <Signal label="03 / Earn" text="Agents buy it through Bankr x402." />
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-[0.93fr_1.07fr] lg:gap-12">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.08] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mint">
                <Sparkles className="h-3.5 w-3.5" /> MCP V2 verified skill economy
              </div>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                Let agents remember, publish, and <span className="text-mint">earn</span> from what worked.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/64 lg:text-lg">
                ContextKit turns useful completed work from any domain into immutable skill repositories with source, tests, examples, config, lockfiles, and checksums. Generic notes and incomplete bundles are rejected; builders earn when agents clone verified versions through x402.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href="/mcp-guide">Connect MCP <KeyRound className="h-4 w-4" /></Button>
                <Button href="/roadmap" variant="secondary">See Roadmap <ArrowRight className="h-4 w-4" /></Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/55">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-mint" /> Proof-gated skill drafts</span>
                <span className="inline-flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-aqua" /> x402 paid access</span>
                <Link href="https://github.com/arsalang75523/contextkit" className="inline-flex items-center gap-2 transition hover:text-white"><Cable className="h-4 w-4 text-coral" /> Open source</Link>
              </div>
              <EarnCard />
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.12 }} className="relative">
              <div className="agent-console overflow-hidden rounded-[1.35rem] border border-white/[0.13] bg-carbon/75 shadow-[0_28px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-mint/25 bg-mint/10"><Network className="h-4 w-4 text-mint" /></div>
                    <div><p className="text-sm font-medium text-white">Verified Skill Engine</p><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">MCP V2 / registry ready</p></div>
                  </div>
                  <span className="flex items-center gap-2 rounded-full border border-mint/20 bg-mint/[0.07] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mint"><Radio className="h-3 w-3" /> Live</span>
                </div>

                <div className="grid gap-0 border-b border-line md:grid-cols-[0.88fr_1.12fr]">
                  <div className="relative min-h-[220px] overflow-hidden border-b border-line p-4 md:border-b-0 md:border-r">
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/42"><span>Verified skill</span><span className="text-mint">skill_7f91e2</span></div>
                      <div className="mt-4 space-y-2.5 font-mono text-[11px]">
                        <ContextLine label="MODE" value="publish / verified skill" tone="text-mint" />
                        <ContextLine label="SOURCE" value="IDE agent via MCP" tone="text-aqua" />
                        <ContextLine label="VALUE" value="tested source repository" tone="text-white/78" />
                        <ContextLine label="PROOF" value="3 grounded PASS results" tone="text-mint" />
                        <ContextLine label="PRICE" value="Bankr x402 access" tone="text-coral" />
                        <ContextLine label="PAYOUT" value="creator earns on install" tone="text-amber" />
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                        <div className="rounded-lg border border-line bg-ink/50 p-2.5"><p className="font-mono text-[10px] text-white/42">EARNED</p><p className="mt-1 text-sm font-medium text-white">0.05 USDC</p></div>
                        <div className="rounded-lg border border-mint/20 bg-mint/[0.05] p-2.5"><p className="font-mono text-[10px] text-mint/70">TOTAL EARNED</p><p className="mt-1 text-sm font-medium text-mint">3,690 USDC</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4"><TypingPanel title="Packet in / state out" tone="mint" lines={responseStream} /></div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
                  {memoryNodes.map(([index, title, detail, tone]) => (
                    <div key={title} className="bg-carbon/90 px-4 py-3">
                      <p className={`font-mono text-[10px] uppercase tracking-[0.17em] ${tone === "mint" ? "text-mint" : tone === "aqua" ? "text-aqua" : tone === "amber" ? "text-amber" : "text-coral"}`}>{index}</p>
                      <p className="mt-2 text-sm font-medium text-white">{title}</p>
                      <p className="mt-1 font-mono text-[10px] text-white/42">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <McpEndpointCard />
            </motion.div>
          </div>
        </div>
      </section>

      <Section eyebrow="Verified Skill Economy" title="From successful agent work to complete cloneable repositories.">
        <div className="mb-10 grid gap-4 lg:grid-cols-3">
          <EconomyStep icon={BrainCircuit} label="01 / Agent learns" title="Capture the hard-won state" text="MCP V2 records the goal, constraints, failed attempts, outcome, and confidence when an agent finishes useful work." />
          <EconomyStep icon={Store} label="02 / ContextKit verifies" title="Validate source + tests" text="Paths, secrets, identity, package lock, source, tests, examples, config, evidence, and safety must pass before an immutable push." />
          <EconomyStep icon={WalletCards} label="03 / Network clones" title="Earn when agents buy it" text="Buyers receive every versioned file plus SHA-256 checksums, not a summary or incomplete SKILL.md. Revenue tracks to the creator." />
        </div>
        <SkillQualityGate />
        <div className="mb-10"><LiveMetrics /></div>
        <Architecture />
      </Section>

      <Section eyebrow="Bankr x402 Lanes" title="Four paid lanes for memory, skill compilation, discovery, and installation.">
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {bankrEndpoints.map((endpoint) => (
            <div key={endpoint.slug} className="rounded-xl border border-mint/20 bg-mint/[0.045] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">{endpoint.price} / req</p>
              <h3 className="mt-3 break-words text-lg font-semibold text-white">{endpoint.slug}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{endpoint.description}</p>
            </div>
          ))}
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line bg-white/[0.025]">
          {capabilities.map(([title, description, Icon, path], index) => (
            <motion.article key={title} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.35, delay: index * 0.05 }} className="group grid gap-4 px-5 py-5 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:px-7">
              <div className="flex items-center gap-3 sm:block"><span className="font-mono text-xs text-white/35">0{index + 1}</span><Icon className="h-5 w-5 text-mint sm:mt-3" /></div>
              <div><h3 className="text-xl font-medium text-white">{title}</h3><p className="mt-1 text-sm text-white/56">{description}</p></div>
              <Link href="/api-reference" className="group/link inline-flex items-center justify-between gap-5 rounded-lg border border-line bg-ink/40 px-3 py-2 font-mono text-xs text-aqua transition hover:border-aqua/40 hover:text-white"><span>{path}</span><ArrowRight className="h-3.5 w-3.5 transition group-hover/link:translate-x-1" /></Link>
            </motion.article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Build With It" title="Connect your IDE agent. Ship verified skills from completed work.">
        <GetStartedCard />
      </Section>

      <section className="px-5 pb-24 pt-4">
        <div className="agent-cta mx-auto max-w-7xl overflow-hidden rounded-[1.4rem] border border-mint/25 p-8 md:p-12">
          <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-mint">Earn from agent memory</p><h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">The next step is not just remembering. It is selling what your agents already learned.</h2></div>
            <Link href="/mcp-guide" className="inline-flex h-11 items-center gap-2 rounded-lg bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white">Connect MCP <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function EarnCard() {
  return (
    <div className="mt-8 max-w-xl rounded-xl border border-amber/20 bg-amber/[0.045] px-3.5 py-2.5 lg:mt-10">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">MCP V2 revenue loop</p>
          <p className="mt-1 text-sm leading-5 text-white/62">Publish a tested repository. Earn USDC when another agent clones it.</p>
        </div>
        <div className="flex shrink-0 gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-mint/20 bg-mint/[0.06] px-2.5 text-mint"><BrainCircuit className="h-3.5 w-3.5" />Save</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-aqua/20 bg-aqua/[0.06] px-2.5 text-aqua"><Store className="h-3.5 w-3.5" />Sell</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber/20 bg-amber/[0.06] px-2.5 text-amber"><TrendingUp className="h-3.5 w-3.5" />Earn</span>
        </div>
      </div>
    </div>
  );
}

function EconomyStep({ icon: Icon, label, title, text }: { icon: ComponentType<{ className?: string }>; label: string; title: string; text: string }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-mint/25 hover:bg-white/[0.055]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-mint/[0.06] blur-2xl transition group-hover:bg-mint/[0.1]" />
      <div className="relative flex items-center justify-between gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">{label}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-ink/55 text-aqua"><Icon className="h-4 w-4" /></span>
      </div>
      <h3 className="relative mt-6 text-xl font-semibold tracking-[-0.035em] text-white">{title}</h3>
      <p className="relative mt-3 text-sm leading-6 text-white/56">{text}</p>
    </article>
  );
}

function SkillQualityGate() {
  const rejected = ["Greetings and trivial tasks", "Plans, brainstorms, and project diaries", "Placeholders or plain claims like \"it works\""];
  const accepted = ["Complete reusable workflow with cross-project value", "Command output, test log, HTTP response, or artifact", "Request, method, observed outcome, and reusable lesson"];

  return (
    <div className="mb-10 overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-carbon/72">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">MCP V2 / quality firewall</p><h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">No proof, no skill write.</h3></div>
        <span className="w-fit rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mint">server enforced</span>
      </div>
      <div className="grid gap-px bg-line lg:grid-cols-2">
        <div className="bg-ink/75 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-coral">Rejected before storage</p>
          <div className="mt-4 space-y-3">{rejected.map((item) => <p key={item} className="flex items-center gap-3 text-sm text-white/58"><span className="grid h-5 w-5 place-items-center rounded-full border border-coral/25 bg-coral/[0.08] font-mono text-[10px] text-coral">×</span>{item}</p>)}</div>
        </div>
        <div className="bg-carbon/90 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">Eligible for private draft</p>
          <div className="mt-4 space-y-3">{accepted.map((item) => <p key={item} className="flex items-center gap-3 text-sm text-white/68"><span className="grid h-5 w-5 place-items-center rounded-full border border-mint/25 bg-mint/[0.08]"><Check className="h-3 w-3 text-mint" /></span>{item}</p>)}</div>
        </div>
      </div>
      <div className="grid gap-3 border-t border-line px-5 py-4 text-sm text-white/55 md:grid-cols-[1fr_auto] md:items-center"><p><span className="font-semibold text-white">Public gate:</span> 3 independent grounded PASS results, every declared test passing, score 75+, reuse license, clean safety checks, and explicit user approval.</p><Link href="/docs" className="inline-flex items-center gap-2 font-mono text-xs text-aqua transition hover:text-white">Read validation policy <ArrowRight className="h-3.5 w-3.5" /></Link></div>
    </div>
  );
}

function Signal({ label, text }: { label: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-lg px-3 py-2"><span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_14px_rgba(115,243,195,0.95)]" /><p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mint">{label}</p><span className="hidden h-px flex-1 bg-line sm:block" /><p className="text-sm text-white/54">{text}</p></div>;
}

function ContextLine({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="grid grid-cols-[4.7rem_1fr] gap-2 border-b border-line/70 pb-2 last:border-0"><span className="text-white/38">{label}</span><span className={tone}>{value}</span></div>;
}

function McpEndpointCard() {
  const [copied, setCopied] = useState(false);
  const endpoint = "https://contextkit.pro/mcp";

  async function copyEndpoint() {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="mt-5 w-full rounded-xl border border-aqua/20 bg-aqua/[0.045] p-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-aqua">Remote MCP / Streamable HTTP</p><code className="mt-1.5 block truncate font-mono text-sm text-white/90">{endpoint}</code></div>
        <div className="flex shrink-0 gap-2"><button type="button" onClick={copyEndpoint} className="inline-flex h-9 items-center gap-2 rounded-lg border border-aqua/30 bg-ink/45 px-3 text-xs text-aqua transition hover:border-aqua hover:text-white">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button><Link href="/mcp-guide" className="inline-flex h-9 items-center gap-2 rounded-lg bg-aqua px-3 text-xs font-medium text-ink transition hover:bg-mint">Guide <ArrowRight className="h-3.5 w-3.5" /></Link></div>
      </div>
    </div>
  );
}

function TypingPanel({ title, tone, lines }: { title: string; tone: "aqua" | "mint"; lines: string[] }) {
  const toneClass = tone === "aqua" ? "text-aqua" : "text-mint";
  const fullText = lines.join("\n");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let index = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let restartTimeout: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      interval = setInterval(() => {
        index += 1;
        setTyped(fullText.slice(0, index));
        if (index >= fullText.length && interval) {
          clearInterval(interval);
          restartTimeout = setTimeout(() => { index = 0; setTyped(""); start(); }, 1500);
        }
      }, 26);
    };
    const startTimeout = setTimeout(start, 400);
    return () => { clearTimeout(startTimeout); if (restartTimeout) clearTimeout(restartTimeout); if (interval) clearInterval(interval); };
  }, [fullText]);

  const typedLines = lines.map((_, index) => typed.split("\n")[index] ?? "");
  return <div className="min-h-[190px] overflow-hidden rounded-xl border border-line bg-ink/75 p-4 font-mono text-[11px] shadow-inner"><div className="mb-3 flex items-center justify-between border-b border-line pb-3"><span className={`uppercase tracking-[0.15em] ${toneClass}`}>{title}</span><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /></div><div className="space-y-2">{typedLines.map((line, index) => <div key={`${title}-${index}`} className="flex min-h-[1.2rem] gap-2 text-white/68"><span className={toneClass}>{">"}</span><span>{line}</span></div>)}<div className="flex gap-2"><span className={toneClass}>{">"}</span><span className="stream-cursor mt-0.5 h-3.5 w-1.5 rounded-sm bg-mint/80" /></div></div></div>;
}
