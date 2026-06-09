"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordShell />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setMessage("");
    const response = await fetch("/api/dashboard/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    setMessage("Password updated. You can login now.");
    setPassword("");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-xl rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Password Reset</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Set a new ContextKit password.</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          This link expires in 15 minutes. If it is expired, request a new reset email from the login page.
        </p>
        <div className="mt-6 grid gap-3">
          <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Reset token from email link" className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
          <div className="flex overflow-hidden rounded-md border border-line bg-ink/80 focus-within:border-mint">
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password, 12+ chars" type={showPassword ? "text" : "password"} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-4 text-xs font-medium text-white/60 hover:text-mint">
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="button" onClick={submit} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">
            Reset password
          </button>
        </div>
        {message ? <p className="mt-4 rounded border border-mint/30 bg-mint/10 p-3 text-sm text-mint">{message}</p> : null}
        {error ? <pre className="mt-4 whitespace-pre-wrap rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
      </section>
    </main>
  );
}

function ResetPasswordShell() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-xl rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Password Reset</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Loading reset form...</h1>
      </section>
    </main>
  );
}
