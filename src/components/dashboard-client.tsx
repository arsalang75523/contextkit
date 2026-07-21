"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, BarChart3, CreditCard, KeyRound, LogOut, RefreshCw, ShieldCheck, Wallet, Webhook, Zap } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { WalletCreditCheckout, type CreditInvoicePayload } from "@/components/wallet-credit-checkout";

type View = "overview" | "keys" | "usage" | "webhooks" | "payments" | "credits";
type ApiData = Record<string, unknown>;

const routes: Array<[View, string, string]> = [
  ["overview", "Overview", "/api/analytics/overview"],
  ["keys", "API Keys", "/api/auth/my-keys"],
  ["usage", "Usage", "/api/analytics/usage"],
  ["webhooks", "Webhooks", "/api/webhooks/deliveries"],
  ["payments", "Payments", "/api/analytics/payments"],
  ["credits", "Credits", "/api/auth/credits"]
];

const allScopes = ["context:write", "analytics:read", "webhooks:write", "keys:read"] as const;

export function DashboardClient({ view = "overview" }: { view?: View }) {
  const [apiKey, setApiKey] = useState("");
  const [data, setData] = useState<ApiData | null>(null);
  const [account, setAccount] = useState<ApiData | null>(null);
  const [message, setMessage] = useState("");
  const [actionResult, setActionResult] = useState<ApiData | null>(null);
  const [newKey, setNewKey] = useState<Record<string, unknown> | null>(null);
  const [keyName, setKeyName] = useState("Production key");
  const [environment, setEnvironment] = useState<"test" | "live">("live");
  const [scopes, setScopes] = useState<string[]>([...allScopes]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState("payment.received,request.completed,handoff.generated");
  const [replayEventId, setReplayEventId] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("10");
  const route = routes.find(([key]) => key === view) ?? routes[0];

  useEffect(() => {
    const stored = window.localStorage.getItem("contextkit_api_key") ?? "";
    setApiKey(stored);
    void (async () => {
      await loadMe();
      await load(stored);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  async function loadMe() {
    const response = await fetch("/api/dashboard/me");
    const payload = (await response.json()) as { account?: ApiData };
    setAccount(payload.account ?? null);
  }

  async function load(keyOverride?: string) {
    const key = keyOverride ?? apiKey;
    window.localStorage.setItem("contextkit_api_key", key);
    const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
    if (view === "keys") {
      const response = await fetch("/api/auth/my-keys");
      setData(await response.json());
      return;
    }
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
    setMessage("");
    setActionResult(null);
    if (typeof payload.key === "string") {
      window.localStorage.setItem("contextkit_api_key", payload.key);
      setApiKey(payload.key);
      setNewKey(payload);
    }
    await load(typeof payload.key === "string" ? payload.key : undefined);
  }

  async function revokeKey(keyId: string) {
    const response = await fetch("/api/auth/revoke-own-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId })
    });
    const payload = await response.json() as ApiData;
    setMessage("Key revocation request completed.");
    setActionResult(payload);
    setNewKey(null);
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
    const payload = await response.json() as ApiData;
    setMessage("Webhook registration request completed.");
    setActionResult(payload);
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
    const payload = await response.json() as ApiData;
    setMessage("Webhook replay request completed.");
    setActionResult(payload);
  }

  async function createTopUpInvoice() {
    const response = await fetch("/api/dashboard/credits/top-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsd: Number(topUpAmount) })
    });
    const payload = await response.json() as ApiData;
    if (!response.ok) {
      const error = apiErrorMessage(payload, "Credit invoice request failed.");
      setMessage(error);
      setActionResult(payload);
      throw new Error(error);
    }
    const invoice = payload.invoice && typeof payload.invoice === "object" ? payload.invoice as Record<string, unknown> : null;
    if (!invoice?.id || !invoice.payTo || !invoice.tokenContract || !invoice.amountUnits) {
      throw new Error("Credit invoice returned incomplete payment details.");
    }
    setMessage("Secure USDC invoice created. Confirm the exact transfer in your wallet.");
    setActionResult(payload);
    return payload as CreditInvoicePayload;
  }

  async function verifyTopUpInvoice(invoiceId: string, txHash: string) {
    const response = await fetch("/api/dashboard/credits/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, txHash })
    });
    const payload = await response.json() as ApiData;
    setActionResult(payload);
    if (!response.ok) {
      const error = apiErrorMessage(payload, "Credit top-up verification failed.");
      setMessage(error);
      throw new Error(error);
    }
    setMessage("USDC payment verified. Credit balance updated automatically.");
    await load();
  }

  async function logout() {
    await fetch("/api/dashboard/logout", { method: "POST" }).catch(() => null);
    window.localStorage.removeItem("contextkit_api_key");
    setApiKey("");
    setAccount(null);
    setData({ status: "Logged out." });
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:py-10">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-48 top-24 h-[38rem] w-[38rem] rounded-full bg-mint/[0.08] blur-[110px]" />
      <div className="pointer-events-none absolute -right-52 top-80 h-[30rem] w-[30rem] rounded-full bg-aqua/[0.07] blur-[110px]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.5rem] border border-white/[0.13] bg-carbon/75 shadow-[0_24px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42 sm:px-7">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> ContextKit operations / online</span>
            <span className="hidden text-white/35 sm:inline">account-scoped control plane</span>
            <span className="text-mint">{account?.email ? "Authenticated" : "No session"}</span>
          </div>
          <div className="flex flex-col gap-6 px-5 py-7 sm:px-7 md:flex-row md:items-end md:justify-between md:py-9">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mint">Developer dashboard</p>
              <h1 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">Operate agent memory and verified skills.</h1>
              <p className="mt-3 max-w-2xl leading-7 text-white/58">Create scoped keys, monitor usage, fund proof-gated skill compilation, and keep every agent integration observable.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/login" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-ink/40 px-3.5 text-sm text-white/75 transition hover:border-mint/45 hover:text-white"><ShieldCheck className="h-4 w-4 text-mint" /> Login / sign up</Link>
              <button type="button" onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-lg border border-coral/20 px-3.5 text-sm text-white/55 transition hover:border-coral/50 hover:bg-coral/[0.06] hover:text-coral"><LogOut className="h-4 w-4" /> Logout</button>
            </div>
          </div>
          <nav className="grid gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {routes.map(([key, label]) => (
              <Link key={key} href={key === "overview" ? "/dashboard" : `/dashboard/${key}`} className={`group flex items-center gap-3 bg-carbon px-4 py-4 text-sm transition ${view === key ? "bg-mint/[0.09] text-mint" : "text-white/55 hover:bg-white/[0.045] hover:text-white"}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-lg border ${view === key ? "border-mint/30 bg-mint/10 text-mint" : "border-line bg-ink/40 text-white/42 group-hover:text-white"}`}><DashboardIcon view={key} /></span>
                <span>{label}</span>
                {view === key ? <ArrowUpRight className="ml-auto h-3.5 w-3.5" /> : null}
              </Link>
            ))}
          </nav>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[1.25rem] border border-line bg-white/[0.03] p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">Session control</p><h2 className="mt-2 text-xl font-semibold text-white">Connect a scoped API key.</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl border border-mint/25 bg-mint/[0.07]"><KeyRound className="h-4 w-4 text-mint" /></span></div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row"><input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Optional ck_live_... for API-key endpoints" className="h-11 flex-1 rounded-xl border border-line bg-ink/80 px-3 font-mono text-sm text-white outline-none transition focus:border-mint" /><button type="button" onClick={() => load()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white"><RefreshCw className="h-4 w-4" /> Refresh data</button></div>
            <p className="mt-3 text-sm text-white/46">The dashboard session remains browser-local. Use a scoped live key only when an endpoint requires it.</p>
          </div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line">
            <DashboardStat label="Account" value={account?.email ? String(account.email) : "No session"} />
            <DashboardStat label="Active key" value={apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : "Not set"} />
            <DashboardStat label="Current view" value={route[1]} />
          </div>
        </section>

        <DashboardView
          view={view}
          data={data}
          topUpAmount={topUpAmount}
          setTopUpAmount={setTopUpAmount}
          onCreateTopUpInvoice={createTopUpInvoice}
          onVerifyTopUpInvoice={verifyTopUpInvoice}
        />

        {view === "keys" ? (
          <section className="mt-6 rounded-[1.25rem] border border-line bg-white/[0.035] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">Create scoped API key</h2>
            {newKey ? (
              <div className="mt-4 rounded-md border border-mint/30 bg-mint/10 p-4">
                <p className="text-sm font-semibold text-mint">New API key created. Copy it now; it will not be shown again.</p>
                <div className="mt-3">
                  <CodeBlock code={JSON.stringify(newKey, null, 2)} />
                </div>
                <button type="button" onClick={() => setNewKey(null)} className="mt-3 h-10 rounded-md border border-line px-4 text-sm text-white/70">I saved this key</button>
              </div>
            ) : null}
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
          <section className="mt-6 rounded-[1.25rem] border border-line bg-white/[0.035] p-5 sm:p-6">
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

        <section className="mt-6 overflow-hidden rounded-[1.25rem] border border-line bg-carbon/70">
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Live data stream</h2><p className="mt-1 text-sm text-white/56">Raw account-scoped API response.</p></div><Zap className="h-4 w-4 text-mint" /></div>
          <div className="p-4 sm:p-5"><CodeBlock code={JSON.stringify(actionResult ? { message, actionResult, data } : data ?? { status: "Loading live dashboard data..." }, null, 2)} /></div>
        </section>
      </div>
    </main>
  );
}

function DashboardIcon({ view }: { view: View }) {
  const props = { className: "h-4 w-4" };
  if (view === "keys") return <KeyRound {...props} />;
  if (view === "usage") return <Activity {...props} />;
  if (view === "webhooks") return <Webhook {...props} />;
  if (view === "payments") return <CreditCard {...props} />;
  if (view === "credits") return <Wallet {...props} />;
  return <BarChart3 {...props} />;
}

function DashboardStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-carbon/90 p-4"><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/38">{label}</p><p className="mt-2 truncate text-sm font-medium text-white" title={value}>{value}</p></div>;
}

function DashboardView({
  view,
  data,
  topUpAmount,
  setTopUpAmount,
  onCreateTopUpInvoice,
  onVerifyTopUpInvoice
}: {
  view: View;
  data: ApiData | null;
  topUpAmount: string;
  setTopUpAmount: (value: string) => void;
  onCreateTopUpInvoice: () => Promise<CreditInvoicePayload>;
  onVerifyTopUpInvoice: (invoiceId: string, txHash: string) => Promise<void>;
}) {
  if (!data) {
    return (
      <section className="mt-6 rounded-md border border-line bg-white/[0.035] p-5 text-sm text-white/55">
        Loading real {view} data from ContextKit storage.
      </section>
    );
  }
  if (view === "overview") return <OverviewData data={data} />;
  if (view === "usage") return <UsageData data={data} />;
  if (view === "payments") return <PaymentsData data={data} />;
  if (view === "credits") {
    return (
      <CreditsData
        data={data}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        onCreateTopUpInvoice={onCreateTopUpInvoice}
        onVerifyTopUpInvoice={onVerifyTopUpInvoice}
      />
    );
  }
  if (view === "webhooks") return <WebhookData data={data} />;
  return null;
}

function OverviewData({ data }: { data: ApiData }) {
  return (
    <section className="mt-6 grid gap-4 md:grid-cols-4">
      <Metric label="Requests" value={String(data.totalRequests ?? 0)} />
      <Metric label="Saved tokens" value={String(data.savedTokens ?? 0)} />
      <Metric label="Avg latency" value={`${data.averageLatencyMs ?? 0}ms`} />
      <Metric label="Tracked x402" value={`$${Number(data.paymentTotal ?? 0).toFixed(3)}`} />
    </section>
  );
}

function UsageData({ data }: { data: ApiData }) {
  const endpoints = Array.isArray(data.endpoints) ? data.endpoints as Array<Record<string, unknown>> : [];
  const requests = Array.isArray(data.requests) ? data.requests as Array<Record<string, unknown>> : [];
  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
      <div className="rounded-md border border-line bg-white/[0.035] p-5">
        <h2 className="font-semibold text-white">Top endpoints</h2>
        <div className="mt-4 grid gap-3">
          {endpoints.length ? endpoints.map((item) => (
            <div key={String(item.endpoint)} className="flex items-center justify-between rounded border border-line bg-ink/70 p-3 text-sm">
              <span className="break-all text-white/70">{String(item.endpoint)}</span>
              <span className="font-semibold text-mint">{String(item.requests ?? 0)}</span>
            </div>
          )) : <p className="text-sm text-white/45">No requests recorded for this account/key yet.</p>}
        </div>
      </div>
      <div className="rounded-md border border-line bg-white/[0.035] p-5">
        <h2 className="font-semibold text-white">Recent real requests</h2>
        <div className="mt-4 grid gap-3">
          {requests.slice(0, 8).map((item) => (
            <div key={String(item.requestId)} className="rounded border border-line bg-ink/70 p-3 text-sm">
              <div className="flex flex-col justify-between gap-2 md:flex-row">
                <span className="break-all font-mono text-aqua">{String(item.route)}</span>
                <span className="text-white/45">{String(item.completedAt ?? "")}</span>
              </div>
              <p className="mt-2 text-white/55">tokens {String(item.inputTokens ?? 0)} → {String(item.outputTokens ?? 0)} · latency {String(item.latencyMs ?? 0)}ms · status {String(item.status ?? "unknown")}</p>
            </div>
          ))}
          {!requests.length ? <p className="text-sm text-white/45">No request logs recorded yet.</p> : null}
        </div>
      </div>
    </section>
  );
}

