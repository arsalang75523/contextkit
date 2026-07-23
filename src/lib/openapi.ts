import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  contextUploadSchema,
  conversationRequestSchema,
  createApiKeySchema,
  experienceBuySchema,
  experienceConsiderSchema,
  experiencePublishSchema,
  experienceSearchSchema,
  loginSchema,
  payoutAdminActionSchema,
  payoutRequestSchema,
  payoutWalletChallengeSchema,
  payoutWalletVerifySchema,
  revokeApiKeySchema,
  sellerBetaAccessSchema,
  signupSchema,
  skillBundlePushSchema,
  skillLifecycleSchema,
  skillModerationSchema,
  tokenEstimateSchema,
  webhookRegistrationSchema,
  webhookReplaySchema
} from "@/types/api";
import { endpointPricing } from "@/lib/pricing";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "ContextKit API key"
});

registry.registerComponent("securitySchemes", "X402Payment", {
  type: "apiKey",
  in: "header",
  name: "X-Payment",
  description: "x402 payment payload returned from a prior HTTP 402 response."
});

registry.registerComponent("securitySchemes", "DashboardSession", {
  type: "apiKey",
  in: "cookie",
  name: "ck_session",
  description: "Dashboard session cookie created by the dashboard login flow."
});

registry.registerComponent("securitySchemes", "AdminToken", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "ContextKit admin token",
  description: "Server-side administration token. Never expose this credential to browsers, MCP clients, or public agents."
});

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional()
  })
});

const healthResponse = z.object({
  name: z.literal("ContextKit"),
  status: z.literal("ok"),
  time: z.string()
});

const readinessResponse = z.object({
  name: z.literal("ContextKit"),
  status: z.enum(["ready", "degraded", "unavailable"]),
  checks: z.object({
    storage: z.object({
      status: z.enum(["ok", "error"]),
      latencyMs: z.number(),
      message: z.string().optional()
    }),
    configuration: z.object({
      bankrLlm: z.boolean(),
      internalAuth: z.boolean(),
      webhookSigning: z.boolean(),
      x402Wallet: z.boolean()
    })
  }),
  latencyMs: z.number(),
  time: z.string()
});

const payoutRecordSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  destination: z.string(),
  amountUsd: z.number(),
  amountUnits: z.string(),
  status: z.enum(["requested", "approved", "rejected", "paid"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().optional(),
  rejectedAt: z.string().optional(),
  paidAt: z.string().optional(),
  txHash: z.string().optional(),
  note: z.string().optional()
});

const listingActionResponse = z.object({
  experience: z.record(z.unknown()),
  buyerAccessPreserved: z.literal(true)
});

const launchReadinessResponse = z.object({
  status: z.enum(["closed-beta", "eligible-for-governance-review"]),
  tokenLaunch: z.literal("not-started"),
  summary: z.object({
    passed: z.number(),
    total: z.number(),
    progressPercent: z.number()
  }),
  gates: z.array(z.object({
    key: z.string(),
    value: z.number(),
    target: z.number(),
    passed: z.boolean(),
    progressPercent: z.number()
  })),
  utilityDesign: z.array(z.object({
    utility: z.string(),
    status: z.enum(["live", "locked"])
  })),
  policy: z.object({
    settlementAsset: z.literal("USDC on Base"),
    launchRule: z.string(),
    betaModeEnabled: z.boolean(),
    beta: z.string()
  }),
  generatedAt: z.string()
});

const contextUploadResponse = z.object({
  contextId: z.string(),
  expiresAt: z.string(),
  messageCount: z.number(),
  inputTokens: z.number(),
  precomputed: z.object({
    endpoint: z.enum(["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"]),
    mode: z.enum(["micro", "compact", "extended", "debug", "extract-profile", "memory-enrichment"]).nullable()
  }).nullable().optional()
});

const summarizeStateResponse = z.object({
  goal: z.string(),
  status: z.string(),
  blockers: z.array(z.string()),
  next: z.array(z.string())
});

