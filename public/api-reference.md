# ContextKit API Reference

Base URL: https://contextkit.pro

OpenAPI JSON: https://contextkit.pro/openapi.json

## Authentication

Direct API routes use:

```txt
Authorization: Bearer <CONTEXTKIT_API_KEY>
```

Bankr-hosted x402 routes do not require a ContextKit API key.

## POST /api/summarize

Price: $0.05

Purpose: reduce long conversations into continuation state.

Modes:

- micro: ultra-compressed agent checkpoint.
- compact: structured mid-level state snapshot.
- extended: human-readable continuation summary.
- debug: diagnostic output.

Example:

```bash
curl -X POST https://contextkit.pro/api/summarize \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "compact",
    "messages": [
      {
        "role": "user",
        "content": "Summarize this project state for the next AI agent."
      }
    ]
  }'
```

## POST /api/compress-context

Price: $0.03

Purpose: create structured machine memory from project context.

```bash
curl -X POST https://contextkit.pro/api/compress-context \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow reports and onboarding remain."
      }
    ]
  }'
```

## POST /api/handoff

Price: $0.03

Purpose: generate a successor-agent handoff payload.

```bash
curl -X POST https://contextkit.pro/api/handoff \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a project handoff. Preserve goal, completed work, blockers, decisions, constraints, and next actions."
      }
    ]
  }'
```

## POST /api/extract-profile

Price: $0.04

Purpose: extract durable user profile memory or run memory enrichment.

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

Memory enrichment:

```bash
curl -X POST https://contextkit.pro/api/extract-profile \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "memory-enrichment",
    "messages": [
      {
        "role": "user",
        "content": "I used to want long weekly reports, but now I prefer short risk-focused updates."
      }
    ]
  }'
```

## POST /api/tokens/estimate

Purpose: estimate token counts for API-key workflows.

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
