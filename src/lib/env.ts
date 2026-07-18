type EnvLike = Record<string, string | undefined>;

export function readEnv(c?: { env?: Record<string, unknown> }) {
  const runtimeEnv = c?.env ?? {};
  const processEnv: EnvLike = typeof process !== "undefined" ? process.env : {};

  const get = (key: string, fallback = "") =>
    String(runtimeEnv[key] ?? processEnv[key] ?? fallback);
  const bankrLlmModel = get("BANKR_LLM_MODEL", "claude-sonnet-4.5");

  return {
    bankrLlmKey: get("BANKR_LLM_KEY"),
    bankrLlmBaseUrl: get("BANKR_LLM_BASE_URL", "https://llm.bankr.bot/v1"),
    bankrLlmModel,
    bankrSkillLlmModel: get("BANKR_SKILL_LLM_MODEL", bankrLlmModel),
    contextkitBaseUrl: get("CONTEXTKIT_BASE_URL"),
    internalToken: get("CONTEXTKIT_INTERNAL_TOKEN"),
    webhookSecret: get("CONTEXTKIT_WEBHOOK_SECRET", "dev-webhook-secret-change-me"),
    adminToken: get("CONTEXTKIT_ADMIN_TOKEN"),
    x402PayTo: get("X402_PAY_TO", "0x0000000000000000000000000000000000000000"),
    x402Network: get("X402_NETWORK", "base"),
    x402FacilitatorUrl: get("X402_FACILITATOR_URL", "https://facilitator.x402.org"),
    creditBaseRpcUrl: get("CREDIT_BASE_RPC_URL", "https://mainnet.base.org"),
    creditUsdcContract: get("CREDIT_USDC_CONTRACT", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")
  };
}
