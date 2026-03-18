import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PortfolioWidgetGuard from '@/components/PortfolioWidgetGuard';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  tenant_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
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

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Departamento',
  house: 'Casa',
  ph: 'PH',
  local: 'Local',
  land: 'Terreno',
  garage: 'Cochera',
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

function getFirstImageUrl(images?: unknown[]): string | null {
  if (!images || images.length === 0) return null;
  const first = images[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'url' in first) {
    return (first as { url?: string }).url ?? null;
  }
  return null;
}

function cloudinaryCard(url: string): string {
  if (!url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/w_900,h_600,c_fill,f_auto,q_auto/');
  }
  return url;
}

function formatPrice(value?: number | null, currency?: string | null): string | null {
  if (value == null) return null;
  return `${currency || 'USD'} ${value.toLocaleString('es-AR')}`;
}

function getWhatsappUrl(phone?: string | null, tenantName?: string): string | null {
  const digits = (phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const message = encodeURIComponent(`Hola ${tenantName || ''}, vi tu portfolio y me interesa una propiedad.`);
  return `https://wa.me/${digits}?text=${message}`;
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
  return {
    title: `Portfolio | ${data.tenant.name}`,
    description: `Propiedades de ${data.tenant.name}`,
  };
}

function FeatureChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/85">
      {value} {label}
    </span>
  );
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ tenant_slug: string }>;
}) {
  const { tenant_slug } = await params;
  const data = await fetchPortfolio(tenant_slug);
  if (!data) notFound();
  const placeReviews = await fetchPlaceReviews(tenant_slug);

  const { tenant, properties } = data;
  const toursCount = properties.filter((item) => (item.tour_virtual_url || '').trim()).length;
  const whatsappUrl = getWhatsappUrl(tenant.whatsapp, tenant.tenant_name || tenant.name);
  const contactName = tenant.tenant_name || tenant.name;
  const hasReviewsContent = Boolean(
    placeReviews &&
      (placeReviews.rating != null ||
        (placeReviews.reviews && placeReviews.reviews.length > 0) ||
        (placeReviews.opening_hours && placeReviews.opening_hours.length > 0))
  );

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-100">
      <PortfolioWidgetGuard />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.14),transparent_38%),radial-gradient(circle_at_86%_10%,rgba(244,114,182,0.10),transparent_33%),radial-gradient(circle_at_50%_85%,rgba(14,165,233,0.08),transparent_45%)]" />

      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
              {tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logo_url} alt={tenant.name} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-sm font-semibold">{tenant.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Portfolio</p>
              <p className="text-sm font-semibold">{tenant.name}</p>
            </div>
          </div>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-zinc-200">
            {properties.length} propiedades
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-950/70 p-6 shadow-[0_20px_65px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="relative z-10 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Colección activa</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{tenant.name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                Explorá las propiedades disponibles con ficha rápida. Para una conversación completa con IA,
                ingresá en cada propiedad.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                  {properties.length} publicaciones
                </span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                  {toursCount} tours virtuales
                </span>
                {toursCount >= 3 && (
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-xs text-emerald-200">
                    Portfolio premium activo
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
                {tenant.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{contactName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-200">Asesor: {contactName}</p>
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
                      className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition hover:bg-white/10"
                    >
                      Email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {hasReviewsContent && placeReviews && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-[0_12px_35px_rgba(0,0,0,0.28)] sm:p-6">
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
                    <span className="text-sm text-zinc-400">({placeReviews.user_ratings_total})</span>
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
                <span className="text-xs text-zinc-400">{placeReviews.opening_hours[0]}</span>
              )}
            </div>

            {placeReviews.reviews && placeReviews.reviews.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {placeReviews.reviews.slice(0, 2).map((review, idx) => (
                  <article key={`${review.author_name || 'review'}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200">{review.author_name || 'Cliente'}</p>
                      {review.rating != null && (
                        <span className="text-xs text-amber-300">
                          {'★'.repeat(Math.max(0, Math.min(5, Math.round(review.rating))))}
                          {'☆'.repeat(Math.max(0, 5 - Math.round(review.rating)))}
                        </span>
                      )}
                    </div>
                    {review.text && (
                      <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300">{review.text}</p>
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
                const href = item.slug
                  ? `/p/${tenant.slug}/${item.slug}`
                  : `/p/${tenant.slug}/${item.id}`;
                const imgUrl = getFirstImageUrl(item.images);
                const cardImage = imgUrl ? cloudinaryCard(imgUrl) : null;
                const price = item.price_on_request
                  ? 'Consultar precio'
                  : formatPrice(item.price, item.currency);
                const propertyType = normalizeLabel(item.property_type, PROPERTY_TYPE_LABELS);
                const operationType = normalizeLabel(item.operation_type, OPERATION_LABELS);

                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-[0_12px_35px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1.5 hover:border-cyan-300/35 hover:shadow-[0_16px_45px_rgba(34,211,238,0.18)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-950">
                      {cardImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cardImage}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                          Sin imagen
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      {item.tour_virtual_url && (
                        <span className="absolute left-3 top-3 rounded-full border border-cyan-300/45 bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                          Tour 360
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-100">{item.name}</h2>

                      <div className="flex flex-wrap gap-2">
                        {propertyType && (
                          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
                            {propertyType}
                          </span>
                        )}
                        {operationType && (
                          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
                            {operationType}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.ambientes != null && <FeatureChip label="amb" value={item.ambientes} />}
                        {item.bedrooms != null && <FeatureChip label="dorm" value={item.bedrooms} />}
                        {item.bathrooms != null && <FeatureChip label="baños" value={item.bathrooms} />}
                        {item.area_sqm != null && <FeatureChip label="m²" value={Math.round(item.area_sqm)} />}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-base font-semibold text-zinc-100">{price || 'Precio a consultar'}</p>
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition group-hover:text-cyan-100">
                          Ver detalle
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
