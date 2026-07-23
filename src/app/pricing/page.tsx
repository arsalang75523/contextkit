import { ArrowRight, CheckCircle2, CircleDollarSign } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { bankrEndpoints } from "@/content/docs";
import { PricingEndpointStats } from "@/components/pricing-live";

export const metadata: Metadata = {
  title: "Pricing: Pay Per Agent Context Call",
  description: "Compare ContextKit Bankr x402 endpoint prices for core context operations and evidence-gated skill marketplace actions.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "ContextKit Pricing",
    description: "Clear USDC prices for context compute and verified agent skill workflows.",
    url: "/pricing"
  }
};

const endpointAccent: Record<string, { line: string; text: string; glow: string }> = {
  "contextkit-core": { line: "border-mint/35", text: "text-mint", glow: "from-mint/20" },
  "contextkit-experience-write": { line: "border-aqua/35", text: "text-aqua", glow: "from-aqua/20" },
  "contextkit-experience-search": { line: "border-amber/35", text: "text-amber", glow: "from-amber/20" },
  "contextkit-experience-buy": { line: "border-coral/35", text: "text-coral", glow: "from-coral/20" }
};

const fallbackAccent = { line: "border-line", text: "text-mint", glow: "from-mint/10" };

export default function PricingPage() {
  return (
    <main className="px-5 py-8 md:py-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-5 border-y border-line py-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl leading-7 text-white/60">Every endpoint settles before LLM execution. Pay per successful request with Bankr x402, or use account credits with the SDK and a scoped API key.</p>
          <div className="flex shrink-0 items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-mint"><CircleDollarSign className="h-4 w-4" /> USDC on Base</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {bankrEndpoints.map((endpoint, index) => {
            const accent = endpointAccent[endpoint.slug] ?? fallbackAccent;
            return (
              <article key={endpoint.slug} className={`group relative overflow-hidden rounded-xl border ${accent.line} bg-white/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.055]`}>
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accent.glow} to-transparent opacity-60`} />
                <div className="relative flex items-start justify-between gap-3"><p className={`font-mono text-xs ${accent.text}`}>0{index + 1}</p><span className="rounded-full border border-line bg-ink/45 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-white/42">POST</span></div>
                <p className={`relative mt-7 break-all font-mono text-sm ${accent.text}`}>{endpoint.slug}</p>
                <p className="relative mt-4 text-4xl font-semibold tracking-[-0.045em] text-white">{endpoint.price}</p>
                <p className="relative mt-1 text-xs uppercase tracking-[0.14em] text-white/40">per successful request</p>
                <p className="relative mt-5 min-h-[5.5rem] text-sm leading-6 text-white/60">{endpoint.description}</p>
                <div className="relative mt-4 flex flex-wrap gap-1.5">
                  {endpoint.modes.map((mode) => (
                    <span key={mode} className="rounded-full border border-line bg-ink/45 px-2 py-1 font-mono text-[9px] text-white/42">{mode}</span>
                  ))}
                </div>
                <PricingEndpointStats endpoint={endpoint.slug} />
                <Link href="/api-reference" className={`relative mt-5 inline-flex items-center gap-2 text-sm ${accent.text} transition group-hover:text-white`}>API details <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></Link>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-3 rounded-xl border border-line bg-carbon/65 p-5 md:grid-cols-4">
          <PricingNote title="No subscription" text="Only pay when an agent calls a paid context endpoint." />
          <PricingNote title="Two payment paths" text="Use hosted Bankr x402 or pre-funded SDK account credits." />
          <PricingNote title="Compute protected" text="Payment validation happens before model execution starts." />
          <PricingNote title="Quality-gated writes" text="The $0.01 write lane creates a private evidence-backed draft. Public listing needs approval; the buyer/install lane costs $0.05." />
        </div>
      </section>
    </main>
  );
}

function PricingNote({ title, text }: { title: string; text: string }) {
  return <div className="flex gap-3 border-line/80 md:border-r md:pr-5 last:border-0"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" /><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-sm leading-6 text-white/52">{text}</p></div></div>;
}
