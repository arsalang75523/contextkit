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
  MemoryEnrichmentResponse,
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
    const inputTokens = estimateTokens(request.messages);
    const summaryTokens = estimateTokens(summary);
    return {
      summary,
      tokenReductionEstimate: estimateReduction(inputTokens, summaryTokens),
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
    const prioritizedFacts = facts(output.prioritizedFacts ?? output.importantFactsRanked);
    const importantFactsRanked = facts(output.importantFactsRanked ?? output.prioritizedFacts);
    const criticalFactsRetained = prioritizedFacts.filter((fact) => fact.importance >= 8 && retainedIn(compact || compressedContext, fact.fact)).length;
    const factRetentionScore = Number(output.factRetentionScore ?? (output.metrics && typeof output.metrics === "object" && "factRetentionScore" in output.metrics ? output.metrics.factRetentionScore : prioritizedFacts.length > 0 ? criticalFactsRetained / Math.max(prioritizedFacts.filter((fact) => fact.importance >= 8).length, 1) : 0));
    const supersededFacts = conflicts(output.supersededFacts ?? output.conflicts);
    const stateValue = state(output.state);
    const commitmentsValue = commitments(output.commitments);
    const packet = agentContinuationPacket(output.agentContinuationPacket, stateValue, entities(output.entities));
    const decisionRecall = recall(stateValue.decisions, compact || compressedContext);
    const constraintRecall = recall([...stateValue.constraints, ...commitmentsValue.constraints], compact || compressedContext);
    const criticalFactRecall = prioritizedFacts.filter((fact) => fact.importance >= 8).length === 0 ? 0 : criticalFactsRetained / prioritizedFacts.filter((fact) => fact.importance >= 8).length;

    return {
      compressedContext,
      estimatedSavings,
      micro,
      compact,
      extended,
      prioritizedFacts,
      importantFactsRanked,
      entities: entities(output.entities),
      conflicts: supersededFacts,
      supersededFacts,
      state: stateValue,
      commitments: commitmentsValue,
      agentContinuationPacket: packet,
      compressionMetrics: {
        inputTokens: originalTokens,
        outputTokens: compressedTokens,
        actualReductionPercent,
        criticalFactRecall: confidence(criticalFactRecall),
        decisionRecall: confidence(decisionRecall),
        constraintRecall: confidence(constraintRecall)
      },
      inputTokens: originalTokens,
      outputTokens: compressedTokens,
      actualReductionPercent,
      factRetentionScore: confidence(factRetentionScore),
      criticalFactsRetained,
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
      priorityOrder: arrayOfStrings(output.priorityOrder),
      recommendedStartingPoint: String(output.recommendedStartingPoint ?? "unknown"),
      highestRiskArea: String(output.highestRiskArea ?? "unknown"),
      repositories: arrayOfStrings(output.repositories),
      artifacts: arrayOfStrings(output.artifacts),
      links: arrayOfStrings(output.links),
      owners: arrayOfStrings(output.owners),
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
      inferredTraits: arrayOfStrings(output.inferredTraits),
      memoryImportance: Math.max(1, Math.min(10, Math.round(Number(output.memoryImportance ?? 1)))),
      stableMemories: arrayOfStrings(output.stableMemories),
      evolvingMemories: arrayOfStrings(output.evolvingMemories),
      deprecatedMemories: arrayOfStrings(output.deprecatedMemories),
      confidence: confidence(output.confidence)
    };
  }

  async memoryEnrichment(request: ConversationRequest): Promise<MemoryEnrichmentResponse> {
    const output = await this.generate("memory-enrichment", request);
    return {
      stablePreferences: arrayOfStrings(output.stablePreferences),
      evolvingPreferences: arrayOfStrings(output.evolvingPreferences),
      longTermGoals: arrayOfStrings(output.longTermGoals),
      supersededMemories: arrayOfStrings(output.supersededMemories),
      memoryConflicts: conflicts(output.memoryConflicts),
      stableMemories: arrayOfStrings(output.stableMemories),
      evolvingMemories: arrayOfStrings(output.evolvingMemories),
      deprecatedMemories: arrayOfStrings(output.deprecatedMemories),
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
  const legacyProject = typeof record.project === "string" && record.project !== "unknown" ? [record.project] : [];
  return {
    project: String(record.project ?? "unknown"),
    people: arrayOfStrings(record.people),
    stack: arrayOfStrings(record.stack),
    deadlines: arrayOfStrings(record.deadlines),
    constraints: arrayOfStrings(record.constraints),
    projects: arrayOfStrings(record.projects ?? legacyProject),
    organizations: arrayOfStrings(record.organizations),
    technologies: arrayOfStrings(record.technologies ?? record.stack),
    services: arrayOfStrings(record.services)
  };
}

function conflicts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const oldValue = String(record.old ?? arrayOfStrings(record.superseded)[0] ?? "").trim();
      const newValue = String(record.new ?? record.current ?? "").trim();
      return {
        old: oldValue,
        new: newValue,
        reason: String(record.reason ?? "superseded by newer context"),
        current: newValue,
        superseded: arrayOfStrings(record.superseded ?? (oldValue ? [oldValue] : []))
      };
    })
    .filter((item): item is { old: string; new: string; reason: string; current: string; superseded: string[] } => Boolean(item?.current || item?.new));
}

function state(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    currentGoals: arrayOfStrings(record.currentGoals),
    activeProblems: arrayOfStrings(record.activeProblems),
    currentStatus: arrayOfStrings(record.currentStatus),
    constraints: arrayOfStrings(record.constraints),
    decisions: arrayOfStrings(record.decisions),
    priorities: arrayOfStrings(record.priorities),
    nextSteps: arrayOfStrings(record.nextSteps)
  };
}

function commitments(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    goals: arrayOfStrings(record.goals),
    constraints: arrayOfStrings(record.constraints),
    decisions: arrayOfStrings(record.decisions),
    promises: arrayOfStrings(record.promises),
    requirements: arrayOfStrings(record.requirements)
  };
}

function agentContinuationPacket(value: unknown, stateValue: ReturnType<typeof state>, entityValue: ReturnType<typeof entities>) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    project: String(record.project ?? entityValue.projects[0] ?? entityValue.project ?? "unknown"),
    currentObjective: String(record.currentObjective ?? stateValue.currentGoals[0] ?? "unknown"),
    highestPriorityIssue: String(record.highestPriorityIssue ?? stateValue.activeProblems[0] ?? stateValue.priorities[0] ?? "unknown"),
    activeDecisionSet: arrayOfStrings(record.activeDecisionSet).length > 0 ? arrayOfStrings(record.activeDecisionSet) : stateValue.decisions.slice(0, 5),
    nextAction: String(record.nextAction ?? stateValue.nextSteps[0] ?? "unknown"),
    criticalConstraints: arrayOfStrings(record.criticalConstraints).length > 0 ? arrayOfStrings(record.criticalConstraints) : stateValue.constraints.slice(0, 5)
  };
}

function recall(items: string[], output: string) {
  if (items.length === 0) return 0;
  const retained = items.filter((item) => retainedIn(output, item)).length;
  return retained / items.length;
}

function retainedIn(output: string, fact: string) {
  const terms = fact.toLowerCase().split(/\W+/).filter((term) => term.length > 3);
  if (terms.length === 0) return false;
  const haystack = output.toLowerCase();
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length >= 0.35;
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