const summarizeResponse = z.union([
  z.object({
    mode: z.literal("micro"),
    micro: z.string(),
    metrics: z.object({
      inputTokens: z.number(),
      microTokens: z.number(),
      reductionPercent: z.number()
    })
  }),
  z.object({
    mode: z.enum(["compact", "extended", "debug"]),
    summary: z.string().optional(),
    micro: z.string().optional(),
    compact: z.string().optional(),
    extended: z.string().optional(),
    state: summarizeStateResponse,
    keyDecisions: z.array(z.string()).optional(),
    actionItems: z.array(z.string()).optional(),
    openQuestions: z.array(z.string()).optional(),
    risks: z.array(z.string()).optional(),
    metrics: z.object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      stateTokens: z.number(),
      totalOutputTokens: z.number(),
      reductionPercent: z.number(),
      latencyMs: z.number()
    }),
    confidence: z.number().optional()
  })
]);

const compressResponse = z.object({
  compressedContext: z.string(),
  state: z.object({
    goals: z.array(z.string()),
    status: z.array(z.string()),
    activeProblems: z.array(z.string()),
    constraints: z.array(z.string()),
    decisions: z.array(z.string()),
    nextSteps: z.array(z.string())
  }),
  entities: z.object({
    people: z.array(z.string()),
    projects: z.array(z.string()),
    technologies: z.array(z.string()),
    organizations: z.array(z.string()),
    deadlines: z.array(z.string())
  }),
  conflicts: z.array(z.object({ old: z.string(), new: z.string() })).optional(),
  metrics: z.object({
    inputTokens: z.number(),
    compressedTokens: z.number(),
    reductionPercent: z.number()
  })
});

const handoffResponse = z.object({
  project: z.object({
    name: z.string(),
    goal: z.string(),
    currentState: z.string()
  }),
  completed: z.array(z.string()),
  inProgress: z.array(z.string()),
  pending: z.array(z.string()),
  blockers: z.array(z.string()),
  failedApproaches: z.array(z.object({ attempt: z.string(), result: z.string(), lesson: z.string() })),
  decisions: z.array(z.object({ decision: z.string(), reason: z.string() })),
  priorities: z.array(z.string()),
  criticalContext: z.object({
    mustKnow: z.array(z.string()),
    mustNotDo: z.array(z.string()),
    biggestRisk: z.string(),
    successMetric: z.string()
  }),
  startHere: z.string(),
  agentNotes: z.array(z.string()),
});

const profileResponse = z.object({
  mode: z.enum(["micro", "compact", "full"]),
  micro: z.object({
    identity: z.object({ profession: z.string().optional(), location: z.string().optional(), age: z.number().nullable().optional() }),
    preferences: z.array(z.string()),
    goals: z.array(z.string())
  }),
  compact: z.object({
    identity: z.object({ profession: z.string().optional(), location: z.string().optional(), age: z.number().nullable().optional() }),
    skills: z.array(z.string()),
    interests: z.array(z.string()),
    preferences: z.array(z.string()),
    goals: z.array(z.string()),
    traits: z.array(z.string())
  }),
  full: z.object({
    identity: z.object({ profession: z.string().optional(), location: z.string().optional(), age: z.number().nullable().optional() }),
    skills: z.array(z.string()),
    interests: z.array(z.string()),
    stablePreferences: z.array(z.string()),
    currentGoals: z.array(z.string()),
    futurePlans: z.array(z.string()),
    inferredTraits: z.array(z.string()),
    stableMemories: z.array(z.string()),
    evolvingMemories: z.array(z.string())
  }),
  memoryFacts: z.array(z.object({
    fact: z.string(),
    category: z.string(),
    stability: z.enum(["stable", "evolving"]),
    confidence: z.number()
  })),
  interests: z.array(z.string()),
  riskTolerance: z.string(),
  communicationStyle: z.string(),
  preferences: z.array(z.string()),
  importantContext: z.array(z.string()),
  identity: z.object({
    profession: z.string().optional(),
    location: z.string().optional(),
    age: z.number().nullable().optional()
  }),
  skills: z.array(z.string()),
  goals: z.array(z.string()),
  futurePlans: z.array(z.string()),
  behaviorPatterns: z.array(z.string()),
  dislikes: z.array(z.string()),
  careerStage: z.string(),
  managementIntent: z.boolean(),
  entrepreneurial: z.boolean(),
  inferredTraits: z.array(z.string()),
  stableMemories: z.array(z.string()),
  evolvingMemories: z.array(z.string()),
  deprecatedMemories: z.array(z.string()),
  memoryImportance: z.number(),
  confidence: z.number()
});

