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
const MCP_AGENT_INSTRUCTIONS_URI = "contextkit://instructions";

const MCP_AGENT_INSTRUCTIONS = {
  policyVersion: "mcp-v2.2-verified-skills",
  purpose: "Convert real completed Bankr-adjacent work into tested portable SKILL.md drafts, then publish only verified skills with explicit user approval.",
  startup: [
    `Read ${MCP_AGENT_INSTRUCTIONS_URI} or call contextkit_get_agent_instructions when connecting to ContextKit MCP.`,
    "Use ContextKit memory tools only when they help the user's active task."
  ],
  autoCapture: {
    enabled: true,
    trigger: "After every completed non-trivial task that produced a reusable workflow, debugging lesson, integration pattern, decision, constraint, or agent technique.",
    tool: "contextkit_skill_compile",
    requiredInput: [
      "initial user request",
      "important agent actions and method",
      "final result or outcome",
      "constraints, decisions, errors, and fixes",
      "reusable lesson for future agents"
    ],
    savePolicy: "Save a private draft only when ContextKit detects real completed work and can compile a portable Bankr-adjacent skill.",
    rejectPolicy: "Reject project diaries, local paths, repo-specific instructions, generic chat, incomplete attempts, unsupported claims, secrets, OTPs, API keys, passwords, bearer tokens, private wallet data, or personal data.",
    publicEligibility: "Public skills require an approved ecosystem namespace, at least three workflow steps, verification, safety boundaries, rollback, evidence, three passing contract tests, and quality score >= 75."
  },
  publish: {
    tool: "contextkit_skill_publish",
    requiresExplicitUserApproval: true,
    defaultVisibility: "private",
    instruction: "If validation.eligible is true, show the skill title, score, test count, and findings; then ask whether the user wants to publish it for Bankr x402 installation. Never publish an unverified draft."
  },
  recommendedAgentBehavior: [
    "Do not ask the user to paste this policy each time.",
    "Call contextkit_skill_compile proactively after useful completed Bankr-adjacent work.",
    "Keep drafts private by default.",
    "Ask before public publishing.",
    "Search verified skills before repeating similar work.",
    "Install purchased SKILL.md content as an agent skill; do not treat it as conversational advice."
  ]
};

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

  server.registerResource(
    "contextkit_agent_instructions",
    MCP_AGENT_INSTRUCTIONS_URI,
    {
      title: "ContextKit agent instructions",
      description: "Policy for connected agents: when to compile completed work into a private skill, how validation works, and when publishing requires user approval.",
      mimeType: "application/json"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(MCP_AGENT_INSTRUCTIONS, null, 2)
        }
      ]
    })
  );

  server.registerTool(
    "contextkit_get_agent_instructions",
    {
      title: "Get ContextKit agent instructions",
      description: `Read ContextKit MCP operating policy. Agents should call this or read ${MCP_AGENT_INSTRUCTIONS_URI} when connecting, then call contextkit_skill_compile after useful completed work and never publish without verification plus explicit user approval.`
    },
    async () => toolResult(MCP_AGENT_INSTRUCTIONS)
  );

  server.registerTool(
    "contextkit_skill_compile",
    {
      title: "Compile completed work into a verified skill draft",
      description: "MCP V2 primary capture tool. After successful non-trivial Bankr, x402, Base, MCP, wallet, DeFi, automation, LLM gateway, or agent-infrastructure work, compile the completed task into a portable tested SKILL.md. Saves privately when qualified; public publishing remains a separate approval-gated action.",
      inputSchema: {
        ...conversationInput,
        minConfidence: z.number().min(0.5).max(0.95).default(0.72),
        autoSave: z.boolean().default(true),
        priceUsd: z.literal(0.05).default(0.05)
      }
    },
    async ({ messages, contextId, minConfidence, autoSave, priceUsd }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/skills/compile", { messages, contextId, minConfidence, autoSave, priceUsd });
    }
  );

  server.registerTool(
    "contextkit_skill_publish",
    {
      title: "Publish a verified paid skill",
      description: "Publish an existing private skill only after validation.eligible=true and explicit user approval. Unverified, project-specific, unsafe, or under-tested drafts are rejected by the API.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/),
        priceUsd: z.literal(0.05).default(0.05),
        userApproved: z.literal(true)
      }
    },
    async ({ skillId, priceUsd }) => callContextKit(options, "/skills/publish", { skillId, priceUsd, userApproved: true })
  );

  server.registerTool(
    "contextkit_skill_search",
    {
      title: "Search verified installable skills",
      description: "Search ContextKit Verified Skills by current problem, ecosystem, tags, or compatible agent host. Public results contain previews; purchased results include the installable SKILL.md bundle.",
      inputSchema: {
        query: z.string().max(800).optional(),
        tags: z.array(z.string().min(1).max(48)).max(16).optional(),
        ecosystems: z.array(z.enum(["bankr", "x402", "base", "mcp", "wallet", "defi", "automation", "llm-gateway", "agent-infrastructure"])).max(9).optional(),
        compatibility: z.array(z.string().min(1).max(48)).max(16).optional(),
        includePrivate: z.boolean().default(true),
        limit: z.number().int().min(1).max(20).default(10)
      }
    },
    async (input) => callContextKit(options, "/skills/search", { ...input, verifiedOnly: true })
  );

  server.registerTool(
    "contextkit_skill_buy",
    {
      title: "Buy and install a verified skill",
      description: "Buy a public verified skill. The response includes SKILL.md, a versioned manifest, compatibility metadata, validation report, and a non-resale installation license.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/)
      }
    },
    async ({ skillId }) => callContextKit(options, "/skills/buy", { skillId })
  );

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
      description: "Compatibility alias for private legacy experience storage. New agents should use contextkit_skill_compile to create a portable tested skill.",
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
    "contextkit_experience_consider",
    {
      title: "Detect reusable completed experience",
      description: "Compatibility alias for contextkit_skill_compile. Compiles qualifying completed work into a private portable skill draft.",
      inputSchema: {
        ...conversationInput,
        minConfidence: z.number().min(0.5).max(0.95).default(0.72),
        autoSave: z.boolean().default(true),
        priceUsd: z.literal(0.05).default(0.05)
      }
    },
    async ({ messages, contextId, minConfidence, autoSave, priceUsd }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/experience/consider", { messages, contextId, minConfidence, autoSave, priceUsd });
    }
  );

  server.registerTool(
    "contextkit_experience_publish",
    {
      title: "Publish verified skill (legacy alias)",
      description: "Compatibility alias. Publishing now requires a compiled skill, passing validation, and explicit user approval.",
      inputSchema: {
        experienceId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/).optional(),
        priceUsd: z.literal(0.05).default(0.05),
        userApproved: z.literal(true),
        ...conversationInput,
        ...experienceInput
      }
    },
    async (input) => {
      const hasExisting = Boolean(input.experienceId || input.skillId);
      const invalid = hasExisting ? null : validateExperienceWrite(input);
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/experience/publish", {
        ...experienceBody(input, "experience-publish"),
        experienceId: input.experienceId,
        skillId: input.skillId,
        priceUsd: input.priceUsd,
        userApproved: true
      });
    }
  );

  server.registerTool(
    "contextkit_experience_search",
    {
      title: "Search skills (legacy alias)",
      description: "Compatibility alias for verified skill search.",
      inputSchema: {
        query: z.string().max(800).optional(),
        tags: z.array(z.string().min(1).max(48)).max(16).optional(),
        includePrivate: z.boolean().default(true),
        limit: z.number().int().min(1).max(20).default(10)
      }
    },
    async (input) => callContextKit(options, "/experience/search", { ...input, verifiedOnly: true })
  );

  server.registerTool(
    "contextkit_experience_buy",
    {
      title: "Buy verified skill (legacy alias)",
      description: "Compatibility alias for buying an installable verified SKILL.md bundle.",
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
