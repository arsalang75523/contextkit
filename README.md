# ContextKit

ContextKit is context infrastructure for autonomous AI agents. It turns long conversations and project history into compact, structured outputs for agent memory, handoffs, profile extraction, and continuation workflows.

The product supports three usage paths:

- **Bankr-hosted x402:** simplest paid path. User runs `bankr x402 call`, pays with Bankr, receives JSON. No API key or SDK needed.
- **API key credits:** dashboard users buy credits with USDC on Base, then use direct `/api/*` endpoints without Bankr per request.
- **TypeScript SDK:** advanced developers integrate ContextKit into their own app using API keys, credits, webhooks, and optional x402 fallback.

## Endpoints

| Endpoint | Purpose | Price |
| --- | --- | ---: |
| `POST /api/summarize` | Micro/compact/extended context reduction | `$0.05` |
| `POST /api/compress-context` | Machine-optimized context packet | `$0.03` |
| `POST /api/handoff` | Agent-to-agent project transfer | `$0.03` |
| `POST /api/extract-profile` | Durable user profile memory | `$0.04` |
| `POST /api/memory-enrichment` | Evolve long-term memory | `$0.04` API key credits/direct |
| `POST /api/tokens/estimate` | Token estimate for API-key workflows | API key |

## Fastest User Path: Bankr-Hosted x402

This is the main public path for simple users and agents.

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Summarize this context for another AI agent."}]}'
```

No ContextKit API key, npm package, or SDK is required. The user only needs Bankr login and payment approval.

### Hosted Commands

Summarize:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Summarize the deployment state, blockers, and next actions."}],"mode":"compact"}'
```

Compress context:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-compress \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow report generation and enterprise onboarding remain. Beta is due in six weeks."}]}'
```

Handoff:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-handoff \
  -X POST \
  -d '{"messages":[{"role":"user","content":"ContextKit is live on Hetzner with Postgres, dashboard auth, API credits, Bankr-hosted x402, webhooks, and SDK publishing. Next work is docs, demo polish, and credit top-up testing."}]}'
```

Extract profile:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"I prefer short technical explanations, direct debugging help, clear risks, and step-by-step deployment commands."}]}'
```

Schema and interactive mode:

```bash
bankr x402 schema https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize -i
bankr x402 list
```

## Dashboard Signup

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

Login:

```bash
curl -i -X POST https://contextkit.pro/api/dashboard/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "agent-owner@example.com",
    "password": "replace-with-12-plus-chars"
  }'
```

Browser dashboard paths:

```txt
/dashboard
/dashboard/keys
/dashboard/credits
/dashboard/usage
/dashboard/payments
/dashboard/webhooks
```

## API Keys

API keys identify dashboard accounts and direct API integrations. They are used for dashboard auth, analytics, usage, token estimates, webhook management, memory enrichment, and credit billing.

API keys do **not** make paid generation free by themselves. Direct paid routes first try account credits. If credits are insufficient, the route returns an x402 payment challenge.

Create API keys from the dashboard:

```txt
/dashboard/keys
```

New keys are shown once when created. Store the key safely, because ContextKit only keeps the hashed record after creation.

List keys:

```bash
curl https://contextkit.pro/api/auth/keys \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"
```

Revoke a key:

```bash
curl -X POST https://contextkit.pro/api/auth/revoke-key \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"keyId":"key_replace_me"}'
```

Check usage:

```bash
curl https://contextkit.pro/api/auth/usage \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"
```

## Credits

Credits let SDK/API-key users call paid endpoints without Bankr per request.

Check credits:

```bash
curl https://contextkit.pro/api/auth/credits \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"
```

Self-serve crypto top-up:

1. User opens `/dashboard/credits`.
2. User creates a USDC invoice.
3. User sends USDC on Base to the shown wallet.
4. User pastes the transaction hash.
5. ContextKit verifies the on-chain USDC transfer and grants credits automatically.

Required env:

```env
X402_PAY_TO=0xYourWallet
CREDIT_BASE_RPC_URL=https://mainnet.base.org
CREDIT_USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

If the public Base RPC rate-limits, use Alchemy, Infura, QuickNode, or another Base RPC URL.

## Direct API Commands

These commands use API key credits. If credits are missing, paid generation routes return HTTP 402.

Summarize:

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
        "content": "ContextKit is live with Hetzner, Postgres, dashboard auth, API credits, Bankr-hosted x402, SDK, webhooks, and crypto credit top-up. Next agent should test payment verification and polish docs."
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
    "messages": [
      {
        "role": "user",
        "content": "I prefer short technical updates, direct debugging, clear risks, and command-by-command deployment instructions."
      }
    ]
  }'
