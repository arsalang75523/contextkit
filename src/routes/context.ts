import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import {
  contextUploadSchema,
  conversationRequestSchema,
  experienceBuySchema,
  experiencePublishSchema,
  experienceSaveSchema,
  experienceSearchSchema
} from "@/types/api";
import { sanitizeMessages } from "@/utils/sanitize";
import { estimateTokens } from "@/utils/tokens";
import { ContextService } from "@/services/context-service";
import { ExperienceService } from "@/services/experience-service";
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
import type {
  CompressContextResponse,
  ExperienceBuyInput,
  ExperiencePublishInput,
  ExperienceSaveInput,
  ContextEndpoint,
  ConversationMessage,
  ConversationRequest,
  ConversationRequestInput,
  HandoffResponse,
  MemoryEnrichmentResponse,
  ProfileResponse,
  SummarizeResponse
} from "@/types/api";

export const contextRoutes = new Hono<AppBindings>();

type CachedResults = Record<string, unknown>;
type ResolvedConversationRequest = ConversationRequest & { messages: ConversationMessage[]; cachedResults?: CachedResults };
type StoredContext = {
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
  results?: CachedResults;
  createdAt: string;
  expiresAt: string;
};

contextRoutes.post("/context/upload-text", async (c) => {
  const text = (await c.req.text()).trim();
  if (!text) {
    throw new HTTPException(422, { message: "Text body is required." });
  }

  const endpoint = parseContextEndpoint(c.req.query("endpoint") ?? "summarize");
  const mode = parseSummaryMode(c.req.query("mode"));
  return createUploadedContext(c, {
    messages: [{ role: "user", content: text }],
    precompute: { endpoint, mode },
    ttlSeconds: 3600
  });
});

contextRoutes.post("/context/upload", zValidator("json", contextUploadSchema), async (c) => {
  return createUploadedContext(c, c.req.valid("json"));
});

async function createUploadedContext(
  c: Context<AppBindings>,
  body: {
    messages: ConversationMessage[];
    metadata?: Record<string, unknown>;
    precompute?: {
      endpoint: ContextEndpoint;
      mode?: ConversationRequestInput["mode"];
    };
    ttlSeconds: number;
  }
) {
  const contextId = createId("ctx");
  const ttlSeconds = body.ttlSeconds;
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);
  const messages = sanitizeMessages(body.messages);
  const results: CachedResults = {};

  if (body.precompute) {
    const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
    const precomputeEndpoint = profileModeEndpoint(body.precompute.endpoint, body.precompute.mode);
    const precomputeRequest = {
      messages,
      metadata: body.metadata,
      mode: body.precompute.mode
    } satisfies ResolvedConversationRequest;
    results[resultCacheKey(precomputeEndpoint, body.precompute.mode)] = await generateEndpointResult(
      service,
      precomputeEndpoint,
      precomputeRequest
    );
  }

  await new AppKV(c.env?.CONTEXTKIT_KV).set(
    `context:${contextId}`,
    {
      messages,
      metadata: body.metadata,
      results,
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
      inputTokens: estimateTokens(messages),
      precomputed: body.precompute ? {
        endpoint: body.precompute.endpoint,
        mode: body.precompute.mode ?? null
      } : null
    },
    201
  );
}

contextRoutes.post("/summarize", requireApiKey("context:write"), apiKeyRateLimit(), apiCreditOrX402PaymentRequired("summarize"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<SummarizeResponse>(request, "summarize") ?? await service.summarize(request);
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
    const result = cachedResult<CompressContextResponse>(request, "compress-context") ?? await service.compress(request);
    await complete(c, "/compress-context", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "context.compressed", result);
    return c.json(result);
  }
);

contextRoutes.post("/handoff", requireApiKey("context:write"), apiKeyRateLimit(), apiCreditOrX402PaymentRequired("handoff"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<HandoffResponse>(request, "handoff") ?? await service.handoff(request);
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
    const { result, eventType } = await runProfileMode(service, request);
    await complete(c, "/extract-profile", request, JSON.stringify(result), c.get("payment")?.paymentId);
    if (eventType) await service.emitCompleted(request, eventType, result);
    return c.json(result);
  }
);

