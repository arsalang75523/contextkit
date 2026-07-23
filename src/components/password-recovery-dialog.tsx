"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Mail, RefreshCw, ShieldCheck, X } from "lucide-react";

type RecoveryStep = "email" | "code" | "password" | "success";

export function PasswordRecoveryDialog({
  open,
  initialEmail,
  onClose
}: {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [step, setStep] = useState<RecoveryStep>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    setStep("email");
    setEmail(initialEmail);
    setCode("");
    setResetToken("");
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
    setError("");
    setNotice("");

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [initialEmail, open]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [open, step]);

  if (!open) return null;

  async function sendCode() {
    if (!email.trim()) {
      setError("Enter the email address attached to your account.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await postJson("/api/dashboard/forgot-password", { email });
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setStep("code");
      setNotice("If the account exists, a fresh 6-digit code is on its way.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the complete 6-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await postJson("/api/dashboard/verify-password-reset-code", { email, code });
      if (!response.ok || typeof response.payload.resetToken !== "string") {
        setError(response.message);
        return;
      }
      setResetToken(response.payload.resetToken);
      setStep("password");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (password.length < 12) {
      setError("Use at least 12 characters for your new password.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await postJson("/api/dashboard/reset-password", {
        token: resetToken,
        password,
        passwordConfirmation
      });
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setPassword("");
      setPasswordConfirmation("");
      setResetToken("");
      setStep("success");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setCode("");
    await sendCode();
  }

  const stepNumber = step === "email" ? 1 : step === "code" ? 2 : 3;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-recovery-title"
        aria-describedby="password-recovery-description"
        className="relative w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-white/[0.14] bg-carbon shadow-[0_32px_100px_rgba(0,0,0,0.62)]"
      >
        <div className="agent-grid pointer-events-none absolute inset-0 opacity-35" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-mint/10 blur-[75px]" />

        <div className="relative border-b border-line px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mint"><ShieldCheck className="h-3.5 w-3.5" /> Secure recovery</span>
            <button type="button" onClick={() => closeRef.current()} disabled={loading} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/50 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint disabled:opacity-40" aria-label="Close password recovery">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2" aria-label={`Password recovery step ${stepNumber} of 3`}>
            {[1, 2, 3].map((value) => <span key={value} className={`h-1 rounded-full transition-colors ${value <= stepNumber ? "bg-mint" : "bg-white/10"}`} />)}
          </div>
        </div>

        <div className="relative px-6 py-7 sm:px-8 sm:py-8">
          {step === "email" ? (
            <RecoveryPanel icon={<Mail className="h-5 w-5" />} eyebrow="Step 01 / Email" title="Find your ContextKit account." description="We will email a one-time 6-digit code. No reset link is used.">
              <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void sendCode(); }}>
                <RecoveryField label="Account email" htmlFor="recovery-email"><input id="recovery-email" data-autofocus value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@company.com" className="auth-input" required /></RecoveryField>
                <RecoveryButton loading={loading}>Send recovery code</RecoveryButton>
              </form>
            </RecoveryPanel>
          ) : null}

          {step === "code" ? (
            <RecoveryPanel icon={<KeyRound className="h-5 w-5" />} eyebrow="Step 02 / Verify" title="Enter the code from your email." description={<>A 6-digit code was requested for <span className="text-white">{email}</span>. It expires in 15 minutes.</>}>
              <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void verifyCode(); }}>
                <RecoveryField label="Recovery code" htmlFor="recovery-code"><input id="recovery-code" data-autofocus value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="auth-input text-center font-mono text-lg tracking-[0.45em]" required /></RecoveryField>
                <RecoveryButton loading={loading}>Verify code</RecoveryButton>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <button type="button" onClick={() => { setError(""); setNotice(""); setStep("email"); }} className="inline-flex items-center gap-2 text-white/50 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Change email</button>
                <button type="button" onClick={() => void resendCode()} disabled={loading} className="inline-flex items-center gap-2 text-aqua transition hover:text-mint disabled:opacity-45"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Resend code</button>
              </div>
            </RecoveryPanel>
          ) : null}

          {step === "password" ? (
            <RecoveryPanel icon={<LockKeyhole className="h-5 w-5" />} eyebrow="Step 03 / Replace" title="Choose a new password." description="Use at least 12 characters. Resetting your password signs out existing dashboard sessions.">
              <form className="mt-6 grid gap-4" onSubmit={(event) => { event.preventDefault(); void resetPassword(); }}>
                <RecoveryField label="New password" htmlFor="recovery-password"><PasswordInput id="recovery-password" dataAutofocus value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((value) => !value)} /></RecoveryField>
                <RecoveryField label="Confirm new password" htmlFor="recovery-password-confirmation"><PasswordInput id="recovery-password-confirmation" value={passwordConfirmation} onChange={setPasswordConfirmation} show={showPassword} /></RecoveryField>
                <RecoveryButton loading={loading}>Update password</RecoveryButton>
              </form>
            </RecoveryPanel>
          ) : null}

          {step === "success" ? (
            <RecoveryPanel icon={<Check className="h-5 w-5" />} eyebrow="Recovery complete" title="Your password is updated." description="The recovery code and reset challenge cannot be used again. Sign in with your new password.">
              <button data-autofocus type="button" onClick={() => closeRef.current()} className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-carbon">Back to sign in <ArrowRight className="h-4 w-4" /></button>
            </RecoveryPanel>
          ) : null}

          <div aria-live="polite" aria-atomic="true">
            {notice ? <p className="mt-5 rounded-xl border border-aqua/25 bg-aqua/[0.07] px-4 py-3 text-sm leading-6 text-aqua">{notice}</p> : null}
          </div>
          <div aria-live="assertive" aria-atomic="true">
            {error ? <p className="mt-5 rounded-xl border border-coral/35 bg-coral/[0.08] px-4 py-3 text-sm leading-6 text-coral">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoveryPanel({ icon, eyebrow, title, description, children }: { icon: React.ReactNode; eyebrow: string; title: string; description: React.ReactNode; children: React.ReactNode }) {
  return <section><div className="grid h-11 w-11 place-items-center rounded-xl border border-mint/25 bg-mint/[0.08] text-mint">{icon}</div><p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-aqua">{eyebrow}</p><h2 id="password-recovery-title" className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">{title}</h2><p id="password-recovery-description" className="mt-3 text-sm leading-6 text-white/58">{description}</p>{children}</section>;
}

function RecoveryField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-white/72">{label}</label><div className="overflow-hidden rounded-xl border border-line bg-ink/75 transition focus-within:border-mint/65 focus-within:shadow-[0_0_0_3px_rgba(115,243,195,0.08)]">{children}</div></div>;
}

