import test from "node:test";
import assert from "node:assert/strict";
import { app } from "@/app-api";
import { ExperienceService, type ExperienceRecord } from "./experience-service";
import {
  renderSkillMarkdown,
  validateSkill,
  type VerifiedSkillDraft
} from "./skill-validation";

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

function faultInjectedNamespace() {
  const values = new Map<string, string>();
  let rejectedPrefix: string | null = null;
  const kv = {
    async get(key: string, type?: string) {
      const value = values.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    async put(key: string, value: string) {
      if (rejectedPrefix && key.startsWith(rejectedPrefix)) {
        throw new Error("simulated_write_failure");
      }
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
  return {
    kv,
    rejectWritesStartingWith(prefix: string) {
      rejectedPrefix = prefix;
    }
  };
}

function verifiedSkill(name: string): VerifiedSkillDraft {
  const draft: Omit<VerifiedSkillDraft, "skillMarkdown"> = {
    name,
    description: "Recover a paid API request while preserving its existing response contract and authorization boundaries.",
    license: "Apache-2.0",
    version: "1.0.0",
    ecosystem: "software-development",
    compatibility: ["bankr", "claude-code", "codex"],
    trigger: "Use when a paid API gateway fails while the authenticated origin remains healthy and contract-compatible.",
    prerequisites: ["Authenticated origin access", "A sanitized reproducible request"],
    inputs: ["Gateway URL", "Origin URL", "Sanitized request payload"],
    outputs: ["Verified failure layer", "Contract-compatible recovery"],
    steps: [
      "Call the authenticated origin and capture its status, latency, and response keys.",
      "Call the paid gateway with the same sanitized payload and compare the observed failure layer.",
      "Apply the smallest recovery, rerun both calls, and compare their response contracts."
    ],
    verification: [
      "Both origin and paid gateway return HTTP 200.",
      "Response contract comparison passes without removed fields."
    ],
    failureHandling: [
      "Stop and repair origin authentication when the direct request returns HTTP 401.",
      "Keep payment failures separate from backend latency failures."
    ],
    doNotUseWhen: ["The source request contains credentials or private user data."],
    rollback: ["Remove temporary precomputed context after verification completes."],
    tags: ["api", "gateway", "recovery"],
    testCases: [
      {
        name: "origin baseline",
        input: "Authenticated origin request using a sanitized representative payload.",
        expectedOutcome: "Origin responds successfully and exposes the expected response keys.",
        successCriteria: ["Origin returns HTTP 200", "Response keys are captured"],
        testMethod: "Called the authenticated origin and recorded status and response keys.",
        observedOutcome: "Origin request completed successfully with HTTP 200.",
        evidenceType: "http-response",
        evidenceExcerpt: "Origin returned HTTP 200 with expected response keys.",
        passed: true,
        evidenceVerified: true,
        sourceMessageIndex: 0
      },
      {
        name: "paid gateway recovery",
        input: "Paid gateway request using the same sanitized representative payload.",
        expectedOutcome: "Paid gateway responds successfully after the recovery is applied.",
        successCriteria: ["Gateway returns HTTP 200", "Payment remains authorized"],
        testMethod: "Called the paid gateway after applying the scoped recovery.",
        observedOutcome: "Paid gateway request completed successfully with HTTP 200.",
        evidenceType: "http-response",
        evidenceExcerpt: "Paid gateway returned HTTP 200 after scoped recovery.",
        passed: true,
        evidenceVerified: true,
        sourceMessageIndex: 1
      },
      {
        name: "response contract comparison",
        input: "Successful origin and paid gateway response payloads from the same request.",
        expectedOutcome: "Both responses retain the same required public contract fields.",
        successCriteria: ["Required keys match", "No contract fields are removed"],
        testMethod: "Compared the successful response keys with an automated contract test.",
        observedOutcome: "Automated response contract test passed with no removed fields.",
        evidenceType: "test-log",
        evidenceExcerpt: "Response contract comparison passed with zero removed fields.",
        passed: true,
        evidenceVerified: true,
        sourceMessageIndex: 2
      }
    ],
    evidence: {
      userRequest: "Repair the paid gateway failure without changing the existing API response contract.",
      agentMethod: "Compared authenticated origin and paid gateway behavior before applying a scoped recovery.",
      outcome: "Both routes returned HTTP 200 and the response contract comparison passed.",
      reusableLesson: "Separate origin, gateway, and payment failures before changing a paid API integration."
    }
  };
  return { ...draft, skillMarkdown: renderSkillMarkdown(draft) };
}

async function seedPublishedSkill(
  kv: KVNamespace,
  input: { id: string; ownerId: string; name: string; priceUsd?: number }
) {
  const skill = verifiedSkill(input.name);
  const validation = validateSkill(skill);
  assert.equal(validation.eligible, true, validation.findings.join(" "));
  const now = new Date().toISOString();
  const record: ExperienceRecord = {
    id: input.id,
    ownerId: input.ownerId,
    title: skill.name,
    summary: skill.description,
    content: skill.skillMarkdown,
    constraints: [],
    decisions: [],
    tags: skill.tags,
    confidence: 0.95,
    source: "verification-test",
    visibility: "public",
    priceUsd: input.priceUsd ?? 0.05,
    sales: 0,
    earnedUsd: 0,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    kind: "verified-skill",
    skill,
    validation,
    moderation: {
      status: "approved",
      updatedAt: now
    }
  };
  await Promise.all([
    kv.put(`experience:${record.id}`, JSON.stringify(record)),
    kv.put(`experience-owner:${record.ownerId}:${record.id}`, JSON.stringify({ id: record.id })),
    kv.put(`experience-public:${record.id}`, JSON.stringify({ id: record.id }))
  ]);
  return record;
}

test("blocks self-purchases and duplicate purchases", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: kv });
  const record = await seedPublishedSkill(kv, {
    id: "exp_aaaaaaaaaaaaaaaaaaaaaaaa",
    ownerId: "seller-one",
    name: "paid-api-contract-recovery"
  });

  await assert.rejects(
    () => service.buy({ skillId: record.id }, record.ownerId, record.priceUsd),
    /self_purchase_forbidden/
  );
  await kv.put(`seller-payout-wallet:${record.ownerId}`, JSON.stringify({
    address: "0x1111111111111111111111111111111111111111",
    verifiedAt: new Date().toISOString()
  }));
  await assert.rejects(
    () => service.preflightBuy(
      { skillId: record.id },
      "wallet:0x1111111111111111111111111111111111111111"
    ),
    /self_purchase_forbidden/
  );

  const purchase = await service.buy({ skillId: record.id }, "buyer-one", record.priceUsd);
  assert.equal(purchase.purchase.experienceId, record.id);

  await assert.rejects(
    () => service.buy({ skillId: record.id }, "buyer-one", record.priceUsd),
    /already_purchased/
  );
});

