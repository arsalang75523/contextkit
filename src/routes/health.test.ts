import test from "node:test";
import assert from "node:assert/strict";
import { app } from "@/app-api";

function unavailableNamespace() {
  const unavailable = async () => {
    throw new Error("storage unavailable");
  };
  return {
    get: unavailable,
    put: unavailable,
    delete: unavailable,
    list: unavailable
  } as unknown as KVNamespace;
}

test("liveness remains healthy when persistent storage is unavailable", async () => {
  const response = await app.request("/api/health", {}, {
    CONTEXTKIT_KV: unavailableNamespace()
  });
  const body = await response.json() as { name: string; status: string };

  assert.equal(response.status, 200);
  assert.equal(body.name, "ContextKit");
  assert.equal(body.status, "ok");
  assert.equal(response.headers.get("RateLimit-Limit"), null);
});

test("readiness reports unavailable storage without changing liveness", async () => {
  const env = { CONTEXTKIT_KV: unavailableNamespace() };
  const readiness = await app.request("/api/ready", {}, env);
  const body = await readiness.json() as {
    status: string;
    checks: { storage: { status: string; message?: string } };
  };
  const liveness = await app.request("/api/health", {}, env);

  assert.equal(readiness.status, 503);
  assert.equal(body.status, "unavailable");
  assert.equal(body.checks.storage.status, "error");
  assert.equal(body.checks.storage.message, "Persistent storage is unavailable.");
  assert.equal(liveness.status, 200);
});
