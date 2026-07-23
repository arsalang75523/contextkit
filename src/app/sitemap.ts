import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { ExperienceService } from "@/services/experience-service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = ["", "/llms.txt", "/llms-full.txt", "/docs.md", "/api-reference.md", "/x402.md", "/benchmarks.md", "/examples.md", "/openapi.json", "/ai-agents", "/benchmarks", "/examples", "/contact-dev", "/docs", "/docs/api", "/docs/redoc", "/api-reference", "/demo", "/playground", "/pricing", "/x402", "/integrations", "/marketplace", "/dashboard", "/dashboard/skills"];
  const marketplace = await new ExperienceService().marketplace({ sort: "latest", limit: 100 });
  return [
    ...staticPaths.map((path) => ({
      url: `${site.url}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8
    })),
    ...marketplace.results.map((listing) => ({
      url: `${site.url}/marketplace/${listing.id}`,
      lastModified: new Date(listing.updatedAt),
      changeFrequency: "daily" as const,
      priority: 0.7
    }))
  ];
}
