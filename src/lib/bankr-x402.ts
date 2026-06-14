import { endpoints } from "@/content/docs";

const defaultBankrHostedBaseUrl = "https://x402.bankr.bot/YOUR_WALLET";

export const bankrHostedBaseUrl = process.env.NEXT_PUBLIC_BANKR_X402_BASE_URL ?? defaultBankrHostedBaseUrl;

const hostedSlugs: Record<string, string> = {
  summarize: "contextkit-summarize",
  "compress-context": "contextkit-compress",
  handoff: "contextkit-handoff",
  "extract-profile": "contextkit-profile",
  "memory-enrichment": "contextkit-profile"
};

export function bankrHostedUrl(slug: string) {
  return `${bankrHostedBaseUrl.replace(/\/$/, "")}/${hostedSlugs[slug] ?? slug}`;
}

export function bankrX402Command(slug: string, payload: unknown) {
  const body = JSON.stringify(payload).replaceAll("'", "'\\''");
  return `bankr x402 call ${bankrHostedUrl(slug)} \\
  -X POST \\
  -d '${body}'`;
}

export const hostedEndpoints = endpoints.map((endpoint) => ({
  ...endpoint,
  hostedPath: bankrHostedUrl(endpoint.slug)
}));
