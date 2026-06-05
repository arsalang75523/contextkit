# ContextKit

**Context Infrastructure for AI Agents.**

ContextKit is an x402-powered API platform for AI agents that provides conversation summarization, context compression, agent handoff generation, and reusable user profile extraction. It is designed for Bankr agents, autonomous workflows, and teams building token-efficient multi-agent systems.

## What It Includes

- Production-oriented Hono API with TypeScript, Zod validation, request IDs, payload limits, rate limiting, structured errors, and analytics hooks.
- Bankr LLM Gateway integration at `https://llm.bankr.bot/v1/chat/completions` with deterministic JSON prompting and retry-on-malformed-JSON behavior.
- x402 payment middleware with per-route pricing, HTTP 402 payment instructions, facilitator verification, and payment logs.
- API key authentication with crypto-secure `ck_live_` / `ck_test_` keys, hashed storage, scopes, revocation, and per-key analytics.
- Real token analytics, request latency tracking, endpoint usage, payment totals, webhook delivery status, and public aggregate metrics.
- OpenAPI 3.1 at `/openapi.json`, Swagger UI at `/docs/api`, and Redoc at `/docs/redoc`.
- Publish-ready TypeScript SDK in `packages/sdk` with retries, typed responses, webhook verification, and x402 helpers.
- Webhook system with signed events, retries, verification, replay endpoint, and ctx.files-compatible audit trails.
- Next.js product site with landing page, docs portal, API reference, x402 explainer, integration guides, pricing, live dashboard, real demo, and interactive playground.
- Deployment configuration for Vercel and Cloudflare Pages.

## API Surface

| Endpoint | Purpose | Price | Completion Event |
| --- | --- | ---: | --- |
| `POST /api/summarize` | Summarize long conversations into concise optimized context | `$0.002` | `summarization.completed` |
| `POST /api/compress-context` | Compress context into compact structured memory | `$0.003` | `context.compressed` |
| `POST /api/handoff` | Generate agent-to-agent handoff payloads | `$0.003` | `handoff.generated` |
| `POST /api/extract-profile` | Extract durable user profile information | `$0.004` | `profile.extracted` |

## Authentication

Create keys with an admin token:

```bash
curl -X POST http://localhost:3000/api/auth/create-key \
  -H "Authorization: Bearer $CONTEXTKIT_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production agent",
    "environment": "live",
    "scopes": ["context:write", "analytics:read", "webhooks:write", "keys:read"]
  }'
```

ContextKit returns the full key once. The stored record is hashed and future list responses only include masked key metadata.

Key management:

```txt
POST /api/auth/create-key
POST /api/auth/revoke-key
GET  /api/auth/keys
GET  /api/auth/usage
```

Use keys with:

```txt
Authorization: Bearer ck_live_...
```

## Architecture

```mermaid
flowchart LR
  A[Bankr or autonomous agent] --> B[x402 payment middleware]
  B --> C[ContextKit Hono API]
  C --> D[Bankr LLM Gateway]
  C --> E[appKV usage, request, payment logs]
  C --> F[ctx.files snapshots and webhook audits]
  C --> G[Signed webhooks]
  G --> H[Agent workflow continuation]
```

## Quick Start

```bash
npm install
npm run dev
```

Then call the demo API:

```bash
curl -X POST http://localhost:3000/api/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CONTEXTKIT_API_KEY" \
  -H "X-Payment: $X402_PAYMENT_PAYLOAD" \
  -d '{
    "messages": [
      { "role": "user", "content": "Summarize this long agent conversation." }
    ]
  }'
```

## Environment

Copy `.env.example` into your deployment environment and configure:

```bash
BANKR_LLM_KEY=bk_replace_me
BANKR_LLM_BASE_URL=https://llm.bankr.bot/v1
BANKR_LLM_MODEL=claude-sonnet-4.5
CONTEXTKIT_WEBHOOK_SECRET=whsec_replace_me
X402_PAY_TO=0x0000000000000000000000000000000000000000
X402_NETWORK=base
```

`BANKR_LLM_KEY`, a valid ContextKit API key, and a valid x402 payment payload are required for generation endpoints.

## Analytics

All metrics are calculated from real requests:

```txt
GET /api/analytics/overview
GET /api/analytics/tokens
GET /api/analytics/payments
GET /api/analytics/usage
GET /api/public/metrics
```

Tracked fields include input tokens, output tokens, token reduction, latency, endpoint usage, payment totals, webhook delivery success rate, and monthly savings estimate.

## Token Estimation

