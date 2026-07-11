import { AppKV } from "@/storage/app-kv";
import { createHash, timingSafeEqual } from "node:crypto";
import { BankrLlmClient } from "@/lib/bankr-llm";
import type { AppBindings } from "@/types/bindings";
import type {
  ConversationMessage,
  ExperienceBuyInput,
  ExperienceConsiderInput,
  ExperiencePublishInput,
  ExperienceSaveInput,
  ExperienceSearchInput,
  VerifiedSkillInput
} from "@/types/api";
import { createId } from "@/utils/id";
import { estimateTokens } from "@/utils/tokens";
import {
  renderSkillMarkdown,
  validateSkill,
  type PublicSkillEcosystem,
  type SkillValidationReport,
  type VerifiedSkillDraft
} from "@/services/skill-validation";

export type ExperienceRecord = {
  id: string;
  ownerId: string;
  title: string;
  summary: string;
  content: string;
  task?: string;
  outcome?: string;
  lesson?: string;
  constraints: string[];
  decisions: string[];
  tags: string[];
  confidence: number;
  source: string;
  visibility: "private" | "public";
  priceUsd: number;
  sales: number;
  earnedUsd: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
  kind: "legacy-experience" | "verified-skill";
  skill?: VerifiedSkillDraft;
  validation?: SkillValidationReport;
  publishSecretHash?: string;
};

export type ExperienceInputContext = {
  ownerId: string;
  messages?: ConversationMessage[];
  contextMetadata?: Record<string, unknown>;
};

export class ExperienceService {
  private readonly kv: AppKV;

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async save(input: ExperienceSaveInput, context: ExperienceInputContext) {
    const now = new Date().toISOString();
    const normalized = normalizeExperience(input, context.messages);
    assertMeaningfulExperience(normalized);
    const validation = normalized.skill ? validateSkill(normalized.skill) : undefined;
    const publishToken = context.ownerId === "bankr-hosted" ? createId("pub") : undefined;
    const record: ExperienceRecord = {
      id: createId("exp"),
      ownerId: context.ownerId,
      ...normalized,
      visibility: "private",
      priceUsd: 0,
      sales: 0,
      earnedUsd: 0,
      createdAt: now,
      updatedAt: now,
      kind: normalized.skill ? "verified-skill" : "legacy-experience",
      validation,
      publishSecretHash: publishToken ? hashPublishToken(publishToken) : undefined,
      metadata: {
        ...(context.contextMetadata ?? {}),
        ...(input.metadata ?? {}),
        ...(input.experience?.metadata ?? {})
      }
    };

    await this.writeRecord(record);
    return {
      experience: publicExperience(record, { includeContent: true }),
      publishToken,
      metrics: experienceMetrics(input, record)
    };
  }

  async publish(input: ExperiencePublishInput, context: ExperienceInputContext) {
    const now = new Date().toISOString();
    const existingId = input.experienceId ?? input.skillId;
    const existing = existingId ? await this.requireOwned(existingId, context.ownerId, input.publishToken) : null;
    const normalized = existing && existingId && !hasNewExperienceContent(input)
      ? experienceFields(existing)
      : normalizeExperience(input, context.messages);
    assertMeaningfulExperience(normalized);
    const skill = normalized.skill ?? existing?.skill;
    if (!skill) throw new Error("skill_required_for_publish");
    const validation = validateSkill(skill);
    if (!validation.eligible) {
      const details = validation.findings.join(" ") || `Skill quality score ${validation.score} is below ${validation.threshold}.`;
      throw new Error(`skill_not_publishable:${details}`);
    }

    const record: ExperienceRecord = {
      ...(existing ?? {
        id: createId("exp"),
        ownerId: context.ownerId,
        sales: 0,
        earnedUsd: 0,
        createdAt: now
      }),
      ...normalized,
      skill,
      kind: "verified-skill",
      validation,
      ownerId: existing?.ownerId ?? context.ownerId,
      visibility: "public",
      priceUsd: input.priceUsd,
      updatedAt: now,
      publishedAt: existing?.publishedAt ?? now,
      metadata: {
        ...(existing?.metadata ?? {}),
        ...(context.contextMetadata ?? {}),
        ...(input.metadata ?? {}),
        ...(input.experience?.metadata ?? {})
      }
    };

    await this.writeRecord(record);
    await this.kv.set(publicIndexKey(record.id), { id: record.id });

    return {
      experience: publicExperience(record, { includeContent: true }),
      marketplace: {
        listed: true,
        priceUsd: record.priceUsd,
        access: "bankr-x402"
      },
      metrics: experienceMetrics(input, record)
    };
  }

