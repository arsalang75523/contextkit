import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, KeyRound, Laptop, LockKeyhole, Network, ShieldCheck, Sparkles, Workflow, Wrench } from "lucide-react";
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

const claudeAutoCapture = `npx @basedchef/contextkit-autocapture setup --agents claude`;

const codexHermesAutoCapture = `npx @basedchef/contextkit-autocapture setup --agents codex,hermes`;

const guaranteedRunner = `# Cursor Agent CLI
contextkit-autocapture run cursor -- "Fix the failing checkout tests"

# Claude Code CLI
contextkit-autocapture run claude -- "Implement the webhook retry policy"

# Codex CLI
contextkit-autocapture run codex -- "Verify the payment callback"`;

const openCodeAutoCapture = `npx @basedchef/contextkit-autocapture setup --agents opencode`;

const openClawAutoCapture = `npx @basedchef/contextkit-autocapture setup --agents openclaw

# Restart the OpenClaw Gateway after setup`;

const autoCaptureBootstrap = `npx @basedchef/contextkit-autocapture setup

# Optional verification
contextkit-autocapture doctor`;

const firstSellerSetup = `npx @basedchef/contextkit-autocapture@latest setup

# Confirm OAuth, MCP, and auto-capture
contextkit-autocapture doctor`;

const firstSellerPrompt = `Use the latest qualifying ContextKit private draft from this completed task.
Build the complete skill repository: SKILL.md, skill.json, LICENSE,
source, tests, examples, and checksums.
Run contextkit_skill_validate_bundle, then contextkit_skill_push.
Show the raw score, evidence report, findings, and repository digest.
Ask for my approval before contextkit_skill_repository_publish.
Do not publish unless I explicitly approve.`;

const extensionBuild = `npm run extension:package

# Then install this file from the IDE extension screen
extensions/contextkit-autocapture/contextkit-autocapture-0.1.2.vsix`;

type HostRunbook = {
  id: string;
  mark: string;
  name: string;
  environment: string;
  trigger: string;
  mode: string;
  code: string;
  steps: string[];
  verify: string;
  boundary: string;
  tone: "mint" | "aqua" | "amber";
};

