import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  conversationRequestSchema,
  createApiKeySchema,
  loginSchema,
  revokeApiKeySchema,
  signupSchema,
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
  tokenReductionEstimate: z.number(),
  keyDecisions: z.array(z.string()),
  actionItems: z.array(z.string()),
  openQuestions: z.array(z.string()),
  risks: z.array(z.string()),
  confidence: z.number()
});

const compressResponse = z.object({
  compressedContext: z.string(),
  estimatedSavings: z.string(),
  micro: z.string(),
  compact: z.string(),
  extended: z.string(),
  prioritizedFacts: z.array(z.object({ fact: z.string(), importance: z.number() })),
  entities: z.object({
    project: z.string(),
    people: z.array(z.string()),
    stack: z.array(z.string()),
    deadlines: z.array(z.string()),
    constraints: z.array(z.string()),
    projects: z.array(z.string()),
    organizations: z.array(z.string()),
    technologies: z.array(z.string()),
    services: z.array(z.string())
  }),
  conflicts: z.array(z.object({ current: z.string(), superseded: z.array(z.string()) })),
  supersededFacts: z.array(z.object({ current: z.string(), superseded: z.array(z.string()) })),
  inputTokens: z.number(),
  outputTokens: z.number(),
  actualReductionPercent: z.number(),
  factRetentionScore: z.number(),
  criticalFactsRetained: z.number(),
  metrics: z.object({
    originalTokens: z.number(),
    compressedTokens: z.number(),
    actualReductionPercent: z.number(),
    factRetentionScore: z.number()
  }),
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
  userIntent: z.string(),
  projectSummary: z.string(),
  currentState: z.string(),
  completedWork: z.array(z.string()),
  inProgress: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  knownIssues: z.array(z.string()),
  failedApproaches: z.array(z.object({ attempt: z.string(), result: z.string(), decision: z.string() })),
  importantDecisions: z.array(z.object({ decision: z.string(), reason: z.string() })),
  blockers: z.array(z.string()),
  agentNotes: z.array(z.string()),
  priorityOrder: z.array(z.string()),
  recommendedStartingPoint: z.string(),
  highestRiskArea: z.string(),
  repositories: z.array(z.string()),
  artifacts: z.array(z.string()),
  links: z.array(z.string()),
  owners: z.array(z.string()),
  confidence: z.number()
});

const profileResponse = z.object({
  interests: z.array(z.string()),
  riskTolerance: z.string(),
  communicationStyle: z.string(),
  preferences: z.array(z.string()),
  importantContext: z.array(z.string()),
  identity: z.object({
    profession: z.string().optional(),
    location: z.string().optional(),
    age: z.number().nullable().optional()
  }),
  skills: z.array(z.string()),
  goals: z.array(z.string()),
  futurePlans: z.array(z.string()),
  behaviorPatterns: z.array(z.string()),
  dislikes: z.array(z.string()),
  careerStage: z.string(),
  managementIntent: z.boolean(),
  entrepreneurial: z.boolean(),
  inferredTraits: z.array(z.string()),
  memoryImportance: z.number(),
  confidence: z.number()
});

const memoryEnrichmentResponse = z.object({
  stablePreferences: z.array(z.string()),
  evolvingPreferences: z.array(z.string()),
  longTermGoals: z.array(z.string()),
  supersededMemories: z.array(z.string()),
  memoryConflicts: z.array(z.object({ current: z.string(), superseded: z.array(z.string()) })),
  confidence: z.number()
});

const routes = [
  ["/api/summarize", "Summarize context", summarizeResponse, endpointPricing.summarize],
  ["/api/compress-context", "Compress context", compressResponse, endpointPricing["compress-context"]],
  ["/api/handoff", "Create agent handoff", handoffResponse, endpointPricing.handoff],
  ["/api/extract-profile", "Extract user profile", profileResponse, endpointPricing["extract-profile"]],
  ["/api/memory-enrichment", "Enrich long-term memory", memoryEnrichmentResponse, endpointPricing["memory-enrichment"]]
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
  path: "/api/dashboard/signup",
  summary: "Create a self-serve dashboard account",
  request: { body: { content: { "application/json": { schema: signupSchema } } } },
  responses: {
    201: response("Account and first API key created.", z.object({ account: z.record(z.unknown()), key: z.string(), apiKey: z.record(z.unknown()) })),
    409: response("Account already exists.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/login",
  summary: "Login to dashboard",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: response("Dashboard session created.", z.object({ ok: z.boolean(), account: z.record(z.unknown()) })),
    401: response("Invalid login.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/create-key",
  summary: "Create an API key for the current dashboard account",
  request: { body: { content: { "application/json": { schema: createApiKeySchema } } } },
  responses: {
    201: response("API key created.", z.object({ key: z.string(), apiKey: z.record(z.unknown()) })),
    401: response("Dashboard session required.", errorSchema)
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
