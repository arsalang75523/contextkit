import test from "node:test";
import assert from "node:assert/strict";
import { LaunchReadinessService } from "./launch-readiness-service";
import {
  renderSkillMarkdown,
  validateSkill,
  type VerifiedSkillDraft
} from "./skill-validation";
import type { ExperienceRecord } from "./experience-service";

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

function readinessSkill(name: string): VerifiedSkillDraft {
  const tests = ["typecheck", "integration", "contract"].map((kind, index) => ({
    name: `${kind} verification`,
    input: `Representative ${kind} input for the portable workflow implementation.`,
    expectedOutcome: `The ${kind} verification completes successfully with observable output.`,
    successCriteria: [`${kind} command exits successfully`, "Required output is present"],
    testMethod: `Ran the ${kind} verification command and captured its exact terminal output.`,
    observedOutcome: `${kind} verification completed successfully with exit code 0.`,
    evidenceType: "command-output" as const,
    evidenceExcerpt: `${kind} verification passed with exit code 0 and expected output ${index}.`,
    passed: true,
    evidenceVerified: true,
    sourceMessageIndex: index
  }));
  const draft: Omit<VerifiedSkillDraft, "skillMarkdown"> = {
    name,
    description: "Execute a reusable verified workflow with portable inputs, deterministic checks, and explicit failure recovery.",
    license: "MIT",
    version: "1.0.0",
    ecosystem: "automation",
    compatibility: ["claude-code", "codex", "cursor"],
    trigger: "Use when an agent needs a portable workflow with deterministic verification and explicit rollback behavior.",
    prerequisites: ["Node.js 20 or newer", "A sanitized project workspace"],
    inputs: ["Workspace path", "Expected output contract"],
    outputs: ["Verified workflow result", "Captured validation report"],
    steps: [
      "Inspect the sanitized workspace and identify the smallest relevant execution path.",
      "Run the workflow with explicit inputs and capture observable command output.",
      "Validate the output contract and execute rollback when verification fails."
    ],
    verification: ["Command exits successfully with code 0.", "Output contract verification passes."],
    failureHandling: ["Stop after a failed validation command.", "Restore the last verified workspace state."],
    doNotUseWhen: ["The task requires secrets that cannot be redacted."],
    rollback: ["Restore the last verified workspace state before retrying."],
    tags: ["automation", "verification", "workflow"],
    testCases: tests,
    evidence: {
      userRequest: "Create a reusable verified workflow that other agents can execute safely.",
      agentMethod: "Implemented the workflow, executed three independent checks, and captured their output.",
      outcome: "All checks passed and the output contract remained stable.",
      reusableLesson: "Portable workflows need explicit inputs, observable checks, failure handling, and rollback."
    }
  };
  return { ...draft, skillMarkdown: renderSkillMarkdown(draft) };
}

async function seedReadinessData(kv: KVNamespace) {
  for (let index = 0; index < 50; index += 1) {
    await kv.put(`account:acct_${String(index).padStart(24, "0")}`, JSON.stringify({ id: index }));
  }

  const skillIds: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const id = `exp_${String(index).padStart(24, "a")}`;
    const ownerId = `seller-${index % 5}`;
    const skill = readinessSkill(`portable-workflow-${index}`);
    const validation = validateSkill(skill);
    assert.equal(validation.eligible, true, validation.findings.join(" "));
    assert.ok(validation.score >= 80);
    const now = new Date(Date.now() + index * 1_000).toISOString();
    const record: ExperienceRecord = {
      id,
      ownerId,
      title: skill.name,
      summary: skill.description,
      content: skill.skillMarkdown,
      constraints: [],
      decisions: [],
      tags: skill.tags,
      confidence: 0.94,
      source: "readiness-test",
      visibility: "public",
      priceUsd: 0.05,
      sales: 0,
      earnedUsd: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      kind: "verified-skill",
      skill,
      validation,
      moderation: { status: "approved", updatedAt: now }
    };
    await kv.put(`experience:${id}`, JSON.stringify(record));
    await kv.put(`experience-public:${id}`, JSON.stringify({ id }));
    skillIds.push(id);
  }

  for (let index = 0; index < 25; index += 1) {
    const skillId = skillIds[index % skillIds.length]!;
    const sale = {
      id: `sale-${index}`,
      buyerId: `buyer-${index % 10}`,
      sellerId: `seller-${index % 5}`,
      experienceId: skillId,
      amountUsd: 0.05,
      identityStrength: "account",
      createdAt: new Date(Date.now() + index * 1_000).toISOString()
    };
    await kv.put(`experience-sale:${skillId}:${sale.id}`, JSON.stringify(sale));
  }

  for (let index = 0; index < 3; index += 1) {
    const payout = {
      id: `payout-${index}`,
      ownerId: `seller-${index}`,
      destination: `0x${String(index + 1).padStart(40, "0")}`,
      amountUsd: 1,
      amountUnits: "1000000",
      status: "paid",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };
    await kv.put(`seller-payout-admin:${payout.id}`, JSON.stringify(payout));
  }
  await kv.put("analytics:requests", JSON.stringify(1_000));
}

