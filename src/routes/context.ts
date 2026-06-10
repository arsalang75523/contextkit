import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { conversationRequestSchema } from "@/types/api";
import { sanitizeMessages } from "@/utils/sanitize";
import { estimateTokens } from "@/utils/tokens";
import { ContextService } from "@/services/context-service";
import { AnalyticsService } from "@/services/analytics-service";
import { ApiKeyService } from "@/services/api-key-service";
import { PaymentService } from "@/services/payment-service";
import { x402PaymentRequired } from "@/middleware/x402";
import { requireApiKey, requireInternalToken } from "@/middleware/auth";
import { apiKeyRateLimit } from "@/middleware/rate-limit";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { createId } from "@/utils/id";
import { endpointPricing } from "@/lib/pricing";
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

contextRoutes.post("/memory-enrichment", requireApiKey("context:write"), apiKeyRateLimit(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.memoryEnrichment(request);
  await complete(c, "/memory-enrichment", request, JSON.stringify(result));
  return c.json(result);
});

contextRoutes.post("/x402/memory-enrichment", x402PaymentRequired("memory-enrichment"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.memoryEnrichment(request);
  await complete(c, "/x402/memory-enrichment", request, JSON.stringify(result), c.get("payment")?.paymentId);
  return c.json(result);
});

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

contextRoutes.post("/internal/summarize", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  await markHostedPayment(c, "summarize", "/internal/summarize");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.summarize(request);
  await complete(c, "/internal/summarize", request, JSON.stringify(result));
  await service.emitCompleted(request, "summarization.completed", result);
  return c.json(result);
});

contextRoutes.post("/internal/compress-context", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  await markHostedPayment(c, "compress-context", "/internal/compress-context");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.compress(request);
  await complete(c, "/internal/compress-context", request, JSON.stringify(result));
  await service.emitCompleted(request, "context.compressed", result);
  return c.json(result);
});

contextRoutes.post("/internal/handoff", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  await markHostedPayment(c, "handoff", "/internal/handoff");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.handoff(request);
  await complete(c, "/internal/handoff", request, JSON.stringify(result));
  await service.emitCompleted(request, "handoff.generated", result);
  return c.json(result);
});

contextRoutes.post("/internal/extract-profile", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  await markHostedPayment(c, "extract-profile", "/internal/extract-profile");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.profile(request);
  await complete(c, "/internal/extract-profile", request, JSON.stringify(result));
  await service.emitCompleted(request, "profile.extracted", result);
  return c.json(result);
});

contextRoutes.post("/internal/memory-enrichment", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = { ...c.req.valid("json"), messages: sanitizeMessages(c.req.valid("json").messages) };
  await markHostedPayment(c, "memory-enrichment", "/internal/memory-enrichment");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.memoryEnrichment(request);
  await complete(c, "/internal/memory-enrichment", request, JSON.stringify(result));
  return c.json(result);
});

async function markHostedPayment(c: Context<AppBindings>, endpoint: keyof typeof endpointPricing, route: string) {
  if (c.req.header("x-contextkit-x402-hosted") !== "bankr") return;

  const amountUsd = endpointPricing[endpoint];
  const paymentId = c.req.header("x-contextkit-x402-payment-id") ?? createId("hosted_pay");
  const payment = {
    route,
    amountUsd,
    paymentId,
    payer: "bankr-hosted"
  };

  c.set("payment", payment);
  await new PaymentService(c.env ?? {}).recordPayment({
    ...payment,
    requestId: c.get("requestId"),
    facilitatorResponse: {
      provider: "bankr-hosted",
      service: c.req.header("x-contextkit-x402-service") ?? endpoint,
      source: "x402.bankr.bot"
    }
  });
}

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
    ownerId: apiKey?.ownerId,
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
