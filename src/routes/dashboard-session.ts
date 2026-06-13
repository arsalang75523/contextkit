import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ApiKeyService } from "@/services/api-key-service";
import { AccountService } from "@/services/account-service";
import { AnalyticsService } from "@/services/analytics-service";
import { ContextService } from "@/services/context-service";
import { CryptoTopUpService } from "@/services/crypto-topup-service";
import { AppKV } from "@/storage/app-kv";
import { createId } from "@/utils/id";
import { sanitizeMessages } from "@/utils/sanitize";
import { estimateReduction, estimateTokens } from "@/utils/tokens";
import { endpointPricing } from "@/lib/pricing";
import { createApiKeySchema, demoRunSchema, forgotPasswordSchema, loginSchema, playgroundRunSchema, resetPasswordSchema, signupSchema, verifyEmailSchema } from "@/types/api";
import type { AppBindings } from "@/types/bindings";
import type { ConversationMessage, ConversationRequest } from "@/types/api";

export const dashboardSessionRoutes = new Hono<AppBindings>();

dashboardSessionRoutes.post("/dashboard/signup", zValidator("json", signupSchema), async (c) => {
  const limited = await authActionRateLimit(c, "signup", 8, 60 * 60);
  if (limited) return limited;

  const accountService = new AccountService(c.env ?? {});
  const account = await accountService.signup(c.req.valid("json")).catch((error) => {
    if (error instanceof Error && error.message === "account_exists") return null;
    throw error;
  });

  if (!account) {
    return c.json({ error: { code: "account_exists", message: "An account already exists for this email.", requestId: c.get("requestId") } }, 409);
  }

  return c.json({
    account,
    emailVerificationRequired: true,
    message: "Account created. Check your email for a 6-digit verification code before logging in or creating API keys."
  }, 201);
});

dashboardSessionRoutes.post("/dashboard/login", zValidator("json", loginSchema), async (c) => {
  const email = c.req.valid("json").email.toLowerCase();
  const limited = await authActionRateLimit(c, `login:${email}`, 10, 15 * 60);
  if (limited) return limited;

  const accountService = new AccountService(c.env ?? {});
  const account = await accountService.login(c.req.valid("json").email, c.req.valid("json").password).catch((error) => {
    if (error instanceof Error && error.message === "email_not_verified") return "email_not_verified" as const;
    throw error;
  });
  if (account === "email_not_verified") {
    return c.json({
      error: {
        code: "email_not_verified",
        message: "Verify your email before logging in. You can request a new verification email.",
        requestId: c.get("requestId")
      }
    }, 403);
  }
  if (!account) {
    return c.json({ error: { code: "invalid_login", message: "Email or password is incorrect.", requestId: c.get("requestId") } }, 401);
  }
  const sessionId = await accountService.createSession(account.id);
  setSessionCookie(c, sessionId);
  return c.json({ ok: true, account });
});

dashboardSessionRoutes.post("/dashboard/resend-verification", zValidator("json", forgotPasswordSchema), async (c) => {
  const email = c.req.valid("json").email.toLowerCase();
  const limited = await authActionRateLimit(c, `verify:${email}`, 5, 60 * 60);
  if (limited) return limited;

  const result = await new AccountService(c.env ?? {}).resendVerification(email);
  return c.json(result);
});

dashboardSessionRoutes.post("/dashboard/verify-email", zValidator("json", verifyEmailSchema), async (c) => {
  const limited = await authActionRateLimit(c, "verify-email", 20, 15 * 60);
  if (limited) return limited;

  const account = await new AccountService(c.env ?? {}).verifyEmail(c.req.valid("json"));
  if (!account) {
    return c.json({ error: { code: "invalid_verification_token", message: "Verification token is invalid or expired.", requestId: c.get("requestId") } }, 401);
  }
  return c.json({ ok: true, account });
});