  async search(input: ExperienceSearchInput, ownerId?: string) {
    const publicRecords = await this.recordsFromIndex("experience-public:");
    const privateRecords = input.includePrivate && ownerId ? await this.recordsFromIndex(`experience-owner:${ownerId}:`) : [];
    const records = dedupeRecords([...publicRecords, ...privateRecords]);
    const query = normalizeQuery(input.query);
    const tags = (input.tags ?? []).map(normalizeTag).filter(Boolean);
    const ecosystems = new Set(input.ecosystems ?? []);
    const compatibility = new Set((input.compatibility ?? []).map(normalizeTag));

    const results = records
      .filter((record) => record.visibility === "public" || record.ownerId === ownerId)
      .filter((record) => !input.verifiedOnly || record.validation?.eligible === true)
      .filter((record) => !ecosystems.size || Boolean(record.skill && ecosystems.has(record.skill.ecosystem)))
      .filter((record) => !compatibility.size || Boolean(record.skill?.compatibility.some((host) => compatibility.has(normalizeTag(host)))))
      .map((record) => ({ record, score: scoreRecord(record, query, tags) }))
      .filter((item) => !query && tags.length === 0 ? true : item.score > 0)
      .sort((a, b) => b.score - a.score || b.record.updatedAt.localeCompare(a.record.updatedAt))
      .slice(0, input.limit)
      .map((item) => ({
        ...publicExperience(item.record, { includeContent: false }),
        score: item.score
      }));

    return {
      results,
      count: results.length,
      query: input.query ?? null
    };
  }

  async consider(input: ExperienceConsiderInput, context: ExperienceInputContext) {
    const messages = context.messages ?? [];
    const candidate = await this.generateCandidate(messages, input.minConfidence);
    const shouldSave = Boolean(candidate.shouldSave) && candidate.confidence >= input.minConfidence;

    if (!shouldSave) {
      return {
        shouldSave: false,
        reason: candidate.reason || "No completed reusable agent experience detected.",
        confidence: candidate.confidence,
        requiredEvidence: candidate.requiredEvidence,
        nextAgentAction: "Do not save. Continue working until there is a completed outcome and reusable method."
      };
    }

    const saveInput: ExperienceSaveInput = {
      experience: {
        title: candidate.experience.title,
        summary: candidate.experience.summary,
        content: candidate.experience.content,
        task: candidate.experience.task,
        outcome: candidate.experience.outcome,
        lesson: candidate.experience.lesson,
        constraints: candidate.experience.constraints,
        decisions: candidate.experience.decisions,
        tags: candidate.experience.tags,
        confidence: candidate.confidence,
        source: "mcp-v2-auto-detect",
        skill: candidate.skill,
        metadata: {
          suggestedPriceUsd: input.priceUsd,
          detectionReason: candidate.reason,
          publishRequiresUserApproval: true
        }
      },
      metadata: input.metadata
    };
    const saved = input.autoSave ? await this.save(saveInput, context) : null;

    return {
      shouldSave: true,
      confidence: candidate.confidence,
      reason: candidate.reason,
      requiredEvidence: candidate.requiredEvidence,
      experience: saved?.experience ?? saveInput.experience,
      publishToken: saved?.publishToken,
      validation: saved?.experience?.validation ?? candidate.validation,
      publishRecommendation: {
        shouldAskUser: candidate.validation.eligible,
        priceUsd: input.priceUsd,
        message: candidate.validation.eligible
          ? "I converted this completed work into a tested, portable SKILL.md. Do you want me to publish the verified skill so other agents can buy and install it?"
          : "I saved a private skill draft, but it is not publishable yet. Review the validation findings before requesting public approval."
      },
      nextAgentAction: candidate.validation.eligible
        ? saved
          ? `Ask the user for approval to publish verified skill ${saved.experience.id}. If approved, call contextkit_skill_publish with that skillId.`
          : "Ask the user whether to save and publish this verified skill draft."
        : "Keep the draft private and use the validation findings to improve portability, tests, evidence, or safety before requesting publication."
    };
  }

