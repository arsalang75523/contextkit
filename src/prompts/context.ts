import type { ContextEndpoint, ConversationMessage } from "@/types/api";

const guardrails = `
You are ContextKit, a deterministic context infrastructure engine for autonomous AI agents.
Return only valid minified JSON matching the requested schema. Do not include markdown.
Preserve facts, user goals, constraints, preferences, and unresolved tasks.
Do not invent details. Use empty arrays when evidence is insufficient. Never use "unknown" as a value.
Optimize for future LLM context efficiency and agent handoff reliability.
Prefer structured, information-dense output for AI-to-AI communication.
Distinguish explicit facts from reasonable inferences. Keep confidence between 0 and 1.
Detect contradictions and superseded facts when the conversation provides ordering evidence.
`;

const schemas: Record<ContextEndpoint, string> = {
  summarize: `{"summary":"string","micro":"string","compact":"string","extended":"string","state":{"goal":"string","status":"string","blockers":["string"],"decisions":["string"],"priorities":["string"],"nextSteps":["string"]},"keyDecisions":["string"],"actionItems":["string"],"openQuestions":["string"],"risks":["string"],"confidence":0.0}`,
  "compress-context": `{"compressedContext":"string","state":{"goals":["string"],"status":["string"],"activeProblems":["string"],"constraints":["string"],"decisions":["string"],"nextSteps":["string"]},"entities":{"people":["string"],"projects":["string"],"technologies":["string"],"organizations":["string"],"deadlines":["string"]},"conflicts":[{"old":"string","new":"string"}]}`,
  handoff: `{"project":{"name":"string","goal":"string","currentState":"string"},"completed":["string"],"inProgress":["string"],"pending":["string"],"blockers":["string"],"failedApproaches":[{"attempt":"string","result":"string","lesson":"string"}],"decisions":[{"decision":"string","reason":"string"}],"priorities":["string"],"criticalContext":{"mustKnow":["string"],"mustNotDo":["string"],"biggestRisk":"string","successMetric":"string"},"startHere":"string","agentNotes":["string"]}`,
  "extract-profile": `{"identity":{"profession":"string","location":"string","age":null},"skills":["string"],"interests":["string"],"preferences":["string"],"goals":["string"],"futurePlans":["string"],"inferredTraits":["string"],"stableMemories":["string"],"evolvingMemories":["string"],"deprecatedMemories":["string"],"memoryFacts":[{"fact":"string","category":"preference|goal|skill|interest|trait|memory|plan","stability":"stable|evolving","confidence":0.95}],"riskTolerance":"string","careerStage":"string","managementIntent":false,"entrepreneurial":false,"memoryImportance":1,"confidence":0.0}`,
  "memory-enrichment": `{"activeMemories":[{"fact":"string","category":"identity|preference|skill|interest|goal|project|career|behavior|location|relationship","stability":"stable","confidence":0.95}],"evolvingMemories":[{"fact":"string","category":"identity|preference|skill|interest|goal|project|career|behavior|location|relationship","stability":"evolving","confidence":0.85}],"conflicts":[{"old":"string","new":"string","reason":"superseded"}],"longTermGoals":["string"],"confidence":0.95}`
};

