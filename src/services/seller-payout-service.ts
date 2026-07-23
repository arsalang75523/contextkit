import { verifyMessage } from "viem";
import { isEvmAddress, normalizeTxHash, verifyBaseUsdcTransfer } from "@/lib/base-usdc";
import { readEnv } from "@/lib/env";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import { createId } from "@/utils/id";

type SaleRecord = {
  id: string;
  sellerId: string;
  amountUsd: number;
  createdAt: string;
};

export type SellerPayoutRecord = {
  id: string;
  ownerId: string;
  destination: string;
  amountUsd: number;
  amountUnits: string;
  status: "requested" | "approved" | "rejected" | "paid";
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  paidAt?: string;
  txHash?: string;
  note?: string;
};

type WalletChallenge = {
  ownerId: string;
  address: string;
  nonce: string;
  message: string;
  expiresAt: string;
};

type VerifiedWallet = {
  address: string;
  verifiedAt: string;
};

export class SellerPayoutService {
  private readonly kv: AppKV;

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async createWalletChallenge(ownerId: string, address: string) {
    const normalizedAddress = normalizeAddress(address);
    const nonce = createId("nonce");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const message = [
      "ContextKit seller payout wallet verification",
      `Account: ${ownerId}`,
      `Wallet: ${normalizedAddress}`,
      `Nonce: ${nonce}`,
      `Expires: ${expiresAt}`,
      "This signature does not authorize a transaction."
    ].join("\n");
    const challenge: WalletChallenge = {
      ownerId,
      address: normalizedAddress,
      nonce,
      message,
      expiresAt
    };
    await this.kv.set(walletChallengeKey(ownerId), challenge, 10 * 60);
    return challenge;
  }

  async verifyWallet(ownerId: string, address: string, signature: string) {
    const challenge = await this.kv.get<WalletChallenge>(walletChallengeKey(ownerId));
    const normalizedAddress = normalizeAddress(address);
    if (!challenge || challenge.ownerId !== ownerId || challenge.address !== normalizedAddress) {
      throw new Error("wallet_challenge_not_found");
    }
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) throw new Error("wallet_challenge_expired");
    const valid = await verifyMessage({
      address: normalizedAddress as `0x${string}`,
      message: challenge.message,
      signature: signature as `0x${string}`
    });
    if (!valid) throw new Error("wallet_signature_invalid");

