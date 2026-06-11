import { BankrLlmClient } from "@/lib/bankr-llm";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { createId } from "@/utils/id";
import { estimateReduction, estimateTokens } from "@/utils/tokens";
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
    const mode = request.mode ?? "micro";
    const inputTokens = estimateTokens(request.messages);
    const stateValue = dedupeSummaryState(summarizeState(output.state));
    const responseState = extractedContinuityState(stateValue);
    const keyDecisions = arrayOfStrings(output.keyDecisions);
    const actionItems = arrayOfStrings(output.actionItems);
    const openQuestions = arrayOfStrings(output.openQuestions);
    const risks = arrayOfStrings(output.risks);
    const microFacts = [
      stateValue.goal,
      stateValue.status,
      ...stateValue.blockers.map((item) => `Blocker: ${item}`)
    ].filter((item) => item && item !== "unknown");
    const compactFacts = [
      ...microFacts,
      ...stateValue.decisions.slice(0, 4).map((item) => `Decision: ${shortStateValue(item, 6)}`),
      ...keyDecisions.slice(0, 4).map((item) => `Decision: ${shortStateValue(item, 6)}`),
      ...actionItems.slice(0, 6).map((item) => `Next: ${shortStateValue(item, 4)}`)
    ].filter((item) => item && item !== "unknown");
    const extendedFacts = [
      ...compactFacts,
      ...openQuestions.map((item) => `Open: ${item}`),
      ...risks.map((item) => `Risk: ${item}`)
    ];
    const micro = compactSentence(enforceBudget(String(output.micro ?? ""), microFacts, inputTokens, 0.2, 40));
    const compact = compactParagraph(enforceBudget(String(output.compact ?? output.summary ?? ""), compactFacts, inputTokens, 0.4, 120));
    const extended = extendedParagraph(enforceBudget(String(output.extended ?? output.summary ?? compact), extendedFacts, inputTokens, 0.6, 180));
    const summary = compact || micro || extended;
    const microTokens = estimateTokens(micro);
    const compactTokens = estimateTokens(compact);
    const extendedTokens = estimateTokens(extended);
    const microStateTokens = estimateTokens(JSON.stringify(responseState));
    const compactStateTokens = microStateTokens;
    const extendedStateTokens = microStateTokens;
    const metrics = {
      inputTokens,
      microTokens,
      compactTokens,
      extendedTokens,
      microStateTokens,
      compactStateTokens,
      extendedStateTokens,
      totalOutputTokens: estimateTokens(JSON.stringify({ summary, micro, compact, extended, state: stateValue, keyDecisions, actionItems, openQuestions, risks })),
      microReductionPercent: estimateReduction(inputTokens, microTokens + microStateTokens),
      compactReductionPercent: estimateReduction(inputTokens, compactTokens + compactStateTokens),
      extendedReductionPercent: estimateReduction(inputTokens, extendedTokens + extendedStateTokens)
    };
    const microMetrics = {
      inputTokens,
      microTokens,
      stateTokens: microStateTokens,
      totalOutputTokens: estimateTokens(JSON.stringify({ mode: "micro", micro, state: responseState })),
      reductionPercent: estimateReduction(inputTokens, microTokens + microStateTokens)
    };
    const compactMetrics = {
      inputTokens,
      compactTokens,
      stateTokens: compactStateTokens,
      totalOutputTokens: estimateTokens(JSON.stringify({ mode: "compact", compact, state: responseState })),
      reductionPercent: estimateReduction(inputTokens, compactTokens + compactStateTokens)
    };
    const extendedMetrics = {
      inputTokens,
      extendedTokens,
      stateTokens: extendedStateTokens,
      totalOutputTokens: estimateTokens(JSON.stringify({ mode: "extended", extended, state: responseState })),
      reductionPercent: estimateReduction(inputTokens, extendedTokens + extendedStateTokens)
    };
    const debugResponse = {
      mode,
      summary,
      tokenReductionEstimate: estimateReduction(inputTokens, compactTokens || estimateTokens(summary)),
      micro,
      compact,
      extended,
      state: responseState,
      inputTokens,
      microTokens,
      compactTokens,
      extendedTokens,
      microReductionPercent: metrics.microReductionPercent,
      compactReductionPercent: metrics.compactReductionPercent,
      extendedReductionPercent: metrics.extendedReductionPercent,
      keyDecisions,
      actionItems,
      openQuestions,
      risks,
      tokenMetrics: {
        inputTokens,
        outputTokens: metrics.totalOutputTokens,
        microTokens,
        compactTokens,
        extendedTokens
      },
      metrics,
      confidence: confidence(output.confidence)
    };
    if (mode === "debug") return debugResponse;
    if (mode === "extended") return { mode, extended, state: responseState, metrics: extendedMetrics };
    if (mode === "compact") return { mode, compact, state: responseState, metrics: compactMetrics };
    return { mode: "micro", micro, state: responseState, metrics: microMetrics };
  }

  async compress(request: ConversationRequest): Promise<CompressContextResponse> {
    const output = await this.generate("compress-context", request);
    const inputTokens = estimateTokens(request.messages);
    const stateValue = compressedState(output.state);
    const entityValue = compressedEntities(output.entities);
    const conflictValue = compressionConflicts(output.conflicts ?? output.supersededFacts);
    const fallbackFacts = [
      ...stateValue.goals,
      ...stateValue.status,
      ...stateValue.activeProblems.map((item) => `Issue: ${item}`),
      ...stateValue.constraints.map((item) => `Constraint: ${item}`),
      ...stateValue.decisions.map((item) => `Decision: ${item}`),
      ...stateValue.nextSteps.map((item) => `Next: ${item}`),
      ...entityValue.projects.map((item) => `Project: ${item}`),
      ...entityValue.technologies.map((item) => `Tech: ${item}`),
      ...entityValue.deadlines.map((item) => `Deadline: ${item}`)
    ];
    const compressedContext = denseContext(enforceBudget(String(output.compressedContext ?? ""), fallbackFacts, inputTokens, targetCompressionRatio(inputTokens), 120));
    const compressedTokens = estimateTokens(compressedContext);
    const response = {
      compressedContext,
      state: stateValue,
      entities: entityValue,
      metrics: {
        inputTokens,
        compressedTokens,
        reductionPercent: estimateReduction(inputTokens, compressedTokens)
      }
    };

    return conflictValue.length > 0 ? { ...response, conflicts: conflictValue } : response;
  }

  async handoff(request: ConversationRequest): Promise<HandoffResponse> {
    const output = await this.generate("handoff", request);
    const projectRecord = output.project && typeof output.project === "object" ? output.project as Record<string, unknown> : {};
    return {
      project: {
        name: String(projectRecord.name ?? output.projectName ?? "unknown"),
        goal: String(projectRecord.goal ?? output.goal ?? "unknown"),
        currentState: String(projectRecord.currentState ?? output.currentState ?? "unknown")
      },
      completed: arrayOfStrings(output.completed ?? output.completedWork).slice(0, 10),
      inProgress: arrayOfStrings(output.inProgress),
      pending: arrayOfStrings(output.pending ?? output.pendingTasks).slice(0, 12),
      blockers: arrayOfStrings(output.blockers),
      failedApproaches: failedApproaches(output.failedApproaches).slice(0, 10),
      decisions: decisions(output.decisions ?? output.importantDecisions).slice(0, 10),
      priorities: arrayOfStrings(output.priorities ?? output.priorityOrder).slice(0, 10),
      criticalContext: criticalContext(output.criticalContext, output),
      startHere: String(output.startHere ?? output.recommendedStartingPoint ?? "unknown"),
      agentNotes: arrayOfStrings(output.agentNotes).slice(0, 10)
    };
  }

  async profile(request: ConversationRequest): Promise<ProfileResponse> {
    const output = await this.generate("extract-profile", request);
    const identityValue = identity(output.identity);
    const interests = uniqueMemoryList(output.interests);
    const skills = uniqueMemoryList(output.skills);
    const preferences = uniqueMemoryList([output.preferences, output.communicationStyle, output.stablePreferences]);
    const goals = uniqueMemoryList([output.goals, output.longTermGoals]);
    const futurePlans = uniqueMemoryList(output.futurePlans, goals);
    const inferredTraits = uniqueMemoryList([output.inferredTraits, output.behaviorPatterns, output.entrepreneurial ? ["entrepreneurial"] : []], preferences);
    const stableMemories = uniqueMemoryList(output.stableMemories, [...preferences, ...inferredTraits]);
    const evolvingMemories = uniqueMemoryList(output.evolvingMemories, [...goals, ...futurePlans]);
    const dislikes = uniqueMemoryList(output.dislikes, preferences);
    const facts = memoryFacts(output.memoryFacts, {
      preferences,
      goals,
      futurePlans,
      skills,
      interests,
      inferredTraits,
      stableMemories,
      evolvingMemories
    });
    const averageConfidence = facts.length > 0 ? Number((facts.reduce((total, item) => total + item.confidence, 0) / facts.length).toFixed(2)) : confidence(output.confidence);
    const micro = {
      identity: identityValue,
      preferences: preferences.slice(0, 3),
      goals: goals.slice(0, 3)
    };
    const compact = {
      identity: identityValue,
      skills: skills.slice(0, 6),
      interests: interests.slice(0, 6),
      preferences: preferences.slice(0, 6),
      goals: goals.slice(0, 6),
      traits: inferredTraits.slice(0, 6)
    };
    const full = {
      identity: identityValue,
      skills,
      interests,
      stablePreferences: preferences,
      currentGoals: goals,
      futurePlans,
      inferredTraits,
      stableMemories,
      evolvingMemories
    };

    return {
      mode: "compact",
      micro,
      compact,
      full,
      memoryFacts: facts,
      interests,
      riskTolerance: String(output.riskTolerance ?? "unknown"),
      communicationStyle: preferences[0] ?? String(output.communicationStyle ?? "unknown"),
      preferences,
      importantContext: uniqueMemoryList(output.importantContext, [...preferences, ...goals, ...interests]),
      identity: identityValue,
      skills,
      goals,
      futurePlans,
      behaviorPatterns: [],
      dislikes,
      careerStage: String(output.careerStage ?? "unknown"),
      managementIntent: Boolean(output.managementIntent),
      entrepreneurial: Boolean(output.entrepreneurial),
      inferredTraits,
      memoryImportance: Math.max(1, Math.min(10, Math.round(Number(output.memoryImportance ?? 1)))),
      stableMemories,
      evolvingMemories,
      deprecatedMemories: uniqueMemoryList(output.deprecatedMemories),
      confidence: averageConfidence
    };
  }

  async memoryEnrichment(request: ConversationRequest): Promise<MemoryEnrichmentResponse> {
    const output = await this.generate("memory-enrichment", request);
    const stablePreferences = uniqueMemoryList(output.stablePreferences);
    const longTermGoals = uniqueMemoryList(output.longTermGoals);
    const legacyStableMemories = uniqueMemoryList(output.stableMemories, stablePreferences);
    const evolvingPreferenceValues = uniqueMemoryList(output.evolvingPreferences, stablePreferences);
    const legacyEvolvingMemories = uniqueMemoryList(output.evolvingMemories, [...longTermGoals, ...evolvingPreferenceValues]);
    const deprecatedMemories = uniqueMemoryList([output.deprecatedMemories, output.supersededMemories]);
    const activeMemories = canonicalMemories(output.activeMemories, [
      ...stablePreferences.map((fact) => ({ fact, category: "preference", stability: "stable" as const, confidence: 0.95 })),
      ...legacyStableMemories.map((fact) => ({ fact, category: "memory", stability: "stable" as const, confidence: 0.85 }))
    ], "stable") as Array<{ fact: string; category: string; stability: "stable"; confidence: number }>;
    const evolvingMemories = canonicalMemories(output.evolvingMemories, [
      ...evolvingPreferenceValues.map((fact) => ({ fact, category: "preference", stability: "evolving" as const, confidence: 0.85 })),
      ...longTermGoals.map((fact) => ({ fact, category: "goal", stability: "evolving" as const, confidence: 0.9 })),
      ...legacyEvolvingMemories.map((fact) => ({ fact, category: "memory", stability: "evolving" as const, confidence: 0.8 }))
    ], "evolving", activeMemories.map((item) => item.fact)) as Array<{ fact: string; category: string; stability: "evolving"; confidence: number }>;
    const conflictValue = canonicalMemoryConflicts(output.conflicts ?? output.memoryConflicts ?? output.supersededMemories);
    const confidenceValue = [...activeMemories, ...evolvingMemories].length > 0
      ? Number(([...activeMemories, ...evolvingMemories].reduce((total, item) => total + item.confidence, 0) / [...activeMemories, ...evolvingMemories].length).toFixed(2))
      : confidence(output.confidence);

    return {
      activeMemories,
      evolvingMemories,
      conflicts: conflictValue,
      longTermGoals,
      stablePreferences,
      evolvingPreferences: evolvingPreferenceValues,
      supersededMemories: deprecatedMemories,
      memoryConflicts: conflictValue.map((item) => ({ current: item.new, superseded: [item.old] })),
      stableMemories: legacyStableMemories,
      legacyEvolvingMemories,
      deprecatedMemories,
      confidence: confidenceValue
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

function summarizeState(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    goal: String(record.goal ?? "unknown"),
    status: String(record.status ?? "unknown"),
    blockers: arrayOfStrings(record.blockers),
    decisions: arrayOfStrings(record.decisions),
    priorities: arrayOfStrings(record.priorities),
    nextSteps: arrayOfStrings(record.nextSteps)
  };
}

function extractedContinuityState(stateValue: ReturnType<typeof summarizeState>) {
  return {
    goal: completeStateText(stateValue.goal) || "unknown",
    status: completeStateText(stateValue.status) || "unknown",
    blockers: completeStateList(stateValue.blockers),
    next: completeStateList(stateValue.nextSteps)
  };
}

function dedupeSummaryState(stateValue: ReturnType<typeof summarizeState>) {
  const blockers = uniqueStrings(stateValue.blockers);
  const decisions = uniqueStrings(stateValue.decisions);
  const priorities = uniqueStrings(stateValue.priorities).filter((item) => !containsEquivalent(blockers, item));
  const nextSteps = uniqueStrings(stateValue.nextSteps).filter((item) => !containsEquivalent(priorities, item) && !containsEquivalent(decisions, item));

  return {
    goal: stateValue.goal,
    status: stateValue.status,
    blockers,
    decisions,
    priorities,
    nextSteps
  };
}

function enforceBudget(candidate: string, facts: string[], inputTokens: number, ratio: number, hardMaxTokens?: number) {
  const maxTokens = Math.min(hardMaxTokens ?? Number.POSITIVE_INFINITY, Math.max(8, Math.floor(inputTokens * ratio)));
  const cleaned = normalizeSummary(candidate);
  if (cleaned && estimateTokens(cleaned) <= maxTokens && estimateTokens(cleaned) < inputTokens) {
    return completeTextWithinBudget(cleaned, maxTokens);
  }

  const selected: string[] = [];
  for (const fact of facts) {
    const normalized = normalizeSummary(fact);
    if (!normalized || selected.includes(normalized)) continue;
    const next = [...selected, normalized].join("; ");
    if (estimateTokens(next) > maxTokens || estimateTokens(next) >= inputTokens) break;
    selected.push(normalized);
  }

  if (selected.length > 0) return selected.join("; ");
  return completeTextWithinBudget(cleaned, Math.min(maxTokens, Math.max(0, inputTokens - 1)));
}

function uniqueStrings(items: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = normalizeComparable(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(item);
  }
  return result;
}

function uniqueMemoryList(value: unknown, exclude: string[] = []) {
  const raw = Array.isArray(value) ? value.flatMap((item) => Array.isArray(item) ? item : [item]) : Array.isArray(exclude) && Array.isArray(value) ? value : [];
  const values = raw.length > 0 ? raw.map(String) : arrayOfStrings(value);
  const blocked = new Set(exclude.map(normalizeMemoryFact));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of values) {
    const canonical = canonicalMemoryLabel(item);
    const key = normalizeMemoryFact(canonical);
    if (!key || blocked.has(key) || seen.has(key)) continue;
    if ([...blocked].some((blockedKey) => blockedKey.includes(key) || key.includes(blockedKey))) continue;
    seen.add(key);
    result.push(canonical);
  }
  return result;
}

