import type { MiddlewareHandler } from "hono";
import { readEnv } from "@/lib/env";
import { ApiKeyService } from "@/services/api-key-service";
import type { AppBindings } from "@/types/bindings";

export function requireApiKey(scope?: string): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const authorization = c.req.header("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return c.json({ error: { code: "unauthorized", message: "Authorization: Bearer <api_key> is required.", requestId: c.get("requestId") } }, 401);
    }

    const record = await new ApiKeyService(c.env ?? {}).authenticate(token);
    if (!record) {
      return c.json({ error: { code: "invalid_api_key", message: "API key is invalid or revoked.", requestId: c.get("requestId") } }, 401);
    }

    if (scope && !record.scopes.includes(scope)) {
      return c.json({ error: { code: "insufficient_scope", message: `API key requires ${scope}.`, requestId: c.get("requestId") } }, 403);
    }

    c.set("apiKey", {
      id: record.id,
      hash: record.hash,
      environment: record.environment,
      scopes: record.scopes,
      name: record.name
    });
    await next();
  };
}

export function requireAdmin(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const expected = readEnv({ env: c.env ?? {} }).adminToken;
    if (!expected) {
      return c.json({ error: { code: "admin_not_configured", message: "CONTEXTKIT_ADMIN_TOKEN must be configured before issuing API keys.", requestId: c.get("requestId") } }, 503);
    }

    const authorization = c.req.header("authorization") ?? "";
    if (authorization !== `Bearer ${expected}`) {
      return c.json({ error: { code: "admin_unauthorized", message: "Admin bearer token required.", requestId: c.get("requestId") } }, 401);
    }

    await next();
  };
}
