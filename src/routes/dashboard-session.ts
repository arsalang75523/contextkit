import { Hono } from "hono";
import { ApiKeyService } from "@/services/api-key-service";
import { AppKV } from "@/storage/app-kv";
import { createId } from "@/utils/id";
import type { AppBindings } from "@/types/bindings";

export const dashboardSessionRoutes = new Hono<AppBindings>();

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
    apiKeyId: record.id,
    createdAt: new Date().toISOString()
  }, 60 * 60 * 12);

  const secure = new URL(c.req.url).protocol === "https:" ? "; Secure" : "";
  c.header("Set-Cookie", `ck_session=${sessionId}; HttpOnly${secure}; SameSite=Lax; Path=/dashboard; Max-Age=43200`);
  return c.json({ ok: true, apiKeyId: record.id });
});
