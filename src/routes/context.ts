import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { contextUploadSchema, conversationRequestSchema } from "@/types/api";
import { sanitizeMessages } from "@/utils/sanitize";
import { estimateTokens } from "@/utils/tokens";
import { ContextService } from "@/services/context-service";
import { AnalyticsService } from "@/services/analytics-service";
import { ApiKeyService } from "@/services/api-key-service";
import { CreditService } from "@/services/credit-service";
import { PaymentService } from "@/services/payment-service";
import { AppKV } from "@/storage/app-kv";
import { x402PaymentRequired } from "@/middleware/x402";
import { requireApiKey, requireInternalToken } from "@/middleware/auth";
import { apiKeyRateLimit } from "@/middleware/rate-limit";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { createId } from "@/utils/id";
import { endpointPricing } from "@/lib/pricing";
import type { AppBindings } from "@/types/bindings";
import type { ConversationMessage, ConversationRequest, ConversationRequestInput } from "@/types/api";

export const contextRoutes = new Hono<AppBindings>();

type ResolvedConversationRequest = ConversationRequest & { messages: ConversationMessage[] };
type StoredContext = {
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
};

contextRoutes.post("/context/upload", zValidator("json", contextUploadSchema), async (c) => {
  const body = c.req.valid("json");
  const contextId = createId("ctx");
  const ttlSeconds = body.ttlSeconds;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
  const messages = sanitizeMessages(body.messages);

  await new AppKV(c.env?.CONTEXTKIT_KV).set(
    `context:${contextId}`,
    {
      messages,
      metadata: body.metadata,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    } satisfies StoredContext,
    ttlSeconds
  );

  return c.json(
    {
      contextId,
      expiresAt: expiresAt.toISOString(),
      messageCount: messages.length,
      inputTokens: estimateTokens(messages)
    },
    201
  );
});

contextRoutes.post("/summarize", requireApiKey("context:write"), apiKeyRateLimit(), apiCreditOrX402PaymentRequired("summarize"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
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
  apiCreditOrX402PaymentRequired("compress-context"),
  zValidator("json", conversationRequestSchema),
  async (c) => {
    const request = await resolveConversationRequest(c, c.req.valid("json"));
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.compress(request);
    await complete(c, "/compress-context", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "context.compressed", result);
    return c.json(result);
  }
);

contextRoutes.post("/handoff", requireApiKey("context:write"), apiKeyRateLimit(), apiCreditOrX402PaymentRequired("handoff"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
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
  apiCreditOrX402PaymentRequired("extract-profile"),
  zValidator("json", conversationRequestSchema),
  async (c) => {
    const request = await resolveConversationRequest(c, c.req.valid("json"));
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.profile(request);
    await complete(c, "/extract-profile", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "profile.extracted", result);
    return c.json(result);
  }
);

contextRoutes.post("/memory-enrichment", requireApiKey("context:write"), apiKeyRateLimit(), apiCreditOrX402PaymentRequired("memory-enrichment"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.memoryEnrichment(request);
  await complete(c, "/memory-enrichment", request, JSON.stringify(result), c.get("payment")?.paymentId);
  return c.json(result);
});

contextRoutes.post("/x402/memory-enrichment", x402PaymentRequired("memory-enrichment"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.memoryEnrichment(request);
  await complete(c, "/x402/memory-enrichment", request, JSON.stringify(result), c.get("payment")?.paymentId);
  return c.json(result);
});

contextRoutes.post("/x402/summarize", x402PaymentRequired("summarize"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
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
    const request = await resolveConversationRequest(c, c.req.valid("json"));
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.compress(request);
    await complete(c, "/x402/compress-context", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "context.compressed", result);
    return c.json(result);
  }
);

contextRoutes.post("/x402/handoff", x402PaymentRequired("handoff"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
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
    const request = await resolveConversationRequest(c, c.req.valid("json"));
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const result = await service.profile(request);
    await complete(c, "/x402/extract-profile", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "profile.extracted", result);
    return c.json(result);
  }
);

contextRoutes.post("/internal/summarize", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "summarize", "/internal/summarize");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.summarize(request);
  await complete(c, "/internal/summarize", request, JSON.stringify(result));
  await service.emitCompleted(request, "summarization.completed", result);
  return c.json(result);
});

