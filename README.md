# ContextKit

Website: [https://contextkit.pro](https://contextkit.pro)

## MCP V2 guaranteed auto-capture

Remote MCP instructions are portable but a host can ignore proactive tool guidance. ContextKit includes a completion bridge for environments that expose a real lifecycle signal.

```bash
npx @basedchef/contextkit-autocapture setup
```

Setup opens ContextKit login in the browser, stores a refreshable OAuth credential in a user-only `0600` file, detects supported local agent hosts, installs their global adapters, and verifies MCP connectivity. No shell-profile edit or pasted API key is required. Limit setup to selected hosts with `--agents claude,opencode`; run `contextkit-autocapture doctor` any time to verify the connection.

The bridge locally redacts common secrets, submits only the latest completed task, and skips duplicate or failed runs. Greetings, placeholders, plans, generic notes, project diaries, incomplete workflows, and plain claims are rejected. A private `SKILL.md` write requires a complete reusable workflow in any legitimate domain plus at least one executed PASS backed by verbatim command output, test log, HTTP response, or artifact evidence from the source conversation. Public publishing requires three independent grounded PASS results, an explicit reuse license, a validation score of at least 75, clean safety checks, and explicit user approval. Test method, observed outcome, evidence excerpt, and source message are embedded in the generated skill.

The VS Code-compatible extension for VS Code, Cursor, Windsurf, and VSCodium is in `extensions/contextkit-autocapture`:

```bash
npm run extension:package
code --install-extension extensions/contextkit-autocapture/contextkit-autocapture-0.1.2.vsix
```

ContextKit is a memory layer and versioned Verified Skill Repository for autonomous AI agents.

Website: https://contextkit.pro

It turns long conversations, project notes, and operational history into compact continuation state that another agent can safely pick up later. The focus is not pretty summaries. The focus is preserving goals, blockers, constraints, decisions, next actions, durable preferences, and handoff state with fewer tokens.

## Versioned Skill Repository

ContextKit does not sell raw chat history or project-specific notes. MCP V2 compiles completed agent work into portable skills with declared inputs, executable steps, verification, failure handling, rollback, compatibility metadata, source evidence, and evidence-backed tests.

The V1 lifecycle is strict:

1. `contextkit_skill_compile` creates a private draft from completed work.
2. `contextkit_skill_validate_bundle` dry-runs the repository contract without storing files.
3. `contextkit_skill_push` stores one immutable semantic version with per-file SHA-256 checksums and a deterministic digest.
4. `contextkit_skill_repository_publish` lists only eligible executable repositories after explicit user approval.
5. `contextkit_skill_search` and `contextkit_skill_inspect` expose verified previews and manifests without paid file contents.
6. `contextkit_skill_clone` settles access and returns the complete immutable file tree plus validation and license.

## Pre-Token Launch Hardening

ContextKit is in a closed-beta hardening phase. **Token launch has not started.** Marketplace settlement and seller payouts use USDC on Base. Future stake capacity, curation/reputation, and fee-discount concepts remain locked until the public launch gates pass.

Operational probes:

```bash
curl -fsS https://contextkit.pro/api/health
curl -fsS https://contextkit.pro/api/ready
curl -fsS https://contextkit.pro/api/public/launch-readiness
```

- `GET /api/health` is a dependency-independent liveness probe. It does not query storage and bypasses normal request-budget and concurrency accounting.
- `GET /api/ready` checks persistent storage and required production configuration. It returns `200` for `ready` or `degraded`, and `503` only when storage is unavailable.
- `GET /api/public/launch-readiness` reports closed-beta usage, validation, buyer-retention, and paid-payout gates with `tokenLaunch: "not-started"`.

Optional seller closed beta:

```env
CONTEXTKIT_MARKETPLACE_BETA_MODE=true
CONTEXTKIT_BETA_SELLERS=acct_REPLACE_ME,acct_SECOND_SELLER
```

When beta mode is active, only environment-allowlisted sellers or accounts granted through `POST /api/admin/marketplace/beta-sellers` can publish. Send `{"ownerId":"acct_REPLACE_ME","allowed":true}` to grant access and `allowed:false` to revoke the database grant. This never removes an environment allowlist entry.

Seller and buyer safety:

- Sellers manage listings with `POST /api/dashboard/skills/:skillId/lifecycle` and `action: delist|relist|archive`. Delist is reversible; archive is irreversible.
- Administrators use `POST /api/admin/skills/:skillId/moderation` with `action: suspend|restore` and a reason.
- Delisting, archiving, and suspension remove public discovery but never remove paid buyer access.
- Account buyers can list purchases at `GET /api/dashboard/skills/library` and re-download without another payment through `POST /api/skills/access`.
- Bankr buy/clone calls must include a stable, pseudonymous `buyerId` such as `agent:team-42`. Never use an email, wallet secret, or an `acct_...` account identifier supplied by an unauthenticated caller.

Seller payout flow:

1. Create a ten-minute wallet challenge with `POST /api/dashboard/payout/wallet/challenge`.
2. Sign the returned message and verify it with `POST /api/dashboard/payout/wallet/verify`. The message does not authorize a transaction; ContextKit never receives a private key.
3. Request at least `1 USDC` with `POST /api/dashboard/payout/request`.
4. A server administrator reviews with `GET /api/admin/payouts`, then approves or rejects through `POST /api/admin/payouts/:payoutId`.
5. After the treasury sends Base USDC manually, `action: mark-paid` verifies the confirmed on-chain transfer, destination, token contract, amount, and one-time transaction hash before updating the ledger.

Every repository version requires `SKILL.md`, `skill.json`, and `LICENSE`. Public executable bundles also require `package.json`, `package-lock.json`, `config.schema.json`, meaningful `src/`, `tests/`, and `examples/`. V1 rejects unsafe paths, credentials, private key material, install lifecycle hooks, identity mismatches, and decoded bundles above 320KB. Published versions cannot be overwritten. Legacy `SKILL.md` purchases remain compatible.

Install the repository CLI for a safe Git-like creator and buyer workflow:

```bash
npm install --global @basedchef/contextkit-cli
export CONTEXTKIT_API_KEY="ck_live_replace_me"

contextkit skill init ./my-skill --name my-skill --version 1.0.0
contextkit skill validate ./my-skill --skill-id exp_REPLACE_ME
contextkit skill push ./my-skill --skill-id exp_REPLACE_ME
contextkit skill publish ./my-skill
contextkit skill search "x402 timeout"
contextkit skill clone exp_REPLACE_ME ./installed-skill
```

The CLI rejects symlinks, path traversal, local secrets, and accidental overwrite. Clone verifies the immutable repository digest, every file checksum, and normalized `0644/0755` mode before materialization. CLI calls use account credits; the Bankr commands below expose the same lifecycle as public x402-paid operations.

Skill discovery categories are open-ended lowercase slugs such as `web-development`, `testing`, `research`, `design`, `productivity`, `automation`, `mcp`, `finance`, or `crypto`. Bankr and crypto relevance are optional; evidence-backed usefulness, portability, reproducibility, and safety determine eligibility.

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
- immutable skill repository push, discovery, paid clone, and creator earnings.

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

| Direct API operations | Bankr service | Purpose | Price |
| --- | --- | --- | ---: |
| summarize, compress, handoff, profile | `contextkit-core` | All context operations selected by `endpoint`/`mode` | `$0.03` |
| `POST /api/skills/compile`, `/validate`, `/push`, `/publish` | `contextkit-experience-write` | Compile proof, validate files, push immutable semver, explicitly publish | `$0.01` |
| `POST /api/skills/search`, `/inspect` | `contextkit-experience-search` | Search previews or inspect digest, manifest, and validation | `$0.01` |
| `POST /api/skills/buy`, `/clone` | `contextkit-experience-buy` | Buy or clone a complete repository bundle | `$0.05` |

Utility endpoints such as token estimates, credits, analytics, keys, and webhooks use dashboard API keys instead of Bankr-hosted pay-per-call.

## Bankr-Hosted x402 Commands

Summarize:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"summarize","messages":[{"role":"user","content":"Summarize this project state for the next AI agent."}],"mode":"compact"}'
```

Compress context:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"compress-context","messages":[{"role":"user","content":"Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow report generation and onboarding remain. Beta is due in six weeks."}]}'
```

