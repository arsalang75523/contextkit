import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/button";
import { site } from "@/lib/site";

const socialImageUrl = `${site.url}/social-card-v6.jpg?card=twitter-root-v8`;

export const metadata: Metadata = {
  title: `${site.name} | ${site.tagline}`,
  description: site.description,
  openGraph: {
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    images: [
      {
        url: socialImageUrl,
        secureUrl: socialImageUrl,
        width: 2400,
        height: 1200,
        alt: "ContextKit memory layer for AI agents",
        type: "image/jpeg"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    site: "@contextkitpro",
    creator: "@contextkitpro",
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    images: [{ url: socialImageUrl, alt: "ContextKit memory layer for AI agents" }]
  },
  other: {
    "twitter:image:src": socialImageUrl,
    "twitter:image:width": "2400",
    "twitter:image:height": "1200",
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
