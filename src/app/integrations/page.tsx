import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { integrationGuides } from "@/content/docs";

export default function IntegrationsPage() {
  return (
    <main>
      <Section eyebrow="Integration Guides" title="Drop ContextKit into the agent frameworks teams already use.">
        <div className="grid gap-5 lg:grid-cols-2">
          {integrationGuides.map((guide) => (
            <article key={guide} className="rounded-md border border-line bg-white/[0.035] p-6">
              <h2 className="text-2xl font-semibold text-white">{guide}</h2>
              <p className="mt-3 leading-7 text-white/62">
                Add ContextKit as a context lifecycle tool: compress before long prompts, summarize after milestones, hand off between workers, and extract durable user memory.
              </p>
              <div className="mt-5">
                <CodeBlock
                  code={`await fetch("https://contextkit.dev/api/handoff", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Payment": await wallet.createX402Payment({ amount: "${guide === "Bankr Agents" ? "0.003" : "0.003"}" })
  },
  body: JSON.stringify({ messages, webhookUrl })
});`}
                />
              </div>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
