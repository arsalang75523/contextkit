import type {
  CompressContextResponse,
  ContextRequest,
  HandoffResponse,
  MemoryEnrichmentResponse,
  ProfileResponse,
  SummarizeResponse,
  X402PaymentHandler
} from "./types";

export type ContextKitOptions = {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  retries?: number;
  x402?: X402PaymentHandler;
};

export class ContextKit {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly retries: number;
  private readonly x402?: X402PaymentHandler;

  constructor(private readonly options: ContextKitOptions) {
    this.baseUrl = options.baseUrl ?? "https://contextkit.dev";
    this.fetcher = options.fetch ?? fetch;
    this.retries = options.retries ?? 2;
    this.x402 = options.x402;
  }

  summarize(request: ContextRequest) {
    return this.post<SummarizeResponse>("/api/summarize", request);
  }

  compressContext(request: ContextRequest) {
    return this.post<CompressContextResponse>("/api/compress-context", request);
  }

  handoff(request: ContextRequest) {
    return this.post<HandoffResponse>("/api/handoff", request);
  }

  extractProfile(request: ContextRequest) {
    return this.post<ProfileResponse>("/api/extract-profile", request);
  }

  memoryEnrichment(request: ContextRequest) {
    return this.post<MemoryEnrichmentResponse>("/api/memory-enrichment", request);
  }

  async estimateTokens(input: unknown) {
    return this.post<{ inputTokens: number; compressedTokens: number; reductionPercent: number }>("/api/tokens/estimate", input);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, "")}${path}`;
    const init: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    };

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const response = await this.fetcher(url, init);
      if (response.status === 402 && this.x402) {
        const challenge = await response.json();
        const payment = await this.x402(challenge, { ...init, url });
        init.headers = { ...(init.headers as Record<string, string>), "X-Payment": payment };
        continue;
      }

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status >= 500 && attempt < this.retries) {
        await delay(2 ** attempt * 250);
        continue;
      }

      throw new ContextKitError(response.status, await response.text());
    }

    throw new Error("ContextKit request failed after retries.");
  }
}

export class ContextKitError extends Error {
  constructor(
    readonly status: number,
    readonly body: string
  ) {
    super(`ContextKit API request failed with ${status}: ${body}`);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
