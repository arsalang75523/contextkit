import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";

const quickStart = `npm install contextkit

curl -X POST http://localhost:3000/api/summarize \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $CONTEXTKIT_API_KEY" \\
  -H "X-Payment: $X402_PAYMENT_PAYLOAD" \\
  -d '{"messages":[{"role":"user","content":"Summarize this long agent conversation."}]}'`;

const tsExample = `const response = await fetch("https://contextkit.dev/api/compress-context", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Payment": x402PaymentPayload,
    "X-Agent-Id": "bankr-agent-prod"
  },
  body: JSON.stringify({
    messages,
    webhookUrl: "https://agent.example.com/webhooks/contextkit"
  })
});

const context = await response.json();`;

export default function DocsPage() {
  return (
    <main>
      <Section eyebrow="Docs" title="Ship context-aware agents with a four-endpoint API.">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-md border border-line bg-white/[0.035] p-5 text-sm text-white/65">
            {["Introduction", "Quick Start", "Authentication", "x402 Payments", "API Reference", "Webhooks", "SDK Usage", "Deployment", "Error Handling", "Rate Limits", "Examples"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replaceAll(" ", "-")}`} className="block rounded px-2 py-2 hover:bg-white/[0.04] hover:text-white">
                {item}
              </a>
            ))}
          </aside>
          <div className="space-y-12">
            <DocSection id="introduction" title="Introduction">
              ContextKit is a payable context service for autonomous agents. It turns verbose conversations into compact memory, handoff payloads, and durable user profiles.
            </DocSection>
            <DocSection id="quick-start" title="Quick Start">
              <CodeBlock code={quickStart} />
            </DocSection>
            <DocSection id="authentication" title="Authentication">
              Requests include <code>Authorization: Bearer &lt;api_key&gt;</code>, an x402 payment payload, and optional <code>X-Agent-Id</code>.
            </DocSection>
            <DocSection id="x402-payments" title="x402 Payments">
              Each endpoint returns HTTP 402 with payment instructions when no valid payment is present. Once paid, ContextKit logs the payment and proceeds with Bankr LLM Gateway inference.
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
