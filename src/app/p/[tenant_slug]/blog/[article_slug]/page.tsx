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
  const campaignQueryString = buildCampaignQueryString(resolvedSearch, referralCode);
  const data = await fetchArticle(tenant_slug, article_slug, referralCode);
  if (!data?.article || !data.tenant) notFound();
  const { tenant, article } = data;
  const tenantName = tenant.tenant_name || tenant.name;
  const contactName = tenant.realtor_name || tenantName;
  const whatsappUrl = getWhatsappUrl(tenant.whatsapp, tenantName, article.title, campaignQueryString);
  const video = (article.media_assets || []).find((asset) => asset.embed_url && ['video_blog', 'shorts_pack'].includes(asset.asset_type));

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      {article.schema_org ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article.schema_org) }} /> : null}
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={`/p/${tenant.slug}/blog${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`} className="text-sm font-semibold text-zinc-700 hover:text-zinc-950">
            Blog Inmobiliario
          </Link>
          <Link href={`/p/${tenant.slug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`} className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold hover:bg-zinc-100">
            Portfolio
          </Link>
        </div>
      </header>

      <article>
        <section className="bg-zinc-950 text-white">
          {article.hero_image_url ? (
            <div className="relative min-h-[420px] overflow-hidden">
              <img src={article.hero_image_url} alt={article.title} className="absolute inset-0 h-full w-full object-cover opacity-72" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/55 to-zinc-950/10" />
              <div className="relative mx-auto flex min-h-[420px] max-w-5xl flex-col justify-end px-4 py-10 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">{article.target_audience}</p>
                <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{article.title}</h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-200">{article.excerpt}</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">{article.target_audience}</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">{article.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-200">{article.excerpt}</p>
            </div>
          )}
        </section>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span>{formatDate(article.published_at)}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-300" />
              <span>{tenantName}</span>
            </div>
            {video?.embed_url ? (
              <section className="mb-8 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <iframe src={video.embed_url} title={video.title} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full" />
              </section>
            ) : null}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="mb-4 mt-9 text-2xl font-semibold tracking-tight">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-3 mt-7 text-xl font-semibold">{children}</h3>,
                  p: ({ children }) => <p className="mb-5 text-base leading-8 text-zinc-700">{children}</p>,
                  ul: ({ children }) => <ul className="mb-6 list-disc space-y-2 pl-5 text-zinc-700">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-6 list-decimal space-y-2 pl-5 text-zinc-700">{children}</ol>,
                  li: ({ children }) => <li className="leading-7">{children}</li>,
                  a: ({ children, href }) => <a href={href || '#'} className="font-semibold text-cyan-700 underline underline-offset-4">{children}</a>,
                  blockquote: ({ children }) => <blockquote className="mb-6 border-l-4 border-cyan-500 bg-cyan-50 px-5 py-4 text-zinc-700">{children}</blockquote>,
                }}
              >
                {article.body || ''}
              </ReactMarkdown>
            </div>

            {(article.faq || []).length > 0 ? (
              <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-semibold tracking-tight">Preguntas frecuentes</h2>
                <div className="mt-5 divide-y divide-zinc-200">
                  {(article.faq || []).map((item, index) => (
                    <div key={`${item.question || 'faq'}-${index}`} className="py-5">
                      <h3 className="font-semibold">{item.question}</h3>
                      <p className="mt-2 leading-7 text-zinc-600">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
                  {tenant.profile_photo_url ? <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" /> : contactName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{contactName}</p>
                  <p className="truncate text-sm text-zinc-500">{tenantName}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-2">
                {whatsappUrl ? <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-green-500">WhatsApp</a> : null}
                {tenant.email ? <a href={`mailto:${tenant.email}`} className="rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-semibold hover:bg-zinc-100">Email</a> : null}
                {tenant.vcard_url ? <a href={tenant.vcard_url} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-200 px-4 py-3 text-center text-sm font-semibold hover:bg-zinc-100">E-Card</a> : null}
              </div>
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Consultar por esta nota</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">Dejá tus datos y te contactamos con asesoramiento personalizado.</p>
              <div className="mt-4">
                <BlogLeadForm
                  backendUrl={BACKEND_URL}
                  tenantSlug={tenant.slug}
                  articleSlug={article.slug}
                  referralCode={referralCode}
                  contentFormat={article.content_format}
                  campaignQueryString={campaignQueryString}
                />
              </div>
            </section>
          </aside>
        </div>
      </article>
    </main>
  );
}
