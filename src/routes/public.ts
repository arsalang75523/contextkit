import { Hono } from "hono";
import { AnalyticsService } from "@/services/analytics-service";
import type { AppBindings } from "@/types/bindings";

export const publicRoutes = new Hono<AppBindings>();

publicRoutes.get("/public/metrics", async (c) => {
  const overview = await new AnalyticsService(c.env ?? {}).overview();
  return c.json({
    totalRequests: overview.totalRequests,
    averageTokenReduction: overview.averageTokenReduction,
    webhookDeliveries: overview.webhookDeliveries,
    compressionSavings: overview.savedTokens
  });
});
