import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AccountService } from "@/services/account-service";
import { ExperienceService, type MarketplaceSort } from "@/services/experience-service";
import { requireAdmin } from "@/middleware/auth";
import { SellerPayoutService } from "@/services/seller-payout-service";
import {
  payoutAdminActionSchema,
  payoutRequestSchema,
  payoutWalletChallengeSchema,
  payoutWalletVerifySchema,
  sellerBetaAccessSchema,
  skillLifecycleSchema,
  skillModerationSchema,
  skillReviewSchema
} from "@/types/api";
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
  c.header("Cache-Control", "no-store");
  return c.json(result);
});

marketplaceRoutes.get("/public/skills/:skillId", async (c) => {
  const skillId = c.req.param("skillId");
  if (!skillIdPattern.test(skillId)) return notFound(c);
  const listing = await new ExperienceService(c.env ?? {}).publicListing(skillId);
  if (!listing) return notFound(c);
  c.header("Cache-Control", "no-store");
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

marketplaceRoutes.get("/dashboard/skills/library", async (c) => {
  const session = await dashboardAccount(c);
  if (!session) return unauthorized(c);
  return c.json(await new ExperienceService(c.env ?? {}).buyerLibrary(session.account.id));
});

marketplaceRoutes.post(
  "/dashboard/skills/:skillId/lifecycle",
  zValidator("json", skillLifecycleSchema),
  async (c) => {
    const skillId = c.req.param("skillId");
    if (!skillIdPattern.test(skillId)) return notFound(c);
    const session = await dashboardAccount(c);
    if (!session) return unauthorized(c);

    try {
      return c.json(await new ExperienceService(c.env ?? {}).updateListing(
        skillId,
        session.account.id,
        c.req.valid("json").action
      ));
    } catch (error) {
      return listingActionError(c, error);
    }
  }
);

marketplaceRoutes.post(
  "/dashboard/payout/wallet/challenge",
  zValidator("json", payoutWalletChallengeSchema),
  async (c) => {
    const session = await dashboardAccount(c);
    if (!session) return unauthorized(c);
    try {
      return c.json(await new SellerPayoutService(c.env ?? {}).createWalletChallenge(
        session.account.id,
        c.req.valid("json").address
      ));
    } catch (error) {
      return payoutError(c, error);
    }
  }
);

marketplaceRoutes.post(
  "/dashboard/payout/wallet/verify",
  zValidator("json", payoutWalletVerifySchema),
  async (c) => {
    const session = await dashboardAccount(c);
    if (!session) return unauthorized(c);
    const body = c.req.valid("json");
    try {
      return c.json({
        wallet: await new SellerPayoutService(c.env ?? {}).verifyWallet(
          session.account.id,
          body.address,
          body.signature
        )
      });
    } catch (error) {
      return payoutError(c, error);
    }
  }
);

marketplaceRoutes.post(
  "/dashboard/payout/request",
  zValidator("json", payoutRequestSchema),
  async (c) => {
    const session = await dashboardAccount(c);
    if (!session) return unauthorized(c);
    try {
      return c.json({
        payout: await new SellerPayoutService(c.env ?? {}).request(
          session.account.id,
          c.req.valid("json").amountUsd
        )
      }, 201);
    } catch (error) {
      return payoutError(c, error);
    }
  }
);

marketplaceRoutes.get("/admin/payouts", requireAdmin(), async (c) =>
  c.json({ payouts: await new SellerPayoutService(c.env ?? {}).adminList() })
);

marketplaceRoutes.post(
  "/admin/marketplace/beta-sellers",
  requireAdmin(),
  zValidator("json", sellerBetaAccessSchema),
  async (c) => {
    const body = c.req.valid("json");
    return c.json(await new ExperienceService(c.env ?? {}).setSellerBetaAccess(
      body.ownerId,
      body.allowed
    ));
  }
);

marketplaceRoutes.post(
  "/admin/payouts/:payoutId",
  requireAdmin(),
  zValidator("json", payoutAdminActionSchema),
  async (c) => {
    const payoutId = c.req.param("payoutId");
    const body = c.req.valid("json");
    const service = new SellerPayoutService(c.env ?? {});
    try {
      const payout = body.action === "approve"
        ? await service.approve(payoutId, body.note)
        : body.action === "reject"
          ? await service.reject(payoutId, body.note ?? "")
          : await service.markPaid(payoutId, body.txHash ?? "");
      return c.json({ payout });
    } catch (error) {
      return payoutError(c, error);
    }
  }
);

marketplaceRoutes.post(
  "/admin/skills/:skillId/moderation",
  requireAdmin(),
  zValidator("json", skillModerationSchema),
  async (c) => {
    const skillId = c.req.param("skillId");
    if (!skillIdPattern.test(skillId)) return notFound(c);
    const body = c.req.valid("json");
    try {
      return c.json(await new ExperienceService(c.env ?? {}).moderate(
        skillId,
        body.action,
        "admin",
        body.reason
      ));
    } catch (error) {
      return listingActionError(c, error);
    }
  }
);

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

function listingActionError(c: Context<AppBindings>, error: unknown) {
  if (!(error instanceof Error)) throw error;
  if (error.message === "experience_not_found") return notFound(c);
  if (error.message === "experience_forbidden") {
    return c.json({
      error: {
        code: "experience_forbidden",
        message: "You can only manage your own skill listings.",
        requestId: c.get("requestId")
      }
    }, 403);
  }
  if (error.message === "skill_suspended") {
    return c.json({
      error: {
        code: "skill_suspended",
        message: "This listing is suspended and requires an administrator review.",
        requestId: c.get("requestId")
      }
    }, 409);
  }
  if (error.message === "skill_archived") {
    return c.json({
      error: {
        code: "skill_archived",
        message: "Archived listings cannot be restored. Publish a new semantic version instead.",
        requestId: c.get("requestId")
      }
    }, 409);
  }
  if (error.message === "seller_beta_access_required") {
    return c.json({
      error: {
        code: "seller_beta_access_required",
        message: "Marketplace closed beta is active. This seller needs an administrator invite before relisting.",
        requestId: c.get("requestId")
      }
    }, 403);
  }
  throw error;
}

function payoutError(c: Context<AppBindings>, error: unknown) {
  if (!(error instanceof Error)) throw error;
  const errors: Record<string, { status: 400 | 404 | 409 | 422; message: string }> = {
    invalid_wallet_address: { status: 422, message: "Enter a valid EVM payout wallet address." },
    wallet_challenge_not_found: { status: 404, message: "Wallet verification challenge was not found. Create a new challenge." },
    wallet_challenge_expired: { status: 409, message: "Wallet verification challenge expired. Create and sign a new challenge." },
    wallet_signature_invalid: { status: 422, message: "The wallet signature could not be verified." },
    payout_wallet_required: { status: 422, message: "Verify a Base payout wallet before requesting settlement." },
    payout_below_minimum: { status: 422, message: "The minimum payout is 1 USDC." },
    payout_insufficient_balance: { status: 422, message: "Requested payout exceeds the available seller balance." },
    payout_request_in_progress: { status: 409, message: "A payout request is already being processed. Retry in one minute." },
    payout_not_found: { status: 404, message: "Payout request was not found." },
    payout_not_approved: { status: 409, message: "Approve the payout before recording settlement." },
    payout_status_conflict: { status: 409, message: "Payout status no longer allows this action." },
    invalid_transaction_hash: { status: 422, message: "Enter a valid Base transaction hash." },
    transaction_already_used: { status: 409, message: "That transaction was already assigned to a payout." },
    payout_transaction_not_verified: { status: 422, message: "No matching confirmed Base USDC transfer was found." },
    rpc_request_failed: { status: 400, message: "Base RPC verification failed. Retry after RPC service recovers." }
  };
  const mapped = errors[error.message];
  if (!mapped) throw error;
  return c.json({
    error: {
      code: error.message,
      message: mapped.message,
      requestId: c.get("requestId")
    }
  }, mapped.status);
}
