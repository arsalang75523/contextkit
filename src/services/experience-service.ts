import { AppKV } from "@/storage/app-kv";
import { createHash, timingSafeEqual } from "node:crypto";
import { BankrLlmClient } from "@/lib/bankr-llm";
import { readEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import type { AppBindings } from "@/types/bindings";
import type {
  ConversationMessage,
  ExperienceBuyInput,
  ExperienceConsiderInput,
  ExperiencePublishInput,
  ExperienceSaveInput,
  ExperienceSearchInput,
  SkillBundlePushInput,
  VerifiedSkillInput
} from "@/types/api";
import { createId } from "@/utils/id";
import { estimateTokens } from "@/utils/tokens";
import {
  renderSkillMarkdown,
  validateSkill,
  type PublicSkillEcosystem,
  type SkillTestCase,
  type SkillValidationReport,
  type VerifiedSkillDraft
} from "@/services/skill-validation";
import {
  SkillBundleService,
  type SkillBundleManifest,
  type SkillBundleValidation
} from "@/services/skill-bundle-service";
import { AccountService } from "@/services/account-service";

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
  repository?: {
    name: string;
    version: string;
    digest: string;
    manifest: SkillBundleManifest;
    validation: SkillBundleValidation;
  };
};

export type ExperienceInputContext = {
  ownerId: string;
  messages?: ConversationMessage[];
  contextMetadata?: Record<string, unknown>;
};

export type SkillReviewRecord = {
  id: string;
  skillId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  title?: string;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
};

type SkillSaleRecord = {
  id: string;
  buyerId: string;
  sellerId: string;
  experienceId: string;
  amountUsd: number;
  createdAt: string;
};

