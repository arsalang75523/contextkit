# ContextKit Docs

ContextKit is a memory layer for autonomous AI agents. It compresses long conversations, project history, and operational notes into compact continuation state for agent memory, handoffs, profile extraction, and workflow persistence.

Website: https://contextkit.pro
GitHub: https://github.com/arsalang75523/contextkit
OpenAPI: https://contextkit.pro/openapi.json
Playground: https://contextkit.pro/playground

## Main Paths

### Bankr-hosted x402

Best for simple users, autonomous agents, and public pay-per-call usage.

The caller runs a Bankr x402 command, approves USDC payment, and receives JSON. No ContextKit API key or SDK is required.

### API key credits

Best for apps and backends.

Dashboard users create API keys and buy credits. Direct API calls spend credits first, so apps can call paid endpoints without Bankr approval on every request.

### TypeScript SDK

Best for TypeScript integrations.

Install:

```bash
npm install @basedchef/contextkit
```

## Core Endpoints

- POST /api/summarize: summarize long conversations into micro, compact, extended, or debug continuation state.
- POST /api/compress-context: compress project context into structured machine memory.
- POST /api/handoff: generate agent-to-agent project transfer payloads.
- POST /api/extract-profile: extract durable profile memory or run memory enrichment with mode: memory-enrichment.

## Long Context

For large payloads, upload first:

```bash
cat > long-context.txt <<'CONTEXTKIT_LONG_CONTEXT'
Paste the long conversation or document here.
CONTEXTKIT_LONG_CONTEXT

curl -X POST "https://contextkit.pro/api/context/upload-text?endpoint=summarize&mode=compact" \
  -H "Content-Type: text/plain" \
  --data-binary @long-context.txt
```

Then call Bankr with the returned contextId:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"contextId":"ctx_REPLACE_ME","mode":"compact"}'
```

## Dashboard

- /dashboard: account overview.
- /dashboard/keys: create and revoke API keys.
- /dashboard/credits: buy USDC credits on Base.
- /dashboard/usage: inspect usage.
- /dashboard/payments: payment metadata.
- /dashboard/webhooks: register and replay signed webhook deliveries.

## Webhooks

Webhook deliveries include:

```txt
ContextKit-Signature: <hmac-sha256>
ContextKit-Event: handoff.generated
ContextKit-Request-Id: req_...
```

## Public Pages

- https://contextkit.pro/
- https://contextkit.pro/docs
- https://contextkit.pro/benchmarks
- https://contextkit.pro/benchmarks.md
- https://contextkit.pro/examples
- https://contextkit.pro/examples.md
- https://contextkit.pro/api-reference
- https://contextkit.pro/playground
- https://contextkit.pro/pricing
- https://contextkit.pro/x402
- https://contextkit.pro/ai-agents
- https://contextkit.pro/contact-dev
