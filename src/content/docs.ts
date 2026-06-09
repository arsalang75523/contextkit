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
    response: { compressedContext: "goal=ship ContextKit; constraints=Bankr-native,x402; next=deploy", estimatedSavings: "78%", micro: "Ship ContextKit with Bankr x402.", compact: "ContextKit: Bankr-native x402 context API; next=deploy.", extended: "ContextKit is a Bankr-native x402 context API with dashboard, analytics, and webhook flows.", prioritizedFacts: [{ fact: "Bankr-hosted x402 is required", importance: 10 }], entities: { project: "ContextKit", people: [], stack: ["Bankr", "x402"], deadlines: [], constraints: ["Bankr-native"] }, conflicts: [], metrics: { originalTokens: 120, compressedTokens: 26, actualReductionPercent: 78, factRetentionScore: 0.9 } }
  },
  {
    slug: "handoff",
    method: "POST",
    path: "/api/handoff",
    price: "$0.003",
    event: "handoff.generated",
    description: "Generate a structured agent-to-agent continuation payload.",
    response: { goal: "Ship ContextKit", importantFacts: ["Uses Bankr LLM Gateway"], constraints: ["x402 required"], recommendedNextActions: ["Deploy"], tone: "senior and direct", userIntent: "launch product", projectSummary: "ContextKit is context infrastructure for AI agents.", currentState: "Production hardening underway.", completedWork: ["x402 works"], inProgress: ["Auth hardening"], pendingTasks: ["Verify email domain"], knownIssues: [], failedApproaches: [], importantDecisions: [{ decision: "Use Bankr-hosted x402", reason: "Best agent payment UX" }], blockers: [], agentNotes: ["Keep endpoint names stable"], confidence: 0.88 }
  },
  {
    slug: "extract-profile",
    method: "POST",
    path: "/api/extract-profile",
    price: "$0.004",
    event: "profile.extracted",
    description: "Extract durable user preferences for reusable agent memory.",
    response: { interests: ["AI agents"], riskTolerance: "unknown", communicationStyle: "concise", preferences: ["production APIs"], importantContext: ["Bankr ecosystem"], identity: { profession: "founder/operator", location: "unknown", age: null }, skills: ["deployment debugging"], goals: ["launch ContextKit"], futurePlans: ["public launch"], behaviorPatterns: ["moves quickly"], dislikes: ["confusing UX"], careerStage: "startup builder", managementIntent: true, entrepreneurial: true, confidence: 0.82 }
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