test("keeps token launch locked when readiness thresholds are not met", async () => {
  const report = await new LaunchReadinessService({
    CONTEXTKIT_KV: memoryNamespace()
  }).report();

  assert.equal(report.status, "closed-beta");
  assert.equal(report.tokenLaunch, "not-started");
  assert.equal(report.policy.betaModeEnabled, false);
  assert.equal(report.summary.passed, 0);
  assert.ok(report.gates.every((gate) => gate.passed === false));
  assert.ok(report.utilityDesign.every((item) =>
    item.utility === "USDC marketplace settlement" ? item.status === "live" : item.status === "locked"
  ));
});

test("marks governance review eligible only when every launch gate passes", async () => {
  const kv = memoryNamespace();
  await seedReadinessData(kv);
  for (let index = 0; index < 40; index += 1) {
    const sale = {
      id: `unverified-sale-${index}`,
      buyerId: `declared-buyer-${index}`,
      sellerId: "seller-0",
      experienceId: "exp_aaaaaaaaaaaaaaaaaaaaaaaa",
      amountUsd: 0.05,
      identityStrength: "declared",
      createdAt: new Date(Date.now() + index * 1_000).toISOString()
    };
    await kv.put(`experience-sale:unverified:${sale.id}`, JSON.stringify(sale));
  }

  const report = await new LaunchReadinessService({
    CONTEXTKIT_KV: kv,
    CONTEXTKIT_MARKETPLACE_BETA_MODE: "true"
  }).report();
  const gates = new Map(report.gates.map((gate) => [gate.key, gate]));

  assert.equal(report.status, "eligible-for-governance-review");
  assert.equal(report.tokenLaunch, "not-started");
  assert.equal(report.policy.betaModeEnabled, true);
  assert.equal(report.summary.passed, report.summary.total);
  assert.equal(report.summary.progressPercent, 100);
  assert.equal(gates.get("registeredAccounts")?.value, 50);
  assert.equal(gates.get("verifiedSellers")?.value, 5);
  assert.equal(gates.get("publicSkills")?.value, 10);
  assert.equal(gates.get("paidInstalls")?.value, 25);
  assert.equal(gates.get("uniqueBuyers")?.value, 10);
  assert.ok((gates.get("repeatBuyers")?.value ?? 0) >= 3);
  assert.equal(gates.get("paidPayouts")?.value, 3);
  assert.ok((gates.get("averageValidationScore")?.value ?? 0) >= 80);
  assert.equal(gates.get("processedRequests")?.value, 1_000);
  assert.ok(report.gates.every((gate) => gate.passed));
});

test("declared sales cannot satisfy verified buyer launch gates", async () => {
  const kv = memoryNamespace();
  for (let index = 0; index < 50; index += 1) {
    const claimedIdentity = index % 2 === 0
      ? `wallet:0x${String(index).padStart(40, "0")}`
      : `api-key:declared-${index}`;
    const sale = {
      id: `declared-${index}`,
      buyerId: claimedIdentity,
      sellerId: "seller-unverified",
      experienceId: "exp_ffffffffffffffffffffffff",
      amountUsd: 0.05,
      identityStrength: "declared",
      createdAt: new Date(Date.now() + index * 1_000).toISOString()
    };
    await kv.put(`experience-sale:declared:${sale.id}`, JSON.stringify(sale));
  }

  const report = await new LaunchReadinessService({ CONTEXTKIT_KV: kv }).report();
  const gates = new Map(report.gates.map((gate) => [gate.key, gate]));
  assert.equal(gates.get("paidInstalls")?.value, 0);
  assert.equal(gates.get("uniqueBuyers")?.value, 0);
  assert.equal(gates.get("repeatBuyers")?.value, 0);
  assert.equal(report.tokenLaunch, "not-started");
});
