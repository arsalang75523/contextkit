# ContextKit Benchmarks

This file is an agent-readable benchmark reference for ContextKit. It is intended for crawlers, evaluators, and autonomous agents.

| Endpoint | Mode | Input tokens | Output tokens | Reduction | Output shape | Best use |
| --- | --- | ---: | ---: | ---: | --- | --- |
| summarize | micro | 1357 | 35 | 97% | `{ "mode", "micro", "metrics" }` | Smallest continuation checkpoint |
| summarize | compact | 1690 | 330 | 80% | `{ "mode", "compact", "state", "metrics" }` | Readable agent state snapshot |
| compress-context | default | 190 | 67 | 65% | `{ "compressedContext", "state", "entities", "metrics" }` | Reusable memory packet |
| handoff | default | 612 | 184 | 70% | `{ "project", "completed", "pending", "blockers", "startHere" }` | Successor-agent transfer |
| extract-profile | memory-enrichment | 118 | 74 | 37% | `{ "activeMemories", "evolvingMemories", "conflicts", "confidence" }` | Durable memory update |
| context upload + summarize | compact | 2710 | 663 | 76% | `{ "contextId" }` then paid result | Large payload precompute |

## Notes

- These are example production-style agent planning payloads, not lorem ipsum.
- Output token counts include useful response body, not only summary text.
- Micro optimizes total response size.
- Compact optimizes structured continuation state.
- Long-context upload separates content transfer from paid result retrieval.

## Related

- Full LLM index: https://contextkit.pro/llms-full.txt
- Examples: https://contextkit.pro/examples.md
- OpenAPI: https://contextkit.pro/openapi.json
