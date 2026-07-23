import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Github } from "lucide-react";
import "./globals.css";
import { site } from "@/lib/site";
import { safeJsonLd } from "@/lib/marketplace-seo";

// Keep a new, stable cache key for social crawlers when the card artwork changes.
const socialImageUrl = `${site.url}/social-card-v7.jpg?card=verified-skills-v10`;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | ${site.tagline}`,
    template: `%s | ${site.name}`
  },
  description: site.description,
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg"
  },
  keywords: [
    "AI agents",
    "AI infrastructure",
    "context compression",
    "token optimization",
    "x402 APIs",
    "Bankr ecosystem",
    "agent handoff",
    "verified agent skills",
    "AI skill marketplace",
    "MCP skills",
    "portable agent workflows"
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  authors: [{ name: "ContextKit" }],
  creator: "ContextKit",
  publisher: "ContextKit",
  openGraph: {
    title: "Use your IDE. Earn from what your agent learns.",
    description: "Turn proven agent work into complete versioned skill repositories and earn USDC when other agents clone them through x402.",
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
    description: "Turn proven agent work into complete versioned skill repositories and earn USDC when other agents clone them through x402.",
    images: [{ url: socialImageUrl, alt: "Use your IDE to publish verified agent skills and earn USDC" }]
  },
  other: {
    "twitter:image:src": socialImageUrl,
    "twitter:image:width": "1200",
    "twitter:image:height": "630",
    "twitter:image:type": "image/jpeg"
  },
  verification: {
    google: "3AQtlnuucvn6SHCRA6eJkv40xZtJARUNlgF2LZyglko"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
        url: site.url,
        logo: `${site.url}/favicon.svg`,
        sameAs: [
          "https://github.com/arsalang75523/contextkit",
          "https://x.com/contextkitpro",
          "https://farcaster.xyz/arsalang.eth"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        name: site.name,
        url: site.url,
        description: site.description,
        publisher: { "@id": `${site.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${site.url}/marketplace?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${site.url}/#application`,
        name: site.name,
        applicationCategory: "DeveloperApplication",
        description: site.description,
        operatingSystem: "Web, Node.js, MCP hosts",
        offers: { "@type": "Offer", price: "0.03", priceCurrency: "USD" }
      }
    ]
  };

  return (
    <html lang="en" className="dark">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />
        <div className="fixed inset-0 -z-10 grid-bg" />
        <header className="sticky top-0 z-40 border-b border-line bg-ink/80 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <nav className="mx-auto flex h-[62px] max-w-7xl items-center justify-between gap-4 px-5">
            <Link href="/" className="group flex shrink-0 items-center gap-3">
              <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-mint/30 bg-mint/[0.09] transition group-hover:border-mint/65 group-hover:bg-mint/[0.14]">
                <Activity className="h-[18px] w-[18px] text-mint" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-ink bg-mint" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-[0.08em] text-white">{site.name}</span>
                <span className="hidden font-mono text-[9px] uppercase tracking-[0.15em] text-white/38 sm:block">agent continuity layer</span>
              </span>
            </Link>
            <div className="hidden items-center rounded-full border border-line bg-white/[0.025] px-1 py-1 text-sm text-white/68 lg:flex">
              {site.nav.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-full px-3 py-1.5 transition hover:bg-white/[0.07] hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
            <Link
              href="https://github.com/arsalang75523/contextkit"
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-mint/25 bg-mint/[0.07] px-3 text-sm text-mint transition hover:border-mint/65 hover:bg-mint/15 hover:text-white"
            >
              <Github className="h-4 w-4" />
              <span className="hidden sm:inline">GitHub</span>
            </Link>
          </nav>
        </header>
        {children}
        <footer className="border-t border-line px-5 py-10 text-sm text-white/55">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>ContextKit turns agent state into durable memory and proven work into cloneable skill repositories.</p>
            <p>Evidence-gated. Bankr-native. x402-powered.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
