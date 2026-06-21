import { readEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import type { ContextEndpoint, ConversationMessage } from "@/types/api";
import { buildContextPrompt } from "@/prompts/context";

type JsonObject = Record<string, unknown>;

export class BankrLlmClient {
  constructor(private readonly context?: { env?: Record<string, unknown> }) {}

  async generateJson(endpoint: ContextEndpoint, messages: ConversationMessage[], mode?: string): Promise<JsonObject> {
    return this.generateJsonFromPrompt(endpoint, buildContextPrompt(endpoint, messages, mode));
  }

  async generateSummaryGoal(messages: ConversationMessage[]): Promise<JsonObject> {
    return this.generateJsonFromPrompt("summarize", [
      {
        role: "system",
        content: "Extract the single durable goal from this conversation for an autonomous-agent continuation state. Return only valid JSON: {\"goal\":\"string\"}. The goal must be grounded in the conversation and preserve concrete targets, limits, and scope. Do not return unknown, a status, a blocker, or a next action. If no sentence explicitly says goal/objective/aim/target, infer only the directly requested outcome from the source."
      },
      {
        role: "user",
        content: JSON.stringify({ conversation: messages })
      }
    ]);
  }

  async generateJsonFromPrompt(endpoint: ContextEndpoint, promptMessages: readonly { role: string; content: string }[]): Promise<JsonObject> {
    const env = readEnv(this.context);
    if (!env.bankrLlmKey) {
      throw new Error("BANKR_LLM_KEY is required for ContextKit generation.");
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(`${env.bankrLlmBaseUrl.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.bankrLlmKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: env.bankrLlmModel,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: attempt === 1 ? promptMessages : repairPrompt(promptMessages)
          })
        });

        if (!response.ok) {
          throw new Error(`Bankr LLM Gateway failed with ${response.status}`);
        }

        const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const content = payload.choices?.[0]?.message?.content ?? "{}";
        return parseJsonObject(content);
      } catch (error) {
        lastError = error;
        log("warn", "Bankr LLM JSON generation attempt failed", { endpoint, attempt, error: String(error) });
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Bankr LLM Gateway returned malformed JSON");
  }
}

function repairPrompt(messages: readonly { role: string; content: string }[]) {
  return [
    ...messages,
    {
      role: "user",
      content: "The previous response was malformed. Return only parseable JSON matching the schema, without markdown."
    }
  ];
}

function parseJsonObject(content: string): JsonObject {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    return JSON.parse(normalized) as JsonObject;
  } catch {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(normalized.slice(start, end + 1)) as JsonObject;
    }
    throw new SyntaxError("Bankr LLM Gateway returned content without a parseable JSON object.");
  }
}
