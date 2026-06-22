import { ArrowUpRight, BadgeCheck, Fingerprint, MessageCircle, Radio, Send } from "lucide-react";

const contacts = [
  { index: "01", label: "ContextKit dispatch", value: "@contextkitpro", href: "https://x.com/contextkitpro", description: "Product releases, demos, and public build signals.", icon: Radio, tone: "mint" },
  { index: "02", label: "Founder signal", value: "@ArsalanG75523", href: "https://x.com/ArsalanG75523", description: "Build notes, sharp takes, and direct project conversation.", icon: Fingerprint, tone: "aqua" },
  { index: "03", label: "Onchain frequency", value: "arsalang.eth", href: "https://farcaster.xyz/arsalang.eth", description: "Bankr, Base, and autonomous-agent ecosystem threads.", icon: BadgeCheck, tone: "amber" },
  { index: "04", label: "Fast lane", value: "@Arsalang75", href: "https://t.me/Arsalang75", description: "Direct integration questions and urgent collaboration.", icon: MessageCircle, tone: "coral" }
] as const;

export default function ContactDevPage() {
  return (
    <main className="contact-stage relative min-h-screen overflow-hidden px-5 py-8 md:py-10">
      <div className="contact-grid pointer-events-none absolute inset-0" />
      <div className="contact-sun pointer-events-none absolute -right-28 top-12 h-[31rem] w-[31rem] rounded-full" />
      <div className="relative mx-auto max-w-7xl">
        <section className="contact-hero overflow-hidden rounded-[1.75rem] border border-white/[0.14]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 sm:px-7"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint" /> Builder signal / open</span><span>Tehran · internet-native</span><span className="text-mint">ContextKit / 01</span></div>
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-7 sm:p-10 lg:p-14"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-mint">Contact the developer</p><h1 className="contact-title mt-6 max-w-4xl text-balance text-6xl font-semibold leading-[0.82] tracking-[-0.085em] text-white sm:text-7xl lg:text-[7rem]">Build agents<br /><span className="text-mint">that remember.</span></h1><p className="mt-9 max-w-xl text-lg leading-8 text-white/65">I build sharp infrastructure for autonomous systems: x402 payments, durable context, developer tools, and agent workflows that keep moving when the conversation ends.</p><div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.17em] text-white/45"><span>Independent builder</span><span className="text-mint">ContextKit founder</span><span>Bankr native</span></div></div>
            <div className="contact-monogram relative min-h-[360px] overflow-hidden border-t border-white/10 p-7 sm:min-h-[430px] lg:border-l lg:border-t-0 lg:p-10"><div className="contact-rings absolute inset-0" /><div className="relative flex h-full flex-col justify-between"><div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.17em] text-white/48"><span>Operator profile</span><span>AG / 2026</span></div><div className="contact-mark select-none text-[clamp(9rem,22vw,17rem)] font-semibold leading-[0.68] tracking-[-0.14em] text-white">AG</div><div className="max-w-xs border-l border-mint/50 pl-4 text-sm leading-6 text-white/65">I care about the moment an agent stops being a chat window and starts becoming an operator.</div></div></div>
          </div>
          <div className="contact-ticker border-t border-white/10 py-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/45"><div className="contact-ticker-track"><span>agent memory</span><span>x402 payments</span><span>developer systems</span><span>context architecture</span><span>agent memory</span><span>x402 payments</span><span>developer systems</span><span>context architecture</span></div></div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="lg:pt-5"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mint">Choose a channel</p><h2 className="mt-4 max-w-sm text-3xl font-semibold leading-[1.02] tracking-[-0.045em] text-white md:text-4xl">Bring a difficult workflow. Leave with a sharper system.</h2><p className="mt-5 max-w-sm leading-7 text-white/58">SDK integrations, Bankr-hosted x402, API credit flows, MCP connections, or a strange agent problem worth solving.</p><div className="mt-9 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm text-white/64"><Send className="h-4 w-4 text-mint" /> Fastest response: Telegram</div></div>
          <div className="divide-y divide-line border-y border-line">
            {contacts.map((contact) => {
              const Icon = contact.icon;
              const accent = contact.tone === "mint" ? "text-mint" : contact.tone === "aqua" ? "text-aqua" : contact.tone === "amber" ? "text-amber" : "text-coral";
              return <a key={contact.href} href={contact.href} target="_blank" rel="noreferrer" className="contact-channel group grid gap-4 py-6 sm:grid-cols-[44px_1fr_auto] sm:items-center"><span className={`font-mono text-xs ${accent}`}>{contact.index}</span><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/42">{contact.label}</p><h3 className="mt-2 text-2xl font-medium tracking-[-0.03em] text-white transition group-hover:text-mint">{contact.value}</h3><p className="mt-2 text-sm leading-6 text-white/55">{contact.description}</p></div><span className={`grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.025] ${accent} transition duration-300 group-hover:scale-110 group-hover:border-current group-hover:bg-white/[0.08]`}><Icon className="h-4 w-4" /><ArrowUpRight className="absolute h-3 w-3 translate-x-2 -translate-y-2 opacity-0 transition group-hover:translate-x-3 group-hover:-translate-y-3 group-hover:opacity-100" /></span></a>;
            })}
          </div>
        </section>

        <section className="mt-14 grid gap-4 border-t border-line pt-6 md:grid-cols-3"><Manifesto number="01" title="No generic AI wrappers" text="Systems should have an opinion about memory, payment, and failure states." /><Manifesto number="02" title="Payable primitives" text="Agents need infrastructure they can call, settle, and trust on their own." /><Manifesto number="03" title="Context is a product surface" text="The right memory changes what the next agent is capable of doing." /></section>
      </div>
    </main>
  );
}

function Manifesto({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="border-l border-white/12 pl-4"><p className="font-mono text-[10px] text-mint">{number}</p><h3 className="mt-3 text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{text}</p></article>;
}
