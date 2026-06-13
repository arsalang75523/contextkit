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
    creditCharge?: {
      ownerId: string;
      apiKeyId?: string;
      route: string;
      amountUsd: number;
    };
    apiKey?: {
      id: string;
      hash: string;
      environment: "test" | "live";
      scopes: string[];
      name: string;
      ownerId?: string;
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
    CONTEXTKIT_INTERNAL_TOKEN?: string;
    CONTEXTKIT_BASE_URL?: string;
    CONTEXTKIT_BACKEND_URL?: string;
    X402_PAY_TO?: string;
    X402_NETWORK?: string;
    X402_FACILITATOR_URL?: string;
    CREDIT_BASE_RPC_URL?: string;
    CREDIT_USDC_CONTRACT?: string;
    RESEND_API_KEY?: string;
    CONTEXTKIT_EMAIL_FROM?: string;
  };
};