contextRoutes.post("/memory-enrichment", requireApiKey("context:write"), apiKeyRateLimit(), apiCreditOrX402PaymentRequired("memory-enrichment"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<MemoryEnrichmentResponse>(request, "memory-enrichment") ?? await service.memoryEnrichment(request);
  await complete(c, "/memory-enrichment", request, JSON.stringify(result), c.get("payment")?.paymentId);
  return c.json(result);
});

contextRoutes.post(
  "/experience/save",
  requireApiKey("context:write"),
  apiKeyRateLimit(),
  apiCreditOrX402PaymentRequired("experience-save"),
  zValidator("json", experienceSaveSchema),
  async (c) => {
    const body = c.req.valid("json");
    const context = await resolveExperienceContext(c, body);
    const result = await new ExperienceService(c.env ?? {}).save(body, context);
    await completeOperation(c, "/experience/save", body, JSON.stringify(result), c.get("payment")?.paymentId);
    return c.json(result, 201);
  }
);

contextRoutes.post(
  "/experience/publish",
  requireApiKey("context:write"),
  apiKeyRateLimit(),
  apiCreditOrX402PaymentRequired("experience-publish"),
  zValidator("json", experiencePublishSchema),
  async (c) => {
    const body = c.req.valid("json");
    const context = await resolveExperienceContext(c, body);
    const result = await new ExperienceService(c.env ?? {}).publish(body, context);
    await completeOperation(c, "/experience/publish", body, JSON.stringify(result), c.get("payment")?.paymentId);
    return c.json(result, 201);
  }
);

contextRoutes.post(
  "/experience/search",
  requireApiKey("context:write"),
  apiKeyRateLimit(),
  apiCreditOrX402PaymentRequired("experience-search"),
  zValidator("json", experienceSearchSchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await new ExperienceService(c.env ?? {}).search(body, accountOwnerId(c));
    await completeOperation(c, "/experience/search", body, JSON.stringify(result), c.get("payment")?.paymentId);
    return c.json(result);
  }
);

contextRoutes.post(
  "/experience/buy",
  requireApiKey("context:write"),
  apiKeyRateLimit(),
  apiCreditOrX402PaymentRequired("experience-buy"),
  zValidator("json", experienceBuySchema),
  async (c) => {
    const body = c.req.valid("json");
    const result = await runExperienceBuy(c, body);
    await completeOperation(c, "/experience/buy", body, JSON.stringify(result), c.get("payment")?.paymentId);
    return c.json(result);
  }
);

contextRoutes.post("/x402/memory-enrichment", x402PaymentRequired("memory-enrichment"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<MemoryEnrichmentResponse>(request, "memory-enrichment") ?? await service.memoryEnrichment(request);
  await complete(c, "/x402/memory-enrichment", request, JSON.stringify(result), c.get("payment")?.paymentId);
  return c.json(result);
});

contextRoutes.post("/x402/summarize", x402PaymentRequired("summarize"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<SummarizeResponse>(request, "summarize") ?? await service.summarize(request);
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
    const result = cachedResult<CompressContextResponse>(request, "compress-context") ?? await service.compress(request);
    await complete(c, "/x402/compress-context", request, JSON.stringify(result), c.get("payment")?.paymentId);
    await service.emitCompleted(request, "context.compressed", result);
    return c.json(result);
  }
);

contextRoutes.post("/x402/handoff", x402PaymentRequired("handoff"), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<HandoffResponse>(request, "handoff") ?? await service.handoff(request);
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
    const { result, eventType } = await runProfileMode(service, request);
    await complete(c, "/x402/extract-profile", request, JSON.stringify(result), c.get("payment")?.paymentId);
    if (eventType) await service.emitCompleted(request, eventType, result);
    return c.json(result);
  }
);

