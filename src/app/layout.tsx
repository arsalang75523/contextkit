import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Github } from "lucide-react";
import "./globals.css";
import { site } from "@/lib/site";

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
    "agent handoff"
  ],
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
  verification: {
    google: "3AQtlnuucvn6SHCRA6eJkv40xZtJARUNlgF2LZyglko"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ContextKit",
    applicationCategory: "DeveloperApplication",
    description: site.description,
    offers: { "@type": "Offer", price: "0.03", priceCurrency: "USD" }
  };

  return (
    <html lang="en" className="dark">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <div className="fixed inset-0 -z-10 grid-bg" />
        <header className="sticky top-0 z-40 border-b border-line bg-ink/78 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-mint/30 bg-mint/10 shadow-glow">
                <Activity className="h-5 w-5 text-mint" />
              </span>
              <span className="font-semibold tracking-wide">{site.name}</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm text-white/70 md:flex">
              {site.nav.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
            <Link
              href="https://github.com/arsalang75523/contextkit"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-white/80 transition hover:border-mint/40 hover:text-white"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
          </nav>
        </header>
        {children}
        <footer className="border-t border-line px-5 py-10 text-sm text-white/55">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>ContextKit turns conversation history into payable, portable agent memory.</p>
            <p>Bankr-native. x402-powered. Built for autonomous workflows.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
