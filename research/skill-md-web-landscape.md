# SKILL.md Ecosystem Landscape

Research date: 2026-07-18

## Executive summary

`SKILL.md` is an open, progressively disclosed instruction-package format for AI agents. The portable core is intentionally small: a directory containing a YAML-frontmatter `SKILL.md`, with required `name` and `description` fields and optional scripts, references, and assets. The specification does not define a mandatory body schema, trust model, marketplace contract, version lifecycle, test format, or runtime guarantee.

For ContextKit, a sellable skill must therefore be more than a valid Markdown file. It should be a versioned, content-addressed, provenance-bearing package whose activation quality, output behavior, permissions, dependencies, and safety properties have been tested. ContextKit should preserve the portable Agent Skills core while adding marketplace metadata in a separate signed manifest rather than inventing incompatible frontmatter.

The main conclusions are:

1. **Description quality is routing quality.** `name` and `description` are loaded before the body, so false activation and missed activation are primarily catalog/evaluation problems.
2. **Progressive disclosure is the central architecture.** Keep universal instructions in `SKILL.md`; move conditional detail to focused references and deterministic repeated work to scripts.
3. **A structurally valid skill is not a verified skill.** ContextKit needs distinct validation levels for schema, static safety, sandbox execution, task evaluation, and integration verification.
4. **Reusable skills encode procedures, not one-off answers.** Project-specific values must become parameters, prerequisites, or examples rather than hidden assumptions.
5. **Skill distribution is a software supply chain.** Publishing requires immutable versions, hashes, provenance, permissions, dependency declarations, licensing, and security scanning.

## Methodology and limits

This is bounded, source-grounded research, not a claim that every `SKILL.md` on the public web was crawled.

- Primary sources were prioritized: the Agent Skills specification and authoring/client guides, vendor documentation, official repositories, and primary research papers.
- Fifteen reliable sources were reviewed, with web claims linked in the source table below.
- The installed Codex corpus under `/Users/chef/.codex` was scanned recursively on 2026-07-18.
- Exact-file duplicates were removed by SHA-256 content hash before feature counting.
- Body features were detected by Markdown-heading and content patterns. These are reproducible structural observations, not semantic quality scores.
- Optional-directory counts use one representative installation path per unique content hash. They describe this installed corpus, not the whole web.
- Approximate word counts are not model-token counts.

## Official portable format

