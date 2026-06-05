import { ContextKit } from "../src";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY ?? "",
  x402: async (challenge) => {
    const requirement = challenge as { accepts?: unknown[] };
    throw new Error(`Connect your x402 wallet and pay this requirement: ${JSON.stringify(requirement.accepts?.[0])}`);
  }
});

const response = await client.summarize({
  messages: [
    {
      role: "user",
      content: "We need to hand off a long-running autonomous workflow to another agent."
    }
  ]
});

console.log(response.summary);
