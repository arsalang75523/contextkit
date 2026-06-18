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
    "PetalBot"
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/"
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: ["/", "/docs", "/api-reference", "/playground", "/pricing", "/x402", "/openapi.json", "/llms.txt"]
      }))
    ],
    sitemap: [`${site.url}/sitemap.xml`, `${site.url}/llms.txt`]
  };
}