test("caller-declared buyer prefixes do not create verified sale identities", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: kv });
  const record = await seedPublishedSkill(kv, {
    id: "exp_acacacacacacacacacacacac",
    ownerId: "seller-declared-identity",
    name: "declared-buyer-identity-recovery"
  });
  const declaredBuyerId = "wallet:0x9999999999999999999999999999999999999999";

  await service.buy({ skillId: record.id }, declaredBuyerId, record.priceUsd);
  const sales = await kv.list({ prefix: `experience-sale:${record.id}:` });
  assert.equal(sales.keys.length, 1);
  const sale = await kv.get(sales.keys[0]!.name, "json") as {
    buyerId: string;
    identityStrength?: string;
  };

  assert.equal(sale.buyerId, declaredBuyerId);
  assert.equal(
    sale.identityStrength,
    "declared",
    "Only server-authenticated account or payment-payer evidence may mark a sale identity verified"
  );
});

test("Bankr duplicate access does not record a second hosted payment", async () => {
  const kv = memoryNamespace();
  const env = {
    CONTEXTKIT_KV: kv,
    CONTEXTKIT_INTERNAL_TOKEN: "test-internal-token"
  };
  const record = await seedPublishedSkill(kv, {
    id: "exp_bcbcbcbcbcbcbcbcbcbcbcbc",
    ownerId: "seller-bankr-retry",
    name: "bankr-permanent-access-retry"
  });
  const request = () => app.request("/api/internal/experience/buy", {
    method: "POST",
    headers: {
      Authorization: "Bearer test-internal-token",
      "Content-Type": "application/json",
      "X-ContextKit-X402-Hosted": "bankr",
      "X-ContextKit-X402-Service": "contextkit-experience-buy"
    },
    body: JSON.stringify({
      skillId: record.id,
      buyerId: "agent:permanent-buyer"
    })
  }, env);

  assert.equal((await request()).status, 200);
  assert.equal((await request()).status, 409);
  assert.equal(
    await kv.get("analytics:payment-count", "json"),
    1,
    "A duplicate access request must be rejected before recording another paid Bankr operation"
  );
});