  async buy(input: ExperienceBuyInput, buyerId: string, amountUsd = 0.05) {
    const id = input.experienceId ?? input.skillId ?? input.listingId ?? "";
    const record = await this.kv.get<ExperienceRecord>(recordKey(id));
    if (!record || record.visibility !== "public" || !record.skill || !record.validation?.eligible) {
      throw new Error("experience_not_found");
    }
    const skill = record.skill;
    const validation = record.validation;

    const now = new Date().toISOString();
    const updated: ExperienceRecord = {
      ...record,
      sales: record.sales + 1,
      earnedUsd: Number((record.earnedUsd + amountUsd).toFixed(6)),
      updatedAt: now
    };
    const purchaseId = createId("buy");

    await Promise.all([
      this.writeRecord(updated),
      this.kv.set(`experience-purchase:${buyerId}:${purchaseId}`, {
        id: purchaseId,
        buyerId,
        experienceId: record.id,
        sellerId: record.ownerId,
        amountUsd,
        createdAt: now
      })
    ]);

    return {
      purchase: {
        id: purchaseId,
        experienceId: record.id,
        amountUsd,
        createdAt: now
      },
      experience: publicExperience(updated, { includeContent: true }),
      skill: publicSkill(skill, true),
      installBundle: {
        format: "contextkit-verified-skill/v1",
        fileName: "SKILL.md",
        skillMarkdown: skill.skillMarkdown,
        manifest: {
          id: updated.id,
          name: skill.name,
          version: skill.version,
          ecosystem: skill.ecosystem,
          compatibility: skill.compatibility,
          validation
        }
      },
      license: {
        use: "agent-skill-installation",
        resale: false,
        attribution: "ContextKit Verified Skill Registry"
      }
    };
  }

  private async generateCandidate(messages: ConversationMessage[], minConfidence: number) {
    const llm = new BankrLlmClient({ env: this.env });
    const output = await llm.generateJsonFromPrompt("summarize", [
      {
        role: "system",
        content: [
          "You are ContextKit MCP V2 experience detector.",
          "Return only JSON.",
          "Detect only REAL reusable agent experiences created during this conversation.",
          "A real experience requires all evidence: initial user request, agent actions/method, completed or meaningfully advanced outcome, reusable lesson, and no unresolved core blocker.",
          "Convert qualifying work into a PORTABLE Bankr-adjacent agent skill, never a project diary or user-specific note.",
          "Public skill ecosystems are: bankr, x402, base, mcp, wallet, defi, automation, llm-gateway, agent-infrastructure.",
          "Remove repository names, local paths, domains, account IDs, request IDs, personal identities, credentials, and environment-specific values. Replace necessary values with descriptive inputs or placeholders.",
          "The skill needs at least 3 executable workflow steps, verification, failure handling, safety boundaries, rollback, and 3 independent contract test scenarios.",
          "Reject generic notes, plans, brainstorms, empty records, incomplete attempts, pure summaries, secrets, credentials, OTPs, passwords, private keys, or user-private personal data.",
          "Do not invent. Redact secrets completely.",
          "If evidence is weak, set shouldSave=false.",
          `Only set shouldSave=true when confidence >= ${minConfidence}.`
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          responseSchema: {
            shouldSave: true,
            confidence: 0.0,
            reason: "string",
            requiredEvidence: {
              userRequest: "string",
              agentMethod: "string",
              outcome: "string",
              reusableLesson: "string"
            },
            experience: {
              title: "string",
              summary: "string",
              content: "string",
              task: "string",
              outcome: "string",
              lesson: "string",
              constraints: ["string"],
              decisions: ["string"],
              tags: ["string"]
            },
            skill: {
              name: "lowercase-kebab-case",
              description: "what the skill does and when to use it",
              version: "1.0.0",
              ecosystem: "bankr|x402|base|mcp|wallet|defi|automation|llm-gateway|agent-infrastructure",
              compatibility: ["bankr", "claude-code", "codex", "openclaw", "cursor"],
              trigger: "explicit condition for loading this skill",
              prerequisites: ["string"],
              inputs: ["parameterized input"],
              outputs: ["observable output"],
              steps: ["executable step 1", "step 2", "step 3"],
              verification: ["observable check"],
              failureHandling: ["failure response"],
              doNotUseWhen: ["unsafe or inapplicable condition"],
              rollback: ["safe rollback"],
              tags: ["string"],
              testCases: [
                { name: "string", input: "concrete scenario", expectedOutcome: "observable result", successCriteria: ["criterion"] }
              ]
            }
          },
          conversation: messages
        })
      }
    ]);

