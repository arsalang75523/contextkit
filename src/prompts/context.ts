import type { ContextEndpoint, ConversationMessage } from "@/types/api";

const guardrails = `
You are ContextKit, a deterministic context infrastructure engine for autonomous AI agents.
Return only valid minified JSON matching the requested schema. Do not include markdown.
Preserve facts, user goals, constraints, preferences, and unresolved tasks.
Do not invent details. Use empty arrays or "unknown" when evidence is insufficient.
Optimize for future LLM context efficiency and agent handoff reliability.
When users say "Finglish" in this product context, interpret it as Persian-English transliteration unless they explicitly mention Finnish.
`;

const schemas: Record<ContextEndpoint, string> = {
  summarize: `{"summary":"string","tokenReductionEstimate":72}`,
  "compress-context": `{"compressedContext":"string","estimatedSavings":"45%"}`,
  handoff: `{"goal":"string","importantFacts":["string"],"constraints":["string"],"recommendedNextActions":["string"],"tone":"string","userIntent":"string"}`,
  "extract-profile": `{"interests":["string"],"riskTolerance":"string","communicationStyle":"string","preferences":["string"],"importantContext":["string"]}`
};

const taskInstructions: Record<ContextEndpoint, string> = {
  summarize:
    "Summarize this conversation into concise reusable context. Remove repetition while preserving decisions, goals, constraints, assumptions, and important facts.",
  "compress-context":
    "Compress this conversation into compact structured memory. Deduplicate semantically similar statements and keep only details valuable for future agent reasoning.",
  handoff:
    "Create an agent-to-agent handoff that lets another agent continue immediately with minimal context loss.",
  "extract-profile":
    "Extract durable user profile information. Include only preferences and traits supported by the conversation."
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
