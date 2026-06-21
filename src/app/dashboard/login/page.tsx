"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/code-block";

type Mode = "login" | "signup" | "api-key" | "forgot";

export default function DashboardLoginPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<object | null>(null);
  const [resultMode, setResultMode] = useState<Mode | null>(null);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setResult(null);
    setResultMode(null);
    setError("");
    setUnverifiedEmail("");
    setVerificationCode("");
    setPassword("");
    setShowPassword(false);
  }

  async function submit() {
    setError("");
    setResult(null);
    setResultMode(null);
    const endpoint = mode === "signup" ? "/api/dashboard/signup" : mode === "login" ? "/api/dashboard/login" : mode === "forgot" ? "/api/dashboard/forgot-password" : "/api/dashboard/session";
    const body = mode === "signup" ? { email, password, name, company } : mode === "login" ? { email, password } : mode === "forgot" ? { email } : { apiKey };
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      if (payload.error && typeof payload.error === "object" && "code" in payload.error && payload.error.code === "email_not_verified") {
        setUnverifiedEmail(email);
      }
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    if (mode === "forgot") {
      setResult(payload);
      setResultMode(mode);
      return;
    }
    if (mode === "api-key") {
      window.localStorage.setItem("contextkit_api_key", apiKey);
    }
    if (mode === "signup") {
      setUnverifiedEmail(email);
      setResult(payload);
      setResultMode(mode);
      return;
    }
    window.location.href = authenticationDestination();
  }

  async function resendVerification() {
    setError("");
    setResult(null);
    const response = await fetch("/api/dashboard/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail || email })
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    setResult(payload);
    setResultMode("forgot");
  }

  async function verifyCode() {
    setError("");
    const response = await fetch("/api/dashboard/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: unverifiedEmail || email, code: verificationCode })
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      setError(JSON.stringify(payload, null, 2));
      return;
    }
    setResult({ ...payload, message: "Email verified. You can login now." });
    setResultMode("login");
    setMode("login");
    setPassword("");
    setVerificationCode("");
    setUnverifiedEmail("");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-16">
      <section className="w-full max-w-3xl rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Dashboard Access</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Create an account, issue keys, and manage production usage.</h1>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            ["signup", "Sign up"],
            ["login", "Login"],
            ["api-key", "Use API key"]
          ].map(([key, label]) => (
            <button key={key} type="button" onClick={() => switchMode(key as Mode)} className={`h-10 rounded-md border text-sm ${mode === key ? "border-mint bg-mint/10 text-mint" : "border-line text-white/65"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 grid gap-3">
          {mode === "forgot" ? (
            <>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <p className="text-sm leading-6 text-white/55">
                Enter your account email. If it exists, ContextKit sends a secure reset link to that address. The reset token is never shown in the browser.
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
                <button type="button" onClick={() => switchMode("forgot")} className="w-fit text-sm text-aqua hover:text-mint">
                  Forgot password?
                </button>
              ) : null}
            </>
          ) : (
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_..." className="h-11 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
          )}
          <button type="button" onClick={submit} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">
            {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset email" : "Continue"}
          </button>
        </div>
        {mode === "forgot" ? (
          <button type="button" onClick={() => switchMode("login")} className="mt-4 text-sm text-aqua hover:text-mint">
            Back to login
          </button>
        ) : null}
        {mode === "signup" ? (
          <p className="mt-4 text-sm leading-6 text-white/55">
            Email verification is required before dashboard access or API key creation. After verifying, login and create scoped keys from the dashboard.
          </p>
        ) : null}
        {unverifiedEmail ? (
          <div className="mt-4 rounded border border-aqua/30 bg-aqua/10 p-4">
            <p className="text-sm text-aqua">Paste the 6-digit verification code sent to {unverifiedEmail}.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="" className="h-10 flex-1 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm tracking-[0.35em] text-white outline-none focus:border-aqua" />
              <button type="button" onClick={verifyCode} className="h-10 rounded-md bg-aqua px-4 text-sm font-medium text-ink">
                Verify code
              </button>
              <button type="button" onClick={resendVerification} className="h-10 rounded-md border border-aqua/40 px-4 text-sm text-aqua">
                Resend
              </button>
            </div>
          </div>
        ) : null}
        {result ? (
          <div className="mt-5">
            <p className="mb-3 text-sm text-mint">
              {resultMode === "signup" ? "Account created. Check your email for the verification code." : resultMode === "login" ? "Email verified" : "Check your email"}
            </p>
            <CodeBlock code={JSON.stringify(result, null, 2)} />
          </div>
        ) : null}
        {error ? <pre className="mt-4 whitespace-pre-wrap rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
      </section>
    </main>
  );
}

function authenticationDestination() {
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  // OAuth redirects are the only non-dashboard destination accepted here.
  return returnTo?.startsWith("/oauth/authorize?") ? returnTo : "/dashboard";
}
