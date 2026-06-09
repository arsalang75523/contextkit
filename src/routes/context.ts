import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { conversationRequestSchema } from "@/types/api";
import { sanitizeMessages } from "@/utils/sanitize";
import { estimateTokens } from "@/utils/tokens";
import { ContextService } from "@/services/context-service";
import { AnalyticsService } from "@/services/analytics-service";
import { ApiKeyService } from "@/services/api-key-service";
import { x402PaymentRequired } from "@/middleware/x402";
import { requireApiKey } from "@/middleware/auth";
import { apiKeyRateLimit } from "@/middleware/rate-limit";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { createId } from "@/utils/id";
import type { AppBindings } from "@/types/bindings";
import type { ConversationMessage, ConversationRequest } from "@/types/api";

export const contextRoutes = new Hono<AppBindings>();

contextRoutes.post("/summarize", requireApiKey("context:write"), apiKeyRateLimit(), x402PaymentRequired("summarize"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.summarize(request);
  await complete(c, "/summarize", request, JSON.stringify(result), c.get("payment")?.paymentId);
  await service.emitCompleted(request, "summarization.completed", result);
  return c.json(result);
});

contextRoutes.post(
  "/compress-context",
  requireApiKey("context:write"),
  apiKeyRateLimit(),
  x402PaymentRequired("compress-context"),
  zValidator("json", conversationRequestSchema),
  async (c) => {
    const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.compress(request);
    await complete(c, "/compress-context", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "context.compressed", result);
    return c.json(result);
  }
);

contextRoutes.post("/handoff", requireApiKey("context:write"), apiKeyRateLimit(), x402PaymentRequired("handoff"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.handoff(request);
  await complete(c, "/handoff", request, JSON.stringify(result), c.get("payment")?.paymentId);
  await service.emitCompleted(request, "handoff.generated", result);
  return c.json(result);
});

contextRoutes.post(
  "/extract-profile",
  requireApiKey("context:write"),
  apiKeyRateLimit(),
  x402PaymentRequired("extract-profile"),
  zValidator("json", conversationRequestSchema),
  async (c) => {
    const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.profile(request);
    await complete(c, "/extract-profile", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "profile.extracted", result);
    return c.json(result);
  }
);

contextRoutes.post("/x402/summarize", x402PaymentRequired("summarize"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.summarize(request);
  await complete(c, "/x402/summarize", request, JSON.stringify(result), c.get("payment")?.paymentId);
  await service.emitCompleted(request, "summarization.completed", result);
  return c.json(result);
});

contextRoutes.post(
  "/x402/compress-context",
  x402PaymentRequired("compress-context"),
  zValidator("json", conversationRequestSchema),
  async (c) => {
    const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.compress(request);
    await complete(c, "/x402/compress-context", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "context.compressed", result);
    return c.json(result);
  }
);

contextRoutes.post("/x402/handoff", x402PaymentRequired("handoff"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.handoff(request);
  await complete(c, "/x402/handoff", request, JSON.stringify(result), c.get("payment")?.paymentId);
  await service.emitCompleted(request, "handoff.generated", result);
  return c.json(result);
});

contextRoutes.post(
  "/x402/extract-profile",
  x402PaymentRequired("extract-profile"),
  zValidator("json", conversationRequestSchema),
  async (c) => {
    const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.profile(request);
    await complete(c, "/x402/extract-profile", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "profile.extracted", result);
    return c.json(result);
  }
);

async function complete(
  c: Context<AppBindings>,
  route: string,
  request: ConversationRequest,
  output: string,
  paymentId?: string
) {
  const requestId = c.get("requestId");
  const payment = c.get("payment");
  const apiKey = c.get("apiKey");
  await new AnalyticsService(c.env ?? {}).recordRequest({
    requestId,
    route,
    latencyMs: Date.now() - c.get("startedAt"),
    inputTokens: estimateTokens(request.messages as ConversationMessage[]),
    outputTokens: estimateTokens(output),
    paymentId,
    apiKeyId: apiKey?.id,
    amountUsd: payment?.amountUsd,
    status: "success"
  });

  if (apiKey) {
    await new ApiKeyService(c.env ?? {}).recordUsage(apiKey.hash, route, payment?.amountUsd ?? 0);
  }

  if (payment) {
    await dispatchWebhook({
      url: request.webhookUrl,
      context: { env: c.env ?? {} },
      event: {
        id: createId("evt"),
        type: "payment.received",
        createdAt: new Date().toISOString(),
        requestId,
        data: payment
      }
    });
  }

  await dispatchWebhook({
    url: request.webhookUrl,
    context: { env: c.env ?? {} },
    event: {
      id: createId("evt"),
      type: "request.completed",
      createdAt: new Date().toISOString(),
      requestId,
      data: { route, paymentId }
    }
  });
}
