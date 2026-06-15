import { CodeBlock } from "@/components/code-block";
import { GetStartedCard } from "@/components/get-started-card";
import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

export default function ApiReferencePage() {
  return (
    <main>
      <Section eyebrow="Get Started" title="Choose the right ContextKit access path.">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-mint/25 bg-mint/10 p-5">
            <h2 className="font-semibold text-white">Main path: Bankr-hosted x402</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">Best for new users, operators, and autonomous agents. Run a Bankr x402 command, approve USDC payment in Bankr, and receive JSON. No ContextKit API key, npm install, or SDK required.</p>
          </div>
          <a href="/dashboard/login" className="rounded-md border border-aqua/25 bg-aqua/10 p-5 transition hover:border-aqua/60">
            <h2 className="font-semibold text-white">Developer path: SDK + API key</h2>
            <p className="mt-2 text-sm leading-6 text-white/62">Use the TypeScript SDK or direct curl with a dashboard API key. API keys connect accounts to credits, analytics, webhooks, token estimates, memory enrichment, and key management. If credits exist, paid endpoints run without Bankr; otherwise direct routes return an x402 payment challenge.</p>
          </a>
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
            <h2 className="font-semibold text-white">Advanced: SDK/API-key direct routes</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">Direct <code>/api/*</code> routes are for SDK and backend integrations. Send <code>Authorization: Bearer &lt;CONTEXTKIT_API_KEY&gt;</code>. If the account has credits, paid endpoints run without Bankr; otherwise the route returns an x402 payment challenge.</p>
          </div>
        </div>
        <div className="space-y-8">
          {endpoints.map((endpoint) => {
            const request = JSON.stringify({
              messages: [{ role: "user", content: "Long-running agent conversation..." }],
              ...(endpoint.slug === "summarize" ? { mode: "micro" } : {})
            }, null, 2);
            const response = JSON.stringify(endpoint.response, null, 2);
            const payload = JSON.parse(request);
            const bankrCurl = bankrX402Command(endpoint.slug, payload);
            const directCurl = directApiCurl(endpoint.path, payload);
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
                        Memory enrichment is priced at <code>$0.04</code>: use <code>/api/memory-enrichment</code> with an API key and credits, or use hosted <code>contextkit-profile</code> when you want profile + memory extraction through Bankr.
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
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Bankr-hosted x402 POST</h3>
                    <p className="mb-3 text-sm leading-6 text-white/55">Public paid path. Bankr handles payment and forwards to ContextKit. No ContextKit API key required.</p>
                    <CodeBlock code={bankrCurl} />
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Direct API curl with API key</h3>
                    <p className="mb-3 text-sm leading-6 text-white/55">Server/SDK path. Uses account credits first; if credits are insufficient, paid endpoints return HTTP 402.</p>
                    <CodeBlock code={directCurl} />
                  </div>
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

function directApiCurl(path: string, payload: unknown) {
  const body = JSON.stringify(payload).replaceAll("'", "'\\''");
  return `curl -X POST https://your-domain.com${path} \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
}
