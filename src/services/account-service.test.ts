import test from "node:test";
import assert from "node:assert/strict";
import { AccountService } from "./account-service";
import { resetPasswordSchema } from "@/types/api";

function memoryNamespace() {
  const values = new Map<string, { value: string; expiresAt?: number }>();
  return {
    async get(key: string, type?: string) {
      const entry = values.get(key);
      if (!entry || (entry.expiresAt && entry.expiresAt <= Date.now())) return null;
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      values.set(key, {
        value,
        expiresAt: options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined
      });
    }
  } as unknown as KVNamespace;
}

test("password recovery sends a code and replaces the password through a one-time challenge", async () => {
  const originalFetch = globalThis.fetch;
  const emails: Array<{ subject: string; html: string }> = [];
  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { subject: string; html: string };
    emails.push(body);
    return Response.json({ id: `email_${emails.length}` });
  };

  try {
    const service = new AccountService({
      CONTEXTKIT_KV: memoryNamespace(),
      RESEND_API_KEY: "re_test",
      CONTEXTKIT_EMAIL_FROM: "ContextKit <verify@example.com>"
    });
    const email = `recovery-${Date.now()}@example.com`;
    const oldPassword = "old-password-12345";
    const newPassword = "new-password-67890";

    await service.signup({ email, password: oldPassword, name: "Recovery Test", company: "ContextKit" });
    const verificationCode = extractCode(emails.at(-1)?.html);
    const verified = await service.verifyEmail({ email, code: verificationCode });
    assert.equal(verified?.email, email);

    const response = await service.createPasswordReset(email);
    assert.equal(response.ok, true);
    const resetEmail = emails.at(-1);
    assert.equal(resetEmail?.subject, "Reset your ContextKit password");
    assert.doesNotMatch(resetEmail?.html ?? "", /href=/i, "Recovery email must contain a code, not a reset link.");
    const resetCode = extractCode(resetEmail?.html);

    assert.equal(await service.verifyPasswordResetCode(email, "999999"), null);
    const resetToken = await service.verifyPasswordResetCode(email, resetCode);
    assert.match(resetToken ?? "", /^ck_reset_/);
    assert.equal(await service.verifyPasswordResetCode(email, resetCode), null, "Recovery codes must be single-use.");

    assert.equal(await service.resetPassword(resetToken ?? "", newPassword), true);
    assert.equal(await service.resetPassword(resetToken ?? "", newPassword), false, "Reset challenges must be single-use.");
    assert.equal(await service.login(email, oldPassword), null);
    assert.equal((await service.login(email, newPassword))?.email, email);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("password reset confirmation must match", () => {
  const result = resetPasswordSchema.safeParse({
    token: "ck_reset_abcdefghijklmnopqrstuvwxyz",
    password: "new-password-67890",
    passwordConfirmation: "different-password-123"
  });
  assert.equal(result.success, false);
});

function extractCode(html?: string) {
  const code = Array.from(html?.matchAll(/\b(\d{6})\b/g) ?? []).at(-1)?.[1];
  assert.ok(code, "Expected a 6-digit code in the transactional email.");
  return code;
}
