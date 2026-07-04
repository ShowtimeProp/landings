/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BlogLeadForm from '@/components/BlogLeadForm';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const LANDINGS_URL = process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

type Tenant = {
  name: string;
  slug: string;
  tenant_name?: string | null;
  realtor_name?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  vcard_url?: string | null;
};

type PortfolioTheme = 'dark' | 'soft' | 'light';

type MediaAsset = {
  id: string;
  asset_type: string;
  title: string;
  body?: string | null;
  embed_url?: string | null;
  thumbnail_url?: string | null;
  status: string;
};

type BlogArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  hero_image_url?: string | null;
  target_audience: string;
  content_format: string;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  noindex?: boolean;
  published_at?: string | null;
  faq?: Array<{ question?: string; answer?: string }>;
  media_assets?: MediaAsset[];
  schema_org?: Record<string, unknown>;
};

type BlogDetailResponse = {
  status: string;
  tenant: Tenant;
  article: BlogArticle;
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

function blogQuery(theme: PortfolioTheme, refCode?: string | null, campaignQueryString?: string): string {
  const params = new URLSearchParams({ theme });
  if (campaignQueryString) {
    const campaignParams = new URLSearchParams(campaignQueryString);
    campaignParams.forEach((value, key) => {
      if (key !== 'theme') params.set(key, value);
    });
  }
  if (refCode) params.set('ref', refCode);
  return params.toString();
}

function buildCampaignQueryString(rawSearch: Record<string, string | undefined>, referralCode?: string | null): string {
  const params = new URLSearchParams();
  if (referralCode) params.set('ref', referralCode);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'gbraid', 'wbraid']) {
    const value = String(rawSearch[key] || '').trim();
    if (value) params.set(key, value);
  }
  return params.toString();
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getWhatsappUrl(phone?: string | null, tenantName?: string, articleTitle?: string, campaignQueryString?: string): string | null {
  const digits = (phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const baseMessage = `Hola ${tenantName || ''}, leí la nota ${articleTitle || ''} y me gustaría consultar.`;
  const message = campaignQueryString ? `${baseMessage} source=blog ${campaignQueryString.replace(/&/g, ' ')}` : `${baseMessage} source=blog`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

async function fetchArticle(tenantSlug: string, articleSlug: string, refCode?: string | null): Promise<BlogDetailResponse | null> {
  const params = new URLSearchParams();
  if (refCode) params.set('ref', refCode);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${BACKEND_URL}/api/blogs/public/tenants/${encodeURIComponent(tenantSlug)}/blog/${encodeURIComponent(articleSlug)}${suffix}`, { next: { revalidate: 120 } });
  if (!response.ok) return null;
  return (await response.json()) as BlogDetailResponse;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant_slug: string; article_slug: string }>;
}): Promise<Metadata> {
  const { tenant_slug, article_slug } = await params;
  const data = await fetchArticle(tenant_slug, article_slug);
  if (!data?.article) return { title: 'Nota no encontrada | ShowtimeProp' };
  const article = data.article;
  const title = article.meta_title || article.title;
  const description = article.meta_description || article.excerpt || '';
  const canonical = article.canonical_url || `${LANDINGS_URL}/p/${tenant_slug}/blog/${article_slug}`;
  return {
    title,
    description,
    robots: article.noindex ? { index: false, follow: true } : undefined,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      images: article.hero_image_url ? [{ url: article.hero_image_url, width: 1200, height: 630, alt: article.title }] : undefined,
    },
    twitter: {
      card: article.hero_image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      images: article.hero_image_url ? [article.hero_image_url] : undefined,
    },
  };
}

export default async function BlogArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string; article_slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { tenant_slug, article_slug } = await params;
  const resolvedSearch = await searchParams;
  const referralCode = normalizeReferralCode(resolvedSearch.ref);
  const theme = normalizeTheme(resolvedSearch.theme);
  const campaignQueryString = buildCampaignQueryString(resolvedSearch, referralCode);
  const data = await fetchArticle(tenant_slug, article_slug, referralCode);
  if (!data?.article || !data.tenant) notFound();
  const { tenant, article } = data;
  const tenantName = tenant.tenant_name || tenant.name;
  const contactName = tenant.realtor_name || tenantName;
  const whatsappUrl = getWhatsappUrl(tenant.whatsapp, tenantName, article.title, campaignQueryString);
  const video = (article.media_assets || []).find((asset) => asset.embed_url && ['video_blog', 'shorts_pack'].includes(asset.asset_type));
  const nextBlogTheme = nextTheme(theme);
  const isLight = theme === 'light';
  const isSoft = theme === 'soft';
  const rootClass = isLight ? 'bg-zinc-50 text-zinc-950' : isSoft ? 'bg-slate-900 text-zinc-100' : 'bg-[#07090d] text-zinc-100';
  const headerClass = isLight ? 'border-zinc-200 bg-white/90' : isSoft ? 'border-white/10 bg-slate-950/50' : 'border-white/10 bg-black/35';
  const panelClass = isLight ? 'border-zinc-200 bg-white shadow-sm' : 'border-white/10 bg-white/[0.06] shadow-[0_16px_45px_rgba(0,0,0,0.22)]';
  const mutedClass = isLight ? 'text-zinc-600' : 'text-zinc-300';
  const proseTextClass = isLight ? 'text-zinc-700' : 'text-zinc-200';
  const pillClass = isLight ? 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-white' : 'border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10';
  const accentClass = isLight ? 'text-cyan-700' : 'text-[#f4c400]';
  const portfolioHref = `/p/${tenant.slug}?${blogQuery(theme, referralCode, campaignQueryString)}`;
  const blogHref = `/p/${tenant.slug}/blog?${blogQuery(theme, referralCode, campaignQueryString)}`;
  const blogThemeHref = `/p/${tenant.slug}/blog/${article.slug}?${blogQuery(nextBlogTheme, referralCode, campaignQueryString)}`;

  return (
    <main className={`min-h-screen ${rootClass}`}>
      {article.schema_org ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema_org) }} /> : null}
      <header className={`border-b backdrop-blur ${headerClass}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={blogHref} className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border ${isLight ? 'border-zinc-200 bg-zinc-100' : 'border-white/15 bg-white/5'}`}>
              {tenant.logo_url ? <img src={tenant.logo_url} alt={tenantName} className="h-full w-full object-contain p-1" /> : tenantName.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className={`block truncate text-[11px] uppercase tracking-[0.16em] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Portfolio / Blog / Nota</span>
              <span className="block truncate text-sm font-semibold">{tenantName}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={blogThemeHref} aria-label={`Cambiar a ${themeLabel(nextBlogTheme).toLowerCase()}`} title={themeLabel(nextBlogTheme)} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${pillClass}`}>
              <ThemeIcon theme={nextBlogTheme} className="h-5 w-5" />
            </Link>
            <Link href={portfolioHref} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${pillClass}`}>
              Volver al Portfolio
            </Link>
          </div>
        </div>
      </header>

      <article>
        <section className={isLight ? 'bg-zinc-950 text-white' : 'bg-black text-white'}>
          {article.hero_image_url ? (
            <div className="relative min-h-[420px] overflow-hidden">
              <img src={article.hero_image_url} alt={article.title} className="absolute inset-0 h-full w-full object-cover opacity-72" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/10" />
              <div className="relative mx-auto flex min-h-[420px] max-w-5xl flex-col justify-end px-4 py-10 sm:px-6">
                <div className="mb-6 flex items-center gap-4">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                    {tenant.profile_photo_url ? <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" /> : contactName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4c400]">Asesor inmobiliario</p>
                    <p className="truncate text-xl font-semibold">{contactName}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">{article.target_audience}</p>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{article.title}</h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-200">{article.excerpt}</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10">
                  {tenant.profile_photo_url ? <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" /> : contactName.charAt(0)}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f4c400]">Asesor inmobiliario</p>
                  <p className="truncate text-xl font-semibold">{contactName}</p>
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">{article.target_audience}</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{article.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-200">{article.excerpt}</p>
            </div>
          )}
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className={`mb-6 flex flex-wrap items-center gap-3 text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <span>{formatDate(article.published_at)}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
              <span>{tenantName}</span>
            </div>
            {video?.embed_url ? (
              <section className={`mb-8 overflow-hidden rounded-lg border ${panelClass}`}>
                <iframe src={video.embed_url} title={video.title} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full" />
              </section>
            ) : null}
            <div className={`rounded-lg border p-6 sm:p-8 ${panelClass}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="mb-4 mt-9 text-2xl font-semibold tracking-tight">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-3 mt-7 text-xl font-semibold">{children}</h3>,
                  p: ({ children }) => <p className={`mb-5 text-base leading-8 ${proseTextClass}`}>{children}</p>,
                  ul: ({ children }) => <ul className={`mb-6 list-disc space-y-2 pl-5 ${proseTextClass}`}>{children}</ul>,
                  ol: ({ children }) => <ol className={`mb-6 list-decimal space-y-2 pl-5 ${proseTextClass}`}>{children}</ol>,
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                  a: ({ children, href }) => <a href={href || '#'} className={`font-semibold underline underline-offset-4 ${accentClass}`}>{children}</a>,
                  blockquote: ({ children }) => <blockquote className={`mb-6 border-l-4 px-5 py-4 ${isLight ? 'border-cyan-500 bg-cyan-50 text-zinc-700' : 'border-[#f4c400] bg-white/5 text-zinc-200'}`}>{children}</blockquote>,
                }}
              >
                {article.body || ''}
              </ReactMarkdown>
            </div>

            {(article.faq || []).length > 0 ? (
              <section className={`mt-8 rounded-lg border p-6 sm:p-8 ${panelClass}`}>
                <h2 className="text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2>
                <div className={`mt-5 divide-y ${isLight ? 'divide-zinc-200' : 'divide-white/10'}`}>
                  {(article.faq || []).map((item, index) => (
                    <div key={`${item.question || 'faq'}-${index}`} className="py-5">
                      <h3 className="font-semibold">{item.question}</h3>
                      <p className={`mt-2 leading-7 ${mutedClass}`}>{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className={`rounded-lg border p-5 ${panelClass}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ${isLight ? 'bg-zinc-100' : 'bg-white/10'}`}>
                  {tenant.profile_photo_url ? <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" /> : contactName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{contactName}</p>
                  <p className={`truncate text-sm ${mutedClass}`}>{tenantName}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-500">WhatsApp</a> : null}
                {tenant.email ? <a href={`mailto:${tenant.email}`} className={`rounded-lg border px-4 py-3 text-center text-sm font-semibold transition ${pillClass}`}>Email</a> : null}
                {tenant.vcard_url ? <a href={tenant.vcard_url} target="_blank" rel="noreferrer" className={`rounded-lg border px-4 py-3 text-center text-sm font-semibold transition ${pillClass}`}>E-Card</a> : null}
              </div>
            </section>
            <section className={`rounded-lg border p-5 ${panelClass}`}>
              <h2 className="text-lg font-semibold">Consultar por esta nota</h2>
              <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>Dejá tus datos y te contactamos con asesoramiento personalizado.</p>
              <div className="mt-4">
                <BlogLeadForm
                  backendUrl={BACKEND_URL}
                  tenantSlug={tenant.slug}
                  articleSlug={article.slug}
                  referralCode={referralCode}
                  contentFormat={article.content_format}
                  campaignQueryString={campaignQueryString}
                  theme={theme}
                />
              </div>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}
