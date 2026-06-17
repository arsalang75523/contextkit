import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { endpoints } from "@/content/docs";
import { bankrX402Command } from "@/lib/bankr-x402";

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

const sdkClient = `import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://contextkit.pro"
});`;

const sdkMethods = `${sdkClient}

await client.summarize({ messages, mode: "micro" });
await client.compressContext({ messages });
await client.handoff({ messages });
await client.extractProfile({ messages });
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

const longContextUpload = `curl -X POST https://contextkit.pro/api/context/upload \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role":"user","content":"LONG_CONTEXT_HERE"}
    ],
    "precompute": {"endpoint":"summarize","mode":"micro"}
  }'`;

const bankrContextIdCall = `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \\
  -X POST \\
  -d '{"contextId":"ctx_REPLACE_ME","mode":"micro"}'`;

const sdkContextId = `${sdkClient}

const uploaded = await client.uploadContext({
  messages,
  ttlSeconds: 3600,
  precompute: { endpoint: "summarize", mode: "micro" }
});
const summary = await client.summarize({
  contextId: uploaded.contextId,
  mode: "micro"
});`;

const navItems = [
  "Introduction",
  "Access Paths",
  "Bankr Hosted x402",
  "Dashboard And Keys",
  "API Credits",
  "Direct API",
  "SDK",
  "Endpoint Reference",
  "Webhooks",
  "Analytics",
  "Long Context",
  "Errors",
  "Checklist"
];

export default function DocsPage() {
  return (
    <main>
      <Section eyebrow="Docs" title="ContextKit usage guide for Bankr, API keys, and SDK integrations.">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-md border border-line bg-white/[0.035] p-5 text-sm text-white/65">
            {navItems.map((item) => (
              <a key={item} href={`#${slugify(item)}`} className="block rounded px-2 py-2 hover:bg-white/[0.04] hover:text-white">
                {item}
              </a>
            ))}
          </aside>

          <div className="space-y-12">
            <DocSection id="introduction" title="Introduction">
              <p>
                ContextKit is a payable context infrastructure service for autonomous agents. It provides summarization, context compression, project handoff generation, profile extraction, memory enrichment, webhooks, usage analytics, and API-credit billing.
              </p>
              <p className="mt-3">
                The simplest public product path is Bankr-hosted x402. API keys and the SDK are for dashboard operations, server integrations, credit-backed direct calls, and advanced developer workflows.
              </p>
            </DocSection>

            <DocSection id="access-paths" title="Access Paths">
              <div className="grid gap-4 md:grid-cols-3">
                <InfoCard title="Bankr-hosted x402" body="Best for users and autonomous agents. Run a Bankr x402 command, approve payment, and receive JSON. No ContextKit API key or SDK required." />
                <InfoCard title="API key + credits" body="Best for server integrations. Use dashboard-created API keys and account credits to call direct /api routes without Bankr on every request." />
                <InfoCard title="TypeScript SDK" body="Best for app developers. The SDK wraps direct API routes, attaches API keys, returns typed JSON, verifies webhooks, and can optionally handle x402 fallback." />
              </div>
            </DocSection>

            <DocSection id="bankr-hosted-x402" title="Bankr Hosted x402">
              <p>
                Bankr-hosted endpoints are the main paid public URLs. Bankr handles the x402 payment and forwards the paid request to ContextKit internal endpoints.
              </p>
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
                  const payload = endpoint.slug === "summarize" ? summarizePayload : samplePayload;
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

            <DocSection id="long-context" title="Long Context">
              <p>
                For large source conversations, upload the payload once, precompute the target operation, then reuse the returned <code>contextId</code> with summarize, compress-context, handoff, extract-profile, or memory-enrichment. This keeps the paid Bankr call small and fast while preserving the normal endpoint response shape.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-white">Upload payload</h3>
                  <CodeBlock code={longContextUpload} />
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-white">Call Bankr with contextId</h3>
                  <CodeBlock code={bankrContextIdCall} />
                </div>
              </div>
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
        </div>
      </Section>
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
    ["Summarize", "summarize", { ...samplePayload, mode: "micro" }],
    ["Compress context", "compress-context", samplePayload],
    ["Agent handoff", "handoff", samplePayload],
    ["Extract profile", "extract-profile", samplePayload]
  ].map(([title, slug, payload]) => ({
    title: String(title),
    code: bankrX402Command(String(slug), payload)
  }));
}

function slugify(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-mint/20 bg-mint/10 p-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{body}</p>
    </div>
  );
}

function ErrorRow({ code, text }: { code: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.035] p-4">
      <p className="font-mono text-sm text-mint">{code}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
    </div>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-4 leading-7 text-white/65">{children}</div>
    </section>
  );
}
