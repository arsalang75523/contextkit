export type Role = "system" | "user" | "assistant" | "tool";

export type ConversationMessage = {
  role: Role;
  content: string;
};

export type ContextRequest = {
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
  webhookUrl?: string;
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
  prioritizedFacts: Array<{ fact: string; importance: number }>;
  entities: {
    project: string;
    people: string[];
    stack: string[];
    deadlines: string[];
    constraints: string[];
    projects: string[];
    organizations: string[];
    technologies: string[];
    services: string[];
  };
  conflicts: Array<{ current: string; superseded: string[] }>;
  supersededFacts: Array<{ current: string; superseded: string[] }>;
  inputTokens: number;
  outputTokens: number;
  actualReductionPercent: number;
  factRetentionScore: number;
  criticalFactsRetained: number;
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
  failedApproaches: Array<{ attempt: string; result: string; decision: string }>;
  importantDecisions: Array<{ decision: string; reason: string }>;
  blockers: string[];
  agentNotes: string[];
  priorityOrder: string[];
  recommendedStartingPoint: string;
  highestRiskArea: string;
  repositories: string[];
  artifacts: string[];
  links: string[];
  owners: string[];
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
  inferredTraits: string[];
  memoryImportance: number;
  confidence: number;
};

export type MemoryEnrichmentResponse = {
  stablePreferences: string[];
  evolvingPreferences: string[];
  longTermGoals: string[];
  supersededMemories: string[];
  memoryConflicts: Array<{ current: string; superseded: string[] }>;
  confidence: number;
};

export type X402PaymentHandler = (challenge: unknown, request: RequestInit & { url: string }) => Promise<string>;
