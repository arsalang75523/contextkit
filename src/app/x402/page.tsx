import { Architecture } from "@/components/architecture";
import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";

const flow = `1. Agent requests /api/handoff without payment.
2. ContextKit returns HTTP 402 with accepted price, asset, network, and payTo.
3. Agent settles using x402.
4. Agent retries with X-Payment header.
5. ContextKit verifies payment, calls Bankr LLM Gateway, and emits signed webhooks.`;

export default function X402Page() {
  return (
    <main>
      <Section eyebrow="x402" title="HTTP-native micro-payments for agent infrastructure.">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 text-lg leading-8 text-white/65">
            <p>x402 lets AI agents pay for infrastructure at request time instead of relying on accounts, invoices, or monthly SaaS plans.</p>
            <p>For context infrastructure, that means a Bankr agent can buy summarization, compression, handoff, or profile extraction exactly when a workflow needs it.</p>
            <p>ContextKit stores payment logs in appKV, links them to request analytics, and emits signed events so downstream agents can continue without polling.</p>
          </div>
          <CodeBlock code={flow} />
        </div>
        <div className="mt-12">
          <Architecture />
        </div>
      </Section>
    </main>
  );
}
