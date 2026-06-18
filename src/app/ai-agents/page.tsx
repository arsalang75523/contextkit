import Link from "next/link";
import { ArrowRight, Bot, BrainCircuit, Cable, FileJson } from "lucide-react";
import { Section } from "@/components/section";

const agentFlows = [
  {
    title: "Summarize After Long Runs",
    icon: BrainCircuit,
    body: "Turn long planning sessions into compact continuation state that preserves goals, blockers, constraints, and next actions."
  },
  {
    title: "Compress Before Expensive Calls",
    icon: FileJson,
    body: "Send machine-optimized context packets into downstream prompts instead of replaying full conversation history."
  },
  {
    title: "Handoff Between Agents",
    icon: Bot,
    body: "Generate successor-agent payloads with completed work, pending work, decisions, risks, and start-here instructions."
  },
  {
    title: "Pay With x402",
    icon: Cable,
    body: "Use Bankr-hosted x402 endpoints for public pay-per-call access, or API-key credits for app integrations."
  }
] as const;

export default function AiAgentsPage() {
  return (
    <main>
      <Section eyebrow="AI Agents" title="A continuation memory layer for autonomous workflows.">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div>
            <p className="text-lg leading-8 text-white/68">
              ContextKit gives agents a dedicated context lifecycle: summarize after milestones, compress before long prompts, hand off between workers, and preserve durable user memory without dragging the full conversation forward.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/playground" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-mint px-5 text-sm font-medium text-ink">
                Try Playground <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/docs" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line px-5 text-sm text-white/75">
                Read Docs
              </Link>
            </div>
            <div className="mt-8 rounded-md border border-aqua/20 bg-aqua/10 p-5">
              <p className="font-mono text-sm leading-7 text-aqua">
                Agent rule: preserve goal, blockers, constraints, decisions, and next actions before context exceeds the model window.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {agentFlows.map(({ title, icon: Icon, body }) => (
              <article key={title} className="rounded-md border border-line bg-white/[0.035] p-5">
                <Icon className="h-6 w-6 text-mint" />
                <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/60">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
