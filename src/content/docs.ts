export const endpoints = [
  {
    slug: "summarize",
    method: "POST",
    path: "/api/summarize",
    price: "$0.05",
    event: "summarization.completed",
    description: "Summarize long conversations into concise optimized context with micro, compact, extended, or debug modes.",
    response: {
      mode: "compact",
      compact: "Night-bus pilot is preparing for launch. Route planning and staffing work are mostly complete, but charging limits and weekend coverage remain unresolved. Current focus is finalizing operations and airport access terms.",
      state: {
        goal: "Reduce overnight transit wait times",
        status: "Pilot planning in progress",
        blockers: ["Limited depot charging capacity", "Weekend driver coverage unresolved"],
        next: ["Finalize charger schedule", "Confirm weekend coverage", "Negotiate airport windows"]
      },
      metrics: { inputTokens: 190, outputTokens: 31, stateTokens: 45, totalOutputTokens: 76, reductionPercent: 60, latencyMs: 4200 }
    }
  },
  {
    slug: "compress-context",
    method: "POST",
    path: "/api/compress-context",
    price: "$0.03",
    event: "context.compressed",
    description: "Compress context into compact structured memory.",
    response: {
      compressedContext: "Night-bus pilot: reduce post-midnight waits below 18m without budget increase. Plan: three overnight loops, small electric shuttles, unchanged daytime network. Issues: eight-vehicle charging cap, weekend driver coverage, airport 10m curb windows. Next: charger schedule, driver coverage, airport penalties, council briefing Tuesday.",
      state: {
        goals: ["Reduce overnight transit waits below 18 minutes"],
        status: ["Night-bus pilot planning is in progress"],
        activeProblems: ["Limited charging capacity", "Weekend driver coverage unresolved"],
        constraints: ["Do not increase annual operating budget", "Respect driver rest-day rules", "Meet airport curb windows"],
        decisions: ["Keep daytime network unchanged", "Use smaller electric shuttles"],
        nextSteps: ["Finalize charger schedule", "Confirm weekend coverage", "Prepare council briefing"]
      },
      entities: { people: [], projects: ["Night-bus pilot"], technologies: ["Electric shuttles"], organizations: ["Transit authority", "Hospital district", "Airport authority"], deadlines: ["City council briefing next Tuesday"] },
      metrics: { inputTokens: 190, compressedTokens: 67, reductionPercent: 65 }
    }
  },
  {
    slug: "handoff",
    method: "POST",
    path: "/api/handoff",
    price: "$0.03",
    event: "handoff.generated",
    description: "Generate a structured agent-to-agent continuation payload.",
    response: {
      project: { name: "Night-bus pilot", goal: "Reduce overnight transit wait times", currentState: "Route and staffing plan under review" },
      completed: ["Ridership interviews", "Stop safety audits", "Route maps", "Driver staffing model", "Draft airport agreement"],
      inProgress: ["Charger scheduling", "Weekend driver coverage", "Airport curb-window terms"],
      pending: ["East loop frequency decision", "Council briefing", "Cold-weather charging plan"],
      blockers: ["Charging capacity limited to eight vehicles", "Weekend driver coverage unresolved"],
      failedApproaches: [],
      decisions: [
        { decision: "Keep daytime network unchanged", reason: "Avoid disruption and budget expansion" },
        { decision: "Use smaller electric shuttles", reason: "Match low-demand overnight segments" }
      ],
      priorities: ["Finalize charger schedule", "Confirm driver coverage", "Resolve airport penalties", "Prepare council briefing"],
      criticalContext: {
        mustKnow: ["Hospital shift change requires service before 5:30 AM", "Airport curb access depends on 10-minute arrival windows"],
        mustNotDo: ["Do not increase annual operating budget", "Do not violate driver rest-day rules"],
        biggestRisk: "Charging and staffing constraints delay pilot launch",
        successMetric: "Average post-midnight wait time below 18 minutes"
      },
      startHere: "Resolve charger scheduling and weekend driver coverage before the council briefing.",
      agentNotes: ["Operations lead prefers concise updates with risks and action lists"]
    }
  },
  {
    slug: "extract-profile",
    method: "POST",
    path: "/api/extract-profile",
    price: "$0.04",
    event: "profile.extracted",
    description: "Extract durable user preferences, or run memory enrichment with mode: memory-enrichment.",
    response: {
      mode: "compact",
      micro: { identity: { profession: "operations lead", location: "unknown", age: null }, preferences: ["concise weekly updates"], goals: ["launch night-bus pilot"] },
      compact: { identity: { profession: "operations lead", location: "unknown", age: null }, skills: ["transit planning"], interests: ["overnight mobility"], preferences: ["clear risks", "short action lists"], goals: ["launch night-bus pilot"], traits: ["execution-focused"] },
      full: { identity: { profession: "operations lead", location: "unknown", age: null }, skills: ["transit planning"], interests: ["overnight mobility"], stablePreferences: ["concise weekly updates"], currentGoals: ["launch night-bus pilot"], futurePlans: ["city council briefing"], inferredTraits: ["execution-focused"], stableMemories: [], evolvingMemories: [] },
      memoryFacts: [
        { fact: "Prefers concise weekly updates", category: "preference", stability: "stable", confidence: 0.96 },
        { fact: "Wants clear risks and short action lists", category: "preference", stability: "stable", confidence: 0.95 },
        { fact: "Preparing a night-bus pilot", category: "goal", stability: "evolving", confidence: 0.92 }
      ],
      interests: ["overnight mobility"],
      riskTolerance: "unknown",
      communicationStyle: "concise weekly updates",
      preferences: ["concise weekly updates", "clear risks", "short action lists"],
      importantContext: ["Avoid long policy background unless a decision requires it"],
      identity: { profession: "operations lead", location: "unknown", age: null },
      skills: ["transit planning"],
      goals: ["launch night-bus pilot"],
      futurePlans: ["city council briefing"],
      behaviorPatterns: [],
      dislikes: ["long policy background"],
      careerStage: "unknown",
      managementIntent: false,
      entrepreneurial: false,
      inferredTraits: ["execution-focused"],
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
    price: "$0.04",
    event: "request.completed",
    description: "Evolve long-term memory. Bankr-hosted calls use contextkit-core with endpoint: memory-enrichment; direct API-key usage can still call /api/memory-enrichment.",
    response: {
      activeMemories: [{ fact: "Prefers concise weekly updates", category: "preference", stability: "stable", confidence: 0.96 }],
      evolvingMemories: [{ fact: "Preparing a night-bus pilot", category: "project", stability: "evolving", confidence: 0.92 }],
      conflicts: [],
      longTermGoals: ["Improve overnight transit access"],
      stablePreferences: ["concise weekly updates"],
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

export const bankrEndpoints = [
  {
    slug: "contextkit-core",
    path: "contextkit-core",
    price: "$0.03",
    modes: ["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"],
    description: "One paid Bankr endpoint for all core ContextKit operations. Select the operation with endpoint or mode."
  },
  {
    slug: "contextkit-experience-write",
    path: "contextkit-experience-write",
    price: "$0.01",
    modes: ["experience-save", "experience-publish"],
    description: "MCP V2 write lane for saving private experiences or publishing marketplace listings."
  },
  {
    slug: "contextkit-experience-search",
    path: "contextkit-experience-search",
    price: "$0.01",
    modes: ["experience-search"],
    description: "MCP V2 search lane for reusable agent lessons, private records, and public marketplace results."
  },
  {
    slug: "contextkit-experience-buy",
    path: "contextkit-experience-buy",
    price: "$0.05",
    modes: ["experience-buy"],
    description: "MCP V2 purchase lane for buying published agent experience records through Bankr x402."
  }
];
