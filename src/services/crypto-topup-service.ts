import { readEnv } from "@/lib/env";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import { createId } from "@/utils/id";
import { CreditService } from "@/services/credit-service";

const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type CreditTopUpInvoice = {
  id: string;
  ownerId: string;
  amountUsd: number;
  amountUsdc: string;
  amountUnits: string;
  network: "base";
  asset: "USDC";
  payTo: string;
  tokenContract: string;
  status: "pending" | "paid";
  createdAt: string;
  paidAt?: string;
  txHash?: string;
};

export class CryptoTopUpService {
  private readonly kv: AppKV;

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async createInvoice(input: { ownerId: string; amountUsd: number }) {
    const env = readEnv({ env: this.env });
    const amountUsd = normalizeAmount(input.amountUsd);
    if (amountUsd < 1) throw new Error("minimum_topup_is_1_usd");

    const invoice: CreditTopUpInvoice = {
      id: createId("inv"),
      ownerId: input.ownerId,
      amountUsd,
      amountUsdc: amountUsd.toFixed(2),
      amountUnits: String(Math.round(amountUsd * 1_000_000)),
      network: "base",
      asset: "USDC",
      payTo: env.x402PayTo,
      tokenContract: env.creditUsdcContract,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    await this.kv.set(invoiceKey(invoice.id), invoice, 60 * 60 * 24);
    return invoice;
  }

  async verifyInvoice(input: { ownerId: string; invoiceId: string; txHash: string }) {
    const invoice = await this.kv.get<CreditTopUpInvoice>(invoiceKey(input.invoiceId));
    if (!invoice || invoice.ownerId !== input.ownerId) throw new Error("invoice_not_found");
    if (invoice.status === "paid") return invoice;

    const used = await this.kv.get<{ invoiceId: string }>(txKey(input.txHash));
    if (used) throw new Error("transaction_already_used");

    const verified = await this.verifyUsdcTransfer({
      txHash: input.txHash,
      payTo: invoice.payTo,
      tokenContract: invoice.tokenContract,
      minimumUnits: BigInt(invoice.amountUnits)
    });
    if (!verified) throw new Error("payment_not_verified");

    const paid: CreditTopUpInvoice = {
      ...invoice,
      status: "paid",
      txHash: input.txHash,
      paidAt: new Date().toISOString()
    };
    await Promise.all([
      this.kv.set(invoiceKey(invoice.id), paid),
      this.kv.set(txKey(input.txHash), { invoiceId: invoice.id })
    ]);
    await new CreditService(this.env).grant({
      ownerId: invoice.ownerId,
      amountUsd: invoice.amountUsd,
      note: `Crypto top-up ${invoice.id} ${input.txHash}`
    });
    return paid;
  }

  private async verifyUsdcTransfer(input: { txHash: string; payTo: string; tokenContract: string; minimumUnits: bigint }) {
    const env = readEnv({ env: this.env });
    const receipt = await rpc<{ status?: string; logs?: Array<{ address?: string; topics?: string[]; data?: string }> }>(
      env.creditBaseRpcUrl,
      "eth_getTransactionReceipt",
      [input.txHash]
    );
    if (!receipt || receipt.status !== "0x1") return false;

    const recipientTopic = addressTopic(input.payTo);
    const token = input.tokenContract.toLowerCase();
    return (receipt.logs ?? []).some((log) => {
      const topics = log.topics ?? [];
      if ((log.address ?? "").toLowerCase() !== token) return false;
      if ((topics[0] ?? "").toLowerCase() !== transferTopic) return false;
      if ((topics[2] ?? "").toLowerCase() !== recipientTopic) return false;
      return BigInt(log.data ?? "0x0") >= input.minimumUnits;
    });
  }
}

async function rpc<T>(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const payload = await response.json() as { result?: T; error?: unknown };
  if (!response.ok || payload.error) throw new Error("rpc_request_failed");
  return payload.result ?? null;
}

function addressTopic(address: string) {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

function invoiceKey(id: string) {
  return `credit-topup-invoice:${id}`;
}

function txKey(txHash: string) {
  return `credit-topup-tx:${txHash.toLowerCase()}`;
}

function normalizeAmount(amount: number) {
  return Number(Number(amount || 0).toFixed(2));
}
