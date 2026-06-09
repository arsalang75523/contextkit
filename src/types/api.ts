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

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  name: z.string().min(1).max(80),
  company: z.string().min(1).max(120).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(24),
  password: z.string().min(12).max(128)
});

export const verifyEmailSchema = z.object({
  token: z.string().min(24)
});

export const revokeApiKeySchema = z.object({
  keyId: z.string().min(1)
});

export const tokenEstimateSchema = z.object({
  input: z.union([z.string(), z.array(messageSchema)]),
  compressed: z.string().optional(),
  modelFamily: z.enum(["openai", "claude", "gemini"]).default("openai")
});

export const playgroundRunSchema = z.object({
  endpoint: z.enum(["summarize", "compress-context", "handoff", "extract-profile"]).default("summarize"),
  messages: z.array(messageSchema).min(1).max(50)
});

export const demoRunSchema = z.object({
  messages: z.array(messageSchema).min(1).max(80)
});

export const webhookReplaySchema = z.object({
  eventId: z.string().min(1),
  url: z.string().url().optional()
});

export type ConversationRequest = z.infer<typeof conversationRequestSchema>;
export type ConversationMessage = z.infer<typeof messageSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type PlaygroundRunInput = z.infer<typeof playgroundRunSchema>;

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
  keyDecisions: string[];
  actionItems: string[];
  openQuestions: string[];
  risks: string[];
  confidence: number;
};

export type CompressContextResponse = {
  compressedContext: string;
  estimatedSavings: string;
  micro: string;
  compact: string;
  extended: string;
  prioritizedFacts: Array<{
    fact: string;
    importance: number;
  }>;
  entities: {
    project: string;
    people: string[];
    stack: string[];
    deadlines: string[];
    constraints: string[];
  };
  conflicts: Array<{
    current: string;
    superseded: string[];
  }>;
  metrics: {
    originalTokens: number;
    compressedTokens: number;
    actualReductionPercent: number;
    factRetentionScore: number;
  };
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
  projectSummary: string;
  currentState: string;
  completedWork: string[];
  inProgress: string[];
  pendingTasks: string[];
  knownIssues: string[];
  failedApproaches: Array<{
    attempt: string;
    result: string;
    decision: string;
  }>;
  importantDecisions: Array<{
    decision: string;
    reason: string;
  }>;
  blockers: string[];
  agentNotes: string[];
  confidence: number;
};

export type ProfileResponse = {
  interests: string[];
  riskTolerance: string;
  communicationStyle: string;
  preferences: string[];
  importantContext: string[];
  identity: {
    profession?: string;
    location?: string;
    age?: number | null;
  };
  skills: string[];
  goals: string[];
  futurePlans: string[];
  behaviorPatterns: string[];
  dislikes: string[];
  careerStage: string;
  managementIntent: boolean;
  entrepreneurial: boolean;
  confidence: number;
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
