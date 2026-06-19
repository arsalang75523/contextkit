import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const aiCrawlers = [
    "GPTBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-User",
    "PerplexityBot",
    "Googlebot",
    "Google-Extended",
    "Bingbot",
    "Applebot",
    "CCBot",
    "DuckAssistBot",
    "Bytespider",
    "PetalBot",
    "Twitterbot"
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/"
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: [
          "/",
          "/ai-agents",
          "/benchmarks",
          "/benchmarks.md",
          "/examples",
          "/examples.md",
          "/docs",
          "/share",
          "/api-reference",
          "/playground",
          "/pricing",
          "/x402",
          "/social-card-v4.jpg",
          "/social-card-v4.png",
          "/openapi.json",
          "/llms.txt",
          "/llms-full.txt",
          "/docs.md",
          "/api-reference.md",
          "/x402.md"
        ]
      }))
    ],
    sitemap: [`${site.url}/sitemap.xml`, `${site.url}/llms.txt`]
  };
}
