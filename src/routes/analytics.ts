import { Hono } from "hono";
import type { Context } from "hono";
import { AnalyticsService } from "@/services/analytics-service";
import { PaymentService } from "@/services/payment-service";
import { AccountService } from "@/services/account-service";
import { ApiKeyService } from "@/services/api-key-service";
import type { AppBindings } from "@/types/bindings";

export const analyticsRoutes = new Hono<AppBindings>();

analyticsRoutes.use("/analytics/*", async (c, next) => {
  const session = await readDashboardSession(c);
  if (session?.accountId) {
    await next();
    return;
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
  if (!record.scopes.includes("analytics:read")) {
    return c.json({ error: { code: "insufficient_scope", message: "API key requires analytics:read.", requestId: c.get("requestId") } }, 403);
  }
  c.set("apiKey", {
    id: record.id,
    hash: record.hash,
    environment: record.environment,
    scopes: record.scopes,
    name: record.name,
    ownerId: record.ownerId
  });
  await next();
});

analyticsRoutes.get("/analytics/overview", async (c) => {
  const ownerId = await resolveOwnerId(c);
  return c.json(ownerId ? await new AnalyticsService(c.env ?? {}).overviewForOwner(ownerId) : await new AnalyticsService(c.env ?? {}).overview());
});

analyticsRoutes.get("/analytics/tokens", async (c) => {
  const ownerId = await resolveOwnerId(c);
  const overview = ownerId ? await new AnalyticsService(c.env ?? {}).overviewForOwner(ownerId) : await new AnalyticsService(c.env ?? {}).overview();
  return c.json({
    inputTokens: overview.totalInputTokens,
    outputTokens: overview.totalOutputTokens,
    savedTokens: overview.savedTokens,
    averageTokenReduction: overview.averageTokenReduction
  });
});

analyticsRoutes.get("/analytics/payments", async (c) => {
  const ownerId = await resolveOwnerId(c);
  const overview = ownerId ? await new AnalyticsService(c.env ?? {}).overviewForOwner(ownerId) : await new AnalyticsService(c.env ?? {}).overview();
  const payments = await new PaymentService(c.env ?? {}).listPayments(ownerId);
  return c.json({
    summary: {
      paymentTotal: overview.paymentTotal,
      paymentCount: payments.length,
      note: "ContextKit tracks Bankr-hosted x402 payments forwarded through the v2 wrapper. Earlier Bankr earnings remain visible in Bankr x402 list."
    },
    payments
  });
});

analyticsRoutes.get("/analytics/usage", async (c) => {
  const service = new AnalyticsService(c.env ?? {});
  const ownerId = await resolveOwnerId(c);
  return c.json({
    endpoints: ownerId ? await service.endpointUsageForOwner(ownerId) : await service.endpointUsage(),
    requests: ownerId ? await service.requestsForOwner(ownerId) : await service.requests()
  });
});

async function resolveOwnerId(c: Context<AppBindings>) {
  const session = await readDashboardSession(c);
  return session?.accountId ?? c.get("apiKey")?.ownerId;
}

async function readDashboardSession(c: Context<AppBindings>) {
  const cookie = c.req.header("cookie") ?? "";
  const sessionId = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ck_session="))
    ?.slice("ck_session=".length);
  return new AccountService(c.env ?? {}).getSession(sessionId);
}
