# contextkit TypeScript SDK

Typed SDK for ContextKit, the x402-powered context infrastructure API for AI agents.

```ts
import { ContextKit } from "contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  x402: async (challenge) => wallet.pay(challenge)
});

const response = await client.summarize({ messages });
```

## Methods

- `summarize(request)`
- `compressContext(request)`
- `handoff(request)`
- `extractProfile(request)`
- `estimateTokens(request)`

## Webhook Verification

```ts
import { verifyContextKitWebhook } from "contextkit";

const valid = await verifyContextKitWebhook({
  payload: rawBody,
  signature: request.headers.get("ContextKit-Signature")!,
  secret: process.env.CONTEXTKIT_WEBHOOK_SECRET!
});
```

## Build

```bash
npm install
npm run build
```