test("numeric purchase claims reject a second ledger write before sales mutate", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: kv });
  const record = await seedPublishedSkill(kv, {
    id: "exp_dddddddddddddddddddddddd",
    ownerId: "seller-claim",
    name: "numeric-purchase-claim-recovery"
  });
  const buyerId = "buyer-claim";
  const claimKey = `experience-purchase-claim:${buyerId}:${record.id}`;
  await kv.put(claimKey, JSON.stringify(1));

  await assert.rejects(
    () => service.buy({ skillId: record.id }, buyerId, record.priceUsd),
    /already_purchased/
  );

  const storedRecord = await kv.get(`experience:${record.id}`, "json") as ExperienceRecord;
  const purchases = await kv.list({ prefix: `experience-purchase:${buyerId}:` });
  assert.equal(storedRecord.sales, 0);
  assert.equal(storedRecord.earnedUsd, 0);
  assert.equal(purchases.keys.length, 0);
  assert.equal(await kv.get(claimKey, "json"), 2);
});

test("concurrent purchase claims create exactly one sale for one buyer and skill", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: kv });
  const record = await seedPublishedSkill(kv, {
    id: "exp_abababababababababababab",
    ownerId: "seller-concurrency",
    name: "concurrent-purchase-claim-recovery"
  });
  const buyerId = "buyer-concurrency";

  const attempts = await Promise.allSettled([
    service.buy({ skillId: record.id }, buyerId, record.priceUsd),
    service.buy({ skillId: record.id }, buyerId, record.priceUsd)
  ]);
  const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
  const rejected = attempts.filter((attempt) => attempt.status === "rejected");
  const storedRecord = await kv.get(`experience:${record.id}`, "json") as ExperienceRecord;
  const purchases = await kv.list({ prefix: `experience-purchase:${buyerId}:` });

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(String((rejected[0] as PromiseRejectedResult).reason), /already_purchased/);
  assert.equal(storedRecord.sales, 1);
  assert.equal(storedRecord.earnedUsd, record.priceUsd);
  assert.equal(purchases.keys.length, 1);
});

test("failed purchase ledger writes do not leave partial buyer access or seller revenue", async () => {
  const fault = faultInjectedNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: fault.kv });
  const record = await seedPublishedSkill(fault.kv, {
    id: "exp_cdcdcdcdcdcdcdcdcdcdcdcd",
    ownerId: "seller-atomic-ledger",
    name: "atomic-purchase-ledger-recovery"
  });
  const buyerId = "buyer-atomic-ledger";
  fault.rejectWritesStartingWith(`seller-sale:${record.ownerId}:`);

  await assert.rejects(
    () => service.buy({ skillId: record.id }, buyerId, record.priceUsd),
    /simulated_write_failure/
  );

  const storedRecord = await fault.kv.get(
    `experience:${record.id}`,
    "json"
  ) as ExperienceRecord;
  const purchases = await fault.kv.list({ prefix: `experience-purchase:${buyerId}:` });
  const sales = await fault.kv.list({ prefix: `experience-sale:${record.id}:` });

  assert.equal(storedRecord.sales, 0);
  assert.equal(storedRecord.earnedUsd, 0);
  assert.equal(purchases.keys.length, 0);
  assert.equal(sales.keys.length, 0);
});

