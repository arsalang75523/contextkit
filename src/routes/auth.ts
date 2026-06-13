import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createApiKeySchema, revokeApiKeySchema } from "@/types/api";
import { ApiKeyService } from "@/services/api-key-service";
import { CreditService } from "@/services/credit-service";
import { requireAdmin, requireApiKey } from "@/middleware/auth";
import { AccountService } from "@/services/account-service";
import type { AppBindings } from "@/types/bindings";

export const authRoutes = new Hono<AppBindings>();

authRoutes.post("/auth/create-key", requireAdmin(), zValidator("json", createApiKeySchema), async (c) => {
  const result = await new ApiKeyService(c.env ?? {}).create(c.req.valid("json"));
  return c.json({ key: result.key, apiKey: result.record }, 201);
});

authRoutes.post("/auth/revoke-key", requireAdmin(), zValidator("json", revokeApiKeySchema), async (c) => {
  const revoked = await new ApiKeyService(c.env ?? {}).revoke(c.req.valid("json").keyId);
  return c.json({ revoked });
});

authRoutes.post("/auth/credits/grant", requireAdmin(), async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { ownerId?: string; amountUsd?: number; note?: string };
  if (!body.ownerId || typeof body.amountUsd !== "number" || body.amountUsd <= 0) {
    return c.json({
      error: {
        code: "invalid_credit_grant",
        message: "ownerId and positive amountUsd are required.",
        requestId: c.get("requestId")
      }
    }, 400);
  }

  const event = await new CreditService(c.env ?? {}).grant({
    ownerId: body.ownerId,
    amountUsd: body.amountUsd,
    note: body.note
  });
  return c.json({ ok: true, event });
});

authRoutes.post("/auth/revoke-own-key", zValidator("json", revokeApiKeySchema), async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId) {
    return c.json({ error: { code: "unauthorized", message: "Dashboard session required.", requestId: c.get("requestId") } }, 401);
  }
  const keys = await new ApiKeyService(c.env ?? {}).list(session.accountId);
  if (!keys.some((key) => key.id === c.req.valid("json").keyId)) {
    return c.json({ error: { code: "not_found", message: "API key not found for this account.", requestId: c.get("requestId") } }, 404);
  }
  const revoked = await new ApiKeyService(c.env ?? {}).revoke(c.req.valid("json").keyId);
  return c.json({ revoked });
});

authRoutes.get("/auth/keys", requireApiKey("keys:read"), async (c) => {
  return c.json({ keys: await new ApiKeyService(c.env ?? {}).list() });
});

authRoutes.get("/auth/my-keys", async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId) {
    return c.json({ error: { code: "unauthorized", message: "Dashboard session required.", requestId: c.get("requestId") } }, 401);
  }
  return c.json({ keys: await new ApiKeyService(c.env ?? {}).list(session.accountId) });
});

authRoutes.get("/auth/credits", async (c) => {
  const session = await readDashboardSession(c);
  if (session?.accountId) {
    return c.json(await new CreditService(c.env ?? {}).summary(session.accountId));
  }

  const authorization = c.req.header("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return c.json({ error: { code: "unauthorized", message: "Dashboard session or Authorization: Bearer <api_key> is required.", requestId: c.get("requestId") } }, 401);
  }

  const record = await new ApiKeyService(c.env ?? {}).authenticate(token);
  if (!record) {
    return c.json({ error: { code: "invalid_api_key", message: "API key is invalid or revoked.", requestId: c.get("requestId") } }, 401);
  }
  return c.json(await new CreditService(c.env ?? {}).summary(record.ownerId ?? `api-key:${record.id}`));
});

authRoutes.get("/auth/usage", requireApiKey("analytics:read"), async (c) => {
  return c.json(await new ApiKeyService(c.env ?? {}).usage(c.req.query("keyId")));
});

async function readDashboardSession(c: Context<AppBindings>) {
  const cookie = c.req.header("cookie") ?? "";
  const sessionId = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ck_session="))
    ?.slice("ck_session=".length);
  return new AccountService(c.env ?? {}).getSession(sessionId);
}
