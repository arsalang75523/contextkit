# @basedchef/contextkit

TypeScript SDK for ContextKit, a Bankr-hosted x402 context API for AI agents.

Use it when you are building a TypeScript integration that needs typed calls to ContextKit direct APIs, webhook verification, API-key credits, and optional x402 payment handling. For the simplest paid path, agents can still call the Bankr-hosted x402 endpoints directly without this SDK.

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

ContextKit has two usage paths:

- **Bankr-hosted x402:** simplest paid path for users and agents. No SDK and no ContextKit API key required.
- **SDK + API key credits:** direct app integration. The user buys ContextKit credits, then your app calls ContextKit with an API key without requiring Bankr on every request.

## Install

```bash
npm install @basedchef/contextkit
```

## Quick Check

```bash
node --input-type=module -e 'import { ContextKit } from "@basedchef/contextkit"; console.log(typeof ContextKit)'
```

Expected:

```txt
function
```

## Create A Client

```ts
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});
```

## Summarize

```bash
cat > summarize.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.summarize({
  mode: "compact",
  messages: [
    {
      role: "user",
      content: "We are launching a night-bus pilot. Preserve current goal, blockers, constraints, and next actions for the next AI agent."
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
EOF

node summarize.mjs
```

Available summarize modes:

- `micro`: highest compression for agent memory.
- `compact`: default AI-to-AI transfer format.
- `extended`: human-readable continuation summary.
- `debug`: full diagnostic shape for development.

## Compress Context

```bash
cat > compress.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.compressContext({
  messages: [
    {
      role: "user",
      content: "Project Atlas is a transit analytics platform. Stack is Next.js, Postgres, Redis. Current issues are slow reports and missing operator onboarding. Deadline is beta in six weeks."
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
EOF

node compress.mjs
```

## Handoff

```bash
cat > handoff.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.handoff({
  messages: [
    {
      role: "user",
      content: "Create a project handoff for a successor agent. Preserve goals, completed work, blockers, decisions, constraints, and next actions."
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
EOF

node handoff.mjs
```

## Extract Profile

```bash
cat > profile.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.extractProfile({
  messages: [
    {
      role: "user",
      content: "I prefer short technical updates, direct debugging help, clear risks, and command-by-command deployment instructions."
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
EOF

node profile.mjs
```

## Memory Enrichment

`memoryEnrichment` is a direct API-key endpoint for evolving long-term memory. It is useful when your app already manages user accounts and wants durable memory without a per-request Bankr terminal flow.

```bash
cat > memory.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.memoryEnrichment({
  messages: [
    {
      role: "user",
      content: "I used to prefer long weekly reports, but now I want short risk-focused updates with clear next actions."
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
EOF

node memory.mjs
```

## Token Estimate

```bash
cat > estimate.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.estimateTokens({
  modelFamily: "openai",
  input: [
    {
      role: "user",
      content: "We need to preserve only goals, blockers, constraints, and next steps."
    }
  ],
  compressed: "Preserve goals, blockers, constraints, next steps."
});

console.log(JSON.stringify(result, null, 2));
EOF

node estimate.mjs
```

## Optional x402 Fallback

If an API key has no credits, ContextKit direct paid routes return HTTP 402. Advanced apps can provide an x402 payment handler.

```ts
const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro",
  x402: async (challenge, request) => {
    return wallet.pay(challenge, request);
  }
});
```

Most SDK integrations should instead top up credits from the dashboard and avoid per-request Bankr interaction.

## Bankr-Hosted x402 Without SDK

For simple users and autonomous agents, this is the main path:

Summarize:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Summarize this context."}]}'
```

Compress context:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-compress \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Compress this project context into compact memory."}]}'
```

Handoff:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-handoff \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Create a project handoff for the next AI agent."}]}'
```

Extract profile:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Extract durable user preferences and profile memory."}],"mode":"extract-profile"}'
```

Memory enrichment through the same hosted profile endpoint:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Update stable and evolving memories from this conversation."}],"mode":"memory-enrichment"}'
```

This path requires:

- Bankr login
- USDC payment approval

This path does **not** require:

- ContextKit API key
- npm package
- SDK integration

## Webhook Verification

```ts
import { verifyContextKitWebhook } from "@basedchef/contextkit";

const valid = await verifyContextKitWebhook({
  payload: rawBody,
  signature: request.headers.get("ContextKit-Signature")!,
  secret: process.env.CONTEXTKIT_WEBHOOK_SECRET!
});
```

## API Key Credits

Paid direct endpoints use the API key owner's ContextKit credit balance first. If credits are available, no Bankr payment is needed per request.

```ts
const credits = await client.credits();
console.log(credits.balanceUsd);
```

Equivalent terminal test:

```bash
cat > credits.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.credits();
console.log(JSON.stringify(result, null, 2));
EOF

node credits.mjs
```

If the balance is too low, direct paid routes return a normal HTTP 402 x402 challenge.

## Buy Credits

Users can top up credits from the ContextKit dashboard:

1. Sign in to the dashboard.
2. Open `/dashboard/credits`.
3. Create a USDC invoice.
4. Send the exact USDC amount on Base to the shown wallet.
5. Paste the transaction hash.
6. ContextKit verifies the transaction and credits the account automatically.

The backend verifies:

- the transaction exists on Base,
- the transaction succeeded,
- the Base USDC contract emitted a `Transfer`,
- the recipient is the ContextKit wallet,
- the amount is at least the invoice amount,
- the tx hash was not already used.

## Troubleshooting

`ContextKit API request failed with 402`

Your API key has insufficient credits. Top up credits in `/dashboard/credits` or provide an x402 payment handler.

`ContextKit API request failed with 401`

The API key is invalid, revoked, or missing required scopes.

## License

MIT