export type MarketplaceSort = "trending" | "latest" | "rating" | "installs";

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
    if (normalized.skill && !validation?.writeEligible) {
      const details = validation?.findings.join(" ") || "Skill draft has no source-grounded passing test evidence.";
      throw new Error(`skill_not_writeable:${details}`);
    }
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
    if (!existing?.repository?.validation.publishEligible) {
      throw new Error("skill_bundle_required_for_publish");
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
      repository: existing?.repository,
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
      .filter((record) => !input.skillId || record.id === input.skillId)
      .filter((record) => !input.verifiedOnly || Boolean(record.skill && validateSkill(record.skill).eligible))
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

  async marketplace(input: {
    query?: string;
    category?: string;
    sort?: MarketplaceSort;
    featured?: boolean;
    limit?: number;
  } = {}) {
    const records = (await this.recordsFromIndex("experience-public:"))
      .filter((record) => record.visibility === "public" && Boolean(record.skill && validateSkill(record.skill).eligible));
    const query = normalizeQuery(input.query);
    const category = normalizeTag(input.category ?? "");
    const sort = input.sort ?? "trending";
    const enriched = await Promise.all(records.map(async (record) => {
      const [reviews, seller] = await Promise.all([
        this.reviewSummary(record.id),
        this.publicSeller(record.ownerId)
      ]);
      return {
        ...marketplaceListing(record, reviews, seller),
        trendingScore: marketplaceTrendingScore(record, reviews)
      };
    }));
    const categories = Array.from(new Set(enriched.map((item) => item.category)))
      .filter(Boolean)
      .map((name) => ({
        name,
        count: enriched.filter((item) => item.category === name).length
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const matching = enriched
      .filter((item) => !category || item.category === category)
      .filter((item) => !query || marketplaceHaystack(item).includes(query))
      .sort((a, b) => marketplaceSortValue(b, sort) - marketplaceSortValue(a, sort) || b.publishedAt.localeCompare(a.publishedAt));
    const featuredIds = new Set(
      [...enriched]
        .sort((a, b) => marketplaceFeaturedScore(b) - marketplaceFeaturedScore(a))
        .slice(0, Math.min(3, enriched.length))
        .map((item) => item.id)
    );
    const ranked = matching
      .map((item, index) => ({ ...item, rank: index + 1, featured: featuredIds.has(item.id) }))
      .filter((item) => !input.featured || item.featured)
      .slice(0, Math.min(Math.max(input.limit ?? 24, 1), 100));

    return {
      results: ranked,
      count: ranked.length,
      totalListings: enriched.length,
      totalInstalls: enriched.reduce((total, item) => total + item.installCount, 0),
      categories,
      filters: {
        query: input.query ?? "",
        category: category || null,
        sort
      }
    };
  }

  async publicListing(skillId: string) {
    const record = await this.kv.get<ExperienceRecord>(recordKey(skillId));
    if (!record || record.visibility !== "public" || !record.skill || !validateSkill(record.skill).eligible) {
      return null;
    }
    const [reviews, seller, reviewItems] = await Promise.all([
      this.reviewSummary(skillId),
      this.publicSeller(record.ownerId),
      this.reviews(skillId, 20)
    ]);
    return {
      ...marketplaceListing(record, reviews, seller),
      skill: publicSkill(record.skill, false),
      validation: record.validation,
      repository: record.repository ? {
        name: record.repository.name,
        version: record.repository.version,
        digest: record.repository.digest,
        manifest: record.repository.manifest,
        validation: record.repository.validation
      } : undefined,
      reviews: reviewItems
    };
  }

  async reviews(skillId: string, limit = 20) {
    const reviews = await this.kv.getMany<SkillReviewRecord>(reviewIndexPrefix(skillId));
    return reviews
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, Math.min(Math.max(limit, 1), 100))
      .map(publicReview);
  }

  async review(
    skillId: string,
    input: { rating: number; title?: string; body: string },
    reviewer: { ownerId: string; name: string }
  ) {
    const record = await this.kv.get<ExperienceRecord>(recordKey(skillId));
    if (!record || record.visibility !== "public" || !record.skill) throw new Error("experience_not_found");
    if (record.ownerId === reviewer.ownerId) throw new Error("review_own_skill");

    const now = new Date().toISOString();
    const existing = await this.kv.get<SkillReviewRecord>(reviewKey(skillId, reviewer.ownerId));
    const verifiedPurchase = await this.hasPurchased(skillId, reviewer.ownerId);
    const review: SkillReviewRecord = {
      id: existing?.id ?? createId("rev"),
      skillId,
      reviewerId: reviewer.ownerId,
      reviewerName: cleanText(reviewer.name).slice(0, 80) || "ContextKit user",
      rating: Math.min(Math.max(Math.round(input.rating), 1), 5),
      title: optionalText(input.title ? cleanText(input.title).slice(0, 100) : ""),
      body: cleanText(input.body).slice(0, 1_200),
      verifiedPurchase,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    if (meaningfulWordCount(review.body) < 3) throw new Error("review_too_short");

    await Promise.all([
      this.kv.set(reviewKey(skillId, reviewer.ownerId), review),
      this.kv.set(reviewIndexKey(skillId, reviewer.ownerId), review)
    ]);

    return {
      review: publicReview(review),
      summary: await this.reviewSummary(skillId)
    };
  }

  async sellerDashboard(ownerId: string) {
    const records = dedupeRecords(await this.recordsFromIndex(`experience-owner:${ownerId}:`))
      .filter((record) => record.kind === "verified-skill" || Boolean(record.skill));
    const sales = await this.kv.getMany<SkillSaleRecord>(sellerSalePrefix(ownerId));
    const listings = await Promise.all(records.map(async (record) => {
      const reviews = await this.reviewSummary(record.id);
      return {
        id: record.id,
        name: record.skill?.name ?? record.title,
        title: record.title,
        visibility: record.visibility,
        version: record.skill?.version ?? record.repository?.version ?? "draft",
        sales: record.sales,
        installCount: record.sales,
        earnedUsd: record.earnedUsd,
        priceUsd: record.priceUsd,
        rating: reviews.average,
        reviewCount: reviews.count,
        validationScore: record.validation?.score ?? 0,
        updatedAt: record.updatedAt
      };
    }));
    const grossRevenueUsd = Number(records.reduce((total, record) => total + record.earnedUsd, 0).toFixed(6));
    const paidOutUsd = (await this.kv.get<number>(sellerPaidTotalKey(ownerId))) ?? 0;
    const pendingUsd = Number(Math.max(grossRevenueUsd - paidOutUsd, 0).toFixed(6));

    return {
      totals: {
        skills: records.length,
        published: records.filter((record) => record.visibility === "public").length,
        sales: records.reduce((total, record) => total + record.sales, 0),
        installs: records.reduce((total, record) => total + record.sales, 0),
        revenueUsd: grossRevenueUsd,
        averageRating: weightedSellerRating(listings)
      },
      payout: {
        pendingUsd,
        paidOutUsd: Number(paidOutUsd.toFixed(6)),
        nextPayoutAt: nextFridayIso(),
        status: pendingUsd > 0 ? "pending" : "no-balance",
        settlement: "USDC on Base",
        note: "Payout ledger is weekly; settlement requires a verified seller wallet."
      },
      listings: listings.sort((a, b) => b.earnedUsd - a.earnedUsd || b.sales - a.sales || b.updatedAt.localeCompare(a.updatedAt)),
      recentSales: sales
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 20)
        .map((sale) => ({
          id: sale.id,
          skillId: sale.experienceId,
          amountUsd: sale.amountUsd,
          createdAt: sale.createdAt
        }))
    };
  }

  async pushBundle(input: SkillBundlePushInput, context: ExperienceInputContext) {
    const skillId = input.skillId ?? "";
    const record = await this.requireOwned(skillId, context.ownerId, input.publishToken);
    if (!record.skill || !record.validation?.writeEligible) throw new Error("skill_required_for_bundle");

    const bundleService = new SkillBundleService(this.env);
    const versionKey = repositoryVersionKey(context.ownerId, input.repository, input.version);
    const existingVersion = await this.kv.get<{ digest: string; skillId: string }>(versionKey);
    const bundle = bundleService.build({
      repository: input.repository,
      version: input.version,
      files: input.files,
      skill: record.skill,
      skillId,
      immutableVersion: true
    });

    if (!bundle.validation.writeEligible) {
      throw new Error(`skill_bundle_invalid:${bundle.validation.findings.join(" ")}`);
    }
    if (existingVersion && (existingVersion.digest !== bundle.manifest.digest || existingVersion.skillId !== skillId)) {
      throw new Error("skill_version_immutable");
    }

    if (input.mode === "skill-validate") {
      return {
        stored: false,
        repository: bundle.manifest,
        validation: bundle.validation
      };
    }

    await bundleService.put(bundle);
    const updated: ExperienceRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      repository: {
        name: input.repository,
        version: input.version,
        digest: bundle.manifest.digest,
        manifest: bundle.manifest,
        validation: bundle.validation
      },
      metadata: {
        ...(record.metadata ?? {}),
        ...(input.metadata ?? {}),
        repositoryFormat: bundle.manifest.format
      }
    };
    await Promise.all([
      this.writeRecord(updated),
      this.kv.set(versionKey, {
        ownerId: context.ownerId,
        skillId,
        repository: input.repository,
        version: input.version,
        digest: bundle.manifest.digest,
        createdAt: bundle.manifest.createdAt
      })
    ]);

    return {
      stored: true,
      experience: publicExperience(updated, { includeContent: true }),
      repository: bundle.manifest,
      validation: bundle.validation,
      nextAgentAction: "Request explicit user approval, then publish this immutable repository version with skill-repository-publish."
    };
  }

  async consider(input: ExperienceConsiderInput, context: ExperienceInputContext) {
    const messages = context.messages ?? input.messages ?? [];
    const candidate = await this.generateCandidate(messages, input.minConfidence);
    const shouldSave = Boolean(candidate.shouldSave) && candidate.confidence >= input.minConfidence;

    if (!shouldSave) {
      return {
        shouldSave: false,
        reason: candidate.reason || "No completed reusable agent experience detected.",
        confidence: candidate.confidence,
        requiredEvidence: candidate.requiredEvidence,
        validation: candidate.validation,
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
        skill: candidate.skill as unknown as VerifiedSkillInput,
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
    if (!record || record.visibility !== "public" || !record.skill) {
      throw new Error("experience_not_found");
    }
    const skill = record.skill;
    const validation = validateSkill(skill);
    if (!validation.eligible) throw new Error("experience_not_found");
    const repositoryBundle = record.repository
      ? await new SkillBundleService(this.env).get(record.repository.digest)
      : null;
    if (record.repository && !repositoryBundle) throw new Error("skill_bundle_not_found");

    const now = new Date().toISOString();
    const updated: ExperienceRecord = {
      ...record,
      sales: record.sales + 1,
      earnedUsd: Number((record.earnedUsd + amountUsd).toFixed(6)),
      updatedAt: now
    };
    const purchaseId = createId("buy");
    const sale: SkillSaleRecord = {
      id: purchaseId,
      buyerId,
      sellerId: record.ownerId,
      experienceId: record.id,
      amountUsd,
      createdAt: now
    };

    await Promise.all([
      this.writeRecord(updated),
      this.kv.set(purchaseKey(buyerId, purchaseId), sale),
      this.kv.set(skillSaleKey(record.id, purchaseId), sale),
      this.kv.set(sellerSaleKey(record.ownerId, purchaseId), sale)
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
      installBundle: repositoryBundle
        ? {
            format: repositoryBundle.manifest.format,
            repository: repositoryBundle.manifest.repository,
            version: repositoryBundle.manifest.version,
            digest: repositoryBundle.manifest.digest,
            manifest: repositoryBundle.manifest,
            files: repositoryBundle.files,
            validation: repositoryBundle.validation,
            materialize: {
              root: repositoryBundle.manifest.repository,
              overwrite: false,
              verifyChecksums: true
            }
          }
        : {
            format: "contextkit-verified-skill/v1",
            fileName: "SKILL.md",
            skillMarkdown: skill.skillMarkdown,
            manifest: {
              id: updated.id,
              name: skill.name,
              version: skill.version,
              license: skill.license,
              ecosystem: skill.ecosystem,
              compatibility: skill.compatibility,
              evidencePolicy: validation.requirements,
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
    const prompt = [
      {
        role: "system",
        content: [
          "Return only compact JSON for ContextKit's verified-skill compiler, using exactly the short keys in the schema.",
          "Accept only real completed reusable work with: user request, agent method, verified outcome, reusable lesson, and no unresolved core blocker.",
          "Convert it into a portable Bankr-adjacent skill, never a project diary or user-specific note.",
          "Public skill ecosystems are: bankr, x402, base, mcp, wallet, defi, automation, llm-gateway, agent-infrastructure.",
          "Remove names, private paths/domains/IDs, credentials, secrets, and environment-specific values; parameterize necessary values.",
          "Require exactly 3 concise executable steps, 1 verification, 1 failure response, 1 safety boundary, and 1 rollback.",
          "Return 1-3 tests that were actually executed in the conversation; never invent hypothetical tests or results.",
          "Each test needs method, observed outcome, PASS=true, hard evidence type (command-output, test-log, http-response, or artifact), and an exact 12+ character evidence excerpt copied verbatim from the conversation.",
          "Never treat a claim like 'it works', future plan, generic status sentence, or model-authored assertion as test evidence.",
          "Use distinct evidence excerpts for independent tests. If no executed passing test evidence exists, set save=false.",
          "Reject greetings, trivial requests, placeholders, plans, brainstorms, incomplete attempts, generic notes, pure summaries, one-off private project details, private data, or invented evidence.",
          "A reusable skill needs concrete prerequisites, inputs, outputs, exactly 3 distinct executable steps, verification, failure handling, a safety boundary, rollback, and at least 2 tags.",
          "Keep the full JSON below 450 tokens; each string must be a complete thought and no longer than 160 characters.",
          `Set save=true only when confidence >= ${minConfidence}; otherwise return the same schema with concise empty skill fields.`
        ].join(" ")
      },
      {
        role: "user",
        content: JSON.stringify({
          responseSchema: {
            save: true,
            confidence: 0.0,
            reason: "string",
            e: {
              request: "string",
              method: "string",
              outcome: "string",
              lesson: "string"
            },
            s: {
              name: "lowercase-kebab-case",
              desc: "what the skill does and when to use it",
              license: "explicit reuse license",
              eco: "bankr|x402|base|mcp|wallet|defi|automation|llm-gateway|agent-infrastructure",
              trigger: "explicit condition for loading this skill",
              pre: ["string"],
              inputs: ["string"],
              outputs: ["string"],
              steps: ["executable step 1", "step 2", "step 3"],
              verify: ["observable check"],
              fail: ["failure response"],
              avoid: ["unsafe or inapplicable condition"],
              rollback: ["safe rollback"],
              tags: ["string"],
              tests: [
                ["name", "concrete input", "expected outcome", "success criterion", "test method", "observed outcome", "command-output|test-log|http-response|artifact|assertion", "verbatim source excerpt", true]
              ]
            }
          },
          conversation: messages
        })
      }
    ] as const;
    const env = readEnv({ env: this.env });
    let output: Record<string, unknown>;

    try {
      output = await llm.generateJsonFromPrompt("summarize", prompt, {
        model: env.bankrSkillLlmModel,
        maxTokens: 1_200,
        attempts: 1
      });
    } catch (error) {
      if (env.bankrSkillLlmModel === env.bankrLlmModel) throw error;
      log("warn", "Skill compiler model failed; retrying with primary Bankr LLM model", {
        configuredModel: env.bankrSkillLlmModel,
        fallbackModel: env.bankrLlmModel,
        error: String(error)
      });
      output = await llm.generateJsonFromPrompt("summarize", prompt, {
        model: env.bankrLlmModel,
        maxTokens: 1_200,
        attempts: 1
      });
    }

    return normalizeCandidate(output, messages);
  }

  private async recordsFromIndex(prefix: string) {
    const index = await this.kv.getMany<{ id: string }>(prefix);
    const records = await Promise.all(index.map((item) => this.kv.get<ExperienceRecord>(recordKey(item.id))));
    return records.filter((record): record is ExperienceRecord => Boolean(record));
  }

  private async reviewSummary(skillId: string) {
    const reviews = await this.kv.getMany<SkillReviewRecord>(reviewIndexPrefix(skillId));
    const count = reviews.length;
    const average = count
      ? Number((reviews.reduce((total, review) => total + review.rating, 0) / count).toFixed(1))
      : 0;
    return {
      average,
      count,
      verifiedCount: reviews.filter((review) => review.verifiedPurchase).length
    };
  }

  private async publicSeller(ownerId: string) {
    if (ownerId.startsWith("acct_")) {
      const account = await new AccountService(this.env).get(ownerId);
      if (account) {
        return {
          id: account.id,
          name: account.name,
          company: account.company,
          handle: sellerHandle(account.name, account.id)
        };
      }
    }
    return {
      id: ownerId,
      name: ownerId === "bankr-hosted" ? "Bankr-hosted creator" : "ContextKit creator",
      handle: sellerHandle(ownerId === "bankr-hosted" ? "bankr creator" : "contextkit creator", ownerId)
    };
  }

  private async hasPurchased(skillId: string, buyerId: string) {
    const purchases = await this.kv.getMany<SkillSaleRecord>(purchasePrefix(buyerId));
    return purchases.some((purchase) => purchase.experienceId === skillId);
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

function normalizeCandidate(output: Record<string, unknown>, messages: ConversationMessage[]) {
  const evidence = objectValue(output.requiredEvidence ?? output.e);
  const experience = objectValue(output.experience);
  const rawSkill = objectValue(output.skill ?? output.s);
  const requiredEvidence = {
    userRequest: redactSensitive(cleanText(String(evidence.userRequest ?? evidence.request ?? ""))),
    agentMethod: redactSensitive(cleanText(String(evidence.agentMethod ?? evidence.method ?? ""))),
    outcome: redactSensitive(cleanText(String(evidence.outcome ?? ""))),
    reusableLesson: redactSensitive(cleanText(String(evidence.reusableLesson ?? evidence.lesson ?? "")))
  };
  const skill = groundSkillTestEvidence(normalizeSkill(rawSkill as VerifiedSkillInput, requiredEvidence), messages);
  const content = redactSensitive(cleanText(String(experience.content ?? requiredEvidence.agentMethod)));
  const lesson = redactSensitive(cleanText(String(experience.lesson ?? requiredEvidence.reusableLesson)));
  const outcome = redactSensitive(cleanText(String(experience.outcome ?? requiredEvidence.outcome)));
  const task = redactSensitive(cleanText(String(experience.task ?? requiredEvidence.userRequest)));
  const validation = validateSkill(skill);
  const candidate = {
    shouldSave: Boolean(output.shouldSave ?? output.save),
    confidence: clampConfidence(output.confidence),
    reason: redactSensitive(cleanText(String(output.reason ?? ""))),
    requiredEvidence,
    experience: {
      title: redactSensitive(cleanText(String(experience.title ?? skill.name ?? titleFromContent(content || lesson)))),
      summary: redactSensitive(cleanText(String(experience.summary ?? skill.description ?? summarizeContent(content || lesson)))),
      content,
      task,
      outcome,
      lesson,
      constraints: cleanList(arrayOfStrings(experience.constraints).map(redactSensitive)),
      decisions: cleanList(arrayOfStrings(experience.decisions).map(redactSensitive)),
      tags: cleanTags(arrayOfStrings(experience.tags).length ? arrayOfStrings(experience.tags) : skill.tags)
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
    shouldSave: candidate.shouldSave && hasEvidence && hasExperience && Boolean(skill.name && skill.steps.length) && validation.writeEligible
  };
}

function normalizeSkill(input: unknown, evidence: VerifiedSkillDraft["evidence"]): VerifiedSkillDraft {
  const value = objectValue(input);
  const rawEcosystem = normalizeTag(String(value.ecosystem ?? value.eco ?? "agent-infrastructure"));
  const ecosystem = (rawEcosystem || "agent-infrastructure") as PublicSkillEcosystem;
  const name = normalizeTag(String(value.name ?? "reusable-agent-workflow")) || "reusable-agent-workflow";
  const description = redactSensitive(cleanText(String(value.description ?? value.desc ?? "Reusable agent workflow compiled from a completed and verified task outcome.")));
  const license = redactSensitive(cleanText(String(value.license ?? "ContextKit Marketplace License; non-resale installation use.")));
  const rawTests = Array.isArray(value.testCases) ? value.testCases : Array.isArray(value.tests) ? value.tests : [];
  const testCases = rawTests.length
    ? rawTests.map((item) => {
      if (Array.isArray(item)) {
        return {
          name: redactSensitive(cleanText(String(item[0] ?? "scenario"))).slice(0, 120),
          input: redactSensitive(cleanText(String(item[1] ?? ""))).slice(0, 1_200),
          expectedOutcome: redactSensitive(cleanText(String(item[2] ?? ""))).slice(0, 1_200),
          successCriteria: cleanList([redactSensitive(String(item[3] ?? ""))]),
          testMethod: redactSensitive(cleanText(String(item[4] ?? ""))).slice(0, 1_200),
          observedOutcome: redactSensitive(cleanText(String(item[5] ?? ""))).slice(0, 1_200),
          evidenceType: normalizeEvidenceType(item[6]),
          evidenceExcerpt: redactSensitive(cleanText(String(item[7] ?? ""))).slice(0, 1_200),
          passed: booleanValue(item[8]),
          evidenceVerified: Boolean(item[9]),
          sourceMessageIndex: numberValue(item[10])
        };
      }
      const test = objectValue(item);
      return {
        name: redactSensitive(cleanText(String(test.name ?? "scenario"))).slice(0, 120),
        input: redactSensitive(cleanText(String(test.input ?? ""))).slice(0, 1_200),
        expectedOutcome: redactSensitive(cleanText(String(test.expectedOutcome ?? ""))).slice(0, 1_200),
        successCriteria: cleanList(arrayOfStrings(test.successCriteria).map(redactSensitive)).slice(0, 10),
        testMethod: redactSensitive(cleanText(String(test.testMethod ?? ""))).slice(0, 1_200),
        observedOutcome: redactSensitive(cleanText(String(test.observedOutcome ?? ""))).slice(0, 1_200),
        evidenceType: normalizeEvidenceType(test.evidenceType),
        evidenceExcerpt: redactSensitive(cleanText(String(test.evidenceExcerpt ?? ""))).slice(0, 1_200),
        passed: booleanValue(test.passed),
        evidenceVerified: Boolean(test.evidenceVerified),
        sourceMessageIndex: numberValue(test.sourceMessageIndex)
      };
    }).slice(0, 12)
    : [];
  const draft = {
    name,
    description,
    license,
    version: /^\d+\.\d+\.\d+$/.test(String(value.version ?? "")) ? String(value.version) : "1.0.0",
    ecosystem,
    compatibility: cleanTags(arrayOfStrings(value.compatibility)).length
      ? cleanTags(arrayOfStrings(value.compatibility))
      : ["bankr", "claude-code", "codex", "openclaw", "cursor"],
    trigger: redactSensitive(cleanText(String(value.trigger ?? description))),
    prerequisites: cleanList(arrayOfStrings(value.prerequisites ?? value.pre).map(redactSensitive)),
    inputs: cleanList(arrayOfStrings(value.inputs).map(redactSensitive)),
    outputs: cleanList(arrayOfStrings(value.outputs).map(redactSensitive)),
    steps: cleanList(arrayOfStrings(value.steps).map(redactSensitive)).slice(0, 30),
    verification: cleanList(arrayOfStrings(value.verification ?? value.verify).map(redactSensitive)),
    failureHandling: cleanList(arrayOfStrings(value.failureHandling ?? value.fail).map(redactSensitive)),
    doNotUseWhen: cleanList(arrayOfStrings(value.doNotUseWhen ?? value.avoid).map(redactSensitive)),
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

function groundSkillTestEvidence(skill: VerifiedSkillDraft, messages: ConversationMessage[]): VerifiedSkillDraft {
  const sanitizedMessages = messages.map((message) => redactSensitive(cleanText(message.content)));
  const testCases = skill.testCases.map((test) => {
    const evidence = normalizeComparable(test.evidenceExcerpt);
    const sourceMessageIndex = evidence.length >= 12
      ? sanitizedMessages.findIndex((message) => normalizeComparable(message).includes(evidence))
      : -1;
    return {
      ...test,
      evidenceVerified: sourceMessageIndex >= 0,
      sourceMessageIndex: sourceMessageIndex >= 0 ? sourceMessageIndex : undefined
    };
  });
  const grounded = { ...skill, testCases };
  return { ...grounded, skillMarkdown: renderSkillMarkdown(grounded) };
}

function assertMeaningfulExperience(record: Pick<ExperienceRecord, "content" | "lesson" | "summary" | "task" | "outcome" | "constraints" | "decisions" | "tags" | "skill">) {
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
  if (record.skill) return;

  const legacyFields = [record.task ?? "", record.outcome ?? "", record.lesson ?? ""];
  const reusableLegacyRecord = meaningfulWordCount(record.content) >= 20 &&
    legacyFields.every((value) => meaningfulWordCount(value) >= 5) &&
    record.tags.length >= 2 &&
    !/\b(?:lorem ipsum|todo|tbd|placeholder|dummy content|random text|asdfg+|qwerty+)\b/i.test(
      [record.content, ...legacyFields].join(" ")
    );
  if (!reusableLegacyRecord) {
    throw new Error("experience_not_reusable");
  }
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
    validation: record.validation,
    repository: record.repository ? {
      name: record.repository.name,
      version: record.repository.version,
      digest: record.repository.digest,
      manifest: record.repository.manifest,
      validation: record.repository.validation
    } : undefined
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
  const testCases = Array.isArray(skill.testCases) ? skill.testCases : [];
  return {
    name: skill.name,
    description: skill.description,
    license: skill.license,
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
    testCount: testCases.length,
    tests: includeMarkdown ? testCases.map((test) => ({
      name: test.name,
      passed: test.passed && test.evidenceVerified,
      testMethod: test.testMethod,
      observedOutcome: test.observedOutcome,
      evidenceType: test.evidenceType,
      evidenceExcerpt: test.evidenceExcerpt,
      sourceMessageIndex: test.sourceMessageIndex
    })) : undefined,
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

function marketplaceListing(
  record: ExperienceRecord,
  reviews: { average: number; count: number; verifiedCount: number },
  seller: { id: string; name: string; company?: string; handle: string }
) {
  const skill = record.skill;
  if (!skill) throw new Error("marketplace_skill_required");
  return {
    id: record.id,
    name: skill.name,
    title: record.title,
    description: skill.description,
    summary: record.summary,
    category: skill.ecosystem,
    tags: skill.tags,
    compatibility: skill.compatibility,
    version: skill.version,
    license: skill.license,
    priceUsd: record.priceUsd,
    installCount: record.sales,
    sales: record.sales,
    earnedUsd: record.earnedUsd,
    rating: reviews.average,
    reviewCount: reviews.count,
    verifiedReviewCount: reviews.verifiedCount,
    validationScore: record.validation?.score ?? 0,
    testCount: skill.testCases.length,
    repositoryFiles: record.repository?.manifest.files.length ?? 0,
    repositoryDigest: record.repository?.digest,
    publishedAt: record.publishedAt ?? record.updatedAt,
    updatedAt: record.updatedAt,
    seller
  };
}

function marketplaceTrendingScore(
  record: ExperienceRecord,
  reviews: { average: number; count: number }
) {
  const publishedAt = new Date(record.publishedAt ?? record.updatedAt).getTime();
  const ageDays = Number.isFinite(publishedAt) ? Math.max((Date.now() - publishedAt) / 86_400_000, 0) : 365;
  const freshness = Math.max(30 - ageDays, 0) / 3;
  return Number((
    record.sales * 4 +
    reviews.average * 2 +
    Math.min(reviews.count, 20) +
    (record.validation?.score ?? 0) / 10 +
    freshness
  ).toFixed(2));
}

function marketplaceFeaturedScore(item: ReturnType<typeof marketplaceListing> & { trendingScore: number }) {
  return item.trendingScore + item.validationScore / 4 + item.repositoryFiles / 5;
}

function marketplaceSortValue(
  item: ReturnType<typeof marketplaceListing> & { trendingScore: number },
  sort: MarketplaceSort
) {
  if (sort === "latest") return new Date(item.publishedAt).getTime();
  if (sort === "rating") return item.rating * 100 + item.reviewCount;
  if (sort === "installs") return item.installCount;
  return item.trendingScore;
}

function marketplaceHaystack(item: ReturnType<typeof marketplaceListing>) {
  return [
    item.name,
    item.title,
    item.description,
    item.summary,
    item.category,
    item.seller.name,
    item.seller.company ?? "",
    ...item.tags,
    ...item.compatibility
  ].join(" ").toLowerCase();
}

function publicReview(review: SkillReviewRecord) {
  return {
    id: review.id,
    skillId: review.skillId,
    reviewerName: review.reviewerName,
    rating: review.rating,
    title: review.title,
    body: review.body,
    verifiedPurchase: review.verifiedPurchase,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  };
}

function sellerHandle(name: string, id: string) {
  const slug = normalizeTag(name).slice(0, 32) || "creator";
  return `${slug}-${id.slice(-6).toLowerCase()}`;
}

function weightedSellerRating(listings: Array<{ rating: number; reviewCount: number }>) {
  const reviewCount = listings.reduce((total, listing) => total + listing.reviewCount, 0);
  if (!reviewCount) return 0;
  return Number((
    listings.reduce((total, listing) => total + listing.rating * listing.reviewCount, 0) / reviewCount
  ).toFixed(1));
}

function nextFridayIso() {
  const next = new Date();
  next.setUTCHours(17, 0, 0, 0);
  const daysUntilFriday = (5 - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + daysUntilFriday);
  if (next.getTime() <= Date.now()) next.setUTCDate(next.getUTCDate() + 7);
  return next.toISOString();
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

function purchaseKey(buyerId: string, purchaseId: string) {
  return `${purchasePrefix(buyerId)}${purchaseId}`;
}

function purchasePrefix(buyerId: string) {
  return `experience-purchase:${buyerId}:`;
}

function skillSaleKey(skillId: string, purchaseId: string) {
  return `experience-sale:${skillId}:${purchaseId}`;
}

function sellerSaleKey(sellerId: string, purchaseId: string) {
  return `${sellerSalePrefix(sellerId)}${purchaseId}`;
}

function sellerSalePrefix(sellerId: string) {
  return `seller-sale:${sellerId}:`;
}

function reviewKey(skillId: string, reviewerId: string) {
  return `skill-review:${skillId}:${reviewerId}`;
}

function reviewIndexKey(skillId: string, reviewerId: string) {
  return `${reviewIndexPrefix(skillId)}${reviewerId}`;
}

function reviewIndexPrefix(skillId: string) {
  return `skill-review-index:${skillId}:`;
}

function sellerPaidTotalKey(sellerId: string) {
  return `seller-payout-paid:${sellerId}`;
}

function repositoryVersionKey(ownerId: string, repository: string, version: string) {
  return `skill-repository:${ownerId}:${repository}:${version}`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function meaningfulWordCount(value: string) {
  return value.trim().split(/\s+/).filter((word) => /[a-z0-9]/i.test(word)).length;
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

function normalizeEvidenceType(value: unknown): SkillTestCase["evidenceType"] {
  const normalized = cleanText(String(value ?? "assertion")).toLowerCase();
  if (["command-output", "test-log", "http-response", "artifact", "assertion"].includes(normalized)) {
    return normalized as SkillTestCase["evidenceType"];
  }
  return "assertion";
}

function booleanValue(value: unknown) {
  return value === true || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "pass";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

function normalizeComparable(value: string) {
  return cleanText(value).toLowerCase();
}

function redactSensitive(value: string) {
  return value
    .replace(/\b(?:sk|bk|ck|re)_[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, "Bearer [redacted-secret]")
    .replace(/\b(?:password|token|secret|api[_-]?key|private[_-]?key|otp|code)\s*[:=]\s*['\"]?[^,'\"\s}]{4,}/gi, "$1=[redacted-secret]")
    .replace(/\b\d{6}\b/g, "[redacted-code]");
}
