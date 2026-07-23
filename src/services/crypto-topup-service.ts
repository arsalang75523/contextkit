import { readEnv } from "@/lib/env";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import { createId } from "@/utils/id";
import { CreditService } from "@/services/credit-service";
import { isEvmAddress, normalizeTxHash, verifyBaseUsdcTransfer } from "@/lib/base-usdc";

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
  expiresAt: string;
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
    if (!isEvmAddress(env.x402PayTo) || /^0x0{40}$/i.test(env.x402PayTo)) {
      throw new Error("topup_wallet_not_configured");
    }
    if (!isEvmAddress(env.creditUsdcContract)) throw new Error("topup_token_not_configured");

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
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 24 * 1000).toISOString()
    };

    await this.kv.set(invoiceKey(invoice.id), invoice, 60 * 60 * 24);
    return invoice;
  }

  async verifyInvoice(input: { ownerId: string; invoiceId: string; txHash: string }) {
    const invoice = await this.kv.get<CreditTopUpInvoice>(invoiceKey(input.invoiceId));
    if (!invoice || invoice.ownerId !== input.ownerId) throw new Error("invoice_not_found");
    if (invoice.status === "paid") return invoice;
    if (new Date(invoice.expiresAt).getTime() < Date.now()) throw new Error("invoice_expired");

    const txHash = normalizeTxHash(input.txHash);

    const used = await this.kv.get<{ invoiceId: string }>(txKey(txHash));
    if (used) throw new Error("transaction_already_used");

    const env = readEnv({ env: this.env });
    const verified = await verifyBaseUsdcTransfer({
      rpcUrl: env.creditBaseRpcUrl,
      txHash,
      payTo: invoice.payTo,
      tokenContract: invoice.tokenContract,
      minimumUnits: BigInt(invoice.amountUnits)
    });
    if (!verified) throw new Error("payment_not_verified");

    const paid: CreditTopUpInvoice = {
      ...invoice,
      status: "paid",
      txHash,
      paidAt: new Date().toISOString()
    };
    await Promise.all([
      this.kv.set(invoiceKey(invoice.id), paid),
      this.kv.set(txKey(txHash), { invoiceId: invoice.id })
    ]);
    await new CreditService(this.env).grant({
      ownerId: invoice.ownerId,
      amountUsd: invoice.amountUsd,
      note: `Crypto top-up ${invoice.id} ${txHash}`
    });
    return paid;
  }

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
