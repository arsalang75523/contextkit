import { endpoints } from "@/content/docs";

const defaultBankrHostedBaseUrl = "https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824";

export const bankrHostedBaseUrl = process.env.NEXT_PUBLIC_BANKR_X402_BASE_URL ?? defaultBankrHostedBaseUrl;

const hostedSlugs: Record<string, string> = {
  summarize: "contextkit-core",
  "compress-context": "contextkit-core",
  handoff: "contextkit-core",
  "extract-profile": "contextkit-core",
  "memory-enrichment": "contextkit-core",
  "experience-save": "contextkit-experience-write",
  "experience-publish": "contextkit-experience-write",
  "experience-search": "contextkit-experience-search",
  "experience-buy": "contextkit-experience-buy",
  "skill-compile": "contextkit-experience-write",
  "skill-publish": "contextkit-experience-write",
  "skill-validate": "contextkit-experience-write",
  "skill-push": "contextkit-experience-write",
  "skill-repository-publish": "contextkit-experience-write",
  "skill-search": "contextkit-experience-search",
  "skill-inspect": "contextkit-experience-search",
  "skill-buy": "contextkit-experience-buy",
  "skill-clone": "contextkit-experience-buy",
  "contextkit-core": "contextkit-core",
  "contextkit-experience-write": "contextkit-experience-write",
  "contextkit-experience-search": "contextkit-experience-search",
  "contextkit-experience-buy": "contextkit-experience-buy"
};

const coreOperations = new Set(["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"]);
const experienceWriteOperations = new Set(["experience-save", "experience-publish", "skill-compile", "skill-publish", "skill-validate", "skill-push", "skill-repository-publish"]);

export function bankrHostedUrl(slug: string) {
  return `${bankrHostedBaseUrl.replace(/\/$/, "")}/${hostedSlugs[slug] ?? slug}`;
}

export function bankrX402Command(slug: string, payload: unknown) {
  const body = JSON.stringify(bankrPayload(slug, payload)).replaceAll("'", "'\\''");
  return `bankr x402 call ${bankrHostedUrl(slug)} \\
  -X POST \\
  -d '${body}'`;
}

export function bankrPayload(slug: string, payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const value = payload as Record<string, unknown>;

  if (coreOperations.has(slug)) {
    return {
      ...value,
      endpoint: slug === "memory-enrichment" ? "memory-enrichment" : slug,
      ...(slug === "memory-enrichment" ? { mode: "memory-enrichment" } : {})
    };
  }

  if (experienceWriteOperations.has(slug)) {
    return {
      ...value,
      mode: value.mode ?? slug
    };
  }

  return value;
}

export const hostedEndpoints = endpoints.map((endpoint) => ({
  ...endpoint,
  hostedPath: bankrHostedUrl(endpoint.slug)
}));
