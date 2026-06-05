import type { ConversationMessage } from "@/types/api";

const controlCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeMessageContent(content: string) {
  return content.replace(controlCharacters, "").trim();
}

export function sanitizeMessages(messages: ConversationMessage[]) {
  return messages.map((message) => ({
    ...message,
    content: sanitizeMessageContent(message.content)
  }));
}