    return normalizeCandidate(output);
  }

  private async recordsFromIndex(prefix: string) {
    const index = await this.kv.getMany<{ id: string }>(prefix);
    const records = await Promise.all(index.map((item) => this.kv.get<ExperienceRecord>(recordKey(item.id))));
    return records.filter((record): record is ExperienceRecord => Boolean(record));
  }

  private async requireOwned(id: string, ownerId: string, publishToken?: string) {
    const record = await this.kv.get<ExperienceRecord>(recordKey(id));
    if (!record) throw new Error("experience_not_found");
    if (record.ownerId !== ownerId) throw new Error("experience_forbidden");
    if (ownerId === "bankr-hosted") {
      const validCapability = Boolean(publishToken && record.publishSecretHash && publishTokenMatches(publishToken, record.publishSecretHash));
      if (!validCapability) throw new Error("experience_forbidden");
    }
    return record;
  }

  private async writeRecord(record: ExperienceRecord) {
    await Promise.all([
      this.kv.set(recordKey(record.id), record),
      this.kv.set(ownerIndexKey(record.ownerId, record.id), { id: record.id })
    ]);
  }
}

function normalizeExperience(input: ExperienceSaveInput | ExperiencePublishInput, messages?: ConversationMessage[]) {
  const experience = input.experience ?? {};
  const messageContent = messages?.map((message) => `${message.role}: ${message.content}`).join("\n\n");
  const content = redactSensitive(cleanText(experience.content ?? input.content ?? experience.lesson ?? experience.outcome ?? experience.task ?? messageContent ?? experience.summary ?? experience.skill?.description ?? experience.skill?.skillMarkdown ?? ""));
  const title = redactSensitive(cleanText(experience.title ?? input.title ?? titleFromContent(content)));
  const summary = redactSensitive(cleanText(experience.summary ?? summarizeContent(content)));
  const skill = experience.skill ? normalizeSkill(experience.skill, {
    userRequest: optionalText(experience.task ?? "") ?? title,
    agentMethod: content,
    outcome: optionalText(experience.outcome ?? "") ?? summary,
    reusableLesson: optionalText(experience.lesson ?? "") ?? summary
  }) : undefined;

  return {
    title,
    summary,
    content,
    task: optionalText(redactSensitive(experience.task ?? "")),
    outcome: optionalText(redactSensitive(experience.outcome ?? "")),
    lesson: optionalText(redactSensitive(experience.lesson ?? "")),
    constraints: cleanList(experience.constraints?.map(redactSensitive)),
    decisions: cleanList(experience.decisions?.map(redactSensitive)),
    tags: cleanTags(experience.tags ?? input.tags),
    confidence: typeof experience.confidence === "number" ? Number(experience.confidence.toFixed(2)) : 0.72,
    source: cleanText(experience.source ?? "mcp-v2"),
    skill
  };
}

