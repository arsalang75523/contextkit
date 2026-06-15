import type { ContextEndpoint } from "@/types/api";

export const endpointPricing: Record<ContextEndpoint, number> = {
  summarize: 0.05,
  "compress-context": 0.03,
  handoff: 0.03,
  "extract-profile": 0.04,
  "memory-enrichment": 0.04
};
