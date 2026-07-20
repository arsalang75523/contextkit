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
  writeEligible: boolean;
  status: "verified" | "needs-work" | "rejected";
  score: number;
  threshold: number;
  validationLevel: "evidence-backed-contract";
  requirements: {
    write: { requiredEvidenceTests: 1; passedEvidenceTests: number; met: boolean };
    publish: { requiredEvidenceTests: 3; passedEvidenceTests: number; independentEvidenceTests: number; met: boolean };
  };
  breakdown: Record<string, number>;
  tests: Array<{
    name: string;
    passed: boolean;
    evidenceType: "command-output" | "test-log" | "http-response" | "artifact" | "assertion";
    evidenceExcerpt: string;
    sourceMessageIndex?: number;
    findings: string[];
  }>;
  findings: string[];
};

export type VerifiedSkill = {
  name: string;
  description: string;
  license: string;
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
  tests?: Array<{
    name: string;
    passed: boolean;
    testMethod: string;
    observedOutcome: string;
    evidenceType: "command-output" | "test-log" | "http-response" | "artifact" | "assertion";
    evidenceExcerpt: string;
    sourceMessageIndex?: number;
  }>;
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
  repository?: {
    name: string;
    version: string;
    digest: string;
    manifest: SkillBundleManifest;
    validation: SkillBundleValidationReport;
  };
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
  installBundle: LegacySkillInstallBundle | SkillRepositoryInstallBundle;
  license: { use: "agent-skill-installation"; resale: false; attribution: string };
};

export type SkillBundleFormat = "contextkit-skill-repository/v1";

export type SkillBundleFile = {
  /** POSIX-style path relative to the repository root. */
  path: string;
  content: string;
  encoding?: "utf8" | "base64";
  /** Git-style normalized file mode: 0644 or executable 0755. */
  mode?: 420 | 493;
  size?: number;
  sha256?: string;
};

export type SkillBundle = {
  files: SkillBundleFile[];
};

export type SkillRepositoryRef = {
  name: string;
  version: string;
  digest: string;
};

export type SkillBundleValidationReport = {
  valid: boolean;
  writeEligible: boolean;
  publishEligible: boolean;
  policyVersion: "skill-repository-v1";
  findings: string[];
  warnings: string[];
  limits: { maxFiles: number; maxFileBytes: number; maxBundleBytes: number };
  checks: {
    safePaths: boolean;
    secretScan: boolean;
    requiredFiles: boolean;
    executableContract: boolean;
    identityMatch: boolean;
    immutableVersion: boolean;
  };
};

export type SkillBundleManifest = {
  format: SkillBundleFormat;
  repository: string;
  version: string;
  digest: string;
  fileCount: number;
  totalBytes: number;
  createdAt: string;
  skillId?: string;
  skill: { name: string; version: string; license: string; ecosystem: string };
  runtime?: string;
  entrypoint?: string;
  testCommand?: string;
  files: Array<{ path: string; sha256: string; size: number; encoding: "utf8" | "base64"; mode: 420 | 493 }>;
};

export type SkillBundleValidateRequest = {
  skillId: string;
  publishToken?: string;
  repository: string;
  version: string;
  files: SkillBundleFile[];
  metadata?: Record<string, unknown>;
};

export type SkillBundleValidateResponse = {
  stored: false;
  repository: SkillBundleManifest;
  validation: SkillBundleValidationReport;
};

export type SkillBundlePushRequest = SkillBundleValidateRequest;

export type SkillBundlePushResponse = {
  stored: true;
  experience: SkillRecord;
  repository: SkillBundleManifest;
  validation: SkillBundleValidationReport;
  nextAgentAction: string;
};

export type SkillVersionPublishRequest = {
  skillId: string;
  publishToken?: string;
  priceUsd?: 0.05;
  userApproved?: true;
};

export type SkillVersionPublishResponse = {
  experience: SkillRecord;
  marketplace: { listed: true; priceUsd: number; access: string };
};

export type SkillRepositoryInspectRequest = { skillId: string };

export type SkillRepositoryInspectResponse = {
  results: Array<SkillRecord & { score: number }>;
  count: number;
  query: string | null;
};

export type SkillRepositorySearchRequest = SkillSearchRequest;
export type SkillRepositorySearchResult = SkillRecord & { score: number };
export type SkillRepositorySearchResponse = {
  results: SkillRepositorySearchResult[];
  count: number;
  query: string | null;
};

export type SkillVersionBuyRequest = { skillId: string };
export type SkillVersionCloneRequest = { skillId: string };
export type SkillVersionBuyResponse = SkillPurchaseResponse;
export type SkillVersionCloneResponse = SkillPurchaseResponse;
export type SkillVersionPurchase = SkillPurchaseResponse["purchase"];
export type SkillVersionRef = SkillRepositoryRef;
export type SkillRepositoryVisibility = "private" | "public";
export type SkillRepositoryVersion = SkillBundleManifest;
export type SkillRepository = SkillRecord["repository"];
export type SkillBundleValidationFinding = string;
export type SkillBundleValidationCheck = SkillBundleValidationReport["checks"];

export type LegacySkillInstallBundle = {
  format: "contextkit-verified-skill/v1";
  fileName: "SKILL.md";
  skillMarkdown: string;
  manifest: Record<string, unknown>;
};

export type SkillRepositoryInstallBundle = {
  format: SkillBundleFormat;
  repository: string;
  version: string;
  digest: string;
  manifest: SkillBundleManifest;
  files: Array<Required<Pick<SkillBundleFile, "path" | "content" | "encoding" | "mode" | "size" | "sha256">>>;
  validation: SkillBundleValidationReport;
  materialize: { root: string; overwrite: false; verifyChecksums: true };
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
