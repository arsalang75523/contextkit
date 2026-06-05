import { readEnv } from "@/lib/env";
import { log } from "@/lib/logger";
import { AppFiles } from "@/storage/files";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import type { WebhookEvent } from "@/types/api";
import { signWebhook } from "@/webhooks/signature";

type DispatchOptions = {
  url?: string;
  event: WebhookEvent;
  context: { env?: AppBindings["Bindings"] };
};

export async function dispatchWebhook({ url, event, context }: DispatchOptions) {
  const env = context.env ?? {};
  const files = new AppFiles(env.CONTEXTKIT_FILES);
  const auditPath = `webhooks/${event.createdAt.slice(0, 10)}/${event.id}.json`;

  await files.writeJson(auditPath, {
    event,
    delivery: url ? "queued" : "no_endpoint",
    attempts: []
  });
  await files.writeJson(`webhooks/replay/${event.id}.json`, event);

  if (!url) return;

  const secret = readEnv({ env }).webhookSecret;
  const payload = JSON.stringify(event);
  const signature = await signWebhook(payload, secret);
  const attempts: unknown[] = [];
  const kv = new AppKV(env.CONTEXTKIT_KV);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ContextKit-Signature": signature,
          "ContextKit-Event": event.type,
          "ContextKit-Request-Id": event.requestId
        },
        body: payload
      });

      attempts.push({ attempt, status: response.status, at: new Date().toISOString() });
      if (response.ok) {
        await kv.increment("analytics:webhook-deliveries");
        break;
      }
    } catch (error) {
      attempts.push({ attempt, error: String(error), at: new Date().toISOString() });
      log("warn", "Webhook delivery failed", { eventId: event.id, attempt, error: String(error) });
    }
  }

  const succeeded = attempts.some((attempt) => typeof attempt === "object" && attempt !== null && "status" in attempt && Number((attempt as { status: number }).status) >= 200 && Number((attempt as { status: number }).status) < 300);
  if (!succeeded) {
    await kv.increment("analytics:webhook-failures");
  }

  await kv.set(`webhook-event:${event.id}`, event);
  await kv.set(`webhook-delivery:${event.id}`, { event, attempts, succeeded, url, updatedAt: new Date().toISOString() });
  await kv.set(`webhook-delivery-index:${event.id}`, { id: event.id });
  await files.writeJson(auditPath, { event, delivery: "attempted", attempts });
}
