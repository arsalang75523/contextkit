"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, BrainCircuit, Cable, CircleDollarSign, FileJson, Gauge, KeyRound, Webhook } from "lucide-react";
import { Architecture } from "@/components/architecture";
import { Button } from "@/components/button";
import { GetStartedCard } from "@/components/get-started-card";
import { LiveMetrics } from "@/components/live-metrics";
import { Section } from "@/components/section";

const features = [
  ["Conversation Summarization", BrainCircuit, "/api/summarize", "{ compact, state, metrics }"],
  ["Context Compression", Gauge, "/api/compress-context", "{ compressedContext, state, entities, metrics }"],
  ["Agent Handoff Engine", Bot, "/api/handoff", "{ project, completed, priorities, startHere }"],
  ["User Profile Extraction", FileJson, "/api/extract-profile", "{ micro, compact, full, memoryFacts }"],
  ["x402 Payments", CircleDollarSign, "per request", "$0.03 - $0.05"],
  ["Webhook Automation", Webhook, "signed events", "replayable delivery logs"],
  ["Bankr-native Integration", Cable, "LLM gateway", "claude-sonnet-4.5 via Bankr"]
] as const;

const requestStream = [
  "POST /contextkit-summarize",
  "x402: $0.05 USDC",
  "agent: night-bus pilot",
  "mode: compact",
  "context: overnight transit ops",
  "constraints: airport windows",
  "risk: charging capacity",
  "preserve: goal, blockers, next"
];

const responseStream = [
  "mode: compact",
  "blocked: charging + weekend coverage",
  "next: finalize depot schedule",
  "state: route + staffing constraints",
  "metrics.inputTokens: 1690",
  "metrics.outputTokens: 330",
  "metrics.reduction: 80%",
  "metrics.latencyMs: 4316"
];

export default function HomePage() {
  return (
    <main>
      <section className="relative min-h-[calc(100vh-73px)] overflow-hidden px-5 py-20">
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-ink to-transparent" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <p className="mb-5 inline-flex rounded-md border border-mint/25 bg-mint/10 px-3 py-1 text-sm text-mint">
              x402-powered APIs for autonomous agents
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] text-white md:text-7xl">
              Context Infrastructure for AI Agents
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              Reduce token costs, compress conversations, and enable seamless agent handoffs using x402-powered APIs.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href="/api-reference">
                Get API Key <KeyRound className="h-4 w-4" />
              </Button>
              <Button href="/docs" variant="secondary">
                Read Docs <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="https://github.com/arsalang75523/contextkit" variant="secondary">
                View GitHub
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="rounded-md border border-line bg-carbon/72 p-4 shadow-glow"
          >
            <div className="mb-4 grid grid-cols-3 gap-2 text-xs text-white/60">
              <span className="rounded bg-mint/10 px-3 py-2 text-mint">live metrics below</span>
              <span className="rounded bg-aqua/10 px-3 py-2 text-aqua">$0.05 summarize</span>
              <span className="rounded bg-coral/10 px-3 py-2 text-coral">compress, handoff, profile</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <TypingPanel title="Request" tone="aqua" lines={requestStream} />
              <TypingPanel title="Response" tone="mint" lines={responseStream} startDelayMs={900} />
            </div>
          </motion.div>
        </div>
      </section>

      <Section eyebrow="Architecture" title="A payable context layer between agents and long-running memory.">
        <div className="mb-10">
          <LiveMetrics />
        </div>
        <Architecture />
      </Section>

      <Section eyebrow="Get Started" title="Install the SDK, issue a key, and let agents buy context on demand.">
        <GetStartedCard />
      </Section>

      <Section eyebrow="Platform" title="Everything an agent needs to carry context forward.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([title, Icon, path, json], index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.04 }}
              className="rounded-md border border-line bg-white/[0.035] p-6"
            >
              <Icon className="h-6 w-6 text-mint" />
              <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Developer-first infrastructure with typed JSON, observability, and Bankr-aware payment flows.
              </p>
              <div className="mt-5 rounded border border-line bg-ink/70 p-3 font-mono text-xs text-aqua">{path}</div>
              <div className="mt-2 rounded border border-line bg-ink/70 p-3 font-mono text-xs text-mint">{json}</div>
            </motion.article>
          ))}
        </div>
      </Section>

      <section className="border-t border-line px-5 py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-md border border-line bg-mint/10 p-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-white">Launch agent memory with x402 pricing today.</h2>
            <p className="mt-3 max-w-2xl text-white/65">Use Bankr-hosted x402 for paid agent calls, or issue scoped API keys for dashboards, token estimation, webhooks, and advanced self-hosted integrations.</p>
          </div>
          <Link href="/api-reference" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-medium text-ink">
            Explore API <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function TypingPanel({ title, tone, lines, startDelayMs = 0 }: { title: string; tone: "aqua" | "mint"; lines: string[]; startDelayMs?: number }) {
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
          restartTimeout = setTimeout(() => {
            index = 0;
            setTyped("");
            start();
          }, 1400);
        }
      }, 34);
    };

    const startTimeout = setTimeout(start, startDelayMs);

    return () => {
      clearTimeout(startTimeout);
      if (restartTimeout) clearTimeout(restartTimeout);
      if (interval) clearInterval(interval);
    };
  }, [fullText, startDelayMs]);

  const visibleLines = typed.split("\n");
  const typedLines = lines.map((_, index) => visibleLines[index] ?? "");

  return (
    <div className="h-[350px] overflow-hidden rounded border border-line bg-ink/75 p-4 font-mono text-xs shadow-inner">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <span className={`uppercase tracking-[0.18em] ${toneClass}`}>{title}</span>
        <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
      </div>
      <div className="space-y-2.5">
        {typedLines.map((line, index) => (
          <div key={`${title}-${index}`} className="flex min-h-[1.25rem] items-start gap-2 text-white/72">
            <span className={toneClass}>{">"}</span>
            <span>{line}</span>
          </div>
        ))}
        <div className="flex min-h-[1.25rem] items-start gap-2">
          <span className={toneClass}>{">"}</span>
          <span className="stream-cursor mt-0.5 h-4 w-[7px] rounded-sm bg-mint/80" />
        </div>
      </div>
    </div>
  );
}
