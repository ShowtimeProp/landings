import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PortfolioWidgetGuard from '@/components/PortfolioWidgetGuard';
import PortfolioPropertyCard from '@/components/PortfolioPropertyCard';
import ShareRail from '@/components/ShareRail';
import { TenantSocialLinks } from '@/components/social-links';
import QRCode from 'qrcode';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const LANDINGS_URL =
  process.env.NEXT_PUBLIC_LANDINGS_URL || process.env.LANDINGS_URL || 'https://landings.showtimeprop.com';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  tenant_name?: string | null;
  realtor_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  social_links?: Record<string, string> | null;
  martillero_responsable?: string | null;
  martillero_registro?: string | null;
  vcard_slug?: string | null;
  vcard_url?: string | null;
  vcard_qr_data_url?: string | null;
};

type PropertyItem = {
  id: string;
  name: string;
  slug?: string | null;
  property_type?: string | null;
  operation_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  expenses_amount?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  total_units?: number | null;
  price?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  tour_virtual_url?: string | null;
  images?: unknown[];
};

type ApiResponse = {
  status: 'ok';
  tenant: Tenant;
  properties: PropertyItem[];
};

type PlaceReviewsResponse = {
  rating: number | null;
  reviews: {
    author_name?: string;
    rating?: number;
    text?: string;
    relative_time_description?: string;
  }[];
  user_ratings_total: number;
  open_now?: boolean | null;
  opening_hours?: string[];
  config?: {
    has_google_place_id?: boolean;
    has_google_api_key?: boolean;
    reason?: string;
  };
};

type PortfolioTheme = 'dark' | 'soft' | 'light';
const LEGAL_DISCLAIMER =
  '📄 Disclaimer Showtime Prop no ejerce el corretaje inmobiliario. El presente sitio web es una plataforma tecnológica de marketing inmobiliario donde inmobiliarias, desarrolladoras y agentes independientes pueden promocionar propiedades y gestionar consultas mediante herramientas digitales y sistemas basados en inteligencia artificial. Cada cliente es de propiedad y gestión independiente, por lo que Showtime Prop: no interviene en los datos de las publicaciones, no participa en operaciones inmobiliarias, no interviene en la negociación, reserva, boleto de compraventa, escritura ni contratos de alquiler. En cumplimiento de la normativa vigente, todas las operaciones inmobiliarias son realizadas exclusivamente por el corredor público inmobiliario matriculado responsable de cada propiedad, cuyos datos deben ser consultados directamente. La información publicada (incluyendo medidas, características, precios, expensas, servicios e impuestos) es provista por terceros, pudiendo estar sujeta a modificaciones y tener carácter orientativo.';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Departamento',
  house: 'Casa',
  ph: 'PH',
  local: 'Local',
  land: 'Terreno',
  garage: 'Cochera',
  project: 'Proyecto: Inversión del Pozo',
  proyecto: 'Proyecto: Inversión del Pozo',
  desarrollo: 'Proyecto: Inversión del Pozo',
  inversion_pozo: 'Proyecto: Inversión del Pozo',
  inversion_en_pozo: 'Proyecto: Inversión del Pozo',
  other: 'Otro',
};

const OPERATION_LABELS: Record<string, string> = {
  sale: 'Venta',
  rent: 'Alquiler',
  rent_short_term: 'Alquiler temporal',
  rent_long_term: 'Alquiler largo plazo',
  both: 'Venta y alquiler',
};

async function fetchPortfolio(tenantSlug: string): Promise<ApiResponse | null> {
  const url = `${BACKEND_URL}/api/properties/public/portfolio?tenant_slug=${encodeURIComponent(tenantSlug)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const data = (await res.json()) as ApiResponse;
  if (!data?.tenant?.slug || !Array.isArray(data?.properties)) return null;
  return data;
}

async function fetchPlaceReviews(tenantSlug: string): Promise<PlaceReviewsResponse | null> {
  const url = `${BACKEND_URL}/api/properties/public/place-reviews?tenant_slug=${encodeURIComponent(tenantSlug)}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as PlaceReviewsResponse;
  if (!data || typeof data !== 'object') return null;
  return data;
}

function normalizeLabel(raw: string | null | undefined, dictionary: Record<string, string>): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  return dictionary[lower] || value;
}

function normalizeTheme(raw: string | null | undefined): PortfolioTheme {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'light') return 'light';
  if (value === 'soft' || value === 'neutral' || value === 'mid') return 'soft';
  return 'dark';
}