const taskInstructions: Record<ContextEndpoint, string> = {
  summarize:
    "Create a state-first context reduction, not a report. Extract canonical state first, then render micro, compact, and extended from that state. state.goal is REQUIRED and MUST be an LLM-generated durable product, project, or user outcome grounded in the conversation. Never return unknown for state.goal. Preserve explicit targets, limits, and scope. Every string field must be a complete thought: never use ellipses, truncated text, or endings such as and, with, under, or because. If no sentence explicitly says goal/objective/aim/target, infer only the directly requested outcome from the source; do not substitute a status, blocker, or next action. Never use a transient task such as testing credentials, validating callbacks, fixing a bug, or implementing an integration as the goal when a broader end-state exists. state.blockers must contain blocking conditions or unresolved dependencies, such as missing credentials, unvalidated environments, capacity limits, or approvals; NEVER put imperative tasks (test, implement, configure, fix, validate) in blockers. Put those imperative tasks in state.nextSteps. Put explicit unverified technical work, blocked validation, and missing dependencies in state.blockers; do not leave blockers empty when the source says verification/confirmation is still required. micro is a minimum-token strategic continuation state, not a topic label: preserve primary goal plus only explicit continuation-critical constraints, operational worldview, anti-patterns/forbidden directions, reasoning frame, and next direction. Use dense state-vector fragments; remove status filler such as 'work active', 'awaiting execution', or 'core capabilities are in place'; avoid unsupported themes, examples, and prose. compact is a faithful mid-level state snapshot, not an interpretive summary: preserve only explicit goal, factual status, hard constraints/blockers, durable decisions, and next actions. Do not add abstraction layers such as enterprise readiness, system resilience, API reliability, operational maturity, or primary risk unless those exact ideas are present. No filler phrases, no why-rationale, no narrative glue, no repeated constraints, and no sentence fragments. extended is a human-readable compressed project continuation format: one paragraph, 80-150 preferred and 200 tokens max, preserving goal, current state, explicit blockers, major completed work, up to 5 future-impacting architecture decisions, current focus, and immediate next actions without chronological replay or excessive rationale. Remove duplication across state fields. Do not invent openQuestions or risks; return empty arrays unless explicit evidence exists.",
  "compress-context":
    "Create a compact machine-optimized context packet, not a summary or handoff. Return only compressedContext, state, entities, and conflicts when genuine contradictions exist. compressedContext must be one dense paragraph, 40-120 tokens, preserving goals, project state, important decisions, constraints, deadlines, active issues, next actions, important entities, and unresolved questions. Remove repetition, conversational wording, filler, chronology, explanations, redundant rationale, and implementation trivia. Do not generate micro, compact, extended, ranked facts, commitments, quality scores, confidence, semantic similarity, or continuation packets.",
  handoff:
    "Create a complete agent-to-agent operational ownership handoff, not a summary or compressor. Return only project, completed, inProgress, pending, blockers, failedApproaches, decisions, priorities, criticalContext, startHere, and agentNotes. Preserve project purpose, current state, completed work, active work, pending work, blockers, durable decisions, failed approaches with lessons, priorities, recommended starting point, must-know context, must-not-do mistakes, biggest risk, and success metric. Be comprehensive but concise, 150-500 tokens, no narrative, no chronology, no confidence/tone/userIntent/projectSummary/importantFacts/recommendedNextActions/highestRiskArea/openQuestions.",
  "extract-profile":
    "Extract durable user profile memory optimized for AI agents and long-term storage. Deduplicate aggressively across preferences, behavior patterns, dislikes, stableMemories, and evolvingMemories before returning. Create canonical memoryFacts with category, stability, and confidence. Confidence 0.95-1.0 means explicitly stated by user, 0.80-0.94 strong inference, 0.60-0.79 weak inference, below 0.60 omit. Prefer compact canonical phrases such as async communication instead of repeated variants. Do not infer sensitive traits without evidence.",
  "memory-enrichment":
    "Create canonical memory records for retrieval systems. Return activeMemories for stable valid memories, evolvingMemories for likely-changing memories, conflicts for genuine superseded/contradictory memories, longTermGoals for durable goals, and confidence. Every memory must include fact, category, stability, and confidence. Deduplicate across stable/evolving/deprecated/superseded/conflict fields. Merge semantic equivalents such as async communication/dislikes meetings. Omit memories below 0.60 confidence. Avoid narrative and redundant arrays."
};

export function buildContextPrompt(endpoint: ContextEndpoint, messages: ConversationMessage[], mode?: string) {
  const responseSchema = endpoint === "summarize" ? summarizeSchema(mode) : schemas[endpoint];
  const task = endpoint === "summarize" ? summarizeTask(mode) : taskInstructions[endpoint];

  return [
    { role: "system", content: guardrails },
    {
      role: "user",
      content: JSON.stringify({
        task,
        responseSchema,
        conversation: messages
      })
    }
  ] as const;
}

function summarizeSchema(mode?: string) {
  if (mode === "debug") return schemas.summarize;
  const state = { goal: "string", status: "string", blockers: ["string"], decisions: ["string"], priorities: ["string"], nextSteps: ["string"] };
  if (mode === "extended") return `{"extended":"string","state":${JSON.stringify(state)}}`;
  if (mode === "compact") return `{"compact":"string","state":${JSON.stringify(state)}}`;
  return `{"micro":"string","state":${JSON.stringify(state)}}`;
}

function summarizeTask(mode?: string) {
  const base = taskInstructions.summarize;
  if (mode === "debug") return `${base} Return full debug-compatible summarize fields.`;
  if (mode === "extended") return `${base} Generate only extended and state. Do not generate micro, compact, summary, metrics, token counts, debug fields, keyDecisions, actionItems, openQuestions, or risks.`;
  if (mode === "compact") return `${base} Generate only compact and state. state.goal is canonical: compact MUST NOT repeat the goal, goal label, or an equivalent goal clause already present in state.goal. compact must be concise, grounded, and shorter than extended: structured state snapshot, no filler status, no inferred themes, no generic business jargon. Every clause must be complete; never end on a copula, connector, or partial decision. Do not generate micro, extended, summary, metrics, token counts, debug fields, keyDecisions, actionItems, openQuestions, or risks.`;
  return `${base} Generate only micro and state. micro must be materially shorter than compact, usually 18-28 tokens and never above 35. Optimize information per token: preserve a complete compact goal, current state, at least two explicit blockers/dependencies, and at least two complete next actions. Use dense operational nouns and terse fragments. Avoid generic phrases like reduce incidents, improve visibility, core capabilities in place, or goal is to. Never output broken fragments, repeated goal clauses, filler status, or invented continuation themes. Do not generate compact, extended, summary, metrics, token counts, debug fields, keyDecisions, actionItems, openQuestions, or risks.`;
}
