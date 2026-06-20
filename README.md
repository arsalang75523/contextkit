# ContextKit

ContextKit is a memory layer for autonomous AI agents.

Website: https://contextkit.pro

It turns long conversations, project notes, and operational history into compact continuation state that another agent can safely pick up later. The focus is not pretty summaries. The focus is preserving goals, blockers, constraints, decisions, next actions, durable preferences, and handoff state with fewer tokens.

## Why It Exists

Long-running agents drift when context gets too large, too expensive, or too loosely summarized. ContextKit gives agents a paid context-compression layer that can be called from a terminal, another agent, a backend service, or a TypeScript app.

Use ContextKit when you need:

- agent continuation memory,
- compact project state,
- agent-to-agent handoffs,
- durable profile extraction,
- memory enrichment,
- API-key credits for app integrations,
- Bankr-hosted x402 payment for public pay-per-call usage,
- signed webhook delivery for downstream automation.

## Usage Paths

### 1. Bankr-Hosted x402

This is the main public path for users and autonomous agents.

The caller runs a `bankr x402 call`, approves USDC payment, and receives JSON. No ContextKit API key, npm package, or SDK is required.

### 2. API Key Credits

Dashboard users can create API keys and buy account credits. Direct `/api/*` routes spend credits first, so apps can call paid endpoints without asking the user to approve Bankr on every request.

### 3. TypeScript SDK

Advanced developers can install `@basedchef/contextkit` for typed API calls, credit checks, webhook verification, and optional x402 fallback handling.

### 4. Hosted MCP

Agent hosts can connect to the stateless Streamable HTTP MCP endpoint at `https://contextkit.pro/mcp`. MCP uses a normal dashboard-created API key with `context:write` and spends the same account credits as direct API calls.

## Paid Endpoints

| Endpoint | Bankr service | Purpose | Price |
| --- | --- | --- | ---: |
| `POST /api/summarize` | `contextkit-summarize` | Micro, compact, extended, or debug continuation summaries | `$0.05` |
| `POST /api/compress-context` | `contextkit-compress` | Machine-optimized context packet | `$0.03` |
| `POST /api/handoff` | `contextkit-handoff` | Agent-to-agent project transfer | `$0.03` |
| `POST /api/extract-profile` | `contextkit-profile` | Durable profile extraction or memory enrichment via `mode` | `$0.04` |

Utility endpoints such as token estimates, credits, analytics, keys, and webhooks use dashboard API keys instead of Bankr-hosted pay-per-call.

## Bankr-Hosted x402 Commands

Summarize:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Summarize this project state for the next AI agent."}],"mode":"compact"}'
```

Compress context:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-compress \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow report generation and onboarding remain. Beta is due in six weeks."}]}'
```

Handoff:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-handoff \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Create a handoff for the next AI agent. Preserve goal, completed work, blockers, decisions, constraints, and immediate next actions."}]}'
```

Extract profile:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"I prefer short technical explanations, direct debugging help, clear risks, and step-by-step commands."}],"mode":"extract-profile"}'
```

Memory enrichment uses the same hosted profile endpoint:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"I used to want long weekly reports, but now I prefer short risk-focused updates with clear next actions."}],"mode":"memory-enrichment"}'
```

Useful Bankr helpers:

```bash
bankr x402 schema https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize -i
```

## Long Context

For very large content, upload first and then pay only for the final result request.

Summarize long plain text:

```bash
cat > long-context.txt <<'CONTEXTKIT_LONG_CONTEXT'
Paste the long conversation or document here.
CONTEXTKIT_LONG_CONTEXT

curl -X POST "https://contextkit.pro/api/context/upload-text?endpoint=summarize&mode=compact" \
  -H "Content-Type: text/plain" \
  --data-binary @long-context.txt
```

Copy the returned `contextId`, then call the paid Bankr endpoint:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"contextId":"ctx_REPLACE_ME","mode":"compact"}'
```

For `compress-context` and `extract-profile`, upload JSON so the text is wrapped as a message payload:

```bash
cat > context-payload.json <<'CONTEXTKIT_JSON'
{
  "messages": [
    {
      "role": "user",
      "content": "[{\"role\":\"user\",\"content\":\"Paste the long text here.\"}]"
    }
  ],
  "precompute": {
    "endpoint": "extract-profile",
    "mode": "extract-profile"
  }
}
CONTEXTKIT_JSON

curl -X POST "https://contextkit.pro/api/context/upload" \
  -H "Content-Type: application/json" \
  --data-binary @context-payload.json
```

Then fetch through Bankr:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"contextId":"ctx_REPLACE_ME","mode":"extract-profile"}'
```

## Dashboard

Create an account:

```bash
curl -X POST https://contextkit.pro/api/dashboard/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Autonomous Agent Operator",
    "email": "agent-owner@example.com",
    "password": "replace-with-12-plus-chars",
    "company": "Agent Lab"
  }'
