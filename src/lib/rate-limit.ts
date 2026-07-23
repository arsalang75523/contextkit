import { AppKV } from "@/storage/app-kv";

export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
  scope: "client" | "global";
};

type RateLimitPolicy = {
  scope: string;
  identity: string;
  identityLimit: number;
  globalLimit: number;
  windowSeconds: number;
};

let activeRequests = 0;
const activeRequestsByIdentity = new Map<string, number>();

export async function consumeRateLimit(kv: AppKV, policy: RateLimitPolicy): Promise<RateLimitDecision> {
  const now = Date.now();
  const resetAt = now + policy.windowSeconds * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));
  const clientCount = await kv.increment(`rate:${policy.scope}:client:${policy.identity}`, policy.windowSeconds);

  if (clientCount > policy.identityLimit) {
    return {
      allowed: false,
      limit: policy.identityLimit,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
      scope: "client"
    };
  }

  const globalCount = await kv.increment(`rate:${policy.scope}:global`, policy.windowSeconds);
  if (globalCount > policy.globalLimit) {
    return {
      allowed: false,
      limit: policy.globalLimit,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
      scope: "global"
    };
  }

  return {
    allowed: true,
    limit: policy.identityLimit,
    remaining: Math.max(0, policy.identityLimit - clientCount),
    resetAt,
    retryAfterSeconds,
    scope: "client"
  };
}

export function rateLimitHeaders(decision: RateLimitDecision) {
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(decision.remaining),
    "RateLimit-Reset": String(Math.ceil(decision.resetAt / 1000)),
    "X-RateLimit-Limit": String(decision.limit),
    "X-RateLimit-Remaining": String(decision.remaining),
    "X-RateLimit-Reset": String(Math.ceil(decision.resetAt / 1000))
  };

  if (!decision.allowed) {
    headers["Retry-After"] = String(decision.retryAfterSeconds);
  }

  return headers;
}

export function requestClientIdentity(headers: Headers) {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return safeIdentity(cloudflareIp);

  const forwardedIp = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  if (forwardedIp) return safeIdentity(forwardedIp);

  return "local";
}

export function positiveInteger(value: unknown, fallback: number, minimum = 1, maximum = 100_000) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function tryAcquireConcurrency(identity: string, maxGlobal: number, maxPerIdentity: number) {
  const activeForIdentity = activeRequestsByIdentity.get(identity) ?? 0;
  if (activeRequests >= maxGlobal || activeForIdentity >= maxPerIdentity) {
    return null;
  }

  activeRequests += 1;
  activeRequestsByIdentity.set(identity, activeForIdentity + 1);
  return () => {
    activeRequests = Math.max(0, activeRequests - 1);
    const remaining = (activeRequestsByIdentity.get(identity) ?? 1) - 1;
    if (remaining <= 0) activeRequestsByIdentity.delete(identity);
    else activeRequestsByIdentity.set(identity, remaining);
  };
}

export function environmentValue(key: string) {
  return typeof process !== "undefined" ? process.env[key] : undefined;
}

function safeIdentity(value: string) {
  return value.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 64) || "unknown";
}
