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
        allow: ["/", "/marketplace", "/marketplace/"],
        disallow: ["/api/", "/dashboard/", "/oauth/", "/mcp"]
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        disallow: ["/api/", "/dashboard/", "/oauth/", "/mcp"],
        allow: [
          "/",
          "/ai-agents",
          "/benchmarks",
          "/benchmarks.md",
          "/examples",
          "/examples.md",
          "/docs",
          "/share",
          "/share-card",
          "/api-reference",
          "/playground",
          "/pricing",
          "/marketplace",
          "/marketplace/",
          "/x402",
          "/social-card-v7.jpg",
          "/openapi.json",
          "/llms.txt",
          "/llms-full.txt",
          "/docs.md",
          "/api-reference.md",
          "/x402.md"
        ]
      }))
    ],
    host: site.url,
    sitemap: `${site.url}/sitemap.xml`
  };
}