function getWhatsappUrl(phone?: string | null, tenantName?: string): string | null {
  const digits = (phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const message = encodeURIComponent(`Hola ${tenantName || ''}, vi tu portfolio y me interesa una propiedad.`);
  return `https://wa.me/${digits}?text=${message}`;
}

function getImageUrl(img: unknown): string {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (typeof img === 'object' && img !== null && 'url' in (img as Record<string, unknown>)) {
    const value = (img as { url?: unknown }).url;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

function pickPortfolioImage(data: ApiResponse): string | null {
  for (const property of data.properties || []) {
    const image = (property.images || []).map(getImageUrl).find(Boolean);
    if (image) return image;
  }
  return data.tenant.logo_url || data.tenant.profile_photo_url || null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}): Promise<Metadata> {
  const { tenant_slug } = await params;
  const data = await fetchPortfolio(tenant_slug);
  if (!data) {
    return { title: 'Portfolio no encontrado | ShowtimeProp' };
  }
  const title = `Portfolio | ${data.tenant.name}`;
  const description = `Propiedades de ${data.tenant.name}`;
  const canonicalUrl = `${LANDINGS_URL}/p/${tenant_slug}`;
  const ogImage = pickPortfolioImage(data);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonicalUrl,
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function PortfolioPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant_slug: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { tenant_slug } = await params;
  const { theme: themeParam } = await searchParams;
  const data = await fetchPortfolio(tenant_slug);
  if (!data) notFound();
  const placeReviews = await fetchPlaceReviews(tenant_slug);

  const { tenant, properties } = data;
  const toursCount = properties.filter((item) => (item.tour_virtual_url || '').trim()).length;
  const whatsappUrl = getWhatsappUrl(tenant.whatsapp, tenant.tenant_name || tenant.name);
  const contactName =
    String(tenant.realtor_name || '').trim() ||
    String(tenant.tenant_name || '').trim() ||
    tenant.name;
  const vcardUrlFromApi = String(tenant.vcard_url || '').trim().replace(
    /\/vcard\/([^/?#]+)\.vcf(?=$|[?#])/i,
    '/vcard/$1'
  );
  const vcardUrl = vcardUrlFromApi || (tenant.vcard_slug ? `/vcard/${tenant.vcard_slug}` : '');
  let portfolioVcardQrDataUrl = '';
  if (vcardUrl) {
    try {
      portfolioVcardQrDataUrl = await QRCode.toDataURL(vcardUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 320,
        color: {
          dark: '#0f172a',
          light: '#ffffffff',
        },
      });
    } catch {
      portfolioVcardQrDataUrl = String(tenant.vcard_qr_data_url || '').trim();
    }
  }
  const hasReviewsContent = Boolean(
    placeReviews &&
      (placeReviews.rating != null ||
        (placeReviews.reviews && placeReviews.reviews.length > 0) ||
        (placeReviews.opening_hours && placeReviews.opening_hours.length > 0))
  );
  const theme = normalizeTheme(themeParam);
  const isLight = theme === 'light';
  const isSoft = theme === 'soft';
  const rootClass = isLight
    ? 'bg-zinc-50 text-zinc-900'
    : isSoft
    ? 'bg-slate-900 text-zinc-100'
    : 'bg-[#07090d] text-zinc-100';
  const overlayClass = isLight
    ? 'bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_86%_10%,rgba(244,114,182,0.07),transparent_36%),radial-gradient(circle_at_50%_85%,rgba(14,165,233,0.06),transparent_48%)]'
    : isSoft
    ? 'bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.12),transparent_40%),radial-gradient(circle_at_86%_10%,rgba(244,114,182,0.08),transparent_35%),radial-gradient(circle_at_50%_85%,rgba(14,165,233,0.07),transparent_48%)]'
    : 'bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.14),transparent_38%),radial-gradient(circle_at_86%_10%,rgba(244,114,182,0.10),transparent_33%),radial-gradient(circle_at_50%_85%,rgba(14,165,233,0.08),transparent_45%)]';
  const headerClass = isLight
    ? 'border-zinc-200 bg-white/85'
    : isSoft
    ? 'border-white/10 bg-slate-950/40'
    : 'border-white/10 bg-black/30';
  const headerBadgeClass = isLight
    ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
    : 'border-white/20 bg-white/5 text-zinc-200';
  const heroClass = isLight
    ? 'border-zinc-200 bg-gradient-to-br from-white via-zinc-100 to-zinc-200 shadow-[0_20px_50px_rgba(15,23,42,0.12)]'
    : isSoft
    ? 'border-white/15 bg-gradient-to-br from-slate-800/95 via-slate-900/88 to-slate-950/80 shadow-[0_20px_60px_rgba(0,0,0,0.35)]'
    : 'border-white/15 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-950/70 shadow-[0_20px_65px_rgba(0,0,0,0.45)]';
  const sectionClass = isLight
    ? 'border-zinc-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.10)]'
    : 'border-white/10 bg-zinc-900/70 shadow-[0_12px_35px_rgba(0,0,0,0.28)]';
  const cardClass = isLight
    ? 'border-zinc-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.10)] hover:border-cyan-300/70 hover:shadow-[0_16px_42px_rgba(56,189,248,0.20)]'
    : 'border-white/10 bg-zinc-900/70 shadow-[0_12px_35px_rgba(0,0,0,0.28)] hover:border-cyan-300/35 hover:shadow-[0_16px_45px_rgba(34,211,238,0.18)]';
  const subtleTextClass = isLight ? 'text-zinc-600' : 'text-zinc-300';
  const titleTextClass = isLight ? 'text-zinc-900' : 'text-zinc-100';
  const badgeBaseClass = isLight
    ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
    : 'border-white/15 bg-white/5 text-zinc-200';
  const emailButtonClass = isLight
    ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
    : 'border-white/20 bg-white/5 text-zinc-100 hover:bg-white/10';
  const themeHref = (nextTheme: PortfolioTheme) => `/p/${tenant.slug}?theme=${nextTheme}`;

  return (
    <div className={`min-h-screen ${rootClass}`}>
      <PortfolioWidgetGuard />
      <ShareRail themeMode={theme} shareTitle={`Portfolio de ${tenant.name}`} />
      <div className={`pointer-events-none fixed inset-0 -z-10 ${overlayClass}`} />

      <header className={`border-b backdrop-blur-md ${headerClass}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ${
                isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/20 bg-white/5'
              }`}
            >
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt={tenant.name} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-sm font-semibold">{tenant.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Portfolio</p>
              <p className="text-sm font-semibold">{tenant.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav
              className={`flex items-center gap-1 rounded-full p-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/15 bg-white/5'
              }`}
            >
              <Link
                href={themeHref('light')}
                className={`rounded-full px-2.5 py-1 transition ${theme === 'light' ? 'bg-white text-zinc-800 shadow-sm' : isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'}`}
              >
                Light
              </Link>
              <Link
                href={themeHref('soft')}
                className={`rounded-full px-2.5 py-1 transition ${theme === 'soft' ? 'bg-white text-zinc-800 shadow-sm' : isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'}`}
              >
                Soft
              </Link>
              <Link
                href={themeHref('dark')}
                className={`rounded-full px-2.5 py-1 transition ${theme === 'dark' ? 'bg-white text-zinc-800 shadow-sm' : isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-300 hover:text-zinc-100'}`}
              >
                Dark
              </Link>
            </nav>
            <span className={`rounded-full border px-3 py-1 text-xs ${headerBadgeClass}`}>
              {properties.length} propiedades
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        <section className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 ${heroClass}`}>
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="relative z-10 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-cyan-700' : 'text-cyan-200/80'}`}>Colección activa</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{tenant.name}</h1>
              <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${subtleTextClass}`}>
                Explorá las propiedades disponibles con ficha rápida. Para una conversación completa con IA,
                ingresá en cada propiedad.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeBaseClass}`}>
                  {properties.length} publicaciones
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeBaseClass}`}>
                  {toursCount} tours virtuales
                </span>
                {toursCount >= 3 && (
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
                    Portfolio premium activo
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div
                className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-full ${
                  isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/20 bg-white/5'
                }`}
              >
                {tenant.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{contactName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-2">
                <p className={`text-sm font-medium ${titleTextClass}`}>Asesor: {contactName}</p>
                <div className="flex flex-wrap gap-2">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      WhatsApp
                    </a>
                  )}
                  {tenant.email && (
                    <a
                      href={`mailto:${tenant.email}`}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${emailButtonClass}`}
                    >
                      Email
                    </a>
                  )}
                </div>
                <TenantSocialLinks links={tenant.social_links} themeMode={theme} className="pt-1" />
              </div>
              {vcardUrl && (
                <a
                  href={vcardUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Agenda mis datos"
                  className={`group inline-flex flex-col items-center rounded-xl border p-1.5 transition ${
                    isLight
                      ? 'border-cyan-300/80 bg-cyan-50/90 hover:border-cyan-400 hover:bg-cyan-100'
                      : 'border-cyan-300/35 bg-cyan-400/10 hover:border-cyan-300/60 hover:bg-cyan-300/15'
                  }`}
                >
                  {portfolioVcardQrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={portfolioVcardQrDataUrl}
                      alt="QR Agenda mis datos"
                      className="h-20 w-20 rounded-lg bg-white p-1 object-contain shadow-[0_8px_20px_rgba(0,0,0,0.16)]"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white text-[10px] text-zinc-500">
                      E-Card
                    </div>
                  )}
                </a>
              )}
            </div>
          </div>
        </section>

        {hasReviewsContent && placeReviews && (
          <section className={`mt-6 rounded-2xl border p-5 sm:p-6 ${sectionClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Opiniones en Google</h2>
              {placeReviews.rating != null && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{placeReviews.rating.toFixed(1)}</span>
                  <span className="text-amber-300">
                    {'★'.repeat(Math.max(0, Math.min(5, Math.round(placeReviews.rating))))}
                    {'☆'.repeat(Math.max(0, 5 - Math.round(placeReviews.rating)))}
                  </span>
                  {placeReviews.user_ratings_total > 0 && (
                    <span className={`text-sm ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>({placeReviews.user_ratings_total})</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {typeof placeReviews.open_now === 'boolean' && (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                    placeReviews.open_now
                      ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-200'
                      : 'border-zinc-300/25 bg-zinc-400/10 text-zinc-300'
                  }`}
                >
                  {placeReviews.open_now ? 'Abierto ahora' : 'Cerrado ahora'}
                </span>
              )}
              {placeReviews.opening_hours && placeReviews.opening_hours.length > 0 && (
                <span className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{placeReviews.opening_hours[0]}</span>
              )}
            </div>

            {placeReviews.reviews && placeReviews.reviews.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {placeReviews.reviews.slice(0, 2).map((review, idx) => (
                  <article
                    key={`${review.author_name || 'review'}-${idx}`}
                    className={`rounded-xl border p-3 ${
                      isLight ? 'border-zinc-200 bg-zinc-50' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <p className={`text-sm font-medium ${titleTextClass}`}>{review.author_name || 'Cliente'}</p>
                      {review.rating != null && (
                        <span className="text-xs text-amber-300">
                          {'★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))}
                          {'☆'.repeat(Math.max(0, 5 - Math.round(review.rating)))}
                        </span>
                      )}
                    </div>
                    {review.text && (
                      <p className={`line-clamp-3 text-sm leading-relaxed ${subtleTextClass}`}>{review.text}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section id="portfolio-grid" className="mt-8">
          {properties.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center">
              <p className="text-zinc-300">No hay propiedades publicadas por el momento.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((item) => {
                const propertyType = normalizeLabel(item.property_type, PROPERTY_TYPE_LABELS);
                const operationType = normalizeLabel(item.operation_type, OPERATION_LABELS);

                return (
                  <PortfolioPropertyCard
                    key={item.id}
                    tenantSlug={tenant.slug}
                    item={item}
                    theme={theme}
                    isLight={isLight}
                    cardClass={cardClass}
                    titleTextClass={titleTextClass}
                    badgeBaseClass={badgeBaseClass}
                    propertyType={propertyType}
                    operationType={operationType}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className={`mt-10 border-t pt-4 ${isLight ? 'border-zinc-200' : 'border-white/10'}`}>
          <p className={`text-[10px] leading-relaxed ${isLight ? 'text-zinc-500' : 'text-zinc-500'}`}>
            {LEGAL_DISCLAIMER}
          </p>
        </section>

        <footer
          className={`mt-8 border-t pt-6 text-center text-xs ${
            isLight ? 'border-zinc-200 text-zinc-600' : 'border-white/10 text-zinc-400'
          }`}
        >
          <p>
            Todos los derechos reservados Showtime Prop - Especialistas en Marketing Inmobiliario e
            Inteligencia Artificial.{' '}
            <a
              href="https://showtimeprop.com"
              target="_blank"
              rel="noreferrer"
              className={`font-semibold underline ${isLight ? 'text-zinc-700' : 'text-zinc-200'}`}
            >
              showtimeprop.com
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