```

Dashboard paths:

```txt
/dashboard
/dashboard/keys
/dashboard/credits
/dashboard/usage
/dashboard/payments
/dashboard/webhooks
```

Create API keys from `/dashboard/keys`. New keys are shown once. Store them safely.

## MCP Server

ContextKit includes a secure remote MCP server for autonomous agent hosts:

```txt
https://contextkit.pro/mcp
```

Create a dedicated live API key in `/dashboard/keys` with `context:write`, top up credits in `/dashboard/credits`, then add the endpoint to a compatible Streamable HTTP MCP client:

```json
{
  "mcpServers": {
    "contextkit": {
      "url": "https://contextkit.pro/mcp",
      "headers": {
        "Authorization": "Bearer <CONTEXTKIT_API_KEY>"
      }
    }
  }
}
```

Available MCP tools:

- `contextkit_summarize`
- `contextkit_compress_context`
- `contextkit_handoff`
- `contextkit_extract_profile` with `extract-profile` or `memory-enrichment` mode
- `contextkit_estimate_tokens`
- `contextkit_get_credits`

MCP is stateless and rate-limited. It does not expose API-key management, webhook writes, admin actions, payment-wallet controls, internal forwarding, or any server secret. Never place `CONTEXTKIT_ADMIN_TOKEN`, `CONTEXTKIT_INTERNAL_TOKEN`, Bankr credentials, or a dashboard password in an MCP configuration.

## API Key Credits

Credits let SDK and backend users call paid direct endpoints without Bankr per request.

Check credits:

```bash
curl https://contextkit.pro/api/auth/credits \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"
```

Self-serve crypto top-up:

1. Open `/dashboard/credits`.
2. Create a USDC invoice.
3. Send USDC on Base to the shown wallet.
4. Paste the transaction hash.
5. ContextKit verifies the transfer and grants credits automatically.

If credits are insufficient, direct paid routes return HTTP `402 Payment Required`.

## Direct API Examples

Summarize with credits:

```bash
curl -X POST https://contextkit.pro/api/summarize \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "compact",
    "messages": [
      {
        "role": "user",
        "content": "Summarize this night-bus pilot context. Preserve goal, status, blockers, and next actions."
      }
    ]
  }'
```

Compress context:

```bash
curl -X POST https://contextkit.pro/api/compress-context \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Project Atlas is a transit analytics platform. Stack: Next.js, Postgres, Redis. Completed: auth and dashboards. Issues: slow reports and missing onboarding. Deadline: beta in six weeks."
      }
    ]
  }'
```

Handoff:

```bash
curl -X POST https://contextkit.pro/api/handoff \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a project handoff for a successor agent. Preserve goals, completed work, blockers, decisions, constraints, and next actions."
      }
    ]
  }'
```

Extract profile:

```bash
curl -X POST https://contextkit.pro/api/extract-profile \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "extract-profile",
    "messages": [
      {
        "role": "user",
        "content": "I prefer concise technical updates, direct debugging, clear risks, and command-by-command instructions."
      }
    ]
  }'
```

Memory enrichment through profile mode:

```bash
curl -X POST https://contextkit.pro/api/extract-profile \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "memory-enrichment",
    "messages": [
      {
        "role": "user",
        "content": "I used to want long weekly reports, but now I prefer short risk-focused updates with clear next actions."
      }
    ]
  }'
```

Token estimate:

```bash
curl -X POST https://contextkit.pro/api/tokens/estimate \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "modelFamily": "openai",
    "input": [{"role":"user","content":"Long context to estimate."}],
    "compressed": "Compressed context."
  }'
```

## TypeScript SDK

Install:

```bash
npm install @basedchef/contextkit
```

Create a client:

```ts
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});
```

Call methods:

```ts
await client.summarize({ messages, mode: "compact" });
await client.compressContext({ messages });
await client.handoff({ messages });
await client.extractProfile({ messages });
await client.memoryEnrichment({ messages });
await client.estimateTokens({ modelFamily: "openai", input: messages });
await client.credits();
```

## Webhooks

Register a webhook:

```bash
curl -X POST https://contextkit.pro/api/webhooks/register \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/contextkit/webhook",
    "events": ["request.completed", "summarization.completed", "context.compressed", "handoff.generated", "profile.extracted"]
  }'
```

Webhook deliveries include:

```txt
ContextKit-Signature: <hmac-sha256>
ContextKit-Event: handoff.generated
ContextKit-Request-Id: req_...
```

Replay a webhook:

```bash
curl -X POST https://contextkit.pro/api/webhooks/replay \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt_replace_me"}'
```

## Local Development

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Run local database migrations:

```bash
npm run db:migrate
```

Start local Postgres only:

```bash
docker compose -p contextkit up -d postgres
npm run db:migrate
npm run dev
```

## Public Repo Policy

This repository is intended to be public and open-core friendly.

Safe to keep public:

- SDK source,
- docs,
- OpenAPI schema,
- example requests,
- x402 service handlers,
- UI code,
- local development setup.

Kept private outside the public repo:

- production deployment runbooks,
- real environment values,
- admin tokens,
- Bankr API keys,
- LLM provider keys,
- Resend keys,
- production wallet operations,
- fraud/risk operations,
- server access notes.

Use `.env.example` as a placeholder reference only. Never commit real `.env` files, production tokens, private deployment notes, or operational credentials.

## OpenAPI And Product Pages

```txt
/openapi.json
/docs
/docs/api
/docs/redoc
/api-reference
/playground
/demo
/pricing
/x402
```

## Troubleshooting

`402 Payment Required`

The API key has no credits. Top up credits or use Bankr-hosted x402.

`401 Unauthorized`

The API key is missing, invalid, revoked, or does not have the required scope.

`Long Bankr call fails but playground works`

Upload long content first with `/api/context/upload-text` or `/api/context/upload`, then call Bankr with the returned `contextId`.

`Credit top-up payment_not_verified`

Make sure the transaction is on Base, uses the official Base USDC contract, sends at least the invoice amount, and sends to the wallet shown in the dashboard invoice.

## License

MIT