function memoryFacts(value: unknown, fallback: Record<string, string[]>) {
  const explicit = Array.isArray(value) ? value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const confidenceValue = confidence(record.confidence ?? 0.8);
    if (confidenceValue < 0.6) return null;
    return {
      fact: canonicalMemoryLabel(String(record.fact ?? "")),
      category: String(record.category ?? "memory"),
      stability: String(record.stability) === "evolving" ? "evolving" as const : "stable" as const,
      confidence: confidenceValue
    };
  }).filter((item): item is { fact: string; category: string; stability: "stable" | "evolving"; confidence: number } => Boolean(item?.fact)) : [];
  const generated = [
    ...fallback.preferences.map((fact) => ({ fact, category: "preference", stability: "stable" as const, confidence: 0.95 })),
    ...fallback.goals.map((fact) => ({ fact, category: "goal", stability: "evolving" as const, confidence: 0.9 })),
    ...fallback.futurePlans.map((fact) => ({ fact, category: "plan", stability: "evolving" as const, confidence: 0.85 })),
    ...fallback.skills.map((fact) => ({ fact, category: "skill", stability: "stable" as const, confidence: 0.85 })),
    ...fallback.interests.map((fact) => ({ fact, category: "interest", stability: "stable" as const, confidence: 0.85 })),
    ...fallback.inferredTraits.map((fact) => ({ fact, category: "trait", stability: "stable" as const, confidence: 0.8 })),
    ...fallback.stableMemories.map((fact) => ({ fact, category: "memory", stability: "stable" as const, confidence: 0.85 })),
    ...fallback.evolvingMemories.map((fact) => ({ fact, category: "memory", stability: "evolving" as const, confidence: 0.8 }))
  ];
  const seen = new Set<string>();
  return [...explicit, ...generated].filter((item) => {
    const key = normalizeMemoryFact(item.fact);
    if (!key || item.confidence < 0.6 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function canonicalMemories(
  value: unknown,
  fallback: Array<{ fact: string; category: string; stability: "stable" | "evolving"; confidence: number }>,
  stability: "stable" | "evolving",
  exclude: string[] = []
) {
  const explicit = Array.isArray(value) ? value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      fact: canonicalMemoryLabel(String(record.fact ?? "")),
      category: canonicalCategory(record.category),
      stability,
      confidence: confidence(record.confidence ?? 0.8)
    };
  }) : [];
  const blocked = new Set(exclude.map(normalizeMemoryFact));
  const seen = new Set<string>();
  return [...explicit, ...fallback]
    .map((item) => ({
      fact: canonicalMemoryLabel(item.fact),
      category: canonicalCategory(item.category),
      stability,
      confidence: confidence(item.confidence)
    }))
    .filter((item) => {
      const key = normalizeMemoryFact(item.fact);
      if (!key || item.confidence < 0.6 || blocked.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function canonicalMemoryConflicts(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((item) => {
      if (typeof item === "string") {
        return { old: canonicalMemoryLabel(item), new: "unknown", reason: "superseded" };
      }
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const oldValue = canonicalMemoryLabel(String(record.old ?? arrayOfStrings(record.superseded)[0] ?? ""));
      const newValue = canonicalMemoryLabel(String(record.new ?? record.current ?? ""));
      return {
        old: oldValue,
        new: newValue,
        reason: String(record.reason ?? "superseded")
      };
    })
    .filter((item) => {
      const key = `${normalizeMemoryFact(item.old)}:${normalizeMemoryFact(item.new)}`;
      if (!item.old || item.old === "unknown" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function canonicalCategory(value: unknown) {
  const category = String(value ?? "memory").toLowerCase();
  const allowed = new Set(["identity", "preference", "skill", "interest", "goal", "project", "career", "behavior", "location", "relationship", "memory", "plan"]);
  return allowed.has(category) ? category : "memory";
}

function canonicalMemoryLabel(value: string) {
  return normalizeSummary(value)
    .replace(/^prefers?\s+/i, "")
    .replace(/^likes?\s+/i, "")
    .replace(/^dislikes?\s+/i, "avoids ")
    .replace(/^avoids?\s+meetings?$/i, "async communication")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMemoryFact(value: string) {
  return canonicalMemoryLabel(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsEquivalent(items: string[], candidate: string) {
  const normalizedCandidate = normalizeComparable(candidate);
  return items.some((item) => {
    const normalizedItem = normalizeComparable(item);
    return normalizedItem === normalizedCandidate || normalizedItem.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedItem);
  });
}

function normalizeComparable(value: string) {
  return normalizeSummary(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function shortStateValue(value: string, maxTokens: number) {
  const normalized = normalizeSummary(value);
  if (!normalized || normalized === "unknown") return "unknown";
  return completeTextWithinBudget(normalized, maxTokens) || normalized;
}

function completeStateList(items: string[]) {
  return uniqueStrings(items)
    .map(completeStateText)
    .filter((item): item is string => Boolean(item));
}

function completeStateText(value: string) {
  const cleaned = conciseStateText(value);
  if (!cleaned || cleaned === "unknown" || hasInvalidStateEnding(cleaned)) return "";
  return cleaned;
}

function conciseStateText(value: string) {
  const cleaned = normalizeSummary(value)
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\b(including|such as)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\b(requirements? defined with|strict enforcement rules? established for|implementation details?|detailed explanation|rationale)\b/gi, "")
    .replace(/\s*[,;:([–-]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (wordCount(cleaned) <= 20) return cleaned;

  const completeParts = splitCompleteThoughts(cleaned);
  const compact = completeParts.find((part) => wordCount(part) >= 3 && wordCount(part) <= 20);
  if (compact) return compact;

  const clause = cleaned.split(/\s*[,;]\s*/).find((part) => wordCount(part) >= 3 && wordCount(part) <= 20);
  return clause ? clause.replace(/\s*[,;:([–-]\s*$/g, "").trim() : "";
}

function wordCount(value: string) {
  return normalizeSummary(value).split(/\s+/).filter(Boolean).length;
}

function hasInvalidStateEnding(value: string) {
  return /(?:,|:|\(|\band\b|\bor\b|\bwith\b|\bincluding\b|\bsuch as\b)$/i.test(value.trim());
}

function compactSentence(value: string) {
  const trimmed = completeTextWithinBudget(normalizeSummary(value).replace(/[;|]+/g, ". "), 60);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function compactParagraph(value: string) {
  const withoutRationale = normalizeSummary(value)
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/[;|]+/g, ". ");
  const trimmed = completeTextWithinBudget(withoutRationale, 150);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function extendedParagraph(value: string) {
  const withoutReplay = normalizeSummary(value)
    .replace(/\b(first|then|after that|previously|earlier|later|finally)\b[:,]?\s*/gi, "")
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/[;|]+/g, ". ");
  const trimmed = completeTextWithinBudget(withoutReplay, 200);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeSummary(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*[\r\n]+\s*/g, " ")
    .trim();
}

function completeTextWithinBudget(value: string, maxTokens: number) {
  const cleaned = normalizeSummary(value).replace(/\s*[,;:–-]\s*$/g, "");
  if (!cleaned || maxTokens <= 0) return "";
  if (estimateTokens(cleaned) <= maxTokens && !endsWithDanglingWord(cleaned)) return cleaned;

  const parts = splitCompleteThoughts(cleaned);
  const selected: string[] = [];
  for (const part of parts) {
    const next = [...selected, part].join("; ");
    if (estimateTokens(next) > maxTokens) break;
    selected.push(part);
  }
  return selected.join("; ");
}

function splitCompleteThoughts(value: string) {
  const normalized = normalizeSummary(value).replace(/[|]+/g, ";");
  const sentenceParts = normalized
    .split(/(?<=[.!?])\s+/)
    .flatMap((part) => part.split(/\s*;\s*/))
    .map((part) => part.trim().replace(/\s*[,;:–-]\s*$/g, ""))
    .filter((part) => part && !endsWithDanglingWord(part));
  return sentenceParts.length > 0 ? sentenceParts : [];
}

function endsWithDanglingWord(value: string) {
  return /\b(and|or|with|for|to|from|by|using|including|because|while|after|before|without|within|into|between|of|the|a|an)$/i.test(value);
}

function compressedState(value: unknown) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const legacy = state(value);
  return {
    goals: uniqueStrings(arrayOfStrings(record.goals ?? legacy.currentGoals)).slice(0, 5).map((item) => shortStateValue(item, 10)).filter((item) => item !== "unknown"),
    status: uniqueStrings(arrayOfStrings(record.status ?? legacy.currentStatus)).slice(0, 6).map((item) => shortStateValue(item, 12)).filter((item) => item !== "unknown"),
    activeProblems: uniqueStrings(legacy.activeProblems).slice(0, 6).map((item) => shortStateValue(item, 10)).filter((item) => item !== "unknown"),
    constraints: uniqueStrings(legacy.constraints).slice(0, 6).map((item) => shortStateValue(item, 10)).filter((item) => item !== "unknown"),
    decisions: uniqueStrings(legacy.decisions).slice(0, 6).map((item) => shortStateValue(item, 10)).filter((item) => item !== "unknown"),
    nextSteps: uniqueStrings(legacy.nextSteps).slice(0, 6).map((item) => shortStateValue(item, 6)).filter((item) => item !== "unknown")
  };
}

function compressedEntities(value: unknown) {
  const entityValue = entities(value);
  return {
    people: uniqueStrings(entityValue.people).slice(0, 6).map((item) => shortStateValue(item, 4)).filter((item) => item !== "unknown"),
    projects: uniqueStrings(entityValue.projects).slice(0, 4).map((item) => shortStateValue(item, 5)).filter((item) => item !== "unknown"),
    technologies: uniqueStrings(entityValue.technologies).slice(0, 10).map((item) => shortStateValue(item, 4)).filter((item) => item !== "unknown"),
    organizations: uniqueStrings(entityValue.organizations).slice(0, 6).map((item) => shortStateValue(item, 5)).filter((item) => item !== "unknown"),
    deadlines: uniqueStrings(entityValue.deadlines).slice(0, 4).map((item) => shortStateValue(item, 8)).filter((item) => item !== "unknown")
  };
}

function compressionConflicts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const oldValue = String(record.old ?? arrayOfStrings(record.superseded)[0] ?? "").trim();
      const newValue = String(record.new ?? record.current ?? "").trim();
      if (!oldValue || !newValue || oldValue === newValue) return null;
      return { old: oldValue, new: newValue };
    })
    .filter((item): item is { old: string; new: string } => Boolean(item));
}

function denseContext(value: string) {
  const cleaned = normalizeSummary(value)
    .replace(/\b(first|then|after that|previously|earlier|later|finally)\b[:,]?\s*/gi, "")
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\s*[\n\r]+\s*/g, " ")
    .replace(/[|]+/g, "; ");
  const trimmed = completeTextWithinBudget(cleaned, 120);
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function targetCompressionRatio(inputTokens: number) {
  if (inputTokens < 120) return 0.7;
  if (inputTokens < 800) return 0.5;
  return 0.3;
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

function failedApproaches(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      attempt: String(record.attempt ?? "unknown"),
      result: String(record.result ?? "unknown"),
      lesson: String(record.lesson ?? record.decision ?? "unknown")
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

function criticalContext(value: unknown, fallback: Record<string, unknown>) {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    mustKnow: arrayOfStrings(record.mustKnow ?? fallback.importantFacts).slice(0, 10),
    mustNotDo: arrayOfStrings(record.mustNotDo).slice(0, 10),
    biggestRisk: String(record.biggestRisk ?? fallback.highestRiskArea ?? "unknown"),
    successMetric: String(record.successMetric ?? "unknown")
  };
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
