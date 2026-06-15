import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";
import { PricingEndpointStats } from "@/components/pricing-live";

export default function PricingPage() {
  return (
    <main>
      <Section eyebrow="Pricing" title="Micro-priced context compute with visible token savings.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {endpoints.map((endpoint) => (
            <article key={endpoint.slug} className="rounded-md border border-line bg-white/[0.035] p-6">
              <p className="font-mono text-sm text-mint">{endpoint.path}</p>
              <p className="mt-5 text-4xl font-semibold text-white">{endpoint.price}</p>
              <p className="mt-3 text-sm leading-6 text-white/60">Per successful request, settled by x402 before LLM execution.</p>
              <PricingEndpointStats endpoint={endpoint.slug} />
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
