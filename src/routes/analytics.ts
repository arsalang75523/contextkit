import { Hono } from "hono";
import { AnalyticsService } from "@/services/analytics-service";
import { PaymentService } from "@/services/payment-service";
import { requireApiKey } from "@/middleware/auth";
import type { AppBindings } from "@/types/bindings";

export const analyticsRoutes = new Hono<AppBindings>();

analyticsRoutes.get("/analytics/overview", requireApiKey("analytics:read"), async (c) => {
  return c.json(await new AnalyticsService(c.env ?? {}).overview());
});

analyticsRoutes.get("/analytics/tokens", requireApiKey("analytics:read"), async (c) => {
  const overview = await new AnalyticsService(c.env ?? {}).overview();
  return c.json({
    inputTokens: overview.totalInputTokens,
    outputTokens: overview.totalOutputTokens,
    savedTokens: overview.savedTokens,
    averageTokenReduction: overview.averageTokenReduction
  });
});

analyticsRoutes.get("/analytics/payments", requireApiKey("analytics:read"), async (c) => {
  return c.json({ payments: await new PaymentService(c.env ?? {}).listPayments() });
});

analyticsRoutes.get("/analytics/usage", requireApiKey("analytics:read"), async (c) => {
  const service = new AnalyticsService(c.env ?? {});
  return c.json({
    endpoints: await service.endpointUsage(),
    requests: await service.requests()
  });
});