const memoryEnrichmentResponse = z.object({
  activeMemories: z.array(z.object({ fact: z.string(), category: z.string(), stability: z.literal("stable"), confidence: z.number() })),
  evolvingMemories: z.array(z.object({ fact: z.string(), category: z.string(), stability: z.literal("evolving"), confidence: z.number() })),
  conflicts: z.array(z.object({ old: z.string(), new: z.string(), reason: z.string() })),
  stablePreferences: z.array(z.string()),
  evolvingPreferences: z.array(z.string()),
  longTermGoals: z.array(z.string()),
  supersededMemories: z.array(z.string()),
  memoryConflicts: z.array(z.object({ current: z.string(), superseded: z.array(z.string()) })),
  stableMemories: z.array(z.string()),
  legacyEvolvingMemories: z.array(z.string()).optional(),
  deprecatedMemories: z.array(z.string()),
  confidence: z.number()
});

const routes = [
  ["/api/summarize", "Summarize context", summarizeResponse, endpointPricing.summarize],
  ["/api/compress-context", "Compress context", compressResponse, endpointPricing["compress-context"]],
  ["/api/handoff", "Create agent handoff", handoffResponse, endpointPricing.handoff],
  ["/api/extract-profile", "Extract user profile", profileResponse, endpointPricing["extract-profile"]],
  ["/api/memory-enrichment", "Enrich long-term memory", memoryEnrichmentResponse, endpointPricing["memory-enrichment"]]
] as const;

registry.registerPath({
  method: "get",
  path: "/api/health",
  summary: "Process liveness probe",
  description: "Dependency-independent liveness probe. It bypasses application rate-limit and concurrency accounting and does not query persistent storage.",
  tags: ["Operations"],
  responses: {
    200: response("The ContextKit process is running.", healthResponse)
  }
});

registry.registerPath({
  method: "get",
  path: "/api/ready",
  summary: "Dependency and configuration readiness probe",
  description: "Checks persistent storage plus required production configuration. Returns 200 for ready or degraded service when storage works; returns 503 only when persistent storage is unavailable. It bypasses application rate-limit and concurrency accounting.",
  tags: ["Operations"],
  responses: {
    200: response("Storage is available; configuration may be ready or degraded.", readinessResponse),
    503: response("Persistent storage is unavailable.", readinessResponse)
  }
});

registry.registerPath({
  method: "get",
  path: "/api/public/launch-readiness",
  summary: "Get public pre-token launch gates",
  description: "Reports closed-beta usage, quality, buyer-retention, and payout gates. The response explicitly states tokenLaunch=not-started. Locked utility concepts are design targets, not an active token, sale, staking program, or airdrop.",
  tags: ["Operations"],
  responses: {
    200: response("Public launch-gate report.", launchReadinessResponse)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/context/upload",
  summary: "Upload long context for contextId-based calls",
  description: "Stores long message payloads temporarily and returns a small contextId that can be sent to paid endpoints, including Bankr-hosted x402 services.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: contextUploadSchema
        }
      }
    }
  },
  responses: {
    201: {
      description: "Context uploaded.",
      content: { "application/json": { schema: contextUploadResponse } }
    },
    422: response("Validation failed.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/context/upload-text",
  summary: "Upload plain-text long context",
  description: "Accepts a plain text body, precomputes the requested endpoint, and returns a contextId for hosted Bankr x402 calls. Query params: endpoint=summarize|compress-context|handoff|extract-profile|memory-enrichment and mode=micro|compact|extended|debug|extract-profile|memory-enrichment.",
  request: {
    body: {
      content: {
        "text/plain": {
          schema: z.string()
        }
      }
    }
  },
  responses: {
    201: {
      description: "Plain-text context uploaded.",
      content: { "application/json": { schema: contextUploadResponse } }
    },
    422: response("Validation failed.", errorSchema)
  }
});

routes.forEach(([path, summary, responseSchema, price]) => {
  registry.registerPath({
    method: "post",
    path,
    summary,
    description: `Requires Bearer API key with context:write scope and x402 payment of ${formatUsd(price)}.`,
    security: [{ ApiKeyAuth: [], X402Payment: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: conversationRequestSchema
          }
        }
      }
    },
    responses: {
      200: {
        description: "Successful context operation.",
        content: { "application/json": { schema: responseSchema } }
      },
      401: response("Invalid API key.", errorSchema),
      402: response("x402 payment required or verification failed.", errorSchema),
      422: response("Validation failed.", errorSchema)
    }
  });
});

