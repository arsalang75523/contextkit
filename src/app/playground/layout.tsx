import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground: Test ContextKit Endpoints",
  description: "Paste a conversation, run ContextKit modes, inspect structured output, and copy paid requests for Bankr x402 or direct API use.",
  alternates: { canonical: "/playground" },
  openGraph: {
    title: "ContextKit Playground",
    description: "Test context compression, handoffs, profiles, memory enrichment, and verified skill workflows.",
    url: "/playground"
  }
};

export default function PlaygroundLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
