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
  emailVerifiedAt?: string;
  sessionVersion: number;
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
      sessionVersion: 1,
      defaultEnvironment: "live"
    };

    await Promise.all([
      this.kv.set(`account:${account.id}`, account),
      this.kv.set(`account-email:${email}`, account.id)
    ]);

    await this.sendEmailVerification(account);
    return publicAccount(account);
  }

  async login(emailInput: string, password: string) {
    const email = normalizeEmail(emailInput);
    const id = await this.kv.get<string>(`account-email:${email}`);
    if (!id) return null;
    const account = await this.kv.get<AccountRecord>(`account:${id}`);
    if (!account) return null;
    const verification = await verifyPassword(password, account.passwordHash);
    if (!verification.ok) return null;
    if (verification.needsRehash) {
      await this.kv.set(`account:${account.id}`, {
        ...account,
        passwordHash: await hashPassword(password)
      });
    }
    if (!account.emailVerifiedAt) {
      throw new Error("email_not_verified");
    }
    return publicAccount(account);
  }

  async resendVerification(emailInput: string) {
    const email = normalizeEmail(emailInput);
    const accountId = await this.kv.get<string>(`account-email:${email}`);
    const genericResponse = {
      ok: true,
      message: "If this email belongs to an unverified ContextKit account, a verification email will be sent."
    };
    if (!accountId) return genericResponse;
    const account = await this.kv.get<AccountRecord>(`account:${accountId}`);
    if (!account || account.emailVerifiedAt) return genericResponse;
    await this.sendEmailVerification(account);
    return genericResponse;
  }

  async verifyEmail(token: string) {
    const tokenHash = await sha256(token);
    const verification = await this.kv.get<{ accountId: string }>(`email-verification:${tokenHash}`);
    if (!verification?.accountId) return null;

    const account = await this.kv.get<AccountRecord>(`account:${verification.accountId}`);
    if (!account) return null;
    const verified: AccountRecord = {
      ...account,
      emailVerifiedAt: account.emailVerifiedAt ?? new Date().toISOString(),
      sessionVersion: account.sessionVersion ?? 1
    };
    await Promise.all([
      this.kv.set(`account:${account.id}`, verified),
      this.kv.set(`email-verification:${tokenHash}`, { ...verification, usedAt: new Date().toISOString() }, 1)
    ]);
    return publicAccount(verified);
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
      passwordHash: await hashPassword(password),
      sessionVersion: (account.sessionVersion ?? 1) + 1
    });
    await this.kv.set(`password-reset:${tokenHash}`, { ...reset, usedAt: new Date().toISOString() }, 1);
    return true;
  }

  async get(id: string) {
    const account = await this.kv.get<AccountRecord>(`account:${id}`);
    return account ? publicAccount(account) : null;
  }

  async createSession(accountId: string) {
    const account = await this.kv.get<AccountRecord>(`account:${accountId}`);
    const sessionId = createId("sess");
    await this.kv.set(`dashboard-session:${sessionId}`, {
      accountId,
      sessionVersion: account?.sessionVersion ?? 1,
      createdAt: new Date().toISOString()
    }, 60 * 60 * 12);
    return sessionId;
  }

  async getSession(sessionId?: string) {
    if (!sessionId) return null;
    const session = await this.kv.get<{ accountId?: string; apiKeyId?: string; sessionVersion?: number; createdAt: string }>(`dashboard-session:${sessionId}`);
    if (!session?.accountId) return session;
    const account = await this.kv.get<AccountRecord>(`account:${session.accountId}`);
    if (!account) return null;
    if ((session.sessionVersion ?? 1) !== (account.sessionVersion ?? 1)) return null;
    return session;
  }

  async revokeSession(sessionId?: string) {
    if (!sessionId) return;
    await this.kv.set(`dashboard-session:${sessionId}`, { revokedAt: new Date().toISOString() }, 1);
  }

  private async sendEmailVerification(account: AccountRecord) {
    const token = `ck_verify_${randomSecret(32)}`;
    const tokenHash = await sha256(token);
    const baseUrl = this.env.CONTEXTKIT_BASE_URL || this.env.CONTEXTKIT_BACKEND_URL || "http://localhost:3000";
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/dashboard/verify-email?token=${encodeURIComponent(token)}`;

    await this.kv.set(`email-verification:${tokenHash}`, {
      accountId: account.id,
      createdAt: new Date().toISOString()
    }, 24 * 60 * 60);

    await sendTransactionalEmail({
      env: this.env,
      to: account.email,
      subject: "Verify your ContextKit email",
      actionUrl: verifyUrl,
      actionText: "Verify email",
      title: "Verify your ContextKit email",
      body: "Confirm this email address to activate your account and create API keys. This link expires in 24 hours."
    });
  }
}

function publicAccount(account: AccountRecord) {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    company: account.company,
    createdAt: account.createdAt,
    emailVerifiedAt: account.emailVerifiedAt,
    defaultEnvironment: account.defaultEnvironment
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string) {
  const { randomBytes } = await import("node:crypto");
  const salt = randomBytes(16).toString("base64url");
  const key = await scryptKey(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$v1$16384$8$1$${salt}$${key.toString("base64url")}`;
}

async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith("scrypt$v1$")) {
    const parts = storedHash.split("$");
    const [, , nRaw, rRaw, pRaw, salt, expected] = parts;
    const { timingSafeEqual } = await import("node:crypto");
    const key = await scryptKey(password, salt, 64, {
      N: Number(nRaw),
      r: Number(rRaw),
      p: Number(pRaw),
      maxmem: 64 * 1024 * 1024
    });
    const expectedBuffer = Buffer.from(expected, "base64url");
    return {
      ok: expectedBuffer.length === key.length && timingSafeEqual(expectedBuffer, key),
      needsRehash: false
    };
  }

  const legacyHash = await sha256(`contextkit-password-v1:${password}`);
  return {
    ok: legacyHash === storedHash,
    needsRehash: legacyHash === storedHash
  };
}

async function scryptKey(password: string, salt: string, keyLength: number, options: { N: number; r: number; p: number; maxmem: number }) {
  const { scrypt } = await import("node:crypto");
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function sendPasswordResetEmail(env: AppBindings["Bindings"], to: string, resetUrl: string) {
  await sendTransactionalEmail({
    env,
    to,
    subject: "Reset your ContextKit password",
    actionUrl: resetUrl,
    actionText: "Reset password",
    title: "Reset your ContextKit password",
    body: "This link expires in 15 minutes. If you did not request this, you can ignore this email."
  });
}

async function sendTransactionalEmail(input: {
  env: AppBindings["Bindings"];
  to: string;
  subject: string;
  title: string;
  body: string;
  actionUrl: string;
  actionText: string;
}) {
  const { env } = input;
  if (!env.RESEND_API_KEY || !env.CONTEXTKIT_EMAIL_FROM) {
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.CONTEXTKIT_EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>${escapeHtml(input.title)}</h2>
          <p>${escapeHtml(input.body)}</p>
          <p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#8fffd2;color:#07110d;padding:12px 16px;border-radius:8px;text-decoration:none">${escapeHtml(input.actionText)}</a></p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.warn(JSON.stringify({
      level: "warn",
      message: "Resend transactional email failed",
      status: response.status,
      body
    }));
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