dashboardSessionRoutes.post("/dashboard/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const email = c.req.valid("json").email.toLowerCase();
  const limited = await authActionRateLimit(c, `forgot:${email}`, 5, 60 * 60);
  if (limited) return limited;

  const result = await new AccountService(c.env ?? {}).createPasswordReset(c.req.valid("json").email);
  return c.json(result);
});

dashboardSessionRoutes.post("/dashboard/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const limited = await authActionRateLimit(c, "reset-password", 10, 15 * 60);
  if (limited) return limited;

  const body = c.req.valid("json");
  const ok = await new AccountService(c.env ?? {}).resetPassword(body.token, body.password);
  if (!ok) {
    return c.json({ error: { code: "invalid_reset_token", message: "Reset token is invalid or expired.", requestId: c.get("requestId") } }, 401);
  }
  return c.json({ ok: true });
});

dashboardSessionRoutes.post("/dashboard/logout", async (c) => {
  const sessionId = readSessionId(c);
  await new AccountService(c.env ?? {}).revokeSession(sessionId);
  clearSessionCookie(c);
  return c.json({ ok: true });
});

dashboardSessionRoutes.get("/dashboard/me", async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId && !session?.apiKeyId) {
    return c.json({ authenticated: false });
  }

  if (!session.accountId && session.apiKeyId) {
    return c.json({
      authenticated: true,
      mode: "api-key",
      account: {
        id: session.apiKeyId,
        email: "api-key-session@contextkit.local",
        name: "API key session",
        company: "No dashboard account attached",
        defaultEnvironment: "live"
      }
    });
  }

  const accountId = session.accountId;
  if (!accountId) {
    return c.json({ authenticated: false });
  }
  const account = await new AccountService(c.env ?? {}).get(accountId);
  return c.json({ authenticated: Boolean(account), account });
});

dashboardSessionRoutes.post("/dashboard/create-key", zValidator("json", createApiKeySchema), async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId) {
    return c.json({ error: { code: "unauthorized", message: "Dashboard session required.", requestId: c.get("requestId") } }, 401);
  }
  const result = await new ApiKeyService(c.env ?? {}).create(c.req.valid("json"), session.accountId);
  return c.json({ key: result.key, apiKey: result.record }, 201);
});

dashboardSessionRoutes.post("/playground/run", zValidator("json", playgroundRunSchema), async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId && !session?.apiKeyId) {
    return c.json({ error: { code: "unauthorized", message: "Login or API-key session required to run the live playground.", requestId: c.get("requestId") } }, 401);
  }

  const ownerId = session.accountId ?? `api-key:${session.apiKeyId}`;
  const quota = await consumeDailyQuota(c, "playground-quota", ownerId, 3);
  if (!quota.allowed) {
    return c.json({
      error: {
        code: "playground_daily_limit",
        message: "Daily playground limit reached. Use Bankr-hosted x402 or direct API keys for production traffic.",
        requestId: c.get("requestId")
      },
      quota
    }, 429);
  }

  const body = c.req.valid("json");
  const request: ConversationRequest = { messages: sanitizeMessages(body.messages), mode: body.endpoint === "summarize" ? body.mode : undefined };
  const startedAt = Date.now();
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const result = await runPlaygroundEndpoint(service, body.endpoint, request);
  const output = JSON.stringify(result);
  const inputTokens = estimateTokens(request.messages as ConversationMessage[]);
  const outputTokens = estimateTokens(output);
  const latencyMs = Date.now() - startedAt;

  await new AnalyticsService(c.env ?? {}).recordRequest({
    requestId: c.get("requestId"),
    route: `/playground/${body.endpoint}`,
    latencyMs,
    inputTokens,
    outputTokens,
    ownerId,
    status: "success"
  });

  const payload = {
    endpoint: body.endpoint,
    requestId: c.get("requestId"),
    response: result,
    quota
  };

  if (body.endpoint === "summarize") {
    return c.json(payload);
  }

  return c.json({
    ...payload,
    metrics: {
      inputTokens,
      outputTokens,
      reductionPercent: estimateReduction(inputTokens, outputTokens),
      latencyMs
    }
  });
});

