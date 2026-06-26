import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, KeyRound, Network, Sparkles, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { bankrEndpoints, endpoints } from "@/content/docs";
import { bankrHostedUrl, bankrX402Command } from "@/lib/bankr-x402";

const samplePayload = {
  messages: [
    {
      role: "user",
      content: "Project Atlas is preparing a night-bus pilot. Preserve goal, status, blockers, constraints, decisions, and next actions."
    }
  ]
};

const summarizePayload = {
  ...samplePayload,
  mode: "compact"
};

const directApiExample = directApiCurl("/api/summarize", summarizePayload);

const sdkInstall = `npm install @basedchef/contextkit`;

const mcpConfig = `{
  "mcpServers": {
    "contextkit": {
      "url": "https://contextkit.pro/mcp",
      "headers": {
        "Authorization": "Bearer <CONTEXTKIT_API_KEY>"
      }
    }
  }
}`;

const sdkClient = `import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://contextkit.pro"
});`;

const sdkMethods = `${sdkClient}

await client.summarize({ messages, mode: "compact" });
await client.compressContext({ messages });
await client.handoff({ messages });
await client.extractProfile({ messages });
await client.extractProfile({ messages, mode: "memory-enrichment" });
await client.memoryEnrichment({ messages });
await client.estimateTokens({ modelFamily: "openai", input: messages });
await client.credits();`;

const sdkCredits = `${sdkClient}

const credits = await client.credits();
console.log(credits.balanceUsd);`;

const optionalX402 = `const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://contextkit.pro",
  x402: async (challenge, request) => {
    return wallet.pay(challenge, request);
  }
});`;

const dashboardSignup = `curl -X POST https://contextkit.pro/api/dashboard/signup \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Autonomous Agent Operator",
    "email": "agent-owner@example.com",
    "password": "replace-with-12-plus-chars",
    "company": "Agent Lab"
  }'`;

const dashboardLogin = `curl -i -X POST https://contextkit.pro/api/dashboard/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "agent-owner@example.com",
    "password": "replace-with-12-plus-chars"
  }'`;

const tokenEstimate = directApiCurl("/api/tokens/estimate", {
  modelFamily: "openai",
  input: [{ role: "user", content: "Long context to estimate." }],
  compressed: "Compressed context."
});

const creditsCurl = `curl https://contextkit.pro/api/auth/credits \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"`;

const webhookRegister = `curl -X POST https://contextkit.pro/api/webhooks/register \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/contextkit/webhook",
    "events": ["request.completed", "summarization.completed", "context.compressed", "handoff.generated", "profile.extracted"]
  }'`;

const webhookVerify = `import { verifyContextKitWebhook } from "@basedchef/contextkit";

const valid = await verifyContextKitWebhook({
  payload: rawBody,
  signature: request.headers.get("ContextKit-Signature")!,
  secret: process.env.CONTEXTKIT_WEBHOOK_SECRET!
});`;

const longContextUpload = `cat > long-context.txt <<'EOF'
Paste the long conversation or document here.
EOF

curl -X POST "https://contextkit.pro/api/context/upload-text?endpoint=summarize&mode=compact" \\
  -H "Content-Type: text/plain" \\
  --data-binary @long-context.txt`;

const bankrContextIdCall = bankrX402Command("summarize", { contextId: "ctx_REPLACE_ME", mode: "compact" });

