import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";
import { bankrX402Command } from "@/lib/bankr-x402";

const quickStart = `npm install @basedchef/contextkit

${bankrX402Command("summarize", {
  messages: [{ role: "user", content: "Summarize this long agent conversation." }]
})}`;

const tsExample = `import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://91.107.248.223.sslip.io"
});

const context = await client.compressContext({ messages });`;

const directApiExample = `curl -X POST https://91.107.248.223.sslip.io/api/memory-enrichment \\
  -H "Authorization: Bearer ck_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"messages":[{"role":"user","content":"Remember this user preference."}]}'`;

export default function DocsPage() {
  return (
    <main>
      <Section eyebrow="Docs" title="Understand the three ContextKit access paths.">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-md border border-line bg-white/[0.035] p-5 text-sm text-white/65">
            {["Introduction", "Bankr-hosted x402", "API Key", "SDK", "Quick Start", "API Reference", "Webhooks", "Deployment", "Error Handling", "Rate Limits", "Examples"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="block rounded px-2 py-2 hover:bg-white/[0.04] hover:text-white">
                {item}
              </a>
            ))}
          </aside>
          <div className="space-y-12">
            <DocSection id="introduction" title="Introduction">
              ContextKit is a payable context service for autonomous agents. The main product path is Bankr-hosted x402: agents pay through Bankr and receive structured JSON from ContextKit. API keys and the SDK exist for operational and advanced developer workflows, not as the default paid-user path.
            </DocSection>
            <DocSection id="bankr-hosted-x402" title="Bankr-hosted x402">
              <p>
                This is the main path for users and agents. A user runs a Bankr x402 command, Bankr handles payment, and ContextKit returns JSON.
              </p>
              <CodeBlock code={bankrX402Command("summarize", {
                messages: [{ role: "user", content: "Summarize this." }]
              })} />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {["No ContextKit API key required", "No npm package required", "No SDK required", "Only bankr login is required"].map((item) => (
                  <div key={item} className="rounded-md border border-mint/20 bg-mint/10 p-3 text-sm text-white/70">
                    {item}
                  </div>
                ))}
              </div>
            </DocSection>
            <DocSection id="api-key" title="API Key">
              <p>
                API keys identify dashboard accounts and SDK integrations. They are used for analytics, usage, webhook register/replay, token estimates, direct memory enrichment, key management, and API-credit billing.
              </p>
              <p className="mt-3">
                If the API key owner has ContextKit credits, direct summarize, compress, handoff, and profile routes run without Bankr and deduct the endpoint price from the account balance. If credits are insufficient, direct routes fall back to a normal x402 payment challenge.
              </p>
              <CodeBlock code={directApiExample} />
              <p className="mt-3">
                Users can buy API credits from the dashboard with USDC on Base. ContextKit verifies the transaction, credits the account balance, and SDK calls spend from that balance without requiring Bankr per request.
              </p>
            </DocSection>
            <DocSection id="sdk" title="SDK">
              <p>
                The SDK is a TypeScript wrapper for advanced developers who want to integrate direct ContextKit calls inside their own app. It is not the main product path.
              </p>
              <p className="mt-3">
                The SDK can add the API key header, send typed requests, use account credits for paid endpoints, optionally call an x402 handler when a 402 challenge appears, and return JSON.
              </p>
              <CodeBlock code={tsExample} />
              <p className="mt-3 text-sm leading-6 text-white/55">
                Summary: simple users and simple agents can use Bankr-hosted x402. Developers can use SDK + API key + credits without Bankr. Advanced clients may still provide an optional x402 payer fallback.
              </p>
            </DocSection>
            <DocSection id="quick-start" title="Quick Start">
              Fastest path: run the Bankr-hosted x402 command. Install the SDK only if you are building an advanced TypeScript integration.
              <CodeBlock code={quickStart} />
            </DocSection>
            <DocSection id="authentication" title="Authentication">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border border-mint/20 bg-mint/10 p-4">
                  <h3 className="font-semibold text-white">Bankr-hosted x402 calls</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Best for new users and agents. Call <code>x402.bankr.bot</code>, approve payment with Bankr, and receive JSON. No ContextKit API key is required.
                  </p>
                </div>
                <div className="rounded-md border border-aqua/20 bg-aqua/10 p-4">
                  <h3 className="font-semibold text-white">ContextKit API keys</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Used for dashboard data, analytics, token estimates, webhook management, and advanced direct API integrations. Keys are scoped and can be revoked.
                  </p>
                </div>
              </div>
            </DocSection>
            <DocSection id="x402-payments" title="x402 Payments">
              Recommended production flow is Bankr-hosted x402: agents call <code>x402.bankr.bot</code>, Bankr settles USDC on Base, then forwards to ContextKit internal endpoints. Advanced self-hosted clients can still use direct HTTP 402 challenge/retry flows.
            </DocSection>
            <DocSection id="api-reference" title="API Reference">
              <div className="grid gap-4">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.path} className="rounded-md border border-line bg-white/[0.035] p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded bg-mint/10 px-2 py-1 font-mono text-xs text-mint">{endpoint.method}</span>
                      <span className="font-mono text-sm text-white">{endpoint.path}</span>
                      <span className="rounded bg-aqua/10 px-2 py-1 text-xs text-aqua">{endpoint.price}</span>
                    </div>
                    <p className="mt-3 text-sm text-white/60">{endpoint.description}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/35">Webhook: {endpoint.event}</p>
                  </div>
                ))}
              </div>
            </DocSection>
            <DocSection id="webhooks" title="Webhooks">
              Webhook deliveries include `ContextKit-Signature`, `ContextKit-Event`, and `ContextKit-Request-Id` headers. Replay endpoints are available for audit recovery.
            </DocSection>
            <DocSection id="sdk-usage" title="SDK Usage">
              SDK usage is for direct app integrations. With API credits, paid direct endpoints work without Bankr. If credits run out, provide an optional x402 payment handler or add more credits.
              <CodeBlock code={tsExample} />
            </DocSection>
            <DocSection id="deployment" title="Deployment">
              Deploy the web app to Vercel or Cloudflare Pages. Set `BANKR_LLM_KEY`, `CONTEXTKIT_WEBHOOK_SECRET`, `X402_PAY_TO`, and `X402_NETWORK`.
            </DocSection>
            <DocSection id="error-handling" title="Error Handling">
              Errors are structured with `code`, `message`, `requestId`, and optional validation details so agents can retry intelligently.
            </DocSection>
            <DocSection id="rate-limits" title="Rate Limits">
              Default abuse prevention is 120 requests per IP per minute. Replace the storage adapter with durable appKV bindings in production.
            </DocSection>
          </div>
        </div>
      </Section>
    </main>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-4 leading-7 text-white/65">{children}</div>
    </section>
  );
}
