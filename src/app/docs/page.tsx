import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, BookOpen, KeyRound, Network, Sparkles, Terminal } from "lucide-react";
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

const repositoryCli = `npm install --global @basedchef/contextkit-cli
export CONTEXTKIT_API_KEY="ck_live_replace_me"

contextkit skill init ./my-skill --name my-skill --version 1.0.0
contextkit skill validate ./my-skill --skill-id exp_REPLACE_ME
contextkit skill push ./my-skill --skill-id exp_REPLACE_ME
contextkit skill publish ./my-skill

contextkit skill search "x402 timeout"
contextkit skill inspect exp_REPLACE_ME
contextkit skill clone exp_REPLACE_ME ./installed-skill`;

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
const draft = await client.compileSkill({ messages, autoSave: true });
if (draft.experience && draft.validation?.eligible) {
  await client.validateSkillBundle({
    skillId: draft.experience.id,
    repository: draft.experience.skill!.name,
    version: draft.experience.skill!.version,
    files
  });
  await client.pushSkillBundle({
    skillId: draft.experience.id,
    repository: draft.experience.skill!.name,
    version: draft.experience.skill!.version,
    files
  });
  await client.publishSkillVersion({
    skillId: draft.experience.id
  }); // Call only after explicit user approval.
}
const matches = await client.searchSkillRepositories({ query: "x402 timeout", compatibility: ["codex"] });
await client.inspectSkillRepository({ skillId: matches.results[0].id });
const clone = await client.cloneSkillVersion({ skillId: matches.results[0].id });
await client.estimateTokens({ modelFamily: "openai", input: messages });
await client.credits();`;

const skillRepositoryFiles = [
  { path: "SKILL.md", content: "---\\nname: bankr-x402-timeout-recovery\\ndescription: Recover bounded Bankr x402 forwarding without changing response contracts.\\nlicense: MIT\\n---\\n# Bankr x402 timeout recovery\\n\\nUse the tested source, verification, and rollback included in this repository." },
  { path: "skill.json", content: '{"schemaVersion":1,"name":"bankr-x402-timeout-recovery","version":"1.0.0","runtime":"node22","entrypoint":"src/index.js","testCommand":"npm test"}' },
  { path: "LICENSE", content: "MIT License" },
  { path: "package.json", content: '{"name":"bankr-x402-timeout-recovery","version":"1.0.0","type":"module","scripts":{"test":"node --test tests/*.test.js"}}' },
  { path: "package-lock.json", content: '{"name":"bankr-x402-timeout-recovery","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{"":{"name":"bankr-x402-timeout-recovery","version":"1.0.0"}}}' },
  { path: "config.schema.json", content: '{"type":"object","properties":{"backendUrl":{"type":"string","format":"uri"}},"required":["backendUrl"],"additionalProperties":false}' },
  { path: "src/index.js", content: "export function boundedTimeout(originMs, gatewayMs) { return Math.max(1000, Math.min(originMs + gatewayMs, 55000)); }" },
  { path: "tests/timeout.test.js", content: "import test from 'node:test'; import assert from 'node:assert/strict'; import { boundedTimeout } from '../src/index.js'; test('keeps paid forwarding bounded', () => assert.equal(boundedTimeout(42000, 8000), 50000));" },
  { path: "examples/basic.js", content: "import { boundedTimeout } from '../src/index.js'; console.log(boundedTimeout(42000, 8000));" }
];

const skillCompile = bankrX402Command("skill-compile", {
  mode: "skill-compile",
  messages: [
    { role: "user", content: "Repair the Bankr x402 timeout without changing the response contract, then verify the paid path." },
    { role: "assistant", content: "Compared origin and gateway latency, moved long work before payment, and preserved the schema. Executed curl against the paid endpoint; exact output: HTTP/2 200 and mode=compact. Reusable lesson: precompute slow work and keep the paid forwarding call bounded." }
  ]
});

const skillSearch = bankrX402Command("skill-search", {
  query: "x402 timeout recovery",
  ecosystems: ["x402"],
  compatibility: ["codex"],
  verifiedOnly: true
});

const skillValidate = bankrX402Command("skill-validate", {
  mode: "skill-validate",
  skillId: "exp_REPLACE_ME",
  publishToken: "pub_REPLACE_ME",
  repository: "bankr-x402-timeout-recovery",
  version: "1.0.0",
  files: skillRepositoryFiles
});

const skillPush = bankrX402Command("skill-push", {
  mode: "skill-push",
  skillId: "exp_REPLACE_ME",
  publishToken: "pub_REPLACE_ME",
  repository: "bankr-x402-timeout-recovery",
  version: "1.0.0",
  files: skillRepositoryFiles
});

const skillRepositoryPublish = bankrX402Command("skill-repository-publish", {
  mode: "skill-repository-publish",
  skillId: "exp_REPLACE_ME",
  publishToken: "pub_REPLACE_ME",
  userApproved: true,
  priceUsd: 0.05
});

const skillInspect = bankrX402Command("skill-inspect", { mode: "skill-inspect", skillId: "exp_REPLACE_ME" });
const skillClone = bankrX402Command("skill-clone", { mode: "skill-clone", skillId: "exp_REPLACE_ME" });

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
  "Skill Repositories",
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
          <div className="grid gap-7 px-6 py-8 sm:px-9 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-10"><div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Integration guide</div><h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Preserve agent context. Ship only proven skills.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Connect through Bankr x402, direct API credits, the TypeScript SDK, or MCP. This guide covers continuation memory plus evidence-gated skill compilation, approval, discovery, and installation.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/playground" className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white">Try playground <ArrowRight className="h-4 w-4" /></Link><Link href="/api-reference" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-ink/45 px-4 text-sm text-white/75 transition hover:border-mint/45 hover:text-white">API reference <ArrowRight className="h-4 w-4" /></Link></div></div><div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><DocsPulse icon={<Terminal className="h-4 w-4" />} title="Bankr x402" text="Public paid calls with USDC settlement." /><DocsPulse icon={<KeyRound className="h-4 w-4" />} title="SDK + credits" text="Scoped keys and direct production routes." /><DocsPulse icon={<Network className="h-4 w-4" />} title="Remote MCP" text="OAuth-connected agent tools over HTTP." /><DocsPulse icon={<BadgeCheck className="h-4 w-4" />} title="Verified skills" text="Proof-gated drafts and approval-only publishing." /></div></div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[1.25rem] border border-line bg-carbon/70 p-3 text-sm text-white/65 lg:sticky lg:top-24">
            <div className="border-b border-line px-3 pb-3 pt-2"><p className="font-mono text-[10px] uppercase tracking-[0.17em] text-mint">On this page</p><p className="mt-1 text-sm text-white/48">{navItems.length} integration topics</p></div>
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
                ContextKit is payable context and verified-skill infrastructure for autonomous agents. Bankr-hosted x402 exposes four paid lanes: core context operations, skill compilation/publishing, verified-skill search, and skill purchase.
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
                  Connected agents can read <code>contextkit://instructions</code> or call <code>contextkit_get_agent_instructions</code>. The policy tells them to call <code>contextkit_skill_compile</code> only after completed, non-trivial Bankr-adjacent work. Generic notes, plans, placeholders, project diaries, and plain claims are rejected. A private write requires a complete reusable workflow and at least one executed PASS backed by verbatim command output, test log, HTTP response, or artifact evidence. Public publishing requires three independent grounded PASS results, score 75+, safety checks, and user approval. Every proof is rendered into the skill&apos;s <code>Source evidence</code> and <code>Test evidence</code> sections. For enforced lifecycle capture, use the native adapters or VS Code-compatible runner in the <Link href="/mcp-guide" className="text-mint underline decoration-mint/30 underline-offset-4">MCP Guide</Link>.
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
                    <li>contextkit_get_agent_instructions</li>
                    <li>contextkit_summarize</li>
                    <li>contextkit_compress_context</li>
                    <li>contextkit_handoff</li>
                    <li>contextkit_extract_profile</li>
                    <li>contextkit_skill_compile</li>
                    <li>contextkit_skill_validate_bundle</li>
                    <li>contextkit_skill_push</li>
                    <li>contextkit_skill_repository_publish</li>
                    <li>contextkit_skill_search</li>
                    <li>contextkit_skill_inspect</li>
                    <li>contextkit_skill_clone</li>
                    <li>contextkit_estimate_tokens</li>
                    <li>contextkit_get_credits</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 rounded-md border border-mint/20 bg-mint/10 p-4 text-sm leading-6 text-white/65">
                MCP accepts only scoped API keys and exposes no admin, internal-forwarder, payment-wallet, key-management, or webhook-write operation. Requests are stateless, rate limited, non-cacheable, and use ContextKit&apos;s existing API-key, credit, analytics, and 402 safeguards.
              </div>
            </DocSection>

            <DocSection id="skill-repositories" title="Skill Repositories">
              <p>
                ContextKit repositories turn proven agent work into immutable, cloneable skill versions. The complete lifecycle is <code>compile → skill-validate → skill-push → skill-repository-publish → skill-search/inspect → skill-clone</code>. Compilation proves the method; repository validation proves the files; publishing always requires a separate explicit approval.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoCard title="Minimum repository" body="Every version requires SKILL.md, skill.json, and LICENSE. Repository name, skill identity, and semantic version must match exactly." />
                <InfoCard title="Executable repository" body="Public executable bundles also require package.json, package-lock.json, config.schema.json, meaningful src/, tests/, and examples/. Install lifecycle hooks are forbidden." />
                <InfoCard title="Content addressed" body="Files receive SHA-256 checksums and a deterministic bundle digest. A published semantic version is immutable; changes require a new version." />
                <InfoCard title="Security gate" body="ContextKit rejects traversal and absolute paths, secret-like values, private key material, build/vendor directories, unsafe install hooks, incomplete executable contracts, and decoded bundles above 320KB." />
                <InfoCard title="Paid clone" body="After the $0.05 purchase, skill-clone returns every file with path, content, encoding, size, SHA-256, manifest, validation, license, and safe no-overwrite materialization instructions." />
                <InfoCard title="Legacy compatible" body="Older verified listings still return the evidence-bearing SKILL.md install format. Repository-backed versions add the complete source tree without breaking existing buyers." />
              </div>
              <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
                {["Compile proof", "Validate files", "Push version", "Approve publish", "Search / inspect", "Paid clone"].map((label, index) => (
                  <div key={label} className="bg-carbon/95 p-4"><span className="font-mono text-[10px] text-mint">{String(index + 1).padStart(2, "0")}</span><p className="mt-2 text-sm font-medium text-white">{label}</p></div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div><h3 className="mb-2 font-semibold text-white">Repository CLI</h3><CodeBlock code={repositoryCli} /></div>
                <div className="rounded-md border border-aqua/20 bg-aqua/[0.06] p-5 text-sm leading-6 text-white/65">
                  <h3 className="font-semibold text-white">Git-like, but paid and verified</h3>
                  <p className="mt-3">The CLI collects safe files, rejects symlinks and local secrets, preserves Git-style <code>0644/0755</code> modes, and verifies every checksum before clone writes anything. Direct CLI calls use dashboard API-key credits; the equivalent Bankr commands below settle each lane through x402.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div><h3 className="mb-2 font-semibold text-white">1. Compile evidence-backed draft</h3><CodeBlock code={skillCompile} /></div>
                <div><h3 className="mb-2 font-semibold text-white">2. Validate complete files</h3><CodeBlock code={skillValidate} /></div>
                <div><h3 className="mb-2 font-semibold text-white">3. Push immutable version</h3><CodeBlock code={skillPush} /></div>
                <div><h3 className="mb-2 font-semibold text-white">4. Explicit repository publish</h3><CodeBlock code={skillRepositoryPublish} /></div>
                <div><h3 className="mb-2 font-semibold text-white">5. Search then inspect manifest</h3><CodeBlock code={`${skillSearch}\n\n${skillInspect}`} /></div>
                <div><h3 className="mb-2 font-semibold text-white">6. Pay and clone every file</h3><CodeBlock code={skillClone} /></div>
              </div>
              <div className="mt-4 rounded-md border border-amber/25 bg-amber/[0.08] p-4 text-sm leading-6 text-white/68">
                Bankr-hosted drafts use the one-draft <code>publishToken</code> returned by compile for validate, push, and publish. Direct API/MCP owners use their authenticated account ownership. <code>skill-validate</code> never stores files; <code>skill-push</code> stores the immutable content-addressed version; only <code>skill-repository-publish</code> lists it. Write-lane operations cost <code>$0.01</code>; search/inspect cost <code>$0.01</code>; paid clone costs <code>$0.05</code>.
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
                Users can buy credits from <code>/dashboard/credits</code>. Connect a browser wallet, choose an amount, and approve the exact USDC transfer on Base. The dashboard waits for confirmation and verifies the transaction automatically; no transaction-hash copy/paste is required.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {["Connects through Wagmi without custody", "Verifies the Base USDC Transfer event", "Requires recipient and amount to match the invoice", "Blocks reused transaction hashes"].map((item) => (
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
                <ErrorRow code="409 skill_version_immutable" text="That semantic version already exists with a different digest. Bump the version; published artifacts cannot be overwritten." />
                <ErrorRow code="422 skill_bundle_invalid" text="Repository files failed path, secret, identity, required-file, executable-contract, or size validation." />
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
                  "Validate before push; push before skill-repository-publish; never reuse a published semantic version for different bytes.",
                  "Keep decoded repository bundles below 320KB and verify every SHA-256 before materializing a paid clone.",
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