const longContextExamples = [
  {
    title: "Summarize",
    upload: uploadTextCommand("summarize", "compact"),
    call: bankrContextCommand("summarize", '{"contextId":"ctx_REPLACE_ME","mode":"compact"}')
  },
  {
    title: "Compress context",
    upload: uploadTextCommand("compress-context"),
    call: bankrContextCommand("compress-context", '{"contextId":"ctx_REPLACE_ME"}')
  },
  {
    title: "Agent handoff",
    upload: uploadTextCommand("handoff"),
    call: bankrContextCommand("handoff", '{"contextId":"ctx_REPLACE_ME"}')
  },
  {
    title: "Extract profile",
    upload: uploadTextCommand("extract-profile", "extract-profile"),
    call: bankrContextCommand("extract-profile", '{"contextId":"ctx_REPLACE_ME","mode":"extract-profile"}')
  },
  {
    title: "Memory enrichment",
    upload: uploadTextCommand("extract-profile", "memory-enrichment"),
    call: bankrContextCommand("extract-profile", '{"contextId":"ctx_REPLACE_ME","mode":"memory-enrichment"}'),
    note: "Bankr memory enrichment is a mode of contextkit-core. Direct API-key usage can still call /api/memory-enrichment."
  }
];

const sdkContextId = `${sdkClient}

const uploaded = await client.uploadContext({
  messages,
  ttlSeconds: 3600,
  precompute: { endpoint: "summarize", mode: "compact" }
});
const summary = await client.summarize({
  contextId: uploaded.contextId,
  mode: "compact"
});`;

const navItems = [
  "Introduction",
  "Access Paths",
  "Bankr Hosted x402",
  "Dashboard And Keys",
  "MCP",
  "Long Context",
  "API Credits",
  "Direct API",
  "SDK",
  "Endpoint Reference",
  "Webhooks",
  "Analytics",
  "Errors",
  "Checklist"
];

