import { x402Client, wrapFetchWithPayment, type PaymentPolicy } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { bankrHostedUrl } from "@/lib/bankr-x402";
import { createHostedDelegation, hostedDelegationHeader } from "@/lib/hosted-delegation";
import type { AppBindings } from "@/types/bindings";
import type { BillableEndpoint } from "@/types/api";

const BASE_NETWORK = "eip155:8453";
const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

export type BankrProxyMode =
  | "skill-compile"
  | "skill-validate"
  | "skill-push"
  | "skill-repository-publish"
  | "skill-search"
  | "skill-inspect"
  | "skill-buy"
  | "skill-clone"
  | "experience-save"
  | "experience-consider"
  | "experience-publish";

export type BankrProxyResult = {
  status: number;
  body: string;
  contentType: string;
  paymentResponse?: string;
};

type BankrProxyRequest = {
  endpoint: BillableEndpoint;
  mode?: BankrProxyMode;
  rawBody: string;
  ownerId: string;
  apiKeyId: string;
  requestId: string;
};

export function bankrCreditPayerConfigured(env: AppBindings["Bindings"] = {}) {
  const processEnv = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const privateKey = String(
    env.CONTEXTKIT_BANKR_X402_PAYER_PRIVATE_KEY
      ?? processEnv.CONTEXTKIT_BANKR_X402_PAYER_PRIVATE_KEY
      ?? ""
  );
  return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
}

export async function callBankrForCreditRequest(
  env: AppBindings["Bindings"],
  input: BankrProxyRequest,
  fetchImplementation: typeof fetch = fetch
): Promise<BankrProxyResult> {
  const route = resolveBankrProxyRoute(input.endpoint, input.mode);
  const processEnv = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const privateKey = String(env.CONTEXTKIT_BANKR_X402_PAYER_PRIVATE_KEY ?? processEnv.CONTEXTKIT_BANKR_X402_PAYER_PRIVATE_KEY ?? "");
  const internalToken = String(env.CONTEXTKIT_INTERNAL_TOKEN ?? processEnv.CONTEXTKIT_INTERNAL_TOKEN ?? "");
  if (!bankrCreditPayerConfigured(env)) throw new Error("bankr_x402_payer_not_configured");

  const body = buildBankrProxyBody(input.rawBody, input.endpoint, input.mode);
  const delegation = await createHostedDelegation(internalToken, {
    ownerId: input.ownerId,
    apiKeyId: input.apiKeyId,
    requestId: input.requestId,
    path: route.internalPath,
    body
  });

  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: privateKeyToAccount(privateKey as `0x${string}`),
    networks: [BASE_NETWORK],
    policies: [strictBankrPaymentPolicy(route.amountAtomic)]
  });
  const paidFetch = wrapFetchWithPayment(fetchImplementation, client);
  const response = await paidFetch(route.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [hostedDelegationHeader]: delegation,
      "X-ContextKit-X402-Payment-Id": input.requestId
    },
    body,
    signal: AbortSignal.timeout(75_000)
  });
  const responseBody = await response.text();

  return {
    status: response.status,
    body: responseBody,
    contentType: response.headers.get("content-type") ?? "application/json",
    paymentResponse: response.headers.get("payment-response") ?? response.headers.get("x-payment-response") ?? undefined
  };
}

export function buildBankrProxyBody(rawBody: string, endpoint: BillableEndpoint, mode?: BankrProxyMode) {
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    payload = parsed as Record<string, unknown>;
  } catch {
    throw new Error("invalid_bankr_proxy_json");
  }

  if (isCoreEndpoint(endpoint)) {
    return JSON.stringify({
      ...payload,
      endpoint,
      ...(endpoint === "memory-enrichment" ? { mode: "memory-enrichment" } : {})
    });
  }

  return JSON.stringify({
    ...payload,
    ...(mode ? { mode } : {})
  });
}

export function resolveBankrProxyRoute(endpoint: BillableEndpoint, mode?: BankrProxyMode) {
  if (isCoreEndpoint(endpoint)) {
    const profilePath = endpoint === "extract-profile" || endpoint === "memory-enrichment";
    return {
      url: bankrHostedUrl("contextkit-core"),
      internalPath: profilePath ? "/api/internal/extract-profile" : `/api/internal/${endpoint}`,
      amountAtomic: 30_000n
    };
  }

  if (endpoint === "experience-search") {
    return {
      url: bankrHostedUrl("contextkit-experience-search"),
      internalPath: "/api/internal/experience/search",
      amountAtomic: 10_000n
    };
  }

  if (endpoint === "experience-buy") {
    return {
      url: bankrHostedUrl("contextkit-experience-buy"),
      internalPath: "/api/internal/experience/buy",
      amountAtomic: 50_000n
    };
  }

  const internalPath = mode === "skill-compile" || mode === "experience-consider"
    ? "/api/internal/experience/consider"
    : mode === "skill-validate" || mode === "skill-push"
      ? "/api/internal/skills/push"
      : mode === "skill-repository-publish" || mode === "experience-publish"
        ? "/api/internal/experience/publish"
        : "/api/internal/experience/save";

  return {
    url: bankrHostedUrl("contextkit-experience-write"),
    internalPath,
    amountAtomic: 10_000n
  };
}

function strictBankrPaymentPolicy(expectedAmount: bigint): PaymentPolicy {
  return (_version, requirements) => requirements.filter((requirement) => {
    const network = String(requirement.network ?? "");
    const asset = String(requirement.asset ?? "").toLowerCase();
    const amount = String(requirement.amount ?? "0");
    return network === BASE_NETWORK &&
      asset === BASE_USDC &&
      /^\d+$/.test(amount) &&
      BigInt(amount) === expectedAmount;
  });
}

function isCoreEndpoint(endpoint: BillableEndpoint) {
  return ["summarize", "compress-context", "handoff", "extract-profile", "memory-enrichment"].includes(endpoint);
}
