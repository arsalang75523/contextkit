export const publicSkillEcosystems = [
  "bankr",
  "x402",
  "base",
  "mcp",
  "wallet",
  "defi",
  "automation",
  "llm-gateway",
  "agent-infrastructure"
] as const;

export type PublicSkillEcosystem = typeof publicSkillEcosystems[number];

export type SkillTestCase = {
  name: string;
  input: string;
  expectedOutcome: string;
  successCriteria: string[];
};

export type VerifiedSkillDraft = {
  name: string;
  description: string;
  version: string;
  ecosystem: PublicSkillEcosystem;
  compatibility: string[];
  trigger: string;
  prerequisites: string[];
  inputs: string[];
  outputs: string[];
  steps: string[];
  verification: string[];
  failureHandling: string[];
  doNotUseWhen: string[];
  rollback: string[];
  tags: string[];
  testCases: SkillTestCase[];
  evidence: {
    userRequest: string;
    agentMethod: string;
    outcome: string;
    reusableLesson: string;
  };
  skillMarkdown: string;
};

export type SkillValidationReport = {
  eligible: boolean;
  status: "verified" | "needs-work" | "rejected";
  score: number;
  threshold: number;
  validationLevel: "deterministic-contract";
  breakdown: {
    portability: number;
    reproducibility: number;
    evidence: number;
    ecosystemDemand: number;
    safety: number;
    novelty: number;
  };
  tests: Array<{
    name: string;
    passed: boolean;
    findings: string[];
  }>;
  findings: string[];
};

const secretPattern = /(?:\b(?:sk|bk|ck|re|ghp|github_pat)_[A-Za-z0-9_-]{10,}\b|\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|-----BEGIN [^-]*PRIVATE KEY-----|\b(?:password|secret|private[_-]?key|api[_-]?key|otp)\s*[:=])/i;
const privatePathPattern = /(?:\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Z]:\\Users\\[^\\\s]+)/i;
const privateIdentityPattern = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:acct|req|ctx|exp)_[a-f0-9]{16,}\b)/i;
const dangerousCommandPattern = /(?:rm\s+-rf\s+\/|git\s+reset\s+--hard|curl[^\n]+\|\s*(?:sh|bash)|disable[^\n]+security|seed\s+phrase|private\s+key)/i;

