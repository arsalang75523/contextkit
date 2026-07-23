import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive Agent Memory Demo",
  description: "Run the same conversation through ContextKit summarize, compress, handoff, profile, and memory enrichment flows.",
  alternates: { canonical: "/demo" },
  openGraph: {
    title: "ContextKit Agent Memory Demo",
    description: "See how ContextKit preserves operational state across agent continuation workflows.",
    url: "/demo"
  }
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
