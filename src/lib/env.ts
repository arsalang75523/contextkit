type EnvLike = Record<string, string | undefined>;

export function readEnv(c?: { env?: Record<string, unknown> }) {
  const runtimeEnv = c?.env ?? {};
  const processEnv: EnvLike = typeof process !== "undefined" ? process.env : {};

  const get = (key: string, fallback = "") =>
    String(runtimeEnv[key] ?? processEnv[key] ?? fallback);

  return {
    bankrLlmKey: get("BANKR_LLM_KEY"),
    bankrLlmBaseUrl: get("BANKR_LLM_BASE_URL", "https://llm.bankr.bot/v1"),
    bankrLlmModel: get("BANKR_LLM_MODEL", "claude-sonnet-4.5"),
    contextkitBaseUrl: get("CONTEXTKIT_BASE_URL"),
    webhookSecret: get("CONTEXTKIT_WEBHOOK_SECRET", "dev-webhook-secret-change-me"),
    adminToken: get("CONTEXTKIT_ADMIN_TOKEN"),
    x402PayTo: get("X402_PAY_TO", "0x0000000000000000000000000000000000000000"),
    x402Network: get("X402_NETWORK", "base"),
    x402FacilitatorUrl: get("X402_FACILITATOR_URL", "https://facilitator.x402.org")
  };
}
