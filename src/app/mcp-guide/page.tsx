import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Laptop, LockKeyhole, Network, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { CopyMcpButton } from "@/components/copy-mcp-button";

const endpoint = "https://contextkit.pro/mcp";

const claudeConnector = `Name: ContextKit
Transport: Streamable HTTP
Server URL: ${endpoint}
Authentication: OAuth / Connect`;

const codexOAuth = `codex mcp add contextkit \\
  --url ${endpoint}

codex mcp list`;

const codexBearer = `export CONTEXTKIT_MCP_KEY="ck_live_your_scoped_key"

codex mcp add contextkit \\
  --url ${endpoint} \\
  --bearer-token-env-var CONTEXTKIT_MCP_KEY`;

const oauthJsonConfig = `{
  "mcpServers": {
    "contextkit": {
      "url": "${endpoint}"
    }
  }
}`;

const bearerJsonConfig = `{
  "mcpServers": {
    "contextkit": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer \${CONTEXTKIT_MCP_KEY}"
      }
    }
  }
}`;

export const metadata = {
  title: "MCP Guide",
  description: "Connect ContextKit MCP from Claude, Codex, Cursor, and JSON-based IDEs."
};

export default function McpGuidePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:py-10">
      <div className="agent-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute -left-44 top-36 h-[34rem] w-[34rem] rounded-full bg-mint/[0.07] blur-[110px]" />
      <div className="pointer-events-none absolute -right-48 top-[42rem] h-[32rem] w-[32rem] rounded-full bg-aqua/[0.065] blur-[110px]" />
      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.55rem] border border-white/[0.13] bg-carbon/80 shadow-[0_24px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/42 sm:px-7"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> ContextKit MCP / online</span><span className="hidden sm:inline">Streamable HTTP + OAuth</span><span className="text-mint">context:write</span></div>
          <div className="grid gap-7 px-6 py-8 sm:px-9 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-10">
            <div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Remote agent memory</div><h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Give every coding agent durable context tools.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Connect once, authenticate with OAuth, then let Claude, Codex, Cursor, or another MCP host summarize, compress, hand off, extract profile memory, estimate tokens, and inspect credits.</p><div className="mt-7 flex flex-col gap-3 rounded-xl border border-aqua/25 bg-aqua/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"><code className="break-all font-mono text-sm text-white">{endpoint}</code><CopyMcpButton endpoint={endpoint} /></div></div>
            <div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><FlowStep index="01" icon={<Wrench className="h-4 w-4" />} title="Add remote server" text="Choose Streamable HTTP, never STDIO." /><FlowStep index="02" icon={<LockKeyhole className="h-4 w-4" />} title="Sign in with OAuth" text="ContextKit registers the client and uses PKCE." /><FlowStep index="03" icon={<CheckCircle2 className="h-4 w-4" />} title="Approve access" text="Tools now spend the same scoped account credits." /><FlowStep index="04" icon={<Sparkles className="h-4 w-4" />} title="Auto-capture policy" text="After useful completed work, call consider; publish only after user approval." /></div>
          </div>
        </section>

        <section id="claude" className="mt-14 scroll-mt-24">
          <SectionHeading number="01" eyebrow="Claude app" title="Connect from Claude&apos;s Connector UI." text="Use this when you are adding ContextKit from the Claude app settings, not by editing a local file." />
          <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[1.35rem] border border-line bg-white/[0.03] p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-mint/25 bg-mint/[0.07]"><Laptop className="h-4 w-4 text-mint" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">Claude connector</p><h2 className="mt-1 text-xl font-semibold text-white">Add it in four clicks.</h2></div></div><ol className="mt-6 space-y-4 text-sm leading-6 text-white/62"><Step number="1" text="Open Claude Settings, then Connectors or Integrations." /><Step number="2" text="Choose Add custom MCP or Add connector." /><Step number="3" text="Select Streamable HTTP and paste the ContextKit server URL." /><Step number="4" text="Press Connect, sign in to ContextKit, then approve context:write." /></ol><p className="mt-6 rounded-xl border border-mint/20 bg-mint/[0.055] p-3 text-sm leading-6 text-white/65">Leave OAuth client ID empty unless your organization has its own registered client. ContextKit supports automatic registration for compatible connector UIs.</p></article>
            <ConfigCard title="Values to enter in Claude" label="CLAUDE APP" code={claudeConnector} tone="mint" />
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading number="02" eyebrow="Codex" title="Add from the Codex desktop app or terminal." text="Use OAuth when your Codex install supports it. The bearer option is a safe fallback for a dedicated, scoped API key." />
          <div className="mt-8 grid gap-5 lg:grid-cols-2"><ConfigCard title="OAuth connection" label="CODEX CLI" code={codexOAuth} tone="mint" /><ConfigCard title="Bearer fallback" label="CODEX CLI" code={codexBearer} tone="aqua" /></div>
          <div className="mt-5 rounded-xl border border-line bg-carbon/65 p-5 text-sm leading-7 text-white/62"><p className="font-medium text-white">Codex desktop app</p><p className="mt-1">Open Settings, choose Add custom MCP, select <strong>Streamable HTTP</strong>, and enter <code>{endpoint}</code>. Choose Connect to finish OAuth in the browser. If the UI only supports a key, use the bearer fallback with a dedicated <code>context:write</code> key.</p></div>
        </section>

        <section className="mt-16">
          <SectionHeading number="03" eyebrow="Cursor + JSON IDEs" title="Use OAuth JSON first. Add a bearer header only when OAuth is unavailable." text="Cursor and other JSON-configured MCP hosts usually accept a remote URL configuration. The exact file location can vary by host, but the server entry is the same." />
          <div className="mt-8 grid gap-5 lg:grid-cols-2"><ConfigCard title="Cursor or OAuth-capable IDE" label="OAUTH JSON" code={oauthJsonConfig} tone="mint" /><ConfigCard title="JSON host without OAuth" label="BEARER JSON" code={bearerJsonConfig} tone="aqua" /></div>
          <div className="mt-5 grid gap-4 md:grid-cols-3"><SafetyCard icon={<KeyRound className="h-4 w-4" />} title="Use a dedicated key" text="Create a key with only context:write for a single IDE integration." /><SafetyCard icon={<LockKeyhole className="h-4 w-4" />} title="Never commit secrets" text="Store CONTEXTKIT_MCP_KEY in the IDE secret store or environment, not source control." /><SafetyCard icon={<Network className="h-4 w-4" />} title="Prefer OAuth" text="OAuth avoids copying an API key into a config file and supports account consent." /></div>
        </section>

        <section className="mt-16">
          <SectionHeading number="04" eyebrow="Tools" title="What your connected agent can call." text="All tools use the authenticated account&apos;s ContextKit credits and the same request safeguards as direct API calls." />
          <div className="mt-8 rounded-[1.2rem] border border-amber/25 bg-amber/[0.07] p-5 text-sm leading-7 text-white/68">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">Auto-capture rule</p>
            <p className="mt-2">Add this instruction to your agent: after every completed non-trivial task, call <code>contextkit_experience_consider</code> with the user request, actions, final result, and reusable lesson. If it returns <code>shouldSave:true</code>, ask the user before calling <code>contextkit_experience_publish</code>. Never publish publicly without explicit approval.</p>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[1.3rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{["contextkit_summarize", "contextkit_compress_context", "contextkit_handoff", "contextkit_extract_profile", "contextkit_experience_consider", "contextkit_experience_save", "contextkit_experience_publish", "contextkit_experience_search", "contextkit_experience_buy", "contextkit_estimate_tokens", "contextkit_get_credits"].map((tool, index) => <div key={tool} className="flex items-center gap-3 bg-carbon/90 p-4"><span className="font-mono text-[10px] text-white/35">{String(index + 1).padStart(2, "0")}</span><code className="text-sm text-mint">{tool}</code></div>)}</div>
        </section>

        <section className="mt-16 flex flex-col gap-5 rounded-[1.35rem] border border-mint/20 bg-mint/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-mint/25 bg-mint/[0.1]"><ShieldCheck className="h-5 w-5 text-mint" /></span><div><h2 className="text-xl font-semibold text-white">Need credits before the agent runs paid tools?</h2><p className="mt-2 max-w-2xl leading-7 text-white/58">OAuth and bearer MCP tools spend the same ContextKit account credits as direct API requests.</p></div></div><Link href="/dashboard/credits" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white">Open Credits <ArrowRight className="h-4 w-4" /></Link></section>
      </div>
    </main>
  );
}

