export type AppBindings = {
  Variables: {
    requestId: string;
    startedAt: number;
    payment?: {
      route: string;
      amountUsd: number;
      paymentId: string;
      payer?: string;
    };
    apiKey?: {
      id: string;
      hash: string;
      environment: "test" | "live";
      scopes: string[];
      name: string;
    };
  };
  Bindings: {
    CONTEXTKIT_KV?: KVNamespace;
    CONTEXTKIT_FILES?: R2Bucket;
    BANKR_LLM_KEY?: string;
    BANKR_LLM_BASE_URL?: string;
    BANKR_LLM_MODEL?: string;
    CONTEXTKIT_WEBHOOK_SECRET?: string;
    CONTEXTKIT_ADMIN_TOKEN?: string;
    X402_PAY_TO?: string;
    X402_NETWORK?: string;
    X402_FACILITATOR_URL?: string;
  };
};
