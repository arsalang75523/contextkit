import assert from "node:assert/strict";
import test from "node:test";
import { app } from "@/app-api";
import { buildBankrProxyBody, callBankrForCreditRequest, resolveBankrProxyRoute } from "@/lib/bankr-credit-proxy";
import { createHostedDelegation, verifyHostedDelegation } from "@/lib/hosted-delegation";
import { ApiKeyService } from "@/services/api-key-service";
import { CreditService } from "@/services/credit-service";

const internalSecret = "test-internal-secret-that-is-long-enough";

test("maps every paid API family to the matching Bankr lane and internal callback", () => {
  assert.match(resolveBankrProxyRoute("summarize").url, /contextkit-core$/);
  assert.equal(resolveBankrProxyRoute("memory-enrichment").internalPath, "/api/internal/extract-profile");
  assert.equal(resolveBankrProxyRoute("experience-save", "skill-compile").internalPath, "/api/internal/experience/consider");
  assert.equal(resolveBankrProxyRoute("experience-save", "skill-push").internalPath, "/api/internal/skills/push");
  assert.equal(resolveBankrProxyRoute("experience-publish", "skill-repository-publish").internalPath, "/api/internal/experience/publish");
  assert.match(resolveBankrProxyRoute("experience-search", "skill-search").url, /contextkit-experience-search$/);
  assert.match(resolveBankrProxyRoute("experience-buy", "skill-clone").url, /contextkit-experience-buy$/);
});

test("adds Bankr routing fields without changing the caller payload contract", () => {
  assert.deepEqual(JSON.parse(buildBankrProxyBody('{"messages":[],"mode":"micro"}', "summarize")), {
    messages: [],
    mode: "micro",
    endpoint: "summarize"
  });
  assert.deepEqual(JSON.parse(buildBankrProxyBody('{"skillId":"exp_123"}', "experience-save", "skill-push")), {
    skillId: "exp_123",
    mode: "skill-push"
  });
  assert.throws(() => buildBankrProxyBody("not-json", "summarize"), /invalid_bankr_proxy_json/);
});

test("hosted delegation binds owner identity to path, body, and expiry", async () => {
  const body = '{"endpoint":"summarize"}';
  const token = await createHostedDelegation(internalSecret, {
    ownerId: "acct_owner",
    apiKeyId: "key_test",
    requestId: "req_test",
    path: "/api/internal/summarize",
    body,
    now: 1_000_000
  });
  const verified = await verifyHostedDelegation(internalSecret, token, {
    path: "/api/internal/summarize",
    body,
    now: 1_010_000
  });
  assert.equal(verified.ownerId, "acct_owner");
  await assert.rejects(
    verifyHostedDelegation(internalSecret, token, { path: "/api/internal/handoff", body, now: 1_010_000 }),
    /invalid_hosted_delegation/
  );
  await assert.rejects(
    verifyHostedDelegation(internalSecret, token, { path: "/api/internal/summarize", body: "{}", now: 1_010_000 }),
    /invalid_hosted_delegation/
  );
});

test("credit proxy handles Bankr's live x402 v2 challenge shape and retries with payment", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (input) => {
    calls += 1;
    const request = input instanceof Request ? input : new Request(input);
    if (calls === 1) {
      const challenge = {
        x402Version: 2,
        error: "Payment Required",
        accepts: [{
          scheme: "exact",
          network: "eip155:8453",
          maxAmountRequired: "30000",
          amount: "30000",
          resource: request.url,
          description: "ContextKit core",
          mimeType: "application/json",
          payTo: "0x8AEE621035D93Deb3C0C1177fac252dC2dd501a0",
          maxTimeoutSeconds: 60,
          asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
          extra: { name: "USD Coin", version: "2" }
        }],
        facilitator: "https://api.bankr.bot/facilitator"
      };
      return new Response(JSON.stringify(challenge), {
        status: 402,
        headers: { "Payment-Required": Buffer.from(JSON.stringify(challenge)).toString("base64") }
      });
    }

    assert.ok(request.headers.get("Payment-Signature"));
    assert.ok(request.headers.get("X-ContextKit-Delegation"));
    return Response.json({ ok: true });
  };

  const result = await callBankrForCreditRequest({
    CONTEXTKIT_INTERNAL_TOKEN: internalSecret,
    CONTEXTKIT_BANKR_X402_PAYER_PRIVATE_KEY: `0x${"01".repeat(32)}`
  }, {
    endpoint: "summarize",
    rawBody: '{"messages":[{"role":"user","content":"hello"}]}',
    ownerId: "acct_owner",
    apiKeyId: "key_test",
    requestId: "req_test"
  }, fakeFetch);

  assert.equal(calls, 2);
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { ok: true });
});

test("paid API validates input before charging credit or calling Bankr", async () => {
  const kv = memoryNamespace();
  const env = {
    CONTEXTKIT_KV: kv,
    CONTEXTKIT_INTERNAL_TOKEN: internalSecret,
    CONTEXTKIT_BANKR_X402_PAYER_PRIVATE_KEY: `0x${"01".repeat(32)}`
  };
  const ownerId = "acct_validation_test";
  const apiKeys = new ApiKeyService(env);
  const credits = new CreditService(env);
  const { key } = await apiKeys.create({
    name: "Bankr proxy test",
    environment: "test",
    scopes: ["context:write"]
  }, ownerId);
  await credits.grant({ ownerId, amountUsd: 1 });

  const originalFetch = globalThis.fetch;
  let bankrCalls = 0;
  globalThis.fetch = async () => {
    bankrCalls += 1;
    if (bankrCalls === 2) return Response.json({ error: "Bankr unavailable" }, { status: 500 });
    return Response.json({ mode: "micro", micro: "Bankr response" });
  };

  try {
    const malformed = await app.request("/api/summarize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: "{"
    }, env);
    assert.equal(malformed.status, 400);
    assert.equal(bankrCalls, 0);
    assert.equal(await credits.balance(ownerId), 1);

    const valid = await app.request("/api/summarize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "micro",
        messages: [{ role: "user", content: "Validate the paid Bankr route." }]
      })
    }, env);
    assert.equal(valid.status, 200);
    assert.equal(bankrCalls, 1);
    assert.equal(valid.headers.get("X-ContextKit-Paid-Via"), "bankr-x402");
    assert.equal(await credits.balance(ownerId), 0.95);

    const failedAtBankr = await app.request("/api/summarize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "micro",
        messages: [{ role: "user", content: "Verify credit refund on a failed Bankr request." }]
      })
    }, env);
    assert.equal(failedAtBankr.status, 500);
    assert.equal(bankrCalls, 2);
    assert.equal(failedAtBankr.headers.get("X-ContextKit-Credit-Charged"), "0");
    assert.equal(await credits.balance(ownerId), 0.95);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

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
