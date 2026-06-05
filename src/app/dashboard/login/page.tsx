"use client";

import { useState } from "react";

export default function DashboardLoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");

  async function login() {
    setError("");
    const response = await fetch("/api/dashboard/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey })
    });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    window.localStorage.setItem("contextkit_api_key", apiKey);
    window.location.href = "/dashboard";
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <section className="w-full max-w-md rounded-md border border-line bg-white/[0.035] p-6">
        <p className="text-sm uppercase tracking-[0.22em] text-mint">Dashboard Login</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Authenticate with a ContextKit API key.</h1>
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="ck_live_..."
          className="mt-6 h-11 w-full rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint"
        />
        <button type="button" onClick={login} className="mt-4 h-11 w-full rounded-md bg-mint px-5 text-sm font-medium text-ink">
          Continue
        </button>
        {error ? <pre className="mt-4 overflow-auto rounded border border-coral/40 bg-coral/10 p-3 text-xs text-coral">{error}</pre> : null}
      </section>
    </main>
  );
}
