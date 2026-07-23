# ContextKit API Reference

Base URL: https://contextkit.pro

OpenAPI JSON: https://contextkit.pro/openapi.json

## Authentication

Direct API routes use:

```txt
Authorization: Bearer <CONTEXTKIT_API_KEY>
```

Bankr-hosted x402 routes do not require a ContextKit API key.

## Inbound Request Protection

All Hono API requests under `/api/*` are protected by a per-client fixed-window limit, a server-wide request budget, and an in-process concurrency guard. The default limits are `30 requests/minute/client`, `120 requests/minute/server`, `12 concurrent requests/server`, and `3 concurrent requests/client`. MCP has a separate default budget of `30 requests/minute/key` and `120 requests/minute/server`, plus the same concurrency guard keyed by API key.

Limits can return HTTP `429` with `Retry-After`, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers. Deployments can tune the defaults with `CONTEXTKIT_RATE_LIMIT_PER_MINUTE`, `CONTEXTKIT_GLOBAL_RATE_LIMIT_PER_MINUTE`, `CONTEXTKIT_MAX_CONCURRENT_REQUESTS`, `CONTEXTKIT_MAX_CONCURRENT_REQUESTS_PER_CLIENT`, `CONTEXTKIT_MCP_RATE_LIMIT_PER_MINUTE`, and `CONTEXTKIT_MCP_GLOBAL_RATE_LIMIT_PER_MINUTE`.

## MCP Server

Remote MCP endpoint: `https://contextkit.pro/mcp`

ContextKit MCP uses Streamable HTTP. OAuth-capable Connector UIs can use the Connect flow directly through MCP OAuth discovery and PKCE. CLI and backend clients can continue to use a dedicated bearer API key with `context:write` and account credits for paid tools.

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

Tools: `contextkit_summarize`, `contextkit_compress_context`, `contextkit_handoff`, `contextkit_extract_profile`, `contextkit_skill_compile`, `contextkit_skill_publish`, `contextkit_skill_search`, `contextkit_skill_buy`, `contextkit_estimate_tokens`, `contextkit_get_credits`.

The MCP server intentionally has no tool for admin actions, credits grants, API-key creation or revocation, webhook writes, or internal service access.

## Versioned Skill Repository

Direct API routes:

- `POST /api/skills/compile`: compile completed, reusable work from any legitimate domain into a private SKILL.md draft.
- `POST /api/skills/validate`: validate paths, secrets, source, tests, examples, package lock, config schema, identity, and checksums without storing files.
- `POST /api/skills/push`: store an immutable content-addressed repository version.
- `POST /api/skills/publish`: use `mode: skill-repository-publish` after a valid push and explicit `userApproved: true`.
- `POST /api/skills/search`: search verified metadata previews by query, tags, ecosystem, and compatibility.
- `POST /api/skills/inspect`: inspect the public manifest without paid source content.
- `POST /api/skills/buy` and `/api/skills/clone`: buy the full versioned file tree, checksums, validation, and non-resale license.

Repository publishing rejects raw notes, incomplete code/test trees, missing lockfiles, empty tests/examples, install hooks, secrets, path traversal, version replacement, weak evidence, and malformed category slugs. Bankr or crypto relevance is not required.

```bash
curl -X POST https://contextkit.pro/api/skills/search \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"query":"x402 timeout","ecosystems":["x402"],"compatibility":["codex"],"verifiedOnly":true}'
```

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