    const wallet: VerifiedWallet = {
      address: normalizedAddress,
      verifiedAt: new Date().toISOString()
    };
    await Promise.all([
      this.kv.set(walletKey(ownerId), wallet),
      this.kv.delete(walletChallengeKey(ownerId)),
      this.audit("payout.wallet_verified", ownerId, { address: normalizedAddress })
    ]);
    return wallet;
  }

  async summary(ownerId: string) {
    const [sales, payouts, wallet, legacyPaid, ownerIndex] = await Promise.all([
      this.kv.getMany<SaleRecord>(`seller-sale:${ownerId}:`),
      this.kv.getMany<SellerPayoutRecord>(payoutOwnerPrefix(ownerId)),
      this.kv.get<VerifiedWallet>(walletKey(ownerId)),
      this.kv.get<number>(`seller-payout-paid:${ownerId}`),
      this.kv.getMany<{ id: string }>(`experience-owner:${ownerId}:`)
    ]);
    const ownerRecords = await Promise.all(ownerIndex.map((item) =>
      this.kv.get<{ earnedUsd?: number }>(`experience:${item.id}`)
    ));
    const saleRevenue = sales.reduce((total, sale) => total + sale.amountUsd, 0);
    const recordRevenue = ownerRecords.reduce((total, record) => total + Number(record?.earnedUsd ?? 0), 0);
    const grossRevenueUsd = money(Math.max(saleRevenue, recordRevenue));
    const ledgerPaidUsd = payouts
      .filter((payout) => payout.status === "paid")
      .reduce((total, payout) => total + payout.amountUsd, 0);
    const paidOutUsd = money(Math.max(ledgerPaidUsd, legacyPaid ?? 0));
    const reservedUsd = money(payouts
      .filter((payout) => payout.status === "requested" || payout.status === "approved")
      .reduce((total, payout) => total + payout.amountUsd, 0));
    const availableUsd = money(Math.max(grossRevenueUsd - paidOutUsd - reservedUsd, 0));

    return {
      grossRevenueUsd,
      availableUsd,
      reservedUsd,
      paidOutUsd,
      minimumPayoutUsd: 1,
      settlement: "USDC on Base",
      wallet: wallet ?? null,
      requests: payouts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
    };
  }

  async request(ownerId: string, amountUsd?: number) {
    const lockKey = `seller-payout-lock:${ownerId}`;
    const lockCount = await this.kv.increment(lockKey, 120);
    if (lockCount > 1) throw new Error("payout_request_in_progress");
    try {
      const summary = await this.summary(ownerId);
      if (!summary.wallet) throw new Error("payout_wallet_required");
      const amount = money(amountUsd ?? summary.availableUsd);
      if (amount < summary.minimumPayoutUsd) throw new Error("payout_below_minimum");
      if (amount > summary.availableUsd) throw new Error("payout_insufficient_balance");

      const now = new Date().toISOString();
      const payout: SellerPayoutRecord = {
        id: createId("payout"),
        ownerId,
        destination: summary.wallet.address,
        amountUsd: amount,
        amountUnits: String(Math.round(amount * 1_000_000)),
        status: "requested",
        createdAt: now,
        updatedAt: now
      };
      await Promise.all([
        this.kv.set(payoutKey(payout.id), payout),
        this.kv.set(payoutOwnerKey(ownerId, payout.id), payout),
        this.kv.set(payoutAdminKey(payout.id), payout),
        this.audit("payout.requested", ownerId, { payoutId: payout.id, amountUsd: amount })
      ]);
      return payout;
    } catch (error) {
      await this.kv.delete(lockKey);
      throw error;
    }
  }

  async adminList() {
    const payouts = await this.kv.getMany<SellerPayoutRecord>("seller-payout-admin:");
    return payouts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async approve(payoutId: string, note?: string) {
    return this.updateStatus(payoutId, "approved", note);
  }

  async reject(payoutId: string, note: string) {
    return this.updateStatus(payoutId, "rejected", note);
  }

  async markPaid(payoutId: string, txHashInput: string) {
    const payout = await this.kv.get<SellerPayoutRecord>(payoutKey(payoutId));
    if (!payout) throw new Error("payout_not_found");
    if (payout.status === "paid") return payout;
    if (payout.status !== "approved") throw new Error("payout_not_approved");
    const txHash = normalizeTxHash(txHashInput);
    const transactionClaimKey = `seller-payout-tx:${txHash}`;
    if (await this.kv.increment(transactionClaimKey) > 1) throw new Error("transaction_already_used");

    try {
      const env = readEnv({ env: this.env });
      const verified = await verifyBaseUsdcTransfer({
        rpcUrl: env.creditBaseRpcUrl,
        txHash,
        payTo: payout.destination,
        tokenContract: env.creditUsdcContract,
        minimumUnits: BigInt(payout.amountUnits)
      });
      if (!verified) throw new Error("payout_transaction_not_verified");

      const now = new Date().toISOString();
      const paid: SellerPayoutRecord = {
        ...payout,
        status: "paid",
        txHash,
        paidAt: now,
        updatedAt: now
      };
      await Promise.all([
        this.writePayout(paid),
        this.audit("payout.paid", "admin", { payoutId, txHash, amountUsd: payout.amountUsd })
      ]);
      return paid;
    } catch (error) {
      await this.kv.delete(transactionClaimKey);
      throw error;
    }
  }

  private async updateStatus(payoutId: string, status: "approved" | "rejected", note?: string) {
    const payout = await this.kv.get<SellerPayoutRecord>(payoutKey(payoutId));
    if (!payout) throw new Error("payout_not_found");
    if (payout.status !== "requested") throw new Error("payout_status_conflict");
    const now = new Date().toISOString();
    const updated: SellerPayoutRecord = {
      ...payout,
      status,
      note: note?.trim().slice(0, 500),
      approvedAt: status === "approved" ? now : undefined,
      rejectedAt: status === "rejected" ? now : undefined,
      updatedAt: now
    };
    await Promise.all([
      this.writePayout(updated),
      this.audit(`payout.${status}`, "admin", { payoutId, note: updated.note })
    ]);
    return updated;
  }

  private async writePayout(payout: SellerPayoutRecord) {
    await Promise.all([
      this.kv.set(payoutKey(payout.id), payout),
      this.kv.set(payoutOwnerKey(payout.ownerId, payout.id), payout),
      this.kv.set(payoutAdminKey(payout.id), payout)
    ]);
  }

  private async audit(action: string, actorId: string, details: Record<string, unknown>) {
    const id = createId("aud");
    await this.kv.set(`marketplace-audit:${new Date().toISOString()}:${id}`, {
      id,
      action,
      actorId,
      details,
      createdAt: new Date().toISOString()
    });
  }
}

function normalizeAddress(value: string) {
  const address = value.trim().toLowerCase();
  if (!isEvmAddress(address)) throw new Error("invalid_wallet_address");
  return address;
}

function money(value: number) {
  return Number(value.toFixed(6));
}

function walletChallengeKey(ownerId: string) {
  return `seller-payout-wallet-challenge:${ownerId}`;
}

function walletKey(ownerId: string) {
  return `seller-payout-wallet:${ownerId}`;
}

function payoutKey(id: string) {
  return `seller-payout:${id}`;
}

function payoutOwnerPrefix(ownerId: string) {
  return `seller-payout-owner:${ownerId}:`;
}

function payoutOwnerKey(ownerId: string, id: string) {
  return `${payoutOwnerPrefix(ownerId)}${id}`;
}

function payoutAdminKey(id: string) {
  return `seller-payout-admin:${id}`;
}