function PaymentsData({ data }: { data: ApiData }) {
  const summary = data.summary && typeof data.summary === "object" ? data.summary as Record<string, unknown> : {};
  const payments = Array.isArray(data.payments) ? data.payments as Array<Record<string, unknown>> : [];
  return (
    <section className="mt-6 rounded-md border border-line bg-white/[0.035] p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Tracked revenue" value={`$${Number(summary.paymentTotal ?? 0).toFixed(3)}`} />
        <Metric label="Payment events" value={String(summary.paymentCount ?? payments.length)} />
        <Metric label="Source" value="Bankr x402 forwarded calls" />
      </div>
      <div className="mt-5 grid gap-3">
        {payments.slice(0, 10).map((payment) => (
          <div key={String(payment.id ?? payment.paymentId)} className="rounded border border-line bg-ink/70 p-3 text-sm">
            <p className="font-mono text-mint">{String(payment.route ?? payment.endpoint ?? "unknown")}</p>
            <p className="mt-2 text-white/55">${String(payment.amountUsd ?? payment.amount ?? 0)} · {String(payment.status ?? "recorded")} · {String(payment.createdAt ?? "")}</p>
          </div>
        ))}
        {!payments.length ? <p className="text-sm text-white/45">No ContextKit-tracked payment events yet. Bankr historical earnings remain visible in `bankr x402 list`.</p> : null}
      </div>
    </section>
  );
}

