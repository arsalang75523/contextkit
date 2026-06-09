import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import type { SignupInput } from "@/types/api";
import { createId } from "@/utils/id";
import { sha256 } from "@/utils/crypto";

export type AccountRecord = {
  id: string;
  email: string;
  name: string;
  company?: string;
  passwordHash: string;
  createdAt: string;
  defaultEnvironment: "test" | "live";
};

export class AccountService {
  private readonly kv: AppKV;

  constructor(env: AppBindings["Bindings"] = {}) {
    this.kv = new AppKV(env.CONTEXTKIT_KV);
  }

  async signup(input: SignupInput) {
    const email = normalizeEmail(input.email);
    const existingId = await this.kv.get<string>(`account-email:${email}`);
    if (existingId) {
      throw new Error("account_exists");
    }

    const account: AccountRecord = {
      id: createId("acct"),
      email,
      name: input.name,
      company: input.company,
      passwordHash: await hashPassword(input.password),
      createdAt: new Date().toISOString(),
      defaultEnvironment: "live"
    };

    await Promise.all([
      this.kv.set(`account:${account.id}`, account),
      this.kv.set(`account-email:${email}`, account.id)
    ]);

    return publicAccount(account);
  }

  async login(emailInput: string, password: string) {
    const email = normalizeEmail(emailInput);
    const id = await this.kv.get<string>(`account-email:${email}`);
    if (!id) return null;
    const account = await this.kv.get<AccountRecord>(`account:${id}`);
    if (!account) return null;
    const ok = account.passwordHash === await hashPassword(password);
    return ok ? publicAccount(account) : null;
  }

  async get(id: string) {
    const account = await this.kv.get<AccountRecord>(`account:${id}`);
    return account ? publicAccount(account) : null;
  }

  async createSession(accountId: string) {
    const sessionId = createId("sess");
    await this.kv.set(`dashboard-session:${sessionId}`, {
      accountId,
      createdAt: new Date().toISOString()
    }, 60 * 60 * 12);
    return sessionId;
  }

  async getSession(sessionId?: string) {
    if (!sessionId) return null;
    return this.kv.get<{ accountId?: string; apiKeyId?: string; createdAt: string }>(`dashboard-session:${sessionId}`);
  }
}

function publicAccount(account: AccountRecord) {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    company: account.company,
    createdAt: account.createdAt,
    defaultEnvironment: account.defaultEnvironment
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  return sha256(`contextkit-password-v1:${password}`);
}
