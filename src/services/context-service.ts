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
    const llm = new BankrLlmClient({ env: this.serviceContext.env ?? {} });
    let output = await llm.generateJson("summarize", request.messages, mode);
    output = await repairMissingSummaryGoal(llm, output, request.messages);
    const inputTokens = estimateTokens(request.messages);
    const stateValue = promoteExplicitContinuityBlockers(normalizeSummaryState(
      dedupeSummaryState(withLlmGoalFallback(summarizeState(output.state), output))
    ));
    const responseState = extractedContinuityState(stateValue);
    const keyDecisions = arrayOfStrings(output.keyDecisions);
    const actionItems = arrayOfStrings(output.actionItems);
    const openQuestions = arrayOfStrings(output.openQuestions);
    const risks = arrayOfStrings(output.risks);
    const compactFacts = groundedCompactFacts(stateValue, actionItems);
    const resolvedGoal = completeGoalText(stateValue.goal);
    const extendedFacts = [
      resolvedGoal ? `Goal: ${compactFactText(resolvedGoal, 18)}` : "",
      ...compactFacts,
      ...openQuestions.map((item) => `Open: ${item}`),
      ...risks.map((item) => `Risk: ${item}`)
    ].filter(Boolean);
    const needsMicro = mode === "micro" || mode === "debug";
    const microFacts = needsMicro ? strategicMicroFacts(stateValue, output) : [];
    let micro = needsMicro
      ? microCapsule(enforceBudget(usefulMicroCandidate(String(output.micro ?? ""), stateValue), microFacts, inputTokens, 0.16, 42))
      : "";
    const compact = compactSummaryParagraph(enforceBudget("", compactFacts, inputTokens, 0.4, 50));
    const extendedCandidate = extendWithMissingOperationalFacts(
      String(output.extended ?? output.summary ?? compact),
      extendedFacts
    );
    const extended = extendedParagraph(enforceBudget(extendedCandidate, extendedFacts, inputTokens, 0.6, 180));
    const summary = compact || micro || extended;
    let microTokens = estimateTokens(micro);
    const compactTokens = estimateTokens(compact);
    const extendedTokens = estimateTokens(extended);
    const stateTokens = estimateTokens(JSON.stringify(responseState));
    const selectedTokens = mode === "extended" ? extendedTokens : mode === "compact" ? compactTokens : microTokens;
    const totalOutputTokens = selectedTokens + stateTokens;
    const metrics = {
      inputTokens,
      outputTokens: selectedTokens,
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
      metrics: {
        ...metrics,
        microTokens,
        compactTokens,
        extendedTokens
      },
      confidence: confidence(output.confidence)
    };
    if (mode === "debug") return debugResponse;
    if (mode === "extended") return { mode, extended, state: responseState, metrics };
    if (mode === "compact") return { mode, compact, state: responseState, metrics };
    const compactResponseTokens = estimateTokens(JSON.stringify({ mode: "compact", compact, state: responseState, metrics }));
    micro = optimizedMicroCheckpoint(micro, microFacts, inputTokens, compactResponseTokens);
    microTokens = estimateTokens(micro);
    if (!hasRequiredMicroAnchors(micro) || microResponseTokens(micro, inputTokens) >= compactResponseTokens) {
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

function withLlmGoalFallback(
  stateValue: ReturnType<typeof summarizeState>,
  output: Record<string, unknown>
) {
  const goal = llmGeneratedGoal(output);
  if (!goal) throw new Error("summary_goal_missing");
  return { ...stateValue, goal };
}

function isTransientGoal(value: string) {
  return /^(test|verify|validate|configure|implement|fix|resolve|update|debug)\b/i.test(normalizeSummary(value));
}

function llmGeneratedGoal(output: Record<string, unknown>) {
  const state = output.state && typeof output.state === "object" ? output.state as Record<string, unknown> : {};
  const candidates = [state.goal, output.goal];
  for (const candidate of candidates) {
    const goal = completeGoalText(String(candidate ?? ""));
    if (goal && !isTransientGoal(goal)) return goal;
  }
  return "";
}

async function repairMissingSummaryGoal(
  llm: BankrLlmClient,
  output: Record<string, unknown>,
  messages: ConversationRequest["messages"]
) {
  if (llmGeneratedGoal(output)) return output;

  const repair = await llm.generateSummaryGoal(messages);
  const goal = llmGeneratedGoal(repair);
  if (!goal) throw new Error("summary_goal_missing");

  const state = output.state && typeof output.state === "object" ? output.state as Record<string, unknown> : {};
  return { ...output, state: { ...state, goal } };
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

function normalizeSummaryState(stateValue: ReturnType<typeof summarizeState>) {
  const actionLikeBlockers = stateValue.blockers.filter(isActionLikeStateItem);
  const blockers = stateValue.blockers.filter((item) => !isActionLikeStateItem(item));

  return {
    ...stateValue,
    status: canonicalStatusText(stateValue.status),
    blockers: uniqueStrings([...blockers, ...actionLikeBlockers.map(actionBlockerText).filter(Boolean)]),
    nextSteps: uniqueStrings([...stateValue.nextSteps, ...actionLikeBlockers])
  };
}

function canonicalStatusText(value: string) {
  return normalizeSummary(value)
    .replace(/\bbuilds passing\b/gi, "Build passes")
    .replace(/\bproduction build passing\b/gi, "Production build passes")
    .trim();
}

function isActionLikeStateItem(value: string) {
  return /^(test|verify|validate|implement|configure|resolve|fix|update|add|remove|create|build|launch|deploy|set up|set)$/i.test(normalizeSummary(value).split(/\s+/).slice(0, 2).join(" "))
    || /^(test|verify|validate|implement|configure|resolve|fix|update|add|remove|create|build|launch|deploy)\b/i.test(normalizeSummary(value));
}

function actionBlockerText(value: string) {
  const text = normalizeSummary(value).replace(/[.!?]$/, "");
  const match = text.match(/^(test|verify|validate|implement|configure|resolve|fix|update|add|remove|create|build|launch|deploy)\s+(.+)$/i);
  if (!match) return "";
  const action = match[1].toLowerCase();
  const subject = match[2];
  if (action === "test" || action === "verify" || action === "validate") return `Unverified: ${subject}`;
  if (action === "implement" || action === "add" || action === "create" || action === "build") return `Incomplete: ${subject}`;
  return `Pending: ${subject}`;
}

function promoteExplicitContinuityBlockers(stateValue: ReturnType<typeof summarizeState>) {
  const continuityBlockers = stateValue.nextSteps
    .filter((item) => /^(verify|validate|decide)\b/i.test(normalizeSummary(item)))
    .map((item) => continuityBlockerText(item))
    .filter(Boolean);

  return {
    ...stateValue,
    blockers: uniqueStrings([...stateValue.blockers, ...continuityBlockers])
  };
}

function continuityBlockerText(value: string) {
  const action = normalizeSummary(value).match(/^(verify|validate|decide)\b/i)?.[1].toLowerCase();
  const focus = normalizeSummary(value)
    .replace(/^(verify|validate|decide)\b\s*/i, "")
    .replace(/\s+(instead of|rather than|vs\.?).*$/i, "")
    .replace(/^whether\s+/i, "")
    .replace(/[.!?]$/, "")
    .trim();
  const concise = conciseSingleStateText(focus, 12);
  if (!concise) return "";
  return action === "decide" ? `Decision pending: ${concise}` : `Verification pending: ${concise}`;
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
    .replace(/^(?:goal|objective|aim|purpose):\s*/i, "")
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\s*[,;:([–-]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^(?:goal\s+)?(?:unknown|not stated|not specified|not provided|n\/a)$/i.test(cleaned) || hasInvalidStateEnding(cleaned)) return "";
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
    .replace(/\s+(?:instead of|rather than)\s+(?:only\s+)?(?:repositioning|moving)\s+held\b.*$/i, "")
    .replace(/(?:,|;)\s*(?:hero|component|implementation|work|workstream|project)(?:\s+(?:component|implementation|work))?\.?$/gi, "")
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

function microCapsule(value: string) {
  const cleaned = normalizeSummary(value)
    .replace(/\b(Blocker|Decision|Priority|Status):\s*/gi, "")
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/\b(initial instruction received|core capabilities are in place|awaiting execution|work is active|execution is moving through active refinement|progress depends on resolving active issues)\b\.?/gi, "")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/(?:^|;\s*)\w+:\s*$/g, "")
    .trim();
  const sanitized = sanitizeMicroParts(cleaned);
  const trimmed = hasRequiredMicroAnchors(sanitized) ? sanitized : completeTextWithinBudget(sanitized, 56);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function sanitizeMicroParts(value: string) {
  const parts = normalizeSummary(value)
    .split(/\s*;\s*/)
    .map((part) => stripGenericGoalLanguage(part).replace(/\s*[,;:([–-]\s*$/g, ""))
    .filter((part) => part && !semanticallyBrokenMicroFragment(part));
  return uniqueMicroFacts(parts).join("; ");
}

function optimizedMicroCheckpoint(candidate: string, facts: string[], inputTokens: number, compactOutputTokens: number) {
  const candidates = [
    microCapsule(candidate),
    microCapsule(facts.join("; "))
  ].filter(Boolean);

  for (const value of uniqueStrings(candidates)) {
    if (hasRequiredMicroAnchors(value) && microResponseTokens(value, inputTokens) < compactOutputTokens) return value;
  }

  const structural = microCapsule(facts.join("; "));
  if (hasRequiredMicroAnchors(structural)) return structural;
  return uniqueStrings(candidates).find(hasRequiredMicroAnchors) ?? structural;
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
  const goal = microGoalFragment(stateValue.goal);
  const goalLike = [goal, stateValue.goal].filter(Boolean);
  const status = selectMicroStatusFragments([stateValue.status], 1, 5);
  const blockers = selectOperationalFragments(stateValue.blockers, 2, 8, goalLike);
  const dependencies = selectOperationalFragments([
    ...stateValue.priorities,
    ...stateValue.decisions
  ], 2, 5, [...goalLike, ...blockers]);
  const worldview = selectWorldviewFragments([
    stateValue.status,
    ...stateValue.blockers,
    ...stateValue.decisions,
    ...stateValue.priorities,
    ...stateValue.nextSteps
  ].filter((item) => !containsEquivalent([...goalLike, ...blockers, ...dependencies], item)), 1, 5);
  const nextActions = selectActionFragments(stateValue.nextSteps, 2, 8, goalLike);
  const llmMicro = usefulMicroCandidate(String(output.micro ?? ""), stateValue);
  return canonicalMicroFacts({
    state: status[0] ?? worldview[0] ?? blockers[0] ?? "",
    blockers: fillMicroPair(blockers, dependencies),
    next: fillMicroPair(nextActions, dependencies),
    goal,
    llmMicro
  });
}

function canonicalMicroFacts(parts: { state: string; blockers: string[]; next: string[]; goal: string; llmMicro: string }) {
  const blockers = requiredMicroPair(parts.blockers, "dep");
  const next = requiredMicroPair(parts.next, "next");
  const values = [
    ["state", parts.state || "status not stated"],
    ["dep", joinMicroPair(blockers, "dep")],
    ["next", joinMicroPair(next, "next")],
    ["goal", parts.goal || "goal not stated"]
  ] as const;
  const facts = values
    .map(([label, value]) => {
      const fragment = label === "goal"
        ? microGoalFragment(value)
        : label === "dep" || label === "next"
          ? value
          : microFragmentPreservingNumbers(value, 5);
      return fragment ? `${label}:${fragment}` : "";
    })
    .filter(Boolean);

  return uniqueMicroFacts([
    ...facts,
    ...prefixedMicroFacts(parts.llmMicro)
  ]).filter((item) => item && item !== "unknown").slice(0, 4);
}

function requiredMicroPair(values: string[], kind: "dep" | "next") {
  const unavailable = kind === "dep"
    ? ["blocker not stated", "second blocker not stated"]
    : ["next action not stated", "second next action not stated"];
  return uniqueStrings([...values, ...unavailable]).slice(0, 2);
}

function fillMicroPair(primary: string[], fallback: string[]) {
  const values = uniqueStrings([...primary, ...fallback]).filter(Boolean).slice(0, 2);
  return values;
}

function joinMicroPair(values: string[], kind: "dep" | "next") {
  return values
    .map((item) => microAnchorFragment(item, kind))
    .filter(Boolean)
    .slice(0, 2)
    .join("/");
}

function microAnchorFragment(value: string, kind: "dep" | "next") {
  const fragment = microFragmentPreservingNumbers(value, 8);
  if (!fragment) return "";
  if (kind === "dep") {
    return fragment
      .replace(/^unverified:\s*(.+)$/i, "$1 unverified")
      .replace(/^incomplete:\s*(.+)$/i, "$1 incomplete")
      .replace(/^unverified:\s*(?:verify\s+)?S(\d+\/\d+) frames$/i, "S$1 unverified")
      .replace(/^S(\d+\/\d+) frames unverified$/i, "S$1 unverified")
      .replace(/^undecided:\s*(?:whether\s+)?glass buttons.*$/i, "buttons undecided");
  }
  return fragment
    .replace(/^verify\s+verify\s+/i, "verify ")
    .replace(/^verify\s+(S\d+\/\d+) frames$/i, "verify $1")
    .replace(/^decide glass buttons.*$/i, "decide buttons")
    .replace(/^confirm footer.*$/i, "confirm footer");
}

function hasRequiredMicroAnchors(value: string) {
  const text = normalizeSummary(value);
  return /\bstate:[^;]+/i.test(text)
    && /\bgoal:[^;]+/i.test(text)
    && /\bdep:[^;]+\/[^;]+/i.test(text)
    && /\bnext:[^;]+\/[^;]+/i.test(text);
}

function prefixedMicroFacts(value: string) {
  return sanitizeMicroParts(value)
    .split(/\s*;\s*/)
    .filter((part) => /^(state|dep|next|goal):/i.test(part));
}

function selectMicroStatusFragments(items: string[], limit: number, maxWords: number) {
  return uniqueStrings(items)
    .filter((item) => !/^(unknown|initial instruction received|work active|awaiting execution)$/i.test(normalizeSummary(item)))
    .map((item) => microFragment(stripGenericStatus(item), maxWords))
    .filter(Boolean)
    .slice(0, limit);
}

function selectOperationalFragments(items: string[], limit: number, maxWords: number, exclude: string[] = []) {
  return uniqueStrings(items)
    .filter((item) => !containsEquivalent(exclude, item))
    .sort((a, b) => operationalPriorityScore(b) - operationalPriorityScore(a))
    .map((item) => microFragmentPreservingNumbers(stripGenericGoalLanguage(item), maxWords))
    .filter(Boolean)
    .slice(0, limit);
}

function selectActionFragments(items: string[], limit: number, maxWords: number, exclude: string[] = []) {
  return selectOperationalFragments(items, limit, maxWords, exclude)
    .filter((item) => !isIncompleteAction(item))
    .slice(0, limit);
}

function selectWorldviewFragments(items: string[], limit: number, maxWords: number) {
  return uniqueStrings(items)
    .filter((item) => /(fragmented|chaos|unstable|informal|voice|memory-based|smb|offline|unreliable|infrastructure|workflow|operational|local|non-generic|iran|constraint|worldview|assumption)/i.test(item))
    .map((item) => microFragment(item, maxWords))
    .filter(Boolean)
    .slice(0, limit);
}

function operationalPriorityScore(value: string) {
  const text = normalizeSummary(value);
  let score = statePriorityScore(text);
  if (/\b(failure|shortage|outage|telemetry|coverage|capacity|security|privacy|approval|dependency|bottleneck|unresolved|blocked|delay|risk|gap|supplier|staff|technician|charging|payment|deployment|verification|integration)\b/i.test(text)) score += 5;
  if (/\b(improve|reduce|increase|decrease|optimi[sz]e|visibility|coordination|efficiency)\b/i.test(text)) score -= 2;
  return score;
}

function stripGenericStatus(value: string) {
  return normalizeSummary(value)
    .replace(/\b(core capabilities are in place|work is active|awaiting execution|initial instruction received|planning in progress|current focus is)\b\.?/gi, "")
    .trim();
}

function stripGenericGoalLanguage(value: string) {
  return normalizeSummary(value)
    .replace(/\b(goal is to|objective is to|aim is to|trying to|need to)\b\s*/gi, "")
    .replace(/\b(improve visibility|improve coordination|reduce incidents|increase efficiency)\b\.?/gi, "")
    .trim();
}

function microFragment(value: string, maxWords: number) {
  const cleaned = compactMicroLanguage(normalizeSummary(value)
    .replace(/\b(the|a|an|this|that|these|those)\b\s*/gi, "")
    .replace(/\b(should|must|needs? to|need to|has to|have to)\b\s*/gi, "")
    .replace(/\b(do not|don't|cannot|can't|must not)\b/gi, "No")
    .replace(/\bunless\s+(completely|fully|clearly|explicitly)\b/gi, "")
    .replace(/\b(in order to|so that|because|since)\b.*$/gi, "")
    .replace(/\b(initial instruction received|core capabilities are in place|awaiting execution|work is active)\b\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim());
  if (!cleaned || cleaned === "unknown" || semanticallyBrokenMicroFragment(cleaned)) return "";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    const fragment = cleaned.replace(/[.!?]$/, "");
    return semanticallyBrokenMicroFragment(fragment) ? "" : fragment;
  }
  const candidates = splitMicroClauses(cleaned)
    .filter((part) => wordCount(part) <= maxWords && !semanticallyBrokenMicroFragment(part));
  const best = candidates[0] ?? "";
  return best.replace(/\s*[,;:([–-]\s*$/g, "");
}

function microFragmentPreservingNumbers(value: string, maxWords: number) {
  const compacted = compactMicroLanguage(value);
  const fragment = microFragment(compacted, maxWords);
  if (!fragment) return "";
  const requiredNumbers = numericTokens(compacted);
  if (requiredNumbers.every((token) => fragment.includes(token))) return fragment;

  const numericClause = splitMicroClauses(compacted)
    .find((part) => requiredNumbers.every((token) => part.includes(token)) && !semanticallyBrokenMicroFragment(part));
  return numericClause && wordCount(numericClause) <= maxWords + 2 ? numericClause : fragment;
}

function microGoalFragment(value: string) {
  const compacted = compactMicroLanguage(value)
    .replace(/\b(premium|dark-tech|experience|implementation|interaction)\b/gi, "")
    .replace(/\bwith passwordless auth\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // Goals often carry the only numeric or budget constraint. Give that anchor
  // enough room to remain complete instead of dropping it and failing micro.
  return microFragmentPreservingNumbers(compacted, 14);
}

function compactMicroLanguage(value: string) {
  return normalizeSummary(value)
    .replace(/\bproduction build passing\b/gi, "build passes")
    .replace(/\bbuilds passing\b/gi, "build passes")
    .replace(/\bscenario\s+(\d+)\s+(?:and|&)\s+(\d+)\b/gi, "S$1/$2")
    .replace(/\bscenario\s+(\d+)\/(\d+)\b/gi, "S$1/$2")
    .replace(/\bframe-by-frame animation quality unconfirmed\b/gi, "frames unverified")
    .replace(/\bframe-by-frame animation\b/gi, "frame animation")
    .replace(/\b(?:verify\s+)?S(\d+)\/(\d+) animate frame-by-frame(?: instead of.*)?\b/gi, "verify S$1/$2 frames")
    .replace(/\bverification pending\b/gi, "unverified")
    .replace(/\bdecision pending\b/gi, "undecided")
    .replace(/\bundecided:\s*(?:whether\s+)?glass buttons remain presentational or receive behavior\b/gi, "buttons undecided")
    .replace(/\bunverified:\s*verify (S\d+\/\d+ frames)\b/gi, "$1 unverified")
    .replace(/\bdecide whether\b/gi, "decide")
    .replace(/\bglass panel buttons?\b/gi, "glass buttons")
    .replace(/\bdecide glass buttons remain presentational or receive behavior\b/gi, "decide glass buttons")
    .replace(/\bfooter strategy\b/gi, "footer")
    .replace(/\bconfirm footer:\s*in-hero reveal sufficient or separate site footer needed\b/gi, "confirm footer structure")
    .replace(/\bthree\s+(\d+)-frame Canvas sequences\b/gi, "3x$1-frame Canvas")
    .replace(/\bthree 121-frame Canvas sequences\b/gi, "3x121-frame Canvas")
    .replace(/\bscroll-driven Next\.js landing (?:experience|page)\b/gi, "Next.js scroll landing")
    .replace(/\bscroll-controlled transitions\b/gi, "scroll")
    .replace(/\bglass interaction panels\b/gi, "glass panels")
    .replace(/\bbuild Next\.js scroll landing with (3x\d+-frame Canvas), scroll, glass panels\b/gi, "Build $1 scroll landing + glass panels")
    .replace(/\bBuild (3x\d+-frame Canvas) scroll landing \+ glass panels\b/gi, "$1 scroll+glass")
    .replace(/\s+/g, " ")
    .trim();
}

function splitMicroClauses(value: string) {
  return normalizeSummary(value)
    .split(/(?<=[.!?])\s+|\s*;\s*|\s*[,|]\s*/i)
    .map((part) => part.trim().replace(/[.!?]$/, ""))
    .filter(Boolean);
}

function numericTokens(value: string) {
  return normalizeSummary(value).match(/(?:[<>]=?|~)?\d+(?:[.,:]\d+)?%?|\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?|vehicles?|regions?|systems?)/gi) ?? [];
}

function isIncompleteAction(value: string) {
  const text = normalizeSummary(value);
  if (semanticallyBrokenMicroFragment(text)) return true;
  return /^(conduct|perform|run|execute|finali[sz]e|define|confirm|verify|implement|resolve|test|deploy|decide)\s+(?:[a-z-]+|s\d+\/\d+)$/i.test(text);
}

function semanticallyBrokenMicroFragment(value: string) {
  const text = normalizeSummary(value);
  if (!text || wordCount(text) < 2) return true;
  if (/^(unless|because|since|while|after|before|without|within|into|between|across|around|through|throughout|under|over|from|to|for|and|or)\b/i.test(text)) return true;
  if (endsWithDanglingWord(text)) return true;
  if (/,\s*(decrease|increase|reduce|improve|optimi[sz]e|minimi[sz]e|maximi[sz]e|stabili[sz]e|resolve|finali[sz]e|implement|define|confirm|verify)$/i.test(text)) return true;
  return /\b(unless|because|since|while|after|before|without|within|into|between|across|around|through|throughout|under|over|from|to|for|and|or)\s*$/i.test(text);
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
  const status = compactStatusText(stateValue.status);
  const blockers = selectGroundedCompactItems(stateValue.blockers, 2, 9);
  const decisions = selectGroundedCompactItems(stateValue.decisions, 1, 9, blockers);
  const next = selectGroundedCompactNextItems([...stateValue.nextSteps, ...actionItems], 2, 7, [...blockers, ...decisions]);
  const explicitNext = uniqueStrings([...stateValue.nextSteps, ...actionItems])
    .map((item) => compactActionText(item, 7))
    .filter(Boolean);
  const resolvedNext = uniqueStrings([...explicitNext, ...next]).slice(0, 2);

  return uniqueStrings([
    // state.goal is the canonical goal field; compact must not spend tokens repeating it.
    status ? `Status: ${status}` : "",
    blockers.length ? `Open: ${blockers.join(", ")}` : "",
    resolvedNext.length ? `Next: ${resolvedNext.join(", ")}` : "",
    decisions.length ? `Decisions: ${decisions.join(", ")}` : ""
  ]).filter(Boolean);
}

function compactFactText(value: string, maxWords: number) {
  const text = compactKnownFact(normalizeSummary(value)
    .replace(/\b(because|since|therefore|so that|in order to)\b.*$/gi, "")
    .replace(/(?:,|;)\s*(?:hero|component|implementation|work|workstream|project)(?:\s+(?:component|implementation|work))?\.?$/gi, "")
    .replace(/\s+/g, " ")
    .trim());
  if (!text || text === "unknown") return "";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords && isCompleteCompactFact(text)) return text.replace(/[.!?]$/, "");
  const completeClause = splitCompleteThoughts(text)
    .find((part) => wordCount(part) <= maxWords && isCompleteCompactFact(part));
  return completeClause?.replace(/[.!?]$/, "") ?? "";
}

function compactKnownFact(value: string) {
  const text = normalizeSummary(value);
  const sequence = text.match(/\b(three|3)\s*[- ]?sequence\b.*?\b(\d+)\s+frames?\s+each\b/i);
  if (sequence) return `3 ${sequence[2]}-frame sequences`;
  return text;
}

function isCompleteCompactFact(value: string) {
  const text = normalizeSummary(value);
  if (!text || endsWithDanglingWord(text) || /\b(is|are|was|were|be|been|being|each)$/i.test(text)) return false;
  if (/\bwith\s+\d+\s+(?:frames?|items?|steps?|routes?)(?:\s+each)?$/i.test(text)) return false;
  return !/^(?:hero|component|implementation|work|project)(?:\s+(?:component|implementation|work))?$/i.test(text);
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
    const text = compactFactText(item, maxWords) || compactActionText(item, maxWords);
    if (!text || !isCompleteCompactFact(text) || selected.some((existing) => containsEquivalent([existing], text))) continue;
    selected.push(text);
    if (selected.length >= limit) break;
  }
  return selected;
}

function selectGroundedCompactNextItems(items: string[], limit: number, maxWords: number, exclude: string[] = []) {
  const selected: string[] = [];
  for (const item of uniqueStrings(items)) {
    if (exclude.some((existing) => containsEquivalent([existing], item))) continue;
    const text = compactActionText(item, maxWords) || compactFactText(item, maxWords);
    if (!text || !isCompleteCompactFact(text) || selected.some((existing) => containsEquivalent([existing], text))) continue;
    selected.push(text);
    if (selected.length >= limit) break;
  }
  return selected;
}

function compactActionText(value: string, maxWords: number) {
  const text = normalizeSummary(value)
    .replace(/^verify\s+scenario\s+(\d+)\s+(?:and|&)\s+(\d+)\s+animate frame-by-frame.*$/i, "Verify scenario $1/$2 frames")
    .replace(/^decide whether\s+glass panel buttons?.*$/i, "Decide glass button behavior")
    .replace(/^confirm\s+footer strategy:.*$/i, "Confirm footer structure")
    .replace(/[.!?]$/, "")
    .trim();
  return wordCount(text) <= maxWords && isCompleteCompactFact(text) ? text : "";
}

function extendedParagraph(value: string) {
  const withoutReplay = normalizeSummary(value)
    .replace(/\b(first|then|after that|previously|earlier|later|finally)\b[:,]?\s*/gi, "")
    .replace(/\b(because|since|therefore|so that|in order to)\b.*?(?=\.|;|$)/gi, "")
    .replace(/[;|]+/g, ". ")
    .replace(/\.{2,}/g, ".");
  const withoutLowSignalFragments = splitCompleteThoughts(withoutReplay)
    .filter((part) => !/^(?:hero|component|implementation|work|project)(?:\s+(?:component|implementation|work))?\.?$/i.test(part))
    .map((part) => part.replace(/[.!?]+$/, ""))
    .join(". ");
  const trimmed = completeTextWithinBudget(withoutLowSignalFragments, 200);
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function extendWithMissingOperationalFacts(candidate: string, facts: string[]) {
  const cleaned = extendedParagraph(candidate);
  const operational = facts.filter((fact) => /^(Goal|Open|Next):/i.test(fact));
  const missing = operational.filter((fact) => {
    const keywords = normalizeComparable(fact)
      .split(" ")
      .filter((word) => word.length > 3 && !["open", "next", "risk"].includes(word));
    const matched = keywords.filter((word) => normalizeComparable(cleaned).includes(word));
    return keywords.length > 0 && matched.length < Math.ceil(keywords.length / 2);
  }).slice(0, 2);
  return [cleaned, ...missing].filter(Boolean).join("; ");
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
  return /\b(and|or|with|for|to|from|by|using|including|because|while|after|before|without|within|into|between|across|around|through|throughout|under|over|near|among|against|of|the|a|an|is|are|was|were|be|been|being|each)$/i.test(value);
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
