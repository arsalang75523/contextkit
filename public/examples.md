# ContextKit Examples

Agent-readable examples for the four deployed Bankr x402 lanes and direct API/SDK integrations.

## Core Context

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-core \
  -X POST \
  -d '{"endpoint":"summarize","messages":[{"role":"user","content":"Summarize this project state for the next AI agent."}],"mode":"compact"}'
```

Change `endpoint` to `compress-context`, `handoff`, `extract-profile`, or `memory-enrichment`. Use the corresponding mode for profile operations.

## Verified Skill Registry

Compile a private skill draft:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-write \
  -X POST \
  -d '{"mode":"skill-compile","messages":[{"role":"user","content":"Repair the Bankr x402 timeout without changing the response contract."},{"role":"assistant","content":"Compared origin and gateway latency, precomputed the long request, and verified HTTP 200."}]}'
```

Search verified previews:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-search \
  -X POST \
  -d '{"query":"x402 timeout","ecosystems":["x402"],"verifiedOnly":true}'
```

Buy the install bundle:

```bash
bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-experience-buy \
  -X POST \
  -d '{"skillId":"exp_REPLACE_ME"}'
```

## Direct API With Credits

```bash
curl -X POST https://contextkit.pro/api/summarize \
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"mode":"compact","messages":[{"role":"user","content":"Summarize this context."}]}'
```

Verified skill routes are `/api/skills/compile`, `/api/skills/publish`, `/api/skills/search`, and `/api/skills/buy`.

## TypeScript SDK

```ts
import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({ apiKey: process.env.CONTEXTKIT_API_KEY! });
const draft = await client.compileSkill({ messages, autoSave: true });
const matches = await client.searchSkills({ query: "x402 timeout", compatibility: ["codex"] });
const bundle = await client.buySkill(matches.results[0].id);
```

## Related

- x402 guide: https://contextkit.pro/x402.md
- OpenAPI: https://contextkit.pro/openapi.json
- Docs: https://contextkit.pro/docs.md
