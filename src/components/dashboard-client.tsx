"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import { CodeBlock } from "@/components/code-block";

type View = "overview" | "keys" | "usage" | "webhooks" | "payments";

const routes: Array<[View, string, string]> = [
  ["overview", "Overview", "/api/analytics/overview"],
  ["keys", "API Keys", "/api/auth/keys"],
  ["usage", "Usage", "/api/analytics/usage"],
  ["webhooks", "Webhooks", "/api/webhooks/deliveries"],
  ["payments", "Payments", "/api/analytics/payments"]
];

export function DashboardClient({ view = "overview" }: { view?: View }) {
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState<unknown>(null);
  const route = routes.find(([key]) => key === view) ?? routes[0];

  useEffect(() => {
    const stored = window.localStorage.getItem("contextkit_api_key") ?? "";
    setApiKey(stored);
  }, []);

  async function load() {
    window.localStorage.setItem("contextkit_api_key", apiKey);
    const response = await fetch(route[2], {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    setData(await response.json());
  }

  function logout() {
    window.localStorage.removeItem("contextkit_api_key");
    setApiKey("");
    setData({ status: "Logged out. Use Login / switch key to reconnect." });
  }

  return (
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-mint">Developer Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Real ContextKit operations.</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/login" className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 text-sm text-white/75 transition hover:border-mint/50 hover:text-white">
              <LogIn className="h-4 w-4" />
              Login / switch key
            </Link>
            <button type="button" onClick={logout} className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-4 text-sm text-white/55 transition hover:border-coral/50 hover:text-white">
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
        <div className="mt-8 grid gap-3 md:grid-cols-5">
          {routes.map(([key, label]) => (
            <Link key={key} href={key === "overview" ? "/dashboard" : `/dashboard/${key}`} className={`rounded-md border px-4 py-3 text-sm ${view === key ? "border-mint bg-mint/10 text-mint" : "border-line text-white/65"}`}>
              {label}
            </Link>
          ))}
        </div>
        <section className="mt-8 rounded-md border border-line bg-white/[0.035] p-5">
          <label className="text-sm text-white/60" htmlFor="api-key">API key with analytics/dashboard scopes</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="api-key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="ck_live_..."
              className="h-11 flex-1 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint"
            />
            <button type="button" onClick={load} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">
              Load live data
            </button>
          </div>
        </section>
        <section className="mt-6 rounded-md border border-line bg-carbon/70 p-5">
          <CodeBlock code={JSON.stringify(data ?? { status: "Enter an API key and load live data." }, null, 2)} />
        </section>
      </div>
    </main>
  );
}
