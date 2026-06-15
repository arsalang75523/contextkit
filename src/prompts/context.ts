import type { ContextEndpoint, ConversationMessage } from "@/types/api";

const guardrails = `
You are ContextKit, a deterministic context infrastructure engine for autonomous AI agents.
Return only valid minified JSON matching the requested schema. Do not include markdown.
Preserve facts, user goals, constraints, preferences, and unresolved tasks.
Do not invent details. Use empty arrays or "unknown" when evidence is insufficient.
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
    "Create a state-first context reduction, not a report. Extract canonical state first, then render micro, compact, and extended from that state. state.goal MUST come from the conversation goal/objective/purpose; if the input says phrases like 'the goal is', 'goal:', 'objective', 'aim', 'trying to', or 'need to', extract that as state.goal. Use 'unknown' for state.goal only when no goal, objective, purpose, or requested outcome is present anywhere in the conversation. micro must include only goal/status/blockers/next steps and exclude decisions, priorities, risks, questions, history, rationale, and explanations. compact is the default AI-to-AI transfer format: one paragraph, max 150 tokens, preserving goal, status, up to 4 material architecture decisions, blockers, and immediate next actions without rationale, history, storytelling, or minor implementation details. extended is a human-readable compressed project continuation format: one paragraph, 80-150 preferred and 200 tokens max, preserving goal, current state, major completed work, up to 5 future-impacting architecture decisions, current focus, and immediate next actions without chronological replay or excessive rationale. Remove duplication across state fields. Do not invent openQuestions or risks; return empty arrays unless explicit evidence exists.",
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
  if (mode === "compact") return `${base} Generate only compact and state. Do not generate micro, extended, summary, metrics, token counts, debug fields, keyDecisions, actionItems, openQuestions, or risks.`;
  return `${base} Generate only micro and state. micro must be the smallest useful output. Do not generate compact, extended, summary, metrics, token counts, debug fields, keyDecisions, actionItems, openQuestions, or risks.`;
}