const skillRoutes = [
  ["/api/skills/compile", "Compile completed work into a private verified-skill draft", experienceConsiderSchema, endpointPricing["experience-save"]],
  ["/api/skills/validate", "Validate a complete skill repository bundle without storing it", skillBundlePushSchema, endpointPricing["experience-save"]],
  ["/api/skills/push", "Push an immutable content-addressed skill repository version", skillBundlePushSchema, endpointPricing["experience-save"]],
  ["/api/skills/publish", "Publish an approved validation-eligible skill or executable repository version", experiencePublishSchema, endpointPricing["experience-publish"]],
  ["/api/skills/search", "Search verified skill previews", experienceSearchSchema, endpointPricing["experience-search"]],
  ["/api/skills/inspect", "Inspect a verified repository manifest without paid file contents", experienceSearchSchema, endpointPricing["experience-search"]],
  ["/api/skills/buy", "Buy a verified skill install bundle", experienceBuySchema, endpointPricing["experience-buy"]],
  ["/api/skills/clone", "Buy and return every immutable repository file with checksums", experienceBuySchema, endpointPricing["experience-buy"]]
] as const;

skillRoutes.forEach(([path, summary, requestSchema, price]) => {
  registry.registerPath({
    method: "post",
    path,
    summary,
    description: `Requires a Bearer API key with context:write scope and ${formatUsd(price)} in account credits or verified x402 payment. Generic notes, plans, placeholders, project diaries, and plain assertions are rejected. Private skill writes require at least one source-grounded executed PASS. Repository pushes are immutable and SHA-256 addressed; unsafe paths, credentials, install hooks, incomplete source/tests/examples, and identity mismatches are rejected. Public repository publishing requires three grounded PASS results, score 75+, an executable validated bundle, safety checks, and userApproved=true.`,
    tags: ["Verified Skills"],
    security: [{ ApiKeyAuth: [], X402Payment: [] }],
    request: {
      body: {
        content: {
          "application/json": { schema: requestSchema }
        }
      }
    },
    responses: {
      200: response("Successful verified-skill operation.", z.record(z.unknown())),
      201: response("Skill draft or public listing created.", z.record(z.unknown())),
      401: response("Invalid API key.", errorSchema),
      402: response("Credits or x402 payment required.", errorSchema),
      403: response("Ownership or publish capability check failed.", errorSchema),
      422: response("Validation or skill eligibility failed.", errorSchema)
    }
  });
});

registry.registerPath({
  method: "post",
  path: "/api/skills/access",
  summary: "Re-download a previously purchased skill without another payment",
  description: "Requires the buyer's account-scoped API key. Access is permanent after purchase and remains available after seller delisting, irreversible seller archiving, or administrator suspension. The authenticated account, not a caller-supplied buyerId, selects the library record.",
  tags: ["Verified Skills"],
  security: [{ ApiKeyAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: experienceBuySchema }
      }
    }
  },
  responses: {
    200: response("Permanent install access and immutable skill bundle.", z.record(z.unknown())),
    401: response("Authenticated buyer identity is required.", errorSchema),
    404: response("No purchase exists for this account and skill.", errorSchema),
    503: response("The purchased bundle is temporarily unavailable.", errorSchema)
  }
});

