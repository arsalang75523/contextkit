export const publicSkillEcosystems = [
  "software-development",
  "web-development",
  "mobile-development",
  "devops",
  "testing",
  "security",
  "data",
  "research",
  "design",
  "writing",
  "productivity",
  "automation",
  "ai",
  "mcp",
  "finance",
  "crypto",
  "x402",
  "bankr",
  "llm-gateway",
  "agent-infrastructure",
  "general"
] as const;

// Discovery categories are open-ended. The list above is guidance, not an allowlist.
export type PublicSkillEcosystem = string;

export type SkillTestCase = {
  name: string;
  input: string;
  expectedOutcome: string;
  successCriteria: string[];
  testMethod: string;
  observedOutcome: string;
  evidenceType: "command-output" | "test-log" | "http-response" | "artifact" | "assertion";
  evidenceExcerpt: string;
  passed: boolean;
  evidenceVerified: boolean;
  sourceMessageIndex?: number;
};

export type VerifiedSkillDraft = {
  name: string;
  description: string;
  license: string;
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
  writeEligible: boolean;
  status: "verified" | "needs-work" | "rejected";
  score: number;
  threshold: number;
  validationLevel: "evidence-backed-contract";
  requirements: {
    write: { requiredEvidenceTests: 1; passedEvidenceTests: number; met: boolean };
    publish: { requiredEvidenceTests: 3; passedEvidenceTests: number; independentEvidenceTests: number; met: boolean };
  };
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
    evidenceType: SkillTestCase["evidenceType"];
    evidenceExcerpt: string;
    sourceMessageIndex?: number;
    findings: string[];
  }>;
  findings: string[];
};

const secretPattern = /(?:\b(?:sk|bk|ck|re|ghp|github_pat)_[A-Za-z0-9_-]{10,}\b|\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|-----BEGIN [^-]*PRIVATE KEY-----|\b(?:password|secret|private[_-]?key|api[_-]?key|otp)\s*[:=])/i;
const privatePathPattern = /(?:\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Z]:\\Users\\[^\\\s]+)/i;
const privateIdentityPattern = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:acct|req|ctx|exp)_[a-f0-9]{16,}\b)/i;
const dangerousCommandPattern = /(?:rm\s+-rf\s+\/|git\s+reset\s+--hard|curl[^\n]+\|\s*(?:sh|bash)|disable[^\n]+security|seed\s+phrase|private\s+key)/i;
const genericSkillNamePattern = /^(?:untitled-agent-experience|reusable-agent-workflow|test-skill|sample-skill|demo-skill|hello|foo|bar|asdf|qwerty)$/i;
const placeholderTextPattern = /\b(?:lorem ipsum|todo|tbd|placeholder|dummy content|random text|asdfg+|qwerty+)\b/i;
const categoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const executableActionPattern = /\b(?:analyze|audit|build|call|capture|check|compare|compile|configure|convert|create|debug|deploy|design|detect|document|execute|extract|generate|implement|inspect|install|integrate|measure|migrate|monitor|optimize|parse|publish|query|render|repair|research|review|run|scan|test|transform|troubleshoot|validate|verify|write)\b/i;
const testMethodPattern = /\b(?:run|ran|call|called|execute|executed|compare|compared|inspect|inspected|validate|validated|verify|verified|build|built|deploy|deployed|request|requested|query|queried|measure|measured|render|rendered|test|tested|curl|npm)\b/i;
const observableResultPattern = /\b(?:pass(?:ed)?|fail(?:ed)?|success(?:ful(?:ly)?)?|completed?|returned?|responded?|status|exit code|created?|generated?|matched?|verified?|built|compiled|deployed|unchanged|http\s*\/?\d*(?:\.\d+)?\s*[1-5]\d\d|[1-5]\d\d)\b/i;
const speculativeResultPattern = /\b(?:should|would|will|expected to|planned to|not yet|pending)\b/i;

