import { Package, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrX402Command } from "@/lib/bankr-x402";

const installSample = `npm install contextkit

curl -X POST https://91.107.248.223.sslip.io/api/dashboard/signup \\
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
        <h3 className="mt-6 text-2xl font-semibold text-white">Self-serve onboarding for humans and agents.</h3>
        <p className="mt-4 leading-7 text-white/62">
          Create an account from the dashboard or terminal, verify the email, then issue scoped API keys from the dashboard. Paid generation can still run directly through Bankr-hosted x402.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-white/65">
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">1.</span> For paid AI generation, agents can call Bankr-hosted x402 directly with Bankr CLI/account payment access.
          </div>
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">2.</span> ContextKit API keys are for dashboards, analytics, token estimates, webhooks, and advanced direct API usage.
          </div>
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">3.</span> Email verification is required before dashboard access or API key creation. Full API keys are shown once when created.
          </div>
        </div>
      </div>
      <div className="rounded-md border border-line bg-carbon/72 p-4 shadow-glow">
        <div className="mb-4 flex items-center gap-2 text-sm text-aqua">
          <Terminal className="h-4 w-4" />
          npm package + API key bootstrap
        </div>
        <CodeBlock code={`${installSample}\n\n${hostedSample}`} />
      </div>
    </div>
  );
}
