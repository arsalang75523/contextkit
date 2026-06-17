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
    const startedAt = Date.now();
    const mode = summarizeMode(request.mode);
    const output = await new BankrLlmClient({ env: this.serviceContext.env ?? {} }).generateJson("summarize", request.messages, mode);
    const inputTokens = estimateTokens(request.messages);
    const stateValue = dedupeSummaryState(withLlmGoalFallback(summarizeState(output.state), output));
    const responseState = extractedContinuityState(stateValue);
    const keyDecisions = arrayOfStrings(output.keyDecisions);
    const actionItems = arrayOfStrings(output.actionItems);
    const openQuestions = arrayOfStrings(output.openQuestions);
    const risks = arrayOfStrings(output.risks);
    const microFacts = strategicMicroFacts(stateValue, output);
    const compactFacts = groundedCompactFacts(stateValue, actionItems);
    const extendedFacts = [
      ...compactFacts,
      ...openQuestions.map((item) => `Open: ${item}`),
      ...risks.map((item) => `Risk: ${item}`)
    ];
    let micro = microCapsule(enforceBudget(usefulMicroCandidate(String(output.micro ?? ""), stateValue), microFacts, inputTokens, 0.16, 28));
    const compact = compactSummaryParagraph(enforceBudget("", compactFacts, inputTokens, 0.4, 50));
    const extended = extendedParagraph(enforceBudget(String(output.extended ?? output.summary ?? compact), extendedFacts, inputTokens, 0.6, 180));
    const summary = compact || micro || extended;
    let microTokens = estimateTokens(micro);
    const compactTokens = estimateTokens(compact);
    const extendedTokens = estimateTokens(extended);
    const stateTokens = estimateTokens(JSON.stringify(responseState));
    const selectedTokens = mode === "extended" ? extendedTokens : mode === "compact" ? compactTokens : microTokens;
    const totalOutputTokens = selectedTokens + stateTokens;
    const metrics = {
      inputTokens,
      compactTokens: selectedTokens,
      stateTokens,
      totalOutputTokens,
      reductionPercent: estimateReduction(inputTokens, totalOutputTokens),
      latencyMs: Date.now() - startedAt
    };
    const debugResponse = {
      mode: "debug" as const,
      summary,
      micro,
      compact,
      extended,
      state: responseState,
      keyDecisions,
      actionItems,
      openQuestions,
      risks,
      metrics,
      confidence: confidence(output.confidence)
    };
    if (mode === "debug") return debugResponse;
    if (mode === "extended") return { mode, extended, state: responseState, metrics };
    if (mode === "compact") return { mode, compact, state: responseState, metrics };
    const compactResponseTokens = estimateTokens(JSON.stringify({ mode: "compact", compact, state: responseState, metrics }));
    micro = optimizedMicroCheckpoint(micro, microFacts, inputTokens, compactResponseTokens);
    microTokens = estimateTokens(micro);
    if (microResponseTokens(micro, inputTokens) >= compactResponseTokens) {
      throw new Error("micro_optimization_check_failed");
    }
    return {
      mode: "micro",
      micro,
      metrics: {
        inputTokens,
        microTokens,
        reductionPercent: estimateReduction(inputTokens, microTokens)
      }
    };
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
      preferences: preferences.slice(0, 2),
      goals: goals.slice(0, 2)
    };
    const compactPreferences = uniqueMemoryList(preferences, micro.preferences).slice(0, 4);
    const compactGoals = uniqueMemoryList(goals, micro.goals).slice(0, 4);
    const compactTraits = uniqueMemoryList(inferredTraits, compactPreferences).slice(0, 4);
    const compact = {
      identity: identityValue,
      skills: skills.slice(0, 5),
      interests: interests.slice(0, 5),
      preferences: compactPreferences,
      goals: compactGoals,
      traits: compactTraits
    };
    const compactUsed = [
      ...compact.skills,
      ...compact.interests,
      ...compact.preferences,
      ...compact.goals,
      ...compact.traits,
      ...micro.preferences,
      ...micro.goals
    ];
    const full = {
      identity: identityValue,
      skills: uniqueMemoryList(skills, compact.skills),
      interests: uniqueMemoryList(interests, compact.interests),
      stablePreferences: uniqueMemoryList(preferences, compactUsed),
      currentGoals: uniqueMemoryList(goals, compactUsed),
      futurePlans: uniqueMemoryList(futurePlans, compactUsed),
      inferredTraits: uniqueMemoryList(inferredTraits, compactUsed),
      stableMemories: uniqueMemoryList(stableMemories, compactUsed),
      evolvingMemories: uniqueMemoryList(evolvingMemories, compactUsed)
    };

    return {
      mode: "compact",
      micro,
      compact,
      full,
      memoryFacts: facts,
      interests,
      riskTolerance: cleanMemoryText(output.riskTolerance) || "unknown",
      communicationStyle: preferences[0] ?? cleanMemoryText(output.communicationStyle) ?? "unknown",
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
    const evolvingPreferenceValues = uniqueMemoryList(output.evolvingPreferences, [...stablePreferences, ...longTermGoals]);
    const legacyEvolvingMemories = uniqueMemoryList(output.evolvingMemories, [...longTermGoals, ...evolvingPreferenceValues, ...stablePreferences, ...legacyStableMemories]);
    const deprecatedMemories = uniqueMemoryList([output.deprecatedMemories, output.supersededMemories]);
    const activeMemories = canonicalMemories(output.activeMemories, [
      ...stablePreferences.map((fact) => ({ fact, category: "preference", stability: "stable" as const, confidence: 0.95 })),
      ...legacyStableMemories.map((fact) => ({ fact, category: "memory", stability: "stable" as const, confidence: 0.85 }))
    ], "stable", deprecatedMemories) as Array<{ fact: string; category: string; stability: "stable"; confidence: number }>;
    const evolvingMemories = canonicalMemories(output.evolvingMemories, [
      ...evolvingPreferenceValues.map((fact) => ({ fact, category: "preference", stability: "evolving" as const, confidence: 0.85 })),
      ...legacyEvolvingMemories.map((fact) => ({ fact, category: "memory", stability: "evolving" as const, confidence: 0.8 }))
    ], "evolving", [...activeMemories.map((item) => item.fact), ...longTermGoals, ...deprecatedMemories]) as Array<{ fact: string; category: string; stability: "evolving"; confidence: number }>;
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

function summarizeMode(mode: ConversationRequest["mode"]): SummarizeResponse["mode"] {
  if (mode === "micro" || mode === "compact" || mode === "extended" || mode === "debug") return mode;
  return "compact";
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(cleanMemoryText).filter(Boolean) : [];
}

function confidence(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(Math.max(0.75, Math.min(0.99, number)).toFixed(2)) : 0.85;
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

function withLlmGoalFallback(stateValue: ReturnType<typeof summarizeState>, output: Record<string, unknown>) {
  if (completeGoalText(stateValue.goal)) return stateValue;
  return {
    ...stateValue,
    goal: llmGeneratedGoal(output) || stateValue.goal
  };
}

function llmGeneratedGoal(output: Record<string, unknown>) {
  const candidates = [output.micro, output.compact, output.extended, output.summary];
  for (const candidate of candidates) {
    const goal = completeGoalText(String(candidate ?? ""));
    if (goal) return goal;
  }
  return "";
}

function extractedContinuityState(stateValue: ReturnType<typeof summarizeState>) {
  const blockers = conciseStateList(stateValue.blockers, 3, 14);
  const next = conciseStateList(stateValue.nextSteps, 3, 12, blockers);
  return {
    goal: conciseGoalText(stateValue.goal) || "unknown",
    status: conciseSingleStateText(stateValue.status, 14) || "unknown",
    blockers,
    next
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
  const raw = Array.isArray(value) ? value.flatMap((item) => Array.isArray(item) ? item : [item]) : [];
  const values = raw.length > 0 ? raw.map(cleanMemoryText) : arrayOfStrings(value);
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
    if (confidenceValue < 0.75) return null;
    return {
      fact: canonicalMemoryLabel(cleanMemoryText(record.fact)),
      category: canonicalCategory(record.category),
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
      if (!key || item.confidence < 0.75 || seen.has(key)) return false;
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
      fact: canonicalMemoryLabel(cleanMemoryText(record.fact)),
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
      if (!key || item.confidence < 0.75 || blocked.has(key) || seen.has(key)) return false;
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
        return null;
      }
      const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const oldValue = canonicalMemoryLabel(cleanMemoryText(record.old) || arrayOfStrings(record.superseded)[0] || "");
      const newValue = canonicalMemoryLabel(cleanMemoryText(record.new) || cleanMemoryText(record.current));
      return {
        old: oldValue,
        new: newValue,
        reason: cleanMemoryText(record.reason) || "superseded"
      };
    })
    .filter((item): item is { old: string; new: string; reason: string } => {
      if (!item) return false;
      const key = `${normalizeMemoryFact(item.old)}:${normalizeMemoryFact(item.new)}`;
      if (!item.old || !item.new || item.old === item.new || seen.has(key)) return false;
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
  return cleanMemoryText(value)
    .replace(/^prefers?\s+/i, "")
    .replace(/^likes?\s+/i, "")
    .replace(/^dislikes?\s+/i, "avoids ")
    .replace(/^avoids?\s+meetings?$/i, "async communication")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMemoryText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return "";
  const text = normalizeSummary(String(value))
    .replace(/\b(undefined|null|nan|\[object object\])\b/gi, "")
    .replace(/^unknown$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return text;
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

function conciseStateList(items: string[], limit: number, maxWords: number, exclude: string[] = []) {
  return uniqueStrings(items)
    .filter((item) => !containsEquivalent(exclude, item))
    .sort((a, b) => statePriorityScore(b) - statePriorityScore(a))
    .map((item) => conciseSingleStateText(item, maxWords))
    .filter((item): item is string => Boolean(item))
    .filter((item, index, values) => values.findIndex((value) => containsEquivalent([value], item)) === index)
    .slice(0, limit);
}

function conciseSingleStateText(value: string, maxWords: number) {
  const cleaned = completeStateText(value);
  if (!cleaned) return "";
  if (wordCount(cleaned) <= maxWords) return cleaned.replace(/[.!?]$/, "");
  return microFragment(cleaned, maxWords) || completeTextWithinBudget(cleaned, maxWords).replace(/[.!?]$/, "");
}

function conciseGoalText(value: string) {
  const cleaned = completeGoalText(value);
  if (!cleaned) return "";
  if (wordCount(cleaned) <= 18) return cleaned;
  return microFragment(cleaned, 18) || completeTextWithinBudget(cleaned, 18).replace(/[.!?]$/, "");
}

function statePriorityScore(value: string) {
  const text = normalizeSummary(value);
  let score = 0;
  if (/\b(block|risk|limit|constraint|unresolved|missing|delay|fail|cannot|can't|must|require|only|without|deadline|budget|capacity|security|privacy|compliance|payment|charger|staff|coverage)\b/i.test(text)) score += 3;
  if (/\b(next|fix|finalize|decide|implement|verify|deploy|confirm|resolve|define|test|ship|launch)\b/i.test(text)) score += 2;
  if (wordCount(text) <= 16) score += 1;
  return score;
}

function completeStateText(value: string) {
  const cleaned = conciseStateText(value);
  if (!cleaned || cleaned === "unknown" || hasInvalidStateEnding(cleaned)) return "";
  return cleaned;
}

function completeGoalText(value: string) {
  const cleaned = normalizeSummary(value)
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\s*[,;:([–-]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^unknown$/i.test(cleaned) || hasInvalidStateEnding(cleaned)) return "";
  if (wordCount(cleaned) <= 36) return cleaned.replace(/[.!?]$/, "");

  const completeParts = splitCompleteThoughts(cleaned);
  const compact = completeParts.find((part) => wordCount(part) >= 3 && wordCount(part) <= 36);
  return compact ? compact.replace(/[.!?]$/, "") : cleaned.replace(/[.!?]$/, "");
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

function microCapsule(value: string) {
  const cleaned = normalizeSummary(value)
    .replace(/\b(Blocker|Decision|Priority|Next|Status|Goal):\s*/gi, "")
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\b(initial instruction received|core capabilities are in place|awaiting execution|work is active|execution is moving through active refinement|progress depends on resolving active issues)\b\.?/gi, "")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/(?:^|;\s*)\w+:\s*$/g, "")
    .trim();
  const trimmed = completeTextWithinBudget(sanitizeMicroParts(cleaned), 28);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function sanitizeMicroParts(value: string) {
  const parts = normalizeSummary(value)
    .split(/\s*;\s*/)
    .map((part) => normalizeSummary(part).replace(/\s*[,;:([–-]\s*$/g, ""))
    .filter((part) => part && !semanticallyBrokenMicroFragment(part));
  return uniqueMicroFacts(parts).join("; ");
}

function optimizedMicroCheckpoint(candidate: string, facts: string[], inputTokens: number, compactOutputTokens: number) {
  const candidates = [
    microCapsule(candidate),
    ...[24, 20, 16, 12, 8].map((maxTokens) => microCapsule(enforceBudget("", facts, inputTokens, 0.16, maxTokens)))
  ].filter(Boolean);

  for (const value of uniqueStrings(candidates)) {
    if (microResponseTokens(value, inputTokens) < compactOutputTokens) return value;
  }

  const shortest = microCapsule(completeTextWithinBudget(normalizeSummary(facts.filter(Boolean).join("; ")), 8));
  if (shortest && microResponseTokens(shortest, inputTokens) < compactOutputTokens) return shortest;
  return uniqueStrings(candidates).sort((a, b) => estimateTokens(a) - estimateTokens(b))[0] ?? "";
}

function microResponseTokens(micro: string, inputTokens: number) {
  const microTokens = estimateTokens(micro);
  return estimateTokens(JSON.stringify({
    mode: "micro",
    micro,
    metrics: {
      inputTokens,
      microTokens,
      reductionPercent: estimateReduction(inputTokens, microTokens)
    }
  }));
}

function usefulMicroCandidate(value: string, stateValue: ReturnType<typeof summarizeState>) {
  const cleaned = normalizeSummary(value);
  if (!cleaned || cleaned === "unknown" || semanticallyBrokenMicroFragment(cleaned)) return "";
  const stateSignals = [
    ...stateValue.blockers,
    ...stateValue.decisions,
    ...stateValue.priorities,
    ...stateValue.nextSteps
  ].map(normalizeComparable).filter(Boolean);
  const candidate = normalizeComparable(cleaned);
  const goal = normalizeComparable(stateValue.goal);
  const hasOperationalSignal = stateSignals.some((signal) => signal && (candidate.includes(signal) || signal.includes(candidate)));
  const hasCapsuleSeparators = /[;:|]/.test(cleaned);
  const isGoalOnly = Boolean(goal) && (candidate === goal || goal.includes(candidate) || candidate.includes(goal)) && !hasOperationalSignal;
  const isTooGeneric = wordCount(cleaned) <= 5 || /^(generate|build|create|summarize|analyze|plan)\b.{0,40}$/i.test(cleaned);
  const isTooLong = estimateTokens(cleaned) > 28 || wordCount(cleaned) > 32;
  const hasFiller = /\b(initial instruction received|core capabilities are in place|awaiting execution|work is active|execution is moving through active refinement|progress depends on resolving active issues)\b/i.test(cleaned);
  if (isTooLong || hasFiller) return "";
  return hasOperationalSignal || hasCapsuleSeparators ? cleaned : isGoalOnly || isTooGeneric ? "" : cleaned;
}

function strategicMicroFacts(stateValue: ReturnType<typeof summarizeState>, output: Record<string, unknown>) {
  const goal = microFragment(stateValue.goal, 7);
  const goalLike = [goal, stateValue.goal].filter(Boolean);
  const worldview = selectWorldviewFragments([
    stateValue.status,
    ...stateValue.blockers,
    ...stateValue.decisions,
    ...stateValue.priorities,
    ...stateValue.nextSteps
  ].filter((item) => !containsEquivalent(goalLike, item)), 1, 6);
  const constraints = selectStrategicFragments([
    ...stateValue.blockers,
    ...stateValue.decisions,
    ...stateValue.priorities
  ].filter((item) => !containsEquivalent(goalLike, item)), 2, 6);
  const next = microFragment(stateValue.nextSteps.find((item) => !containsEquivalent([...goalLike, ...constraints], item)) ?? "", 4);
  const llmMicro = usefulMicroCandidate(String(output.micro ?? ""), stateValue);
  return uniqueMicroFacts([
    goal,
    ...worldview.map((item) => `ctx:${item}`),
    ...constraints.map((item) => `no:${item}`),
    next ? `next:${next}` : "",
    llmMicro
  ]).filter((item) => item && item !== "unknown");
}

function selectWorldviewFragments(items: string[], limit: number, maxWords: number) {
  return uniqueStrings(items)
    .filter((item) => /(fragmented|chaos|unstable|informal|voice|memory-based|smb|offline|unreliable|infrastructure|workflow|operational|local|non-generic|iran|constraint|worldview|assumption)/i.test(item))
    .map((item) => microFragment(item, maxWords))
    .filter(Boolean)
    .slice(0, limit);
}

function selectStrategicFragments(items: string[], limit: number, maxWords: number) {
  const strategic = uniqueStrings(items)
    .filter((item) => /(must|never|avoid|forbid|without|constraint|require|only|not|reject|anti|generic|clone|consumer|sv|focus|assumption|worldview|frame|risk|block|limit|preserve|optimi[sz]e)/i.test(item))
    .concat(uniqueStrings(items));
  return uniqueStrings(strategic)
    .map((item) => microFragment(item, maxWords))
    .filter(Boolean)
    .slice(0, limit);
}

function microFragment(value: string, maxWords: number) {
  const cleaned = normalizeSummary(value)
    .replace(/\b(the|a|an|this|that|these|those)\b\s*/gi, "")
    .replace(/\b(should|must|needs? to|need to|has to|have to)\b\s*/gi, "")
    .replace(/\b(do not|don't|cannot|can't|must not)\b/gi, "No")
    .replace(/\bunless\s+(completely|fully|clearly|explicitly)\b/gi, "")
    .replace(/\b(in order to|so that|because|since)\b.*$/gi, "")
    .replace(/\b(initial instruction received|core capabilities are in place|awaiting execution|work is active)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned === "unknown" || semanticallyBrokenMicroFragment(cleaned)) return "";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    const fragment = cleaned.replace(/[.!?]$/, "");
    return semanticallyBrokenMicroFragment(fragment) ? "" : fragment;
  }
  const selected = words.slice(0, maxWords);
  while (selected.length > 1 && endsWithDanglingWord(selected.join(" "))) {
    selected.pop();
  }
  const fragment = selected.join(" ").replace(/\s*[,;:([–-]\s*$/g, "");
  return semanticallyBrokenMicroFragment(fragment) ? "" : fragment;
}

function semanticallyBrokenMicroFragment(value: string) {
  const text = normalizeSummary(value);
  if (!text || wordCount(text) < 2) return true;
  if (/^(unless|because|since|while|after|before|without|within|into|between|from|to|for|and|or)\b/i.test(text)) return true;
  if (endsWithDanglingWord(text)) return true;
  if (/,\s*(decrease|increase|reduce|improve|optimi[sz]e|minimi[sz]e|maximi[sz]e|stabili[sz]e|resolve|finali[sz]e|implement|define|confirm|verify)$/i.test(text)) return true;
  return /\b(unless|because|since|while|after|before|without|within|into|between|from|to|for|and|or)\s*$/i.test(text);
}

function uniqueMicroFacts(items: string[]) {
  const result: string[] = [];
  for (const item of items) {
    const normalized = normalizeMicroFact(item);
    if (!normalized) continue;
    if (result.some((existing) => {
      const existingNormalized = normalizeMicroFact(existing);
      return existingNormalized === normalized || existingNormalized.includes(normalized) || normalized.includes(existingNormalized);
    })) continue;
    result.push(item);
  }
  return result;
}

function normalizeMicroFact(value: string) {
  return normalizeComparable(value.replace(/^(ctx|no|next):\s*/i, ""));
}

function compactSummaryParagraph(value: string) {
  const withoutFiller = normalizeSummary(value)
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\b(core capabilities are in place|the primary risk is|phase is complete|work is active|awaiting execution|execution is moving through active refinement|progress depends on resolving active issues)\b\.?/gi, "")
    .replace(/[|]+/g, "; ")
    .replace(/\s*;\s*/g, "; ");
  const trimmed = completeTextWithinBudget(withoutFiller, 50);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function groundedCompactFacts(stateValue: ReturnType<typeof summarizeState>, actionItems: string[]) {
  const goal = compactFactText(stateValue.goal, 12);
  const status = compactStatusText(stateValue.status);
  const blockers = selectGroundedCompactItems(stateValue.blockers, 2, 9);
  const decisions = selectGroundedCompactItems(stateValue.decisions, 1, 9, blockers);
  const next = selectGroundedCompactItems([...stateValue.nextSteps, ...actionItems], 2, 7, [...blockers, ...decisions]);

  return uniqueStrings([
    goal ? `Goal: ${goal}` : "",
    status ? `Status: ${status}` : "",
    blockers.length ? `Open: ${blockers.join(", ")}` : "",
    decisions.length ? `Decisions: ${decisions.join(", ")}` : "",
    next.length ? `Next: ${next.join(", ")}` : ""
  ]).filter(Boolean);
}

function compactFactText(value: string, maxWords: number) {
  const text = normalizeSummary(value)
    .replace(/\b(because|since|therefore|so that|in order to)\b.*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === "unknown") return "";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords && !endsWithDanglingWord(text)) return text.replace(/[.!?]$/, "");
  const selected = words.slice(0, maxWords);
  while (selected.length > 1 && endsWithDanglingWord(selected.join(" "))) selected.pop();
  return selected.join(" ").replace(/\s*[,;:([–-]\s*$/g, "");
}

function compactStatusText(status: string) {
  const text = compactFactText(status, 9);
  if (!text || /^(work active|active|in progress|initial instruction received|awaiting execution|core capabilities)$/i.test(text)) return "";
  if (/\b(core capabilities are in place|phase is complete|work is active|awaiting execution)\b/i.test(text)) return "";
  return text;
}

function selectGroundedCompactItems(items: string[], limit: number, maxWords: number, exclude: string[] = []) {
  const selected: string[] = [];
  for (const item of uniqueStrings(items)) {
    if (exclude.some((existing) => containsEquivalent([existing], item))) continue;
    const text = compactFactText(item, maxWords);
    if (!text || selected.some((existing) => containsEquivalent([existing], text))) continue;
    selected.push(text);
    if (selected.length >= limit) break;
  }
  return selected;
}

function summarizeCategories(items: string[]) {
  const text = items.join(" ").toLowerCase();
  const categories: string[] = [];
  if (/(performance|latency|slow|query|memory|scale|optimization)/.test(text)) categories.push("performance");
  if (/(onboarding|signup|login|activation|guide|getting started)/.test(text)) categories.push("onboarding");
  if (/(enterprise|sso|soc2|security|audit|compliance)/.test(text)) categories.push("enterprise readiness");
  if (/(infra|infrastructure|docker|postgres|nginx|deploy|hosting|server)/.test(text)) categories.push("infrastructure");
  if (/(docs|documentation|readme|reference)/.test(text)) categories.push("documentation");
  if (/(payment|billing|x402|bankr|revenue)/.test(text)) categories.push("payments");
  if (/(api|sdk|endpoint|schema|contract)/.test(text)) categories.push("API reliability");
  if (categories.length === 0 && items.length > 0) categories.push("execution follow-through");
  return uniqueStrings(categories).slice(0, 3);
}

function formatCategoryList(categories: string[]) {
  const values = uniqueStrings(categories).filter(Boolean);
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
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
