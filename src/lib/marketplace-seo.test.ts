import test from "node:test";
import assert from "node:assert/strict";
import { assessMarketplaceSeo, marketplaceSkillSeo, safeJsonLd } from "./marketplace-seo";

const strongListing = {
  id: "exp_verified_skill_123",
  name: "bankr-x402-timeout-recovery",
  description: "Recover bounded Bankr x402 requests with precomputed work and verified response handling.",
  category: "x402",
  tags: ["x402", "reliability"],
  compatibility: ["bankr", "codex"],
  version: "1.0.0",
  validationScore: 94,
  testCount: 5,
  skill: {
    trigger: "Use when a paid agent request needs bounded timeout recovery without changing its response contract.",
    prerequisites: ["Bankr endpoint access"],
    inputs: ["Request payload"],
    outputs: ["Verified response"]
  }
};

test("indexes complete evidence-backed skill pages", () => {
  const seo = marketplaceSkillSeo(strongListing);
  assert.equal(seo.indexable, true);
  assert.equal(seo.canonical, "https://contextkit.pro/marketplace/exp_verified_skill_123");
  assert.match(seo.description, /5 verified tests/);
  assert.ok(seo.keywords.includes("x402"));
});

test("keeps thin marketplace records out of the index", () => {
  const report = assessMarketplaceSeo({
    ...strongListing,
    description: "Short",
    testCount: 1,
    validationScore: 40,
    skill: { trigger: "Short" }
  });
  assert.equal(report.indexable, false);
  assert.ok(report.findings.length > 0);
});

test("escapes user content before JSON-LD injection", () => {
  assert.equal(safeJsonLd({ description: "</script><script>alert(1)</script>" }).includes("<"), false);
});