export default function DocsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:py-10">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-44 top-32 h-[34rem] w-[34rem] rounded-full bg-mint/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute -right-48 top-[50rem] h-[32rem] w-[32rem] rounded-full bg-aqua/[0.06] blur-[110px]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.55rem] border border-white/[0.13] bg-carbon/80 shadow-[0_24px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42 sm:px-7"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> ContextKit docs / v1</span><span className="hidden sm:inline">bankr, SDK, direct API, MCP</span><span className="text-mint">developer reference</span></div>
          <div className="grid gap-7 px-6 py-8 sm:px-9 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-10"><div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Integration guide</div><h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Everything an agent needs to keep context moving.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Start with a hosted x402 command, wire direct API credits into your backend, or connect MCP to a coding agent. This guide covers the full path.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/playground" className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white">Try playground <ArrowRight className="h-4 w-4" /></Link><Link href="/api-reference" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-ink/45 px-4 text-sm text-white/75 transition hover:border-mint/45 hover:text-white">API reference <ArrowRight className="h-4 w-4" /></Link></div></div><div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><DocsPulse icon={<Terminal className="h-4 w-4" />} title="Bankr x402" text="Public paid calls with USDC settlement." /><DocsPulse icon={<KeyRound className="h-4 w-4" />} title="SDK + credits" text="Scoped keys and direct production routes." /><DocsPulse icon={<Network className="h-4 w-4" />} title="Remote MCP" text="OAuth-connected agent tools over HTTP." /></div></div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[1.25rem] border border-line bg-carbon/70 p-3 text-sm text-white/65 lg:sticky lg:top-24">
            <div className="border-b border-line px-3 pb-3 pt-2"><p className="font-mono text-[10px] uppercase tracking-[0.17em] text-mint">On this page</p><p className="mt-1 text-sm text-white/48">14 integration topics</p></div>
            <nav className="mt-2 max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
            {navItems.map((item, index) => (
              <a key={item} href={`#${slugify(item)}`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-white/[0.05] hover:text-white">
                <span className="font-mono text-[10px] text-white/30 group-hover:text-mint">{String(index + 1).padStart(2, "0")}</span><span>{item}</span>
              </a>
            ))}
            </nav>
          </aside>

          <div className="space-y-12">
            <DocSection id="introduction" title="Introduction">
              <p>
                ContextKit is a payable context infrastructure service for autonomous agents. Bankr-hosted x402 now exposes four paid lanes: core context operations, experience write, experience search, and experience buy.
              </p>
              <p className="mt-3">
                The simplest public product path is Bankr-hosted x402. API keys and the SDK are for dashboard operations, server integrations, credit-backed direct calls, MCP hosts, and advanced developer workflows.
              </p>
            </DocSection>

            <DocSection id="access-paths" title="Access Paths">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard title="Bankr-hosted x402" body="Best for users and autonomous agents. Run a Bankr x402 command, approve payment, and receive JSON. No ContextKit API key or SDK required." />
                <InfoCard title="API key + credits" body="Best for server integrations. Use dashboard-created API keys and account credits to call direct /api routes without Bankr on every request." />
                <InfoCard title="TypeScript SDK" body="Best for app developers. The SDK wraps direct API routes, attaches API keys, returns typed JSON, verifies webhooks, and can optionally handle x402 fallback." />
                <InfoCard title="Hosted MCP" body="Best for agent hosts. Connect one Streamable HTTP MCP server with a scoped API key; tools use the same account credits and API policy as direct calls." />
              </div>
            </DocSection>

            <DocSection id="bankr-hosted-x402" title="Bankr Hosted x402">
              <p>
                Bankr-hosted endpoints are the main paid public URLs. Bankr handles the x402 payment and forwards the paid request to ContextKit internal endpoints. The current Bankr surface is intentionally compressed into four lanes.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {bankrEndpoints.map((endpoint) => (
                  <InfoCard key={endpoint.slug} title={`${endpoint.slug} ${endpoint.price}`} body={`${endpoint.description} Modes: ${endpoint.modes.join(", ")}.`} />
                ))}
              </div>
              <div className="mt-4 grid gap-4">
                {hostedExamples().map((item) => (
                  <div key={item.title}>
                    <h3 className="mb-2 font-semibold text-white">{item.title}</h3>
                    <CodeBlock code={item.code} />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {["No ContextKit API key required", "No npm package required", "No SDK required", "Only Bankr login and payment approval required"].map((item) => (
                  <div key={item} className="rounded-md border border-mint/20 bg-mint/10 p-3 text-sm text-white/70">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-aqua/20 bg-aqua/10 p-4 text-sm leading-6 text-white/65">
                For large contexts, upload the message payload first and call Bankr-hosted x402 with the returned <code>contextId</code>. This keeps the paid x402 request small while ContextKit loads the full context server-side.
              </div>
            </DocSection>

            <DocSection id="dashboard-and-keys" title="Dashboard And Keys">
              <p>
                API keys are created from the dashboard and shown once. They identify accounts, scopes, usage, webhooks, analytics, credits, and SDK integrations. Do not hardcode real keys in public repos.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-white">Signup</h3>
                  <CodeBlock code={dashboardSignup} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Login</h3>
                  <CodeBlock code={dashboardLogin} />
                </div>
              </div>
              <div className="mt-4 rounded-md border border-aqua/20 bg-aqua/10 p-4 text-sm leading-6 text-white/65">
                Create and revoke API keys in <code>/dashboard/keys</code>. Use API keys with <code>Authorization: Bearer &lt;CONTEXTKIT_API_KEY&gt;</code>.
              </div>
            </DocSection>

            <DocSection id="mcp" title="MCP">
              <p>
                ContextKit exposes a secure, stateless Streamable HTTP MCP server at <code>https://contextkit.pro/mcp</code>. OAuth-capable Connector UIs can use Connect directly; ContextKit handles MCP OAuth discovery, dynamic registration, PKCE, dashboard sign-in, and account consent.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoCard title="1. Connector UI" body="Add https://contextkit.pro/mcp and select Connect. Sign in to ContextKit, review the requested permission, and approve it. No client ID is needed." />
                <InfoCard title="2. Add credits" body="Paid MCP tools spend the same account credits as direct API and SDK requests. Top up from Dashboard before long-running agent use." />
                <InfoCard title="3. CLI or backend" body="Use a dedicated API key with context:write in the Authorization header when your MCP host does not offer OAuth Connect." />
              </div>
              <div className="mt-4 rounded-md border border-amber/25 bg-amber/[0.08] p-4 text-sm leading-6 text-white/68">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">MCP V2 auto-capture</p>
                <p className="mt-2">
                  Tell connected agents to call <code>contextkit_experience_consider</code> after completed non-trivial work, passing the user request, actions, final result, and reusable lesson. ContextKit saves only real reusable experience drafts privately. Agents must ask the user before calling <code>contextkit_experience_publish</code>.
                </p>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-white">Connection configuration</h3>
                  <CodeBlock code={mcpConfig} />
                </div>
                <div className="rounded-md border border-line bg-white/[0.035] p-5 text-sm leading-6 text-white/65">
                  <h3 className="font-semibold text-white">Available tools</h3>
                  <ul className="mt-3 space-y-2 font-mono text-xs text-white/65">
                    <li>contextkit_summarize</li>
                    <li>contextkit_compress_context</li>
                    <li>contextkit_handoff</li>
                    <li>contextkit_extract_profile</li>
                    <li>contextkit_experience_consider</li>
                    <li>contextkit_experience_save</li>
                    <li>contextkit_experience_search</li>
                    <li>contextkit_experience_publish</li>
                    <li>contextkit_experience_buy</li>
                    <li>contextkit_estimate_tokens</li>
                    <li>contextkit_get_credits</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-mint/20 bg-mint/10 p-4 text-sm leading-6 text-white/65">
                MCP accepts only scoped API keys and exposes no admin, internal-forwarder, payment-wallet, key-management, or webhook-write operation. Requests are stateless, rate limited, non-cacheable, and use ContextKit&apos;s existing API-key, credit, analytics, and 402 safeguards.
              </div>
            </DocSection>

            <DocSection id="long-context" title="Long Context">
              <p>
                If your input is large, do not build JSON by hand. Paste the text into a file, upload it to ContextKit, copy the returned <code>contextId</code>, then use that ID in the paid Bankr call. The final response keeps the normal endpoint schema.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoCard title="1. Paste text" body="Put the long conversation or document into long-context.txt. No escaping, JSON formatting, or quote fixing required." />
                <InfoCard title="2. Copy contextId" body="The upload response returns a temporary ctx_... ID plus expiry and token count." />
                <InfoCard title="3. Pay with Bankr" body="Call the hosted x402 endpoint with contextId. Bankr payment happens here and ContextKit returns the cached endpoint response." />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-white">Upload and precompute</h3>
                  <CodeBlock code={longContextUpload} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Call Bankr with contextId</h3>
                  <CodeBlock code={bankrContextIdCall} />
                </div>
              </div>
              <div className="mt-6 grid gap-4">
                {longContextExamples.map((item) => (
                  <div key={item.title} className="rounded-md border border-line bg-white/[0.035] p-5">
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    {item.note ? <p className="mt-2 text-sm text-white/55">{item.note}</p> : null}
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/35">Upload and precompute</p>
                        <CodeBlock code={item.upload} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/35">Call with contextId</p>
                        <CodeBlock code={item.call} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection id="api-credits" title="API Credits">
              <p>
                Credits let API-key and SDK users call paid direct endpoints without Bankr per request. Direct paid routes spend credits first; if credits are insufficient, ContextKit returns a normal HTTP 402 x402 challenge.
              </p>
              <CodeBlock code={creditsCurl} />
              <p className="mt-3">
                Users can buy credits from <code>/dashboard/credits</code>. The dashboard creates a USDC invoice, the user sends USDC on Base, pastes the transaction hash, and ContextKit verifies the transfer before granting credits.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {["Verifies transaction receipt on Base", "Checks Base USDC Transfer event", "Requires recipient to match ContextKit wallet", "Blocks reused transaction hashes"].map((item) => (
                  <div key={item} className="rounded-md border border-line bg-white/[0.035] p-3 text-sm text-white/65">
                    {item}
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection id="direct-api" title="Direct API">
              <p>
                Direct API routes are for SDK and backend integrations. They require an API key. Paid generation routes use credits first and return 402 when payment is still required.
              </p>
              <CodeBlock code={directApiExample} />
              <p className="mt-4">Token estimates are API-key only and do not require Bankr payment:</p>
              <CodeBlock code={tokenEstimate} />
            </DocSection>

            <DocSection id="sdk" title="SDK">
              <p>
                The SDK is a TypeScript wrapper around the direct API. It attaches API keys, sends typed requests, uses account credits, returns typed JSON, exposes credit balance, verifies webhooks, and supports optional x402 fallback.
              </p>
              <div className="mt-4 grid gap-4">
                <div>
                  <h3 className="mb-2 font-semibold text-white">Install</h3>
                  <CodeBlock code={sdkInstall} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Client</h3>
                  <CodeBlock code={sdkClient} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Methods</h3>
                  <CodeBlock code={sdkMethods} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Long context with contextId</h3>
                  <CodeBlock code={sdkContextId} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Credits</h3>
                  <CodeBlock code={sdkCredits} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Optional x402 fallback</h3>
                  <CodeBlock code={optionalX402} />
                </div>
              </div>
            </DocSection>

            <DocSection id="endpoint-reference" title="Endpoint Reference">
              <div className="grid gap-5">
                {endpoints.map((endpoint) => {
                  const payload = endpoint.slug === "summarize" ? summarizePayload : endpoint.slug === "memory-enrichment" ? { ...samplePayload, mode: "memory-enrichment" } : samplePayload;
                  return (
                    <div key={endpoint.path} className="rounded-md border border-line bg-white/[0.035] p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded bg-mint/10 px-2 py-1 font-mono text-xs text-mint">{endpoint.method}</span>
                        <span className="font-mono text-sm text-white">{endpoint.path}</span>
                        <span className="rounded bg-aqua/10 px-2 py-1 text-xs text-aqua">{endpoint.price}</span>
                      </div>
                      <p className="mt-3 text-sm text-white/60">{endpoint.description}</p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">Bankr hosted</h3>
                          <CodeBlock code={bankrX402Command(endpoint.slug, payload)} />
                        </div>
                        <div>
                          <h3 className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">Direct API key curl</h3>
                          <CodeBlock code={directApiCurl(endpoint.path, payload)} />
                        </div>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/35">Webhook: {endpoint.event}</p>
                    </div>
                  );
                })}
              </div>
            </DocSection>

            <DocSection id="webhooks" title="Webhooks">
              <p>
                Webhooks notify your system after completed requests. Deliveries include <code>ContextKit-Signature</code>, <code>ContextKit-Event</code>, and <code>ContextKit-Request-Id</code> headers. Use replay endpoints for audit recovery.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-white">Register</h3>
                  <CodeBlock code={webhookRegister} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Verify signature</h3>
                  <CodeBlock code={webhookVerify} />
                </div>
              </div>
            </DocSection>

            <DocSection id="analytics" title="Analytics">
              <p>
                API-key users can inspect usage, tokens, payments, request history, webhook deliveries, and credits from the dashboard. Public aggregate metrics are available for lightweight status displays.
              </p>
              <CodeBlock code={`curl https://contextkit.pro/api/analytics/overview \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"

curl https://contextkit.pro/api/analytics/usage \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>"

curl https://contextkit.pro/api/public/metrics`} />
            </DocSection>

            <DocSection id="errors" title="Errors">
              <div className="grid gap-3">
                <ErrorRow code="401 invalid_api_key" text="API key is missing, invalid, or revoked." />
                <ErrorRow code="402 payment_required" text="Credits are insufficient or direct x402 payment is required." />
                <ErrorRow code="403 forbidden" text="The caller is authenticated but not allowed to perform the requested operation." />
                <ErrorRow code="429 rate_limited" text="The caller exceeded the configured rate limit." />
                <ErrorRow code="503 internal_not_configured" text="Required server environment variable is missing." />
                <ErrorRow code="payment_not_verified" text="Credit top-up transaction did not match the invoice transfer requirements." />
              </div>
            </DocSection>

            <DocSection id="checklist" title="Checklist">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Use Bankr-hosted x402 for the simplest public paid calls.",
                  "Use dashboard-created API keys for server integrations.",
                  "Use a dedicated context:write API key for MCP; never put admin, internal, or Bankr secrets in an MCP client.",
                  "Top up API credits before SDK paid endpoint calls.",
                  "Use <CONTEXTKIT_API_KEY> placeholders in public docs and repos.",
                  "Use /dashboard/keys for key creation and revocation.",
                  "Use /dashboard/credits for USDC credit purchases.",
                  "Use SDK only when building a TypeScript integration.",
                  "Configure webhook secrets before production webhooks.",
                  "Never commit .env, real API keys, Bankr keys, or GitHub tokens."
                ].map((item) => (
                  <div key={item} className="rounded-md border border-line bg-white/[0.035] p-3 text-sm text-white/65">
                    {item}
                  </div>
                ))}
              </div>
            </DocSection>
          </div>
        </section>
      </div>
    </main>
  );
}

function directApiCurl(path: string, payload: unknown) {
  const body = JSON.stringify(payload).replaceAll("'", "'\\''");
  return `curl -X POST https://contextkit.pro${path} \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '${body}'`;
}

function hostedExamples() {
  return [
    ["Summarize", "summarize", { ...samplePayload, mode: "compact" }],
    ["Compress context", "compress-context", samplePayload],
    ["Agent handoff", "handoff", samplePayload],
    ["Extract profile", "extract-profile", { ...samplePayload, mode: "extract-profile" }],
    ["Memory enrichment", "extract-profile", { ...samplePayload, mode: "memory-enrichment" }]
  ].map(([title, slug, payload]) => ({
    title: String(title),
    code: bankrX402Command(String(slug), payload)
  }));
}

function uploadTextCommand(endpoint: string, mode?: string) {
  const params = new URLSearchParams({ endpoint });
  if (mode) params.set("mode", mode);
  return `cat > long-context.txt <<'EOF'
Paste the long conversation or document here.
EOF

curl -X POST "https://contextkit.pro/api/context/upload-text?${params.toString()}" \\
  -H "Content-Type: text/plain" \\
  --data-binary @long-context.txt`;
}

function bankrContextCommand(slug: string, payload: string) {
  try {
    return bankrX402Command(slug, JSON.parse(payload));
  } catch {
    return `bankr x402 call ${bankrHostedUrlForDocs(slug)} \\
  -X POST \\
  -d '${payload}'`;
  }
}

function bankrHostedUrlForDocs(slug: string) {
  const map: Record<string, string> = {
    summarize: "contextkit-core",
    "compress-context": "contextkit-core",
    handoff: "contextkit-core",
    "extract-profile": "contextkit-core",
    "memory-enrichment": "contextkit-core"
  };
  return bankrHostedUrl(map[slug] ?? slug);
}

function slugify(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-mint/20 bg-mint/[0.055] p-4 transition hover:border-mint/40">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
    </div>
  );
}

function ErrorRow({ code, text }: { code: string; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.03] p-4">
      <p className="font-mono text-sm text-mint">{code}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06]"><BookOpen className="h-4 w-4 text-mint" /></span><div><h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{title}</h2><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">{id}</p></div></div>
      <div className="mt-5 leading-7 text-white/65">{children}</div>
    </section>
  );
}

function DocsPulse({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 bg-carbon/90 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06] text-mint">{icon}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-sm leading-6 text-white/52">{text}</p></div></div>;
}
