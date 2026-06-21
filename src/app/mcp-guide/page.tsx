import Link from "next/link";
import { ArrowRight, CheckCircle2, Laptop, Terminal, Wrench } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";

const endpoint = "https://contextkit.pro/mcp";

const codexCli = `codex mcp add contextkit \\
  --url ${endpoint}

codex mcp list`;

const manualBearer = `export CONTEXTKIT_MCP_KEY="ck_live_your_key"

codex mcp add contextkit \\
  --url ${endpoint} \\
  --bearer-token-env-var CONTEXTKIT_MCP_KEY`;

const jsonConfig = `{
  "mcpServers": {
    "contextkit": {
      "url": "${endpoint}"
    }
  }
}`;

export const metadata = {
  title: "MCP Guide",
  description: "Connect ContextKit MCP from IDEs, Connector UIs, and the terminal."
};

export default function McpGuidePage() {
  return (
    <main>
      <section className="px-5 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-aqua">ContextKit MCP</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-6xl">Give your coding agent durable context tools.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/65">Connect once with OAuth, then let the agent summarize, compress, hand off, extract profile memory, estimate tokens, and inspect account credits from ContextKit.</p>
          <div className="mt-9 flex flex-col gap-3 rounded-md border border-aqua/25 bg-aqua/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between">
            <code className="break-all font-mono text-sm text-white">{endpoint}</code>
            <Link href="#ide" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-aqua px-4 text-sm font-medium text-ink transition hover:bg-mint">
              Connect an IDE <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Section eyebrow="IDE And App" title="Use Streamable HTTP and OAuth Connect.">
        <div id="ide" className="grid gap-4 lg:grid-cols-3">
          <GuideCard icon={Laptop} number="01" title="Add a custom MCP">
            In your IDE or agent app, choose <strong>Custom MCP</strong> or <strong>Add MCP server</strong>.
          </GuideCard>
          <GuideCard icon={Wrench} number="02" title="Choose Streamable HTTP">
            Set transport to <strong>Streamable HTTP</strong>, then paste the endpoint above. Do not choose STDIO.
          </GuideCard>
          <GuideCard icon={CheckCircle2} number="03" title="Connect with OAuth">
            Select <strong>Connect</strong>, sign in to ContextKit, then approve the requested <code>context:write</code> permission. No client ID or API key is needed.
          </GuideCard>
        </div>
        <div className="mt-7 rounded-md border border-line bg-white/[0.035] p-5 text-sm leading-7 text-white/65">
          If the client asks for a URL, use <code>{endpoint}</code>. If it asks for an OAuth client ID, leave it empty: ContextKit supports automatic client registration.
        </div>
      </Section>

      <Section eyebrow="Terminal" title="Add ContextKit from the Codex CLI.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-white"><Terminal className="h-5 w-5 text-mint" /> OAuth connection</h2>
            <p className="mb-4 text-sm leading-6 text-white/60">Run this once. Codex opens the ContextKit OAuth flow when it needs authorization.</p>
            <CodeBlock code={codexCli} />
          </div>
          <div>
            <h2 className="mb-3 text-xl font-semibold text-white">Bearer fallback</h2>
            <p className="mb-4 text-sm leading-6 text-white/60">Use only for hosts that do not support OAuth. Create a dedicated <code>context:write</code> key in Dashboard first.</p>
            <CodeBlock code={manualBearer} />
          </div>
        </div>
      </Section>

      <Section eyebrow="Generic Config" title="For IDEs that accept an MCP JSON configuration.">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <CodeBlock code={jsonConfig} />
          <div className="rounded-md border border-mint/20 bg-mint/10 p-6 text-sm leading-7 text-white/70">
            <h2 className="text-lg font-semibold text-white">Available tools</h2>
            <ul className="mt-4 space-y-2 font-mono text-xs text-mint">
              <li>contextkit_summarize</li>
              <li>contextkit_compress_context</li>
              <li>contextkit_handoff</li>
              <li>contextkit_extract_profile</li>
              <li>contextkit_estimate_tokens</li>
              <li>contextkit_get_credits</li>
            </ul>
          </div>
        </div>
      </Section>

      <section className="border-t border-line px-5 py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 rounded-md border border-line bg-carbon/70 p-7 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Need account credits before your agent runs paid tools?</p>
            <p className="mt-2 text-sm text-white/60">OAuth tools spend the same ContextKit credits as direct API requests.</p>
          </div>
          <Link href="/dashboard/credits" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-mint px-5 text-sm font-medium text-ink transition hover:bg-aqua">
            Open Credits <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function GuideCard({ icon: Icon, number, title, children }: { icon: typeof Laptop; number: string; title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-md border border-line bg-white/[0.035] p-6">
      <div className="flex items-center justify-between">
        <Icon className="h-6 w-6 text-aqua" />
        <span className="font-mono text-xs text-white/35">{number}</span>
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-white/62">{children}</p>
    </article>
  );
}