export function validateSkill(skill: VerifiedSkillDraft, threshold = 75): SkillValidationReport {
  const serialized = JSON.stringify(skill);
  const findings: string[] = [];
  const hasSecrets = secretPattern.test(serialized);
  const hasPrivatePaths = privatePathPattern.test(serialized);
  const hasPrivateIdentity = privateIdentityPattern.test(serialized);
  const hasDangerousCommand = dangerousCommandPattern.test(serialized);
  const ecosystemAllowed = publicSkillEcosystems.includes(skill.ecosystem);

  if (hasSecrets) findings.push("Embedded credential or secret-like value detected.");
  if (hasPrivatePaths) findings.push("User-specific filesystem path detected; replace it with a parameter or placeholder.");
  if (hasPrivateIdentity) findings.push("Private identity or request/account identifier detected.");
  if (hasDangerousCommand) findings.push("Unsafe or destructive command pattern detected.");
  if (!ecosystemAllowed) findings.push("Public skills must target an approved Bankr-adjacent ecosystem namespace.");

  const tests = skill.testCases.map((test) => {
    const testFindings: string[] = [];
    if (!test.name.trim()) testFindings.push("Missing test name.");
    if (test.input.trim().length < 12) testFindings.push("Test input is not concrete enough.");
    if (test.expectedOutcome.trim().length < 12) testFindings.push("Expected outcome is not concrete enough.");
    if (!test.successCriteria.length || test.successCriteria.some((criterion) => criterion.trim().length < 6)) {
      testFindings.push("Success criteria are missing or incomplete.");
    }
    if (secretPattern.test(JSON.stringify(test))) testFindings.push("Test contains secret-like data.");
    return { name: test.name || "unnamed", passed: testFindings.length === 0, findings: testFindings };
  });

  if (tests.length < 3) findings.push("At least three independent test scenarios are required.");
  if (tests.some((test) => !test.passed)) findings.push("One or more skill contract tests failed.");

  const markdownChecks = [
    /^---\n[\s\S]*?\n---/m.test(skill.skillMarkdown),
    /#\s+(?:When to use|Use this skill when)/i.test(skill.skillMarkdown),
    /#\s+(?:Workflow|Procedure|Steps)/i.test(skill.skillMarkdown),
    /#\s+(?:Verification|Validate|Success)/i.test(skill.skillMarkdown),
    /#\s+(?:Safety|Do not use|Boundaries)/i.test(skill.skillMarkdown)
  ];
  if (markdownChecks.some((passed) => !passed)) findings.push("SKILL.md is missing required frontmatter or operational sections.");

  const portability = clampScore(
    (ecosystemAllowed ? 8 : 0) +
    (!hasPrivatePaths ? 6 : 0) +
    (!hasPrivateIdentity ? 5 : 0) +
    (skill.inputs.length > 0 ? 3 : 0) +
    (skill.compatibility.length > 1 ? 3 : 0),
    25
  );
  const reproducibility = clampScore(
    (skill.steps.length >= 3 ? 8 : skill.steps.length * 2) +
    (skill.prerequisites.length > 0 ? 4 : 0) +
    (skill.outputs.length > 0 ? 4 : 0) +
    (skill.verification.length >= 2 ? 5 : skill.verification.length * 2) +
    (tests.length >= 3 && tests.every((test) => test.passed) ? 4 : 0),
    25
  );
  const evidence = clampScore([
    skill.evidence.userRequest,
    skill.evidence.agentMethod,
    skill.evidence.outcome,
    skill.evidence.reusableLesson
  ].reduce((score, value) => score + (value.trim().length >= 12 ? 5 : 0), 0), 20);
  const ecosystemDemand = clampScore(
    (ecosystemAllowed ? 6 : 0) +
    (skill.tags.length >= 2 ? 3 : skill.tags.length) +
    (skill.trigger.trim().length >= 16 ? 3 : 0) +
    (/(bankr|x402|base|mcp|wallet|defi|agent|llm)/i.test(serialized) ? 3 : 0),
    15
  );
  const safety = clampScore(
    (!hasSecrets ? 3 : 0) +
    (!hasDangerousCommand ? 3 : 0) +
    (skill.doNotUseWhen.length > 0 ? 2 : 0) +
    (skill.rollback.length > 0 || skill.failureHandling.length >= 2 ? 2 : 0),
    10
  );
  const novelty = clampScore(
    (skill.description.trim().length >= 24 ? 2 : 0) +
    (skill.evidence.reusableLesson.trim().length >= 24 ? 2 : 0) +
    (new Set(skill.steps.map(normalizeComparable)).size === skill.steps.length ? 1 : 0),
    5
  );
  const score = portability + reproducibility + evidence + ecosystemDemand + safety + novelty;
  const criticalFailure = hasSecrets || hasPrivatePaths || hasPrivateIdentity || hasDangerousCommand || !ecosystemAllowed || tests.length < 3 || tests.some((test) => !test.passed) || markdownChecks.some((passed) => !passed);
  const eligible = !criticalFailure && score >= threshold;

  return {
    eligible,
    status: eligible ? "verified" : criticalFailure ? "rejected" : "needs-work",
    score,
    threshold,
    validationLevel: "deterministic-contract",
    breakdown: { portability, reproducibility, evidence, ecosystemDemand, safety, novelty },
    tests,
    findings: Array.from(new Set(findings))
  };
}

export function renderSkillMarkdown(skill: Omit<VerifiedSkillDraft, "skillMarkdown">) {
  const list = (values: string[], empty = "None.") => values.length ? values.map((value) => `- ${value}`).join("\n") : `- ${empty}`;
  const tests = skill.testCases.map((test, index) => [
    `### ${index + 1}. ${test.name}`,
    `- Input: ${test.input}`,
    `- Expected: ${test.expectedOutcome}`,
    "- Success criteria:",
    ...test.successCriteria.map((criterion) => `  - ${criterion}`)
  ].join("\n")).join("\n\n");

  return `---
name: ${skill.name}
description: ${skill.description}
tags: [${skill.tags.join(", ")}]
version: ${skill.version}
visibility: private
metadata:
  contextkit:
    ecosystem: ${skill.ecosystem}
    compatibility: [${skill.compatibility.join(", ")}]
---
# ${skill.name}

## When to use
${skill.trigger}

## Prerequisites
${list(skill.prerequisites)}

## Inputs
${list(skill.inputs)}

## Workflow
${skill.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Outputs
${list(skill.outputs)}

## Verification
${list(skill.verification)}

## Failure handling
${list(skill.failureHandling)}

## Safety and boundaries
Do not use this skill when:
${list(skill.doNotUseWhen)}

Rollback:
${list(skill.rollback)}

## Contract tests
${tests || "No tests defined."}
`;
}

function clampScore(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
