import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { webhookRegistrationSchema, webhookReplaySchema } from "@/types/api";
import { AppKV } from "@/storage/app-kv";
import { AppFiles } from "@/storage/files";
import { createId } from "@/utils/id";
import { verifyWebhook } from "@/webhooks/signature";
import { dispatchWebhook } from "@/webhooks/dispatcher";
import { randomSecret } from "@/utils/crypto";
import { requireApiKey } from "@/middleware/auth";
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
  const endpoints = await Promise.all(index.map((item) => kv.get<Record<string, unknown>>(`webhook:${item.id}`)));
  return c.json({
    endpoints: endpoints.filter(Boolean).map((endpoint) => ({
      ...endpoint,
      secret: endpoint?.secret ? "whsec_..." : undefined
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
  return c.json({ events: await kv.getMany("webhook-event:") });
});

webhookRoutes.get("/webhooks/deliveries", requireApiKey("webhooks:write"), async (c) => {
  const kv = new AppKV((c.env ?? {}).CONTEXTKIT_KV);
  const index = await kv.getMany<{ id: string }>("webhook-delivery-index:");
  const deliveries = await Promise.all(index.map((item) => kv.get(`webhook-delivery:${item.id}`)));
  return c.json({ deliveries: deliveries.filter(Boolean) });
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
