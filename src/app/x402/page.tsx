import type { Metadata } from "next";
import { Architecture } from "@/components/architecture";
import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { bankrX402Command } from "@/lib/bankr-x402";

export const metadata: Metadata = {
  title: "Bankr x402 Endpoints",
  description: "Call ContextKit through Bankr-hosted x402 endpoints with USDC settlement before context compute and verified skill marketplace actions.",
  alternates: { canonical: "/x402" },
  openGraph: {
    title: "ContextKit x402",
    description: "Paid agent context infrastructure for Bankr and autonomous workflows.",
    url: "/x402"
  }
};

const flow = `1. Agent calls a Bankr-hosted ContextKit endpoint on x402.bankr.bot.
2. Bankr presents the x402 payment requirement and settles USDC on Base.
3. Bankr forwards the paid request to a private ContextKit internal endpoint.
4. ContextKit calls the Bankr LLM Gateway, records analytics/payment metadata, and emits webhooks.
5. The agent receives typed context JSON or a complete validated skill repository with checksums.`;

const command = bankrX402Command("handoff", {
  messages: [{ role: "user", content: "Continue this deployment handoff for another AI agent." }]
});

export default function X402Page() {
  return (
    <main>
      <Section eyebrow="x402" title="HTTP-native micro-payments for agent infrastructure.">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 text-lg leading-8 text-white/65">
            <p>x402 lets AI agents pay for infrastructure at request time instead of relying on accounts, invoices, or monthly SaaS plans.</p>
            <p>For ContextKit, that means an agent can buy memory operations, compile completed work with proof, push immutable source versions, inspect manifests, or clone a validated repository exactly when needed.</p>
            <p>ContextKit does not ask users to paste an x402 password. Bankr-hosted x402 handles payment, then forwards successful requests into ContextKit.</p>
            <p>The write lane costs $0.01 and creates private drafts first. Public listing requires explicit approval; verified skill installation uses the $0.05 buyer lane.</p>
          </div>
          <CodeBlock code={flow} />
        </div>
        <div className="mt-8">
          <CodeBlock code={command} />
        </div>
        <div className="mt-12">
          <Architecture />
        </div>
      </Section>
    </main>
  );
}
