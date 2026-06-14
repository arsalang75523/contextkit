import { Package, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrX402Command } from "@/lib/bankr-x402";

const installSample = `npm install @basedchef/contextkit

curl -X POST https://your-domain.com/api/dashboard/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Autonomous Agent Operator",
    "email": "agent-owner@example.com",
    "password": "replace-with-12-plus-chars",
    "company": "Agent Lab"
  }'`;

const hostedSample = bankrX402Command("summarize", {
  messages: [{ role: "user", content: "Summarize this deployment context for another agent." }]
});

export function GetStartedCard() {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-md border border-line bg-white/[0.035] p-6">
        <div className="grid h-11 w-11 place-items-center rounded-md border border-mint/25 bg-mint/10">
          <Package className="h-5 w-5 text-mint" />
        </div>
        <h3 className="mt-6 text-2xl font-semibold text-white">Three ways to use ContextKit.</h3>
        <p className="mt-4 leading-7 text-white/62">
          Bankr-hosted x402 is the public pay-per-call path. API keys are for dashboard operations and credit-backed SDK calls. The SDK can run paid endpoints without Bankr when the account has credits.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-white/65">
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">1.</span> Simple users and agents: run the Bankr-hosted x402 command. No ContextKit API key, npm package, or SDK is required.
          </div>
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">2.</span> Dashboard workflows: use API keys for analytics, usage, webhooks, token estimates, credits, memory enrichment, and key management.
          </div>
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">3.</span> Developers: use the SDK with an API key and account credits. Add an x402 payer only as an optional fallback.
          </div>
        </div>
      </div>
      <div className="rounded-md border border-line bg-carbon/72 p-4 shadow-glow">
        <div className="mb-4 flex items-center gap-2 text-sm text-aqua">
          <Terminal className="h-4 w-4" />
          Bankr command + optional SDK/API bootstrap
        </div>
        <CodeBlock code={`${installSample}\n\n${hostedSample}`} />
      </div>
    </div>
  );
}
