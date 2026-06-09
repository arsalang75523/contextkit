import { endpoints } from "@/content/docs";

const defaultBankrHostedBaseUrl = "https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824";

export const bankrHostedBaseUrl = process.env.NEXT_PUBLIC_BANKR_X402_BASE_URL ?? defaultBankrHostedBaseUrl;

const hostedSlugs: Record<string, string> = {
  summarize: "contextkit-summarize",
  "compress-context": "contextkit-compress",
  handoff: "contextkit-handoff",
  "extract-profile": "contextkit-profile"
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
