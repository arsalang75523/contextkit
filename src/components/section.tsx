import type { ReactNode } from "react";

export function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-20">
      <div className="mx-auto max-w-7xl">
        {eyebrow ? <p className="mb-3 text-sm font-medium uppercase tracking-[0.22em] text-mint">{eyebrow}</p> : null}
        <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl">{title}</h2>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
