export const endpoints = [
  {
    slug: "summarize",
    method: "POST",
    path: "/api/summarize",
    price: "$0.002",
    event: "summarization.completed",
    description: "Summarize long conversations into concise optimized context.",
    response: { summary: "User is building an x402 context API...", tokenReductionEstimate: 72, keyDecisions: ["Use Bankr-hosted x402"], actionItems: ["Deploy updated service"], openQuestions: [], risks: ["Email delivery requires verified domain"], confidence: 0.86 }
  },
  {
    slug: "compress-context",
    method: "POST",
    path: "/api/compress-context",
    price: "$0.003",
    event: "context.compressed",
    description: "Compress context into compact structured memory.",
    response: {
      compressedContext: "project=ContextKit; objective=ship Bankr x402 context API; decisions=Bankr-hosted x402,Postgres; next=verify dashboard metrics",
      estimatedSavings: "78%",
      micro: "ContextKit ships Bankr-hosted x402 context APIs; next: verify dashboard metrics.",
      compact: "ContextKit: Bankr-native x402 context API on Postgres. Preserve routes, keep Bankr-hosted x402, verify metrics/dashboard before launch.",
      extended: "ContextKit is a Bankr-native x402 context API with dashboard, analytics, webhook, and agent continuation flows. Current priorities: verify dashboard metrics, document paid requests, preserve backward compatibility.",
      prioritizedFacts: [{ fact: "Bankr-hosted x402 is required", importance: 10 }],
      importantFactsRanked: [{ fact: "Endpoint names and response fields must remain backward-compatible", importance: 10 }],
      state: {
        currentGoals: ["Launch ContextKit as production AI context infrastructure"],
        activeProblems: ["Dashboard metrics must stay scoped per account/API key"],
        currentStatus: ["Bankr-hosted x402 services are live"],
        constraints: ["Do not rename routes", "Do not remove response fields"],
        decisions: ["Use Bankr-hosted x402", "Use Postgres for persistence"],
        priorities: ["Verify metrics", "Improve docs", "Ship demo"],
        nextSteps: ["Run paid x402 smoke tests", "Review dashboard data"]
      },
      commitments: {
        goals: ["Public launch readiness"],
        constraints: ["Backward compatibility"],
        decisions: ["Bankr-hosted x402"],
        promises: ["Do not introduce breaking changes"],
        requirements: ["Production-capable API responses"]
      },
      agentContinuationPacket: {
        project: "ContextKit",
        currentObjective: "Ship production-ready Bankr x402 context APIs",
        highestPriorityIssue: "Verify scoped dashboard metrics",
        activeDecisionSet: ["Bankr-hosted x402", "Postgres", "Stable routes"],
        nextAction: "Run x402 smoke tests and compare dashboard analytics",
        criticalConstraints: ["No breaking API changes"]
      },
      entities: { project: "ContextKit", projects: ["ContextKit"], people: [], organizations: ["Bankr"], stack: ["Bankr", "x402"], technologies: ["x402"], services: ["Bankr LLM"], deadlines: [], constraints: ["Bankr-native"] },
      conflicts: [{ old: "SQLite", new: "PostgreSQL", reason: "Production persistence decision changed", current: "PostgreSQL", superseded: ["SQLite"] }],
      supersededFacts: [{ old: "SQLite", new: "PostgreSQL", reason: "Production persistence decision changed", current: "PostgreSQL", superseded: ["SQLite"] }],
      compressionMetrics: { inputTokens: 120, outputTokens: 26, actualReductionPercent: 78, criticalFactRecall: 1, decisionRecall: 1, constraintRecall: 1 },
      inputTokens: 120,
      outputTokens: 26,
      actualReductionPercent: 78,
      factRetentionScore: 0.9,
      criticalFactsRetained: 1,
      metrics: { originalTokens: 120, compressedTokens: 26, actualReductionPercent: 78, factRetentionScore: 0.9 }
    }
  },
  {
    slug: "handoff",
    method: "POST",
    path: "/api/handoff",
    price: "$0.003",
    event: "handoff.generated",
    description: "Generate a structured agent-to-agent continuation payload.",
    response: { goal: "Ship ContextKit", importantFacts: ["Uses Bankr LLM Gateway"], constraints: ["x402 required"], recommendedNextActions: ["Deploy"], tone: "senior and direct", userIntent: "launch product", projectSummary: "ContextKit is context infrastructure for AI agents.", currentState: "Production hardening underway.", completedWork: ["x402 works"], inProgress: ["Auth hardening"], pendingTasks: ["Verify email domain"], knownIssues: [], failedApproaches: [], importantDecisions: [{ decision: "Use Bankr-hosted x402", reason: "Best agent payment UX" }], blockers: [], agentNotes: ["Keep endpoint names stable"], priorityOrder: ["Verify email", "Deploy"], recommendedStartingPoint: "Check production logs", highestRiskArea: "email deliverability", repositories: [], artifacts: [], links: [], owners: [], confidence: 0.88 }
  },
  {
    slug: "extract-profile",
    method: "POST",
    path: "/api/extract-profile",
    price: "$0.004",
    event: "profile.extracted",
    description: "Extract durable user preferences for reusable agent memory.",
    response: { interests: ["AI agents"], riskTolerance: "unknown", communicationStyle: "concise", preferences: ["production APIs"], importantContext: ["Bankr ecosystem"], identity: { profession: "founder/operator", location: "unknown", age: null }, skills: ["deployment debugging"], goals: ["launch ContextKit"], futurePlans: ["public launch"], behaviorPatterns: ["moves quickly"], dislikes: ["confusing UX"], careerStage: "startup builder", managementIntent: true, entrepreneurial: true, inferredTraits: ["entrepreneurial"], stableMemories: ["prefers concise technical guidance"], evolvingMemories: ["launching ContextKit"], deprecatedMemories: [], memoryImportance: 8, confidence: 0.82 }
  },
  {
    slug: "memory-enrichment",
    method: "POST",
    path: "/api/memory-enrichment",
    price: "$0.003",
    event: "request.completed",
    description: "Evolve long-term memory without duplicating stale preferences.",
    response: { stablePreferences: ["concise explanations"], evolvingPreferences: [], longTermGoals: ["launch ContextKit"], supersededMemories: [], memoryConflicts: [], stableMemories: ["prefers concise explanations"], evolvingMemories: ["launching ContextKit"], deprecatedMemories: [], confidence: 0.84 }
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
