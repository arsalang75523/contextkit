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

const skillBundleFileInput = z.object({
  path: z.string().min(1).max(240),
  content: z.string().max(450_000),
  encoding: z.enum(["utf8", "base64"]).default("utf8")
});

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
  policyVersion: "mcp-v2.5-versioned-skill-repositories",
  purpose: "Convert completed, reusable work from any legitimate domain into tested skills, attach complete immutable source bundles, and publish only executable verified repository versions with explicit user approval.",
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
    savePolicy: "Write a private draft only for non-trivial reusable work with cross-project value, a complete operational workflow, and at least one executed test backed by verbatim hard evidence. Bankr or crypto relevance is optional. Plain claims, placeholders, generic notes, plans, and project diaries are rejected.",
    rejectPolicy: "Reject project diaries, local paths, repo-specific instructions, generic chat, incomplete attempts, unsupported claims, secrets, OTPs, API keys, passwords, bearer tokens, private wallet data, or personal data.",
    publicEligibility: "Public skills require an explicit reuse license, valid lowercase discovery category, quality score >= 75, three source-grounded passing tests, and a validated executable repository bundle. Bundles require SKILL.md, skill.json, LICENSE, package/lock, config schema, src, tests, and examples; assertions are not evidence."
  },
  publish: {
    tool: "contextkit_skill_repository_publish",
    requiresExplicitUserApproval: true,
    defaultVisibility: "private",
    instruction: "After compile, create the complete versioned file bundle, call contextkit_skill_validate_bundle, then contextkit_skill_push. If both skill and bundle are publish eligible, show title, score, digest, tests, and findings; only then ask whether the user wants to publish with contextkit_skill_repository_publish."
  },
  recommendedAgentBehavior: [
    "Do not ask the user to paste this policy each time.",
    "Call contextkit_skill_compile proactively after useful completed work in any domain.",
    "Keep drafts private by default.",
    "Ask before public publishing.",
    "Search verified skills before repeating similar work.",
    "For executable work, push the complete repository before asking to publish.",
    "Materialize every purchased repository file only after verifying checksums; never overwrite an existing directory implicitly."
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
      description: "Paid ContextKit write call ($0.01). Creates a private draft only. Include raw successful terminal/test/tool-result excerpts in messages; summarized claims such as 'tests pass' are not evidence. Public eligibility needs three distinct grounded PASS excerpts. After compile, create the complete bundle and call contextkit_skill_validate_bundle then contextkit_skill_push before requesting approval for contextkit_skill_repository_publish.",
      inputSchema: {
        ...conversationInput,
        minConfidence: z.number().min(0.5).max(0.95).default(0.72),
        autoSave: z.boolean().default(true)
      }
    },
    async ({ messages, contextId, minConfidence, autoSave }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/skills/compile", { messages, contextId, minConfidence, autoSave });
    }
  );

  server.registerTool(
    "contextkit_skill_publish",
    {
      title: "Publish a verified paid skill",
      description: "Legacy compatibility publish tool. Do not call it immediately after compile. New public skills require a pushed executable repository bundle, validation.eligible=true, three grounded PASS results, score 75+, safety checks, and explicit user approval; use contextkit_skill_repository_publish after validate and push.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/),
        priceUsd: z.literal(0.05).default(0.05),
        userApproved: z.literal(true)
      }
    },
    async ({ skillId, priceUsd }) => callContextKit(options, "/skills/publish", { skillId, priceUsd, userApproved: true })
  );

  server.registerTool(
    "contextkit_skill_validate_bundle",
    {
      title: "Validate a complete skill repository bundle",
      description: "Validate a private compiled skill's complete source bundle without storing it. Checks safe paths, secrets, identity/version alignment, source/tests/examples, package lock, config schema, and executable contract.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/),
        repository: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        files: z.array(skillBundleFileInput).min(1).max(128)
      }
    },
    async (input) => callContextKit(options, "/skills/validate", { ...input, mode: "skill-validate" })
  );

  server.registerTool(
    "contextkit_skill_push",
    {
      title: "Push an immutable skill repository version",
      description: "Store a validated content-addressed source bundle for a private compiled skill. A published version cannot be overwritten; changes require a semantic version bump.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/),
        repository: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        version: z.string().regex(/^\d+\.\d+\.\d+$/),
        files: z.array(skillBundleFileInput).min(1).max(128)
      }
    },
    async (input) => callContextKit(options, "/skills/push", { ...input, mode: "skill-push" })
  );

  server.registerTool(
    "contextkit_skill_repository_publish",
    {
      title: "Publish an executable skill repository",
      description: "Publish a compiled skill only after its immutable executable bundle passes repository validation and the user explicitly approves the public $0.05 Bankr x402 listing.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/),
        priceUsd: z.literal(0.05).default(0.05),
        userApproved: z.literal(true)
      }
    },
    async ({ skillId, priceUsd }) => callContextKit(options, "/skills/publish", { skillId, priceUsd, userApproved: true, mode: "skill-repository-publish" })
  );

  server.registerTool(
    "contextkit_skill_search",
    {
      title: "Search verified installable skills",
      description: "Search ContextKit Verified Skills by current problem, ecosystem, tags, or compatible agent host. Public results contain previews; purchased results include the installable SKILL.md bundle.",
      inputSchema: {
        query: z.string().max(800).optional(),
        tags: z.array(z.string().min(1).max(48)).max(16).optional(),
        ecosystems: z.array(z.string().min(2).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(16).optional(),
        compatibility: z.array(z.string().min(1).max(48)).max(16).optional(),
        includePrivate: z.boolean().default(true),
        limit: z.number().int().min(1).max(20).default(10)
      }
    },
    async (input) => callContextKit(options, "/skills/search", { ...input, verifiedOnly: true })
  );

  server.registerTool(
    "contextkit_skill_inspect",
    {
      title: "Inspect a skill repository manifest",
      description: "Inspect public skill metadata, repository version, digest, file manifest, and validation without revealing paid file contents.",
      inputSchema: { skillId: z.string().regex(/^exp_[a-f0-9]{24}$/) }
    },
    async ({ skillId }) => callContextKit(options, "/skills/inspect", { mode: "skill-inspect", skillId })
  );

  server.registerTool(
    "contextkit_skill_buy",
    {
      title: "Buy and install a verified skill",
      description: "Buy a public verified skill. Repository-backed skills return all source, tests, examples, config, lockfile, generated checksums, validation, and safe materialization instructions.",
      inputSchema: {
        skillId: z.string().regex(/^exp_[a-f0-9]{24}$/)
      }
    },
    async ({ skillId }) => callContextKit(options, "/skills/buy", { skillId })
  );

  server.registerTool(
    "contextkit_skill_clone",
    {
      title: "Buy and clone a complete skill repository",
      description: "Settle the $0.05 Bankr/API-credit purchase and return every immutable repository file. Verify checksums and create a new directory; never overwrite files implicitly.",
      inputSchema: { skillId: z.string().regex(/^exp_[a-f0-9]{24}$/) }
    },
    async ({ skillId }) => callContextKit(options, "/skills/clone", { skillId, mode: "skill-clone" })
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
        autoSave: z.boolean().default(true)
      }
    },
    async ({ messages, contextId, minConfidence, autoSave }) => {
      const invalid = validateConversation({ messages, contextId });
      if (invalid) return toolError(invalid);
      return callContextKit(options, "/experience/consider", { messages, contextId, minConfidence, autoSave });
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
  if (input.messages || input.contextId) {
    return "Use contextkit_skill_compile for conversation-based writes so ContextKit can verify execution evidence.";
  }
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const task = typeof input.task === "string" ? input.task.trim() : "";
  const outcome = typeof input.outcome === "string" ? input.outcome.trim() : "";
  const lesson = typeof input.lesson === "string" ? input.lesson.trim() : "";
  const tags = Array.isArray(input.tags) ? input.tags.filter((tag) => typeof tag === "string" && tag.trim()) : [];
  if (content.split(/\s+/).length >= 20 && task && outcome && lesson && tags.length >= 2) return null;
  return "Raw experience writes require 20+ words of operational content, task, observed outcome, reusable lesson, and at least two tags. Prefer contextkit_skill_compile for tested work.";
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
