import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TestTube2,
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

  return (
    <main className="marketplace-stage relative min-h-screen overflow-hidden px-4 py-5 sm:px-5 md:py-8">
      <div className="marketplace-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-[10%] top-0 h-64 w-64 rounded-full bg-mint/[0.07] blur-[100px]" />
      <div className="pointer-events-none absolute right-[7%] top-36 h-72 w-72 rounded-full bg-aqua/[0.05] blur-[110px]" />

      <div className="relative mx-auto max-w-7xl">
        <section className="overflow-hidden rounded-[1.35rem] border border-white/[0.13] bg-carbon/85 shadow-[0_24px_80px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1fr_auto] lg:items-stretch">
            <div className="p-5 sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.08] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-mint">
                  <Sparkles className="h-3.5 w-3.5" /> Agent skill registry
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mint shadow-[0_0_10px_rgba(115,243,195,0.8)]" />
                  Live on x402
                </span>
              </div>
              <h1 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Proven skills. <span className="text-mint">Ready to clone.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/52 sm:text-base">
                Evidence-backed agent repositories with real tests, buyer signal, and portable source files.
              </p>
            </div>

            <div className="relative grid grid-cols-3 overflow-hidden border-t border-line bg-[#080d0b]/90 lg:w-[28rem] lg:border-l lg:border-t-0">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-mint/15 to-transparent" />
              <RegistryStat label="Skills" value={marketplace.totalListings} icon={<BadgeCheck className="h-3.5 w-3.5" />} />
              <RegistryStat label="Installs" value={marketplace.totalInstalls} icon={<TrendingUp className="h-3.5 w-3.5" />} />
              <RegistryStat label="Categories" value={marketplace.categories.length} icon={<Boxes className="h-3.5 w-3.5" />} />
            </div>
          </div>

          <form action="/marketplace" className="grid gap-2 border-t border-line bg-ink/45 p-3 sm:grid-cols-[1fr_auto] sm:p-4">
            <label className="relative">
              <span className="sr-only">Search verified skills</span>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/32" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search skills, problems, or ecosystems"
                className="h-11 w-full rounded-lg border border-line bg-carbon/75 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/27 focus:border-mint/55 focus:ring-2 focus:ring-mint/10"
              />
            </label>
            <input type="hidden" name="sort" value={sort} />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-white">
              Search <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-[1rem] border border-line bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
              <span className="shrink-0 px-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">Category</span>
              <FilterLink href={marketplaceHref(params, { category: undefined })} active={!params.category}>All</FilterLink>
              {marketplace.categories.map((category) => (
                <FilterLink
                  key={category.name}
                  href={marketplaceHref(params, { category: category.name })}
                  active={params.category === category.name}
                >
                  {formatCategory(category.name)} <span className="text-white/30">{category.count}</span>
                </FilterLink>
              ))}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
              <span className="shrink-0 px-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/30">Sort</span>
              {(["trending", "latest", "rating", "installs"] as MarketplaceSort[]).map((item) => (
                <FilterLink key={item} href={marketplaceHref(params, { sort: item })} active={sort === item}>
                  {item}
                </FilterLink>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[1.25rem] border border-line bg-carbon/72 shadow-[0_20px_70px_rgba(0,0,0,0.22)]">
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-mint/20 bg-mint/[0.07] text-mint">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {params.q ? `Results for "${params.q}"` : params.category ? formatCategory(params.category) : "Verified registry"}
                </p>
                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-white/30">
                  Evidence gated · {marketplace.count} {marketplace.count === 1 ? "match" : "matches"}
                </p>
              </div>
            </div>
            {(params.q || params.category) ? (
              <Link href="/marketplace" className="shrink-0 text-xs text-white/42 transition hover:text-mint">Clear filters</Link>
            ) : null}
          </div>

          {marketplace.results.length ? (
            <>
              <div className="hidden grid-cols-[minmax(0,1fr)_13rem_10rem_7rem] border-b border-line bg-white/[0.018] px-5 py-2.5 font-mono text-[8px] uppercase tracking-[0.16em] text-white/28 lg:grid">
                <span>Skill / repository</span>
                <span>Evidence</span>
                <span>Market signal</span>
                <span className="text-right">Access</span>
              </div>
              <div className="divide-y divide-line">
                {marketplace.results.map((skill) => <SkillRow key={skill.id} skill={skill} />)}
              </div>
            </>
          ) : (
            <div className="p-10 text-center sm:p-14">
              <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-mint">No verified match</p>
              <p className="mt-2 text-sm text-white/48">Try a broader workflow, another ecosystem, or clear the current filters.</p>
              <Link href="/marketplace" className="mt-5 inline-flex h-9 items-center rounded-lg border border-line px-4 text-xs text-white/65 hover:border-mint/40 hover:text-white">Clear filters</Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function RegistryStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="group relative flex min-h-28 flex-col justify-center gap-5 border-l border-white/[0.07] px-3.5 py-5 first:border-l-0 sm:min-h-32 sm:px-5 lg:min-h-0">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-mint/20 bg-mint/[0.07] text-mint transition group-hover:border-mint/40 group-hover:bg-mint/[0.12]">
          {icon}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/38">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold tracking-[-0.06em] text-white">{value}</p>
        <span className="mb-1 font-mono text-[7px] uppercase tracking-[0.15em] text-mint/55">indexed</span>
      </div>
    </div>
  );
}

function SkillRow({ skill }: { skill: MarketplaceSkill }) {
  const rating = skill.rating ? `${skill.rating.toFixed(1)} / 5` : "No ratings";
  const repository = skill.repositoryFiles > 0 ? `${skill.repositoryFiles} files` : "Manifest only";

  return (
    <Link
      href={`/marketplace/${skill.id}`}
      className="group grid gap-4 px-4 py-4 transition hover:bg-white/[0.035] sm:px-5 lg:grid-cols-[minmax(0,1fr)_13rem_10rem_7rem] lg:items-center lg:gap-0"
    >
      <div className="flex min-w-0 gap-3 lg:pr-7">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-ink/65 font-mono text-[10px] text-white/32 transition group-hover:border-mint/30 group-hover:text-mint">
          {String(skill.rank).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-[-0.02em] text-white/88 transition group-hover:text-white">{skill.name}</h2>
            <span className="rounded-md border border-mint/18 bg-mint/[0.06] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-mint">
              {formatCategory(skill.category)}
            </span>
            {skill.featured ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber/20 bg-amber/[0.06] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-amber">
                <Sparkles className="h-2.5 w-2.5" /> Featured
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 line-clamp-2 max-w-2xl text-xs leading-5 text-white/44">{skill.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[8px] uppercase tracking-[0.1em] text-white/28">
            <span>by {skill.seller.name}</span>
            <span>v{skill.version}</span>
            {skill.compatibility.slice(0, 3).map((host) => <span key={host}>{host}</span>)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-1.5 lg:border-l lg:border-line lg:px-5">
        <DenseMetric icon={<BadgeCheck className="h-3.5 w-3.5" />} value={`${skill.validationScore}%`} label="validated" tone="mint" />
        <DenseMetric icon={<TestTube2 className="h-3.5 w-3.5" />} value={skill.testCount} label="tests" />
        <DenseMetric icon={<CheckCircle2 className="h-3.5 w-3.5" />} value={repository} label="repository" />
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-1.5 lg:border-l lg:border-line lg:px-5">
        <DenseMetric icon={<TrendingUp className="h-3.5 w-3.5" />} value={skill.installCount} label="paid installs" />
        <DenseMetric icon={<Star className="h-3.5 w-3.5" />} value={rating} label={skill.reviewCount ? `${skill.reviewCount} reviews` : "buyer rating"} />
      </div>

      <div className="flex items-center justify-between border-t border-line pt-3 lg:block lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 lg:text-right">
        <span className="font-mono text-[8px] uppercase tracking-[0.13em] text-white/28 lg:block">x402 price</span>
        <span className="flex items-center gap-2 font-mono text-sm font-semibold text-mint lg:mt-1 lg:justify-end">
          ${skill.priceUsd.toFixed(2)}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

function DenseMetric({
  icon,
  value,
  label,
  tone = "default"
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone?: "default" | "mint";
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${tone === "mint" ? "text-mint" : "text-white/55"}`}>
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate text-[11px] font-medium">{value}</span>
      <span className="hidden truncate font-mono text-[8px] uppercase tracking-[0.08em] text-white/25 sm:inline">{label}</span>
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] transition ${
        active
          ? "border-mint/35 bg-mint/[0.09] text-mint"
          : "border-line bg-ink/35 text-white/45 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
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