dashboardSessionRoutes.post("/demo/run", zValidator("json", demoRunSchema), async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId && !session?.apiKeyId) {
    return c.json({ error: { code: "unauthorized", message: "Login or API-key session required to run the live demo.", requestId: c.get("requestId") } }, 401);
  }

  const ownerId = session.accountId ?? `api-key:${session.apiKeyId}`;
  const quota = await consumeDailyQuota(c, "demo-quota", ownerId, 3);
  if (!quota.allowed) {
    return c.json({
      error: {
        code: "demo_daily_limit",
        message: "Daily demo limit reached. Use Bankr-hosted x402 or the API playground for more tests.",
        requestId: c.get("requestId")
      },
      quota
    }, 429);
  }

  const request: ConversationRequest = { messages: sanitizeMessages(c.req.valid("json").messages) };
  const startedAt = Date.now();
  const service = new ContextService({ env: c.env ?? {}, requestId: c.get("requestId") });
  const [summary, compression, handoff, profile, memory] = await Promise.all([
    service.summarize({ ...request, mode: "debug" }),
    service.compress(request),
    service.handoff(request),
    service.profile(request),
    service.memoryEnrichment(request)
  ]);

  const inputTokens = estimateTokens(request.messages as ConversationMessage[]);
  const compressedTokens = estimateTokens(compression.compressedContext);
  const outputTokens = estimateTokens(JSON.stringify({ summary, compression, handoff, profile, memory }));
  const latencyMs = Date.now() - startedAt;
  const totalX402CostUsd = Number((endpointPricing.summarize + endpointPricing["compress-context"] + endpointPricing.handoff + endpointPricing["extract-profile"] + endpointPricing["memory-enrichment"]).toFixed(3));

  await new AnalyticsService(c.env ?? {}).recordRequest({
    requestId: c.get("requestId"),
    route: "/demo/full",
    latencyMs,
    inputTokens,
    outputTokens,
    ownerId,
    status: "success"
  });

  return c.json({
    requestId: c.get("requestId"),
    outputs: {
      summary,
      compression,
      handoff,
      profile,
      memory
    },
    metrics: {
      inputTokens,
      compressedTokens,
      outputTokens,
      compressionReductionPercent: estimateReduction(inputTokens, compressedTokens),
      fullOutputReductionPercent: estimateReduction(inputTokens, outputTokens),
      latencyMs,
      totalX402CostUsd
    },
    quota
  });
});

dashboardSessionRoutes.post("/dashboard/session", async (c) => {
  const limited = await authActionRateLimit(c, "api-key-session", 20, 15 * 60);
  if (limited) return limited;

  const body = (await c.req.json().catch(() => ({}))) as { apiKey?: string };
  if (!body.apiKey) {
    return c.json({ error: { code: "missing_api_key", message: "API key is required.", requestId: c.get("requestId") } }, 400);
  }

  const record = await new ApiKeyService(c.env ?? {}).authenticate(body.apiKey);
  if (!record) {
    return c.json({ error: { code: "invalid_api_key", message: "API key is invalid or revoked.", requestId: c.get("requestId") } }, 401);
  }

  const sessionId = createId("sess");
  await new AppKV((c.env ?? {}).CONTEXTKIT_KV).set(`dashboard-session:${sessionId}`, {
    accountId: record.ownerId,
    apiKeyId: record.id,
    createdAt: new Date().toISOString()
  }, 60 * 60 * 12);

  setSessionCookie(c, sessionId);
  return c.json({ ok: true, apiKeyId: record.id, accountId: record.ownerId });
});

