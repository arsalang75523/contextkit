import { AppKV } from "@/storage/app-kv";
import type { AppBindings } from "@/types/bindings";
import type { SignupInput } from "@/types/api";
import { createId } from "@/utils/id";
import { randomSecret, sha256 } from "@/utils/crypto";

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

  constructor(private readonly env: AppBindings["Bindings"] = {}) {
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

  async createPasswordReset(emailInput: string) {
    const email = normalizeEmail(emailInput);
    const accountId = await this.kv.get<string>(`account-email:${email}`);
    const genericResponse = {
      ok: true,
      message: "If this email belongs to a ContextKit account, a password reset email will be sent."
    };

    if (!accountId) {
      return genericResponse;
    }

    const token = `ck_reset_${randomSecret(32)}`;
    const tokenHash = await sha256(token);
    const resetId = createId("rst");
    const baseUrl = this.env.CONTEXTKIT_BASE_URL || this.env.CONTEXTKIT_BACKEND_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/dashboard/reset-password?token=${encodeURIComponent(token)}`;

    await this.kv.set(`password-reset:${tokenHash}`, {
      resetId,
      accountId,
      createdAt: new Date().toISOString()
    }, 15 * 60);

    await sendPasswordResetEmail(this.env, email, resetUrl);
    return genericResponse;
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = await sha256(token);
    const reset = await this.kv.get<{ accountId: string }>(`password-reset:${tokenHash}`);
    if (!reset?.accountId) return false;

    const account = await this.kv.get<AccountRecord>(`account:${reset.accountId}`);
    if (!account) return false;

    await this.kv.set(`account:${account.id}`, {
      ...account,
      passwordHash: await hashPassword(password)
    });
    await this.kv.set(`password-reset:${tokenHash}`, { ...reset, usedAt: new Date().toISOString() }, 1);
    return true;
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

async function sendPasswordResetEmail(env: AppBindings["Bindings"], to: string, resetUrl: string) {
  if (!env.RESEND_API_KEY || !env.CONTEXTKIT_EMAIL_FROM) {
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.CONTEXTKIT_EMAIL_FROM,
      to,
      subject: "Reset your ContextKit password",
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>Reset your ContextKit password</h2>
          <p>This link expires in 15 minutes.</p>
          <p><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#8fffd2;color:#07110d;padding:12px 16px;border-radius:8px;text-decoration:none">Reset password</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `
    })
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
