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
      license: "Apache-2.0",
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
          successCriteria: ["Paid call succeeds", "Response schema is unchanged"],
          testMethod: "Call the authenticated origin and record its final HTTP status.",
          observedOutcome: "The authenticated origin completed successfully with HTTP 200.",
          evidenceType: "http-response",
          evidenceExcerpt: "Origin returned HTTP 200.",
          passed: true
        },
        {
          name: "origin authentication failure",
          input: "The direct internal endpoint returns HTTP 401 before x402 forwarding.",
          expectedOutcome: "Stop timeout tuning and repair the scoped origin credential.",
          successCriteria: ["Authentication layer identified", "Gateway deadline remains unchanged"],
          testMethod: "Retry the precomputed request through the paid Bankr endpoint.",
          observedOutcome: "The paid endpoint completed successfully with HTTP 200.",
          evidenceType: "http-response",
          evidenceExcerpt: "Paid endpoint returned HTTP 200.",
          passed: true
        },
        {
          name: "payment authorization failure",
          input: "The origin is healthy but Bankr reports x402 payment status 401.",
          expectedOutcome: "Separate wallet authorization from backend latency diagnosis.",
          successCriteria: ["Payment issue isolated", "Origin configuration is preserved"],
          testMethod: "Compare the paid response keys with the authenticated origin response keys.",
          observedOutcome: "The response schema matched after precomputation and paid forwarding.",
          evidenceType: "test-log",
          evidenceExcerpt: "Schema comparison test passed.",
          passed: true
        }
      ]
    }
  };
}

function compactLlmCandidate() {
  const candidate = llmCandidate();
  const skill = candidate.skill;
  return {
    save: candidate.shouldSave,
    confidence: candidate.confidence,
    reason: candidate.reason,
    e: {
      request: candidate.requiredEvidence.userRequest,
      method: candidate.requiredEvidence.agentMethod,
      outcome: candidate.requiredEvidence.outcome,
      lesson: candidate.requiredEvidence.reusableLesson
    },
    s: {
      name: skill.name,
      desc: skill.description,
      license: skill.license,
      eco: skill.ecosystem,
      trigger: skill.trigger,
      pre: skill.prerequisites,
      inputs: skill.inputs,
      outputs: skill.outputs,
      steps: skill.steps,
      verify: skill.verification,
      fail: skill.failureHandling,
      avoid: skill.doNotUseWhen,
      rollback: skill.rollback,
      tags: skill.tags,
      tests: skill.testCases.map((item) => [
        item.name,
        item.input,
        item.expectedOutcome,
        item.successCriteria[0],
        item.testMethod,
        item.observedOutcome,
        item.evidenceType,
        item.evidenceExcerpt,
        item.passed
      ])
    }
  };
}

