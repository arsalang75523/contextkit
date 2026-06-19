import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/button";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `${site.name} | ${site.tagline}`,
  description: site.description,
  alternates: {
    canonical: "/share"
  },
  openGraph: {
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    siteName: site.name,
    images: [
      {
        url: `${site.url}/social-card-v4.jpg`,
        secureUrl: `${site.url}/social-card-v4.jpg`,
        width: 1200,
        height: 630,
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
    images: [{ url: `${site.url}/social-card-v4.jpg`, alt: "ContextKit memory layer for AI agents" }]
  },
  other: {
    "twitter:image:src": `${site.url}/social-card-v4.jpg`,
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
