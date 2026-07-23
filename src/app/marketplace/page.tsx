import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Flame,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { ExperienceService, type MarketplaceSort } from "@/services/experience-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verified Agent Skill Marketplace",
  description: "Discover evidence-backed, versioned agent skill repositories. Compare ratings, verified tests, installs, and compatibility before buying through x402.",
  alternates: { canonical: "/marketplace" },
  openGraph: {
    title: "ContextKit Verified Skill Marketplace",
    description: "Search, rank, review, buy, and clone complete evidence-backed agent skill repositories.",
    url: "/marketplace"
  }
};

type MarketplacePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    featured?: string;
  }>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const sort = marketplaceSort(params.sort);
  const marketplace = await new ExperienceService().marketplace({
    query: params.q,
    category: params.category,
    sort,
    featured: params.featured === "true",
    limit: 60
  });
  const featured = marketplace.results.filter((item) => item.featured).slice(0, 3);

  return (
    <main className="marketplace-stage relative min-h-screen overflow-hidden px-5 py-8 md:py-12">
      <div className="marketplace-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-[8%] top-12 h-80 w-80 rounded-full bg-mint/[0.08] blur-[110px]" />
      <div className="pointer-events-none absolute right-[4%] top-56 h-96 w-96 rounded-full bg-aqua/[0.065] blur-[120px]" />

      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.13] bg-carbon/80 shadow-[0_30px_100px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-line p-6 sm:p-9 lg:border-b-0 lg:border-r lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.08] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-mint">
                <Sparkles className="h-3.5 w-3.5" /> Verified skill exchange
              </div>
              <h1 className="mt-6 max-w-4xl text-balance text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">
                Install what already <span className="text-mint">worked.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/58 sm:text-lg">
                Complete agent skill repositories ranked by evidence, real installs, buyer ratings, and reproducible tests.
              </p>
              <form action="/marketplace" className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row">
                <label className="relative flex-1">
                  <span className="sr-only">Search verified skills</span>
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <input
                    name="q"
                    defaultValue={params.q}
                    placeholder="Search a problem, workflow, ecosystem..."
                    className="h-12 w-full rounded-xl border border-line bg-ink/75 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-mint/60 focus:ring-2 focus:ring-mint/10"
                  />
                </label>
                <input type="hidden" name="sort" value={sort} />
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-mint px-6 text-sm font-semibold text-ink transition hover:bg-white">
                  Search registry <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 bg-line/50">
              <HeroStat label="Verified skills" value={marketplace.totalListings} icon={<BadgeCheck className="h-4 w-4" />} />
              <HeroStat label="Paid installs" value={marketplace.totalInstalls} icon={<TrendingUp className="h-4 w-4" />} />
              <HeroStat label="Categories" value={marketplace.categories.length} icon={<Boxes className="h-4 w-4" />} />
              <HeroStat label="Trust policy" value="Evidence" icon={<ShieldCheck className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[1.25rem] border border-line bg-white/[0.025] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <FilterLink href={marketplaceHref(params, { category: undefined })} active={!params.category}>All skills</FilterLink>
              {marketplace.categories.map((category) => (
                <FilterLink
                  key={category.name}
                  href={marketplaceHref(params, { category: category.name })}
                  active={params.category === category.name}
                >
                  {formatCategory(category.name)} <span className="text-white/35">{category.count}</span>
                </FilterLink>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-white/32">Rank by</span>
              {(["trending", "latest", "rating", "installs"] as MarketplaceSort[]).map((item) => (
                <FilterLink key={item} href={marketplaceHref(params, { sort: item })} active={sort === item}>
                  {item}
                </FilterLink>
              ))}
            </div>
          </div>
        </section>

        {featured.length && !params.q && !params.category ? (
          <section className="mt-10">
            <SectionHeading eyebrow="Curated signal" title="Featured repositories" icon={<Sparkles className="h-4 w-4" />} />
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              {featured.map((skill, index) => <FeaturedSkillCard key={skill.id} skill={skill} index={index} />)}
            </div>
          </section>
        ) : null}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            <SectionHeading
              eyebrow={`${marketplace.count} matched`}
              title={params.q ? `Results for "${params.q}"` : params.category ? formatCategory(params.category) : "All verified skills"}
              icon={<Search className="h-4 w-4" />}
            />
            {marketplace.results.length ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {marketplace.results.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-dashed border-line bg-white/[0.025] p-10 text-center">
                <p className="font-mono text-xs uppercase tracking-[0.17em] text-mint">No verified match</p>
                <p className="mt-3 text-white/55">Try a broader workflow, another ecosystem, or clear the current filters.</p>
                <Link href="/marketplace" className="mt-5 inline-flex h-10 items-center rounded-lg border border-line px-4 text-sm text-white/70 hover:border-mint/40 hover:text-white">Clear filters</Link>
              </div>
            )}
          </div>

          <aside>
            <div className="sticky top-24 overflow-hidden rounded-[1.25rem] border border-line bg-carbon/85">
              <div className="flex items-center gap-2 border-b border-line px-5 py-4">
                <Flame className="h-4 w-4 text-coral" />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-coral">Live ranking</p>
                  <h2 className="mt-1 font-semibold text-white">Most useful now</h2>
                </div>
              </div>
              <div className="divide-y divide-line">
                {marketplace.results.slice(0, 8).map((skill) => (
                  <Link key={skill.id} href={`/marketplace/${skill.id}`} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-white/[0.04]">
                    <span className="font-mono text-xs text-white/28">{String(skill.rank).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white/78 group-hover:text-white">{skill.name}</span>
                      <span className="mt-1 block text-xs text-white/35">{skill.installCount} installs · {skill.rating ? `${skill.rating} rating` : "new"}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-mint" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function HeroStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="min-h-36 bg-carbon/95 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-mint">{icon}<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/38">{label}</span></div>
      <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.17em] text-mint">{icon}{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-white">{title}</h2>
      </div>
    </div>
  );
}

function FeaturedSkillCard({ skill, index }: { skill: MarketplaceSkill; index: number }) {
  const accents = ["text-mint border-mint/25 bg-mint/[0.055]", "text-aqua border-aqua/25 bg-aqua/[0.055]", "text-amber border-amber/25 bg-amber/[0.055]"];
  return (
    <Link href={`/marketplace/${skill.id}`} className={`group relative overflow-hidden rounded-[1.25rem] border p-5 transition hover:-translate-y-1 hover:bg-white/[0.06] ${accents[index % accents.length]}`}>
      <div className="absolute right-4 top-3 font-mono text-6xl font-semibold text-white/[0.035]">{String(index + 1).padStart(2, "0")}</div>
      <div className="relative">
        <p className="font-mono text-[9px] uppercase tracking-[0.17em]">Featured / {formatCategory(skill.category)}</p>
        <h3 className="mt-5 text-xl font-semibold text-white">{skill.name}</h3>
        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-white/52">{skill.description}</p>
        <div className="mt-5 flex items-center justify-between border-t border-current/15 pt-4 text-xs">
          <span className="text-white/45">{skill.installCount} installs · {skill.testCount} tests</span>
          <span className="font-mono text-white">${skill.priceUsd.toFixed(2)}</span>
        </div>
      </div>
    </Link>
  );
}

function SkillCard({ skill }: { skill: MarketplaceSkill }) {
  return (
    <Link href={`/marketplace/${skill.id}`} className="group flex min-h-[19rem] flex-col rounded-[1.25rem] border border-line bg-white/[0.028] p-5 transition hover:-translate-y-0.5 hover:border-mint/35 hover:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-mint/20 bg-mint/[0.07] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-mint">{formatCategory(skill.category)}</span>
            {skill.featured ? <span className="rounded-full border border-amber/20 bg-amber/[0.07] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-amber">featured</span> : null}
          </div>
          <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-white">{skill.name}</h3>
        </div>
        <span className="font-mono text-xs text-white/28">#{String(skill.rank).padStart(2, "0")}</span>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/52">{skill.description}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {skill.compatibility.slice(0, 3).map((host) => <span key={host} className="rounded-md border border-line px-2 py-1 font-mono text-[9px] uppercase text-white/38">{host}</span>)}
      </div>
      <div className="mt-auto grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line">
        <CardMetric label="Rating" value={skill.rating ? `${skill.rating}/5` : "New"} />
        <CardMetric label="Installs" value={skill.installCount} />
        <CardMetric label="Tests" value={skill.testCount} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="truncate text-white/38">by {skill.seller.name}</span>
        <span className="flex items-center gap-2 font-mono text-mint">${skill.priceUsd.toFixed(2)} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
      </div>
    </Link>
  );
}

function CardMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="bg-carbon/80 p-3"><p className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/28">{label}</p><p className="mt-1 text-sm font-medium text-white/75">{value}</p></div>;
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return <Link href={href} className={`rounded-lg border px-3 py-2 text-xs transition ${active ? "border-mint/35 bg-mint/[0.1] text-mint" : "border-line bg-ink/40 text-white/48 hover:border-white/20 hover:text-white"}`}>{children}</Link>;
}

function marketplaceHref(
  current: Awaited<MarketplacePageProps["searchParams"]>,
  updates: { category?: string; sort?: string }
) {
  const params = new URLSearchParams();
  if (current.q) params.set("q", current.q);
  const category = Object.prototype.hasOwnProperty.call(updates, "category") ? updates.category : current.category;
  const sort = updates.sort ?? current.sort;
  if (category) params.set("category", category);
  if (sort) params.set("sort", sort);
  const query = params.toString();
  return `/marketplace${query ? `?${query}` : ""}`;
}

function marketplaceSort(value?: string): MarketplaceSort {
  return value === "latest" || value === "rating" || value === "installs" ? value : "trending";
}

function formatCategory(value: string) {
  return value.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

type MarketplaceData = Awaited<ReturnType<ExperienceService["marketplace"]>>;
type MarketplaceSkill = MarketplaceData["results"][number];
