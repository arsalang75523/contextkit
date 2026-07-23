import { Hono } from "hono";
import { hasDatabaseUrl } from "@/db/client";
import { readEnv } from "@/lib/env";
import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";

export const healthRoutes = new Hono<AppBindings>()
  .get("/health", (c) =>
    c.json({
      name: "ContextKit",
      status: "ok",
      time: new Date().toISOString()
    })
  )
  .get("/ready", async (c) => {
    const startedAt = Date.now();
    const env = readEnv(c);
    let storage: { status: "ok" | "error"; latencyMs: number; message?: string };

    try {
      const storageStartedAt = Date.now();
      if (!(c.env ?? {}).CONTEXTKIT_KV && !hasDatabaseUrl()) {
        throw new Error("Persistent storage is not configured.");
      }
      await new AppKV((c.env ?? {}).CONTEXTKIT_KV).get("system:readiness-probe");
      storage = { status: "ok", latencyMs: Date.now() - storageStartedAt };
    } catch {
      storage = {
        status: "error",
        latencyMs: Date.now() - startedAt,
        message: "Persistent storage is unavailable."
      };
    }

    const configuration = {
      bankrLlm: Boolean(env.bankrLlmKey),
      internalAuth: Boolean(env.internalToken),
      webhookSigning: Boolean(env.webhookSecret && env.webhookSecret !== "dev-webhook-secret-change-me"),
      x402Wallet: /^0x[a-fA-F0-9]{40}$/.test(env.x402PayTo)
        && env.x402PayTo !== "0x0000000000000000000000000000000000000000"
    };
    const configurationReady = Object.values(configuration).every(Boolean);
    const ready = storage.status === "ok";

    return c.json(
      {
        name: "ContextKit",
        status: ready && configurationReady ? "ready" : ready ? "degraded" : "unavailable",
        checks: {
          storage,
          configuration
        },
        latencyMs: Date.now() - startedAt,
        time: new Date().toISOString()
      },
      ready ? 200 : 503
    );
  });
