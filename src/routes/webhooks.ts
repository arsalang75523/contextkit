import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { webhookRegistrationSchema, webhookReplaySchema } from "@/types/api";
import { AppKV } from "@/storage/app-kv";
import { AppFiles } from "@/storage/files";
import { createId } from "@/utils/id";
import { verifyWebhook } from "@/webhooks/signature";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { randomSecret } from "@/utils/crypto";
import { requireApiKey } from "@/middleware/auth";
import { ApiKeyService } from "@/services/api-key-service";
import type { AppBindings } from "@/types/bindings";
import type { WebhookEvent } from "@/types/api";

export const webhookRoutes = new Hono<AppBindings>();

webhookRoutes.post("/webhooks/register", requireApiKey("webhooks:write"), zValidator("json", webhookRegistrationSchema), async (c) => {
  const registration = c.req.valid("json");
  const id = createId("wh");
  const secret = registration.secret ?? `whsec_${randomSecret(28)}`;
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  await kv.set(`webhook:${id}`, {
    id,
    ...registration,
    secret,
    apiKeyId: c.get("apiKey")?.id,
    createdAt: new Date().toISOString()
  });

  await kv.set(`webhook-index:${id}`, { id });
  return c.json({ id, secret, status: "active" }, 201);
});

webhookRoutes.get("/webhooks/endpoints", requireApiKey("webhooks:write"), async (c) => {
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  const index = await kv.getMany<{ id: string }>("webhook-index:");
  const allowedApiKeyIds = await visibleApiKeyIds(c);
  const endpoints = await Promise.all(index.map((item) => kv.get<Record<string, unknown>>(`webhook:${item.id}`)));
  return c.json({
    endpoints: endpoints
      .filter((endpoint): endpoint is Record<string, unknown> => Boolean(endpoint))
      .filter((endpoint) => !allowedApiKeyIds || allowedApiKeyIds.has(String(endpoint.apiKeyId)))
      .map((endpoint) => ({
        ...endpoint,
        secret: endpoint.secret ? "whsec_..." : undefined
      }))
  });
});

webhookRoutes.post("/webhooks/verify", async (c) => {
  const signature = c.req.header("ContextKit-Signature") ?? "";
  const body = await c.req.text();
  const ok = await verifyWebhook(body, signature, (c.env ?? {}).CONTEXTKIT_WEBHOOK_SECRET ?? "dev-webhook-secret-change-me");
  return c.json({ valid: ok });
});

webhookRoutes.post("/webhooks/replay", requireApiKey("webhooks:write"), zValidator("json", webhookReplaySchema), async (c) => {
  const { eventId, url } = c.req.valid("json");
  const event = await new AppFiles((c.env ?? {}).CONTEXTKIT_FILES).readJson<WebhookEvent>(`webhooks/replay/${eventId}.json`);
  if (!event) {
    return c.json({ error: { code: "not_found", message: "Webhook event not found.", requestId: c.get("requestId") } }, 404);
  }

  await dispatchWebhook({ url, event, context: { env: c.env ?? {} } });
  return c.json({ replayed: true, eventId });
});

webhookRoutes.get("/webhooks/events", requireApiKey("webhooks:write"), async (c) => {
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  const allowedApiKeyIds = await visibleApiKeyIds(c);
  const events = await kv.getMany<Record<string, unknown>>("webhook-event:");
  return c.json({ events: events.filter((event) => !allowedApiKeyIds || allowedApiKeyIds.has(String(event.apiKeyId))) });
});

webhookRoutes.get("/webhooks/deliveries", requireApiKey("webhooks:write"), async (c) => {
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  const allowedApiKeyIds = await visibleApiKeyIds(c);
  const index = await kv.getMany<{ id: string }>("webhook-delivery-index:");
  const deliveries = await Promise.all(index.map((item) => kv.get(`webhook-delivery:${item.id}`)));
  return c.json({
    deliveries: deliveries.filter((delivery): delivery is Record<string, unknown> => {
      if (!delivery || typeof delivery !== "object") return false;
      const record = delivery as Record<string, unknown>;
      return !allowedApiKeyIds || allowedApiKeyIds.has(String(record.apiKeyId));
    })
  });
});

webhookRoutes.post("/webhooks/:id/rotate-secret", requireApiKey("webhooks:write"), async (c) => {
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  const id = c.req.param("id");
  const webhook = await kv.get<Record<string, unknown>>(`webhook:${id}`);
  if (!webhook) {
    return c.json({ error: { code: "not_found", message: "Webhook endpoint not found.", requestId: c.get("requestId") } }, 404);
  }
  const secret = `whsec_${randomSecret(28)}`;
  await kv.set(`webhook:${id}`, { ...webhook, secret, rotatedAt: new Date().toISOString() });
  return c.json({ id, secret });
});

async function visibleApiKeyIds(c: Context<AppBindings>) {
  const ownerId = c.get("apiKey")?.ownerId;
  if (!ownerId) return undefined;
  const keys = await new ApiKeyService(c.env ?? {}).list(ownerId);
  return new Set(keys.map((key) => key.id));
}
