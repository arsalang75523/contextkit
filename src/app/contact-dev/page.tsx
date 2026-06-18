import { ArrowUpRight } from "lucide-react";
import { Section } from "@/components/section";

const contacts = [
  {
    label: "ContextKit on X",
    value: "@contextkitpro",
    href: "https://x.com/contextkitpro",
    description: "Product updates, demos, and public ContextKit announcements."
  },
  {
    label: "Founder on X",
    value: "@ArsalanG75523",
    href: "https://x.com/ArsalanG75523",
    description: "Direct founder updates, build notes, and project conversations."
  },
  {
    label: "Farcaster",
    value: "arsalang.eth",
    href: "https://farcaster.xyz/arsalang.eth",
    description: "Onchain social profile for Bankr and Base ecosystem conversations."
  },
  {
    label: "Telegram",
    value: "@Arsalang75",
    href: "https://t.me/Arsalang75",
    description: "Fast direct contact for integration questions and support."
  }
] as const;

export default function ContactDevPage() {
  return (
    <main>
      <Section eyebrow="Contact Dev" title="Talk to the builder behind ContextKit.">
        <p className="mb-8 max-w-3xl text-lg leading-8 text-white/65">
          Reach out for SDK integrations, Bankr-hosted x402 usage, API-key credits, agent memory workflows, or partnership questions.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {contacts.map((contact) => (
            <a
              key={contact.href}
              href={contact.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-md border border-line bg-white/[0.035] p-6 transition hover:border-mint/45 hover:bg-mint/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-white/42">{contact.label}</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">{contact.value}</h2>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line text-white/60 transition group-hover:border-mint/40 group-hover:text-mint">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/60">{contact.description}</p>
            </a>
          ))}
        </div>
      </Section>
    </main>
  );
}
