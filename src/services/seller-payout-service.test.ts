import test from "node:test";
import assert from "node:assert/strict";
import { privateKeyToAccount } from "viem/accounts";
import { SellerPayoutService } from "./seller-payout-service";

function memoryNamespace() {
  const values = new Map<string, string>();
  return {
    async get(key: string, type?: string) {
      const value = values.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key: string, value: string) {
      values.set(key, value);
    },
    async delete(key: string) {
      values.delete(key);
    },
    async list(options?: { prefix?: string }) {
      const prefix = options?.prefix ?? "";
      return {
        keys: Array.from(values.keys())
          .filter((key) => key.startsWith(prefix))
          .map((name) => ({ name })),
        list_complete: true,
        cacheStatus: null
      };
    }
  } as unknown as KVNamespace;
}

const sellerAccount = privateKeyToAccount(
  "0x1111111111111111111111111111111111111111111111111111111111111111"
);
const otherAccount = privateKeyToAccount(
  "0x2222222222222222222222222222222222222222222222222222222222222222"
);

async function verifySellerWallet(
  service: SellerPayoutService,
  ownerId: string,
  account = sellerAccount
) {
  const challenge = await service.createWalletChallenge(ownerId, account.address);
  const signature = await account.signMessage({ message: challenge.message });
  return service.verifyWallet(ownerId, account.address, signature);
}

async function seedSale(kv: KVNamespace, ownerId: string, amountUsd: number, suffix: string) {
  await kv.put(`seller-sale:${ownerId}:${suffix}`, JSON.stringify({
    id: suffix,
    sellerId: ownerId,
    amountUsd,
    createdAt: new Date().toISOString()
  }));
}

test("rejects a payout wallet challenge signed by a different wallet", async () => {
  const service = new SellerPayoutService({ CONTEXTKIT_KV: memoryNamespace() });
  const challenge = await service.createWalletChallenge("seller-invalid-signature", sellerAccount.address);
  const wrongSignature = await otherAccount.signMessage({ message: challenge.message });

  await assert.rejects(
    () => service.verifyWallet("seller-invalid-signature", sellerAccount.address, wrongSignature),
    /wallet_signature_invalid/
  );
});

test("enforces minimum and available payout balances without network calls", async () => {
  const kv = memoryNamespace();
  const service = new SellerPayoutService({ CONTEXTKIT_KV: kv });

  await verifySellerWallet(service, "seller-below-minimum");
  await seedSale(kv, "seller-below-minimum", 0.75, "sale-low");
  await assert.rejects(
    () => service.request("seller-below-minimum", 0.5),
    /payout_below_minimum/
  );

  await verifySellerWallet(service, "seller-insufficient");
  await seedSale(kv, "seller-insufficient", 1.5, "sale-insufficient");
  await assert.rejects(
    () => service.request("seller-insufficient", 2),
    /payout_insufficient_balance/
  );

  await verifySellerWallet(service, "seller-valid");
  await seedSale(kv, "seller-valid", 2.5, "sale-valid");
  const payout = await service.request("seller-valid", 1.25);
  assert.equal(payout.status, "requested");
  assert.equal(payout.amountUnits, "1250000");
  assert.equal(payout.destination, sellerAccount.address.toLowerCase());

  const summary = await service.summary("seller-valid");
  assert.equal(summary.grossRevenueUsd, 2.5);
  assert.equal(summary.reservedUsd, 1.25);
  assert.equal(summary.availableUsd, 1.25);
  assert.equal(summary.paidOutUsd, 0);
});

