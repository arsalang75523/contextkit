# @basedchef/contextkit

TypeScript SDK for ContextKit, a Bankr-hosted x402 context API for AI agents.

Use it when you are building a TypeScript integration that needs typed calls to ContextKit direct APIs, webhook verification, API-key credits, and optional x402 payment handling. For the simplest paid path, agents can still call the Bankr-hosted x402 endpoints directly without this SDK.

## Install

```bash
npm install @basedchef/contextkit
```

## What It Does

- Summarize long agent conversations into compact continuation state.
- Compress project context into reusable machine-optimized memory.
- Generate agent-to-agent handoff payloads.
- Extract durable user profile memory.
- Estimate tokens for API-key workflows.
- Verify signed ContextKit webhook deliveries.
- Attach API keys for direct API integrations.
- Use account credits so SDK users can call paid endpoints without Bankr.
- Optionally attach an x402 payment handler when credits are not available.

## Quick Start

```ts
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://91.107.248.223.sslip.io"
});

const response = await client.summarize({
  messages: [
    {
      role: "user",
      content: "Summarize this long project context for the next AI agent."
    }
  ],
  mode: "compact"
});
```

## API Methods

```ts
await client.summarize({ messages, mode: "micro" });
await client.compressContext({ messages });
await client.handoff({ messages });
await client.extractProfile({ messages });
await client.estimateTokens({ modelFamily: "openai", input: messages });
await client.credits();
```

## Bankr-Hosted x402 Path

Most users and agents do not need the SDK. They can call the hosted paid endpoint from a Bankr-authenticated terminal:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Summarize this context."}]}'
```

That flow requires no ContextKit API key, no npm package, and no SDK.

## Direct API Path

The SDK is for direct API integrations. If the API key owner has ContextKit credits, paid generation routes run without Bankr and deduct the endpoint price from the account balance. If credits are insufficient, the API falls back to the standard x402 payment challenge.

```ts
const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://91.107.248.223.sslip.io"
});
```

Optional x402 fallback:

```ts
const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://91.107.248.223.sslip.io",
  x402: async (challenge) => wallet.pay(challenge)
});
```

## Webhook Verification

```ts
import { verifyContextKitWebhook } from "@basedchef/contextkit";

const valid = await verifyContextKitWebhook({
  payload: rawBody,
  signature: request.headers.get("ContextKit-Signature")!,
  secret: process.env.CONTEXTKIT_WEBHOOK_SECRET!
});
```

## License

MIT
