import { z } from "zod";

export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1).max(50_000)
});

export const conversationRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).optional(),
  webhookUrl: z.string().url().optional()
});

export const webhookRegistrationSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(16).optional()
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  environment: z.enum(["test", "live"]).default("test"),
  scopes: z.array(z.enum(["context:write", "analytics:read", "webhooks:write", "keys:read"])).default(["context:write"])
});

export const revokeApiKeySchema = z.object({
  keyId: z.string().min(1)
});

export const tokenEstimateSchema = z.object({
  input: z.union([z.string(), z.array(messageSchema)]),
  compressed: z.string().optional(),
  modelFamily: z.enum(["openai", "claude", "gemini"]).default("openai")
});

export const webhookReplaySchema = z.object({
  eventId: z.string().min(1),
  url: z.string().url().optional()
});

export type ConversationRequest = z.infer<typeof conversationRequestSchema>;
export type ConversationMessage = z.infer<typeof messageSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export type ContextEndpoint = "summarize" | "compress-context" | "handoff" | "extract-profile";

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

export type SummarizeResponse = {
  summary: string;
  tokenReductionEstimate: number;
};

export type CompressContextResponse = {
  compressedContext: string;
  estimatedSavings: string;
  quality: {
    duplicateDensity: number;
    contextScore: number;
    semanticSimilarity: number;
    retainedFactsCount: number;
  };
};

export type HandoffResponse = {
  goal: string;
  importantFacts: string[];
  constraints: string[];
  recommendedNextActions: string[];
  tone: string;
  userIntent: string;
};

export type ProfileResponse = {
  interests: string[];
  riskTolerance: string;
  communicationStyle: string;
  preferences: string[];
  importantContext: string[];
};

export type WebhookEventName =
  | "payment.received"
  | "request.completed"
  | "summarization.completed"
  | "context.compressed"
  | "handoff.generated"
  | "profile.extracted";

export type WebhookEvent<T = unknown> = {
  id: string;
  type: WebhookEventName;
  createdAt: string;
  requestId: string;
  data: T;
};
