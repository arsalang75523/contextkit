import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { requestContext } from "@/middleware/request-context";
import { payloadLimit } from "@/middleware/payload-limit";
import { concurrencyLimit, rateLimit } from "@/middleware/rate-limit";
import { errorHandler } from "@/middleware/error-handler";
import { healthRoutes } from "@/routes/health";
import { contextRoutes } from "@/routes/context";
import { webhookRoutes } from "@/routes/webhooks";
import { authRoutes } from "@/routes/auth";
import { analyticsRoutes } from "@/routes/analytics";
import { tokenRoutes } from "@/routes/tokens";
import { publicRoutes } from "@/routes/public";
import { dashboardSessionRoutes } from "@/routes/dashboard-session";
import { marketplaceRoutes } from "@/routes/marketplace";
import type { AppBindings } from "@/types/bindings";

export const app = new Hono<AppBindings>().basePath("/api");

app.onError(errorHandler);
app.use("*", requestContext);
app.use("*", secureHeaders());
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Payment", "X402-Payment", "X-Agent-Id"],
  exposeHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset", "Retry-After", "X-Request-Id"]
}));
app.use("*", payloadLimit());
app.use("*", concurrencyLimit());
app.use("*", rateLimit());

app.route("/", healthRoutes);
app.route("/", publicRoutes);
app.route("/", dashboardSessionRoutes);
app.route("/", marketplaceRoutes);
app.route("/", authRoutes);
app.route("/", analyticsRoutes);
app.route("/", tokenRoutes);
app.route("/", contextRoutes);
app.route("/", webhookRoutes);

app.notFound((c) =>
  c.json(
    {
      error: {
        code: "not_found",
        message: "The requested ContextKit API route does not exist.",
        requestId: c.get("requestId")
      }
    },
    404
  )
);
