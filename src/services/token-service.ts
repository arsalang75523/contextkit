import type { ConversationMessage } from "@/types/api";
import { encode } from "gpt-tokenizer";

export type ModelFamily = "openai" | "claude" | "gemini";

export class TokenService {
  count(input: string | ConversationMessage[], modelFamily: ModelFamily = "openai") {
    const text = Array.isArray(input) ? input.map((message) => `${message.role}: ${message.content}`).join("\n") : input;
    if (modelFamily === "openai") {
      return countOpenAiLike(text);
    }
    if (modelFamily === "claude") {
      return countAnthropicLike(text);
    }
    return countGeminiLike(text);
  }

  estimate(input: string | ConversationMessage[], compressed?: string, modelFamily: ModelFamily = "openai") {
    const inputTokens = this.count(input, modelFamily);
    const compressedTokens = compressed ? this.count(compressed, modelFamily) : 0;
    const reductionPercent = compressed ? Math.max(0, Math.round(((inputTokens - compressedTokens) / Math.max(inputTokens, 1)) * 100)) : 0;
    return { inputTokens, compressedTokens, reductionPercent };
  }
}

function countOpenAiLike(text: string) {
  return Math.max(1, encode(text).length);
}

function countAnthropicLike(text: string) {
  return Math.max(1, Math.ceil(countOpenAiLike(text) * 0.96));
}

function countGeminiLike(text: string) {
  return Math.max(1, Math.ceil(countOpenAiLike(text) * 0.92));
}
