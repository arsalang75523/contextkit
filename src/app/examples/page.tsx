import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";

const bankrExamples = [
  {
    title: "Summarize compact",
    code: `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \\
  -X POST \\
  -d '{"messages":[{"role":"user","content":"Summarize this project state for the next AI agent."}],"mode":"compact"}'`
  },
  {
    title: "Compress context",
    code: `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-compress \\
  -X POST \\
  -d '{"messages":[{"role":"user","content":"Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow reports and onboarding remain."}]}'`
  },
  {
    title: "Handoff",
    code: `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-handoff \\
  -X POST \\
  -d '{"messages":[{"role":"user","content":"Create a successor-agent handoff. Preserve completed work, blockers, decisions, constraints, and next actions."}]}'`
  },
  {
    title: "Profile memory",
    code: `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-profile \\
  -X POST \\
  -d '{"messages":[{"role":"user","content":"I prefer concise technical updates and clear next actions."}],"mode":"extract-profile"}'`
  }
] as const;

const integrationExamples = [
  {
    title: "Direct API credits",
    code: `curl -X POST https://contextkit.pro/api/summarize \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mode": "compact",
    "messages": [{ "role": "user", "content": "Summarize this context." }]
  }'`
  },
  {
    title: "TypeScript SDK",
    code: `import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://contextkit.pro"
});

const result = await client.handoff({
  messages: [{ role: "user", content: "Create a handoff for the next agent." }]
});`
  },
  {
    title: "Long context text upload",
    code: `cat > long-context.txt <<'CONTEXTKIT_LONG_CONTEXT'
Paste the long conversation or document here.
CONTEXTKIT_LONG_CONTEXT

curl -X POST "https://contextkit.pro/api/context/upload-text?endpoint=summarize&mode=compact" \\
  -H "Content-Type: text/plain" \\
  --data-binary @long-context.txt`
  },
  {
    title: "Fetch uploaded context result",
    code: `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \\
  -X POST \\
  -d '{"contextId":"ctx_REPLACE_ME","mode":"compact"}'`
  }
] as const;

export default function ExamplesPage() {
  return (
    <main>
      <Section eyebrow="Agent Example Reference" title="Copy-paste ContextKit calls for crawlers and builders.">
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          This page is intentionally hidden from the main nav and kept available for agents, crawlers, SDK users, and API evaluators.
        </p>

        <h2 className="mt-8 text-2xl font-semibold text-white">Bankr-hosted x402</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {bankrExamples.map((example) => (
            <ExampleCard key={example.title} title={example.title} code={example.code} />
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-semibold text-white">SDK, API keys, and long context</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {integrationExamples.map((example) => (
            <ExampleCard key={example.title} title={example.title} code={example.code} />
          ))}
        </div>
      </Section>
    </main>
  );
}

function ExampleCard({ title, code }: { title: string; code: string }) {
  return (
    <article className="min-w-0 rounded-md border border-line bg-white/[0.035] p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="mt-4">
        <CodeBlock code={code} />
      </div>
    </article>
  );
}
