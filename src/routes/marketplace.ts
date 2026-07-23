import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AccountService } from "@/services/account-service";
import { ExperienceService, type MarketplaceSort } from "@/services/experience-service";
import { skillReviewSchema } from "@/types/api";
import type { AppBindings } from "@/types/bindings";

const skillIdPattern = /^exp_[a-f0-9]{24}$/;
const marketplaceSorts = new Set<MarketplaceSort>(["trending", "latest", "rating", "installs"]);

export const marketplaceRoutes = new Hono<AppBindings>();

marketplaceRoutes.get("/public/marketplace", async (c) => {
  const sortInput = c.req.query("sort") as MarketplaceSort | undefined;
  const sort = sortInput && marketplaceSorts.has(sortInput) ? sortInput : "trending";
  const limitInput = Number(c.req.query("limit") ?? 24);
  const result = await new ExperienceService(c.env ?? {}).marketplace({
    query: c.req.query("q"),
    category: c.req.query("category"),
    sort,
    featured: c.req.query("featured") === "true",
    limit: Number.isFinite(limitInput) ? limitInput : 24
  });
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return c.json(result);
});

marketplaceRoutes.get("/public/skills/:skillId", async (c) => {
  const skillId = c.req.param("skillId");
  if (!skillIdPattern.test(skillId)) return notFound(c);
  const listing = await new ExperienceService(c.env ?? {}).publicListing(skillId);
  if (!listing) return notFound(c);
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return c.json({ listing });
});

marketplaceRoutes.get("/public/skills/:skillId/reviews", async (c) => {
  const skillId = c.req.param("skillId");
  if (!skillIdPattern.test(skillId)) return notFound(c);
  const limitInput = Number(c.req.query("limit") ?? 20);
  const reviews = await new ExperienceService(c.env ?? {}).reviews(
    skillId,
    Number.isFinite(limitInput) ? limitInput : 20
  );
  c.header("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return c.json({ reviews, count: reviews.length });
});

marketplaceRoutes.get("/dashboard/skills", async (c) => {
  const session = await dashboardAccount(c);
  if (!session) return unauthorized(c);
  return c.json(await new ExperienceService(c.env ?? {}).sellerDashboard(session.account.id));
});

marketplaceRoutes.post(
  "/dashboard/skills/:skillId/reviews",
  zValidator("json", skillReviewSchema),
  async (c) => {
    const skillId = c.req.param("skillId");
    if (!skillIdPattern.test(skillId)) return notFound(c);
    const session = await dashboardAccount(c);
    if (!session) return unauthorized(c);

    try {
      const result = await new ExperienceService(c.env ?? {}).review(
        skillId,
        c.req.valid("json"),
        { ownerId: session.account.id, name: session.account.name }
      );
      return c.json(result, 201);
    } catch (error) {
      if (error instanceof Error && error.message === "experience_not_found") return notFound(c);
      if (error instanceof Error && error.message === "review_own_skill") {
        return c.json({
          error: {
            code: "review_own_skill",
            message: "Sellers cannot review their own skill.",
            requestId: c.get("requestId")
          }
        }, 403);
      }
      if (error instanceof Error && error.message === "review_too_short") {
        return c.json({
          error: {
            code: "review_too_short",
            message: "Write a concrete review with at least three meaningful words.",
            requestId: c.get("requestId")
          }
        }, 422);
      }
      throw error;
    }
  }
);

async function dashboardAccount(c: Context<AppBindings>) {
  const sessionId = (c.req.header("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ck_session="))
    ?.slice("ck_session=".length);
  const accounts = new AccountService(c.env ?? {});
  const session = await accounts.getSession(sessionId);
  if (!session?.accountId) return null;
  const account = await accounts.get(session.accountId);
  return account ? { session, account } : null;
}

function notFound(c: Context<AppBindings>) {
  return c.json({
    error: {
      code: "skill_not_found",
      message: "The public verified skill was not found.",
      requestId: c.get("requestId")
    }
  }, 404);
}

function unauthorized(c: Context<AppBindings>) {
  return c.json({
    error: {
      code: "unauthorized",
      message: "Dashboard login is required.",
      requestId: c.get("requestId")
    }
  }, 401);
}
