import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";

export default function PricingPage() {
  return (
    <main>
      <Section eyebrow="Pricing" title="Micro-priced context compute with visible token savings.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {endpoints.map((endpoint) => (
            <article key={endpoint.slug} className="rounded-md border border-line bg-white/[0.035] p-6">
              <p className="font-mono text-sm text-mint">{endpoint.path}</p>
              <p className="mt-5 text-4xl font-semibold text-white">{endpoint.price}</p>
              <p className="mt-3 text-sm leading-6 text-white/60">Per successful request, settled by x402 before LLM execution.</p>
            </article>
          ))}
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            ["10M tokens/month", "Reduce by 45%", "$42k model spend can drop near $23k"],
            ["Agent handoffs", "72% shorter continuation prompts", "Fewer stuck workflows and fewer repeated plans"],
            ["Profile memory", "Durable extraction", "Less prompt stuffing across user sessions"]
          ].map(([title, metric, text]) => (
            <div key={title} className="rounded-md border border-line bg-mint/10 p-6">
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              <p className="mt-4 text-3xl font-semibold text-mint">{metric}</p>
              <p className="mt-3 leading-7 text-white/62">{text}</p>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
