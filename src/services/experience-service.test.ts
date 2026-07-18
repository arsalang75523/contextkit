import test from "node:test";
import assert from "node:assert/strict";
import { ExperienceService } from "./experience-service";

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

function llmCandidate() {
  return {
    shouldSave: true,
    confidence: 0.91,
    reason: "The task produced a completed, reusable Bankr x402 recovery method.",
    requiredEvidence: {
      userRequest: "Repair long Bankr x402 calls without changing response structure.",
      agentMethod: "Compared the authenticated origin with the paid gateway, then precomputed long work before forwarding.",
      outcome: "The paid request returned HTTP 200 with the original response contract.",
      reusableLesson: "Precompute long origin work when it exceeds the hosted x402 forwarding deadline."
    },
    skill: {
      name: "bankr-x402-timeout-recovery",
      description: "Diagnose Bankr x402 gateway timeouts when an authenticated origin succeeds directly.",
      version: "1.0.0",
      ecosystem: "x402",
      compatibility: ["bankr", "claude-code", "codex"],
      trigger: "Use when a Bankr x402 request times out while the authenticated origin returns success.",
      prerequisites: ["Bankr CLI authenticated", "Origin endpoint reachable"],
      inputs: ["Paid endpoint URL", "Sanitized payload", "Origin latency result"],
      outputs: ["Identified failure layer", "Verified paid response"],
      steps: [
        "Call the origin with scoped authentication and record its latency.",
        "Compare origin latency with the Bankr x402 forwarding deadline.",
        "Precompute oversized work and retry the paid endpoint with its context identifier."
      ],
      verification: ["Origin and paid endpoint return HTTP 200.", "Response schema remains unchanged."],
      failureHandling: ["Repair origin authentication before gateway tuning.", "Isolate wallet authorization failures from backend latency."],
      doNotUseWhen: ["The origin request fails before authenticated processing."],
      rollback: ["Remove temporary precomputed context after its TTL expires."],
      tags: ["bankr", "x402", "timeouts"],
      testCases: [
        {
          name: "slow large payload",
          input: "A 2,700-token request succeeds at origin but exceeds the paid forwarding deadline.",
          expectedOutcome: "Precompute the request and return a paid HTTP 200 response.",
          successCriteria: ["Paid call succeeds", "Response schema is unchanged"]
        },
        {
          name: "origin authentication failure",
          input: "The direct internal endpoint returns HTTP 401 before x402 forwarding.",
          expectedOutcome: "Stop timeout tuning and repair the scoped origin credential.",
          successCriteria: ["Authentication layer identified", "Gateway deadline remains unchanged"]
        },
        {
          name: "payment authorization failure",
          input: "The origin is healthy but Bankr reports x402 payment status 401.",
          expectedOutcome: "Separate wallet authorization from backend latency diagnosis.",
          successCriteria: ["Payment issue isolated", "Origin configuration is preserved"]
        }
      ]
    }
  };
}

test("compiles, protects, publishes, searches, and buys a verified skill", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: JSON.stringify(llmCandidate()) } }]
  });

  try {
    const service = new ExperienceService({
      CONTEXTKIT_KV: memoryNamespace(),
      BANKR_LLM_KEY: "bk_test_server_only",
      BANKR_LLM_BASE_URL: "https://llm.test/v1"
    });
    const owner = { ownerId: "bankr-hosted" };
    const compiled = await service.consider({
      messages: [
        { role: "user", content: "Repair this Bankr x402 timeout without changing the response." },
        { role: "assistant", content: "Compared origin and gateway latency, precomputed the long work, and verified HTTP 200." }
      ],
      minConfidence: 0.72,
      autoSave: true,
      priceUsd: 0.05
    }, owner);

    assert.equal(compiled.shouldSave, true);
    assert.equal(compiled.validation?.eligible, true);
    assert.match(compiled.publishToken ?? "", /^pub_[a-f0-9]{24}$/);
    if (!compiled.experience || !("id" in compiled.experience)) {
      assert.fail("Expected the compiled skill to be saved as a private record.");
    }
    assert.equal(compiled.experience.visibility, "private");
    const skillId = compiled.experience.id;
    assert.match(skillId ?? "", /^exp_[a-f0-9]{24}$/);

    await assert.rejects(
      () => service.publish({ skillId, priceUsd: 0.05, visibility: "public", userApproved: true }, owner),
      /experience_forbidden/
    );

    const published = await service.publish({
      skillId,
      publishToken: compiled.publishToken,
      priceUsd: 0.05,
      visibility: "public",
      userApproved: true
    }, owner);
    assert.equal(published.experience.visibility, "public");
    assert.equal(published.experience.validation?.status, "verified");

    const search = await service.search({
      query: "timeout",
      ecosystems: ["x402"],
      compatibility: ["codex"],
      verifiedOnly: true,
      includePrivate: false,
      limit: 5
    });
    assert.equal(search.count, 1);
    assert.equal(search.results[0]?.id, skillId);
    assert.equal(search.results[0]?.skill?.skillMarkdown, undefined);
    assert.equal(search.results[0]?.lesson, undefined);
    assert.equal(search.results[0]?.decisions, undefined);

    const purchase = await service.buy({ skillId }, "buyer-account", 0.05);
    assert.equal(purchase.installBundle.format, "contextkit-verified-skill/v1");
    assert.equal(purchase.installBundle.fileName, "SKILL.md");
    assert.match(purchase.installBundle.skillMarkdown, /## Contract tests/);
    assert.equal(purchase.experience.sales, 1);
    assert.equal(purchase.experience.earnedUsd, 0.05);
    assert.equal(purchase.license.resale, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("never publishes an uncompiled legacy note", async () => {
  const service = new ExperienceService({ CONTEXTKIT_KV: memoryNamespace() });
  const owner = { ownerId: "account-test" };
  const saved = await service.save({
    content: "A project-specific note without a portable skill contract.",
    mode: "save"
  }, owner);

  await assert.rejects(
    () => service.publish({
      experienceId: saved.experience.id,
      priceUsd: 0.05,
      visibility: "public",
      userApproved: true
    }, owner),
    /skill_required_for_publish/
  );
});
