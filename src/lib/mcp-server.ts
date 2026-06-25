import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { app } from "@/app-api";
import { createId } from "@/utils/id";

const messageInput = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.string().min(1).max(50_000)
});

const conversationInput = {
  messages: z.array(messageInput).min(1).max(200).optional(),
  contextId: z.string().regex(/^ctx_[a-f0-9]{24}$/).optional()
};

type ConversationInput = {
  messages?: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string }>;
  contextId?: string;
};

type ContextKitMcpOptions = {
  apiKey: string;
  clientIp?: string;
};

type ContextKitApiError = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

const MAX_MCP_CONVERSATION_CHARS = 400_000;

const experienceInput = {
  title: z.string().min(1).max(160).optional(),
  content: z.string().min(1).max(40_000).optional(),
  task: z.string().min(1).max(800).optional(),
  outcome: z.string().min(1).max(1_200).optional(),
  lesson: z.string().min(1).max(2_500).optional(),
  constraints: z.array(z.string().min(1).max(280)).max(20).optional(),
  decisions: z.array(z.string().min(1).max(280)).max(20).optional(),
  tags: z.array(z.string().min(1).max(48)).max(16).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.string().min(1).max(160).optional()
};

/**
 * Builds a fresh stateless server for each MCP HTTP request. The API key stays
 * in request memory only and every paid tool reuses ContextKit's normal billing.
 */
export function createContextKitMcpServer(options: ContextKitMcpOptions) {
  const server = new McpServer({
    name: "contextkit",
    version: "0.1.0"
  });

  server.registerTool(
    "contextkit_summarize",
    {
      title: "Summarize agent context",
      description: "Create a paid ContextKit continuation summary. Uses the API key account credits first; insufficient credits return a safe payment error.",
      inputSchema: {
        ...conversationInput,
        mode: z.enum(["micro", "compact", "extended"]).default("compact")
      }
    },
    async ({ messages, contextId, mode }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/summarize", { messages, contextId, mode });
    }
  );

  server.registerTool(
    "contextkit_compress_context",
    {
      title: "Compress context",
      description: "Create a paid machine-oriented context packet with goals, constraints, decisions, entities, and next steps.",
      inputSchema: conversationInput
    },
    async ({ messages, contextId }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/compress-context", { messages, contextId });
    }
  );

  server.registerTool(
    "contextkit_handoff",
    {
      title: "Create agent handoff",
      description: "Create a paid structured project handoff for a successor agent, preserving completed work, blockers, decisions, priorities, and start-here context.",
      inputSchema: conversationInput
    },
    async ({ messages, contextId }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/handoff", { messages, contextId });
    }
  );

  server.registerTool(
    "contextkit_extract_profile",
    {
      title: "Extract profile or enrich memory",
      description: "Create a paid durable profile or memory-enrichment record. Use memory-enrichment only when the input describes changing or durable user memory.",
      inputSchema: {
        ...conversationInput,
        mode: z.enum(["extract-profile", "memory-enrichment"]).default("extract-profile")
      }
    },
    async ({ messages, contextId, mode }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/extract-profile", { messages, contextId, mode });
    }
  );

  server.registerTool(
    "contextkit_experience_save",
    {
      title: "Save private agent experience",
      description: "MCP V2: save a private reusable agent lesson from messages, an uploaded contextId, or a structured experience record.",
      inputSchema: {
        ...conversationInput,
        ...experienceInput
      }
    },
    async (input) => {
      const invalid = validateExperienceWrite(input);
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/experience/save", experienceBody(input, "experience-save"));
    }
  );

  server.registerTool(
    "contextkit_experience_publish",
    {
      title: "Publish paid agent experience",
      description: "MCP V2: publish a reusable experience record so other agents can buy it through Bankr x402.",
      inputSchema: {
        experienceId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
        priceUsd: z.number().min(0.01).max(50).default(0.05),
        ...conversationInput,
        ...experienceInput
      }
    },
    async (input) => {
      const hasExisting = Boolean(input.experienceId);
      const invalid = hasExisting ? null : validateExperienceWrite(input);
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/experience/publish", {
        ...experienceBody(input, "experience-publish"),
        experienceId: input.experienceId,
        priceUsd: input.priceUsd
      });
    }
  );

  server.registerTool(
    "contextkit_experience_search",
    {
      title: "Search agent experiences",
      description: "MCP V2: search private and public reusable agent lessons by query or tags.",
      inputSchema: {
        query: z.string().max(800).optional(),
        tags: z.array(z.string().min(1).max(48)).max(16).optional(),
        includePrivate: z.boolean().default(true),
        limit: z.number().int().min(1).max(20).default(10)
      }
    },
    async (input) => callContextKit(options, "/experience/search", input)
  );

  server.registerTool(
    "contextkit_experience_buy",
    {
      title: "Buy agent experience",
      description: "MCP V2: buy a published experience record. Uses account credits in MCP; external agents can buy through Bankr x402.",
      inputSchema: {
        experienceId: z.string().regex(/^exp_[a-f0-9]{24}$/)
      }
    },
    async (input) => callContextKit(options, "/experience/buy", input)
  );

  server.registerTool(
    "contextkit_estimate_tokens",
    {
      title: "Estimate tokens",
      description: "Estimate ContextKit input and optional compressed token counts. This utility call does not spend account credits.",
      inputSchema: {
        text: z.string().min(1).max(MAX_MCP_CONVERSATION_CHARS).optional(),
        messages: z.array(messageInput).min(1).max(200).optional(),
        compressed: z.string().max(50_000).optional(),
        modelFamily: z.enum(["openai", "claude", "gemini"]).default("openai")
      }
    },
    async ({ text, messages, compressed, modelFamily }) => {
      if (Boolean(text) === Boolean(messages?.length)) {
        return toolError("Provide exactly one of text or messages.");
      }
      if (messages && messageCharacters(messages) > MAX_MCP_CONVERSATION_CHARS) {
        return toolError(`Messages exceed the ${MAX_MCP_CONVERSATION_CHARS.toLocaleString()} character MCP limit.`);
      }
      return callContextKit(options, "/tokens/estimate", {
        input: text ?? messages,
        compressed,
        modelFamily
      });
    }
  );

  server.registerTool(
    "contextkit_get_credits",
    {
      title: "Get account credits",
      description: "Read the ContextKit credit balance and recent credit events for the API key account. This does not spend credits."
    },
    async () => callContextKit(options, "/auth/credits", undefined, "GET")
  );

  return server;
}