```bash
curl -X POST http://localhost:3000/api/tokens/estimate \
  -H "Authorization: Bearer $CONTEXTKIT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "modelFamily": "openai",
    "input": [{"role":"user","content":"long context"}],
    "compressed": "compact context"
  }'
```

OpenAI-compatible counting uses `gpt-tokenizer`; Claude and Gemini estimates apply provider-specific calibration against the same canonical tokenization pass.

## x402 Flow

1. Agent calls a paid endpoint without `X-Payment`.
2. ContextKit returns HTTP 402 with accepted price, network, asset, resource, and payee metadata.
3. Agent settles using x402.
4. Agent retries with `X-Payment` or `X402-Payment`.
5. ContextKit verifies/logs payment, calls Bankr LLM Gateway, stores analytics, and emits signed webhooks.

## Webhooks

Events:

- `payment.received`
- `request.completed`
- `summarization.completed`
- `context.compressed`
- `handoff.generated`
- `profile.extracted`

Headers:

```txt
ContextKit-Signature: <hmac-sha256>
ContextKit-Event: handoff.generated
ContextKit-Request-Id: req_...
```

Verify signatures with `POST /api/webhooks/verify` or by computing HMAC-SHA256 over the raw payload with `CONTEXTKIT_WEBHOOK_SECRET`.

Webhook management:

```txt
POST /api/webhooks/register
POST /api/webhooks/replay
GET  /api/webhooks/events
GET  /api/webhooks/deliveries
POST /api/webhooks/:id/rotate-secret
```

## OpenAPI

- JSON spec: `/openapi.json`
- Swagger UI: `/docs/api`
- Redoc: `/docs/redoc`

The spec is generated from Zod request/response schemas and documents API-key auth, x402 payment headers, webhook payloads, and error envelopes.

## TypeScript SDK

```ts
import { ContextKit } from "contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  x402: async (challenge) => wallet.pay(challenge)
});

const response = await client.handoff({ messages });
```

Build the publish-ready package:

```bash
npm --workspace packages/sdk run build
```

## Deployment

### Hetzner Self-Hosted Postgres

ContextKit supports a self-hosted Hetzner setup where the Next.js app and Postgres run on the same server with Docker Compose. Postgres becomes the source of truth for API keys, usage analytics, request logs, payments, webhook metadata, dashboard sessions, and rate-limit counters.

Create a `.env` on the server:

```bash
POSTGRES_PASSWORD=replace_with_strong_password
DATABASE_URL=postgres://contextkit:replace_with_strong_password@postgres:5432/contextkit
CONTEXTKIT_ADMIN_TOKEN=replace_with_admin_token
CONTEXTKIT_WEBHOOK_SECRET=replace_with_webhook_secret
CONTEXTKIT_BASE_URL=https://your-domain.com
BANKR_LLM_KEY=bk_replace_me
BANKR_LLM_BASE_URL=https://llm.bankr.bot/v1
BANKR_LLM_MODEL=claude-sonnet-4.5
X402_PAY_TO=0x_your_wallet
X402_NETWORK=base
X402_FACILITATOR_URL=https://facilitator.x402.org
```

Deploy:

```bash
docker compose up -d --build
```

The app container runs:

```bash
npm run db:migrate
npm run start
```

Useful checks:

```bash
docker compose ps
docker compose logs -f app
docker compose exec postgres psql -U contextkit -d contextkit -c '\dt'
```

Local Postgres without Docker app:

```bash
docker compose up -d postgres
npm run db:migrate
npm run dev
```

### Vercel

```bash
npm run build
npm run deploy:vercel
```

### Cloudflare Pages

```bash
npm run build
npm run deploy:cloudflare
```

Bind `CONTEXTKIT_KV` to appKV-compatible storage and `CONTEXTKIT_FILES` to ctx.files/R2-compatible audit storage.

## Bankr Compatibility

ContextKit uses the Bankr LLM Gateway through an OpenAI-compatible API:

```ts
fetch("https://llm.bankr.bot/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.BANKR_LLM_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4.5",
    temperature: 0,
    response_format: { type: "json_object" },
    messages
  })
});
```

## Screenshots

- Landing page: `/`
- Docs portal: `/docs`
- API playground: `/playground`
- Webhook dashboard: `/dashboard`

## Roadmap

- Multiple x402 facilitator adapters and settlement reconciliation.
- Durable semantic cache and vector-backed deduplication.
- Tenant-scoped API keys and usage dashboards.
- Webhook endpoint management UI.
- Bankr Terminal onboarding flow for agent operators.
