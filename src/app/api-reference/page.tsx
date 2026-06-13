import { CodeBlock } from "@/components/code-block";
import { GetStartedCard } from "@/components/get-started-card";
import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

export default function ApiReferencePage() {
  return (
    <main>
      <Section eyebrow="Get Started" title="Choose the right ContextKit access path.">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-mint/25 bg-mint/10 p-5">
            <h2 className="font-semibold text-white">Main path: Bankr-hosted x402</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">Best for users and agents. Run a Bankr x402 command, approve payment, and receive JSON. No ContextKit API key, npm package, or SDK required.</p>
          </div>
          <a href="/dashboard/login" className="rounded-md border border-mint/25 bg-mint/10 p-5 transition hover:border-mint/60">
            <h2 className="font-semibold text-white">Operations: API key</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">Use API keys for dashboard, analytics, webhooks, token estimates, direct memory enrichment, key management, and credit-backed SDK calls.</p>
          </a>
          <div className="rounded-md border border-aqua/25 bg-aqua/10 p-5">
            <h2 className="font-semibold text-white">Advanced: SDK</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">Use the TypeScript SDK with a ContextKit API key. If the account has credits, paid endpoints work without Bankr; x402 can remain an optional fallback.</p>
          </div>
        </div>
        <GetStartedCard />
      </Section>
      <Section eyebrow="API Reference" title="Typed context APIs with x402 pricing and signed webhooks.">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-mint/20 bg-mint/10 p-5">
            <h2 className="font-semibold text-white">Recommended: Bankr-hosted x402</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Use these URLs for public paid calls. Bankr handles payment, then forwards the request to ContextKit. No ContextKit API key is required.</p>
          </div>
          <div className="rounded-md border border-aqua/20 bg-aqua/10 p-5">
            <h2 className="font-semibold text-white">Advanced: direct API routes</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Direct <code>/api/*</code> routes are for SDK and server integrations. API credits let paid endpoints run without Bankr; insufficient credits fall back to x402 payment.</p>
          </div>
        </div>
        <div className="space-y-8">
          {endpoints.map((endpoint) => {
            const request = JSON.stringify({
              messages: [{ role: "user", content: "Long-running agent conversation..." }],
              ...(endpoint.slug === "summarize" ? { mode: "micro" } : {})
            }, null, 2);
            const response = JSON.stringify(endpoint.response, null, 2);
            const curl = bankrX402Command(endpoint.slug, JSON.parse(request));
            return (
              <article key={endpoint.slug} className="rounded-md border border-line bg-white/[0.035] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="break-all font-mono text-sm text-mint">{endpoint.method} {bankrHostedUrl(endpoint.slug)}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{endpoint.description}</h2>
                    {endpoint.slug === "summarize" ? (
                      <div className="mt-3 grid gap-2 rounded border border-mint/25 bg-mint/10 p-3 text-sm leading-6 text-white/65 md:grid-cols-4">
                        <p><span className="font-semibold text-mint">micro</span>: default agent memory, smallest output.</p>
                        <p><span className="font-semibold text-mint">compact</span>: balanced production summary.</p>
                        <p><span className="font-semibold text-mint">extended</span>: human-readable compressed summary.</p>
                        <p><span className="font-semibold text-mint">debug</span>: full backward-compatible diagnostics.</p>
                      </div>
                    ) : null}
                    {endpoint.slug === "memory-enrichment" ? (
                      <p className="mt-3 max-w-3xl rounded border border-aqua/25 bg-aqua/10 p-3 text-sm leading-6 text-aqua">
                        Memory enrichment is operational: use <code>/api/memory-enrichment</code> with an API key, or use hosted <code>contextkit-profile</code> when you want paid profile + memory extraction through Bankr.
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-md border border-aqua/25 bg-aqua/10 px-3 py-1 text-sm text-aqua">{endpoint.price}</span>
                </div>
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Request</h3>
                    <CodeBlock code={request} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Response</h3>
                    <CodeBlock code={response} />
                  </div>
                </div>
                <div className="mt-5">
                  <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Bankr-hosted x402 command</h3>
                  <CodeBlock code={curl} />
                </div>
                <p className="mt-5 text-sm text-white/60">Webhook behavior: emits `{endpoint.event}` after successful generation and stores replayable audit state in ctx.files.</p>
              </article>
            );
          })}
        </div>
      </Section>
    </main>
  );
}