registry.registerPath({
  method: "get",
  path: "/api/dashboard/skills/library",
  summary: "List the signed-in buyer's permanent skill library",
  description: "Returns one permanent library entry per purchased skill, including delisted, archived, or moderated listings.",
  tags: ["Marketplace"],
  security: [{ DashboardSession: [] }],
  responses: {
    200: response("Buyer skill library.", z.object({
      results: z.array(z.record(z.unknown())),
      count: z.number()
    })),
    401: response("Dashboard login required.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/admin/marketplace/beta-sellers",
  summary: "Grant or revoke closed-beta seller access",
  description: "Controls database-backed seller access while CONTEXTKIT_MARKETPLACE_BETA_MODE=true. Environment allowlisted sellers remain allowed until removed from CONTEXTKIT_BETA_SELLERS.",
  tags: ["Marketplace Administration"],
  security: [{ AdminToken: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: sellerBetaAccessSchema }
      }
    }
  },
  responses: {
    200: response("Seller beta access updated.", z.object({
      ownerId: z.string(),
      granted: z.boolean(),
      updatedAt: z.string(),
      updatedBy: z.string(),
      status: z.object({
        enabled: z.boolean(),
        allowed: z.boolean(),
        source: z.string()
      })
    })),
    401: response("Admin bearer token required.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/skills/{skillId}/lifecycle",
  summary: "Delist, relist, or archive a seller-owned skill",
  description: "Delist hides a listing and is reversible. Relist requires current repository validation and is blocked while suspended. Archive is irreversible; publish a new semantic version instead. Every action preserves existing buyer access.",
  tags: ["Marketplace"],
  security: [{ DashboardSession: [] }],
  request: {
    params: z.object({ skillId: z.string().regex(/^exp_[a-f0-9]{24}$/) }),
    body: {
      content: {
        "application/json": { schema: skillLifecycleSchema }
      }
    }
  },
  responses: {
    200: response("Listing lifecycle updated.", listingActionResponse),
    401: response("Dashboard login required.", errorSchema),
    403: response("The seller does not own this listing.", errorSchema),
    404: response("Skill not found.", errorSchema),
    409: response("The skill is suspended or irreversibly archived.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/admin/skills/{skillId}/moderation",
  summary: "Suspend or restore a skill listing",
  description: "Server-side administrator action with a required reason. Suspension removes the public listing but never revokes permanent buyer access. Restore returns the skill to its prior public or delisted state.",
  tags: ["Marketplace Administration"],
  security: [{ AdminToken: [] }],
  request: {
    params: z.object({ skillId: z.string().regex(/^exp_[a-f0-9]{24}$/) }),
    body: {
      content: {
        "application/json": { schema: skillModerationSchema }
      }
    }
  },
  responses: {
    200: response("Moderation state updated.", z.object({
      experience: z.record(z.unknown()),
      moderation: z.record(z.unknown()),
      buyerAccessPreserved: z.literal(true)
    })),
    401: response("Admin bearer token required.", errorSchema),
    404: response("Skill not found.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/payout/wallet/challenge",
  summary: "Create a seller payout-wallet signature challenge",
  description: "Creates a ten-minute EIP-191 message for a Base-compatible wallet. Signing proves address control and does not authorize a transaction.",
  tags: ["Seller Payouts"],
  security: [{ DashboardSession: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: payoutWalletChallengeSchema }
      }
    }
  },
  responses: {
    200: response("Wallet challenge created.", z.object({
      ownerId: z.string(),
      address: z.string(),
      nonce: z.string(),
      message: z.string(),
      expiresAt: z.string()
    })),
    401: response("Dashboard login required.", errorSchema),
    422: response("Invalid EVM address.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/payout/wallet/verify",
  summary: "Verify and store a seller payout wallet",
  description: "Verifies the exact active challenge message and stores the normalized payout address. ContextKit never requests or stores a private key.",
  tags: ["Seller Payouts"],
  security: [{ DashboardSession: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: payoutWalletVerifySchema }
      }
    }
  },
  responses: {
    200: response("Payout wallet verified.", z.object({
      wallet: z.object({
        address: z.string(),
        verifiedAt: z.string()
      })
    })),
    401: response("Dashboard login required.", errorSchema),
    404: response("Challenge not found.", errorSchema),
    409: response("Challenge expired.", errorSchema),
    422: response("Signature verification failed.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/payout/request",
  summary: "Request seller settlement in Base USDC",
  description: "Reserves the requested available seller balance for manual review. A verified payout wallet and a minimum balance of 1 USDC are required.",
  tags: ["Seller Payouts"],
  security: [{ DashboardSession: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: payoutRequestSchema }
      }
    }
  },
  responses: {
    201: response("Payout request recorded.", z.object({ payout: payoutRecordSchema })),
    401: response("Dashboard login required.", errorSchema),
    409: response("A request is already in progress.", errorSchema),
    422: response("Wallet, balance, or minimum-payout validation failed.", errorSchema)
  }
});

registry.registerPath({
  method: "get",
  path: "/api/admin/payouts",
  summary: "List the payout review ledger",
  description: "Returns requested, approved, rejected, and paid payout records for server-side reconciliation.",
  tags: ["Marketplace Administration"],
  security: [{ AdminToken: [] }],
  responses: {
    200: response("Payout ledger.", z.object({ payouts: z.array(payoutRecordSchema) })),
    401: response("Admin bearer token required.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/admin/payouts/{payoutId}",
  summary: "Approve, reject, or verify a paid payout",
  description: "Approve/reject updates the review ledger. mark-paid requires a Base transaction hash and verifies a confirmed USDC Transfer to the seller's verified destination for at least the reserved amount before recording settlement. ContextKit does not execute treasury transfers.",
  tags: ["Marketplace Administration"],
  security: [{ AdminToken: [] }],
  request: {
    params: z.object({ payoutId: z.string() }),
    body: {
      content: {
        "application/json": { schema: payoutAdminActionSchema }
      }
    }
  },
  responses: {
    200: response("Payout ledger updated.", z.object({ payout: payoutRecordSchema })),
    401: response("Admin bearer token required.", errorSchema),
    404: response("Payout request not found.", errorSchema),
    409: response("Payout status or transaction conflicts with the requested action.", errorSchema),
    422: response("Transaction hash or confirmed Base USDC transfer is invalid.", errorSchema)
  }
});

function formatUsd(price: number) {
  return `$${price.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}`;
}

registry.registerPath({
  method: "post",
  path: "/api/auth/create-key",
  summary: "Create an API key",
  description: "Requires admin bearer token. Returns the full key once only.",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: createApiKeySchema } } } },
  responses: {
    201: response("API key created.", z.object({ key: z.string(), apiKey: z.record(z.unknown()) })),
    401: response("Unauthorized.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/signup",
  summary: "Create a self-serve dashboard account",
  request: { body: { content: { "application/json": { schema: signupSchema } } } },
  responses: {
    201: response("Account and first API key created.", z.object({ account: z.record(z.unknown()), key: z.string(), apiKey: z.record(z.unknown()) })),
    409: response("Account already exists.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/login",
  summary: "Login to dashboard",
  request: { body: { content: { "application/json": { schema: loginSchema } } } },
  responses: {
    200: response("Dashboard session created.", z.object({ ok: z.boolean(), account: z.record(z.unknown()) })),
    401: response("Invalid login.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/dashboard/create-key",
  summary: "Create an API key for the current dashboard account",
  request: { body: { content: { "application/json": { schema: createApiKeySchema } } } },
  responses: {
    201: response("API key created.", z.object({ key: z.string(), apiKey: z.record(z.unknown()) })),
    401: response("Dashboard session required.", errorSchema)
  }
});

registry.registerPath({
  method: "post",
  path: "/api/auth/revoke-key",
  summary: "Revoke an API key",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: revokeApiKeySchema } } } },
  responses: { 200: response("Revocation result.", z.object({ revoked: z.boolean() })) }
});

registry.registerPath({
  method: "get",
  path: "/api/analytics/overview",
  summary: "Get real aggregated analytics",
  security: [{ ApiKeyAuth: [] }],
  responses: { 200: response("Analytics overview.", z.record(z.unknown())) }
});

registry.registerPath({
  method: "post",
  path: "/api/tokens/estimate",
  summary: "Estimate token counts and reduction",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: tokenEstimateSchema } } } },
  responses: { 200: response("Token estimate.", z.object({ inputTokens: z.number(), compressedTokens: z.number(), reductionPercent: z.number() })) }
});