function normalizeCandidate(output: Record<string, unknown>) {
  const evidence = objectValue(output.requiredEvidence);
  const experience = objectValue(output.experience);
  const rawSkill = objectValue(output.skill);
  const content = redactSensitive(cleanText(String(experience.content ?? experience.lesson ?? experience.outcome ?? "")));
  const lesson = redactSensitive(cleanText(String(experience.lesson ?? "")));
  const requiredEvidence = {
    userRequest: redactSensitive(cleanText(String(evidence.userRequest ?? ""))),
    agentMethod: redactSensitive(cleanText(String(evidence.agentMethod ?? ""))),
    outcome: redactSensitive(cleanText(String(evidence.outcome ?? ""))),
    reusableLesson: redactSensitive(cleanText(String(evidence.reusableLesson ?? "")))
  };
  const skill = normalizeSkill(rawSkill as VerifiedSkillInput, requiredEvidence);
  const validation = validateSkill(skill);
  const candidate = {
    shouldSave: Boolean(output.shouldSave),
    confidence: clampConfidence(output.confidence),
    reason: redactSensitive(cleanText(String(output.reason ?? ""))),
    requiredEvidence,
    experience: {
      title: redactSensitive(cleanText(String(experience.title ?? titleFromContent(content || lesson)))),
      summary: redactSensitive(cleanText(String(experience.summary ?? summarizeContent(content || lesson)))),
      content,
      task: redactSensitive(cleanText(String(experience.task ?? ""))),
      outcome: redactSensitive(cleanText(String(experience.outcome ?? ""))),
      lesson,
      constraints: cleanList(arrayOfStrings(experience.constraints).map(redactSensitive)),
      decisions: cleanList(arrayOfStrings(experience.decisions).map(redactSensitive)),
      tags: cleanTags(arrayOfStrings(experience.tags))
    },
    skill,
    validation
  };

  const hasEvidence = Boolean(
    requiredEvidence.userRequest &&
    requiredEvidence.agentMethod &&
    requiredEvidence.outcome &&
    requiredEvidence.reusableLesson
  );
  const hasExperience = Boolean(candidate.experience.content || candidate.experience.lesson || candidate.experience.outcome);
  return {
    ...candidate,
    shouldSave: candidate.shouldSave && hasEvidence && hasExperience && Boolean(skill.name && skill.steps.length) && validation.status !== "rejected"
  };
}

