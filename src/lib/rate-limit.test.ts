import assert from "node:assert/strict";
import test from "node:test";
import { AppKV } from "@/storage/app-kv";
import {
  consumeRateLimit,
  rateLimitHeaders,
  requestClientIdentity,
  tryAcquireConcurrency
} from "@/lib/rate-limit";

class FakeKV {
  private readonly values = new Map<string, string>();

  async get<T>(key: string, type?: "json") {
    const value = this.values.get(key);
    if (value === undefined) return null as T | null;
    return (type === "json" ? JSON.parse(value) : value) as T;
  }

  async put(key: string, value: string) {
    this.values.set(key, value);
  }
}

function policy(identity: string, identityLimit = 2, globalLimit = 10) {
  return {
    scope: "test",
    identity,
    identityLimit,
    globalLimit,
    windowSeconds: 60
  };
}

test("rate limit blocks a client and returns retry headers", async () => {
  const kv = new AppKV(new FakeKV() as unknown as KVNamespace);

  assert.equal((await consumeRateLimit(kv, policy("client-a"))).allowed, true);
  assert.equal((await consumeRateLimit(kv, policy("client-a"))).allowed, true);

  const blocked = await consumeRateLimit(kv, policy("client-a"));
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.scope, "client");
  assert.equal(blocked.remaining, 0);
  assert.equal(blocked.retryAfterSeconds, 60);

  const headers = rateLimitHeaders(blocked);
  assert.equal(headers["RateLimit-Limit"], "2");
  assert.equal(headers["RateLimit-Remaining"], "0");
  assert.equal(headers["Retry-After"], "60");
});

test("rate limit protects the whole app after the global budget is reached", async () => {
  const kv = new AppKV(new FakeKV() as unknown as KVNamespace);

  assert.equal((await consumeRateLimit(kv, policy("client-a", 10, 2))).allowed, true);
  assert.equal((await consumeRateLimit(kv, policy("client-b", 10, 2))).allowed, true);

  const blocked = await consumeRateLimit(kv, policy("client-c", 10, 2));
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.scope, "global");
  assert.equal(blocked.limit, 2);
});

test("Cloudflare client identity wins over spoofable forwarded chains", () => {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.10",
    "x-forwarded-for": "198.51.100.20, 203.0.113.10"
  });

  assert.equal(requestClientIdentity(headers), "203.0.113.10");
  assert.equal(
    requestClientIdentity(new Headers({ "x-forwarded-for": "198.51.100.20, 203.0.113.10" })),
    "198.51.100.20"
  );
});

test("concurrency guard releases capacity after a request finishes", () => {
  const first = tryAcquireConcurrency("concurrency-test", 1, 1);
  assert.notEqual(first, null);
  assert.equal(tryAcquireConcurrency("concurrency-test", 1, 1), null);

  first?.();
  const second = tryAcquireConcurrency("concurrency-test", 1, 1);
  assert.notEqual(second, null);
  second?.();
});
