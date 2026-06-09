"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/code-block";

type Mode = "login" | "signup" | "api-key" | "forgot";

export default function DashboardLoginPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setResult(null);
    const endpoint = mode === "signup" ? "/api/dashboard/signup" : mode === "login" ? "/api/dashboard/login" : mode === "forgot" ? "/api/dashboard/forgot-password" : "/api/dashboard/session";
    const body = mode === "signup" ? { email, password, name, company } : mode === "login" ? { email, password } : mode === "forgot" ? { email } : { apiKey };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    if (mode === "forgot") {
      if (typeof payload.resetToken === "string") setResetToken(payload.resetToken);
      setResult(payload);
      return;
    }
    if (mode === "api-key") {
      window.localStorage.setItem("contextkit_api_key", apiKey);
    }
    if (mode === "signup" && typeof payload.key === "string") {
      window.localStorage.setItem("contextkit_api_key", payload.key);
      setResult(payload);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function resetAccountPassword() {
    setError("");
    setResult(null);
    const response = await fetch("/api/dashboard/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: resetPassword })
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    setResult({ ok: true, message: "Password updated. You can login now." });
    setPassword("");
    setResetPassword("");
    setMode("login");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-3xl rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Dashboard Access</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Create an account, issue keys, and manage production usage.</h1>
        <div className="mt-6 grid gap-2 sm:grid-cols-4">
          {[
            ["signup", "Sign up"],
            ["login", "Login"],
            ["api-key", "Use API key"],
            ["forgot", "Forgot"]
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setMode(key as Mode)} className={`h-10 rounded-md border text-sm ${mode === key ? "border-mint bg-mint/10 text-mint" : "border-line text-white/65"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-3">
          {mode === "forgot" ? (
            <>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <p className="text-sm leading-6 text-white/55">
                Self-hosted reset: ContextKit creates a short-lived reset token. In production you can wire this token to email delivery.
              </p>
            </>
          ) : mode !== "api-key" ? (
            <>
              {mode === "signup" ? <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" /> : null}
              {mode === "signup" ? <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company or project" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" /> : null}
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <div className="flex overflow-hidden rounded-md border border-line bg-ink/80 focus-within:border-mint">
                <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password, 12+ chars" type={showPassword ? "text" : "password"} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-4 text-xs font-medium text-white/60 hover:text-mint">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {mode === "login" ? (
                <button type="button" onClick={() => setMode("forgot")} className="w-fit text-sm text-aqua hover:text-mint">
                  Forgot password?
                </button>
              ) : null}
            </>
          ) : (
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_..." className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
          )}
          <button type="button" onClick={submit} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">
            {mode === "signup" ? "Create account + first API key" : mode === "forgot" ? "Create reset token" : "Continue"}
          </button>
        </div>
        {mode === "signup" ? (
          <p className="mt-4 text-sm leading-6 text-white/55">
            The first key is shown once. Store it securely. You can create/revoke more scoped keys from the dashboard.
          </p>
        ) : null}
        {result ? (
          <div className="mt-5">
            <p className="mb-3 text-sm text-mint">
              {mode === "signup" ? "Account created. Store this API key now, then open the dashboard." : "Result"}
            </p>
            <CodeBlock code={JSON.stringify(result, null, 2)} />
            {mode === "forgot" ? (
              <div className="mt-4 grid gap-3">
                <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} placeholder="ck_reset_..." className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
                <div className="flex overflow-hidden rounded-md border border-line bg-ink/80 focus-within:border-mint">
                  <input value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} placeholder="New password, 12+ chars" type={showPassword ? "text" : "password"} className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="px-4 text-xs font-medium text-white/60 hover:text-mint">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <button type="button" onClick={resetAccountPassword} className="h-11 rounded-md border border-mint/40 px-5 text-sm text-mint">
                  Reset password
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => (window.location.href = "/dashboard")} className="mt-4 h-11 rounded-md border border-mint/40 px-5 text-sm text-mint">
                Open dashboard
              </button>
            )}
          </div>
        ) : null}
        {error ? <pre className="mt-4 whitespace-pre-wrap rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
      </section>
    </main>
  );
}