function CreditsData({
  data,
  topUpAmount,
  setTopUpAmount,
  onCreateTopUpInvoice,
  onVerifyTopUpInvoice
}: {
  data: ApiData;
  topUpAmount: string;
  setTopUpAmount: (value: string) => void;
  onCreateTopUpInvoice: () => Promise<CreditInvoicePayload>;
  onVerifyTopUpInvoice: (invoiceId: string, txHash: string) => Promise<void>;
}) {
  const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
  return (
    <section className="mt-6 rounded-md border border-line bg-white/[0.035] p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="API credit balance" value={`$${Number(data.balanceUsd ?? 0).toFixed(3)}`} />
        <Metric label="Owner" value={String(data.ownerId ?? "unknown")} />
        <Metric label="SDK mode" value="API key credits" />
      </div>
      <div className="mt-5 rounded-md border border-aqua/25 bg-aqua/10 p-4 text-sm leading-6 text-white/65">
        SDK and MCP users can run core memory tools plus the $0.01 evidence-gated skill compiler when this balance covers the endpoint price. Public skill listing still requires explicit approval; buyers use the $0.05 install lane. Insufficient balance returns the normal x402 payment challenge.
      </div>
      <div className="mt-5">
        <WalletCreditCheckout amount={topUpAmount} onAmountChange={setTopUpAmount} onCreateInvoice={onCreateTopUpInvoice} onVerifyPayment={onVerifyTopUpInvoice} />
      </div>
      <div className="mt-5 grid gap-3">
        {events.slice(0, 10).map((event) => (
          <div key={String(event.id)} className="rounded border border-line bg-ink/70 p-3 text-sm">
            <div className="flex flex-col justify-between gap-2 md:flex-row">
              <span className="font-mono text-mint">{String(event.type ?? "credit")}</span>
              <span className="text-white/45">{String(event.createdAt ?? "")}</span>
            </div>
            <p className="mt-2 text-white/55">
              amount ${String(event.amountUsd ?? 0)} · balance ${String(event.balanceAfterUsd ?? 0)} · {String(event.route ?? event.note ?? "")}
            </p>
          </div>
        ))}
        {!events.length ? <p className="text-sm text-white/45">No credit events yet. Connect a wallet above to fund SDK and MCP calls with Base USDC.</p> : null}
      </div>
    </section>
  );
}

