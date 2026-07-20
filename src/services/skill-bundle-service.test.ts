import assert from "node:assert/strict";
import test from "node:test";
import { buildSkillBundle } from "@/services/skill-bundle-service";
import type { VerifiedSkillDraft } from "@/services/skill-validation";

function skill(): VerifiedSkillDraft {
  return {
    name: "x402-timeout-recovery",
    description: "Recover a timed-out x402 integration without changing the public response contract.",
    license: "MIT",
    version: "1.0.0",
    ecosystem: "x402",
    compatibility: ["bankr", "codex"],
    trigger: "Use when an x402 gateway times out while the origin remains healthy.",
    prerequisites: ["Node.js 20 or newer"],
    inputs: ["Origin and gateway endpoints"],
    outputs: ["Validated forwarding configuration"],
    steps: ["Measure origin latency.", "Precompute long input.", "Verify the gateway response."],
    verification: ["Run npm test and confirm the gateway returns HTTP 200."],
    failureHandling: ["Stop deployment if the response contract changes."],
    doNotUseWhen: ["Do not use with untrusted payment credentials."],
    rollback: ["Restore the previous forwarding handler."],
    tags: ["x402", "timeouts"],
    evidence: {
      userRequest: "Repair the timeout without changing the response contract.",
      agentMethod: "Measured origin latency and added precomputation.",
      outcome: "Gateway returned HTTP 200.",
      reusableLesson: "Precompute long input before entering a short-lived paid gateway."
    },
    testCases: [],
    skillMarkdown: "# x402-timeout-recovery\n\n## Test evidence\n\n- npm test: PASS\n"
  };
}

function files() {
  return [
    { path: "SKILL.md", content: skill().skillMarkdown, encoding: "utf8" as const },
    { path: "LICENSE", content: "MIT License\n", encoding: "utf8" as const },
    {
      path: "skill.json",
      content: JSON.stringify({
        schemaVersion: 1,
        name: "x402-timeout-recovery",
        version: "1.0.0",
        runtime: "node>=20",
        entrypoint: "src/index.ts",
        testCommand: "npm test"
      }),
      encoding: "utf8" as const
    },
    { path: "package.json", content: JSON.stringify({ name: "x402-timeout-recovery", version: "1.0.0", scripts: { test: "node --test" } }), encoding: "utf8" as const },
    { path: "package-lock.json", content: JSON.stringify({ name: "x402-timeout-recovery", version: "1.0.0", lockfileVersion: 3, packages: {} }), encoding: "utf8" as const },
    { path: "config.schema.json", content: JSON.stringify({ type: "object", additionalProperties: false }), encoding: "utf8" as const },
    { path: ".env.example", content: "API_KEY=replace_me\n", encoding: "utf8" as const },
    { path: "src/index.ts", content: "export const recover = () => 'ok';\n", encoding: "utf8" as const },
    { path: "tests/recovery.test.ts", content: "import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('recovers', () => assert.equal(1, 1));\n", encoding: "utf8" as const },
    { path: "examples/basic.ts", content: "import { recover } from '../src/index';\nrecover();\n", encoding: "utf8" as const }
  ];
}

test("builds a deterministic executable repository bundle", () => {
  const first = buildSkillBundle({ repository: skill().name, version: skill().version, files: files(), skill: skill(), skillId: "exp_123" });
  const second = buildSkillBundle({ repository: skill().name, version: skill().version, files: files().reverse(), skill: skill(), skillId: "exp_123" });

  assert.equal(first.validation.publishEligible, true);
  assert.equal(first.manifest.digest, second.manifest.digest);
  assert.match(first.manifest.digest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.files.at(-1)?.path, "checksums.json");
  assert.equal(first.manifest.entrypoint, "src/index.ts");
  assert.equal(first.manifest.files.find((file) => file.path === "src/index.ts")?.mode, 420);
  assert.equal(first.validation.checks.secretScan, true);
});

test("rejects path traversal and credential material", () => {
  const unsafe = files();
  unsafe.push({ path: "../.env", content: "API_KEY=sk_12345678901234567890", encoding: "utf8" });
  const bundle = buildSkillBundle({ repository: skill().name, version: skill().version, files: unsafe, skill: skill() });

  assert.equal(bundle.validation.valid, false);
  assert.equal(bundle.validation.checks.safePaths, false);
  assert.equal(bundle.validation.checks.secretScan, false);
  assert.ok(bundle.validation.findings.some((finding) => finding.includes("Unsafe file path")));
  assert.ok(bundle.validation.findings.some((finding) => finding.includes("credential-like")));
});

test("keeps instruction-only bundles private", () => {
  const instructionFiles = files().filter((file) => !file.path.startsWith("src/") && !["package.json", "package-lock.json", "config.schema.json"].includes(file.path) && !file.path.startsWith("tests/") && !file.path.startsWith("examples/"));
  const descriptor = instructionFiles.find((file) => file.path === "skill.json");
  if (descriptor) {
    descriptor.content = JSON.stringify({ schemaVersion: 1, name: skill().name, version: skill().version });
  }
  const bundle = buildSkillBundle({ repository: skill().name, version: skill().version, files: instructionFiles, skill: skill() });

  assert.equal(bundle.validation.writeEligible, true);
  assert.equal(bundle.validation.publishEligible, false);
  assert.ok(bundle.validation.warnings.some((warning) => warning.includes("Instruction-only")));
});