function validateConversation(input: ConversationInput) {
  if (Boolean(input.messages?.length) === Boolean(input.contextId)) {
    return "Provide exactly one of messages or contextId.";
  }
  if (input.messages && messageCharacters(input.messages) > MAX_MCP_CONVERSATION_CHARS) {
    return `Messages exceed the ${MAX_MCP_CONVERSATION_CHARS.toLocaleString()} character MCP limit. Upload a context first and use contextId.`;
  }
  return null;
}

function messageCharacters(messages: Array<{ content: string }>) {
  return messages.reduce((total, message) => total + message.content.length, 0);
}

function validateExperienceWrite(input: ConversationInput & Record<string, unknown>) {
  if (input.messages || input.contextId) return validateConversation(input);
  if (typeof input.content === "string" && input.content.trim()) return null;
  if (typeof input.lesson === "string" && input.lesson.trim()) return null;
  if (typeof input.title === "string" && input.title.trim()) return null;
  return "Provide messages, contextId, content, lesson, or title.";
}

function experienceBody(input: Record<string, unknown>, mode: "experience-save" | "experience-publish") {
  const {
    messages,
    contextId,
    title,
    content,
    task,
    outcome,
    lesson,
    constraints,
    decisions,
    tags,
    confidence,
    source
  } = input;

  return {
    mode,
    messages,
    contextId,
    experience: {
      title,
      content,
      task,
      outcome,
      lesson,
      constraints,
      decisions,
      tags,
      confidence,
      source
    }
  };
}

async function callContextKit(
  options: ContextKitMcpOptions,
  path: string,
  body?: unknown,
  method: "GET" | "POST" = "POST"
) {
  const requestId = createId("req");
  const headers = new Headers({
    Authorization: `Bearer ${options.apiKey}`,
    "X-Request-Id": requestId,
    "X-ContextKit-Client": "mcp"
  });

  if (options.clientIp) headers.set("CF-Connecting-IP", options.clientIp);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  const response = await app.fetch(
    new Request(`https://contextkit.pro/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  );

  const payload = await readJson(response);
  if (!response.ok) return toolError(formatApiError(response.status, payload));
  return toolResult(payload);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return { error: { code: "invalid_upstream_response", message: "ContextKit returned an invalid response." } };
  }
}

function formatApiError(status: number, payload: unknown) {
  const apiError = payload as ContextKitApiError;
  const code = apiError.error?.code ?? "request_failed";

  if (status === 401) return "ContextKit API key is invalid or revoked.";
  if (status === 403) return "ContextKit API key requires the context:write scope.";
  if (status === 402) return "Account credits are insufficient. Top up at https://contextkit.pro/dashboard/credits and retry.";
  if (status === 429) return "ContextKit rate limit reached. Retry after the current rate-limit window.";
  if (status >= 500) return "ContextKit could not complete the request. Retry shortly.";

  const message = apiError.error?.message ?? "ContextKit rejected the request.";
  return `ContextKit ${code}: ${message}`;
}

function toolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }]
  };
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }]
  };
}
