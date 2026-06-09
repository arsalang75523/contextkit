import { CodeBlock } from "@/components/code-block";
import { GetStartedCard } from "@/components/get-started-card";
import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

export default function ApiReferencePage() {
  return (
    <main>
      <Section eyebrow="Get Started" title="Install ContextKit and create your first scoped API key.">
        <GetStartedCard />
      </Section>
      <Section eyebrow="API Reference" title="Typed context APIs with x402 pricing and signed webhooks.">
        <div className="space-y-8">
          {endpoints.map((endpoint) => {
            const request = JSON.stringify({ messages: [{ role: "user", content: "Long-running agent conversation..." }] }, null, 2);
            const response = JSON.stringify(endpoint.response, null, 2);
            const curl = bankrX402Command(endpoint.slug, JSON.parse(request));
            return (
              <article key={endpoint.slug} className="rounded-md border border-line bg-white/[0.035] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm text-mint">{endpoint.method} {bankrHostedUrl(endpoint.slug)}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{endpoint.description}</h2>
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
                  <h3 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">curl</h3>
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
