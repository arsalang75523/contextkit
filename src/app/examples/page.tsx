import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { bankrX402Command } from "@/lib/bankr-x402";

const repositoryFiles = [
  { path: "SKILL.md", content: "---\\nname: bankr-x402-timeout-recovery\\ndescription: Tested bounded forwarding for Bankr x402.\\nlicense: MIT\\n---\\n# Bankr x402 timeout recovery" },
  { path: "skill.json", content: '{"schemaVersion":1,"name":"bankr-x402-timeout-recovery","version":"1.0.0","runtime":"node22","entrypoint":"src/index.js","testCommand":"npm test"}' },
  { path: "LICENSE", content: "MIT License" },
  { path: "package.json", content: '{"name":"bankr-x402-timeout-recovery","version":"1.0.0","type":"module","scripts":{"test":"node --test tests/*.test.js"}}' },
  { path: "package-lock.json", content: '{"name":"bankr-x402-timeout-recovery","version":"1.0.0","lockfileVersion":3,"packages":{"":{"name":"bankr-x402-timeout-recovery","version":"1.0.0"}}}' },
  { path: "config.schema.json", content: '{"type":"object","properties":{"backendUrl":{"type":"string"}},"required":["backendUrl"]}' },
  { path: "src/index.js", content: "export const boundedTimeout = (originMs) => Math.min(originMs + 8000, 55000);" },
  { path: "tests/timeout.test.js", content: "import test from 'node:test'; import assert from 'node:assert/strict'; import { boundedTimeout } from '../src/index.js'; test('bounded', () => assert.equal(boundedTimeout(42000), 50000));" },
  { path: "examples/basic.js", content: "import { boundedTimeout } from '../src/index.js'; console.log(boundedTimeout(42000));" }
];

const bankrExamples = [
  {
    title: "Summarize compact",
    code: bankrX402Command("summarize", {
      messages: [{ role: "user", content: "Summarize this project state for the next AI agent." }],
      mode: "compact"
    })
  },
  {
    title: "Compress context",
    code: bankrX402Command("compress-context", {
      messages: [{ role: "user", content: "Project Atlas uses Next.js, Postgres, and Redis. Auth is complete. Slow reports and onboarding remain." }]
    })
  },
  {
    title: "Handoff",
    code: bankrX402Command("handoff", {
      messages: [{ role: "user", content: "Create a successor-agent handoff. Preserve completed work, blockers, decisions, constraints, and next actions." }]
    })
  },
  {
    title: "Profile memory",
    code: bankrX402Command("extract-profile", {
      messages: [{ role: "user", content: "I prefer concise technical updates and clear next actions." }],
      mode: "extract-profile"
    })
  },
  {
    title: "Compile verified skill",
    code: bankrX402Command("skill-compile", {
      mode: "skill-compile",
      messages: [
        { role: "user", content: "Repair the Bankr x402 timeout without changing the response contract, then verify the paid path." },
        { role: "assistant", content: "Compared origin and gateway latency, moved long work before payment, and preserved the schema. Executed curl against the paid endpoint; exact output: HTTP/2 200 and mode=compact. Reusable lesson: precompute slow work and keep the paid forwarding call bounded." }
      ]
    })
  },
  {
    title: "Validate complete skill repository",
    code: bankrX402Command("skill-validate", {
      mode: "skill-validate",
      skillId: "exp_REPLACE_ME",
      publishToken: "pub_REPLACE_ME",
      repository: "bankr-x402-timeout-recovery",
      version: "1.0.0",
      files: repositoryFiles
    })
  },
  {
    title: "Push immutable repository version",
    code: bankrX402Command("skill-push", {
      mode: "skill-push",
      skillId: "exp_REPLACE_ME",
      publishToken: "pub_REPLACE_ME",
      repository: "bankr-x402-timeout-recovery",
      version: "1.0.0",
      files: repositoryFiles
    })
  },
  {
    title: "Publish approved repository",
    code: bankrX402Command("skill-repository-publish", {
      mode: "skill-repository-publish",
      skillId: "exp_REPLACE_ME",
      publishToken: "pub_REPLACE_ME",
      userApproved: true,
      priceUsd: 0.05
    })
  },
  {
    title: "Search verified repositories",
    code: bankrX402Command("skill-search", {
      query: "x402 timeout",
      ecosystems: ["x402"],
      verifiedOnly: true
    })
  },
  {
    title: "Inspect repository manifest",
    code: bankrX402Command("skill-inspect", { mode: "skill-inspect", skillId: "exp_REPLACE_ME" })
  },
  {
    title: "Buy and clone every file",
    code: bankrX402Command("skill-clone", { mode: "skill-clone", skillId: "exp_REPLACE_ME" })
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
    code: bankrX402Command("summarize", { contextId: "ctx_REPLACE_ME", mode: "compact" })
  }
] as const;

export default function ExamplesPage() {
  return (
    <main>
      <Section eyebrow="Agent Example Reference" title="Copy-paste ContextKit calls for crawlers and builders.">
        <p className="max-w-3xl text-sm leading-7 text-white/62">
          This page is intentionally hidden from the main nav and kept available for agents, crawlers, SDK users, and API evaluators. The repository examples follow the exact V1 lifecycle: compile, validate, push, explicit publish, search or inspect, then paid clone.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <RepositoryFact title="Immutable identity" text="Semantic version plus deterministic SHA-256 digest. Published versions require a version bump for changes." />
          <RepositoryFact title="Strict public contract" text="Executable listings need lockfile, config schema, meaningful source, tests, and examples; install hooks and secrets are rejected." />
          <RepositoryFact title="Complete purchase" text="Repository V1 returns every file under the 320KB decoded limit; legacy SKILL.md purchases remain compatible." />
        </div>

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

function RepositoryFact({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-mint/20 bg-mint/[0.045] p-4"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mint">{title}</p><p className="mt-2 text-sm leading-6 text-white/56">{text}</p></div>;
}
