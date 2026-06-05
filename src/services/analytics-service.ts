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

    return {
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      savedTokens: Math.max(0, totalInputTokens - totalOutputTokens),
      averageTokenReduction: totalInputTokens === 0 ? 0 : Math.round(((totalInputTokens - totalOutputTokens) / totalInputTokens) * 100),
      averageLatencyMs: totalRequests === 0 ? 0 : Math.round((latencyMs ?? 0) / totalRequests),
      webhookDeliveries: totalWebhookDeliveries,
      webhookDeliverySuccessRate:
        totalWebhookDeliveries + failedWebhookDeliveries === 0
          ? 0
          : Number((totalWebhookDeliveries / (totalWebhookDeliveries + failedWebhookDeliveries)).toFixed(4)),
      paymentTotal: paymentTotal ?? 0,
      monthlySavingsEstimateUsd: Number((((Math.max(0, totalInputTokens - totalOutputTokens) / 1_000_000) * 15)).toFixed(2))
    };
  }

  async requests() {
    const kv = new AppKV(this.env.CONTEXTKIT_KV);
    const index = await kv.getMany<{ id: string }>("request-index:");
    const requests = await Promise.all(index.map((item) => kv.get(`request:${item.id}`)));
    return requests.filter(Boolean);
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
}
