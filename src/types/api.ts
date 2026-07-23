import { z } from "zod";

export const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1).max(50_000)
});

export const contextIdSchema = z.string().regex(/^ctx_[a-f0-9]{24}$/);
export const operationModeSchema = z.enum(["micro", "compact", "extended", "debug", "extract-profile", "memory-enrichment"]);

export const conversationRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200).optional(),
  contextId: contextIdSchema.optional(),
  mode: operationModeSchema.optional(),
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
    mode: operationModeSchema.optional()
  }).optional(),
  ttlSeconds: z.number().int().min(300).max(86_400).default(3600)
});

const experienceTextListSchema = z.array(z.string().min(1).max(280)).max(20);

const skillTestCaseSchema = z.object({
  name: z.string().min(1).max(120),
  input: z.string().min(1).max(1_200),
  expectedOutcome: z.string().min(1).max(1_200),
  successCriteria: z.array(z.string().min(1).max(280)).min(1).max(10),
  testMethod: z.string().min(12).max(1_200),
  observedOutcome: z.string().min(12).max(1_200),
  evidenceType: z.enum(["command-output", "test-log", "http-response", "artifact", "assertion"]),
  evidenceExcerpt: z.string().min(12).max(1_200),
  passed: z.literal(true)
});

export const verifiedSkillSchema = z.object({
  name: z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(20).max(280),
  license: z.string().min(3).max(240),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("1.0.0"),
  ecosystem: z.enum(["bankr", "x402", "base", "mcp", "wallet", "defi", "automation", "llm-gateway", "agent-infrastructure"]),
  compatibility: z.array(z.string().min(1).max(48)).min(1).max(16),
  trigger: z.string().min(20).max(800),
  prerequisites: experienceTextListSchema,
  inputs: experienceTextListSchema,
  outputs: experienceTextListSchema,
  steps: z.array(z.string().min(1).max(800)).min(3).max(30),
  verification: experienceTextListSchema,
  failureHandling: experienceTextListSchema,
  doNotUseWhen: experienceTextListSchema,
  rollback: experienceTextListSchema,
  tags: z.array(z.string().min(1).max(48)).min(1).max(16),
  testCases: z.array(skillTestCaseSchema).min(1).max(12),
  evidence: z.object({
    userRequest: z.string().min(1).max(1_200),
    agentMethod: z.string().min(1).max(2_500),
    outcome: z.string().min(1).max(1_200),
    reusableLesson: z.string().min(1).max(1_200)
  }),
  skillMarkdown: z.string().min(100).max(100_000).optional()
});

export const experienceRecordSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  summary: z.string().min(1).max(1_200).optional(),
  content: z.string().min(1).max(40_000).optional(),
  task: z.string().min(1).max(800).optional(),
  outcome: z.string().min(1).max(1_200).optional(),
  lesson: z.string().min(1).max(2_500).optional(),
  constraints: experienceTextListSchema.optional(),
  decisions: experienceTextListSchema.optional(),
  tags: z.array(z.string().min(1).max(48)).max(16).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().min(1).max(160).optional(),
  skill: verifiedSkillSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const experienceWriteBaseSchema = z.object({
  mode: z.enum(["experience-save", "save"]).optional(),
  operation: z.enum(["experience-save", "save"]).optional(),
  action: z.enum(["experience-save", "save"]).optional(),
  experience: experienceRecordSchema.optional(),
  messages: z.array(messageSchema).min(1).max(200).optional(),
  contextId: contextIdSchema.optional(),
  title: z.string().min(1).max(160).optional(),
  content: z.string().min(1).max(40_000).optional(),
  tags: z.array(z.string().min(1).max(48)).max(16).optional(),
  creatorId: z.string().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const experienceSaveSchema = experienceWriteBaseSchema.refine((value) => hasExperienceContent(value) || Boolean(value.messages?.length || value.contextId || value.content), {
  message: "Provide non-empty experience content, messages, contextId, or content."
});

export const experiencePublishSchema = experienceWriteBaseSchema.extend({
  mode: z.enum(["skill-publish", "skill-repository-publish", "experience-publish", "publish"]).optional(),
  operation: z.enum(["skill-publish", "skill-repository-publish", "experience-publish", "publish"]).optional(),
  action: z.enum(["skill-publish", "skill-repository-publish", "experience-publish", "publish"]).optional(),
  experienceId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  skillId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  publishToken: z.string().regex(/^pub_[a-f0-9]{24}$/).optional(),
  userApproved: z.literal(true),
  priceUsd: z.literal(0.05).default(0.05),
  visibility: z.enum(["public"]).default("public")
}).refine((value) => Boolean(value.experienceId || value.skillId) || hasExperienceContent(value) || Boolean(value.messages?.length || value.contextId || value.content), {
  message: "Provide experienceId, non-empty experience content, messages, contextId, or content."
});

export const experienceSearchSchema = z.object({
  mode: z.enum(["skill-search", "skill-inspect"]).optional(),
  skillId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  query: z.string().max(800).optional(),
  tags: z.array(z.string().min(1).max(48)).max(16).optional(),
  ecosystems: z.array(z.enum(["bankr", "x402", "base", "mcp", "wallet", "defi", "automation", "llm-gateway", "agent-infrastructure"])).max(9).optional(),
  compatibility: z.array(z.string().min(1).max(48)).max(16).optional(),
  verifiedOnly: z.boolean().default(true),
  includePrivate: z.boolean().default(true),
  limit: z.number().int().min(1).max(20).default(10)
}).superRefine((value, ctx) => {
  if (value.mode === "skill-inspect" && !value.skillId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["skillId"], message: "skillId is required for skill-inspect." });
  }
});