test("compiles a verified draft but blocks SKILL.md-only public publishing", async () => {
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
        { role: "assistant", content: "Origin returned HTTP 200. Paid endpoint returned HTTP 200. Schema comparison test passed." }
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

    await assert.rejects(
      () => service.publish({
        skillId,
        publishToken: compiled.publishToken,
        priceUsd: 0.05,
        visibility: "public",
        userApproved: true
      }, owner),
      /skill_bundle_required_for_publish/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("pushes, publishes, and clones a complete immutable skill repository", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify(llmCandidate()) } }] });

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
        { role: "assistant", content: "Origin returned HTTP 200. Paid endpoint returned HTTP 200. Schema comparison test passed." }
      ],
      minConfidence: 0.72,
      autoSave: true,
      priceUsd: 0.05
    }, owner);
    if (!compiled.experience || !("id" in compiled.experience) || !compiled.experience.skill?.skillMarkdown) {
      assert.fail("Expected a compiled private skill with SKILL.md.");
    }

    const skillId = compiled.experience.id;
    const repository = compiled.experience.skill.name;
    const version = compiled.experience.skill.version;
    const bundleFiles = [
      { path: "SKILL.md", content: compiled.experience.skill.skillMarkdown, encoding: "utf8" as const, mode: 420 as const },
      { path: "LICENSE", content: "Apache License 2.0\n", encoding: "utf8" as const, mode: 420 as const },
      { path: "skill.json", content: JSON.stringify({ schemaVersion: 1, name: repository, version, runtime: "node>=20", entrypoint: "src/index.ts", testCommand: "npm test" }), encoding: "utf8" as const, mode: 420 as const },
      { path: "package.json", content: JSON.stringify({ name: repository, version, scripts: { test: "node --test" } }), encoding: "utf8" as const, mode: 420 as const },
      { path: "package-lock.json", content: JSON.stringify({ name: repository, version, lockfileVersion: 3, packages: {} }), encoding: "utf8" as const, mode: 420 as const },
      { path: "config.schema.json", content: JSON.stringify({ type: "object", additionalProperties: false }), encoding: "utf8" as const, mode: 420 as const },
      { path: "src/index.ts", content: "export function recover() { return 'ok'; }\n", encoding: "utf8" as const, mode: 420 as const },
      { path: "tests/recovery.test.ts", content: "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('recovers', () => assert.equal(1, 1));\n", encoding: "utf8" as const, mode: 420 as const },
      { path: "examples/basic.ts", content: "import { recover } from '../src/index';\nrecover();\n", encoding: "utf8" as const, mode: 420 as const }
    ];

    const pushed = await service.pushBundle({
      mode: "skill-push",
      skillId,
      publishToken: compiled.publishToken,
      repository,
      version,
      files: bundleFiles
    }, owner);
    assert.equal(pushed.stored, true);
    assert.equal(pushed.validation.publishEligible, true);
    assert.match(pushed.repository.digest, /^sha256:[a-f0-9]{64}$/);

    await assert.rejects(
      () => service.pushBundle({
        mode: "skill-push",
        skillId,
        publishToken: compiled.publishToken,
        repository,
        version,
        files: bundleFiles.map((file) => file.path === "src/index.ts" ? { ...file, content: "export const changed = true;\n" } : file)
      }, owner),
      /skill_version_immutable/
    );

    const published = await service.publish({
      mode: "skill-repository-publish",
      skillId,
      publishToken: compiled.publishToken,
      priceUsd: 0.05,
      visibility: "public",
      userApproved: true
    }, owner);
    assert.equal(published.experience.repository?.validation.publishEligible, true);

    const inspected = await service.search({
      mode: "skill-inspect",
      skillId,
      verifiedOnly: true,
      includePrivate: false,
      limit: 1
    });
    assert.equal(inspected.count, 1);
    assert.equal(inspected.results[0]?.repository?.manifest.digest, pushed.repository.digest);
    assert.equal("content" in (inspected.results[0]?.repository?.manifest.files[0] ?? {}), false);

    const purchase = await service.buy({ mode: "skill-clone", skillId }, "repository-buyer", 0.05);
    assert.equal(purchase.installBundle.format, "contextkit-skill-repository/v1");
    if (!("files" in purchase.installBundle) || !("materialize" in purchase.installBundle)) assert.fail("Expected repository install bundle.");
    const installBundle = purchase.installBundle as { files: Array<{ path: string }>; materialize: { overwrite: boolean } };
    assert.ok(installBundle.files.some((file) => file.path === "src/index.ts"));
    assert.ok(installBundle.files.some((file) => file.path === "checksums.json"));
    assert.equal(installBundle.materialize.overwrite, false);

    const review = await service.review(skillId, {
      rating: 5,
      title: "Reproducible recovery path",
      body: "The verified recovery sequence was clear and reusable."
    }, {
      ownerId: "repository-buyer",
      name: "Repository Buyer"
    });
    assert.equal(review.review.verifiedPurchase, true);
    assert.equal(review.summary.average, 5);
    assert.equal(review.summary.count, 1);

    const marketplace = await service.marketplace({ sort: "trending", limit: 10 });
    assert.equal(marketplace.count, 1);
    assert.equal(marketplace.results[0]?.id, skillId);
    assert.equal(marketplace.results[0]?.installCount, 1);
    assert.equal(marketplace.results[0]?.reviewCount, 1);
    assert.equal(marketplace.results[0]?.category, "x402");

    const seller = await service.sellerDashboard("bankr-hosted");
    assert.equal(seller.totals.sales, 1);
    assert.equal(seller.totals.installs, 1);
    assert.equal(seller.totals.revenueUsd, 0.05);
    assert.equal(seller.payout.pendingUsd, 0.05);
    assert.equal(seller.recentSales.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("never publishes an uncompiled legacy note", async () => {
  const service = new ExperienceService({ CONTEXTKIT_KV: memoryNamespace() });
  const owner = { ownerId: "account-test" };
  const saved = await service.save({
    experience: {
      content: "A completed Bankr gateway investigation compared the paid route with the authenticated origin, isolated the timeout layer, and documented the reusable recovery sequence for future agent runs.",
      task: "Diagnose a repeatable Bankr paid gateway timeout without changing its response contract.",
      outcome: "The paid route completed successfully after long work was moved before forwarding.",
      lesson: "Compare the origin and gateway separately before changing timeout or payment configuration.",
      tags: ["bankr", "x402"]
    },
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

test("rejects an unstructured or trivial legacy write", async () => {
  const service = new ExperienceService({ CONTEXTKIT_KV: memoryNamespace() });

  await assert.rejects(
    () => service.save({ content: "hello this is a random test", mode: "save" }, { ownerId: "account-test" }),
    /experience_not_reusable/
  );
});

test("writes a private draft with one grounded passing test but blocks public publish", async () => {
  const originalFetch = globalThis.fetch;
  const candidate = llmCandidate();
  candidate.skill.testCases = candidate.skill.testCases.slice(0, 1);
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: JSON.stringify(candidate) } }]
  });

  try {
    const service = new ExperienceService({
      CONTEXTKIT_KV: memoryNamespace(),
      BANKR_LLM_KEY: "bk_test_server_only",
      BANKR_LLM_BASE_URL: "https://llm.test/v1"
    });
    const owner = { ownerId: "account-test" };
    const compiled = await service.consider({
      messages: [
        { role: "user", content: "Repair this Bankr x402 timeout without changing the response." },
        { role: "assistant", content: "Origin returned HTTP 200." }
      ],
      minConfidence: 0.72,
      autoSave: true,
      priceUsd: 0.05
    }, owner);

    assert.equal(compiled.shouldSave, true);
    assert.equal(compiled.validation?.writeEligible, true);
    assert.equal(compiled.validation?.eligible, false);
    assert.equal(compiled.validation?.status, "needs-work");
    assert.equal(compiled.publishRecommendation?.shouldAskUser, false);
    if (!compiled.experience || !("id" in compiled.experience)) assert.fail("Expected a saved private draft.");
    const skillId = compiled.experience.id;

    await assert.rejects(
      () => service.publish({
        skillId,
        priceUsd: 0.05,
        visibility: "public",
        userApproved: true
      }, owner),
      /skill_not_publishable/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("compiles the compact LLM wire format without losing validation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: JSON.stringify(compactLlmCandidate()) } }]
  });

  try {
    const service = new ExperienceService({
      CONTEXTKIT_KV: memoryNamespace(),
      BANKR_LLM_KEY: "bk_test_server_only",
      BANKR_LLM_BASE_URL: "https://llm.test/v1"
    });
    const compiled = await service.consider({
      messages: [
        { role: "user", content: "Repair a Bankr x402 timeout without changing the response contract." },
        { role: "assistant", content: "Origin returned HTTP 200. Paid endpoint returned HTTP 200. Schema comparison test passed." }
      ],
      minConfidence: 0.72,
      autoSave: true,
      priceUsd: 0.05
    }, { ownerId: "bankr-hosted" });

    assert.equal(compiled.shouldSave, true);
    assert.equal(compiled.validation?.eligible, true);
    assert.ok(compiled.experience && "kind" in compiled.experience);
    assert.equal(compiled.experience.kind, "verified-skill");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries skill compilation with the primary model when the configured model returns non-JSON", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      choices: [{
        message: {
          content: calls === 1
            ? "The requested skill is ready."
            : JSON.stringify(compactLlmCandidate())
        }
      }]
    });
  };

  try {
    const service = new ExperienceService({
      CONTEXTKIT_KV: memoryNamespace(),
      BANKR_LLM_KEY: "bk_test_server_only",
      BANKR_LLM_BASE_URL: "https://llm.test/v1",
      BANKR_LLM_MODEL: "claude-sonnet-4.5",
      BANKR_SKILL_LLM_MODEL: "gemini-2.5-flash"
    });
    const compiled = await service.consider({
      messages: [
        { role: "user", content: "Repair a Bankr x402 timeout without changing the response contract." },
        { role: "assistant", content: "Origin returned HTTP 200. Paid endpoint returned HTTP 200. Schema comparison test passed." }
      ],
      minConfidence: 0.72,
      autoSave: false,
      priceUsd: 0.05
    }, { ownerId: "bankr-hosted" });

    assert.equal(calls, 2);
    assert.equal(compiled.shouldSave, true);
    assert.equal(compiled.validation?.eligible, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