contextRoutes.post("/internal/summarize", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "summarize", "/internal/summarize");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<SummarizeResponse>(request, "summarize") ?? await service.summarize(request);
  await complete(c, "/internal/summarize", request, JSON.stringify(result));
  await service.emitCompleted(request, "summarization.completed", result);
  return c.json(result);
});

contextRoutes.post("/internal/compress-context", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "compress-context", "/internal/compress-context");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<CompressContextResponse>(request, "compress-context") ?? await service.compress(request);
  await complete(c, "/internal/compress-context", request, JSON.stringify(result));
  await service.emitCompleted(request, "context.compressed", result);
  return c.json(result);
});

contextRoutes.post("/internal/handoff", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "handoff", "/internal/handoff");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<HandoffResponse>(request, "handoff") ?? await service.handoff(request);
  await complete(c, "/internal/handoff", request, JSON.stringify(result));
  await service.emitCompleted(request, "handoff.generated", result);
  return c.json(result);
});

contextRoutes.post("/internal/extract-profile", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "extract-profile", "/internal/extract-profile");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const { result, eventType } = await runProfileMode(service, request);
  await complete(c, "/internal/extract-profile", request, JSON.stringify(result));
  if (eventType) await service.emitCompleted(request, eventType, result);
  return c.json(result);
});

contextRoutes.post("/internal/memory-enrichment", requireInternalToken(), zValidator("json", conversationRequestSchema), async (c) => {
  const request = await resolveConversationRequest(c, c.req.valid("json"));
  await markHostedPayment(c, "memory-enrichment", "/internal/memory-enrichment");
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = cachedResult<MemoryEnrichmentResponse>(request, "memory-enrichment") ?? await service.memoryEnrichment(request);
  await complete(c, "/internal/memory-enrichment", request, JSON.stringify(result));
  return c.json(result);
});

contextRoutes.post("/internal/experience/save", requireInternalToken(), zValidator("json", experienceSaveSchema), async (c) => {
  const body = c.req.valid("json");
  await markHostedPayment(c, "experience-save", "/internal/experience/save");
  const context = await resolveExperienceContext(c, body);
  const result = await new ExperienceService(c.env ?? {}).save(body, context);
  await completeOperation(c, "/internal/experience/save", body, JSON.stringify(result));
  return c.json(result, 201);
});

contextRoutes.post("/internal/experience/publish", requireInternalToken(), zValidator("json", experiencePublishSchema), async (c) => {
  const body = c.req.valid("json");
  await markHostedPayment(c, "experience-publish", "/internal/experience/publish");
  const context = await resolveExperienceContext(c, body);
  const result = await new ExperienceService(c.env ?? {}).publish(body, context);
  await completeOperation(c, "/internal/experience/publish", body, JSON.stringify(result));
  return c.json(result, 201);
});

contextRoutes.post("/internal/experience/search", requireInternalToken(), zValidator("json", experienceSearchSchema), async (c) => {
  const body = c.req.valid("json");
  await markHostedPayment(c, "experience-search", "/internal/experience/search");
  const result = await new ExperienceService(c.env ?? {}).search(body, accountOwnerId(c));
  await completeOperation(c, "/internal/experience/search", body, JSON.stringify(result));
  return c.json(result);
});

contextRoutes.post("/internal/experience/buy", requireInternalToken(), zValidator("json", experienceBuySchema), async (c) => {
  const body = c.req.valid("json");
  await markHostedPayment(c, "experience-buy", "/internal/experience/buy");
  const result = await runExperienceBuy(c, body);
  await completeOperation(c, "/internal/experience/buy", body, JSON.stringify(result));
  return c.json(result);
});

async function resolveExperienceContext(
  c: Context<AppBindings>,
  body: ExperienceSaveInput | ExperiencePublishInput
) {
  const ownerId = accountOwnerId(c) ?? body.creatorId ?? "bankr-hosted";
  if (!body.contextId) {
    return {
      ownerId,
      messages: body.messages ? sanitizeMessages(body.messages) : undefined
    };
  }

  const stored = await new AppKV(c.env?.CONTEXTKIT_KV).get<StoredContext>(`context:${body.contextId}`);
  if (!stored) {
    throw new HTTPException(404, { message: "Context upload was not found or has expired." });
  }

  return {
    ownerId,
    messages: sanitizeMessages(body.messages ?? stored.messages),
    contextMetadata: stored.metadata
  };
}