function WebhookData({ data }: { data: ApiData }) {
  const deliveries = Array.isArray(data.deliveries) ? data.deliveries as Array<Record<string, unknown>> : [];
  const endpoints = Array.isArray(data.endpoints) ? data.endpoints as Array<Record<string, unknown>> : [];
  const rows = deliveries.length ? deliveries : endpoints;
  return (
    <section className="mt-6 rounded-md border border-line bg-white/[0.035] p-5">
      <h2 className="font-semibold text-white">{deliveries.length ? "Recent webhook deliveries" : "Webhook endpoints"}</h2>
      <div className="mt-4 grid gap-3">
        {rows.slice(0, 10).map((row, index) => (
          <div key={String(row.id ?? index)} className="rounded border border-line bg-ink/70 p-3 text-sm">
            <p className="break-all font-mono text-aqua">{String(row.url ?? row.eventId ?? row.id ?? "webhook")}</p>
            <p className="mt-2 text-white/55">status {String(row.status ?? "active")} · attempts {String(row.attempts ?? 0)} · {String(row.createdAt ?? row.deliveredAt ?? "")}</p>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-white/45">No webhook endpoints or deliveries recorded yet. Register a real endpoint above to start collecting delivery logs.</p> : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-ink/65 p-4 transition hover:border-mint/25">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mint/45 to-transparent" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold tracking-[-0.025em] text-white">{value}</p>
    </div>
  );
}

function apiErrorMessage(payload: ApiData, fallback: string) {
  const error = payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : {};
  return typeof error.message === "string" && error.message ? error.message : fallback;
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