contextRoutes.post("/internal/compress-context", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "compress-context", "/internal/compress-context");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.compress(request);
  await complete(c, "/internal/compress-context", request, JSON.stringify(result));
  await service.emitCompleted(request, "context.compressed", result);
  return c.json(result);
});

contextRoutes.post("/internal/handoff", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "handoff", "/internal/handoff");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.handoff(request);
  await complete(c, "/internal/handoff", request, JSON.stringify(result));
  await service.emitCompleted(request, "handoff.generated", result);
  return c.json(result);
});

contextRoutes.post("/internal/extract-profile", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "extract-profile", "/internal/extract-profile");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.profile(request);
  await complete(c, "/internal/extract-profile", request, JSON.stringify(result));
  await service.emitCompleted(request, "profile.extracted", result);
  return c.json(result);
});

contextRoutes.post("/internal/memory-enrichment", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "memory-enrichment", "/internal/memory-enrichment");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await service.memoryEnrichment(request);
  await complete(c, "/internal/memory-enrichment", request, JSON.stringify(result));
  return c.json(result);
});

async function resolveConversationRequest(
  c: Context<AppBindings>,
  body: ConversationRequestInput
): Promise<ResolvedConversationRequest> {
  if (!body.contextId) {
    return { ...body, messages: sanitizeMessages(body.messages ?? []) };
  }

  const stored = await new AppKV(c.env?.CONTEXTKIT_KV).get<StoredContext>(`context:${body.contextId}`);
  if (!stored) {
    throw new HTTPException(404, { message: "Context upload was not found or has expired." });
  }

  return {
    ...stored,
    ...body,
    metadata: {
      ...(stored.metadata ?? {}),
      ...(body.metadata ?? {})
    },
    messages: sanitizeMessages(body.messages ?? stored.messages)
  };
}

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

function apiCreditOrX402PaymentRequired(endpoint: keyof typeof endpointPricing) {
  return async (c: Context<AppBindings>, next: () => Promise<void>) => {
    const apiKey = c.get("apiKey");
    if (apiKey) {
      const ownerId = apiKey.ownerId ?? `api-key:${apiKey.id}`;
      const amountUsd = endpointPricing[endpoint];
      const credits = new CreditService(c.env ?? {});
      if (await credits.canDebit(ownerId, amountUsd)) {
        c.set("creditCharge", {
          ownerId,
          apiKeyId: apiKey.id,
          route: `/${endpoint}`,
          amountUsd
        });
        await next();
        return;
      }
    }

    return x402PaymentRequired(endpoint)(c, next);
  };
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
  const creditCharge = c.get("creditCharge");
  const apiKey = c.get("apiKey");
  const ownerId = apiKey?.ownerId ?? (apiKey ? `api-key:${apiKey.id}` : undefined);
  if (creditCharge) {
    await new CreditService(c.env ?? {}).debit({
      ...creditCharge,
      requestId
    });
  }

  await new AnalyticsService(c.env ?? {}).recordRequest({
    requestId,
    route,
    latencyMs: Date.now() - c.get("startedAt"),
    inputTokens: estimateTokens(request.messages as ConversationMessage[]),
    outputTokens: estimateTokens(output),
    paymentId,
    apiKeyId: apiKey?.id,
    ownerId,
    amountUsd: payment?.amountUsd ?? creditCharge?.amountUsd,
    status: "success"
  });

  if (apiKey) {
    await new ApiKeyService(c.env ?? {}).recordUsage(apiKey.hash, route, payment?.amountUsd ?? creditCharge?.amountUsd ?? 0);
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