```

Memory enrichment:

```bash
curl -X POST https://contextkit.pro/api/memory-enrichment \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
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

## SDK

Install:

```bash
npm install @basedchef/contextkit
```

Smoke test:

```bash
node --input-type=module -e 'import { ContextKit } from "@basedchef/contextkit"; console.log(typeof ContextKit)'
```

Call summarize with credits:

```bash
cat > summarize-sdk.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

const result = await client.summarize({
  mode: "micro",
  messages: [
    {
      role: "user",
      content: "We are planning a night-bus pilot. Summarize current goal, blockers, and next steps."
    }
  ]
});

console.log(JSON.stringify(result, null, 2));
EOF

node summarize-sdk.mjs
```

Check credits with SDK:

```bash
cat > credits-sdk.mjs <<'EOF'
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: "<CONTEXTKIT_API_KEY>",
  baseUrl: "https://contextkit.pro"
});

console.log(JSON.stringify(await client.credits(), null, 2));
EOF

node credits-sdk.mjs
```

SDK methods:

```ts
await client.summarize({ messages, mode: "micro" });
await client.compressContext({ messages });
await client.handoff({ messages });
await client.extractProfile({ messages });
await client.memoryEnrichment({ messages });
await client.estimateTokens({ modelFamily: "openai", input: messages });
await client.credits();
```

## Webhooks

Register webhook:

```bash
curl -X POST https://contextkit.pro/api/webhooks/register \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/contextkit/webhook",
    "events": ["request.completed", "summarization.completed", "context.compressed", "handoff.generated", "profile.extracted"]
  }'
```

List webhook events:

```bash
curl https://contextkit.pro/api/webhooks/events \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"
```

List deliveries:

```bash
curl https://contextkit.pro/api/webhooks/deliveries \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"
```

Replay a webhook event:

```bash
curl -X POST https://contextkit.pro/api/webhooks/replay \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt_replace_me"}'
```

Webhook headers:

```txt
ContextKit-Signature: <hmac-sha256>
ContextKit-Event: handoff.generated
ContextKit-Request-Id: req_...
```

## Analytics

```bash
curl https://contextkit.pro/api/analytics/overview \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"

curl https://contextkit.pro/api/analytics/tokens \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"

curl https://contextkit.pro/api/analytics/payments \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"

curl https://contextkit.pro/api/analytics/usage \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"

curl https://contextkit.pro/api/public/metrics
```

## Local Development

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Run migrations:

```bash
npm run db:migrate
```

Start only Postgres with Docker:

```bash
docker compose -p contextkit up -d postgres
npm run db:migrate
npm run dev
```

## Environment

Example production `.env`:

```env
POSTGRES_PASSWORD=replace_with_strong_password
DATABASE_URL=postgres://contextkit:replace_with_strong_password@postgres:5432/contextkit

CONTEXTKIT_ADMIN_TOKEN=replace_with_admin_token
CONTEXTKIT_INTERNAL_TOKEN=replace_with_internal_forwarder_token
CONTEXTKIT_WEBHOOK_SECRET=replace_with_webhook_secret
CONTEXTKIT_BASE_URL=https://contextkit.pro
CONTEXTKIT_BACKEND_URL=https://contextkit.pro

RESEND_API_KEY=re_replace_me
CONTEXTKIT_EMAIL_FROM=ContextKit <security@contextkit.pro>

BANKR_LLM_KEY=bk_replace_me
BANKR_LLM_BASE_URL=https://llm.bankr.bot/v1
BANKR_LLM_MODEL=claude-sonnet-4.5

X402_PAY_TO=0x_your_wallet
X402_NETWORK=base
X402_FACILITATOR_URL=https://facilitator.x402.org

CREDIT_BASE_RPC_URL=https://mainnet.base.org
CREDIT_USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## OpenAPI And Docs

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

## Nginx / HTTPS Notes

For the current Hetzner test deployment, HTTPS is served at:

```txt
https://contextkit.pro
```

Nginx terminates TLS and forwards to the Next.js app on port `3000`.

## Troubleshooting

`402 Payment Required` on direct `/api/summarize`

The API key has no credits. Top up credits or use Bankr-hosted x402.

`internal_not_configured`

`CONTEXTKIT_INTERNAL_TOKEN` is missing inside the app container.

`Bankr deploy 403`

Usually Bankr account/service limit or config issue. Keep `bankr.x402.json` to supported services and run `bankr whoami`, `bankr x402 list`, then retry.

`Bankr call status 503`

Check direct internal endpoint first, then app logs:

```bash
docker compose -p contextkit logs app --tail=200
```

`Credit top-up payment_not_verified`

Make sure the tx is on Base, uses USDC contract `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, sends at least the invoice amount, and sends to `X402_PAY_TO`.

## License

MIT
