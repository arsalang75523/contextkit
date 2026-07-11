export type Role = "system" | "user" | "assistant" | "tool";

export type ConversationMessage = {
  role: Role;
  content: string;
};

export type ContextRequest = {
  messages?: ConversationMessage[];
  contextId?: string;
  mode?: "micro" | "compact" | "extended" | "debug" | "extract-profile" | "memory-enrichment";
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
};

export type ContextUploadRequest = {
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
  precompute?: {
    endpoint: "summarize" | "compress-context" | "handoff" | "extract-profile" | "memory-enrichment";
    mode?: "micro" | "compact" | "extended" | "debug" | "extract-profile" | "memory-enrichment";
  };
  ttlSeconds?: number;
};

export type ContextUploadResponse = {
  contextId: string;
  expiresAt: string;
  messageCount: number;
  inputTokens: number;
  precomputed?: {
    endpoint: "summarize" | "compress-context" | "handoff" | "extract-profile" | "memory-enrichment";
    mode: "micro" | "compact" | "extended" | "debug" | "extract-profile" | "memory-enrichment" | null;
  } | null;
};

export type SkillValidationReport = {
  eligible: boolean;
  status: "verified" | "needs-work" | "rejected";
  score: number;
  threshold: number;
  validationLevel: "deterministic-contract";
  breakdown: Record<string, number>;
  tests: Array<{ name: string; passed: boolean; findings: string[] }>;
  findings: string[];
};

export type VerifiedSkill = {
  name: string;
  description: string;
  version: string;
  ecosystem: "bankr" | "x402" | "base" | "mcp" | "wallet" | "defi" | "automation" | "llm-gateway" | "agent-infrastructure";
  compatibility: string[];
  trigger: string;
  prerequisites: string[];
  inputs: string[];
  outputs: string[];
  steps?: string[];
  verification?: string[];
  failureHandling?: string[];
  doNotUseWhen?: string[];
  rollback?: string[];
  tags: string[];
  testCount: number;
  skillMarkdown?: string;
};

export type SkillCompileRequest = Pick<ContextRequest, "messages" | "contextId"> & {
  minConfidence?: number;
  autoSave?: boolean;
  priceUsd?: 0.05;
  metadata?: Record<string, unknown>;
};

export type SkillRecord = {
  id: string;
  title: string;
  summary: string;
  visibility: "private" | "public";
  priceUsd: number;
  sales: number;
  earnedUsd: number;
  kind: "verified-skill" | "legacy-experience";
  skill?: VerifiedSkill;
  validation?: SkillValidationReport;
};

export type SkillCompileResponse = {
  shouldSave: boolean;
  confidence: number;
  reason: string;
  experience?: SkillRecord;
  publishToken?: string;
  validation?: SkillValidationReport;
  publishRecommendation?: { shouldAskUser: boolean; priceUsd: number; message: string };
  nextAgentAction: string;
};

export type SkillSearchRequest = {
  query?: string;
  tags?: string[];
  ecosystems?: VerifiedSkill["ecosystem"][];
  compatibility?: string[];
  includePrivate?: boolean;
  limit?: number;
};

export type SkillPurchaseResponse = {
  purchase: { id: string; experienceId: string; amountUsd: number; createdAt: string };
  skill: VerifiedSkill;
  validation?: SkillValidationReport;
  installBundle: {
    format: "contextkit-verified-skill/v1";
    fileName: "SKILL.md";
    skillMarkdown: string;
    manifest: Record<string, unknown>;
  };
  license: { use: "agent-skill-installation"; resale: false; attribution: string };
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
  conflicts?: Array<{ old: string; new: string }>;
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
  failedApproaches: Array<{ attempt: string; result: string; lesson: string }>;
  decisions: Array<{ decision: string; reason: string }>;
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
    identity: { profession?: string; location?: string; age?: number | null };
    preferences: string[];
    goals: string[];
  };
  compact: {
    identity: { profession?: string; location?: string; age?: number | null };
    skills: string[];
    interests: string[];
    preferences: string[];
    goals: string[];
    traits: string[];
  };
  full: {
    identity: { profession?: string; location?: string; age?: number | null };
    skills: string[];
    interests: string[];
    stablePreferences: string[];
    currentGoals: string[];
    futurePlans: string[];
    inferredTraits: string[];
    stableMemories: string[];
    evolvingMemories: string[];
  };
  memoryFacts: Array<{ fact: string; category: string; stability: "stable" | "evolving"; confidence: number }>;
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
  activeMemories: Array<{ fact: string; category: string; stability: "stable"; confidence: number }>;
  evolvingMemories: Array<{ fact: string; category: string; stability: "evolving"; confidence: number }>;
  conflicts: Array<{ old: string; new: string; reason: string }>;
  stablePreferences: string[];
  evolvingPreferences: string[];
  longTermGoals: string[];
  supersededMemories: string[];
  memoryConflicts: Array<{ current: string; superseded: string[] }>;
  stableMemories: string[];
  legacyEvolvingMemories?: string[];
  deprecatedMemories: string[];
  confidence: number;
};

export type CreditEvent = {
  id: string;
  ownerId: string;
  type: "grant" | "debit" | "refund";
  amountUsd: number;
  balanceAfterUsd: number;
  route?: string;
  requestId?: string;
  apiKeyId?: string;
  note?: string;
  createdAt: string;
};

export type CreditsResponse = {
  ownerId: string;
  balanceUsd: number;
  events: CreditEvent[];
};

export type X402PaymentHandler = (challenge: unknown, request: RequestInit & { url: string }) => Promise<string>;
