import Link from "next/link";
import { ArrowRight, BadgeCheck, Bot, BrainCircuit, Cable, FileJson, PackageCheck } from "lucide-react";
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
  },
  {
    title: "Compile Proven Work",
    icon: BadgeCheck,
    body: "Turn completed, reusable workflows from any legitimate domain with source-grounded execution proof into private SKILL.md drafts."
  },
  {
    title: "Install Verified Skills",
    icon: PackageCheck,
    body: "Search metadata previews, then buy a versioned skill bundle with validation evidence and a non-resale license."
  }
] as const;

export default function AiAgentsPage() {
  return (
    <main>
      <Section eyebrow="AI Agents" title="A continuation memory layer for autonomous workflows.">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div>
            <p className="text-lg leading-8 text-white/68">
              ContextKit gives agents two durable layers: continuation memory for long-running work, and a verified skill registry for reusable methods that passed source-grounded execution checks.
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
                Agent rule: preserve continuation state early; compile a skill only after non-trivial work completes with hard proof, and never publish without user approval.
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
