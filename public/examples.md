# ContextKit Examples

This file is an agent-readable command reference for ContextKit.

## Bankr-hosted x402

No ContextKit API key is required. The caller pays through Bankr and receives JSON.

### Summarize

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Summarize this project state for the next AI agent."}],"mode":"compact"}'
```

### Compress context

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-compress \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow reports and onboarding remain."}]}'
```

### Handoff

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-handoff \
  -X POST \
  -d '{"messages":[{"role":"user","content":"Create a successor-agent handoff. Preserve completed work, blockers, decisions, constraints, and next actions."}]}'
```

### Profile memory

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"I prefer concise technical updates and clear next actions."}],"mode":"extract-profile"}'
```

### Memory enrichment

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \
  -X POST \
  -d '{"messages":[{"role":"user","content":"I used to want long weekly reports, but now prefer short risk-focused updates."}],"mode":"memory-enrichment"}'
```

## Direct API With Credits

```bash
curl -X POST https://contextkit.pro/api/summarize \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "compact",
    "messages": [{ "role": "user", "content": "Summarize this context." }]
  }'
```

## TypeScript SDK

```ts
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://contextkit.pro"
});

const result = await client.handoff({
  messages: [{ role: "user", content: "Create a handoff for the next agent." }]
});
```

## Long Context

```bash
cat > long-context.txt <<'CONTEXTKIT_LONG_CONTEXT'
Paste the long conversation or document here.
CONTEXTKIT_LONG_CONTEXT

curl -X POST "https://contextkit.pro/api/context/upload-text?endpoint=summarize&mode=compact" \
  -H "Content-Type: text/plain" \
  --data-binary @long-context.txt
```

Then:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \
  -X POST \
  -d '{"contextId":"ctx_REPLACE_ME","mode":"compact"}'
```

## Related

- Benchmarks: https://contextkit.pro/benchmarks.md
- OpenAPI: https://contextkit.pro/openapi.json
- Docs: https://contextkit.pro/docs.md
