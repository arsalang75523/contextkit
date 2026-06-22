"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
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

  const modeCopy = {
    signup: {
      eyebrow: "Create workspace",
      title: "Start with a secure context workspace.",
      description: "Verify your email, create scoped API keys, and give agents a controlled memory layer.",
      action: "Create account"
    },
    login: {
      eyebrow: "Dashboard access",
      title: "Continue your agent operations.",
      description: "Sign in to manage keys, credits, usage, webhooks, and production context workflows.",
      action: "Sign in"
    },
    "api-key": {
      eyebrow: "API key session",
      title: "Use an existing scoped key.",
      description: "Enter a ContextKit API key to open a local dashboard session on this device.",
      action: "Continue with key"
    },
    forgot: {
      eyebrow: "Password recovery",
      title: "Reset dashboard access.",
      description: "We will send a time-limited reset link if this email belongs to an account.",
      action: "Send reset email"
    }
  } as const;
  const activeCopy = modeCopy[mode];

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:py-12">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -left-40 top-20 h-[32rem] w-[32rem] rounded-full bg-mint/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-aqua/[0.08] blur-[100px]" />
      <section className="relative mx-auto grid min-h-[min(720px,calc(100vh-8rem))] w-full max-w-6xl overflow-hidden rounded-[1.6rem] border border-white/[0.13] bg-carbon/80 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:grid-cols-[0.84fr_1.16fr]">
        <aside className="relative overflow-hidden border-b border-line p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(115,243,195,0.12),transparent_25rem)]" />
          <div className="relative flex h-full flex-col">
            <Link href="/" className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/48 transition hover:text-mint"><ArrowLeft className="h-3.5 w-3.5" /> ContextKit</Link>
            <div className="mt-12 max-w-sm lg:mt-16">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-mint/30 bg-mint/10"><Sparkles className="h-5 w-5 text-mint" /></div>
              <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.18em] text-mint">Agent workspace</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-4xl">The control plane for your agents&apos; memory.</h2>
              <p className="mt-5 leading-7 text-white/58">Keys, credits, usage, and secure OAuth access in one operational surface.</p>
            </div>
            <div className="mt-8 space-y-3">
              <TrustItem text="Scoped keys for production agents" />
              <TrustItem text="Email verification before access" />
              <TrustItem text="x402, SDK, and MCP workflows" />
            </div>
          </div>
        </aside>

        <div className="relative p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-aqua">{activeCopy.eyebrow}</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-mint/20 bg-mint/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mint"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> Secure</span>
            </div>
            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{activeCopy.title}</h1>
            <p className="mt-3 max-w-sm leading-7 text-white/58">{activeCopy.description}</p>

            <div className="mt-8 grid grid-cols-3 gap-1 rounded-xl border border-line bg-ink/55 p-1">
              {[["signup", "Sign up"], ["login", "Sign in"], ["api-key", "API key"]].map(([key, label]) => (
                <button key={key} type="button" onClick={() => switchMode(key as Mode)} className={`h-10 rounded-lg text-sm transition ${mode === key ? "bg-mint text-ink shadow-[0_8px_20px_rgba(115,243,195,0.15)]" : "text-white/57 hover:bg-white/[0.06] hover:text-white"}`}>
                  {label}
                </button>
              ))}
            </div>

            <form className="mt-7 grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              {mode === "forgot" ? <Field label="Account email" icon={<Mail className="h-4 w-4" />}><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" type="email" className="auth-input" /></Field> : null}
              {mode !== "forgot" && mode !== "api-key" ? (
                <>
                  {mode === "signup" ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Your name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Avery Chen" autoComplete="name" className="auth-input" /></Field><Field label="Company or project"><input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Agent Lab" autoComplete="organization" className="auth-input" /></Field></div> : null}
                  <Field label="Work email" icon={<Mail className="h-4 w-4" />}><input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" type="email" className="auth-input" /></Field>
                  <Field label="Password" icon={<LockKeyhole className="h-4 w-4" />}><div className="flex items-center"><input value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "signup" ? "12+ characters" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} type={showPassword ? "text" : "password"} className="auth-input border-0 bg-transparent pr-0 focus:border-0" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="mr-2 grid h-8 w-8 place-items-center rounded-md text-white/45 transition hover:bg-white/[0.07] hover:text-mint" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>
                  {mode === "login" ? <button type="button" onClick={() => switchMode("forgot")} className="-mt-1 w-fit text-sm text-aqua transition hover:text-mint">Forgot password?</button> : null}
                </>
              ) : null}
              {mode === "api-key" ? <Field label="ContextKit API key" icon={<KeyRound className="h-4 w-4" />}><input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="ck_live_..." autoComplete="off" className="auth-input font-mono" /></Field> : null}
              {mode === "forgot" ? <p className="-mt-1 text-sm leading-6 text-white/48">Reset links are time-limited and never expose a reset token in your browser.</p> : null}
              <button type="submit" className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-2 focus:ring-offset-carbon">{activeCopy.action}<ArrowRight className="h-4 w-4" /></button>
            </form>

            {mode === "forgot" ? <button type="button" onClick={() => switchMode("login")} className="mt-5 inline-flex items-center gap-2 text-sm text-aqua transition hover:text-mint"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</button> : null}
            {mode === "signup" ? <p className="mt-5 text-sm leading-6 text-white/48">Email verification is required before dashboard access or API-key creation.</p> : null}
            {unverifiedEmail ? <div className="mt-6 rounded-xl border border-aqua/25 bg-aqua/[0.07] p-4"><div className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-aqua" /><div><p className="text-sm font-medium text-white">Verify your email</p><p className="mt-1 text-sm leading-6 text-white/58">Enter the 6-digit code sent to {unverifiedEmail}.</p></div></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" className="h-10 flex-1 rounded-lg border border-aqua/25 bg-ink/80 px-3 font-mono text-sm tracking-[0.28em] text-white outline-none focus:border-aqua" /><button type="button" onClick={verifyCode} className="h-10 rounded-lg bg-aqua px-4 text-sm font-medium text-ink">Verify</button><button type="button" onClick={resendVerification} className="h-10 rounded-lg border border-aqua/35 px-4 text-sm text-aqua transition hover:bg-aqua/10">Resend</button></div></div> : null}
            {result ? <div className="mt-6 rounded-xl border border-mint/25 bg-mint/[0.06] p-4"><div className="flex gap-3"><Check className="mt-0.5 h-4 w-4 text-mint" /><p className="text-sm leading-6 text-mint">{resultMode === "signup" ? "Account created. Check your email for the verification code." : resultMode === "login" ? "Email verified. You can sign in now." : "Check your email for the next step."}</p></div><details className="mt-3"><summary className="cursor-pointer text-xs text-white/45 hover:text-white/70">View response details</summary><div className="mt-3"><CodeBlock code={JSON.stringify(result, null, 2)} /></div></details></div> : null}
            {error ? <div className="mt-5 rounded-xl border border-coral/35 bg-coral/[0.08] p-4"><p className="text-sm font-medium text-coral">The request could not be completed.</p><pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-5 text-coral/80">{error}</pre></div> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/72">{icon ? <span className="text-mint">{icon}</span> : null}{label}</span><span className="block overflow-hidden rounded-xl border border-line bg-ink/70 transition focus-within:border-mint/65 focus-within:shadow-[0_0_0_3px_rgba(115,243,195,0.08)]">{children}</span></label>;
}

function TrustItem({ text }: { text: string }) {
  return <div className="flex items-center gap-3 text-sm text-white/62"><span className="grid h-5 w-5 place-items-center rounded-full border border-mint/25 bg-mint/[0.07]"><ShieldCheck className="h-3 w-3 text-mint" /></span>{text}</div>;
}

function authenticationDestination() {
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  // OAuth redirects are the only non-dashboard destination accepted here.
  return returnTo?.startsWith("/oauth/authorize?") ? returnTo : "/dashboard";
}
