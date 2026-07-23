import type { MiddlewareHandler } from "hono";
import {
  consumeRateLimit,
  environmentValue,
  positiveInteger,
  rateLimitHeaders,
  requestClientIdentity,
  tryAcquireConcurrency
} from "@/lib/rate-limit";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";

export function rateLimit(limit = 30, windowSeconds = 60): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    if (c.req.method === "OPTIONS" || isProbePath(c.req.path)) {
      await next();
      return;
    }

    const runtimeEnv = c.env ?? {};
    const decision = await consumeRateLimit(new AppKV(runtimeEnv.CONTEXTKIT_KV), {
      scope: "api",
      identity: requestClientIdentity(c.req.raw.headers),
      identityLimit: positiveInteger(
        runtimeEnv.CONTEXTKIT_RATE_LIMIT_PER_MINUTE ?? environmentValue("CONTEXTKIT_RATE_LIMIT_PER_MINUTE"),
        limit
      ),
      globalLimit: positiveInteger(
        runtimeEnv.CONTEXTKIT_GLOBAL_RATE_LIMIT_PER_MINUTE ?? environmentValue("CONTEXTKIT_GLOBAL_RATE_LIMIT_PER_MINUTE"),
        120
      ),
      windowSeconds
    });

    setRateLimitHeaders(c, decision);
    if (!decision.allowed) {
      return c.json(
        {
          error: {
            code: decision.scope === "global" ? "server_rate_limited" : "rate_limited",
            message: decision.scope === "global"
              ? "ContextKit is receiving too many requests. Retry shortly."
              : "Too many requests from this client. Retry after the rate limit window resets.",
            requestId: c.get("requestId"),
            retryAfterSeconds: decision.retryAfterSeconds
          }
        },
        429
      );
    }

    await next();
  };
}

export function concurrencyLimit(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    if (c.req.method === "OPTIONS" || isProbePath(c.req.path)) {
      await next();
      return;
    }

    const runtimeEnv = c.env ?? {};
    const maxGlobal = positiveInteger(
      runtimeEnv.CONTEXTKIT_MAX_CONCURRENT_REQUESTS ?? environmentValue("CONTEXTKIT_MAX_CONCURRENT_REQUESTS"),
      12
    );
    const maxPerClient = positiveInteger(
      runtimeEnv.CONTEXTKIT_MAX_CONCURRENT_REQUESTS_PER_CLIENT ?? environmentValue("CONTEXTKIT_MAX_CONCURRENT_REQUESTS_PER_CLIENT"),
      3
    );
    const identity = requestClientIdentity(c.req.raw.headers);
    const release = tryAcquireConcurrency(identity, maxGlobal, maxPerClient);
    if (!release) {
      c.header("Retry-After", "1");
      return c.json(
        {
          error: {
            code: "concurrency_limited",
            message: "Too many requests are already running. Retry shortly.",
            requestId: c.get("requestId"),
            retryAfterSeconds: 1
          }
        },
        429
      );
    }

    try {
      await next();
    } finally {
      release();
    }
  };
}

export function apiKeyRateLimit(limit = 600, windowSeconds = 60): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const apiKey = c.get("apiKey");
    if (!apiKey) {
      await next();
      return;
    }

    const key = `rate:key:${apiKey.id}`;
    const count = await new AppKV((c.env ?? {}).CONTEXTKIT_KV).increment(key, windowSeconds);

    if (count > limit) {
      c.header("Retry-After", String(windowSeconds));
      return c.json(
        {
          error: {
            code: "api_key_rate_limited",
            message: "API key rate limit exceeded.",
            requestId: c.get("requestId"),
            retryAfterSeconds: windowSeconds
          }
        },
        429
      );
    }

    await next();
  };
}

function isProbePath(path: string) {
  return path === "/api/health" || path === "/api/ready";
}

function setRateLimitHeaders(
  c: Parameters<MiddlewareHandler<AppBindings>>[0],
  decision: Awaited<ReturnType<typeof consumeRateLimit>>
) {
  for (const [name, value] of Object.entries(rateLimitHeaders(decision))) {
    c.header(name, value);
  }
}
