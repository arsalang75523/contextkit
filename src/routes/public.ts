import { Hono } from "hono";
import { AnalyticsService } from "@/services/analytics-service";
import type { AppBindings } from "@/types/bindings";

export const publicRoutes = new Hono<AppBindings>();

publicRoutes.get("/public/metrics", async (c) => {
  const analytics = new AnalyticsService(c.env ?? {});
  const [overview, totalRevenue] = await Promise.all([analytics.overview(), analytics.totalRecordedRevenue()]);
  return c.json({
    totalRequests: overview.totalRequests,
    averageTokenReduction: overview.averageTokenReduction,
    webhookDeliveries: overview.webhookDeliveries,
    compressionSavings: overview.savedTokens,
    paymentTotal: overview.paymentTotal,
    totalRevenue
  });
});

publicRoutes.get("/public/endpoint-metrics", async (c) => {
  const endpoints = await new AnalyticsService(c.env ?? {}).endpointStats();
  return c.json({ endpoints });
});
