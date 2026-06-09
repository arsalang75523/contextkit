import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ApiKeyService } from "@/services/api-key-service";
import { AccountService } from "@/services/account-service";
import { AnalyticsService } from "@/services/analytics-service";
import { ContextService } from "@/services/context-service";
import { AppKV } from "@/storage/app-kv";
import { createId } from "@/utils/id";
import { sanitizeMessages } from "@/utils/sanitize";
import { estimateReduction, estimateTokens } from "@/utils/tokens";
import { endpointPricing } from "@/lib/pricing";
import { createApiKeySchema, demoRunSchema, forgotPasswordSchema, loginSchema, playgroundRunSchema, resetPasswordSchema, signupSchema } from "@/types/api";
import type { AppBindings } from "@/types/bindings";
import type { ConversationMessage, ConversationRequest } from "@/types/api";

export const dashboardSessionRoutes = new Hono<AppBindings>();

dashboardSessionRoutes.post("/dashboard/signup", zValidator("json", signupSchema), async (c) => {
  const accountService = new AccountService(c.env ?? {});
  const account = await accountService.signup(c.req.valid("json")).catch((error) => {
    if (error instanceof Error && error.message === "account_exists") return null;
    throw error;
  });

  if (!account) {
    return c.json({ error: { code: "account_exists", message: "An account already exists for this email.", requestId: c.get("requestId") } }, 409);
  }

  const firstKey = await new ApiKeyService(c.env ?? {}).create({
    name: "Default live key",
    environment: "live",
    scopes: ["context:write", "analytics:read", "webhooks:write", "keys:read"]
  }, account.id);
  const sessionId = await accountService.createSession(account.id);
  setSessionCookie(c, sessionId);
  return c.json({ account, key: firstKey.key, apiKey: firstKey.record }, 201);
});

dashboardSessionRoutes.post("/dashboard/login", zValidator("json", loginSchema), async (c) => {
  const account = await new AccountService(c.env ?? {}).login(c.req.valid("json").email, c.req.valid("json").password);
  if (!account) {
    return c.json({ error: { code: "invalid_login", message: "Email or password is incorrect.", requestId: c.get("requestId") } }, 401);
  }
  const sessionId = await new AccountService(c.env ?? {}).createSession(account.id);
  setSessionCookie(c, sessionId);
  return c.json({ ok: true, account });
});

dashboardSessionRoutes.post("/dashboard/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const result = await new AccountService(c.env ?? {}).createPasswordReset(c.req.valid("json").email);
  return c.json(result);
});

dashboardSessionRoutes.post("/dashboard/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const body = c.req.valid("json");
  const ok = await new AccountService(c.env ?? {}).resetPassword(body.token, body.password);
  if (!ok) {
    return c.json({ error: { code: "invalid_reset_token", message: "Reset token is invalid or expired.", requestId: c.get("requestId") } }, 401);
  }
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
  const request: ConversationRequest = { messages: sanitizeMessages(body.messages) };
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

  return c.json({
    endpoint: body.endpoint,
    requestId: c.get("requestId"),
    response: result,
    metrics: {
      inputTokens,
      outputTokens,
      reductionPercent: estimateReduction(inputTokens, outputTokens),
      latencyMs
    },
    quota
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
  const [summary, compression, handoff, profile] = await Promise.all([
    service.summarize(request),
    service.compress(request),
    service.handoff(request),
    service.profile(request)
  ]);

  const inputTokens = estimateTokens(request.messages as ConversationMessage[]);
  const compressedTokens = estimateTokens(compression.compressedContext);
  const outputTokens = estimateTokens(JSON.stringify({ summary, compression, handoff, profile }));
  const latencyMs = Date.now() - startedAt;
  const totalX402CostUsd = Number(Object.values(endpointPricing).reduce((sum, price) => sum + price, 0).toFixed(3));

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
      profile
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
  return service.summarize(request);
}

function nextUtcDayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

async function readDashboardSession(c: Context<AppBindings>) {
  const cookie = c.req.header("cookie") ?? "";
  const sessionId = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ck_session="))
    ?.slice("ck_session=".length);
  return new AccountService(c.env ?? {}).getSession(sessionId);
}

function setSessionCookie(c: Context<AppBindings>, sessionId: string) {
  const secure = new URL(c.req.url).protocol === "https:" ? "; Secure" : "";
  c.header("Set-Cookie", `ck_session=${sessionId}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=43200`);
}
