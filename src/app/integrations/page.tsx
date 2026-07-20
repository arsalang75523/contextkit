import { CodeBlock } from "@/components/code-block";
import { Section } from "@/components/section";
import { integrationGuides } from "@/content/docs";
import { bankrX402Command } from "@/lib/bankr-x402";

export default function IntegrationsPage() {
  return (
    <main>
      <Section eyebrow="Integration Guides" title="Drop ContextKit into the agent frameworks teams already use.">
        <div className="grid gap-5 lg:grid-cols-2">
          {integrationGuides.map((guide) => (
            <article key={guide} className="rounded-md border border-line bg-white/[0.035] p-6">
              <h2 className="text-2xl font-semibold text-white">{guide}</h2>
              <p className="mt-3 leading-7 text-white/62">
                Add ContextKit as a context lifecycle and verified-skill tool: preserve continuation state, then compile only completed Bankr-adjacent work with source-grounded execution proof. Publishing always remains approval-gated.
              </p>
              <div className="mt-5">
                <CodeBlock
                  code={
                    guide === "Bankr Agents"
                      ? bankrX402Command("handoff", { messages: [{ role: "user", content: "Create an agent handoff for this workflow." }] })
                      : `const contextkitTool = {
  name: "contextkit_handoff",
  description: "Buy a paid ContextKit handoff through Bankr-hosted x402.",
  command: ${JSON.stringify(bankrX402Command("handoff", { messages: [{ role: "user", content: "Create an agent handoff for this workflow." }] }))}
};`
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </Section>
    </main>
  );
}
