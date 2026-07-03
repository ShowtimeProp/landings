/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

type Tenant = {
  name: string;
  slug: string;
  tenant_name?: string | null;
  realtor_name?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
};

type BlogArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  hero_image_url?: string | null;
  target_audience: string;
  meta_description?: string | null;
  published_at?: string | null;
  is_featured?: boolean;
};

type BlogIndexResponse = {
  status: string;
  blog_enabled: boolean;
  tenant?: Tenant;
  canonical_url?: string;
  articles: BlogArticle[];
};

function normalizeReferralCode(raw?: string | null): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
  return normalized || null;
}

function articleHref(tenantSlug: string, slug: string, refCode?: string | null): string {
  const path = `/p/${tenantSlug}/blog/${slug}`;
  return refCode ? `${path}?ref=${encodeURIComponent(refCode)}` : path;
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function fetchBlogIndex(tenantSlug: string, refCode?: string | null): Promise<BlogIndexResponse | null> {
  const params = new URLSearchParams();
  if (refCode) params.set('ref', refCode);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${BACKEND_URL}/api/blogs/public/tenants/${encodeURIComponent(tenantSlug)}/blog${suffix}`, { next: { revalidate: 120 } });
  if (!response.ok) return null;
  return (await response.json()) as BlogIndexResponse;
}

export async function generateMetadata({ params }: { params: Promise<{ tenant_slug: string }> }): Promise<Metadata> {
  const { tenant_slug } = await params;
  const data = await fetchBlogIndex(tenant_slug);
  if (!data?.blog_enabled) return { title: 'Blog no disponible | ShowtimeProp' };
  const tenantName = data.tenant?.tenant_name || data.tenant?.name || tenant_slug;
  const title = `Blog Inmobiliario | ${tenantName}`;
  const description = `Ideas, guías y pulso del mercado inmobiliario seleccionados por ${tenantName}.`;
  const image = data.articles.find((item) => item.hero_image_url)?.hero_image_url;
  return {
    title,
    description,
    alternates: { canonical: data.canonical_url || `${LANDINGS_URL}/p/${tenant_slug}/blog` },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${LANDINGS_URL}/p/${tenant_slug}/blog`,
      images: image ? [{ url: image, width: 1200, height: 630, alt: title }] : undefined,
    },
  };
}

export default async function TenantBlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenant_slug } = await params;
  const resolvedSearch = await searchParams;
  const referralCode = normalizeReferralCode(resolvedSearch.ref);
  const data = await fetchBlogIndex(tenant_slug, referralCode);
  if (!data?.blog_enabled || !data.tenant) notFound();
  const tenant = data.tenant;
  const articles = data.articles || [];
  const featured = articles.find((article) => article.is_featured) || articles[0];
  const rest = articles.filter((article) => article.id !== featured?.id);
  const tenantName = tenant.tenant_name || tenant.name;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={`/p/${tenant.slug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`} className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
              {tenant.logo_url ? <img src={tenant.logo_url} alt={tenantName} className="h-full w-full object-contain p-1" /> : tenantName.charAt(0)}
            </span>
            <span className="truncate text-sm font-semibold">{tenantName}</span>
          </Link>
          <Link href={`/p/${tenant.slug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`} className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold hover:bg-zinc-100">
            Portfolio
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">{tenantName}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Blog Inmobiliario</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">
          Guías, tendencias y oportunidades del mercado, curadas para tomar mejores decisiones inmobiliarias.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        {featured ? (
          <Link href={articleHref(tenant.slug, featured.slug, referralCode)} className="group grid overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-cyan-300 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="min-h-[280px] bg-zinc-200">
              {featured.hero_image_url ? <img src={featured.hero_image_url} alt={featured.title} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                <span>{featured.target_audience}</span>
                <span className="text-zinc-300">/</span>
                <span>{formatDate(featured.published_at)}</span>
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight group-hover:text-cyan-800">{featured.title}</h2>
              <p className="mt-4 text-base leading-7 text-zinc-600">{featured.excerpt || featured.meta_description}</p>
            </div>
          </Link>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center text-zinc-600">Todavía no hay notas seleccionadas.</div>
        )}

        {rest.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((article) => (
              <Link key={article.id} href={articleHref(tenant.slug, article.slug, referralCode)} className="group overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:border-cyan-300">
                <div className="aspect-video bg-zinc-200">
                  {article.hero_image_url ? <img src={article.hero_image_url} alt={article.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{article.target_audience}</p>
                  <h3 className="mt-3 text-xl font-semibold leading-snug group-hover:text-cyan-800">{article.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{article.excerpt || article.meta_description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
