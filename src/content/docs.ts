export const endpoints = [
  {
    slug: "summarize",
    method: "POST",
    path: "/api/summarize",
    price: "$0.002",
    event: "summarization.completed",
    description: "Summarize long conversations into concise optimized context.",
    response: { summary: "User is building an x402 context API...", tokenReductionEstimate: 72 }
  },
  {
    slug: "compress-context",
    method: "POST",
    path: "/api/compress-context",
    price: "$0.003",
    event: "context.compressed",
    description: "Compress context into compact structured memory.",
    response: { compressedContext: "goal=ship ContextKit; constraints=Bankr-native,x402; next=deploy", estimatedSavings: "45%" }
  },
  {
    slug: "handoff",
    method: "POST",
    path: "/api/handoff",
    price: "$0.003",
    event: "handoff.generated",
    description: "Generate a structured agent-to-agent continuation payload.",
    response: { goal: "Ship ContextKit", importantFacts: ["Uses Bankr LLM Gateway"], constraints: ["x402 required"], recommendedNextActions: ["Deploy"], tone: "senior and direct", userIntent: "launch product" }
  },
  {
    slug: "extract-profile",
    method: "POST",
    path: "/api/extract-profile",
    price: "$0.004",
    event: "profile.extracted",
    description: "Extract durable user preferences for reusable agent memory.",
    response: { interests: ["AI agents"], riskTolerance: "unknown", communicationStyle: "concise", preferences: ["production APIs"], importantContext: ["Bankr ecosystem"] }
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
