import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  conversationRequestSchema,
  createApiKeySchema,
  revokeApiKeySchema,
  tokenEstimateSchema,
  webhookRegistrationSchema,
  webhookReplaySchema
} from "@/types/api";
import { endpointPricing } from "@/lib/pricing";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "ContextKit API key"
});

registry.registerComponent("securitySchemes", "X402Payment", {
  type: "apiKey",
  in: "header",
  name: "X-Payment",
  description: "x402 payment payload returned from a prior HTTP 402 response."
});

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional()
  })
});

const summarizeResponse = z.object({
  summary: z.string(),
  tokenReductionEstimate: z.number()
});

const compressResponse = z.object({
  compressedContext: z.string(),
  estimatedSavings: z.string(),
  quality: z.object({
    duplicateDensity: z.number(),
    contextScore: z.number(),
    semanticSimilarity: z.number(),
    retainedFactsCount: z.number()
  })
});

const handoffResponse = z.object({
  goal: z.string(),
  importantFacts: z.array(z.string()),
  constraints: z.array(z.string()),
  recommendedNextActions: z.array(z.string()),
  tone: z.string(),
  userIntent: z.string()
});

const profileResponse = z.object({
  interests: z.array(z.string()),
  riskTolerance: z.string(),
  communicationStyle: z.string(),
  preferences: z.array(z.string()),
  importantContext: z.array(z.string())
});

const routes = [
  ["/api/summarize", "Summarize context", summarizeResponse, endpointPricing.summarize],
  ["/api/compress-context", "Compress context", compressResponse, endpointPricing["compress-context"]],
  ["/api/handoff", "Create agent handoff", handoffResponse, endpointPricing.handoff],
  ["/api/extract-profile", "Extract user profile", profileResponse, endpointPricing["extract-profile"]]
] as const;

routes.forEach(([path, summary, responseSchema, price]) => {
  registry.registerPath({
    method: "post",
    path,
    summary,
    description: `Requires Bearer API key with context:write scope and x402 payment of $${price.toFixed(3)}.`,
    security: [{ ApiKeyAuth: [], X402Payment: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: conversationRequestSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Successful context operation.",
        content: { "application/json": { schema: responseSchema } }
      },
      401: response("Invalid API key.", errorSchema),
      402: response("x402 payment required or verification failed.", errorSchema),
      422: response("Validation failed.", errorSchema)
    }
  });
});

registry.registerPath({
  method: "post",
  path: "/api/auth/create-key",
  summary: "Create an API key",
  description: "Requires admin bearer token. Returns the full key once only.",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: createApiKeySchema } } } },
  responses: {
    201: response("API key created.", z.object({ key: z.string(), apiKey: z.record(z.unknown()) })),
    401: response("Unauthorized.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/auth/revoke-key",
  summary: "Revoke an API key",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: revokeApiKeySchema } } } },
  responses: { 200: response("Revocation result.", z.object({ revoked: z.boolean() })) }
});

registry.registerPath({
  method: "get",
  path: "/api/analytics/overview",
  summary: "Get real aggregated analytics",
  security: [{ ApiKeyAuth: [] }],
  responses: { 200: response("Analytics overview.", z.record(z.unknown())) }
});

registry.registerPath({
  method: "post",
  path: "/api/tokens/estimate",
  summary: "Estimate token counts and reduction",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: tokenEstimateSchema } } } },
  responses: { 200: response("Token estimate.", z.object({ inputTokens: z.number(), compressedTokens: z.number(), reductionPercent: z.number() })) }
});

registry.registerPath({
  method: "post",
  path: "/api/webhooks/register",
  summary: "Register webhook endpoint",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: webhookRegistrationSchema } } } },
  responses: { 201: response("Webhook registered.", z.object({ id: z.string(), secret: z.string(), status: z.string() })) }
});

registry.registerPath({
  method: "post",
  path: "/api/webhooks/replay",
  summary: "Replay a webhook event",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: webhookReplaySchema } } } },
  responses: { 200: response("Webhook replay queued.", z.object({ replayed: z.boolean(), eventId: z.string() })) }
});

export function createOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "ContextKit API",
      version: "0.1.0",
      description: "Context Infrastructure for AI Agents. Bankr-native context compression, handoff, and profile APIs with x402 payments."
    },
    servers: [{ url: "https://contextkit.dev" }, { url: "http://localhost:3000" }],
    tags: [
      { name: "Context" },
      { name: "Authentication" },
      { name: "Analytics" },
      { name: "Tokens" },
      { name: "Webhooks" }
    ],
    externalDocs: {
      description: "ContextKit developer documentation",
      url: "https://contextkit.dev/docs"
    }
  });
}

function response(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: {
      "application/json": {
        schema
      }
    }
  };
}
