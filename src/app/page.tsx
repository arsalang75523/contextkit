"use client";

import { useEffect, useState } from "react";
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
  Sparkles
} from "lucide-react";
import { Architecture } from "@/components/architecture";
import { Button } from "@/components/button";
import { GetStartedCard } from "@/components/get-started-card";
import { LiveMetrics } from "@/components/live-metrics";
import { Section } from "@/components/section";

const capabilities = [
  ["Summarize", "Conversation to continuation state", BrainCircuit, "/api/summarize"],
  ["Compress", "Long context to reusable memory", Gauge, "/api/compress-context"],
  ["Handoff", "One agent to the next", Bot, "/api/handoff"],
  ["Profile", "Durable user memory", FileJson, "/api/extract-profile"]
] as const;

const responseStream = [
  "state.goal: reduce wait <18m",
  "state.blocker: 8-vehicle depot",
  "state.next: finalize rotation",
  "output: 330 tokens",
  "input: 1,690 tokens",
  "reduction: 80%"
];

const memoryNodes = [
  ["01", "Intent", "goal locked", "mint"],
  ["02", "Constraints", "3 active", "aqua"],
  ["03", "Decisions", "4 preserved", "amber"],
  ["04", "Next actions", "queued", "coral"]
] as const;

export default function HomePage() {
  return (
    <main className="overflow-hidden">
      <section className="agent-hero relative isolate min-h-[calc(100vh-73px)] px-5 pb-16 pt-12 md:pt-20">
        <div className="agent-grid absolute inset-0 -z-20" />
        <div className="agent-orb agent-orb-one absolute -left-40 top-12 -z-10 h-[34rem] w-[34rem] rounded-full" />
        <div className="agent-orb agent-orb-two absolute -right-36 top-24 -z-10 h-[30rem] w-[30rem] rounded-full" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between border-y border-line/80 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/44 md:text-xs">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> ContextKit Network / Online</span>
            <span className="hidden sm:inline">Memory is infrastructure, not a transcript.</span>
            <span className="text-mint">v1.1.0</span>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[0.93fr_1.07fr] lg:gap-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.08] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mint">
                <Sparkles className="h-3.5 w-3.5" /> Agent memory layer
              </div>
              <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
                Give every agent a memory that can <span className="text-mint">survive</span> the next step.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/64">
                ContextKit turns expensive conversation history into durable, payable state for autonomous systems. Compress, hand off, and resume without losing the decision trail.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button href="/api-reference">Get API Key <KeyRound className="h-4 w-4" /></Button>
                <Button href="/playground" variant="secondary">Try Playground <ArrowRight className="h-4 w-4" /></Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/55">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-mint" /> Scoped API keys</span>
                <span className="inline-flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-aqua" /> x402 native</span>
                <Link href="https://github.com/arsalang75523/contextkit" className="inline-flex items-center gap-2 transition hover:text-white"><Cable className="h-4 w-4 text-coral" /> Open source</Link>
              </div>
              <McpEndpointCard />
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.97, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.12 }} className="relative">
              <div className="agent-console overflow-hidden rounded-[1.35rem] border border-white/[0.13] bg-carbon/75 shadow-[0_28px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg border border-mint/25 bg-mint/10"><Network className="h-4 w-4 text-mint" /></div>
                    <div><p className="text-sm font-medium text-white">Continuity Engine</p><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">Context packet / active</p></div>
                  </div>
                  <span className="flex items-center gap-2 rounded-full border border-mint/20 bg-mint/[0.07] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mint"><Radio className="h-3 w-3" /> Live</span>
                </div>

                <div className="grid gap-0 border-b border-line md:grid-cols-[0.88fr_1.12fr]">
                  <div className="relative min-h-[250px] overflow-hidden border-b border-line p-5 md:border-b-0 md:border-r">
                    <div className="agent-radar absolute inset-0 opacity-80" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-white/42"><span>State map</span><span className="text-mint">4 nodes</span></div>
                      <div className="relative mx-auto grid h-36 w-36 place-items-center rounded-full border border-mint/20 bg-ink/55">
                        <div className="absolute inset-4 rounded-full border border-aqua/15" />
                        <div className="absolute inset-10 rounded-full border border-mint/25" />
                        <span className="relative grid h-12 w-12 place-items-center rounded-full border border-mint/35 bg-mint/10"><BrainCircuit className="h-5 w-5 text-mint" /></span>
                        <i className="absolute -left-1 top-8 h-2 w-2 rounded-full bg-aqua shadow-[0_0_15px_#68d8ff]" />
                        <i className="absolute bottom-4 right-4 h-2 w-2 rounded-full bg-coral shadow-[0_0_15px_#ff7b6b]" />
                        <i className="absolute right-3 top-5 h-2 w-2 rounded-full bg-amber shadow-[0_0_15px_#f6d365]" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-line bg-ink/50 p-2.5"><p className="font-mono text-[10px] text-white/42">IN</p><p className="mt-1 text-sm font-medium text-white">1,690</p></div>
                        <div className="rounded-lg border border-mint/20 bg-mint/[0.05] p-2.5"><p className="font-mono text-[10px] text-mint/70">OUT</p><p className="mt-1 text-sm font-medium text-mint">330</p></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4"><TypingPanel title="Packet in / state out" tone="mint" lines={responseStream} /></div>
                </div>

                <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
                  {memoryNodes.map(([index, title, detail, tone]) => (
                    <div key={title} className="bg-carbon/90 px-4 py-4">
                      <p className={`font-mono text-[10px] uppercase tracking-[0.17em] ${tone === "mint" ? "text-mint" : tone === "aqua" ? "text-aqua" : tone === "amber" ? "text-amber" : "text-coral"}`}>{index}</p>
                      <p className="mt-2 text-sm font-medium text-white">{title}</p>
                      <p className="mt-1 font-mono text-[10px] text-white/42">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full border border-aqua/15" />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative border-y border-line bg-white/[0.018] px-5 py-5">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3">
          <Signal label="01 / Capture" text="Keep the state, not every token." />
          <Signal label="02 / Settle" text="x402 payment before compute." />
          <Signal label="03 / Continue" text="Start the next agent informed." />
        </div>
      </section>

      <Section eyebrow="Memory Flow" title="A stateful layer between a finished thought and the next agent action.">
        <div className="mb-10"><LiveMetrics /></div>
        <Architecture />
      </Section>

      <Section eyebrow="Agent Capabilities" title="Four primitives. One durable continuity layer.">
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

      <Section eyebrow="Build With It" title="Choose your agent's entry point.">
        <GetStartedCard />
      </Section>

      <section className="px-5 pb-24 pt-4">
        <div className="agent-cta mx-auto max-w-7xl overflow-hidden rounded-[1.4rem] border border-mint/25 p-8 md:p-12">
          <div className="relative z-10 flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div><p className="font-mono text-xs uppercase tracking-[0.18em] text-mint">Build continuity</p><h2 className="mt-4 max-w-2xl text-balance text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">Agents can only be autonomous if they remember what matters.</h2></div>
            <Link href="/api-reference" className="inline-flex h-11 items-center gap-2 rounded-lg bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white">Explore the API <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Signal({ label, text }: { label: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-lg px-3 py-2"><span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_14px_rgba(115,243,195,0.95)]" /><p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mint">{label}</p><span className="hidden h-px flex-1 bg-line sm:block" /><p className="text-sm text-white/54">{text}</p></div>;
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
    <div className="mt-8 max-w-xl rounded-xl border border-aqua/20 bg-aqua/[0.045] p-3.5">
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
  return <div className="min-h-[220px] overflow-hidden rounded-xl border border-line bg-ink/75 p-4 font-mono text-[11px] shadow-inner"><div className="mb-3 flex items-center justify-between border-b border-line pb-3"><span className={`uppercase tracking-[0.15em] ${toneClass}`}>{title}</span><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /></div><div className="space-y-2">{typedLines.map((line, index) => <div key={`${title}-${index}`} className="flex min-h-[1.2rem] gap-2 text-white/68"><span className={toneClass}>{">"}</span><span>{line}</span></div>)}<div className="flex gap-2"><span className={toneClass}>{">"}</span><span className="stream-cursor mt-0.5 h-3.5 w-1.5 rounded-sm bg-mint/80" /></div></div></div>;
}
