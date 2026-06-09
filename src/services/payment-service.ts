import { readEnv } from "@/lib/env";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import { createId } from "@/utils/id";

export type PaymentVerificationResult = {
  ok: boolean;
  paymentId?: string;
  payer?: string;
  facilitatorResponse?: unknown;
  error?: string;
};

export class PaymentService {
  private readonly kv: AppKV;

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  paymentRequirements(resource: string, amountUsd: number) {
    const env = readEnv({ env: this.env });
    const payableResource = normalizeResource(resource, env.contextkitBaseUrl);
    return [
      {
        scheme: "exact",
        network: env.x402Network,
        maxAmountRequired: amountUsd.toFixed(6),
        resource: payableResource,
        payTo: env.x402PayTo,
        asset: "USDC",
        mimeType: "application/json"
      }
    ];
  }

  async verify(paymentHeader: string, resource: string, amountUsd: number): Promise<PaymentVerificationResult> {
    const env = readEnv({ env: this.env });
    if (!paymentHeader) {
      return { ok: false, error: "missing_payment" };
    }

    const payload = decodePayment(paymentHeader);
    const response = await fetch(`${env.x402FacilitatorUrl.replace(/\/$/, "")}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment: payload,
        requirements: this.paymentRequirements(resource, amountUsd)[0]
      })
    }).catch((error) => error);

    if (!(response instanceof Response)) {
      return { ok: false, error: String(response) };
    }

    const facilitatorResponse = await response.json().catch(() => ({ status: response.status }));
    const valid = response.ok && Boolean((facilitatorResponse as { valid?: boolean; success?: boolean }).valid ?? (facilitatorResponse as { success?: boolean }).success);

    if (!valid) {
      return { ok: false, facilitatorResponse, error: "payment_verification_failed" };
    }

    return {
      ok: true,
      paymentId: String((facilitatorResponse as { paymentId?: string; transaction?: string }).paymentId ?? (facilitatorResponse as { transaction?: string }).transaction ?? createId("pay")),
      payer: String((facilitatorResponse as { payer?: string }).payer ?? "unknown"),
      facilitatorResponse
    };
  }

  async recordPayment(input: {
    paymentId: string;
    route: string;
    amountUsd: number;
    requestId: string;
    payer?: string;
    apiKeyId?: string;
    ownerId?: string;
    facilitatorResponse?: unknown;
  }) {
    const event = {
      ...input,
      receivedAt: new Date().toISOString(),
      verification: "verified"
    };
    await Promise.all([
      this.kv.set(`payment:${input.paymentId}`, event),
      this.kv.set(`payment-index:${input.paymentId}`, { id: input.paymentId }),
      this.kv.increment("analytics:payment-count"),
      this.kv.set("analytics:payment-total", Number((((await this.kv.get<number>("analytics:payment-total")) ?? 0) + input.amountUsd).toFixed(6)))
    ]);
  }

  async listPayments(ownerId?: string) {
    const index = await this.kv.getMany<{ id: string }>("payment-index:");
    const payments = await Promise.all(index.map((item) => this.kv.get(`payment:${item.id}`)));
    return payments.filter((payment): payment is Record<string, unknown> => {
      if (!payment || typeof payment !== "object") return false;
      const record = payment as Record<string, unknown>;
      return !ownerId || record.ownerId === ownerId;
    });
  }
}

function decodePayment(header: string) {
  try {
    return JSON.parse(header);
  } catch {
    try {
      return JSON.parse(atob(header));
    } catch {
      return header;
    }
  }
}

function normalizeResource(resource: string, baseUrl: string) {
  if (!baseUrl) return resource;
  try {
    const incoming = new URL(resource);
    const base = new URL(baseUrl);
    return `${base.origin}${incoming.pathname}${incoming.search}`;
  } catch {
    return resource;
  }
}
