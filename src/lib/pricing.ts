import type { BillableEndpoint } from "@/types/api";

export const endpointPricing: Record<BillableEndpoint, number> = {
  summarize: 0.05,
  "compress-context": 0.03,
  handoff: 0.03,
  "extract-profile": 0.04,
  "memory-enrichment": 0.04,
  "experience-save": 0.01,
  "experience-publish": 0.01,
  "experience-search": 0.01,
  "experience-buy": 0.05
};
