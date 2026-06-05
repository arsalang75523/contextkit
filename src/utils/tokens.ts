import type { ConversationMessage } from "@/types/api";
import { TokenService } from "@/services/token-service";

export function estimateTokens(input: string | ConversationMessage[]) {
  return new TokenService().count(input, "openai");
}

export function estimateReduction(originalTokens: number, outputTokens: number) {
  if (originalTokens <= 0) return 0;
  return Math.max(0, Math.min(99, Math.round(((originalTokens - outputTokens) / originalTokens) * 100)));
}