test("rejects conflicting payout transitions before any on-chain verification", async () => {
  const kv = memoryNamespace();
  const service = new SellerPayoutService({ CONTEXTKIT_KV: kv });

  await verifySellerWallet(service, "seller-approved");
  await seedSale(kv, "seller-approved", 2, "sale-approved");
  const approvedRequest = await service.request("seller-approved", 1);
  const approved = await service.approve(approvedRequest.id, "Validated by finance.");
  assert.equal(approved.status, "approved");
  await assert.rejects(
    () => service.approve(approved.id, "Duplicate approval."),
    /payout_status_conflict/
  );
  await assert.rejects(
    () => service.reject(approved.id, "Cannot reject an approved payout."),
    /payout_status_conflict/
  );

  await verifySellerWallet(service, "seller-rejected");
  await seedSale(kv, "seller-rejected", 2, "sale-rejected");
  const rejectedRequest = await service.request("seller-rejected", 1);
  const rejected = await service.reject(rejectedRequest.id, "Destination requires review.");
  assert.equal(rejected.status, "rejected");
  await assert.rejects(
    () => service.approve(rejected.id, "Late approval."),
    /payout_status_conflict/
  );
  await assert.rejects(
    () => service.reject(rejected.id, "Duplicate rejection."),
    /payout_status_conflict/
  );

  await verifySellerWallet(service, "seller-requested");
  await seedSale(kv, "seller-requested", 2, "sale-requested");
  const requested = await service.request("seller-requested", 1);
  await assert.rejects(
    () => service.markPaid(requested.id, `0x${"1".repeat(64)}`),
    /payout_not_approved/
  );
});

test("a verified Base transaction cannot settle two payout records", async () => {
  const kv = memoryNamespace();
  const service = new SellerPayoutService({ CONTEXTKIT_KV: kv });
  const originalFetch = globalThis.fetch;
  const txHash = `0x${"a".repeat(64)}`;
  const token = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const recipientTopic = `0x${sellerAccount.address.toLowerCase().slice(2).padStart(64, "0")}`;
  globalThis.fetch = async () => new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: {
      status: "0x1",
      logs: [{
        address: token,
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          `0x${"0".repeat(64)}`,
          recipientTopic
        ],
        data: "0x0f4240"
      }]
    }
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    for (const ownerId of ["seller-replay-one", "seller-replay-two"]) {
      await verifySellerWallet(service, ownerId);
      await seedSale(kv, ownerId, 2, `sale-${ownerId}`);
    }
    const first = await service.request("seller-replay-one", 1);
    const second = await service.request("seller-replay-two", 1);
    await service.approve(first.id, "First payout approved.");
    await service.approve(second.id, "Second payout approved.");

    const paid = await service.markPaid(first.id, txHash);
    assert.equal(paid.status, "paid");
    assert.equal(paid.txHash, txHash);
    assert.equal((await service.markPaid(first.id, txHash)).status, "paid");
    await assert.rejects(
      () => service.markPaid(second.id, txHash),
      /transaction_already_used/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("concurrent settlement cannot reuse one Base transaction for two payouts", async () => {
  const kv = memoryNamespace();
  const service = new SellerPayoutService({ CONTEXTKIT_KV: kv });
  const originalFetch = globalThis.fetch;
  const txHash = `0x${"b".repeat(64)}`;
  const token = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
  const recipientTopic = `0x${sellerAccount.address.toLowerCase().slice(2).padStart(64, "0")}`;
  globalThis.fetch = async () => new Response(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    result: {
      status: "0x1",
      logs: [{
        address: token,
        topics: [
          "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
          `0x${"0".repeat(64)}`,
          recipientTopic
        ],
        data: "0x0f4240"
      }]
    }
  }), { status: 200, headers: { "Content-Type": "application/json" } });

  try {
    const payouts = [];
    for (const ownerId of ["seller-concurrent-one", "seller-concurrent-two"]) {
      await verifySellerWallet(service, ownerId);
      await seedSale(kv, ownerId, 2, `sale-${ownerId}`);
      const payout = await service.request(ownerId, 1);
      payouts.push(await service.approve(payout.id, "Concurrent settlement test."));
    }

    const attempts = await Promise.allSettled(
      payouts.map((payout) => service.markPaid(payout.id, txHash))
    );
    const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.match(
      String((rejected[0] as PromiseRejectedResult).reason),
      /transaction_already_used/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
