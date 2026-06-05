import type { ConversationMessage } from "@/types/api";

export type CompressionQuality = {
  compressionScore: number;
  semanticSimilarity: number;
  duplicateReduction: number;
  informationRetention: number;
  retainedFactsCount: number;
};

export class CompressionQualityService {
  score(messages: ConversationMessage[], compressed: string): CompressionQuality {
    const source = messages.map((message) => message.content).join("\n");
    const sourceFacts = extractFacts(source);
    const compressedFacts = extractFacts(compressed);
    const retainedFactsCount = compressedFacts.filter((fact) => sourceFacts.includes(fact)).length;
    const informationRetention = sourceFacts.length === 0 ? 1 : retainedFactsCount / sourceFacts.length;
    const semanticSimilarity = jaccard(significantTerms(source), significantTerms(compressed));
    const duplicateReduction = Math.max(0, duplicateDensity(source) - duplicateDensity(compressed));
    const compressionScore = Math.round((semanticSimilarity * 0.45 + informationRetention * 0.4 + Math.min(1, duplicateReduction + 0.15) * 0.15) * 100);

    return {
      compressionScore,
      semanticSimilarity: round(semanticSimilarity),
      duplicateReduction: round(duplicateReduction),
      informationRetention: round(informationRetention),
      retainedFactsCount
    };
  }
}

function significantTerms(text: string) {
  return new Set((text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? []).filter((term) => !stopwords.has(term)));
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = Array.from(a).filter((value) => b.has(value)).length;
  return intersection / Math.max(1, new Set([...a, ...b]).size);
}

function duplicateDensity(text: string) {
  const terms = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  if (terms.length === 0) return 0;
  return 1 - new Set(terms).size / terms.length;
}

function extractFacts(text: string) {
  return Array.from(
    new Set(
      text
        .split(/[.\n;]/)
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 18)
    )
  );
}

function round(value: number) {
  return Number(value.toFixed(3));
}

const stopwords = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "should", "would", "could", "about"]);