dashboardSessionRoutes.post("/dashboard/credits/top-up", async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId) {
    return c.json({ error: { code: "unauthorized", message: "Dashboard session required.", requestId: c.get("requestId") } }, 401);
  }

  const body = (await c.req.json().catch(() => ({}))) as { amountUsd?: number };
  if (typeof body.amountUsd !== "number" || body.amountUsd < 1) {
    return c.json({ error: { code: "invalid_topup_amount", message: "amountUsd must be at least 1.", requestId: c.get("requestId") } }, 400);
  }

  const invoice = await new CryptoTopUpService(c.env ?? {}).createInvoice({
    ownerId: session.accountId,
    amountUsd: body.amountUsd
  });
  return c.json({
    invoice,
    instructions: {
      network: "Base",
      asset: "USDC",
      send: invoice.amountUsdc,
      to: invoice.payTo,
      tokenContract: invoice.tokenContract,
      nextStep: "Send the USDC transaction, then paste the transaction hash to activate credits."
    }
  });
});

dashboardSessionRoutes.post("/dashboard/credits/verify", async (c) => {
  const session = await readDashboardSession(c);
  if (!session?.accountId) {
    return c.json({ error: { code: "unauthorized", message: "Dashboard session required.", requestId: c.get("requestId") } }, 401);
  }

  const body = (await c.req.json().catch(() => ({}))) as { invoiceId?: string; txHash?: string };
  if (!body.invoiceId || !body.txHash) {
    return c.json({ error: { code: "invalid_topup_verification", message: "invoiceId and txHash are required.", requestId: c.get("requestId") } }, 400);
  }

  const invoice = await new CryptoTopUpService(c.env ?? {}).verifyInvoice({
    ownerId: session.accountId,
    invoiceId: body.invoiceId,
    txHash: body.txHash
  });
  return c.json({ ok: true, invoice });
});

async function consumeDailyQuota(c: Context<AppBindings>, namespace: string, ownerId: string, limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `${namespace}:${ownerId}:${day}`;
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  const used = (await kv.get<number>(key)) ?? 0;
  if (used >= limit) {
    return { allowed: false, used, remaining: 0, limit, resetAt: nextUtcDayIso() };
  }
  const next = used + 1;
  await kv.set(key, next, 36 * 60 * 60);
  return { allowed: true, used: next, remaining: Math.max(0, limit - next), limit, resetAt: nextUtcDayIso() };
}

async function runPlaygroundEndpoint(service: ContextService, endpoint: string, request: ConversationRequest) {
  if (endpoint === "compress-context") return service.compress(request);
  if (endpoint === "handoff") return service.handoff(request);
  if (endpoint === "extract-profile") return service.profile(request);
  if (endpoint === "memory-enrichment") return service.memoryEnrichment(request);
  return service.summarize(request);
}

function nextUtcDayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

async function readDashboardSession(c: Context<AppBindings>) {
  return new AccountService(c.env ?? {}).getSession(readSessionId(c));
}

function readSessionId(c: Context<AppBindings>) {
  const cookie = c.req.header("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ck_session="))
    ?.slice("ck_session=".length);
}

function setSessionCookie(c: Context<AppBindings>, sessionId: string) {
  const secure = new URL(c.req.url).protocol === "https:" ? "; Secure" : "";
  c.header("Set-Cookie", `ck_session=${sessionId}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=43200`);
}

function clearSessionCookie(c: Context<AppBindings>) {
  const secure = new URL(c.req.url).protocol === "https:" ? "; Secure" : "";
  c.header("Set-Cookie", `ck_session=; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=0`);
}

async function authActionRateLimit(c: Context<AppBindings>, action: string, limit: number, windowSeconds: number) {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
  const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `auth-rate:${action}:${ip}:${windowId}`;
  const count = await new AppKV((c.env ?? {}).CONTEXTKIT_KV).increment(key, windowSeconds);

  if (count <= limit) return null;
  return c.json({
    error: {
      code: "auth_rate_limited",
      message: "Too many authentication attempts. Try again later.",
      requestId: c.get("requestId")
    }
  }, 429);
}
