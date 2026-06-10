import type { ContextEndpoint } from "@/types/api";

export const endpointPricing: Record<ContextEndpoint, number> = {
  summarize: 0.002,
  "compress-context": 0.003,
  handoff: 0.003,
  "extract-profile": 0.004,
  "memory-enrichment": 0.003
};
