import test from "node:test";
import assert from "node:assert/strict";
import { renderSkillMarkdown, validateSkill, type VerifiedSkillDraft } from "./skill-validation";

function validSkill(): VerifiedSkillDraft {
  const draft = {
    name: "bankr-x402-timeout-recovery",
    description: "Diagnose Bankr x402 gateway timeouts when the ContextKit origin succeeds directly.",
    license: "Apache-2.0",
    version: "1.0.0",
    ecosystem: "x402" as const,
    compatibility: ["bankr", "claude-code", "codex"],
    trigger: "Use when a Bankr x402 request times out while the authenticated origin endpoint returns success.",
    prerequisites: ["Bankr CLI authenticated", "ContextKit internal endpoint reachable"],
    inputs: ["Paid endpoint URL", "Sanitized request payload", "Origin health result"],
    outputs: ["Identified timeout layer", "Verified paid request"],
    steps: ["Call the origin with scoped authentication.", "Compare origin latency with the x402 gateway deadline.", "Precompute large payloads and retry through the paid endpoint."],
    verification: ["Origin and paid endpoint both return HTTP 200.", "Returned payload matches the selected ContextKit mode."],
    failureHandling: ["If origin fails, inspect the application log before changing gateway settings.", "If payment fails, verify Bankr authentication separately."],
    doNotUseWhen: ["The origin request itself fails authentication."],
    rollback: ["Remove temporary timeout overrides after verification."],
    tags: ["bankr", "x402", "timeouts"],
    testCases: [
      {
        name: "slow large payload",
        input: "A 2,700-token context succeeds at origin but times out at x402.",
        expectedOutcome: "Precompute the context and return a paid HTTP 200 response.",
        successCriteria: ["Paid call succeeds", "Response structure is unchanged"],
        testMethod: "Call the paid endpoint with a precomputed context identifier.",
        observedOutcome: "The Bankr request returned HTTP 200 within the forwarding deadline.",
        evidenceType: "http-response" as const,
        evidenceExcerpt: "Paid endpoint returned HTTP 200.",
        passed: true,
        evidenceVerified: true,
        sourceMessageIndex: 1
      },
      {
        name: "origin authentication failure",
        input: "The direct internal endpoint returns HTTP 401 before x402 forwarding.",
        expectedOutcome: "Stop gateway tuning and repair the forwarding token.",
        successCriteria: ["Authentication layer identified", "No timeout increase applied"],
        testMethod: "Call the authenticated origin separately from the paid gateway.",
        observedOutcome: "The origin returned HTTP 401 and gateway settings were left unchanged.",
        evidenceType: "http-response" as const,
        evidenceExcerpt: "Origin returned HTTP 401.",
        passed: true,
        evidenceVerified: true,
        sourceMessageIndex: 2
      },
      {
        name: "payment authorization failure",
        input: "The origin is healthy but Bankr reports x402 payment status 401.",
        expectedOutcome: "Separate wallet payment authorization from backend diagnosis.",
        successCriteria: ["Payment issue isolated", "Origin configuration preserved"],
        testMethod: "Compare the healthy origin response with the paid wallet authorization response.",
        observedOutcome: "The payment layer returned status 401 while the origin remained healthy.",
        evidenceType: "test-log" as const,
        evidenceExcerpt: "Payment layer returned status 401.",
        passed: true,
        evidenceVerified: true,
        sourceMessageIndex: 3
      }
    ],
    evidence: {
      userRequest: "Repair long Bankr x402 calls without changing response structure.",
      agentMethod: "Compared direct origin and paid gateway calls, then precomputed the long request.",
      outcome: "The paid request returned HTTP 200 with the original response contract.",
      reusableLesson: "When origin succeeds but the paid gateway times out, precompute long work before the x402 forwarding deadline."
    }
  };
  return { ...draft, skillMarkdown: renderSkillMarkdown(draft) };
}

