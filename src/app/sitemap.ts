import type { MetadataRoute } from "next";
import { marketplaceSkillSeo } from "@/lib/marketplace-seo";
import { site } from "@/lib/site";
import { ExperienceService } from "@/services/experience-service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/docs.md",
    "/api-reference.md",
    "/x402.md",
    "/benchmarks.md",
    "/examples.md",
    "/openapi.json",
    "/ai-agents",
    "/benchmarks",
    "/examples",
    "/contact-dev",
    "/docs",
    "/docs/api",
    "/docs/redoc",
    "/api-reference",
    "/demo",
    "/playground",
    "/pricing",
    "/x402",
    "/integrations",
    "/mcp-guide",
    "/roadmap",
    "/marketplace"
  ];
  const marketplace = await new ExperienceService().marketplaceSeoListings();
  return [
    ...staticPaths.map((path) => ({
      url: `${site.url}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8
    })),
    ...marketplace
      .filter((listing) => marketplaceSkillSeo(listing).indexable)
      .map((listing) => ({
        url: `${site.url}/marketplace/${listing.id}`,
        lastModified: new Date(listing.updatedAt),
        changeFrequency: "daily" as const,
        priority: listing.installCount ? 0.8 : 0.7
      }))
  ];
}
