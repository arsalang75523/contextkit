import { z } from "zod";

export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1).max(50_000)
});

export const contextIdSchema = z.string().regex(/^ctx_[a-f0-9]{24}$/);

export const conversationRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200).optional(),
  contextId: contextIdSchema.optional(),
  mode: z.enum(["micro", "compact", "extended", "debug"]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  webhookUrl: z.string().url().optional()
}).refine((value) => Boolean(value.contextId) || Boolean(value.messages?.length), {
  message: "Provide either messages or contextId."
});

export const contextUploadSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  metadata: z.record(z.string(), z.unknown()).optional(),
  precompute: z.object({
    endpoint: z.enum(["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"]),
    mode: z.enum(["micro", "compact", "extended", "debug"]).optional()
  }).optional(),
  ttlSeconds: z.number().int().min(300).max(86_400).default(3600)
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
  token: z.string().min(24).optional(),
  email: z.string().email().optional(),
  code: z.string().regex(/^\d{6}$/).optional()
}).refine((value) => Boolean(value.token) || Boolean(value.email && value.code), {
  message: "Provide either token or email + 6-digit code."
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
  endpoint: z.enum(["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"]).default("summarize"),
  mode: z.enum(["micro", "compact", "extended", "debug"]).optional(),
  messages: z.array(messageSchema).min(1).max(50)
});

export const demoRunSchema = z.object({
  messages: z.array(messageSchema).min(1).max(80)
});

export const webhookReplaySchema = z.object({
  eventId: z.string().min(1),
  url: z.string().url().optional()
});

export type ConversationMessage = z.infer<typeof messageSchema>;
export type ConversationRequestInput = z.infer<typeof conversationRequestSchema>;
export type ConversationRequest = Omit<ConversationRequestInput, "messages"> & { messages: ConversationMessage[] };
export type ContextUploadInput = z.infer<typeof contextUploadSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type PlaygroundRunInput = z.infer<typeof playgroundRunSchema>;

export type ContextEndpoint = "summarize" | "compress-context" | "handoff" | "extract-profile" | "memory-enrichment";

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

export type SummarizeResponse = {
  mode: "micro" | "compact" | "extended" | "debug";
  summary?: string;
  micro?: string;
  compact?: string;
  extended?: string;
  state: {
    goal: string;
    status: string;
    blockers: string[];
    next: string[];
  };
  keyDecisions?: string[];
  actionItems?: string[];
  openQuestions?: string[];
  risks?: string[];
  metrics: {
    inputTokens: number;
    compactTokens: number;
    stateTokens: number;
    totalOutputTokens: number;
    reductionPercent: number;
    latencyMs: number;
  };
  confidence?: number;
};

export type CompressContextResponse = {
  compressedContext: string;
  state: {
    goals: string[];
    status: string[];
    activeProblems: string[];
    constraints: string[];
    decisions: string[];
    nextSteps: string[];
  };
  entities: {
    people: string[];
    projects: string[];
    technologies: string[];
    organizations: string[];
    deadlines: string[];
  };
  conflicts?: Array<{
    old: string;
    new: string;
  }>;
  metrics: {
    inputTokens: number;
    compressedTokens: number;
    reductionPercent: number;
  };
};

export type HandoffResponse = {
  project: {
    name: string;
    goal: string;
    currentState: string;
  };
  completed: string[];
  inProgress: string[];
  pending: string[];
  blockers: string[];
  failedApproaches: Array<{
    attempt: string;
    result: string;
    lesson: string;
  }>;
  decisions: Array<{
    decision: string;
    reason: string;
  }>;
  priorities: string[];
  criticalContext: {
    mustKnow: string[];
    mustNotDo: string[];
    biggestRisk: string;
    successMetric: string;
  };
  startHere: string;
  agentNotes: string[];
};

export type ProfileResponse = {
  mode: "micro" | "compact" | "full";
  micro: {
    identity: {
      profession?: string;
      location?: string;
      age?: number | null;
    };
    preferences: string[];
    goals: string[];
  };
  compact: {
    identity: {
      profession?: string;
      location?: string;
      age?: number | null;
    };
    skills: string[];
    interests: string[];
    preferences: string[];
    goals: string[];
    traits: string[];
  };
  full: {
    identity: {
      profession?: string;
      location?: string;
      age?: number | null;
    };
    skills: string[];
    interests: string[];
    stablePreferences: string[];
    currentGoals: string[];
    futurePlans: string[];
    inferredTraits: string[];
    stableMemories: string[];
    evolvingMemories: string[];
  };
  memoryFacts: Array<{
    fact: string;
    category: string;
    stability: "stable" | "evolving";
    confidence: number;
  }>;
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
  inferredTraits: string[];
  memoryImportance: number;
  stableMemories: string[];
  evolvingMemories: string[];
  deprecatedMemories: string[];
  confidence: number;
};

export type MemoryEnrichmentResponse = {
  activeMemories: Array<{
    fact: string;
    category: string;
    stability: "stable";
    confidence: number;
  }>;
  evolvingMemories: Array<{
    fact: string;
    category: string;
    stability: "evolving";
    confidence: number;
  }>;
  conflicts: Array<{
    old: string;
    new: string;
    reason: string;
  }>;
  stablePreferences: string[];
  evolvingPreferences: string[];
  longTermGoals: string[];
  supersededMemories: string[];
  memoryConflicts: Array<{
    current: string;
    superseded: string[];
  }>;
  stableMemories: string[];
  legacyEvolvingMemories?: string[];
  deprecatedMemories: string[];
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
