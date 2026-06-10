export const endpoints = [
  {
    slug: "summarize",
    method: "POST",
    path: "/api/summarize",
    price: "$0.002",
    event: "summarization.completed",
    description: "Summarize long conversations into concise optimized context with micro, compact, extended, or debug modes.",
    response: {
      mode: "micro",
      micro: "ContextKit: Bankr x402 context API. Next: deploy.",
      state: { goal: "Launch ContextKit", status: "deployment update ready", blockers: [], decisions: ["Use Bankr-hosted x402"], priorities: ["Deploy", "Verify metrics"], nextSteps: ["Deploy updated service"] }
    }
  },
  {
    slug: "compress-context",
    method: "POST",
    path: "/api/compress-context",
    price: "$0.003",
    event: "context.compressed",
    description: "Compress context into compact structured memory.",
    response: {
      compressedContext: "ContextKit: Bankr x402 context API. Stack: Next.js/Hono/Postgres/Bankr LLM. State: hosted paid services live. Decisions: Bankr-hosted x402, stable routes. Next: verify dashboard metrics, docs, demos.",
      state: {
        goals: ["Launch ContextKit as production AI context infrastructure"],
        status: ["Bankr-hosted x402 services are live"],
        activeProblems: ["Dashboard metrics must stay scoped per account/API key"],
        constraints: ["Do not rename routes", "Do not remove response fields"],
        decisions: ["Use Bankr-hosted x402", "Use Postgres for persistence"],
        nextSteps: ["Run paid x402 smoke tests", "Review dashboard data"]
      },
      entities: { people: [], projects: ["ContextKit"], technologies: ["Next.js", "Hono", "Postgres", "x402"], organizations: ["Bankr"], deadlines: [] },
      metrics: { inputTokens: 120, compressedTokens: 38, reductionPercent: 68 }
    }
  },
  {
    slug: "handoff",
    method: "POST",
    path: "/api/handoff",
    price: "$0.003",
    event: "handoff.generated",
    description: "Generate a structured agent-to-agent continuation payload.",
    response: {
      project: { name: "ContextKit", goal: "Context infrastructure for AI agents", currentState: "Production hardening underway" },
      completed: ["Bankr-hosted x402", "Postgres persistence", "API key auth"],
      inProgress: ["Auth hardening", "docs polish"],
      pending: ["Webhook UI", "long-context demos"],
      blockers: [],
      failedApproaches: [],
      decisions: [{ decision: "Use Bankr-hosted x402", reason: "Best paid-agent UX" }],
      priorities: ["verify email", "deploy", "docs"],
      criticalContext: { mustKnow: ["Keep endpoint names stable"], mustNotDo: ["Do not break API contracts"], biggestRisk: "email deliverability", successMetric: "paid x402 requests succeed" },
      startHere: "Check production logs and run paid x402 smoke tests.",
      agentNotes: ["User prefers concise operational guidance"]
    }
  },
  {
    slug: "extract-profile",
    method: "POST",
    path: "/api/extract-profile",
    price: "$0.004",
    event: "profile.extracted",
    description: "Extract durable user preferences for reusable agent memory.",
    response: {
      mode: "compact",
      micro: { identity: { profession: "founder/operator", location: "unknown", age: null }, preferences: ["concise technical guidance"], goals: ["launch ContextKit"] },
      compact: { identity: { profession: "founder/operator", location: "unknown", age: null }, skills: ["deployment debugging"], interests: ["AI agents"], preferences: ["concise technical guidance"], goals: ["launch ContextKit"], traits: ["entrepreneurial"] },
      full: { identity: { profession: "founder/operator", location: "unknown", age: null }, skills: ["deployment debugging"], interests: ["AI agents"], stablePreferences: ["concise technical guidance"], currentGoals: ["launch ContextKit"], futurePlans: ["public launch"], inferredTraits: ["entrepreneurial"], stableMemories: [], evolvingMemories: [] },
      memoryFacts: [{ fact: "concise technical guidance", category: "preference", stability: "stable", confidence: 0.95 }],
      interests: ["AI agents"],
      riskTolerance: "unknown",
      communicationStyle: "concise technical guidance",
      preferences: ["concise technical guidance"],
      importantContext: ["Bankr ecosystem"],
      identity: { profession: "founder/operator", location: "unknown", age: null },
      skills: ["deployment debugging"],
      goals: ["launch ContextKit"],
      futurePlans: ["public launch"],
      behaviorPatterns: [],
      dislikes: [],
      careerStage: "startup builder",
      managementIntent: true,
      entrepreneurial: true,
      inferredTraits: ["entrepreneurial"],
      stableMemories: [],
      evolvingMemories: [],
      deprecatedMemories: [],
      memoryImportance: 8,
      confidence: 0.95
    }
  },
  {
    slug: "memory-enrichment",
    method: "POST",
    path: "/api/memory-enrichment",
    price: "$0.003 API key / $0.004 hosted profile",
    event: "request.completed",
    description: "Evolve long-term memory without duplicating stale preferences. Bankr-hosted paid memory extraction is served through contextkit-profile while the direct API-key endpoint remains /api/memory-enrichment.",
    response: {
      activeMemories: [{ fact: "concise technical guidance", category: "preference", stability: "stable", confidence: 0.95 }],
      evolvingMemories: [{ fact: "launch ContextKit", category: "goal", stability: "evolving", confidence: 0.9 }],
      conflicts: [],
      longTermGoals: ["launch ContextKit"],
      stablePreferences: ["concise technical guidance"],
      evolvingPreferences: [],
      supersededMemories: [],
      memoryConflicts: [],
      stableMemories: [],
      legacyEvolvingMemories: [],
      deprecatedMemories: [],
      confidence: 0.93
    }
  }
];

export const integrationGuides = [
  "Bankr Agents",
  "LangChain",
  "CrewAI",
  "AutoGen",
  "OpenAI Agents",
  "Claude-based agents"
];
