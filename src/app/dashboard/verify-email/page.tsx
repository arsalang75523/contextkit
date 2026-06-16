"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyShell title="Verifying email..." />}>
      <VerifyEmailForm />
    </Suspense>
  );
}

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Enter the 6-digit code from your email.");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token") ?? "";
    if (!token) {
      return;
    }

    void (async () => {
      const response = await fetch("/api/dashboard/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        setError(JSON.stringify(payload, null, 2));
        setStatus("");
        return;
      }
      setStatus("Email verified. You can login and create API keys now.");
    })();
  }, [searchParams]);

  async function submitCode() {
    setError("");
    const response = await fetch("/api/dashboard/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code })
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    setStatus("Email verified. You can login and create API keys now.");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-xl rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Email Verification</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{status || "Verification failed"}</h1>
        <div className="mt-6 grid gap-3">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
          <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm tracking-[0.35em] text-white outline-none focus:border-mint" />
          <button type="button" onClick={submitCode} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">
            Verify code
          </button>
        </div>
        {error ? <pre className="mt-4 whitespace-pre-wrap rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
        <a href="/dashboard/login" className="mt-6 inline-flex h-11 items-center rounded-md border border-mint/40 px-5 text-sm text-mint">
          Go to login
        </a>
      </section>
    </main>
  );
}

function VerifyShell({ title }: { title: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-xl rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Email Verification</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">{title}</h1>
      </section>
    </main>
  );
}
