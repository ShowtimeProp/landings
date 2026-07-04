/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import LeadPortalAuthLauncher from '@/components/LeadPortalAuthLauncher';

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

type PortfolioTheme = 'dark' | 'soft' | 'light';

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

function normalizeTheme(raw?: string | null): PortfolioTheme {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'light') return 'light';
  if (value === 'soft' || value === 'neutral' || value === 'mid') return 'soft';
  return 'dark';
}

function nextTheme(theme: PortfolioTheme): PortfolioTheme {
  if (theme === 'dark') return 'soft';
  if (theme === 'soft') return 'light';
  return 'dark';
}

function themeLabel(theme: PortfolioTheme): string {
  if (theme === 'light') return 'Tema claro';
  if (theme === 'soft') return 'Tema suave';
  return 'Tema oscuro';
}

function ThemeIcon({ theme, className = 'h-4 w-4' }: { theme: PortfolioTheme; className?: string }) {
  if (theme === 'light') {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
  }
  if (theme === 'soft') {
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m9-9H3m13.5-5.5l-9 11M7.5 6.5l9 11" /></svg>;
  }
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}

function blogQuery(theme: PortfolioTheme, refCode?: string | null, rawSearch?: Record<string, string | undefined>): string {
  const params = new URLSearchParams({ theme });
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid']) {
    const value = String(rawSearch?.[key] || '').trim();
    if (value) params.set(key, value);
  }
  if (refCode) params.set('ref', refCode);
  return params.toString();
}

function articleHref(tenantSlug: string, slug: string, theme: PortfolioTheme, refCode?: string | null, rawSearch?: Record<string, string | undefined>): string {
  const path = `/p/${tenantSlug}/blog/${slug}`;
  return `${path}?${blogQuery(theme, refCode, rawSearch)}`;
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
  const theme = normalizeTheme(resolvedSearch.theme);
  const data = await fetchBlogIndex(tenant_slug, referralCode);
  if (!data?.blog_enabled || !data.tenant) notFound();
  const tenant = data.tenant;
  const articles = data.articles || [];
  const featured = articles.find((article) => article.is_featured) || articles[0];
  const rest = articles.filter((article) => article.id !== featured?.id);
  const tenantName = tenant.tenant_name || tenant.name;
  const contactName = tenant.realtor_name || tenantName;
  const nextBlogTheme = nextTheme(theme);
  const isLight = theme === 'light';
  const isSoft = theme === 'soft';
  const rootClass = isLight ? 'bg-zinc-50 text-zinc-950' : isSoft ? 'bg-slate-900 text-zinc-100' : 'bg-[#07090d] text-zinc-100';
  const headerClass = isLight ? 'border-zinc-200 bg-white/90' : isSoft ? 'border-white/10 bg-slate-950/50' : 'border-white/10 bg-black/35';
  const cardClass = isLight ? 'border-zinc-200 bg-white shadow-sm hover:border-cyan-300' : 'border-white/10 bg-white/[0.06] shadow-[0_16px_45px_rgba(0,0,0,0.22)] hover:border-[#f4c400]/45';
  const mutedClass = isLight ? 'text-zinc-600' : 'text-zinc-300';
  const titleHoverClass = isLight ? 'group-hover:text-cyan-800' : 'group-hover:text-[#f4c400]';
  const pillClass = isLight ? 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-white' : 'border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10';
  const portfolioHref = `/p/${tenant.slug}?${blogQuery(theme, referralCode, resolvedSearch)}`;
  const blogThemeHref = `/p/${tenant.slug}/blog?${blogQuery(nextBlogTheme, referralCode, resolvedSearch)}`;
  const portalParams = new URLSearchParams({
    tenant_slug: tenant.slug,
    next: '/perfil-lead/panel',
  });
  if (referralCode) portalParams.set('ref', referralCode);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid']) {
    const value = String(resolvedSearch[key] || '').trim();
    if (value) portalParams.set(key, value);
  }
  const portalQuery = Object.fromEntries(portalParams.entries());

  return (
    <main className={`min-h-screen ${rootClass}`}>
      <header className={`border-b backdrop-blur ${headerClass}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={portfolioHref} className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border ${isLight ? 'border-zinc-200 bg-zinc-100' : 'border-white/15 bg-white/5'}`}>
              {tenant.logo_url ? <img src={tenant.logo_url} alt={tenantName} className="h-full w-full object-contain p-1" /> : tenantName.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-[11px] uppercase tracking-[0.16em] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Portfolio / Blog</span>
              <span className="block truncate text-sm font-semibold">{tenantName}</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href={blogThemeHref} aria-label={`Cambiar a ${themeLabel(nextBlogTheme).toLowerCase()}`} title={themeLabel(nextBlogTheme)} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${pillClass}`}>
              <ThemeIcon theme={nextBlogTheme} className="h-5 w-5" />
            </Link>
            <LeadPortalAuthLauncher query={portalQuery} isLight={isLight} />
            <Link href={portfolioHref} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${pillClass}`}>
              Volver al Portfolio
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-7 flex items-center gap-4">
          <span className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border ${isLight ? 'border-zinc-200 bg-zinc-100' : 'border-white/15 bg-white/5'}`}>
            {tenant.profile_photo_url ? <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" /> : contactName.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isLight ? 'text-cyan-700' : 'text-[#f4c400]'}`}>Asesor inmobiliario</p>
            <p className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{contactName}</p>
          </div>
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Blog Inmobiliario</h1>
        <p className={`mt-4 max-w-2xl text-lg leading-8 ${mutedClass}`}>
          Guías, tendencias y oportunidades del mercado, curadas para tomar mejores decisiones inmobiliarias.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        {featured ? (
          <Link href={articleHref(tenant.slug, featured.slug, theme, referralCode, resolvedSearch)} className={`group grid overflow-hidden rounded-lg border transition lg:grid-cols-[1.15fr_0.85fr] ${cardClass}`}>
            <div className={isLight ? 'min-h-[280px] bg-zinc-200' : 'min-h-[280px] bg-white/10'}>
              {featured.hero_image_url ? <img src={featured.hero_image_url} alt={featured.title} className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${isLight ? 'text-cyan-700' : 'text-[#f4c400]'}`}>
                <span>{featured.target_audience}</span>
                <span className="text-zinc-300">/</span>
                <span>{formatDate(featured.published_at)}</span>
              </div>
              <h2 className={`mt-4 text-3xl font-semibold tracking-tight ${titleHoverClass}`}>{featured.title}</h2>
              <p className={`mt-4 text-base leading-7 ${mutedClass}`}>{featured.excerpt || featured.meta_description}</p>
            </div>
          </Link>
        ) : (
          <div className={`rounded-lg border p-10 text-center ${cardClass} ${mutedClass}`}>Todavía no hay notas seleccionadas.</div>
        )}

        {rest.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((article) => (
              <Link key={article.id} href={articleHref(tenant.slug, article.slug, theme, referralCode, resolvedSearch)} className={`group overflow-hidden rounded-lg border transition ${cardClass}`}>
                <div className={isLight ? 'aspect-video bg-zinc-200' : 'aspect-video bg-white/10'}>
                  {article.hero_image_url ? <img src={article.hero_image_url} alt={article.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="p-5">
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isLight ? 'text-cyan-700' : 'text-[#f4c400]'}`}>{article.target_audience}</p>
                  <h3 className={`mt-3 text-xl font-semibold leading-snug ${titleHoverClass}`}>{article.title}</h3>
                  <p className={`mt-3 line-clamp-3 text-sm leading-6 ${mutedClass}`}>{article.excerpt || article.meta_description}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
