import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  CheckCircle2,
  CircleDollarSign,
  Download,
  Fingerprint,
  GitBranch,
  PackageCheck,
  ShieldCheck,
  Star,
  Terminal,
  Users
} from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { SkillReviewForm } from "@/components/skill-review-form";
import { marketplaceSkillSeo, safeJsonLd } from "@/lib/marketplace-seo";
import { site } from "@/lib/site";
import { ExperienceService } from "@/services/experience-service";

export const dynamic = "force-dynamic";

type SkillPageProps = {
  params: Promise<{ skillId: string }>;
};

export async function generateMetadata({ params }: SkillPageProps): Promise<Metadata> {
  const { skillId } = await params;
  const listing = await new ExperienceService().publicListing(skillId);
  if (!listing) return { title: "Skill not found | ContextKit", robots: { index: false, follow: false } };
  const seo = marketplaceSkillSeo(listing);
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: seo.canonical },
    robots: {
      index: seo.indexable,
      follow: true,
      googleBot: { index: seo.indexable, follow: true, "max-image-preview": "large", "max-snippet": -1 }
    },
    openGraph: {
      title: `${seo.name} | ContextKit Verified Skill`,
      description: seo.description,
      url: seo.canonical,
      type: "article",
      siteName: site.name,
      images: [{ url: `${site.url}/social-card-v7.jpg?skill=${encodeURIComponent(listing.id)}`, width: 1200, height: 630, alt: `${seo.name} verified agent skill` }]
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.name} | Verified Agent Skill`,
      description: seo.description,
      images: [{ url: `${site.url}/social-card-v7.jpg?skill=${encodeURIComponent(listing.id)}`, alt: `${seo.name} verified agent skill` }]
    }
  };
}

export default async function SkillMarketplacePage({ params }: SkillPageProps) {
  const { skillId } = await params;
  const service = new ExperienceService();
  const listing = await service.publicListing(skillId);
  if (!listing) notFound();
  const seo = marketplaceSkillSeo(listing);
  const related = (await service.marketplace({ category: listing.category, sort: "trending", limit: 5 })).results
    .filter((item) => item.id !== listing.id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${seo.canonical}#webpage`,
        name: seo.title,
        description: seo.description,
        url: seo.canonical,
        datePublished: listing.publishedAt,
        dateModified: listing.updatedAt,
        breadcrumb: { "@id": `${seo.canonical}#breadcrumb` },
        mainEntity: { "@id": `${seo.canonical}#skill` }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${seo.canonical}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ContextKit", item: site.url },
          { "@type": "ListItem", position: 2, name: "Marketplace", item: `${site.url}/marketplace` },
          { "@type": "ListItem", position: 3, name: seo.name, item: seo.canonical }
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${seo.canonical}#skill`,
        name: seo.name,
        description: listing.description,
        applicationCategory: listing.category,
        softwareVersion: listing.version,
        operatingSystem: listing.compatibility.join(", "),
        author: { "@type": "Person", name: listing.seller.name },
        offers: {
          "@type": "Offer",
          url: seo.canonical,
          price: listing.priceUsd.toFixed(2),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock"
        },
        ...(listing.reviewCount ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: listing.rating,
            reviewCount: listing.reviewCount,
            bestRating: 5,
            worstRating: 1
          }
        } : {})
      }
    ]
  };
  const cloneCommand = `export CONTEXTKIT_API_KEY="ck_live_REPLACE_ME"\ncontextkit skill buy ${listing.id}\ncontextkit skill clone ${listing.id} ./${listing.name}`;

  return (
    <main className="marketplace-stage relative min-h-screen overflow-hidden px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <div className="marketplace-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-mint/[0.06] blur-[130px]" />

      <div className="relative mx-auto max-w-6xl">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-white/42">
          <Link href="/" className="transition hover:text-mint">ContextKit</Link>
          <span aria-hidden="true">/</span>
          <Link href="/marketplace" className="transition hover:text-mint">Marketplace</Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-white/65">{seo.name}</span>
        </nav>
        <Link href="/marketplace" className="mt-4 inline-flex items-center gap-2 text-sm text-white/48 transition hover:text-mint">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>

        <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-white/[0.13] bg-carbon/85 shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
          <div className="grid lg:grid-cols-[1fr_340px]">
            <div className="p-6 sm:p-9 lg:border-r lg:border-line lg:p-11">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.08] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-mint">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified repository
                </span>
                <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/42">{formatCategory(listing.category)}</span>
                <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/42">v{listing.version}</span>
              </div>
              <h1 className="mt-7 break-words text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">{listing.name}</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/58 sm:text-lg">{listing.description}</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-white/46">
                <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-aqua" /> {listing.installCount} paid installs</span>
                <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 fill-amber text-amber" /> {listing.rating ? `${listing.rating} from ${listing.reviewCount}` : "No reviews yet"}</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-mint" /> {listing.validationScore}/100 validation</span>
              </div>
            </div>
            <div className="bg-ink/55 p-6 sm:p-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.17em] text-white/35">x402 repository access</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-[-0.04em] text-white">${listing.priceUsd.toFixed(2)}</span>
                <span className="text-sm text-white/38">USDC / clone</span>
              </div>
              <div className="mt-6 space-y-3 text-sm text-white/55">
                <TrustLine icon={<PackageCheck className="h-4 w-4" />} text={`${listing.repositoryFiles} verified repository files`} />
                <TrustLine icon={<CheckCircle2 className="h-4 w-4" />} text={`${listing.testCount} evidence-backed tests`} />
                <TrustLine icon={<GitBranch className="h-4 w-4" />} text={`Immutable version ${listing.version}`} />
                <TrustLine icon={<Download className="h-4 w-4" />} text="Checksummed clone bundle" />
              </div>
              <a href="#install" className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mint text-sm font-semibold text-ink transition hover:bg-white">
                Buy + clone <Terminal className="h-4 w-4" />
              </a>
              <p className="mt-3 text-center text-xs text-white/32">Paid files remain private until purchase.</p>
            </div>
          </div>
          <div className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <ListingStat label="Seller" value={listing.seller.name} />
            <ListingStat label="License" value={listing.license} />
            <ListingStat label="Compatibility" value={listing.compatibility.slice(0, 3).join(" · ")} />
            <ListingStat label="Published" value={formatDate(listing.publishedAt)} />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="rounded-[1.25rem] border border-line bg-white/[0.026] p-5 sm:p-7">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mint">Execution preview</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">Know when to load it.</h2>
              <p className="mt-5 leading-7 text-white/56">{listing.skill.trigger}</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PreviewList title="Prerequisites" items={listing.skill.prerequisites} />
                <PreviewList title="Expected outputs" items={listing.skill.outputs} />
              </div>
            </div>

            <div id="install" className="scroll-mt-24 rounded-[1.25rem] border border-aqua/20 bg-aqua/[0.035] p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-aqua/25 bg-aqua/[0.08]"><Terminal className="h-4 w-4 text-aqua" /></span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-aqua">Verified delivery</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Buy and materialize the repository.</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/48">The CLI verifies the manifest, SHA-256 digest, file checksums, and safe paths before writing anything locally.</p>
              <div className="mt-5"><CodeBlock code={cloneCommand} /></div>
            </div>

            <SkillReviewForm skillId={listing.id} />

            <div className="rounded-[1.25rem] border border-line bg-white/[0.026] p-5 sm:p-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-amber">Public reputation</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Buyer reviews</h2>
                </div>
                <span className="text-sm text-white/38">{listing.reviewCount} total</span>
              </div>
              {listing.reviews.length ? (
                <div className="mt-6 divide-y divide-line">
                  {listing.reviews.map((review) => (
                    <article key={review.id} className="py-5 first:pt-0 last:pb-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-white">{review.reviewerName}</p>
                            {review.verifiedPurchase ? <span className="inline-flex items-center gap-1 rounded-full border border-mint/20 bg-mint/[0.07] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.13em] text-mint"><BadgeCheck className="h-3 w-3" /> verified buyer</span> : null}
                          </div>
                          {review.title ? <h3 className="mt-2 text-sm font-medium text-white/78">{review.title}</h3> : null}
                        </div>
                        <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-amber text-amber" : "text-white/15"}`} />)}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/52">{review.body}</p>
                      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-white/25">{formatDate(review.updatedAt)}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-xl border border-dashed border-line p-7 text-center text-sm text-white/42">No buyer review yet. Be the first to report a real installation outcome.</div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[1.25rem] border border-line bg-carbon/82 p-5">
              <div className="flex items-center gap-2 text-mint"><Fingerprint className="h-4 w-4" /><p className="font-mono text-[9px] uppercase tracking-[0.16em]">Repository identity</p></div>
              <dl className="mt-5 space-y-4 text-sm">
                <Detail label="Repository" value={listing.repository?.name ?? listing.name} />
                <Detail label="Version" value={listing.repository?.version ?? listing.version} />
                <Detail label="Files" value={String(listing.repositoryFiles)} />
                <Detail label="Tests" value={String(listing.testCount)} />
                <Detail label="Digest" value={shortDigest(listing.repositoryDigest)} mono />
              </dl>
            </div>
            <div className="rounded-[1.25rem] border border-line bg-white/[0.026] p-5">
              <div className="flex items-center gap-2 text-aqua"><Box className="h-4 w-4" /><p className="font-mono text-[9px] uppercase tracking-[0.16em]">Works with</p></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.compatibility.map((host) => <span key={host} className="rounded-lg border border-line bg-ink/50 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-white/48">{host}</span>)}
              </div>
            </div>
            <div className="rounded-[1.25rem] border border-amber/20 bg-amber/[0.035] p-5">
              <div className="flex items-center gap-2 text-amber"><CircleDollarSign className="h-4 w-4" /><p className="font-mono text-[9px] uppercase tracking-[0.16em]">Creator economy</p></div>
              <p className="mt-4 text-sm leading-6 text-white/52">Each paid clone increments public installs and the seller&apos;s USDC revenue ledger.</p>
              <Link href="/dashboard/skills" className="mt-4 inline-flex items-center gap-2 text-sm text-amber transition hover:text-white">Open seller dashboard <ArrowLeft className="h-3.5 w-3.5 rotate-180" /></Link>
            </div>
          </aside>
        </section>

        {related.length ? (
          <section className="mt-8 border-t border-line pt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-mint">Continue discovery</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">More {formatCategory(listing.category)} skills</h2>
              </div>
              <Link href={`/marketplace?category=${encodeURIComponent(listing.category)}`} className="text-sm text-white/45 transition hover:text-mint">View category</Link>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <Link key={item.id} href={`/marketplace/${item.id}`} className="rounded-xl border border-line bg-white/[0.025] p-4 transition hover:border-mint/35 hover:bg-mint/[0.04]">
                  <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-mint">{item.testCount} tests · {item.validationScore}/100</p>
                  <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-white">{item.name}</h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/42">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function TrustLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2"><span className="text-mint">{icon}</span><span>{text}</span></div>;
}

function ListingStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-carbon/95 p-4 sm:p-5"><p className="font-mono text-[8px] uppercase tracking-[0.15em] text-white/30">{label}</p><p className="mt-2 truncate text-sm text-white/70" title={value}>{value}</p></div>;
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/32">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.length ? items.slice(0, 5).map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-white/52"><CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-mint" />{item}</li>) : <li className="text-sm text-white/35">No public preview.</li>}
      </ul>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/28">{label}</dt><dd className={`mt-1 break-words text-white/65 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}

function shortDigest(value?: string) {
  if (!value) return "pending";
  return value.length > 28 ? `${value.slice(0, 18)}...${value.slice(-8)}` : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function formatCategory(value: string) {
  return value.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
