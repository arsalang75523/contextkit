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

export type X402PaymentHandler = (challenge: unknown, request: RequestInit & { url: string }) => Promise<string>;