function rerender(skill: VerifiedSkillDraft) {
  const draft = { ...skill } as Partial<VerifiedSkillDraft>;
  delete draft.skillMarkdown;
  skill.skillMarkdown = renderSkillMarkdown(draft as Omit<VerifiedSkillDraft, "skillMarkdown">);
}

test("accepts a portable tested Bankr skill", () => {
  const report = validateSkill(validSkill());
  assert.equal(report.eligible, true);
  assert.equal(report.status, "verified");
  assert.ok(report.score >= 75);
  assert.equal(report.writeEligible, true);
  assert.equal(report.tests.every((item) => item.passed), true);
  assert.match(validSkill().skillMarkdown, /## Test evidence/);
  assert.match(validSkill().skillMarkdown, /Evidence excerpt: Paid endpoint returned HTTP 200/);
});

test("rejects project-specific paths and embedded secrets", () => {
  const skill = validSkill();
  skill.steps[0] = "Read /Users/alice/private-repo/.env with api_key=sk_1234567890123456.";
  rerender(skill);
  const report = validateSkill(skill);
  assert.equal(report.eligible, false);
  assert.equal(report.status, "rejected");
  assert.ok(report.findings.some((finding) => finding.includes("filesystem")));
  assert.ok(report.findings.some((finding) => finding.includes("credential")));
});

test("keeps skills private without three evidence-backed tests", () => {
  const skill = validSkill();
  skill.testCases = skill.testCases.slice(0, 1);
  rerender(skill);
  const report = validateSkill(skill);
  assert.equal(report.eligible, false);
  assert.equal(report.writeEligible, true);
  assert.ok(report.findings.includes("Public skill publish requires at least three passing tests with independent source evidence."));
});

test("rejects a private skill write when test evidence is not source verified", () => {
  const skill = validSkill();
  skill.testCases = skill.testCases.slice(0, 1).map((testCase) => ({
    ...testCase,
    evidenceVerified: false,
    sourceMessageIndex: undefined
  }));
  rerender(skill);
  const report = validateSkill(skill);
  assert.equal(report.writeEligible, false);
  assert.equal(report.eligible, false);
  assert.ok(report.tests[0]?.findings.some((finding) => finding.includes("source conversation")));
});

test("rejects assertion-only evidence even when it is source grounded", () => {
  const skill = validSkill();
  skill.testCases = skill.testCases.slice(0, 1).map((testCase) => ({
    ...testCase,
    evidenceType: "assertion" as const
  }));
  rerender(skill);
  const report = validateSkill(skill);
  assert.equal(report.writeEligible, false);
  assert.ok(report.tests[0]?.findings.some((finding) => finding.includes("plain assertion")));
});

test("rejects generic placeholder skills despite fabricated structure", () => {
  const skill = validSkill();
  skill.name = "test-skill";
  skill.description = "Lorem ipsum placeholder workflow that pretends to be a reusable Bankr agent operation.";
  rerender(skill);
  const report = validateSkill(skill);
  assert.equal(report.writeEligible, false);
  assert.equal(report.eligible, false);
  assert.ok(report.findings.some((finding) => finding.includes("generic")));
  assert.ok(report.findings.some((finding) => finding.includes("Placeholder")));
});

test("rejects legacy contract-only tests without throwing", () => {
  const skill = validSkill();
  skill.testCases = skill.testCases.map((testCase) => ({
    name: testCase.name,
    input: testCase.input,
    expectedOutcome: testCase.expectedOutcome,
    successCriteria: testCase.successCriteria
  })) as typeof skill.testCases;
  const report = validateSkill(skill);
  assert.equal(report.writeEligible, false);
  assert.equal(report.eligible, false);
  assert.ok(report.tests.every((testCase) => testCase.passed === false));
});

test("rejects an unsupported public ecosystem instead of silently remapping it", () => {
  const skill = validSkill();
  skill.ecosystem = "private-project" as typeof skill.ecosystem;
  rerender(skill);
  const report = validateSkill(skill);
  assert.equal(report.eligible, false);
  assert.ok(report.findings.some((finding) => finding.includes("approved Bankr-adjacent ecosystem")));
});