function normalizeSkill(input: unknown, evidence: VerifiedSkillDraft["evidence"]): VerifiedSkillDraft {
  const value = objectValue(input);
  const rawEcosystem = normalizeTag(String(value.ecosystem ?? "agent-infrastructure"));
  const ecosystem = (rawEcosystem || "agent-infrastructure") as PublicSkillEcosystem;
  const name = normalizeTag(String(value.name ?? "reusable-agent-workflow")) || "reusable-agent-workflow";
  const description = redactSensitive(cleanText(String(value.description ?? "Reusable agent workflow compiled from a completed and verified task outcome.")));
  const testCases = Array.isArray(value.testCases)
    ? value.testCases.map((item) => {
      const test = objectValue(item);
      return {
        name: redactSensitive(cleanText(String(test.name ?? "scenario"))).slice(0, 120),
        input: redactSensitive(cleanText(String(test.input ?? ""))).slice(0, 1_200),
        expectedOutcome: redactSensitive(cleanText(String(test.expectedOutcome ?? ""))).slice(0, 1_200),
        successCriteria: cleanList(arrayOfStrings(test.successCriteria).map(redactSensitive)).slice(0, 10)
      };
    }).slice(0, 12)
    : [];
  const draft = {
    name,
    description,
    version: /^\d+\.\d+\.\d+$/.test(String(value.version ?? "")) ? String(value.version) : "1.0.0",
    ecosystem,
    compatibility: cleanTags(arrayOfStrings(value.compatibility)).length
      ? cleanTags(arrayOfStrings(value.compatibility))
      : ["bankr", "claude-code", "codex", "openclaw", "cursor"],
    trigger: redactSensitive(cleanText(String(value.trigger ?? description))),
    prerequisites: cleanList(arrayOfStrings(value.prerequisites).map(redactSensitive)),
    inputs: cleanList(arrayOfStrings(value.inputs).map(redactSensitive)),
    outputs: cleanList(arrayOfStrings(value.outputs).map(redactSensitive)),
    steps: cleanList(arrayOfStrings(value.steps).map(redactSensitive)).slice(0, 30),
    verification: cleanList(arrayOfStrings(value.verification).map(redactSensitive)),
    failureHandling: cleanList(arrayOfStrings(value.failureHandling).map(redactSensitive)),
    doNotUseWhen: cleanList(arrayOfStrings(value.doNotUseWhen).map(redactSensitive)),
    rollback: cleanList(arrayOfStrings(value.rollback).map(redactSensitive)),
    tags: cleanTags(arrayOfStrings(value.tags)),
    testCases,
    evidence: {
      userRequest: redactSensitive(cleanText(evidence.userRequest)),
      agentMethod: redactSensitive(cleanText(evidence.agentMethod)),
      outcome: redactSensitive(cleanText(evidence.outcome)),
      reusableLesson: redactSensitive(cleanText(evidence.reusableLesson))
    }
  };

  return { ...draft, skillMarkdown: renderSkillMarkdown(draft) };
}

function assertMeaningfulExperience(record: Pick<ExperienceRecord, "content" | "lesson" | "summary" | "task" | "outcome" | "constraints" | "decisions" | "tags">) {
  const hasContent = Boolean(
    record.content.trim() ||
    record.lesson?.trim() ||
    record.summary.trim() ||
    record.task?.trim() ||
    record.outcome?.trim() ||
    record.constraints.length ||
    record.decisions.length ||
    record.tags.length
  );
  if (!hasContent) throw new Error("experience_content_required");
}

function experienceFields(record: ExperienceRecord) {
  return {
    title: record.title,
    summary: record.summary,
    content: record.content,
    task: record.task,
    outcome: record.outcome,
    lesson: record.lesson,
    constraints: record.constraints,
    decisions: record.decisions,
    tags: record.tags,
    confidence: record.confidence,
    source: record.source,
    skill: record.skill
  };
}

function hasNewExperienceContent(input: ExperiencePublishInput) {
  return Boolean(input.experience || input.messages?.length || input.contextId || input.title || input.content);
}

function publicExperience(record: ExperienceRecord, options: { includeContent: boolean }) {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    content: options.includeContent ? record.content : undefined,
    task: options.includeContent ? record.task : undefined,
    outcome: options.includeContent ? record.outcome : undefined,
    lesson: options.includeContent ? record.lesson : undefined,
    constraints: options.includeContent ? record.constraints : undefined,
    decisions: options.includeContent ? record.decisions : undefined,
    tags: record.tags,
    confidence: record.confidence,
    source: record.source,
    visibility: record.visibility,
    priceUsd: record.priceUsd,
    sales: record.sales,
    earnedUsd: record.earnedUsd,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    kind: record.kind ?? (record.skill ? "verified-skill" : "legacy-experience"),
    skill: record.skill ? publicSkill(record.skill, options.includeContent) : undefined,
    validation: record.validation
  };
}

function hashPublishToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publishTokenMatches(token: string, expectedHash: string) {
  const actual = Buffer.from(hashPublishToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicSkill(skill: VerifiedSkillDraft, includeMarkdown: boolean) {
  return {
    name: skill.name,
    description: skill.description,
    version: skill.version,
    ecosystem: skill.ecosystem,
    compatibility: skill.compatibility,
    trigger: skill.trigger,
    prerequisites: skill.prerequisites,
    inputs: skill.inputs,
    outputs: skill.outputs,
    steps: includeMarkdown ? skill.steps : undefined,
    verification: includeMarkdown ? skill.verification : undefined,
    failureHandling: includeMarkdown ? skill.failureHandling : undefined,
    doNotUseWhen: includeMarkdown ? skill.doNotUseWhen : undefined,
    rollback: includeMarkdown ? skill.rollback : undefined,
    tags: skill.tags,
    testCount: skill.testCases.length,
    skillMarkdown: includeMarkdown ? skill.skillMarkdown : undefined
  };
}

function experienceMetrics(input: unknown, record: ExperienceRecord) {
  return {
    inputTokens: estimateTokens(JSON.stringify(input)),
    experienceTokens: estimateTokens(record.content),
    recordTokens: estimateTokens(JSON.stringify(publicExperience(record, { includeContent: true })))
  };
}

function scoreRecord(record: ExperienceRecord, query: string, tags: string[]) {
  let score = 0;
  const haystack = [
    record.id,
    record.title,
    record.summary,
    record.content,
    record.task,
    record.outcome,
    record.lesson,
    ...record.constraints,
    ...record.decisions,
    ...record.tags,
    record.skill?.name ?? "",
    record.skill?.description ?? "",
    record.skill?.ecosystem ?? "",
    ...(record.skill?.compatibility ?? []),
    ...(record.skill?.steps ?? [])
  ].join(" ").toLowerCase();

  if (query) {
    const terms = query.split(/\s+/).filter(Boolean);
    score += terms.filter((term) => haystack.includes(term)).length;
    if (haystack.includes(query)) score += 3;
  }

  for (const tag of tags) {
    if (record.tags.includes(tag)) score += 4;
  }

  if (record.visibility === "public") score += 1;
  score += Math.min(record.sales, 10) / 10;
  return Number(score.toFixed(2));
}

function dedupeRecords(records: ExperienceRecord[]) {
  const seen = new Map<string, ExperienceRecord>();
  for (const record of records) seen.set(record.id, record);
  return Array.from(seen.values());
}

function recordKey(id: string) {
  return `experience:${id}`;
}

function ownerIndexKey(ownerId: string, id: string) {
  return `experience-owner:${ownerId}:${id}`;
}

function publicIndexKey(id: string) {
  return `experience-public:${id}`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function optionalText(value?: string) {
  const cleaned = value ? cleanText(value) : "";
  return cleaned || undefined;
}

function cleanList(values?: string[]) {
  return Array.from(new Set((values ?? []).map(cleanText).filter(Boolean))).slice(0, 20);
}

function cleanTags(values?: string[]) {
  return Array.from(new Set((values ?? []).map(normalizeTag).filter(Boolean))).slice(0, 16);
}

function normalizeTag(value: string) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function normalizeQuery(value?: string) {
  return cleanText(value ?? "").toLowerCase();
}

function titleFromContent(content: string) {
  const firstLine = content.split(/[.\n]/)[0] ?? content;
  return cleanText(firstLine).split(/\s+/).slice(0, 12).join(" ") || "Untitled agent experience";
}

function summarizeContent(content: string) {
  const words = cleanText(content).split(/\s+/).slice(0, 36).join(" ");
  return words;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(String(item))).filter(Boolean);
}

function clampConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, Number(number.toFixed(2))));
}

function redactSensitive(value: string) {
  return value
    .replace(/\b(?:sk|bk|ck|re)_[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, "Bearer [redacted-secret]")
    .replace(/\b(?:password|token|secret|api[_-]?key|private[_-]?key|otp|code)\s*[:=]\s*['\"]?[^,'\"\s}]{4,}/gi, "$1=[redacted-secret]")
    .replace(/\b\d{6}\b/g, "[redacted-code]");
}
