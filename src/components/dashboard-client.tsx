"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CodeBlock } from "@/components/code-block";

type View = "overview" | "keys" | "usage" | "webhooks" | "payments";
type ApiData = Record<string, unknown>;

const routes: Array<[View, string, string]> = [
  ["overview", "Overview", "/api/analytics/overview"],
  ["keys", "API Keys", "/api/auth/my-keys"],
  ["usage", "Usage", "/api/analytics/usage"],
  ["webhooks", "Webhooks", "/api/webhooks/deliveries"],
  ["payments", "Payments", "/api/analytics/payments"]
];

const allScopes = ["context:write", "analytics:read", "webhooks:write", "keys:read"] as const;

export function DashboardClient({ view = "overview" }: { view?: View }) {
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState<ApiData | null>(null);
  const [account, setAccount] = useState<ApiData | null>(null);
  const [message, setMessage] = useState("");
  const [keyName, setKeyName] = useState("Production key");
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [scopes, setScopes] = useState<string[]>([...allScopes]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("payment.received,request.completed,handoff.generated");
  const [replayEventId, setReplayEventId] = useState("");
  const route = routes.find(([key]) => key === view) ?? routes[0];

  useEffect(() => {
    const stored = window.localStorage.getItem("contextkit_api_key") ?? "";
    setApiKey(stored);
    void loadMe();
  }, []);

  useEffect(() => {
    if (apiKey || account) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function loadMe() {
    const response = await fetch("/api/dashboard/me");
    const payload = (await response.json()) as { account?: ApiData };
    setAccount(payload.account ?? null);
  }

  async function load() {
    window.localStorage.setItem("contextkit_api_key", apiKey);
    const headers: Record<string, string> = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    const response = await fetch(route[2], { headers });
    setData(await response.json());
  }

  async function createKey() {
    const response = await fetch("/api/dashboard/create-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName, environment, scopes })
    });
    const payload = (await response.json()) as Record<string, unknown>;
    setMessage(JSON.stringify(payload, null, 2));
    if (typeof payload.key === "string") {
      window.localStorage.setItem("contextkit_api_key", payload.key);
      setApiKey(payload.key);
    }
    await load();
  }

  async function revokeKey(keyId: string) {
    const response = await fetch("/api/auth/revoke-own-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId })
    });
    setMessage(JSON.stringify(await response.json(), null, 2));
    await load();
  }

  async function registerWebhook() {
    const response = await fetch("/api/webhooks/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        url: webhookUrl,
        events: webhookEvents.split(",").map((event) => event.trim()).filter(Boolean)
      })
    });
    setMessage(JSON.stringify(await response.json(), null, 2));
    await loadWebhookEndpoints();
  }

  async function loadWebhookEndpoints() {
    const response = await fetch("/api/webhooks/endpoints", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    setData(await response.json());
  }

  async function replayWebhook() {
    const response = await fetch("/api/webhooks/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ eventId: replayEventId })
    });
    setMessage(JSON.stringify(await response.json(), null, 2));
  }

  function logout() {
    window.localStorage.removeItem("contextkit_api_key");
    setApiKey("");
    setAccount(null);
    setData({ status: "Logged out." });
  }

  return (
    <main className="px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-mint">Developer Dashboard</p>
            <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">Operate ContextKit in production.</h1>
            <p className="mt-4 max-w-3xl leading-7 text-white/60">
              Sign up to create API keys, inspect usage, manage webhooks, and track ContextKit-side payment events. Bankr-hosted x402 calls still happen through Bankr; dashboard keys are for operations and advanced APIs.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/login" className="inline-flex h-11 items-center rounded-md border border-line px-4 text-sm text-white/75 transition hover:border-mint/50 hover:text-white">
              Login / sign up
            </Link>
            <button type="button" onClick={logout} className="inline-flex h-11 items-center rounded-md border border-line px-4 text-sm text-white/55 transition hover:border-coral/50 hover:text-white">
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
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label="Account" value={account?.email ? String(account.email) : "No session"} />
            <Metric label="Current key" value={apiKey ? `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}` : "Not set"} />
            <Metric label="View" value={route[1]} />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Optional ck_live_... for API-key endpoints" className="h-11 flex-1 rounded-md border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none focus:border-mint" />
            <button type="button" onClick={load} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">Load live data</button>
          </div>
        </section>

        {view === "keys" ? (
          <section className="mt-6 rounded-md border border-line bg-white/[0.035] p-5">
            <h2 className="text-xl font-semibold text-white">Create scoped API key</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
              <input value={keyName} onChange={(event) => setKeyName(event.target.value)} className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <select value={environment} onChange={(event) => setEnvironment(event.target.value as "test" | "live")} className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint">
                <option value="live">live</option>
                <option value="test">test</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {allScopes.map((scope) => (
                <button key={scope} type="button" onClick={() => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope])} className={`rounded-md border px-3 py-2 text-sm ${scopes.includes(scope) ? "border-mint bg-mint/10 text-mint" : "border-line text-white/55"}`}>
                  {scope}
                </button>
              ))}
            </div>
            <button type="button" onClick={createKey} className="mt-4 h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">Create key</button>
            <KeyList data={data} onRevoke={revokeKey} />
          </section>
        ) : null}

        {view === "webhooks" ? (
          <section className="mt-6 rounded-md border border-line bg-white/[0.035] p-5">
            <h2 className="text-xl font-semibold text-white">Webhook endpoints</h2>
            <div className="mt-4 grid gap-3">
              <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://your-agent.com/contextkit/events" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <input value={webhookEvents} onChange={(event) => setWebhookEvents(event.target.value)} placeholder="payment.received,request.completed" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={registerWebhook} className="h-11 rounded-md bg-mint px-5 text-sm font-medium text-ink">Register webhook</button>
                <button type="button" onClick={loadWebhookEndpoints} className="h-11 rounded-md border border-line px-5 text-sm text-white/70">List endpoints</button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input value={replayEventId} onChange={(event) => setReplayEventId(event.target.value)} placeholder="evt_... to replay" className="h-11 rounded-md border border-line bg-ink/80 px-3 text-sm text-white outline-none focus:border-mint" />
              <button type="button" onClick={replayWebhook} className="h-11 rounded-md border border-line px-5 text-sm text-white/70">Replay event</button>
            </div>
          </section>
        ) : null}

        <section className="mt-6 rounded-md border border-line bg-carbon/70 p-5">
          <h2 className="mb-3 text-sm uppercase tracking-[0.18em] text-white/45">Live data</h2>
          <CodeBlock code={JSON.stringify(message ? { actionResult: JSON.parse(message), data } : data ?? { status: "Open a dashboard tab or load live data." }, null, 2)} />
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line bg-ink/70 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className="mt-2 break-all text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function KeyList({ data, onRevoke }: { data: ApiData | null; onRevoke: (keyId: string) => void }) {
  const keys = Array.isArray(data?.keys) ? data.keys as Array<{ id: string; name: string; maskedKey: string; revokedAt?: string }> : [];
  if (!keys.length) return null;
  return (
    <div className="mt-5 grid gap-3">
      {keys.map((key) => (
        <div key={key.id} className="flex flex-col justify-between gap-3 rounded border border-line bg-ink/70 p-4 md:flex-row md:items-center">
          <div>
            <p className="font-semibold text-white">{key.name}</p>
            <p className="mt-1 break-all font-mono text-xs text-white/45">{key.maskedKey} {key.revokedAt ? "(revoked)" : ""}</p>
          </div>
          <button type="button" onClick={() => onRevoke(key.id)} className="h-10 rounded-md border border-coral/40 px-4 text-sm text-coral">Revoke</button>
        </div>
      ))}
    </div>
  );
}
