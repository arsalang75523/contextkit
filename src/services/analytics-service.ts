import { AppFiles } from "@/storage/files";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";

type RequestLogInput = {
  requestId: string;
  route: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  paymentId?: string;
  apiKeyId?: string;
  ownerId?: string;
  amountUsd?: number;
  status?: "success" | "error";
};

export class AnalyticsService {
  constructor(private readonly env: AppBindings["Bindings"] = {}) {}

  async recordRequest(input: RequestLogInput) {
    const kv = new AppKV(this.env.CONTEXTKIT_KV);
    const reductionPercent = Math.max(0, Math.round(((input.inputTokens - input.outputTokens) / Math.max(input.inputTokens, 1)) * 100));
    const current = {
      requests: (await kv.get<number>("analytics:requests")) ?? 0,
      inputTokens: (await kv.get<number>("analytics:input-tokens")) ?? 0,
      outputTokens: (await kv.get<number>("analytics:output-tokens")) ?? 0,
      latencyMs: (await kv.get<number>("analytics:latency-ms")) ?? 0,
      webhookDeliveries: (await kv.get<number>("analytics:webhook-deliveries")) ?? 0,
      webhookFailures: (await kv.get<number>("analytics:webhook-failures")) ?? 0
    };

    await Promise.all([
      kv.set(`request:${input.requestId}`, { ...input, reductionPercent, completedAt: new Date().toISOString() }),
      kv.set(`request-index:${input.requestId}`, { id: input.requestId }),
      kv.increment(`analytics:route:${input.route}`),
      kv.set("analytics:requests", current.requests + 1),
      kv.set("analytics:input-tokens", current.inputTokens + input.inputTokens),
      kv.set("analytics:output-tokens", current.outputTokens + input.outputTokens),
      kv.set("analytics:latency-ms", current.latencyMs + input.latencyMs)
    ]);

    await new AppFiles(this.env.CONTEXTKIT_FILES).writeJson(`requests/${input.requestId}.json`, input);
  }

  async overview() {
    return this.globalOverview();
  }