Handoff:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"handoff","messages":[{"role":"user","content":"Create a handoff for the next AI agent. Preserve goal, completed work, blockers, decisions, constraints, and immediate next actions."}]}'
```

Extract profile:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"extract-profile","messages":[{"role":"user","content":"I prefer short technical explanations, direct debugging help, clear risks, and step-by-step commands."}],"mode":"extract-profile"}'
```

Memory enrichment uses the same hosted profile endpoint:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"memory-enrichment","messages":[{"role":"user","content":"I used to want long weekly reports, but now I prefer short risk-focused updates with clear next actions."}],"mode":"memory-enrichment"}'
```

Useful Bankr helpers:

```bash
bankr x402 schema https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core -i
```

Compile completed work into a private skill draft:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-write \
  -X POST \
  -d '{"mode":"skill-compile","messages":[{"role":"user","content":"Fix the Bankr x402 timeout without changing the response contract."},{"role":"assistant","content":"Compared origin and gateway latency, precomputed the long request, and verified HTTP 200."}]}'
```

Build a JSON payload containing the returned `skillId` and `publishToken`, matching `repository`/`version`, and the full `files` array. Validate without storage, then push the immutable version:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-write \
  -X POST \
  -d @skill-validate.json

# skill-validate.json uses mode=skill-validate.
# After it passes, change only mode to skill-push and call the same endpoint again.
```

The root files are `SKILL.md`, `skill.json`, and `LICENSE`. Executable public bundles also include `package.json`, `package-lock.json`, `config.schema.json`, `src/`, `tests/`, and `examples/`. After push and explicit user approval, publish the repository:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-write \
  -X POST \
  -d '{"mode":"skill-repository-publish","skillId":"exp_REPLACE_ME","publishToken":"pub_REPLACE_ME","userApproved":true,"priceUsd":0.05}'
```

Search, inspect, and paid-clone verified repositories:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-search \
  -X POST \
  -d '{"mode":"skill-search","query":"x402 timeout","ecosystems":["x402"],"compatibility":["codex"],"verifiedOnly":true}'

bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-search \
  -X POST \
  -d '{"mode":"skill-inspect","skillId":"exp_REPLACE_ME"}'

bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-buy \
  -X POST \
  -d '{"mode":"skill-clone","skillId":"exp_REPLACE_ME","buyerId":"agent:team-42"}'
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
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"summarize","contextId":"ctx_REPLACE_ME","mode":"compact"}'
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
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"extract-profile","contextId":"ctx_REPLACE_ME","mode":"extract-profile"}'
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

Hosts with an OAuth-based connector flow can add this URL and choose **Connect**. ContextKit supports MCP OAuth discovery, dynamic client registration, PKCE, dashboard sign-in, and explicit account consent. No manual client ID is required.

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
2. Connect an injected wallet such as Coinbase Wallet, MetaMask, or Rabby.
3. Choose a credit amount and approve the exact USDC transfer on Base.
4. ContextKit waits for confirmation, verifies the transfer, and grants credits automatically.

The dashboard never receives a private key and no transaction-hash copy/paste is required. The verification API remains available for server integrations and recovery flows.

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
