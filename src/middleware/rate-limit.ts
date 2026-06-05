import type { MiddlewareHandler } from "hono";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";

export function rateLimit(limit = 120, windowSeconds = 60): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "local";
    const key = `rate:${ip}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const count = await new AppKV((c.env ?? {}).CONTEXTKIT_KV).increment(key, windowSeconds);

    if (count > limit) {
      return c.json(
        {
          error: {
            code: "rate_limited",
            message: "Too many requests. Retry after the rate limit window resets.",
            requestId: c.get("requestId")
          }
        },
        429
      );
    }

    await next();
  };
}

export function apiKeyRateLimit(limit = 600, windowSeconds = 60): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const apiKey = c.get("apiKey");
    if (!apiKey) {
      await next();
      return;
    }

    const key = `rate:key:${apiKey.id}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const count = await new AppKV((c.env ?? {}).CONTEXTKIT_KV).increment(key, windowSeconds);

    if (count > limit) {
      return c.json(
        {
          error: {
            code: "api_key_rate_limited",
            message: "API key rate limit exceeded.",
            requestId: c.get("requestId")
          }
        },
        429
      );
    }

    await next();
  };
}
