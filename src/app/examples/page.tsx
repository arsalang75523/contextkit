import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";

const examples = [
  {
    title: "Bankr x402 summarize",
    body: "Public pay-per-call path for agents. No ContextKit API key required.",
    code: `bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \\
  -X POST \\
  -d '{"messages":[{"role":"user","content":"Summarize this project state for the next AI agent."}],"mode":"compact"}'`
  },
  {
    title: "Direct API with credits",
    body: "Backend path for apps that use account credits and API keys.",
    code: `curl -X POST https://contextkit.pro/api/handoff \\
  -H "Authorization: Bearer <CONTEXTKIT_API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a project handoff. Preserve goal, completed work, blockers, decisions, constraints, and next actions."
      }
    ]
  }'`
  },
  {
    title: "TypeScript SDK",
    body: "Typed integration for apps that want direct ContextKit calls.",
    code: `import { ContextKit } from "@basedchef/contextkit";

const client = new ContextKit({
  apiKey: process.env.CONTEXTKIT_API_KEY!,
  baseUrl: "https://contextkit.pro"
});

const result = await client.summarize({
  mode: "compact",
  messages: [{ role: "user", content: "Summarize this context." }]
});`
  },
  {
    title: "Long context upload",
    body: "Upload long text first, then pay for the final precomputed result.",
    code: `cat > long-context.txt <<'CONTEXTKIT_LONG_CONTEXT'
Paste the long conversation or document here.
CONTEXTKIT_LONG_CONTEXT

curl -X POST "https://contextkit.pro/api/context/upload-text?endpoint=summarize&mode=compact" \\
  -H "Content-Type: text/plain" \\
  --data-binary @long-context.txt

bankr x402 call https://x402.bankr.bot/0xdace98cd605dd56b2edc66f0f4df3687f64fd824/contextkit-summarize \\
  -X POST \\
  -d '{"contextId":"ctx_REPLACE_ME","mode":"compact"}'`
  }
] as const;

export default function ExamplesPage() {
  return (
    <main>
      <Section eyebrow="Examples" title="Copy-paste ContextKit commands for agents and apps.">
        <div className="grid gap-5 lg:grid-cols-2">
          {examples.map((example) => (
            <article key={example.title} className="min-w-0 rounded-md border border-line bg-white/[0.035] p-5">
              <h2 className="text-xl font-semibold text-white">{example.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">{example.body}</p>
              <div className="mt-5">
                <CodeBlock code={example.code} />
              </div>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
