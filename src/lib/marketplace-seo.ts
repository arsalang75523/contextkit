import { site } from "@/lib/site";

export type MarketplaceSeoListing = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  compatibility: string[];
  version: string;
  license?: string;
  validationScore: number;
  testCount: number;
  installCount?: number;
  reviewCount?: number;
  seller?: { name?: string };
  skill?: {
    trigger?: string;
    prerequisites?: string[];
    inputs?: string[];
    outputs?: string[];
  };
};

const genericNamePattern = /^(?:untitled|sample|demo|test|hello|foo|bar|skill)(?:[-_\s].*)?$/i;

export function marketplaceSkillSeo(listing: MarketplaceSeoListing) {
  const name = humanizeSkillName(listing.name);
  const category = humanizeSkillName(listing.category);
  const title = truncate(`${name} Agent Skill | ContextKit`, 60);
  const description = truncate(
    `${cleanSentence(listing.description)} Evidence-backed ${category.toLowerCase()} skill with ${listing.testCount} verified tests and ${listing.validationScore}/100 validation.`,
    158
  );
  const quality = assessMarketplaceSeo(listing);

  return {
    name,
    category,
    title,
    description,
    keywords: unique([
      listing.name,
      name,
      `${category} agent skill`,
      "verified agent skill",
      "AI agent skill",
      "ContextKit marketplace",
      ...listing.tags,
      ...listing.compatibility
    ]).slice(0, 14),
    canonical: `${site.url}/marketplace/${encodeURIComponent(listing.id)}`,
    indexable: quality.indexable,
    quality
  };
}

export function assessMarketplaceSeo(listing: MarketplaceSeoListing) {
  const findings: string[] = [];
  let score = 0;
  const descriptionWords = wordCount(listing.description);
  const triggerWords = wordCount(listing.skill?.trigger ?? "");

  if (descriptionWords >= 8) score += 20;
  else findings.push("description is too short");
  if (triggerWords >= 8) score += 15;
  else findings.push("use-case trigger is too short");
  if (listing.testCount >= 3) score += 25;
  else findings.push("fewer than three evidence-backed tests");
  if (listing.validationScore >= 75) score += 20;
  else findings.push("validation score is below 75");
  if (listing.category) score += 5;
  if (listing.tags.length >= 2) score += 5;
  else findings.push("fewer than two discovery tags");
  if (listing.compatibility.length >= 1) score += 5;
  else findings.push("no compatibility target");
  if (
    (listing.skill?.prerequisites?.length ?? 0) > 0 &&
    (listing.skill?.inputs?.length ?? 0) > 0 &&
    (listing.skill?.outputs?.length ?? 0) > 0
  ) score += 5;
  else findings.push("public execution inputs or outputs are incomplete");
  if (listing.name.trim() && !genericNamePattern.test(listing.name.trim())) score += 5;
  else findings.push("skill name is generic");

  return {
    score,
    indexable: score >= 85 && findings.length === 0,
    findings
  };
}

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function humanizeSkillName(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word)
    .join(" ");
}

function cleanSentence(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "");
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const shortened = value.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim();
  return `${shortened}…`;
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