registry.registerPath({
  method: "post",
  path: "/api/webhooks/register",
  summary: "Register webhook endpoint",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: webhookRegistrationSchema } } } },
  responses: { 201: response("Webhook registered.", z.object({ id: z.string(), secret: z.string(), status: z.string() })) }
});

registry.registerPath({
  method: "post",
  path: "/api/webhooks/replay",
  summary: "Replay a webhook event",
  security: [{ ApiKeyAuth: [] }],
  request: { body: { content: { "application/json": { schema: webhookReplaySchema } } } },
  responses: { 200: response("Webhook replay queued.", z.object({ replayed: z.boolean(), eventId: z.string() })) }
});

export function createOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: {
      title: "ContextKit API",
      version: "0.1.0",
      description: "Context Infrastructure and Verified Skill Registry for AI Agents. Bankr-native context operations plus portable SKILL.md compilation, validation, search, and purchase with x402 payments."
    },
    servers: [{ url: "https://contextkit.pro" }, { url: "http://localhost:3000" }],
    tags: [
      { name: "Context" },
      { name: "Verified Skills" },
      { name: "Marketplace" },
      { name: "Seller Payouts" },
      { name: "Marketplace Administration" },
      { name: "Authentication" },
      { name: "Analytics" },
      { name: "Operations" },
      { name: "Tokens" },
      { name: "Webhooks" }
    ],
    externalDocs: {
      description: "ContextKit developer documentation",
      url: "https://contextkit.pro/docs"
    }
  });
}

function response(description: string, schema: z.ZodTypeAny) {
  return {
    description,
    content: {
      "application/json": {
        schema
      }
    }
  };
}
