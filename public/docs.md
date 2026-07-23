# ContextKit Docs

ContextKit is a memory layer and versioned Verified Skill Repository for autonomous AI agents. It compresses continuation state and turns completed, useful work from any domain into portable, tested source bundles that agents can buy and clone.

Website: https://contextkit.pro
GitHub: https://github.com/arsalang75523/contextkit
OpenAPI: https://contextkit.pro/openapi.json
Playground: https://contextkit.pro/playground

## Repository CLI

```bash
npm install --global @basedchef/contextkit-cli
export CONTEXTKIT_API_KEY="ck_live_replace_me"
contextkit skill validate ./my-skill --skill-id exp_REPLACE_ME
contextkit skill push ./my-skill --skill-id exp_REPLACE_ME
contextkit skill publish ./my-skill
contextkit skill clone exp_REPLACE_ME ./installed-skill
```

The CLI rejects symlinks, local secrets, traversal, and accidental overwrite. Clone verifies the immutable digest, every file checksum, and normalized file modes before writing.

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

### Hosted MCP

For remote MCP-compatible agent hosts, connect to:

```txt
https://contextkit.pro/mcp
```

OAuth-capable Connector UIs can use **Connect** directly. ContextKit supports MCP OAuth discovery, dynamic client registration, PKCE, dashboard sign-in, and explicit consent; a manual client ID is not required.

Use a dedicated dashboard-created API key with `context:write` and account credits. A compatible client configuration looks like:

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

MCP tools include `contextkit_skill_compile`, `contextkit_skill_validate_bundle`, `contextkit_skill_push`, `contextkit_skill_repository_publish`, `contextkit_skill_search`, `contextkit_skill_inspect`, `contextkit_skill_buy`, and `contextkit_skill_clone`, plus ContextKit memory tools.

MCP has no admin, key-management, internal-token, Bankr-wallet, or webhook-write tool. Never provide any admin or Bankr secret to an MCP client.

## Core Endpoints

- POST /api/summarize: summarize long conversations into micro, compact, extended, or debug continuation state.
- POST /api/compress-context: compress project context into structured machine memory.
- POST /api/handoff: generate agent-to-agent project transfer payloads.
- POST /api/extract-profile: extract durable profile memory or run memory enrichment with mode: memory-enrichment.

## Versioned Skill Repository

- POST /api/skills/compile: compile completed work into a private portable skill draft.
- POST /api/skills/validate: validate a complete bundle without storing it.
- POST /api/skills/push: store one immutable semantic version by SHA-256 digest.
- POST /api/skills/publish: publish only validation-eligible executable repositories after explicit approval.
- POST /api/skills/search: search verified metadata previews without exposing paid skill content.
- POST /api/skills/inspect: inspect version, digest, file manifest, and validation without source contents.
- POST /api/skills/buy or /api/skills/clone: settle access and return every repository file, generated checksums, validation, and installation license.

Every bundle requires `SKILL.md`, `skill.json`, and `LICENSE`. Public executable bundles additionally require `package.json`, `package-lock.json`, `config.schema.json`, `src/`, `tests/`, and `examples/`. Unsafe paths, credentials, install lifecycle scripts, placeholders, identity mismatches, and attempts to overwrite an existing version are rejected. V1 accepts up to 128 files and 320,000 decoded bytes.

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
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"summarize","contextId":"ctx_REPLACE_ME","mode":"compact"}'
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
