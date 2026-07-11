import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/button";
import { site } from "@/lib/site";

const socialImageUrl = `${site.url}/social-card-v7.jpg?card=verified-skills-v10`;

export const metadata: Metadata = {
  title: `${site.name} | ${site.tagline}`,
  description: site.description,
  openGraph: {
    title: "Use your IDE. Earn from what your agent learns.",
    description: "Turn completed agent work into tested SKILL.md packages and earn USDC when other agents install them through x402.",
    siteName: site.name,
    images: [
      {
        url: socialImageUrl,
        secureUrl: socialImageUrl,
        width: 1200,
        height: 630,
        alt: "Use your IDE to publish verified agent skills and earn USDC",
        type: "image/jpeg"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: "@contextkitpro",
    creator: "@contextkitpro",
    title: "Use your IDE. Earn from what your agent learns.",
    description: "Turn completed agent work into tested SKILL.md packages and earn USDC when other agents install them through x402.",
    images: [{ url: socialImageUrl, alt: "Use your IDE to publish verified agent skills and earn USDC" }]
  },
  other: {
    "twitter:image:src": socialImageUrl,
    "twitter:image:width": "1200",
    "twitter:image:height": "630",
    "twitter:image:type": "image/jpeg"
  }
};

export default function SharePage() {
  return (
    <main className="px-5 py-24">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.22em] text-mint">ContextKit</p>
        <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">{site.tagline}</h1>
        <p className="mt-6 text-lg leading-8 text-white/68">{site.description}</p>
        <div className="mt-8">
          <Button href="/">
            Open ContextKit <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </main>
  );
}
