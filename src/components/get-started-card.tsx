import { Package, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrX402Command } from "@/lib/bankr-x402";

const installSample = `npm install contextkit

curl -X POST http://localhost:3000/api/auth/create-key \\
  -H "Authorization: Bearer $CONTEXTKIT_ADMIN_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production agent",
    "environment": "live",
    "scopes": ["context:write", "analytics:read", "webhooks:write"]
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
        <h3 className="mt-6 text-2xl font-semibold text-white">Developer onboarding in two commands.</h3>
        <p className="mt-4 leading-7 text-white/62">
          Install the publish-ready TypeScript SDK, create scoped API keys for dashboards and analytics, then let agents buy context through Bankr-hosted x402 endpoints.
        </p>
        <div className="mt-6 grid gap-3 text-sm text-white/65">
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">1.</span> Generate <code>ck_test_</code> or <code>ck_live_</code> keys with scoped permissions.
          </div>
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">2.</span> Use <code>ContextKit</code> SDK methods: summarize, compressContext, handoff, extractProfile.
          </div>
          <div className="rounded border border-line bg-ink/65 p-4">
            <span className="text-mint">3.</span> Call Bankr-hosted x402 endpoints directly from Bankr agents or CLI. No payment password is pasted into ContextKit.
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
