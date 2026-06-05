import { BankrLlmClient } from "@/lib/bankr-llm";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { createId } from "@/utils/id";
import { estimateReduction, estimateTokens } from "@/utils/tokens";
import { CompressionQualityService } from "@/services/compression-quality-service";
import type {
  CompressContextResponse,
  ContextEndpoint,
  ConversationRequest,
  HandoffResponse,
  ProfileResponse,
  SummarizeResponse,
  WebhookEventName
} from "@/types/api";
import type { AppBindings } from "@/types/bindings";

type ServiceContext = {
  env?: AppBindings["Bindings"];
  requestId: string;
};

export class ContextService {
  constructor(private readonly serviceContext: ServiceContext) {}

  async summarize(request: ConversationRequest): Promise<SummarizeResponse> {
    const output = await this.generate("summarize", request);
    const summary = String(output.summary ?? "");
    return {
      summary,
      tokenReductionEstimate: Number(output.tokenReductionEstimate ?? estimateReduction(estimateTokens(request.messages), estimateTokens(summary)))
    };
  }

  async compress(request: ConversationRequest): Promise<CompressContextResponse> {
    const output = await this.generate("compress-context", request);
    const compressedContext = String(output.compressedContext ?? "");
    const originalTokens = estimateTokens(request.messages);
    const compressedTokens = estimateTokens(compressedContext);
    const estimatedSavings = String(output.estimatedSavings ?? `${estimateReduction(originalTokens, compressedTokens)}%`);
    const quality = new CompressionQualityService().score(request.messages, compressedContext);

    return {
      compressedContext,
      estimatedSavings,
      quality: {
        duplicateDensity: Number((1 - compressedTokens / Math.max(originalTokens, 1)).toFixed(2)),
        contextScore: quality.compressionScore,
        semanticSimilarity: quality.semanticSimilarity,
        retainedFactsCount: quality.retainedFactsCount
      }
    };
  }

  async handoff(request: ConversationRequest): Promise<HandoffResponse> {
    const output = await this.generate("handoff", request);
    return {
      goal: String(output.goal ?? "unknown"),
      importantFacts: arrayOfStrings(output.importantFacts),
      constraints: arrayOfStrings(output.constraints),
      recommendedNextActions: arrayOfStrings(output.recommendedNextActions),
      tone: String(output.tone ?? "unknown"),
      userIntent: String(output.userIntent ?? "unknown")
    };
  }

  async profile(request: ConversationRequest): Promise<ProfileResponse> {
    const output = await this.generate("extract-profile", request);
    return {
      interests: arrayOfStrings(output.interests),
      riskTolerance: String(output.riskTolerance ?? "unknown"),
      communicationStyle: String(output.communicationStyle ?? "unknown"),
      preferences: arrayOfStrings(output.preferences),
      importantContext: arrayOfStrings(output.importantContext)
    };
  }

  async emitCompleted<T>(request: ConversationRequest, type: WebhookEventName, data: T) {
    await dispatchWebhook({
      url: request.webhookUrl,
      context: { env: this.serviceContext.env ?? {} },
      event: {
        id: createId("evt"),
        type,
        createdAt: new Date().toISOString(),
        requestId: this.serviceContext.requestId,
        data
      }
    });
  }

  private async generate(endpoint: ContextEndpoint, request: ConversationRequest) {
    return new BankrLlmClient({ env: this.serviceContext.env ?? {} }).generateJson(endpoint, request.messages);
  }
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}