function SectionHeading({ number, eyebrow, title, text }: { number: string; eyebrow: string; title: string; text: string }) {
  return <div className="flex flex-col gap-4 border-b border-line pb-7 md:flex-row md:items-end md:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">{number} / {eyebrow}</p><h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-white md:text-5xl">{title}</h2></div><p className="max-w-sm text-sm leading-6 text-white/52">{text}</p></div>;
}

function FlowStep({ index, icon, title, text }: { index: string; icon: ReactNode; title: string; text: string }) {
  return <div className="grid grid-cols-[36px_1fr] gap-3 bg-carbon/90 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06] text-mint">{icon}</span><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{index}</p><h2 className="mt-1 text-sm font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-white/52">{text}</p></div></div>;
}

function Step({ number, text }: { number: string; text: string }) {
  return <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-mint/25 bg-mint/[0.07] font-mono text-[10px] text-mint">{number}</span><span>{text}</span></li>;
}

function ConfigCard({ title, label, code, tone }: { title: string; label: string; code: string; tone: "mint" | "aqua" }) {
  const color = tone === "mint" ? "text-mint border-mint/20 bg-mint/[0.035]" : "text-aqua border-aqua/20 bg-aqua/[0.035]";
  return <article className={`overflow-hidden rounded-[1.3rem] border ${color}`}><div className="border-b border-current/15 px-5 py-4"><p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${tone === "mint" ? "text-mint" : "text-aqua"}`}>{label}</p><h2 className="mt-2 text-xl font-semibold text-white">{title}</h2></div><div className="p-4"><CodeBlock code={code} /></div></article>;
}

function SafetyCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-line bg-white/[0.025] p-5"><span className="grid h-9 w-9 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06] text-mint">{icon}</span><h3 className="mt-4 text-sm font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/52">{text}</p></div>;
}
