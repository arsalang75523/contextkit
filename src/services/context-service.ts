import { BankrLlmClient } from "@/lib/bankr-llm";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { createId } from "@/utils/id";
import { estimateReduction, estimateTokens } from "@/utils/tokens";
import { CompressionQualityService } from "@/services/compression-quality-service";
import type {
  CompressContextResponse,
  ContextEndpoint,
  ConversationRequest,
  HandoffResponse,
  ProfileResponse,
  SummarizeResponse,
  WebhookEventName
} from "@/types/api";
import type { AppBindings } from "@/types/bindings";

type ServiceContext = {
  env?: AppBindings["Bindings"];
  requestId: string;
};

export class ContextService {
  constructor(private readonly serviceContext: ServiceContext) {}

  async summarize(request: ConversationRequest): Promise<SummarizeResponse> {
    const output = await this.generate("summarize", request);
    const summary = String(output.summary ?? "");
    return {
      summary,
      tokenReductionEstimate: Number(output.tokenReductionEstimate ?? estimateReduction(estimateTokens(request.messages), estimateTokens(summary))),
      keyDecisions: arrayOfStrings(output.keyDecisions),
      actionItems: arrayOfStrings(output.actionItems),
      openQuestions: arrayOfStrings(output.openQuestions),
      risks: arrayOfStrings(output.risks),
      confidence: confidence(output.confidence)
    };
  }

  async compress(request: ConversationRequest): Promise<CompressContextResponse> {
    const output = await this.generate("compress-context", request);
    const micro = String(output.micro ?? "");
    const compact = String(output.compact ?? output.compressedContext ?? micro);
    const extended = String(output.extended ?? compact);
    const compressedContext = String(output.compressedContext ?? compact);
    const originalTokens = estimateTokens(request.messages);
    const compressedTokens = estimateTokens(compact || compressedContext);
    const actualReductionPercent = estimateReduction(originalTokens, compressedTokens);
    const estimatedSavings = String(output.estimatedSavings ?? `${actualReductionPercent}%`);
    const quality = new CompressionQualityService().score(request.messages, compressedContext);
    const prioritizedFacts = facts(output.prioritizedFacts);
    const factRetentionScore = Number(output.metrics && typeof output.metrics === "object" && "factRetentionScore" in output.metrics ? output.metrics.factRetentionScore : quality.retainedFactsCount > 0 ? Math.min(1, quality.retainedFactsCount / Math.max(prioritizedFacts.length, 1)) : 0);

    return {
      compressedContext,
      estimatedSavings,
      micro,
      compact,
      extended,
      prioritizedFacts,
      entities: entities(output.entities),
      conflicts: conflicts(output.conflicts),
      metrics: {
        originalTokens,
        compressedTokens,
        actualReductionPercent,
        factRetentionScore: confidence(factRetentionScore)
      },
      quality: {
        duplicateDensity: Number(Math.max(0, Math.min(1, 1 - compressedTokens / Math.max(originalTokens, 1))).toFixed(2)),
        contextScore: quality.compressionScore,
        semanticSimilarity: quality.semanticSimilarity,
        retainedFactsCount: quality.retainedFactsCount
      }
    };
  }

  async handoff(request: ConversationRequest): Promise<HandoffResponse> {
    const output = await this.generate("handoff", request);
    return {
      goal: String(output.goal ?? "unknown"),
      importantFacts: arrayOfStrings(output.importantFacts),
      constraints: arrayOfStrings(output.constraints),
      recommendedNextActions: arrayOfStrings(output.recommendedNextActions),
      tone: String(output.tone ?? "unknown"),
      userIntent: String(output.userIntent ?? "unknown"),
      projectSummary: String(output.projectSummary ?? "unknown"),
      currentState: String(output.currentState ?? "unknown"),
      completedWork: arrayOfStrings(output.completedWork),
      inProgress: arrayOfStrings(output.inProgress),
      pendingTasks: arrayOfStrings(output.pendingTasks),
      knownIssues: arrayOfStrings(output.knownIssues),
      failedApproaches: failedApproaches(output.failedApproaches),
      importantDecisions: decisions(output.importantDecisions),
      blockers: arrayOfStrings(output.blockers),
      agentNotes: arrayOfStrings(output.agentNotes),
      confidence: confidence(output.confidence)
    };
  }

  async profile(request: ConversationRequest): Promise<ProfileResponse> {
    const output = await this.generate("extract-profile", request);
    return {
      interests: arrayOfStrings(output.interests),
      riskTolerance: String(output.riskTolerance ?? "unknown"),
      communicationStyle: String(output.communicationStyle ?? "unknown"),
      preferences: arrayOfStrings(output.preferences),
      importantContext: arrayOfStrings(output.importantContext),
      identity: identity(output.identity),
      skills: arrayOfStrings(output.skills),
      goals: arrayOfStrings(output.goals),
      futurePlans: arrayOfStrings(output.futurePlans),
      behaviorPatterns: arrayOfStrings(output.behaviorPatterns),
      dislikes: arrayOfStrings(output.dislikes),
      careerStage: String(output.careerStage ?? "unknown"),
      managementIntent: Boolean(output.managementIntent),
      entrepreneurial: Boolean(output.entrepreneurial),
      confidence: confidence(output.confidence)
    };
  }

  async emitCompleted<T>(request: ConversationRequest, type: WebhookEventName, data: T) {
    await dispatchWebhook({
      url: request.webhookUrl,
      context: { env: this.serviceContext.env ?? {} },
      event: {
        id: createId("evt"),
        type,
        createdAt: new Date().toISOString(),
        requestId: this.serviceContext.requestId,
        data
      }
    });
  }

  private async generate(endpoint: ContextEndpoint, request: ConversationRequest) {
    return new BankrLlmClient({ env: this.serviceContext.env ?? {} }).generateJson(endpoint, request.messages);
  }
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function confidence(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(Math.max(0, Math.min(1, number)).toFixed(2)) : 0;
}

function facts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        fact: String(record.fact ?? "").trim(),
        importance: Math.max(1, Math.min(10, Math.round(Number(record.importance ?? 1))))
      };
    })
    .filter((item): item is { fact: string; importance: number } => Boolean(item?.fact))
    .sort((a, b) => b.importance - a.importance);
}

function entities(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    project: String(record.project ?? "unknown"),
    people: arrayOfStrings(record.people),
    stack: arrayOfStrings(record.stack),
    deadlines: arrayOfStrings(record.deadlines),
    constraints: arrayOfStrings(record.constraints)
  };
}

function conflicts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        current: String(record.current ?? "").trim(),
        superseded: arrayOfStrings(record.superseded)
      };
    })
    .filter((item): item is { current: string; superseded: string[] } => Boolean(item?.current));
}

function failedApproaches(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      attempt: String(record.attempt ?? "unknown"),
      result: String(record.result ?? "unknown"),
      decision: String(record.decision ?? "unknown")
    };
  });
}

function decisions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      decision: String(record.decision ?? "unknown"),
      reason: String(record.reason ?? "unknown")
    };
  });
}

function identity(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const age = typeof record.age === "number" ? record.age : null;
  return {
    profession: typeof record.profession === "string" ? record.profession : undefined,
    location: typeof record.location === "string" ? record.location : undefined,
    age
  };
}
