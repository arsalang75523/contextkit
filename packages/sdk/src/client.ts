import type {
  CompressContextResponse,
  ContextRequest,
  ContextUploadRequest,
  ContextUploadResponse,
  CreditsResponse,
  HandoffResponse,
  MemoryEnrichmentResponse,
  ProfileResponse,
  SkillCompileRequest,
  SkillCompileResponse,
  SkillBundlePushRequest,
  SkillBundlePushResponse,
  SkillBundleValidateRequest,
  SkillBundleValidateResponse,
  SkillPurchaseResponse,
  SkillRecord,
  SkillRepositoryInspectRequest,
  SkillRepositoryInspectResponse,
  SkillRepositorySearchRequest,
  SkillRepositorySearchResponse,
  SkillSearchRequest,
  SkillVersionBuyRequest,
  SkillVersionBuyResponse,
  SkillVersionCloneRequest,
  SkillVersionCloneResponse,
  SkillVersionPublishRequest,
  SkillVersionPublishResponse,
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
    this.baseUrl = options.baseUrl ?? "https://contextkit.pro";
    this.fetcher = options.fetch ?? fetch;
    this.retries = options.retries ?? 2;
    this.x402 = options.x402;
  }

  uploadContext(request: ContextUploadRequest) {
    return this.post<ContextUploadResponse>("/api/context/upload", request);
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

  compileSkill(request: SkillCompileRequest) {
    return this.post<SkillCompileResponse>("/api/skills/compile", request);
  }

  publishSkill(request: { skillId: string; priceUsd?: 0.05; publishToken?: string }) {
    return this.post<{ experience: SkillRecord; marketplace: { listed: true; priceUsd: number; access: string } }>("/api/skills/publish", { ...request, userApproved: true });
  }

  searchSkills(request: SkillSearchRequest = {}) {
    return this.post<{ results: Array<SkillRecord & { score: number }>; count: number; query: string | null }>("/api/skills/search", request);
  }

  buySkill(skillId: string) {
    return this.post<SkillPurchaseResponse>("/api/skills/buy", { skillId });
  }

  validateSkillBundle(request: SkillBundleValidateRequest) {
    return this.post<SkillBundleValidateResponse>("/api/skills/validate", { ...request, mode: "skill-validate" });
  }

  pushSkillBundle(request: SkillBundlePushRequest) {
    return this.post<SkillBundlePushResponse>("/api/skills/push", { ...request, mode: "skill-push" });
  }

  publishSkillVersion(request: SkillVersionPublishRequest) {
    return this.post<SkillVersionPublishResponse>("/api/skills/publish", { ...request, mode: "skill-repository-publish", userApproved: true, priceUsd: 0.05 });
  }

  inspectSkillRepository(request: SkillRepositoryInspectRequest) {
    return this.post<SkillRepositoryInspectResponse>("/api/skills/inspect", { ...request, mode: "skill-inspect" });
  }

  searchSkillRepositories(request: SkillRepositorySearchRequest = {}) {
    return this.post<SkillRepositorySearchResponse>("/api/skills/search", { ...request, mode: "skill-search" });
  }

  buySkillVersion(request: SkillVersionBuyRequest) {
    return this.post<SkillVersionBuyResponse>("/api/skills/buy", { ...request, mode: "skill-buy" });
  }

  cloneSkillVersion(request: SkillVersionCloneRequest) {
    return this.post<SkillVersionCloneResponse>("/api/skills/clone", { ...request, mode: "skill-clone" });
  }

  async estimateTokens(input: unknown) {
    return this.post<{ inputTokens: number; compressedTokens: number; reductionPercent: number }>("/api/tokens/estimate", input);
  }

  credits() {
    return this.get<CreditsResponse>("/api/auth/credits");
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`
      }
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    throw new ContextKitError(response.status, await response.text());
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