async function runExperienceBuy(c: Context<AppBindings>, body: ExperienceBuyInput) {
  try {
    const buyerId = accountOwnerId(c) ?? body.buyerId ?? "bankr-buyer";
    const amountUsd = c.get("payment")?.amountUsd ?? c.get("creditCharge")?.amountUsd ?? endpointPricing["experience-buy"];
    return await new ExperienceService(c.env ?? {}).buy(body, buyerId, amountUsd);
  } catch (error) {
    if (error instanceof Error && error.message === "experience_not_found") {
      throw new HTTPException(404, { message: "Experience record was not found or is not published." });
    }
    throw error;
  }
}

function accountOwnerId(c: Context<AppBindings>) {
  const apiKey = c.get("apiKey");
  return apiKey?.ownerId ?? (apiKey ? `api-key:${apiKey.id}` : undefined);
}

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
    messages: sanitizeMessages(body.messages ?? stored.messages),
    cachedResults: stored.results
  };
}

function resultCacheKey(endpoint: ContextEndpoint, mode?: ConversationRequestInput["mode"]) {
  return endpoint === "summarize" ? `${endpoint}:${mode ?? "compact"}` : endpoint;
}

function profileModeEndpoint(endpoint: ContextEndpoint, mode?: ConversationRequestInput["mode"]): ContextEndpoint {
  return endpoint === "extract-profile" && mode === "memory-enrichment" ? "memory-enrichment" : endpoint;
}

function cachedResult<T>(request: ResolvedConversationRequest, endpoint: ContextEndpoint): T | undefined {
  return request.cachedResults?.[resultCacheKey(endpoint, request.mode)] as T | undefined;
}

async function runProfileMode(service: ContextService, request: ResolvedConversationRequest) {
  if (request.mode === "memory-enrichment") {
    const result = cachedResult<MemoryEnrichmentResponse>(request, "memory-enrichment") ?? await service.memoryEnrichment(request);
    return { result, eventType: undefined };
  }

  const result = cachedResult<ProfileResponse>(request, "extract-profile") ?? await service.profile(request);
  return { result, eventType: "profile.extracted" as const };
}

function parseContextEndpoint(value: string): ContextEndpoint {
  const endpoints: ContextEndpoint[] = ["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"];
  if (endpoints.includes(value as ContextEndpoint)) return value as ContextEndpoint;
  throw new HTTPException(422, { message: "Invalid endpoint query parameter." });
}

function parseSummaryMode(value?: string): ConversationRequestInput["mode"] {
  if (!value) return undefined;
  const modes: Array<NonNullable<ConversationRequestInput["mode"]>> = ["micro", "compact", "extended", "debug", "extract-profile", "memory-enrichment"];
  if (modes.includes(value as NonNullable<ConversationRequestInput["mode"]>)) {
    return value as ConversationRequestInput["mode"];
  }
  throw new HTTPException(422, { message: "Invalid mode query parameter." });
}

async function generateEndpointResult(
  service: ContextService,
  endpoint: ContextEndpoint,
  request: ResolvedConversationRequest
) {
  if (endpoint === "summarize") return service.summarize(request);
  if (endpoint === "compress-context") return service.compress(request);
  if (endpoint === "handoff") return service.handoff(request);
  if (endpoint === "extract-profile") return service.profile(request);
  return service.memoryEnrichment(request);
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

async function completeOperation(
  c: Context<AppBindings>,
  route: string,
  input: unknown,
  output: string,
  paymentId?: string
) {
  const requestId = c.get("requestId");
  const payment = c.get("payment");
  const creditCharge = c.get("creditCharge");
  const apiKey = c.get("apiKey");
  const ownerId = accountOwnerId(c);

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
    inputTokens: estimateTokens(JSON.stringify(input)),
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
}
