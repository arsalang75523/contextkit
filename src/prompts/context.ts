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
  summarize: `{"summary":"string","keyDecisions":["string"],"actionItems":["string"],"openQuestions":["string"],"risks":["string"],"confidence":0.0}`,
  "compress-context": `{"compressedContext":"string","micro":"string","compact":"string","extended":"string","prioritizedFacts":[{"fact":"string","importance":10}],"entities":{"projects":["string"],"people":["string"],"organizations":["string"],"technologies":["string"],"services":["string"],"constraints":["string"],"deadlines":["string"]},"supersededFacts":[{"current":"string","superseded":["string"]}],"factRetentionScore":0.0,"criticalFactsRetained":0}`,
  handoff: `{"goal":"string","importantFacts":["string"],"constraints":["string"],"recommendedNextActions":["string"],"tone":"string","userIntent":"string","projectSummary":"string","currentState":"string","completedWork":["string"],"inProgress":["string"],"pendingTasks":["string"],"knownIssues":["string"],"failedApproaches":[{"attempt":"string","result":"string","decision":"string"}],"importantDecisions":[{"decision":"string","reason":"string"}],"blockers":["string"],"agentNotes":["string"],"priorityOrder":["string"],"recommendedStartingPoint":"string","highestRiskArea":"string","repositories":["string"],"artifacts":["string"],"links":["string"],"owners":["string"],"confidence":0.0}`,
  "extract-profile": `{"interests":["string"],"riskTolerance":"string","communicationStyle":"string","preferences":["string"],"importantContext":["string"],"identity":{"profession":"string","location":"string","age":null},"skills":["string"],"goals":["string"],"futurePlans":["string"],"behaviorPatterns":["string"],"dislikes":["string"],"careerStage":"string","managementIntent":false,"entrepreneurial":false,"inferredTraits":["string"],"memoryImportance":1,"confidence":0.0}`,
  "memory-enrichment": `{"stablePreferences":["string"],"evolvingPreferences":["string"],"longTermGoals":["string"],"supersededMemories":["string"],"memoryConflicts":[{"current":"string","superseded":["string"]}],"confidence":0.0}`
};

const taskInstructions: Record<ContextEndpoint, string> = {
  summarize:
    "Summarize this conversation into decision-aware reusable context. Capture decisions with rationale, pending actions, unresolved questions, risks, and confidence. Keep summary concise but useful for human and AI continuation.",
  "compress-context":
    "Compress this conversation into true compact memory. Return micro, compact, and extended levels. Prioritize facts by importance. Extract entity arrays using projects, people, organizations, technologies, services, constraints, deadlines. Detect superseded facts. Make compact the preferred agent memory and keep it substantially shorter than input. Avoid verbose prose.",
  handoff:
    "Create a true agent-to-agent project handoff. Preserve project state, completed work, in-progress work, pending tasks, known issues, failed approaches, decisions with reasons, blockers, and high-signal notes so the next agent can continue immediately.",
  "extract-profile":
    "Extract durable user profile memory. Preserve explicit facts and carefully inferred traits with confidence. Capture identity, skills, goals, future plans, behavior patterns, dislikes, career stage, management intent, entrepreneurial signals, inferredTraits, and memoryImportance from 1-10. Do not infer sensitive traits without evidence.",
  "memory-enrichment":
    "Enrich long-term memory by separating stable preferences, evolving preferences, long-term goals, superseded memories, and memory conflicts. Avoid duplication and preserve only memory useful for future conversations."
};

export function buildContextPrompt(endpoint: ContextEndpoint, messages: ConversationMessage[]) {
  return [
    { role: "system", content: guardrails },
    {
      role: "user",
      content: JSON.stringify({
        task: taskInstructions[endpoint],
        responseSchema: schemas[endpoint],
        conversation: messages
      })
    }
  ] as const;
}