export function validateSkill(skillInput: VerifiedSkillDraft | Partial<VerifiedSkillDraft>, threshold = 75): SkillValidationReport {
  const skill = normalizeSkillForValidation(skillInput);
  const serialized = JSON.stringify(skill);
  const findings: string[] = [];
  const hasSecrets = secretPattern.test(serialized);
  const hasPrivatePaths = privatePathPattern.test(serialized);
  const hasPrivateIdentity = privateIdentityPattern.test(serialized);
  const hasDangerousCommand = dangerousCommandPattern.test(serialized);
  const category = String(skill.ecosystem ?? "").trim();
  const hasValidCategory = category.length >= 2 && category.length <= 64 && categoryPattern.test(category);
  const hasLicense = String(skill.license ?? "").trim().length >= 3;
  const operationalContent = [skill.name, skill.description, skill.trigger, ...skill.steps, ...skill.tags].join(" ");
  const actionableSteps = skill.steps.filter((step) => executableActionPattern.test(step)).length;
  const hasConcreteWorkflow = meaningfulWordCount(operationalContent) >= 18 && actionableSteps >= 2;
  const hasPlaceholders = placeholderTextPattern.test([
    skill.name,
    skill.description,
    skill.trigger,
    ...skill.steps,
    ...Object.values(skill.evidence)
  ].join(" "));
  const hasGenericName = genericSkillNamePattern.test(skill.name.trim());
  const evidenceNarrativeComplete = Object.values(skill.evidence).every((value) => meaningfulWordCount(value) >= 5);
  const reusableStructureComplete = Boolean(
    meaningfulWordCount(skill.description) >= 8 &&
    meaningfulWordCount(skill.trigger) >= 8 &&
    skill.prerequisites.length >= 1 &&
    skill.inputs.length >= 1 &&
    skill.outputs.length >= 1 &&
    skill.steps.length >= 3 &&
    skill.steps.every((step) => meaningfulWordCount(step) >= 5) &&
    new Set(skill.steps.map(normalizeComparable)).size === skill.steps.length &&
    skill.verification.length >= 1 &&
    skill.failureHandling.length >= 1 &&
    skill.doNotUseWhen.length >= 1 &&
    skill.rollback.length >= 1 &&
    skill.tags.length >= 2 &&
    skill.compatibility.length >= 1
  );

  if (hasSecrets) findings.push("Embedded credential or secret-like value detected.");
  if (hasPrivatePaths) findings.push("User-specific filesystem path detected; replace it with a parameter or placeholder.");
  if (hasPrivateIdentity) findings.push("Private identity or request/account identifier detected.");
  if (hasDangerousCommand) findings.push("Unsafe or destructive command pattern detected.");
  if (!hasValidCategory) findings.push("Skill category must be a concise lowercase slug such as web-development, research, design, automation, or crypto.");
  if (!hasLicense) findings.push("Public skill publish requires an explicit reuse license.");
  if (hasGenericName) findings.push("Skill name is generic or placeholder content.");
  if (hasPlaceholders) findings.push("Placeholder or junk content detected in the skill.");
  if (!hasConcreteWorkflow) findings.push("Skill must describe a concrete reusable workflow with explicit actions and observable outcomes.");
  if (!evidenceNarrativeComplete) findings.push("Request, method, outcome, and reusable lesson must each contain concrete evidence.");
  if (!reusableStructureComplete) {
    findings.push("Reusable skill structure is incomplete; require concrete prerequisites, inputs, outputs, three distinct steps, verification, failure handling, safety boundary, rollback, and tags.");
  }

  const sourceTests = Array.isArray(skill.testCases) ? skill.testCases : [];
  const tests = sourceTests.map((test) => {
    const testFindings: string[] = [];
    const name = String(test.name ?? "");
    const input = String(test.input ?? "");
    const expectedOutcome = String(test.expectedOutcome ?? "");
    const successCriteria = Array.isArray(test.successCriteria) ? test.successCriteria : [];
    const testMethod = String(test.testMethod ?? "");
    const observedOutcome = String(test.observedOutcome ?? "");
    const evidenceExcerpt = String(test.evidenceExcerpt ?? "");
    const evidenceType = test.evidenceType ?? "assertion";
    if (!name.trim()) testFindings.push("Missing test name.");
    if (input.trim().length < 12) testFindings.push("Test input is not concrete enough.");
    if (expectedOutcome.trim().length < 12) testFindings.push("Expected outcome is not concrete enough.");
    if (!successCriteria.length || successCriteria.some((criterion) => String(criterion).trim().length < 6)) {
      testFindings.push("Success criteria are missing or incomplete.");
    }
    if (testMethod.trim().length < 12) testFindings.push("Test method is not concrete enough.");
    if (observedOutcome.trim().length < 12) testFindings.push("Observed test outcome is not concrete enough.");
    if (evidenceExcerpt.trim().length < 12) testFindings.push("Test evidence excerpt is missing or too short.");
    if (evidenceType === "assertion") testFindings.push("A plain assertion is not accepted as executed test evidence.");
    if (!testMethodPattern.test(testMethod)) testFindings.push("Test method does not describe an executed validation action.");
    if (!observableResultPattern.test(`${observedOutcome} ${evidenceExcerpt}`)) {
      testFindings.push("Test evidence has no observable execution result.");
    }
    if (speculativeResultPattern.test(`${observedOutcome} ${evidenceExcerpt}`)) {
      testFindings.push("Test result is speculative or pending instead of observed.");
    }
    if (!test.evidenceVerified || test.sourceMessageIndex === undefined) {
      testFindings.push("Test evidence was not found verbatim in the source conversation.");
    }
    if (test.passed !== true) testFindings.push("Test did not pass.");
    if (secretPattern.test(JSON.stringify(test))) testFindings.push("Test contains secret-like data.");
    return {
      name: name || "unnamed",
      passed: testFindings.length === 0,
      evidenceType,
      evidenceExcerpt,
      sourceMessageIndex: test.sourceMessageIndex,
      findings: testFindings
    };
  });

  const passedEvidenceTests = tests.filter((test) => test.passed).length;
  const independentEvidenceTests = new Set(
    tests.filter((test) => test.passed).map((test) => normalizeComparable(test.evidenceExcerpt))
  ).size;
  if (passedEvidenceTests < 1) findings.push("Private skill write requires at least one passing evidence-backed test grounded in the source conversation.");
  if (passedEvidenceTests < 3 || independentEvidenceTests < 3) {
    findings.push("Public skill publish requires at least three passing tests with independent source evidence.");
  }
  if (tests.some((test) => !test.passed)) findings.push("Every test declared for public publishing must pass with source-grounded evidence.");

  const markdownChecks = [
    /^---\n[\s\S]*?\n---/m.test(skill.skillMarkdown),
    /#\s+(?:When to use|Use this skill when)/i.test(skill.skillMarkdown),
    /#\s+(?:Workflow|Procedure|Steps)/i.test(skill.skillMarkdown),
    /#\s+(?:Verification|Validate|Success)/i.test(skill.skillMarkdown),
    /#\s+(?:Safety|Do not use|Boundaries)/i.test(skill.skillMarkdown),
    /#\s+Source evidence/i.test(skill.skillMarkdown),
    /#\s+Test evidence/i.test(skill.skillMarkdown)
  ];
  if (markdownChecks.some((passed) => !passed)) findings.push("SKILL.md is missing required frontmatter or operational sections.");

  const portability = clampScore(
    (hasValidCategory ? 3 : 0) +
    (!hasPrivatePaths ? 7 : 0) +
    (!hasPrivateIdentity ? 6 : 0) +
    (skill.inputs.length > 0 ? 4 : 0) +
    (skill.compatibility.length > 0 ? 5 : 0),
    25
  );
  const reproducibility = clampScore(
    (skill.steps.length >= 3 ? 8 : skill.steps.length * 2) +
    (skill.prerequisites.length > 0 ? 4 : 0) +
    (skill.outputs.length > 0 ? 4 : 0) +
    (skill.verification.length >= 2 ? 5 : skill.verification.length * 2) +
    (passedEvidenceTests >= 3 && independentEvidenceTests >= 3 && tests.every((test) => test.passed) ? 4 : 0),
    25
  );
  const evidence = clampScore([
    skill.evidence.userRequest,
    skill.evidence.agentMethod,
    skill.evidence.outcome,
    skill.evidence.reusableLesson
  ].reduce((score, value) => score + (value.trim().length >= 12 ? 5 : 0), 0), 20);
  const ecosystemDemand = clampScore(
    (meaningfulWordCount(skill.description) >= 8 ? 3 : 0) +
    (meaningfulWordCount(skill.trigger) >= 8 ? 3 : 0) +
    (actionableSteps >= 3 ? 4 : actionableSteps) +
    (skill.tags.length >= 2 ? 2 : skill.tags.length) +
    (skill.verification.some((item) => observableResultPattern.test(item)) ? 3 : 0),
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
  if (score < threshold) findings.push(`Public skill quality score ${score} is below the required ${threshold}.`);
  const criticalFailure = hasSecrets || hasPrivatePaths || hasPrivateIdentity || hasDangerousCommand || !hasValidCategory || hasGenericName || hasPlaceholders || !hasConcreteWorkflow || !evidenceNarrativeComplete || !reusableStructureComplete || markdownChecks.some((passed) => !passed);
  const writeEligible = !criticalFailure && passedEvidenceTests >= 1;
  const publishTestsMet = passedEvidenceTests >= 3 && independentEvidenceTests >= 3 && tests.every((test) => test.passed);
  const eligible = writeEligible && publishTestsMet && hasLicense && score >= threshold;

  return {
    eligible,
    writeEligible,
    status: eligible ? "verified" : writeEligible ? "needs-work" : "rejected",
    score,
    threshold,
    validationLevel: "evidence-backed-contract",
    requirements: {
      write: { requiredEvidenceTests: 1, passedEvidenceTests, met: writeEligible },
      publish: {
        requiredEvidenceTests: 3,
        passedEvidenceTests,
        independentEvidenceTests,
        met: eligible
      }
    },
    breakdown: { portability, reproducibility, evidence, ecosystemDemand, safety, novelty },
    tests,
    findings: Array.from(new Set(findings))
  };
}

function normalizeSkillForValidation(skillInput: VerifiedSkillDraft | Partial<VerifiedSkillDraft>): VerifiedSkillDraft {
  const input = skillInput && typeof skillInput === "object" ? skillInput : {};
  const evidence: Partial<VerifiedSkillDraft["evidence"]> =
    input.evidence && typeof input.evidence === "object" ? input.evidence : {};
  const testCases = Array.isArray(input.testCases)
    ? input.testCases
        .filter((test): test is SkillTestCase => Boolean(test && typeof test === "object"))
        .map((test) => ({
          name: String(test.name ?? ""),
          input: String(test.input ?? ""),
          expectedOutcome: String(test.expectedOutcome ?? ""),
          successCriteria: textArray(test.successCriteria),
          testMethod: String(test.testMethod ?? ""),
          observedOutcome: String(test.observedOutcome ?? ""),
          evidenceType: validEvidenceType(test.evidenceType) ? test.evidenceType : "assertion",
          evidenceExcerpt: String(test.evidenceExcerpt ?? ""),
          passed: test.passed === true,
          evidenceVerified: test.evidenceVerified === true,
          sourceMessageIndex: Number.isInteger(test.sourceMessageIndex) ? test.sourceMessageIndex : undefined
        }))
    : [];

  return {
    name: String(input.name ?? ""),
    description: String(input.description ?? ""),
    license: String(input.license ?? ""),
    version: String(input.version ?? ""),
    ecosystem: String(input.ecosystem ?? ""),
    compatibility: textArray(input.compatibility),
    trigger: String(input.trigger ?? ""),
    prerequisites: textArray(input.prerequisites),
    inputs: textArray(input.inputs),
    outputs: textArray(input.outputs),
    steps: textArray(input.steps),
    verification: textArray(input.verification),
    failureHandling: textArray(input.failureHandling),
    doNotUseWhen: textArray(input.doNotUseWhen),
    rollback: textArray(input.rollback),
    tags: textArray(input.tags),
    testCases,
    evidence: {
      userRequest: String(evidence.userRequest ?? ""),
      agentMethod: String(evidence.agentMethod ?? ""),
      outcome: String(evidence.outcome ?? ""),
      reusableLesson: String(evidence.reusableLesson ?? "")
    },
    skillMarkdown: String(input.skillMarkdown ?? "")
  };
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function validEvidenceType(value: unknown): value is SkillTestCase["evidenceType"] {
  return value === "command-output" ||
    value === "test-log" ||
    value === "http-response" ||
    value === "artifact" ||
    value === "assertion";
}

export function renderSkillMarkdown(skill: Omit<VerifiedSkillDraft, "skillMarkdown">) {
  const list = (values: string[], empty = "None.") => values.length ? values.map((value) => `- ${value}`).join("\n") : `- ${empty}`;
  const tests = skill.testCases.map((test, index) => [
    `### ${index + 1}. ${test.name}`,
    `- Status: ${test.passed && test.evidenceVerified ? "PASS" : "UNVERIFIED"}`,
    `- Input: ${test.input}`,
    `- Expected: ${test.expectedOutcome}`,
    `- Method: ${test.testMethod}`,
    `- Observed: ${test.observedOutcome}`,
    `- Evidence type: ${test.evidenceType}`,
    `- Evidence excerpt: ${test.evidenceExcerpt}`,
    `- Source: ${test.sourceMessageIndex === undefined ? "unverified" : `conversation message ${test.sourceMessageIndex + 1}`}`,
    "- Success criteria:",
    ...test.successCriteria.map((criterion) => `  - ${criterion}`)
  ].join("\n")).join("\n\n");

  return `---
name: ${skill.name}
description: ${yamlScalar(skill.description)}
license: ${yamlScalar(skill.license)}
compatibility: ${yamlScalar(skill.compatibility.join(", "))}
metadata:
  contextkit-version: ${yamlScalar(skill.version)}
  contextkit-ecosystem: ${yamlScalar(skill.ecosystem)}
  contextkit-tags: ${yamlScalar(skill.tags.join(", "))}
  contextkit-test-policy: ${yamlScalar("Evidence-backed; source excerpts required")}
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

## Source evidence
- User request: ${skill.evidence.userRequest}
- Agent method: ${skill.evidence.agentMethod}
- Verified outcome: ${skill.evidence.outcome}
- Reusable lesson: ${skill.evidence.reusableLesson}

## Test evidence
${tests || "No tests defined."}
`;
}

function clampScore(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

function normalizeComparable(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function meaningfulWordCount(value: string) {
  return value.trim().split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;
}

function yamlScalar(value: string) {
  return JSON.stringify(value);
}