test("closed beta blocks public publish until an administrator grants seller access", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({
    CONTEXTKIT_KV: kv,
    CONTEXTKIT_MARKETPLACE_BETA_MODE: "true"
  });
  const record = await seedPublishedSkill(kv, {
    id: "exp_eeeeeeeeeeeeeeeeeeeeeeee",
    ownerId: "seller-beta",
    name: "beta-gated-api-recovery"
  });
  const publishable = {
    ...record,
    repository: {
      name: "beta-gated-api-recovery",
      version: "1.0.0",
      digest: `sha256:${"a".repeat(64)}`,
      manifest: {} as NonNullable<ExperienceRecord["repository"]>["manifest"],
      validation: {
        writeEligible: true,
        publishEligible: true
      } as NonNullable<ExperienceRecord["repository"]>["validation"]
    }
  };
  await kv.put(`experience:${record.id}`, JSON.stringify(publishable));

  const publishInput = {
    skillId: record.id,
    priceUsd: 0.05 as const,
    visibility: "public" as const,
    userApproved: true as const
  };
  await assert.rejects(
    () => service.publish(publishInput, { ownerId: record.ownerId }),
    /seller_beta_access_required/
  );
  assert.deepEqual(await service.sellerBetaStatus(record.ownerId), {
    enabled: true,
    allowed: false,
    source: "default"
  });

  await service.setSellerBetaAccess(record.ownerId, true, "admin-test");
  const published = await service.publish(publishInput, { ownerId: record.ownerId });
  assert.equal(published.experience.visibility, "public");
  assert.equal((await service.sellerBetaStatus(record.ownerId)).allowed, true);

  await service.updateListing(record.id, record.ownerId, "delist");
  await service.setSellerBetaAccess(record.ownerId, false, "admin-test");
  await assert.rejects(
    () => service.updateListing(record.id, record.ownerId, "relist"),
    /seller_beta_access_required/
  );
});

test("delisting removes public discovery while preserving permanent buyer access", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: kv });
  const record = await seedPublishedSkill(kv, {
    id: "exp_bbbbbbbbbbbbbbbbbbbbbbbb",
    ownerId: "seller-two",
    name: "durable-paid-api-recovery"
  });

  await service.buy({ skillId: record.id }, "buyer-two", record.priceUsd);
  assert.equal((await service.marketplace({ limit: 10 })).count, 1);
  assert.ok(await service.publicListing(record.id));

  const lifecycle = await service.updateListing(record.id, record.ownerId, "delist");
  assert.equal(lifecycle.experience.visibility, "delisted");
  assert.equal(lifecycle.buyerAccessPreserved, true);
  assert.equal((await service.marketplace({ limit: 10 })).count, 0);
  assert.equal((await service.search({
    skillId: record.id,
    includePrivate: false,
    verifiedOnly: true,
    limit: 10
  })).count, 0);
  assert.equal(await service.publicListing(record.id), null);

  const library = await service.buyerLibrary("buyer-two");
  assert.equal(library.count, 1);
  assert.equal(library.results[0]?.access, "permanent");
  assert.equal(library.results[0]?.skill.id, record.id);

  const access = await service.access(record.id, "buyer-two");
  assert.equal(access.access, "permanent");
  assert.equal(access.experience.id, record.id);
  assert.ok(access.installBundle);
});

test("admin suspension hides a listing without revoking buyer access and restore republishes it", async () => {
  const kv = memoryNamespace();
  const service = new ExperienceService({ CONTEXTKIT_KV: kv });
  const record = await seedPublishedSkill(kv, {
    id: "exp_cccccccccccccccccccccccc",
    ownerId: "seller-three",
    name: "moderated-paid-api-recovery"
  });

  await service.buy({ skillId: record.id }, "buyer-three", record.priceUsd);
  const suspended = await service.moderate(
    record.id,
    "suspend",
    "admin-test",
    "Evidence requires a manual policy review."
  );

  assert.equal(suspended.moderation?.status, "suspended");
  assert.equal(await service.publicListing(record.id), null);
  assert.equal((await service.marketplace({ limit: 10 })).count, 0);
  assert.equal((await service.access(record.id, "buyer-three")).access, "permanent");

  const restored = await service.moderate(
    record.id,
    "restore",
    "admin-test",
    "Evidence review completed successfully."
  );
  assert.equal(restored.moderation?.status, "approved");
  assert.ok(await service.publicListing(record.id));
  assert.equal((await service.marketplace({ limit: 10 })).count, 1);
});