  async totalRecordedRevenue() {
    const requests = await this.requests();
    const total = requests.reduce<number>((sum, request) => {
      if (!request || typeof request !== "object" || !("amountUsd" in request)) return sum;
      const amount = Number(request.amountUsd);
      return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0);

    return Number(total.toFixed(6));
  }

  async overviewForOwner(ownerId?: string) {
    if (!ownerId) return emptyOverview();
    const requests = await this.requestsForOwner(ownerId);
    const totalRequests = requests.length;
    const totalInputTokens = sum(requests, "inputTokens");
    const totalOutputTokens = sum(requests, "outputTokens");
    const latencyMs = sum(requests, "latencyMs");
    const paymentTotal = Number(sum(requests, "amountUsd").toFixed(6));

    return {
      ...buildOverview({
        totalRequests,
        totalInputTokens,
        totalOutputTokens,
        latencyMs,
        webhookDeliveries: 0,
        webhookFailures: 0,
        paymentTotal
      }),
      scope: "account"
    };
  }

  private async globalOverview() {
    const kv = new AppKV(this.env.CONTEXTKIT_KV);
    const [requests, inputTokens, outputTokens, latencyMs, webhookDeliveries, webhookFailures, paymentTotal] = await Promise.all([
      kv.get<number>("analytics:requests"),
      kv.get<number>("analytics:input-tokens"),
      kv.get<number>("analytics:output-tokens"),
      kv.get<number>("analytics:latency-ms"),
      kv.get<number>("analytics:webhook-deliveries"),
      kv.get<number>("analytics:webhook-failures"),
      kv.get<number>("analytics:payment-total")
    ]);
    const totalRequests = requests ?? 0;
    const totalInputTokens = inputTokens ?? 0;
    const totalOutputTokens = outputTokens ?? 0;
    const totalWebhookDeliveries = webhookDeliveries ?? 0;
    const failedWebhookDeliveries = webhookFailures ?? 0;

    return buildOverview({
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      latencyMs: latencyMs ?? 0,
      webhookDeliveries: totalWebhookDeliveries,
      webhookFailures: failedWebhookDeliveries,
      paymentTotal: paymentTotal ?? 0
    });
  }

  async requests() {
    const kv = new AppKV(this.env.CONTEXTKIT_KV);
    const index = await kv.getMany<{ id: string }>("request-index:");
    const requests = await Promise.all(index.map((item) => kv.get(`request:${item.id}`)));
    return requests.filter(Boolean);
  }

  async requestsForOwner(ownerId?: string) {
    if (!ownerId) return [];
    const requests = await this.requests();
    return requests.filter((request): request is RequestLogInput & { completedAt?: string; reductionPercent?: number } => {
      return Boolean(request && typeof request === "object" && "ownerId" in request && request.ownerId === ownerId);
    });
  }

  async endpointUsage() {
    const kv = new AppKV(this.env.CONTEXTKIT_KV);
    const keys = await kv.list("analytics:route:");
    const entries = await Promise.all(
      keys.map(async (key: string) => ({
        endpoint: key.replace("analytics:route:", ""),
        requests: (await kv.get<number>(key)) ?? 0
      }))
    );
    return entries.sort((a: { requests: number }, b: { requests: number }) => b.requests - a.requests);
  }

  async endpointUsageForOwner(ownerId?: string) {
    const requests = await this.requestsForOwner(ownerId);
    const counts = new Map<string, number>();
    for (const request of requests) {
      counts.set(request.route, (counts.get(request.route) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([endpoint, requests]) => ({ endpoint, requests }))
      .sort((a, b) => b.requests - a.requests);
  }

  async endpointStats() {
    const requests = await this.requests() as Array<RequestLogInput & { completedAt?: string; reductionPercent?: number }>;
    const stats = new Map<string, {
      endpoint: string;
      requests: number;
      inputTokens: number;
      outputTokens: number;
      savedTokens: number;
      latencyMs: number;
      paymentTotal: number;
      lastRequestAt?: string;
    }>();

    for (const request of requests) {
      const endpoint = normalizeEndpointSlug(request.route);
      const current = stats.get(endpoint) ?? {
        endpoint,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        savedTokens: 0,
        latencyMs: 0,
        paymentTotal: 0
      };

      current.requests += 1;
      current.inputTokens += request.inputTokens ?? 0;
      current.outputTokens += request.outputTokens ?? 0;
      current.savedTokens += Math.max(0, (request.inputTokens ?? 0) - (request.outputTokens ?? 0));
      current.latencyMs += request.latencyMs ?? 0;
      current.paymentTotal = Number((current.paymentTotal + (request.amountUsd ?? 0)).toFixed(6));
      current.lastRequestAt = latestIso(current.lastRequestAt, request.completedAt);
      stats.set(endpoint, current);
    }

    return Array.from(stats.values()).map((entry) => ({
      endpoint: entry.endpoint,
      requests: entry.requests,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      savedTokens: entry.savedTokens,
      averageReductionPercent: entry.inputTokens === 0 ? 0 : Math.max(0, Math.round(((entry.inputTokens - entry.outputTokens) / entry.inputTokens) * 100)),
      averageLatencyMs: entry.requests === 0 ? 0 : Math.round(entry.latencyMs / entry.requests),
      paymentTotal: entry.paymentTotal,
      lastRequestAt: entry.lastRequestAt
    }));
  }
}

type OverviewInput = {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  latencyMs: number;
  webhookDeliveries: number;
  webhookFailures: number;
  paymentTotal: number;
};

function buildOverview(input: OverviewInput) {
  const savedTokens = Math.max(0, input.totalInputTokens - input.totalOutputTokens);
  return {
    totalRequests: input.totalRequests,
    totalInputTokens: input.totalInputTokens,
    totalOutputTokens: input.totalOutputTokens,
    savedTokens,
    averageTokenReduction: input.totalInputTokens === 0 ? 0 : Math.max(0, Math.round(((input.totalInputTokens - input.totalOutputTokens) / input.totalInputTokens) * 100)),
    averageLatencyMs: input.totalRequests === 0 ? 0 : Math.round(input.latencyMs / input.totalRequests),
    webhookDeliveries: input.webhookDeliveries,
    webhookDeliverySuccessRate:
      input.webhookDeliveries + input.webhookFailures === 0
        ? 0
        : Number((input.webhookDeliveries / (input.webhookDeliveries + input.webhookFailures)).toFixed(4)),
    paymentTotal: input.paymentTotal,
    monthlySavingsEstimateUsd: Number(((savedTokens / 1_000_000) * 15).toFixed(2))
  };
}

function emptyOverview() {
  return buildOverview({ totalRequests: 0, totalInputTokens: 0, totalOutputTokens: 0, latencyMs: 0, webhookDeliveries: 0, webhookFailures: 0, paymentTotal: 0 });
}

function sum(items: Array<Record<string, unknown>>, key: string) {
  return items.reduce((total, item) => total + (typeof item[key] === "number" ? item[key] as number : 0), 0);
}

function normalizeEndpointSlug(route: string) {
  const clean = route.replace(/^\/api/, "").replace(/^\/x402/, "").replace(/^\/internal/, "").replace(/^\//, "");
  if (clean === "compress") return "compress-context";
  if (clean === "profile") return "extract-profile";
  return clean || route;
}

function latestIso(current?: string, next?: string) {
  if (!next) return current;
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}