const hostRunbooks: HostRunbook[] = [
  {
    id: "claude-code-autocapture",
    mark: "CL",
    name: "Claude Code",
    environment: "Terminal / IDE terminal",
    trigger: "Stop hook after each completed turn",
    mode: "Native hook",
    code: `npx @basedchef/contextkit-autocapture setup --agents claude
claude`,
    steps: [
      "Run setup once; browser OAuth replaces manual API-key export and installs the global Stop hook.",
      "ContextKit stores a refreshable credential in a user-only file and verifies MCP before setup completes.",
      "Complete a non-trivial Claude Code task; ContextKit evaluates only the latest completed user-to-agent exchange."
    ],
    verify: "Inspect ~/.claude/settings.json and complete one test task. A qualified result reports a private draft ID.",
    boundary: "Background or failed tasks are skipped. Public marketplace publishing still needs explicit user approval.",
    tone: "mint"
  },
  {
    id: "codex-autocapture",
    mark: "CX",
    name: "Codex",
    environment: "Desktop app / CLI",
    trigger: "Stop hook after a completed Codex turn",
    mode: "Native hook",
    code: `npx @basedchef/contextkit-autocapture setup --agents codex
codex

# Inside Codex, review project hook trust
/hooks`,
    steps: [
      "Run setup once to connect with browser OAuth and install the global Codex hook.",
      "Open /hooks once and approve the generated project hook when Codex requests trust.",
      "Codex provides transcript_path; ContextKit sanitizes and evaluates the finished turn automatically."
    ],
    verify: "Confirm ~/.codex/hooks.json contains ContextKit, then run a task with a clear result and check for the private-draft message.",
    boundary: "The hook returns empty JSON on ContextKit/network failure, so it never blocks the Codex task.",
    tone: "aqua"
  },
  {
    id: "hermes-autocapture",
    mark: "HM",
    name: "Hermes",
    environment: "Hermes Agent CLI",
    trigger: "post_llm_call after a successful turn",
    mode: "Native shell hook",
    code: `npx @basedchef/contextkit-autocapture setup --agents hermes
hermes hooks list
hermes hooks doctor`,
    steps: [
      "Setup signs in through OAuth and merges a real YAML list into ~/.hermes/config.yaml without replacing existing hooks.",
      "Review the command with hermes hooks list and accept Hermes first-use hook consent.",
      "The hook receives user_message, assistant_response, and conversation_history after the turn finishes."
    ],
    verify: "hermes hooks list must show one ContextKit post_llm_call entry; hooks doctor should report valid JSON and executable access.",
    boundary: "ContextKit receives the completed turn, not an unfinished streaming response. Hook errors stay isolated from Hermes.",
    tone: "amber"
  },
  {
    id: "openclaw-autocapture",
    mark: "OC",
    name: "OpenClaw",
    environment: "Gateway / agent runtime",
    trigger: "agent_end after a successful run",
    mode: "Native runtime plugin",
    code: `npx @basedchef/contextkit-autocapture setup --agents openclaw

# Restart the OpenClaw Gateway after enabling`,
    steps: [
      "Setup connects OAuth, generates and links the ContextKit OpenClaw package through the plugin manager.",
      "Setup enables final-conversation access for this plugin; restart Gateway afterward.",
      "On agent_end, the plugin sends final messages through local redaction, dedupe, and private-draft detection."
    ],
    verify: "OpenClaw plugin inspection must list contextkit-autocapture; a successful agent run should add a ContextKit log entry.",
    boundary: "Runs with success:false are ignored. Raw conversation access is opt-in and limited to this plugin.",
    tone: "mint"
  },
  {
    id: "opencode-autocapture",
    mark: "OP",
    name: "OpenCode",
    environment: "TUI / terminal agent",
    trigger: "session.idle after completion",
    mode: "Native session plugin",
    code: `npx @basedchef/contextkit-autocapture setup --agents opencode
opencode`,
    steps: [
      "Setup connects OAuth and installs globally under ~/.config/opencode/plugins.",
      "The plugin waits until the session reaches idle, then reads that session's structured messages.",
      "Failed sessions, duplicate tasks, source-file bodies, and incomplete user-only messages are excluded."
    ],
    verify: "Finish one OpenCode task and look for the ContextKit success toast; headless runs can be verified from ContextKit usage.",
    boundary: "No file-save heuristics are used. Capture happens only from the completed OpenCode session record.",
    tone: "aqua"
  },
  {
    id: "cursor-autocapture",
    mark: "CR",
    name: "Cursor",
    environment: "VS Code-compatible IDE",
    trigger: "ContextKit controlled agent runner",
    mode: "Guaranteed extension lane",
    code: `${extensionBuild}

# Command Palette
ContextKit: Configure API Key
ContextKit: Run Agent with Guaranteed Auto-Capture`,
    steps: [
      "Install the VSIX from Cursor's Extensions menu and store the key through SecretStorage.",
      "Run the ContextKit command and choose Cursor Agent, Claude Code, or Codex CLI.",
      "The extension owns the full process lifecycle and submits only after a successful exit."
    ],
    verify: "The ContextKit output channel must show the agent stream followed by skipped, private draft, or explicit publish status.",
    boundary: "Cursor's built-in chat is best-effort through MCP; guaranteed capture applies to tasks started from the ContextKit command.",
    tone: "amber"
  },
  {
    id: "vscode-autocapture",
    mark: "VS",
    name: "VS Code",
    environment: "Desktop IDE",
    trigger: "ContextKit controlled agent runner",
    mode: "Guaranteed extension lane",
    code: `code --install-extension extensions/contextkit-autocapture/contextkit-autocapture-0.1.2.vsix

# Command Palette
ContextKit: Configure API Key
ContextKit: Run Agent with Guaranteed Auto-Capture`,
    steps: [
      "Install the VSIX and configure the scoped key once; it is stored in VS Code SecretStorage.",
      "Ensure at least one supported CLI exists: cursor-agent, claude, or codex.",
      "Choose the CLI and enter the task from the ContextKit command palette workflow."
    ],
    verify: "Open View > Output > ContextKit Auto-Capture and confirm a successful agent exit plus consideration result.",
    boundary: "Other chat extensions cannot expose every transcript; their native chats are not claimed as guaranteed.",
    tone: "mint"
  },
  {
    id: "windsurf-autocapture",
    mark: "WS",
    name: "Windsurf",
    environment: "VS Code-compatible IDE",
    trigger: "ContextKit controlled agent runner",
    mode: "Guaranteed extension lane",
    code: `${extensionBuild}

# Windsurf: Extensions > ... > Install from VSIX
# Then run from Command Palette
ContextKit: Run Agent with Guaranteed Auto-Capture`,
    steps: [
      "Use Install from VSIX in Windsurf and run ContextKit: Configure API Key.",
      "Point the extension settings to an installed Cursor, Claude, or Codex executable when it is not on PATH.",
      "Launch important tasks from the ContextKit runner to guarantee a completion signal."
    ],
    verify: "Confirm the ContextKit status item appears and the output channel records the completed runner result.",
    boundary: "Windsurf native Cascade chat remains MCP-policy best-effort unless its host exposes a completion/transcript API.",
    tone: "aqua"
  },
  {
    id: "vscodium-autocapture",
    mark: "VM",
    name: "VSCodium",
    environment: "Open-source VS Code build",
    trigger: "ContextKit controlled agent runner",
    mode: "Guaranteed extension lane",
    code: `codium --install-extension extensions/contextkit-autocapture/contextkit-autocapture-0.1.2.vsix

# Command Palette
ContextKit: Configure API Key
ContextKit: Run Agent with Guaranteed Auto-Capture`,
    steps: [
      "Install the local VSIX with codium or use the Extensions menu.",
      "Configure the API key and executable paths from ContextKit Auto-Capture settings.",
      "Run tasks from the ContextKit command so the extension can observe request, output, exit status, and approval."
    ],
    verify: "A successful run appears in the ContextKit output channel and qualified drafts appear privately in the account.",
    boundary: "Marketplace availability is not required because the signed local VSIX can be installed directly.",
    tone: "amber"
  }
];

