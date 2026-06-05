import { ArrowRight, Bot, CreditCard, Database, FileClock, Webhook } from "lucide-react";

const nodes = [
  { icon: Bot, title: "Agent", text: "Bankr, CrewAI, LangChain, AutoGen" },
  { icon: CreditCard, title: "x402", text: "Per-request settlement before compute" },
  { icon: Database, title: "ContextKit API", text: "Summarize, compress, handoff, profile" },
  { icon: Webhook, title: "Webhooks", text: "Signed events for async automation" },
  { icon: FileClock, title: "Audit Trails", text: "appKV metrics and ctx.files snapshots" }
];

export function Architecture() {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {nodes.map((node, index) => (
        <div key={node.title} className="relative rounded-md border border-line bg-white/[0.035] p-5">
          <node.icon className="mb-5 h-6 w-6 text-mint" />
          <h3 className="font-semibold text-white">{node.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/58">{node.text}</p>
          {index < nodes.length - 1 ? (
            <ArrowRight className="absolute -right-5 top-1/2 z-10 hidden h-5 w-5 text-mint/70 lg:block" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
