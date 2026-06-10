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
  "compress-context": `{"compressedContext":"string","micro":"string","compact":"string","extended":"string","state":{"currentGoals":["string"],"activeProblems":["string"],"currentStatus":["string"],"constraints":["string"],"decisions":["string"],"priorities":["string"],"nextSteps":["string"]},"importantFactsRanked":[{"fact":"string","importance":10}],"prioritizedFacts":[{"fact":"string","importance":10}],"entities":{"projects":["string"],"people":["string"],"organizations":["string"],"technologies":["string"],"services":["string"],"constraints":["string"],"deadlines":["string"]},"supersededFacts":[{"old":"string","new":"string","reason":"string"}],"commitments":{"goals":["string"],"constraints":["string"],"decisions":["string"],"promises":["string"],"requirements":["string"]},"agentContinuationPacket":{"project":"string","currentObjective":"string","highestPriorityIssue":"string","activeDecisionSet":["string"],"nextAction":"string","criticalConstraints":["string"]},"factRetentionScore":0.0,"criticalFactsRetained":0}`,
  handoff: `{"goal":"string","importantFacts":["string"],"constraints":["string"],"recommendedNextActions":["string"],"tone":"string","userIntent":"string","projectSummary":"string","currentState":"string","completedWork":["string"],"inProgress":["string"],"pendingTasks":["string"],"knownIssues":["string"],"failedApproaches":[{"attempt":"string","result":"string","decision":"string"}],"importantDecisions":[{"decision":"string","reason":"string"}],"blockers":["string"],"agentNotes":["string"],"priorityOrder":["string"],"recommendedStartingPoint":"string","highestRiskArea":"string","repositories":["string"],"artifacts":["string"],"links":["string"],"owners":["string"],"confidence":0.0}`,
  "extract-profile": `{"interests":["string"],"riskTolerance":"string","communicationStyle":"string","preferences":["string"],"importantContext":["string"],"identity":{"profession":"string","location":"string","age":null},"skills":["string"],"goals":["string"],"futurePlans":["string"],"behaviorPatterns":["string"],"dislikes":["string"],"careerStage":"string","managementIntent":false,"entrepreneurial":false,"inferredTraits":["string"],"memoryImportance":1,"stableMemories":["string"],"evolvingMemories":["string"],"deprecatedMemories":["string"],"confidence":0.0}`,
  "memory-enrichment": `{"stablePreferences":["string"],"evolvingPreferences":["string"],"longTermGoals":["string"],"supersededMemories":["string"],"memoryConflicts":[{"current":"string","superseded":["string"]}],"stableMemories":["string"],"evolvingMemories":["string"],"deprecatedMemories":["string"],"confidence":0.0}`
};

const taskInstructions: Record<ContextEndpoint, string> = {
  summarize:
    "Create a state-first context reduction, not a report. Extract canonical state first, then render micro, compact, and extended from that state. micro must include only goal/status/blockers/next steps and exclude decisions, priorities, risks, questions, history, rationale, and explanations. compact may include major decisions/priorities/blockers/next steps without narrative. extended may preserve valuable reasoning but must remain shorter than input. Remove duplication across state fields. Do not invent openQuestions or risks; return empty arrays unless explicit evidence exists.",
  "compress-context":
    "Compress this conversation into a continuation-ready state representation, not a narrative summary. Preserve goals, active problems, current status, constraints, decisions, priorities, next steps, commitments, and superseded facts. The agentContinuationPacket must be 50-120 tokens and sufficient for a new agent to continue immediately. Make compact the preferred short memory and keep it substantially shorter than input.",
  handoff:
    "Create a true agent-to-agent project handoff. Preserve project state, completed work, in-progress work, pending tasks, known issues, failed approaches, decisions with reasons, blockers, and high-signal notes so the next agent can continue immediately.",
  "extract-profile":
    "Extract durable user profile memory. Preserve explicit facts and carefully inferred traits with confidence. Capture identity, skills, goals, future plans, behavior patterns, dislikes, career stage, management intent, entrepreneurial signals, inferredTraits, and memoryImportance from 1-10. Do not infer sensitive traits without evidence.",
  "memory-enrichment":
    "Enrich long-term memory by separating stable preferences, evolving preferences, long-term goals, superseded memories, memory conflicts, stableMemories, evolvingMemories, and deprecatedMemories. Avoid duplication and preserve only memory useful for future conversations."
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