The [Agent Skills specification](https://agentskills.io/specification) defines this minimum structure:

```text
skill-name/
|-- SKILL.md          # required
|-- scripts/          # optional executable code
|-- references/       # optional on-demand documentation
|-- assets/           # optional templates and static resources
`-- ...               # implementation-specific additions allowed
```

### Required frontmatter

| Field | Requirement | Purpose |
| --- | --- | --- |
| `name` | Required; 1-64 characters; lowercase letters, digits, hyphens; no leading, trailing, or consecutive hyphens; must match parent directory | Stable skill identity |
| `description` | Required; 1-1024 characters; non-empty; states what the skill does and when to use it | Catalog disclosure and activation routing |

### Optional frontmatter

| Field | Constraint | Purpose |
| --- | --- | --- |
| `license` | Short license name or bundled-license reference | Reuse terms |
| `compatibility` | 1-500 characters when present | Runtime, product, package, network, or environment requirements |
| `metadata` | String-to-string mapping | Implementation-specific metadata; keys should avoid collisions |
| `allowed-tools` | Space-separated tool list; experimental and not universally supported | Pre-approved tool scope |

The Markdown body has no mandatory section layout. The specification recommends step-by-step instructions, input/output examples, and common edge cases. This flexibility is useful for portability, but it means marketplace quality cannot be inferred from frontmatter validity alone.

### Progressive disclosure contract

The official model is three-tiered:

| Tier | Loaded content | Typical timing | Design implication |
| --- | --- | --- | --- |
| Catalog | `name` + `description` | Session startup | Make activation boundaries precise and compact |
| Instructions | Full `SKILL.md` body | Skill activation | Keep the body focused; under 5,000 tokens and 500 lines is recommended |
| Resources | Scripts, references, assets | Only when needed | State exactly when each resource should be loaded or run |

References should use paths relative to the skill root and should avoid deep reference chains. The official guide recommends keeping references one level deep.

## Observed installed corpus

### Corpus size

| Metric | Result |
| --- | ---: |
| Discovered `SKILL.md` files | 703 |
| Unique contents by SHA-256 | 691 |
| Exact duplicates | 12 |
| Median body length | 111 lines / 735 words |
| 90th percentile body length | 393 lines / 2,516 words |
| Maximum body length | 3,449 lines / 15,501 words |
| Bodies over 500 lines | 46 (6.7%) |
| Bodies over 5,000 words | 10 (1.4%) |

### Frontmatter and package features

Percentages use the 691 unique-content records.

| Feature | Count | Share |
| --- | ---: | ---: |
| YAML frontmatter | 691 | 100.0% |
| `name` | 691 | 100.0% |
| `description` | 691 | 100.0% |
| `metadata` | 134 | 19.4% |
| `compatibility` | 50 | 7.2% |
| `license` | 48 | 6.9% |
| Top-level `version` | 19 | 2.7% |
| `allowed-tools` | 7 | 1.0% |
| `scripts/` sibling directory | 129 | 18.7% |
| `references/` sibling directory | 247 | 35.7% |
| `assets/` sibling directory | 136 | 19.7% |
| `agents/` sibling directory | 646 | 93.5% |

The low use of `license`, compatibility, version, and explicit tool permissions is acceptable for private bundled skills but inadequate for a paid public marketplace. Marketplace publication should make these concerns explicit even when the portable core leaves them optional.

### Body conventions

| Detected convention | Count | Share |
| --- | ---: | ---: |
| Code fence | 442 | 64.0% |
| Workflow/steps/process heading | 362 | 52.4% |
| External link | 311 | 45.0% |
| References heading | 295 | 42.7% |
| Output heading | 225 | 32.6% |
| Prerequisites/setup heading | 166 | 24.0% |
| Safety/security/boundary heading | 155 | 22.4% |
| Failure/recovery/troubleshooting heading | 133 | 19.2% |
| Verification/test/quality heading | 122 | 17.7% |
| Example heading | 103 | 14.9% |
| Input heading | 91 | 13.2% |

These frequencies show that workflow instructions are common, but explicit validation, failure handling, inputs, and safety boundaries are not universal. ContextKit should score those properties independently instead of assuming a verbose skill is complete.

## What makes a skill effective

The official [best-practices guide](https://agentskills.io/skill-creation/best-practices) emphasizes real expertise, moderate detail, coherent scope, procedures over one-off declarations, clear defaults, gotchas, output templates, checklists, and validation loops. The following design rules translate that guidance into marketplace criteria.

### 1. Precise activation boundary

The `description` should encode:

- capability: what transformation or workflow the skill performs;
- positive triggers: tasks, artifacts, tools, or user language that should activate it;
- negative boundary where ambiguity is likely: what adjacent tasks it does not cover;
- concrete keywords without becoming a keyword dump.

The [description optimization guide](https://agentskills.io/skill-creation/optimizing-descriptions) recommends testing realistic explicit and implicit paraphrases. A good marketplace eval suite therefore needs both positive and negative activation prompts.

### 2. Reusable operational procedure

A skill should teach a repeatable method, not preserve the answer to one historical task. Replace personal paths, repository names, user IDs, credentials, fixed incident IDs, and local-only assumptions with:

- declared inputs;
- discovery steps;
- parameters and defaults;
- compatibility requirements;
- examples clearly labeled as examples;
- explicit stop/escalation conditions.

### 3. Calibrated control

Use strict steps for fragile operations and outcome-oriented guidance where multiple approaches are valid. Explain important reasons, but do not turn the body into generic documentation the model already knows. Prefer one safe default plus a short fallback over a menu of equivalent choices.

### 4. Deterministic helpers

Repeated parsing, validation, transformation, or rendering belongs in tested scripts. The [official scripts guide](https://agentskills.io/skill-creation/using-scripts) recommends:

- pinned dependencies and documented prerequisites;
- non-interactive CLI interfaces;
- useful `--help` output;
- structured stdout and diagnostics on stderr;
- actionable errors and meaningful exit codes;
- idempotency, dry-run support, safe defaults, and bounded output;
- relative paths from the skill root.

### 5. Verification loop

The [official evaluation guide](https://agentskills.io/skill-creation/evaluating-skills) recommends realistic prompts, expected outputs, optional input files, objective assertions, clean-context runs, and comparisons against no-skill or previous-skill baselines. Runtime success must include evidence, not an LLM assertion that the skill probably works.

## Cross-client behavior

The file format is portable, while discovery locations and activation behavior are client-specific.

| Concern | Verified behavior |
| --- | --- |
| Cross-client location | The official client guide recommends scanning project and user `.agents/skills/` alongside client-native paths. The format itself does not mandate an install path. |
| Project precedence | The official client guide describes project-level skills overriding user-level skills as the common deterministic collision rule. |
| Trust | Project skills may come from untrusted repositories; clients should gate loading on workspace trust. |
| Activation | Model-driven loading and explicit user invocation are both supported patterns. |
| GitHub Copilot | [GitHub documentation](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) documents skills across Copilot coding surfaces; its [authoring guide](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills) documents repository and personal locations. |
| Multi-client packaging | The [Vercel skills tool](https://github.com/vercel-labs/skills) installs compatible skills for multiple agent products. |
| Microsoft examples | [MicrosoftDocs/Agent-Skills](https://github.com/MicrosoftDocs/Agent-Skills) provides curated skills and installation-path guidance for several clients. |
| Reference examples | [Anthropic's public skills repository](https://github.com/anthropics/skills) provides real skill packages, scripts, references, and assets. |

ContextKit should publish one portable artifact and generate installation adapters or instructions per client. Client-specific behavior must not be silently embedded into the portable core unless declared in `compatibility`.

## ContextKit marketplace architecture

### Artifact model

Keep the official `SKILL.md` frontmatter portable. Store rich marketplace state in a separate signed `contextkit.skill.json` manifest.

```text
skill-name/
|-- SKILL.md
|-- contextkit.skill.json
|-- LICENSE              # required for public paid listings
|-- scripts/             # optional
|-- references/          # optional
|-- assets/              # optional
`-- evals/
    |-- evals.json
    `-- files/           # optional fixtures
```

Suggested manifest shape:

```json
{
  "schemaVersion": "1",
  "skill": {
    "name": "bankr-x402-timeout-recovery",
    "version": "1.2.0",
    "contentSha256": "...",
    "license": "Apache-2.0",
    "compatibility": ["codex", "claude-code", "copilot"],
    "ecosystems": ["bankr", "x402"],
    "entrypoint": "SKILL.md"
  },
  "provenance": {
    "publisherAccountId": "acct_...",
    "sourceRepository": "https://github.com/org/repo",
    "sourceCommit": "...",
    "builtAt": "2026-07-18T00:00:00Z"
  },
  "runtime": {
    "network": "optional",
    "filesystem": "workspace-write",
    "tools": ["git", "curl"],
    "secrets": []
  },
  "validation": {
    "level": "sandbox-passed",
    "validatorVersion": "1.0.0",
    "evalPassRate": 0.92,
    "positiveActivationRate": 0.95,
    "negativeRejectionRate": 0.90,
    "evidenceArtifact": "validation.json"
  },
  "signature": {
    "algorithm": "ed25519",
    "keyId": "publisher-key-id",
    "value": "..."
  }
}
```

Rich arrays and nested objects belong in the manifest because the official `metadata` field is a string-to-string map. If selected marketplace identifiers are mirrored into frontmatter, use collision-resistant flat keys and string values; the manifest remains authoritative.

### Validation levels

Do not use one vague `validated: true` flag.

| Level | Meaning | What it does not prove |
| --- | --- | --- |
| `declared` | Publisher supplied a package | Format, safety, or behavior |
| `schema-valid` | Frontmatter, paths, names, manifest, and hashes pass deterministic checks | Runtime behavior |
| `static-reviewed` | Secret, dependency, permission, command, link, and instruction scans pass policy | Scripts execute successfully |
| `sandbox-passed` | Bundled commands and mechanical contract tests run in a restricted environment | Broad task quality |
| `eval-passed` | Activation and task-output eval thresholds beat a baseline | Every client/environment works |
| `integration-verified` | Named client/runtime combinations pass end-to-end tests | Future compatibility |

The current phrase `deterministic-contract` should mean structure only. It must never be presented as proof that a skill's real workflow executed successfully.

### Publish gate

Require all of the following for a public paid listing:

1. Valid official frontmatter and matching directory name.
2. Non-empty operational body with explicit workflow and completion criteria.
3. Declared inputs, outputs, prerequisites, compatibility, and failure behavior.
4. License and publisher provenance.
5. Immutable version, package hash, and signed manifest.
6. No secrets, OTPs, tokens, private emails, personal paths, or private infrastructure identifiers.
7. No hidden download-and-execute flow; all network hosts and dependencies declared.
8. Static scan of scripts and instructions for prompt injection, credential access, data exfiltration, destructive commands, obfuscated payloads, and unsafe install hooks.
9. At least two positive activation evals, two negative activation evals, one normal task eval, and one edge/failure eval.
10. Objective evidence for every claimed test result.
11. Generalization review: no one-repository answer disguised as a reusable skill.
12. Human approval for high-risk permissions, finance, production deployment, credential handling, or irreversible actions.

### Activation-quality metrics

For prompt set `P`:

- `positive_activation_rate = correctly_activated_positive_prompts / positive_prompts`
- `negative_rejection_rate = correctly_ignored_negative_prompts / negative_prompts`
- `task_success_delta = success_with_skill - success_without_skill`
- `token_cost_delta = tokens_with_skill - tokens_without_skill`
- `retry_rate = runs_requiring_unplanned_retry / runs`
- `unsafe_action_rate = policy_violations / runs`

Marketplace ranking should favor task-success delta and safety, not length, downloads, or raw activation rate. A skill that activates constantly is not necessarily useful.

## Security and supply-chain controls

Skills are executable instruction packages. The [client implementation guide](https://agentskills.io/client-implementation/adding-skills-support) explicitly warns that repository skills may be untrusted. Recent primary research on [semantic supply-chain attacks](https://arxiv.org/abs/2605.11418) further supports treating registries as security boundaries.

ContextKit should implement:

- package allowlists and denylist policies for files and executable types;
- archive extraction limits, path-traversal defense, symlink rejection, and size/depth limits;
- secret and PII scanning before upload and after unpacking;
- dependency pinning and lockfile inspection;
- domain allowlists and explicit network capability declarations;
- read-only filesystem by default, scoped writable outputs, no home-directory access;
- no inherited environment secrets unless explicitly bound by the user;
- dry-run and approval gates for destructive or financial operations;
- isolated sandbox execution with CPU, memory, time, process, and output limits;
- immutable packages; new content requires a new version and hash;
- signed publisher identity, revocation, reporting, quarantine, and kill switch;
- transparency log of publish, validation, purchase, update, and revocation events;
- post-purchase re-verification of hash before installation.

## High-value body convention

The official spec does not require these headings. ContextKit should recommend them as a marketplace convention and score only sections relevant to the skill.

```markdown
---
name: bankr-x402-timeout-recovery
description: Diagnose and repair Bankr x402 endpoint timeouts while preserving the existing response contract. Use when origin requests succeed but Bankr calls return 500/504, or when long-context forwarding exceeds gateway limits. Do not use for wallet payment authorization failures.
license: Apache-2.0
compatibility: Requires curl, access to deployment logs, and a trusted workspace.
---

# Bankr x402 timeout recovery

## Use when
## Do not use when
## Prerequisites
## Inputs
## Workflow
## Verification
## Outputs
## Failure handling
## Safety and approvals
## Gotchas
## Resources
```

Recommended content rules:

- `Use when` and `Do not use when` prevent trigger drift.
- `Inputs` names required artifacts and how to discover them.
- `Workflow` is ordered, bounded, and has stop conditions.
- `Verification` distinguishes origin, gateway, payment, and response-contract checks.
- `Outputs` defines files, JSON shape, or user-facing result.
- `Failure handling` maps common errors to next diagnostic steps.
- `Safety and approvals` states permissions and irreversible boundaries.
- `Gotchas` preserves non-obvious corrections learned from real execution.
- `Resources` says exactly when to load each reference or run each script.

## Anti-patterns and rejection reasons

Reject or return for revision when a package contains:

- **Topic-only content:** describes a domain but provides no executable method.
- **Transcript dump:** stores a conversation instead of extracting a reusable procedure.
- **One-project answer:** hard-coded repository, user, file path, credential, or incident state.
- **Description mismatch:** advertised capability is absent from the body.
- **Trigger monopoly:** description is so broad that it captures unrelated tasks.
- **Silent capability:** body performs network, shell, financial, credential, or destructive actions not declared up front.
- **Generic filler:** advice such as "follow best practices" without concrete decisions or gotchas.
- **Deep disclosure chain:** references point to more references with no clear load condition.
- **Interactive automation:** scripts wait for prompts or passwords and can hang an agent.
- **Unbounded output:** scripts can flood context without pagination or output-file support.
- **Fake validation:** `passed` is asserted without command output, artifact evidence, or reproducible assertions.
- **Mutable release:** publisher can replace paid content without a new version/hash.
- **License ambiguity:** public paid package has no explicit reuse terms.

The empirical study [From Anatomy to Smells](https://arxiv.org/abs/2607.01456) reports that poor authoring patterns are widespread, while [From Registry to Repository](https://arxiv.org/abs/2607.00911) shows that skills are copied and adapted at substantial scale. These findings make automated quality and provenance controls marketplace fundamentals, not optional polish.

## Recommended ContextKit rollout

### Phase 1: Portable compiler

- Compile a real solved interaction into a parameterized `SKILL.md` draft.
- Require the agent to identify reusable procedure, inputs, outputs, constraints, gotchas, and verification evidence.
- Reject empty, personal, purely descriptive, or unsupported skills before saving.
- Validate against the official format with the reference validator (`skills-ref validate`).

### Phase 2: Evidence-backed validation

- Generate positive and negative trigger prompts.
- Generate task, edge, and failure evals with objective assertions.
- Run with-skill and baseline sessions in clean sandboxes.
- Store transcripts, output artifacts, timing, token use, and assertion evidence.
- Display the exact validation level in API and UI responses.

### Phase 3: Signed marketplace

- Create immutable package versions and SHA-256 hashes.
- Sign the manifest and bind it to publisher identity.
- Sell access to exact versions, not mutable listing IDs alone.
- Verify package hash at purchase and installation.
- Support revocation without deleting the audit trail.

### Phase 4: Cross-client installation

- Keep the package portable.
- Generate client-specific install paths and compatibility warnings.
- Prefer `.agents/skills/` for cross-client discovery where supported.
- Run integration verification separately for every advertised client/runtime pair.

## Source index

### Standards and official guidance

1. [Agent Skills specification](https://agentskills.io/specification)
2. [How to add skills support to an agent](https://agentskills.io/client-implementation/adding-skills-support)
3. [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices)
4. [Optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
5. [Evaluating skill output quality](https://agentskills.io/skill-creation/evaluating-skills)
6. [Using scripts in skills](https://agentskills.io/skill-creation/using-scripts)

### Vendor implementations and examples

7. [Anthropic public skills repository](https://github.com/anthropics/skills)
8. [GitHub: About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
9. [GitHub: Adding agent skills for Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
10. [Vercel Labs skills tool](https://github.com/vercel-labs/skills)
11. [MicrosoftDocs Agent-Skills](https://github.com/MicrosoftDocs/Agent-Skills)

### Primary research

12. [From Anatomy to Smells: An Empirical Study of SKILL.md in Agent Skills](https://arxiv.org/abs/2607.01456)
13. [From Registry to Repository: How AI Agent Skills Are Written, Adapted, and Maintained](https://arxiv.org/abs/2607.00911)
14. [What Keeps Agent Skills from Being Reusable? Evidence from 138K SKILL.md Files](https://openreview.net/pdf?id=n0AIlfxDU0)
15. [Under the Hood of SKILL.md: Semantic Supply-chain Attacks on AI Agent Skill Registry](https://arxiv.org/abs/2605.11418)

## Bottom line for ContextKit

The marketplace unit should be a **tested skill package**, not a saved experience paragraph. The experience is raw evidence; the compiler extracts a reusable procedure; the validator proves structure and behavior; the marketplace distributes an immutable signed artifact. This preserves Agent Skills portability while giving buyers the trust, reproducibility, and operational value required for paid reuse.
