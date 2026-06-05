import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import type { CreateApiKeyInput } from "@/types/api";
import { createId } from "@/utils/id";
import { maskSecret, randomSecret, sha256 } from "@/utils/crypto";

export type ApiKeyRecord = {
  id: string;
  hash: string;
  prefix: string;
  name: string;
  environment: "test" | "live";
  scopes: string[];
  revokedAt?: string;
  createdAt: string;
  lastUsedAt?: string;
  totalRequests: number;
  totalSpend: number;
  endpointUsage: Record<string, number>;
};

export class ApiKeyService {
  private readonly kv: AppKV;

  constructor(env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async create(input: CreateApiKeyInput) {
    const id = createId("key");
    const prefix = input.environment === "live" ? "ck_live" : "ck_test";
    const secret = `${prefix}_${randomSecret(30)}`;
    const hash = await sha256(secret);
    const record: ApiKeyRecord = {
      id,
      hash,
      prefix,
      name: input.name,
      environment: input.environment,
      scopes: input.scopes,
      createdAt: new Date().toISOString(),
      totalRequests: 0,
      totalSpend: 0,
      endpointUsage: {}
    };

    await Promise.all([
      this.kv.set(`api-key:${hash}`, record),
      this.kv.set(`api-key-id:${id}`, hash),
      this.kv.set(`api-key-index:${id}`, { id, hash })
    ]);

    return {
      key: secret,
      record: this.publicRecord(record, secret)
    };
  }

  async authenticate(secret: string) {
    const hash = await sha256(secret);
    const record = await this.kv.get<ApiKeyRecord>(`api-key:${hash}`);
    if (!record || record.revokedAt) return null;
    return record;
  }

  async revoke(keyId: string) {
    const hash = await this.kv.get<string>(`api-key-id:${keyId}`);
    if (!hash) return false;
    const record = await this.kv.get<ApiKeyRecord>(`api-key:${hash}`);
    if (!record) return false;
    await this.kv.set(`api-key:${hash}`, { ...record, revokedAt: new Date().toISOString() });
    return true;
  }

  async list() {
    const index = await this.kv.getMany<{ id: string; hash: string }>("api-key-index:");
    const records = await Promise.all(index.map((item) => this.kv.get<ApiKeyRecord>(`api-key:${item.hash}`)));
    return records.filter((record): record is ApiKeyRecord => Boolean(record)).map((record) => this.publicRecord(record));
  }

  async recordUsage(hash: string, route: string, spend: number) {
    const record = await this.kv.get<ApiKeyRecord>(`api-key:${hash}`);
    if (!record) return;
    await this.kv.set(`api-key:${hash}`, {
      ...record,
      lastUsedAt: new Date().toISOString(),
      totalRequests: record.totalRequests + 1,
      totalSpend: Number((record.totalSpend + spend).toFixed(6)),
      endpointUsage: {
        ...record.endpointUsage,
        [route]: (record.endpointUsage[route] ?? 0) + 1
      }
    });
  }

  async usage(keyId?: string) {
    const records = await this.list();
    const selected = keyId ? records.filter((record) => record.id === keyId) : records;
    return {
      keys: selected,
      totalRequests: selected.reduce((sum, record) => sum + record.totalRequests, 0),
      totalSpend: selected.reduce((sum, record) => sum + record.totalSpend, 0)
    };
  }

  private publicRecord(record: ApiKeyRecord, secret?: string) {
    return {
      id: record.id,
      name: record.name,
      environment: record.environment,
      scopes: record.scopes,
      prefix: record.prefix,
      maskedKey: secret ? maskSecret(secret) : `${record.prefix}_...`,
      revokedAt: record.revokedAt,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      totalRequests: record.totalRequests,
      totalSpend: record.totalSpend,
      endpointUsage: record.endpointUsage
    };
  }
}
