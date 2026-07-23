import { and, eq, gt, isNull, like, or, sql } from "drizzle-orm";
import { db, hasDatabaseUrl } from "@/db/client";
import { kvStore } from "@/db/schema";

type StoredValue = unknown;

const memoryKV = new Map<string, { value: StoredValue; expiresAt?: number }>();
const localStoragePath = ".contextkit/local-kv.json";

export class AppKV {
  constructor(private readonly kv?: KVNamespace) {}

  async get<T extends StoredValue>(key: string): Promise<T | null> {
    if (this.kv) {
      return this.kv.get<T>(key, "json");
    }

    if (hasDatabaseUrl()) {
      const [row] = await db()
        .select({ value: kvStore.value })
        .from(kvStore)
        .where(and(eq(kvStore.key, key), or(isNull(kvStore.expiresAt), gt(kvStore.expiresAt, new Date()))))
        .limit(1);
      return row ? (row.value as T) : null;
    }

    const entry = memoryKV.get(key);
    if (!entry) {
      await hydrateLocalKV();
    }
    const hydratedEntry = memoryKV.get(key);
    if (!hydratedEntry) return null;
    if (hydratedEntry.expiresAt && hydratedEntry.expiresAt < Date.now()) {
      memoryKV.delete(key);
      await persistLocalKV();
      return null;
    }
    return hydratedEntry.value as T;
  }

  async set(key: string, value: StoredValue, ttlSeconds?: number) {
    if (this.kv) {
      await this.kv.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined);
      return;
    }

    if (hasDatabaseUrl()) {
      const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
      await db()
        .insert(kvStore)
        .values({ key, value, expiresAt, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: kvStore.key,
          set: {
            value,
            expiresAt,
            updatedAt: new Date()
          }
        });
      return;
    }

    memoryKV.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
    await persistLocalKV();
  }

  async increment(key: string, ttlSeconds?: number) {
    if (!this.kv && hasDatabaseUrl()) {
      const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
      const expired = sql`${kvStore.expiresAt} IS NOT NULL AND ${kvStore.expiresAt} <= NOW()`;
      const [row] = await db()
        .insert(kvStore)
        .values({ key, value: 1, expiresAt, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: kvStore.key,
          set: {
            value: sql`CASE
              WHEN ${expired} THEN '1'::jsonb
              ELSE to_jsonb(COALESCE((${kvStore.value} #>> '{}')::bigint, 0) + 1)
            END`,
            expiresAt: ttlSeconds
              ? sql`CASE WHEN ${expired} THEN ${expiresAt} ELSE COALESCE(${kvStore.expiresAt}, ${expiresAt}) END`
              : kvStore.expiresAt,
            updatedAt: sql`NOW()`
          }
        })
        .returning({ value: kvStore.value });
      return Number(row?.value ?? 1);
    }

    const current = (await this.get<number>(key)) ?? 0;
    const next = current + 1;
    await this.set(key, next, ttlSeconds);
    return next;
  }

  async list(prefix: string) {
    if (this.kv) {
      const result = await this.kv.list({ prefix });
      return result.keys.map((key: { name: string }) => key.name);
    }

    if (hasDatabaseUrl()) {
      const rows = await db()
        .select({ key: kvStore.key })
        .from(kvStore)
        .where(and(like(kvStore.key, `${prefix}%`), or(isNull(kvStore.expiresAt), gt(kvStore.expiresAt, new Date()))));
      return rows.map((row) => row.key);
    }

    await hydrateLocalKV();
    return Array.from(memoryKV.keys()).filter((key) => key.startsWith(prefix));
  }

  async getMany<T extends StoredValue>(prefix: string): Promise<T[]> {
    const keys = await this.list(prefix);
    const values: T[] = [];
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        values.push(value);
      }
    }
    return values;
  }
}

async function hydrateLocalKV() {
  if (typeof process === "undefined") return;
  const { readFile } = await import("node:fs/promises");
  try {
    const raw = await readFile(localStoragePath, "utf8");
    const parsed = JSON.parse(raw) as Array<[string, { value: StoredValue; expiresAt?: number }]>;
    parsed.forEach(([key, value]) => memoryKV.set(key, value));
  } catch {
    // Local persistence is best-effort; production should bind durable KV.
  }
}

async function persistLocalKV() {
  if (typeof process === "undefined") return;
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(localStoragePath), { recursive: true });
  await writeFile(localStoragePath, JSON.stringify(Array.from(memoryKV.entries())), "utf8");
}