function PasswordInput({ id, value, onChange, show, onToggle, dataAutofocus = false }: { id: string; value: string; onChange: (value: string) => void; show: boolean; onToggle?: () => void; dataAutofocus?: boolean }) {
  return <div className="flex items-center"><input id={id} data-autofocus={dataAutofocus || undefined} value={value} onChange={(event) => onChange(event.target.value)} type={show ? "text" : "password"} autoComplete="new-password" placeholder="12+ characters" className="auth-input border-0 bg-transparent pr-0 focus:border-0" required minLength={12} />{onToggle ? <button type="button" onClick={onToggle} className="mr-2 grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/45 transition hover:bg-white/[0.07] hover:text-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint" aria-label={show ? "Hide passwords" : "Show passwords"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button> : null}</div>;
}

function RecoveryButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return <button type="submit" disabled={loading} className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2 focus-visible:ring-offset-carbon disabled:cursor-wait disabled:opacity-55">{loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}{children}{!loading ? <ArrowRight className="h-4 w-4" /> : null}</button>;
}

async function postJson(url: string, body: object) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const apiError = payload.error && typeof payload.error === "object" && "message" in payload.error && typeof payload.error.message === "string" ? payload.error.message : null;
    return { ok: response.ok, payload, message: apiError ?? (response.ok ? "" : "The recovery request could not be completed.") };
  } catch {
    return { ok: false, payload: {}, message: "Could not reach ContextKit. Check your connection and try again." };
  }
}