export const experienceConsiderSchema = z.object({
  messages: z.array(messageSchema).min(2).max(200).optional(),
  contextId: contextIdSchema.optional(),
  minConfidence: z.number().min(0.5).max(0.95).default(0.72),
  autoSave: z.boolean().default(true),
  priceUsd: z.literal(0.05).default(0.05),
  creatorId: z.string().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
}).refine((value) => Boolean(value.contextId) || Boolean(value.messages?.length), {
  message: "Provide messages or contextId."
});

export const experienceBuySchema = z.object({
  mode: z.enum(["skill-buy", "skill-clone"]).optional(),
  experienceId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  skillId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  listingId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  buyerId: z.string().min(1).max(120).optional()
}).refine((value) => Boolean(value.experienceId || value.skillId || value.listingId), {
  message: "Provide experienceId, skillId, or listingId."
});

export const skillReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(100).optional(),
  body: z.string().trim().min(8).max(1_200)
});

export const skillBundleFileSchema = z.object({
  path: z.string().min(1).max(240),
  content: z.string().max(450_000),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
  mode: z.union([z.literal(420), z.literal(493)]).default(420)
});

export const skillBundlePushSchema = z.object({
  mode: z.enum(["skill-validate", "skill-push"]).default("skill-push"),
  skillId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
  publishToken: z.string().regex(/^pub_[a-f0-9]{24}$/).optional(),
  repository: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  files: z.array(skillBundleFileSchema).min(1).max(128),
  metadata: z.record(z.string(), z.unknown()).optional()
}).superRefine((value, ctx) => {
  if (!value.skillId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["skillId"], message: "skillId is required for skill bundle validation and push." });
  }
});

function hasExperienceContent(value: { experience?: z.infer<typeof experienceRecordSchema>; title?: string; content?: string; tags?: string[] }) {
  const experience = value.experience;
  return Boolean(
    value.content?.trim() ||
    experience?.content?.trim() ||
    experience?.summary?.trim() ||
    experience?.task?.trim() ||
    experience?.outcome?.trim() ||
    experience?.lesson?.trim() ||
    experience?.constraints?.length ||
    experience?.decisions?.length ||
    experience?.tags?.length ||
    experience?.skill
  );
}

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

export const verifyPasswordResetCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(24),
  password: z.string().min(12).max(128),
  passwordConfirmation: z.string().min(12).max(128)
}).refine((value) => value.password === value.passwordConfirmation, {
  message: "Password confirmation does not match.",
  path: ["passwordConfirmation"]
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
  mode: operationModeSchema.optional(),
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
export type VerifyPasswordResetCodeInput = z.infer<typeof verifyPasswordResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type PlaygroundRunInput = z.infer<typeof playgroundRunSchema>;

export type ContextEndpoint = "summarize" | "compress-context" | "handoff" | "extract-profile" | "memory-enrichment";
export type ExperienceEndpoint = "experience-save" | "experience-publish" | "experience-search" | "experience-buy";
export type BillableEndpoint = ContextEndpoint | ExperienceEndpoint;
export type ExperienceSaveInput = z.infer<typeof experienceSaveSchema>;
export type ExperiencePublishInput = z.infer<typeof experiencePublishSchema>;
export type ExperienceSearchInput = z.infer<typeof experienceSearchSchema>;
export type ExperienceConsiderInput = z.infer<typeof experienceConsiderSchema>;
export type ExperienceBuyInput = z.infer<typeof experienceBuySchema>;
export type SkillBundlePushInput = z.infer<typeof skillBundlePushSchema>;
export type SkillBundleFileInput = z.infer<typeof skillBundleFileSchema>;
export type VerifiedSkillInput = z.infer<typeof verifiedSkillSchema>;

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

type SummarizeState = {
  goal: string;
  status: string;
  blockers: string[];
  next: string[];
};

type FullSummarizeMetrics = {
  inputTokens: number;
  outputTokens: number;
  stateTokens: number;
  totalOutputTokens: number;
  reductionPercent: number;
  latencyMs: number;
};

type MicroSummarizeMetrics = {
  inputTokens: number;
  microTokens: number;
  reductionPercent: number;
};

export type SummarizeResponse =
  | {
    mode: "micro";
    micro: string;
    metrics: MicroSummarizeMetrics;
  }
  | {
  mode: "compact" | "extended" | "debug";
  summary?: string;
  micro?: string;
  compact?: string;
  extended?: string;
  state: SummarizeState;
  keyDecisions?: string[];
  actionItems?: string[];
  openQuestions?: string[];
  risks?: string[];
  metrics: FullSummarizeMetrics;
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