export const metadata = {
  title: "MCP Guide",
  description: "Connect ContextKit MCP and evidence-gated verified skill capture from Claude, Codex, Hermes, OpenClaw, OpenCode, Cursor, and popular IDEs."
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
            <div><div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3.5 w-3.5" /> Remote memory + skill repositories</div><h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">Give every coding agent durable context and cloneable methods.</h1><p className="mt-4 max-w-2xl leading-7 text-white/60">Connect once with OAuth. Agents can preserve context, compile proven work, validate and push complete source bundles, publish immutable versions with approval, and paid-clone every repository file.</p><div className="mt-7 flex flex-col gap-3 rounded-xl border border-aqua/25 bg-aqua/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"><code className="break-all font-mono text-sm text-white">{endpoint}</code><CopyMcpButton endpoint={endpoint} /></div></div>
            <div className="grid content-start gap-px overflow-hidden rounded-2xl border border-line bg-line"><FlowStep index="01" icon={<Wrench className="h-4 w-4" />} title="Add remote server" text="Choose Streamable HTTP, never STDIO." /><FlowStep index="02" icon={<LockKeyhole className="h-4 w-4" />} title="Sign in with OAuth" text="ContextKit registers the client and uses PKCE." /><FlowStep index="03" icon={<CheckCircle2 className="h-4 w-4" />} title="Approve access" text="Tools now spend the same scoped account credits." /><FlowStep index="04" icon={<Sparkles className="h-4 w-4" />} title="Versioned repository" text="Compile, validate, push, approve, inspect, then clone." /></div>
          </div>
        </section>

        <section id="first-sale" className="mt-14 scroll-mt-24">
          <SectionHeading
            number="00"
            eyebrow="First skill"
            title="From first sign-in to your first paid clone."
            text="The exact seller path: connect once, finish proven work, ship a complete repository, approve the listing, and earn when another agent clones it."
          />

          <div className="mt-7 overflow-hidden rounded-[1.5rem] border border-mint/20 bg-[linear-gradient(145deg,rgba(107,240,192,0.07),rgba(7,13,12,0.97)_38%,rgba(87,205,255,0.05))] shadow-[0_22px_80px_rgba(0,0,0,0.28)]">
            <div className="grid lg:grid-cols-[1.06fr_0.94fr]">
              <div className="border-b border-white/[0.08] p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.08] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mint"><Sparkles className="h-3 w-3" /> Seller launchpad</span>
                  <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/38"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> OAuth + auto-capture</span>
                </div>
                <h3 className="mt-4 max-w-2xl text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">One setup connects the account and installs every detected agent adapter.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">Sign in or create an account in the browser, approve <code>context:write</code>, and fund your credits. ContextKit stores the OAuth credential locally, configures supported hosts, and keeps every qualified capture private until you approve publishing.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <SellerControl label="ContextKit" text="capture + gates" tone="mint" />
                  <SellerControl label="Agent" text="files + tests" tone="aqua" />
                  <SellerControl label="Seller" text="final approval" tone="amber" />
                </div>
              </div>
              <div className="flex flex-col justify-between gap-3 p-4 sm:p-5">
                <CodeBlock code={firstSellerSetup} />
                <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                  <SellerSignal value="1×" label="setup" />
                  <SellerSignal value="0600" label="local credential" />
                  <SellerSignal value="private" label="default state" />
                </div>
              </div>
            </div>

            <div className="border-t border-white/[0.08] bg-black/10 p-4 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-mint">Seller pipeline / 01—06</p>
                  <h3 className="mt-1.5 text-lg font-semibold text-white">One continuous path from private proof to paid distribution.</h3>
                </div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/32">Private capture <span className="mx-2 text-mint">→</span> public listing <span className="mx-2 text-amber">→</span> paid clone</p>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <SellerJourneyStep index="01" label="Connect" tool="autocapture setup" icon={<KeyRound className="h-4 w-4" />} title="Account + credits" text="OAuth connects ContextKit and installs detected host adapters." tone="mint" />
                <SellerJourneyStep index="02" label="Complete" tool="completion hook" icon={<Wrench className="h-4 w-4" />} title="Do reusable work" text="Finish a real task with files, commands, tests, and observed results." tone="aqua" />
                <SellerJourneyStep index="03" label="Compile" tool="skill_compile" icon={<Sparkles className="h-4 w-4" />} title="Private evidence draft" text="Trivial work is rejected; qualifying work becomes a private draft with grounded proof." tone="mint" />
                <SellerJourneyStep index="04" label="Package" tool="validate_bundle" icon={<Workflow className="h-4 w-4" />} title="Build the repository" text="Add SKILL.md, manifest, license, source, tests, examples, and checksums." tone="aqua" />
                <SellerJourneyStep index="05" label="Store" tool="skill_push" icon={<ShieldCheck className="h-4 w-4" />} title="Validate + push" text="ContextKit checks safety and reproducibility, then stores one immutable version." tone="amber" />
                <SellerJourneyStep index="06" label="Market" tool="publish → clone" icon={<ArrowRight className="h-4 w-4" />} title="Approve, sell, earn" text="You approve the $0.05 listing; a buyer pays and clones the complete file tree." tone="amber" />
              </div>
            </div>

            <div className="grid gap-px border-t border-white/[0.08] bg-white/[0.08] xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,0.82fr)]">
              <article className="min-w-0 bg-carbon/90">
                <div className="flex flex-col gap-3 border-b border-aqua/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-aqua">After a successful task</p>
                    <h3 className="mt-1.5 text-lg font-semibold text-white">Give the agent one repository instruction.</h3>
                  </div>
                  <span className="w-fit rounded-full border border-aqua/20 bg-aqua/[0.06] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-aqua">Stops before publish</span>
                </div>
                <div className="p-4"><CodeBlock code={firstSellerPrompt} /></div>
              </article>

              <article className="flex flex-col justify-between bg-amber/[0.025] p-5 sm:p-6">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-amber">Public quality gate</p>
                      <h3 className="mt-1.5 text-lg font-semibold text-white">Proof before price.</h3>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-amber" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] xl:grid-cols-4">
                    <SellerMetric value="75+" label="quality score" />
                    <SellerMetric value="3" label="grounded PASS tests" />
                    <SellerMetric value="0" label="secrets / private paths" />
                    <SellerMetric value="$0.05" label="buyer clone price" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/52">The report must pass both skill and bundle validation. ContextKit accepts verbatim command output, test logs, HTTP responses, and artifact evidence—not claims like “it works.”</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/dashboard/credits" className="inline-flex h-10 items-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white">Add credits <ArrowRight className="h-4 w-4" /></Link>
                  <Link href="/marketplace" className="inline-flex h-10 items-center gap-2 rounded-lg border border-mint/25 bg-black/20 px-4 text-sm font-semibold text-mint transition hover:bg-mint/10 hover:text-white">Marketplace</Link>
                </div>
              </article>
            </div>
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
            <p className="mt-2">Agents can read <code>contextkit://instructions</code> or call <code>contextkit_get_agent_instructions</code>. Policy: call <code>contextkit_skill_compile</code> only after completed, non-trivial work with reusable cross-project value in any legitimate domain. Bankr or crypto relevance is optional. ContextKit rejects generic notes, plans, placeholders, project diaries, and plain assertions. A private draft requires a complete reusable workflow plus one executed PASS backed by verbatim command output, test log, HTTP response, or artifact evidence. Public publishing requires three independent grounded PASS results, score 75+, safety checks, and user approval. The generated SKILL.md carries the proof in <code>Source evidence</code> and <code>Test evidence</code>.</p>
          </div>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[1.3rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">{["contextkit_get_agent_instructions", "contextkit_summarize", "contextkit_compress_context", "contextkit_handoff", "contextkit_extract_profile", "contextkit_skill_compile", "contextkit_skill_validate_bundle", "contextkit_skill_push", "contextkit_skill_repository_publish", "contextkit_skill_search", "contextkit_skill_inspect", "contextkit_skill_clone", "contextkit_estimate_tokens", "contextkit_get_credits"].map((tool, index) => <div key={tool} className="flex items-center gap-3 bg-carbon/90 p-4"><span className="font-mono text-[10px] text-white/35">{String(index + 1).padStart(2, "0")}</span><code className="break-all text-sm text-mint">{tool}</code></div>)}</div>
        </section>

        <section className="mt-16">
          <SectionHeading number="05" eyebrow="Repository lifecycle" title="MCP can move a tested skill from transcript to full source clone." text="The agent reads files from its current workspace, but ContextKit enforces the repository contract server-side. No tool can skip validation or publish without approval." />
          <div className="mt-8 grid gap-px overflow-hidden rounded-[1.3rem] border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
            <McpRepositoryStep index="01" tool="contextkit_skill_compile" title="Prove the method" text="Create a private evidence-backed draft from completed work." />
            <McpRepositoryStep index="02" tool="contextkit_skill_validate_bundle" title="Validate files" text="Dry-run safe paths, secrets, identity, file contract, and 320KB decoded limit." />
            <McpRepositoryStep index="03" tool="contextkit_skill_push" title="Store one version" text="Persist the SHA-256-addressed bundle. Published semver cannot be overwritten." />
            <McpRepositoryStep index="04" tool="contextkit_skill_repository_publish" title="Approve listing" text="Require executable files, public evidence policy, and explicit userApproved=true." />
            <McpRepositoryStep index="05" tool="contextkit_skill_search / inspect" title="Discover safely" text="Return previews, digest, manifest, and validation without paid file contents." />
            <McpRepositoryStep index="06" tool="contextkit_skill_clone" title="Pay and clone" text="Return all files plus checksums and no-overwrite materialization instructions." />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <SafetyCard icon={<ShieldCheck className="h-4 w-4" />} title="Required root files" text="SKILL.md, skill.json, and LICENSE for every repository version." />
            <SafetyCard icon={<Workflow className="h-4 w-4" />} title="Executable public files" text="package.json, package-lock.json, config.schema.json, src/, tests/, and examples/." />
            <SafetyCard icon={<LockKeyhole className="h-4 w-4" />} title="Compatibility" text="Legacy SKILL.md purchases still work; repository V1 adds a complete immutable file tree." />
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading number="06" eyebrow="Guaranteed auto-capture" title="Use each agent&apos;s real completion signal, not file-save guesses." text="Plain remote MCP cannot force every host to call a tool. ContextKit adds native lifecycle adapters plus a controlled runner for VS Code-compatible IDEs." />
          <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <ConfigCard title="Claude Code Stop hook" label="AUTOMATIC AFTER EVERY TURN" code={claudeAutoCapture} tone="mint" />
            <ConfigCard title="Codex + Hermes hooks" label="NATIVE COMPLETION EVENTS" code={codexHermesAutoCapture} tone="aqua" />
            <ConfigCard title="OpenCode session plugin" label="AUTOMATIC ON SESSION IDLE" code={openCodeAutoCapture} tone="mint" />
            <ConfigCard title="OpenClaw agent_end plugin" label="AUTOMATIC AFTER SUCCESS" code={openClawAutoCapture} tone="aqua" />
            <ConfigCard title="Cursor, Claude, or Codex runner" label="STRUCTURED AGENT STREAM" code={guaranteedRunner} tone="mint" />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[1.3rem] border border-mint/20 bg-mint/[0.045] p-6 sm:p-7">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-mint/25 bg-mint/[0.08]"><Workflow className="h-4 w-4 text-mint" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">Verified lifecycle</p><h3 className="mt-1 text-xl font-semibold text-white">Task → sanitize → consider → private draft.</h3></div></div>
              <p className="mt-5 text-sm leading-7 text-white/62">The bridge reads the latest completed task, strips credentials locally, ignores failed, trivial, generic, and duplicate runs, then compiles qualifying work from any legitimate domain into a portable SKILL.md. Private write requires a complete reusable workflow and one transcript-grounded hard-evidence PASS. Public listing requires three distinct grounded PASS excerpts, score 75+, a valid discovery category, verification, rollback, safety boundaries, and no private paths or identifiers.</p>
            </article>
            <article className="rounded-[1.3rem] border border-aqua/20 bg-aqua/[0.04] p-6 sm:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aqua">VS Code / Cursor / Windsurf / VSCodium</p>
              <h3 className="mt-3 text-xl font-semibold text-white">ContextKit Auto-Capture</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">Build the VSIX from <code>extensions/contextkit-autocapture</code>, install it in a VS Code-compatible IDE, configure a scoped key in SecretStorage, then run <strong>ContextKit: Run Agent with Guaranteed Auto-Capture</strong>.</p>
              <CodeBlock code={`npm run extension:package\ncode --install-extension extensions/contextkit-autocapture/contextkit-autocapture-0.1.2.vsix`} />
            </article>
          </div>
          <p className="mt-5 rounded-xl border border-amber/20 bg-amber/[0.055] p-4 text-sm leading-7 text-white/62"><strong className="text-amber">Scope:</strong> Claude and Codex Stop hooks, Hermes <code>post_llm_call</code>, OpenClaw <code>agent_end</code>, OpenCode <code>session.idle</code>, and sessions launched through the IDE/CLI runner are automatically considered. Hosts exposing neither transcript access nor a completion event remain best-effort through MCP instructions.</p>
        </section>

        <section id="host-runbooks" className="mt-20 scroll-mt-24">
          <SectionHeading number="07" eyebrow="Host runbooks" title="One exact setup path for every supported agent." text="Choose the host you actually use. Each runbook separates connection, capture trigger, verification, and the boundary of what ContextKit can observe." />

          <div className="mt-8 grid overflow-hidden rounded-[1.35rem] border border-mint/20 bg-mint/[0.045] lg:grid-cols-[0.78fr_1.22fr]">
            <div className="border-b border-mint/15 p-6 lg:border-b-0 lg:border-r sm:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">Run once before any adapter</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">Install the secure bridge.</h3>
              <p className="mt-3 text-sm leading-7 text-white/58">Use a dedicated API key with <code>context:write</code>. The bridge reads it from the process environment, redacts common secrets locally, and never writes it into a transcript or generated plugin.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {hostRunbooks.map((host) => <a key={host.id} href={`#${host.id}`} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white/55 transition hover:border-mint/35 hover:text-mint">{host.name}</a>)}
              </div>
            </div>
            <div className="p-4 sm:p-5"><CodeBlock code={autoCaptureBootstrap} /></div>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {hostRunbooks.map((host, index) => <HostGuide key={host.id} host={host} index={index + 1} />)}
          </div>

          <div className="mt-6 grid gap-px overflow-hidden rounded-[1.3rem] border border-line bg-line md:grid-cols-3">
            <SafetyCard icon={<ShieldCheck className="h-4 w-4" />} title="Private by default" text="A qualified skill is saved privately first. No adapter can publish it without passing validation and receiving explicit approval." />
            <SafetyCard icon={<LockKeyhole className="h-4 w-4" />} title="Failure isolated" text="Network, API, or detector failures are queued or skipped without turning a successful agent task into a failed task." />
            <SafetyCard icon={<Workflow className="h-4 w-4" />} title="One core pipeline" text="Every host uses the same sanitizer, latest-task extraction, skill compiler, deterministic validator, dedupe cache, and retry outbox." />
          </div>
        </section>

        <section className="mt-16 flex flex-col gap-5 rounded-[1.35rem] border border-mint/20 bg-mint/[0.06] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-mint/25 bg-mint/[0.1]"><ShieldCheck className="h-5 w-5 text-mint" /></span><div><h2 className="text-xl font-semibold text-white">Need credits before the agent runs paid tools?</h2><p className="mt-2 max-w-2xl leading-7 text-white/58">OAuth, bearer MCP tools, and evidence-gated skill compilation spend the same ContextKit account credits as direct API requests. Compile costs $0.01; no adapter can publish without approval.</p></div></div><Link href="/dashboard/credits" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-semibold text-ink transition hover:bg-white">Open Credits <ArrowRight className="h-4 w-4" /></Link></section>
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

function McpRepositoryStep({ index, tool, title, text }: { index: string; tool: string; title: string; text: string }) {
  return <article className="min-w-0 bg-carbon/92 p-5"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[10px] text-mint">{index}</span><span className="h-1.5 w-1.5 rounded-full bg-aqua" /></div><code className="mt-4 block break-all text-xs text-aqua">{tool}</code><h3 className="mt-3 text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/52">{text}</p></article>;
}

function SellerJourneyStep({ index, label, tool, icon, title, text, tone }: { index: string; label: string; tool: string; icon: ReactNode; title: string; text: string; tone: "mint" | "aqua" | "amber" }) {
  const tones = {
    mint: {
      badge: "border-mint/25 bg-mint/[0.08] text-mint",
      icon: "border-mint/25 bg-mint/[0.08] text-mint",
      tool: "text-mint/70",
      line: "from-mint/45"
    },
    aqua: {
      badge: "border-aqua/25 bg-aqua/[0.08] text-aqua",
      icon: "border-aqua/25 bg-aqua/[0.08] text-aqua",
      tool: "text-aqua/70",
      line: "from-aqua/45"
    },
    amber: {
      badge: "border-amber/25 bg-amber/[0.08] text-amber",
      icon: "border-amber/25 bg-amber/[0.08] text-amber",
      tool: "text-amber/70",
      line: "from-amber/45"
    }
  } as const;
  const colors = tones[tone];

  return (
    <article className="group relative overflow-hidden rounded-xl border border-white/[0.09] bg-carbon/82 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.16] hover:bg-white/[0.035]">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-8 w-8 place-items-center rounded-lg border ${colors.icon}`}>{icon}</span>
        <span className="font-mono text-[10px] tracking-[0.12em] text-white/28">{index}</span>
      </div>
      <div className={`mt-3 h-px bg-gradient-to-r ${colors.line} to-transparent`} />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] ${colors.badge}`}>{label}</span>
        <code className={`min-w-0 truncate text-right font-mono text-[9px] ${colors.tool}`}>{tool}</code>
      </div>
      <h3 className="mt-3 text-[15px] font-semibold leading-5 text-white">{title}</h3>
      <p className="mt-1.5 text-xs leading-[1.35rem] text-white/48">{text}</p>
      <span className={`absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r ${colors.line} to-transparent transition-transform duration-300 group-hover:scale-x-100`} />
    </article>
  );
}

function SellerControl({ label, text, tone }: { label: string; text: string; tone: "mint" | "aqua" | "amber" }) {
  const tones = {
    mint: "border-mint/20 bg-mint/[0.06] text-mint",
    aqua: "border-aqua/20 bg-aqua/[0.06] text-aqua",
    amber: "border-amber/20 bg-amber/[0.06] text-amber"
  } as const;
  return <span className={`rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] ${tones[tone]}`}><strong>{label}</strong><span className="ml-1.5 text-white/42">{text}</span></span>;
}

function SellerMetric({ value, label }: { value: string; label: string }) {
  return <div className="bg-carbon/75 px-4 py-3.5"><p className="font-mono text-lg font-semibold text-white">{value}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/36">{label}</p></div>;
}

function SellerSignal({ value, label }: { value: string; label: string }) {
  return <div className="bg-carbon/75 px-3 py-3 text-center"><p className="font-mono text-xs font-semibold uppercase text-mint">{value}</p><p className="mt-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/32">{label}</p></div>;
}

function Step({ number, text }: { number: string; text: string }) {
  return <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-mint/25 bg-mint/[0.07] font-mono text-[10px] text-mint">{number}</span><span>{text}</span></li>;
}

function ConfigCard({ title, label, code, tone }: { title: string; label: string; code: string; tone: "mint" | "aqua" }) {
  const color = tone === "mint" ? "text-mint border-mint/20 bg-mint/[0.035]" : "text-aqua border-aqua/20 bg-aqua/[0.035]";
  return <article className={`overflow-hidden rounded-[1.3rem] border ${color}`}><div className="border-b border-current/15 px-5 py-4"><p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${tone === "mint" ? "text-mint" : "text-aqua"}`}>{label}</p><h2 className="mt-2 text-xl font-semibold text-white">{title}</h2></div><div className="p-4"><CodeBlock code={code} /></div></article>;
}

function HostGuide({ host, index }: { host: HostRunbook; index: number }) {
  const tones = {
    mint: { border: "border-mint/20", surface: "bg-mint/[0.035]", text: "text-mint", badge: "border-mint/25 bg-mint/[0.08]" },
    aqua: { border: "border-aqua/20", surface: "bg-aqua/[0.03]", text: "text-aqua", badge: "border-aqua/25 bg-aqua/[0.08]" },
    amber: { border: "border-amber/20", surface: "bg-amber/[0.03]", text: "text-amber", badge: "border-amber/25 bg-amber/[0.08]" }
  } as const;
  const tone = tones[host.tone];

  return (
    <article id={host.id} className={`scroll-mt-24 overflow-hidden rounded-[1.4rem] border ${tone.border} ${tone.surface}`}>
      <div className="flex flex-col gap-5 border-b border-white/[0.08] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border font-mono text-xs font-semibold ${tone.badge} ${tone.text}`}>{host.mark}</span>
          <div>
            <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${tone.text}`}>{String(index).padStart(2, "0")} / {host.environment}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">{host.name}</h3>
          </div>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] ${tone.badge} ${tone.text}`}>{host.mode}</span>
      </div>

      <div className="grid gap-px bg-white/[0.07] sm:grid-cols-2">
        <div className="bg-carbon/85 px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">Capture signal</p><p className="mt-2 text-sm font-medium leading-6 text-white/78">{host.trigger}</p></div>
        <div className="bg-carbon/85 px-5 py-4"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">Result</p><p className="mt-2 text-sm font-medium leading-6 text-white/78">Sanitized private draft or explicit skip reason</p></div>
      </div>

      <div className="p-5 sm:p-6">
        <CodeBlock code={host.code} />
        <ol className="mt-6 space-y-4">
          {host.steps.map((step, stepIndex) => <Step key={step} number={String(stepIndex + 1)} text={step} />)}
        </ol>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-mint/15 bg-mint/[0.04] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mint">Verify</p><p className="mt-2 text-sm leading-6 text-white/58">{host.verify}</p></div>
          <div className="rounded-xl border border-amber/15 bg-amber/[0.035] p-4"><p className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber">Boundary</p><p className="mt-2 text-sm leading-6 text-white/58">{host.boundary}</p></div>
        </div>
      </div>
    </article>
  );
}

function SafetyCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-line bg-white/[0.025] p-5"><span className="grid h-9 w-9 place-items-center rounded-lg border border-mint/20 bg-mint/[0.06] text-mint">{icon}</span><h3 className="mt-4 text-sm font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/52">{text}</p></div>;
}
