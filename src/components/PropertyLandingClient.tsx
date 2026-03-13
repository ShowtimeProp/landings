'use client';

import { useState, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

type Property = {
  id: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  tour_virtual_url?: string | null;
  widget_mode?: string | null;
  widget_config?: WidgetConfig | null;
  images?: (string | { url?: string })[];
  address?: Record<string, unknown> | null;
  property_type?: string | null;
  operation_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  price?: number | null;
  currency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  floor_plan_url?: string | null;
  video_url?: string | null;
};

type WidgetConfig = {
  orb_variant?: string;
  position?: string;
  tooltip_text?: string;
  primary_color?: string;
  secondary_color?: string;
  auto_disconnect_timeout?: number;
  lang?: string;
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  google_place_id?: string | null;
  google_calendar_connected?: boolean;
};

declare global {
  interface Window {
    initAssistantWidget?: (options: Record<string, unknown>) => void;
  }
}

const OPERATION_LABELS: Record<string, string> = {
  sale: 'VENTA',
  rent: 'ALQUILER',
  rent_short_term: 'ALQUILER TEMPORARIO',
  rent_long_term: 'ALQUILER LARGO PLAZO',
  both: 'VENTA Y ALQUILER',
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

function getImageUrl(img: string | { url?: string }): string {
  return typeof img === 'string' ? img : img?.url ?? '';
}

function cloudinaryThumb(url: string): string {
  if (!url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) return url.replace('/upload/', '/upload/w_400,h_300,c_fill/');
  return url;
}

function cloudinaryLarge(url: string): string {
  if (!url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) return url.replace('/upload/', '/upload/w_1200,f_auto,q_auto/');
  return url;
}

const DISCLAIMER =
  'La información gráfica, escrita e imágenes en el presente aviso son ilustrativas y a título estimativo. Las mismas no forman parte de ningún tipo de documentación contractual. Las medidas y superficies definitivas surgirán del título de propiedad del inmueble referido.';

function getInitialDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem('landing-theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
  } catch {
    // ignore localStorage errors
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function PropertyLandingClient({
  tenant,
  property,
  whatsappUrl,
}: {
  tenant: Tenant;
  property: Property;
  whatsappUrl: string;
}) {
  const [dark, setDark] = useState<boolean>(() => getInitialDarkMode());
  const [scrolled, setScrolled] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [reviews, setReviews] = useState<{
    rating: number | null;
    reviews: { author_name?: string; rating?: number; text?: string; relative_time_description?: string }[];
    user_ratings_total: number;
  } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('landing-theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (!tenant.google_place_id || !tenant.slug) return;
    fetch(
      `${BACKEND_URL}/api/properties/public/place-reviews?tenant_slug=${encodeURIComponent(tenant.slug)}`
    )
      .then((r) => r.json())
      .then(setReviews)
      .catch(() => setReviews(null));
  }, [tenant.google_place_id, tenant.slug]);

  useEffect(() => {
    if (!tenant.id || !property.id) return;
    const vid = (() => {
      try {
        let v = localStorage.getItem('sp-visitor-id');
        if (!v) {
          v = crypto.randomUUID?.() ?? `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          localStorage.setItem('sp-visitor-id', v);
        }
        return v;
      } catch {
        return undefined;
      }
    })();
    fetch(`${BACKEND_URL}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'property_view',
        tenant_id: tenant.id,
        property_id: property.id,
        visitor_id: vid,
        page_url: typeof window !== 'undefined' ? window.location.href : undefined,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      }),
    }).catch(() => {});
  }, [tenant.id, property.id]);

  const widgetMode = (property.widget_mode || 'auto').toLowerCase();
  const hasTourVirtual = Boolean(property.tour_virtual_url);
  const shouldRenderLandingWidget =
    widgetMode === 'landing_only' || (widgetMode === 'auto' && !hasTourVirtual);

  const images = (property.images || [])
    .map(getImageUrl)
    .filter(Boolean) as string[];

  const opLabel =
    OPERATION_LABELS[property.operation_type || ''] ||
    (property.operation_type || '').toUpperCase();
  const propType =
    PROPERTY_TYPE_LABELS[property.property_type || ''] ||
    property.property_type ||
    'Propiedad';

  const addr = property.address as Record<string, string> | undefined;
  const addressStr =
    property.name ||
    [addr?.street, addr?.city].filter(Boolean).join(', ') ||
    '';

  const presentationText = `La oficina virtual de ${tenant.name} comercializa ${propType.toLowerCase()} en ${addr?.city || 'la zona'}. Descubrí cada detalle en su visita virtual y viví una experiencia única.`;

  useEffect(() => {
    if (!tenant.id || !property.id) return;

    if (!shouldRenderLandingWidget) {
      document.getElementById('sp-assistant-widget')?.remove();
      return;
    }

    const widgetCssId = 'sp-assistant-widget-css';
    const widgetScriptId = 'sp-assistant-widget-script';
    let cancelled = false;

    const widgetConfig = property.widget_config || {};

    const initWidget = () => {
      if (cancelled) return;
      if (typeof window.initAssistantWidget !== 'function') return;
      if (document.getElementById('sp-assistant-widget')) return;

      window.initAssistantWidget({
        tokenEndpoint: `${BACKEND_URL}/api/livekit/token`,
        backendApiUrl: BACKEND_URL,
        tenantId: tenant.id,
        propertyId: property.id,
        source: 'landing_page',
        lang: widgetConfig.lang || 'es',
        position: widgetConfig.position || 'bottom-right',
        orbVariant: widgetConfig.orb_variant || 'classic',
        tooltipText: widgetConfig.tooltip_text || '¿Necesitás ayuda?',
        primaryColor: widgetConfig.primary_color || '',
        secondaryColor: widgetConfig.secondary_color || '',
        autoDisconnectTimeout:
          typeof widgetConfig.auto_disconnect_timeout === 'number'
            ? widgetConfig.auto_disconnect_timeout
            : 300000,
      });
    };

    if (!document.getElementById(widgetCssId)) {
      const css = document.createElement('link');
      css.id = widgetCssId;
      css.rel = 'stylesheet';
      css.href = `${BACKEND_URL}/static/widget/assistant-widget.css`;
      document.head.appendChild(css);
    }

    const existingScript = document.getElementById(widgetScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.initAssistantWidget) {
        initWidget();
      } else {
        existingScript.addEventListener('load', initWidget, { once: true });
      }
    } else {
      const script = document.createElement('script');
      script.id = widgetScriptId;
      script.src = `${BACKEND_URL}/static/widget/assistant-widget.js`;
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [tenant.id, property.id, property.widget_config, shouldRenderLandingWidget]);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        dark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
      }`}
    >
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? dark
              ? 'bg-zinc-950/95 backdrop-blur'
              : 'bg-white/95 backdrop-blur'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <img
              src="/showtime-logo.png"
              alt="Showtime Prop"
              className="h-7 w-7 object-contain"
            />
            <span>Showtime Prop</span>
          </a>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleDark}
              className="rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Modo oscuro"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {dark ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Menú"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-14">
        {property.tour_virtual_url ? (
          <section className="relative w-full" style={{ height: '72vh' }}>
            <iframe
              src={property.tour_virtual_url}
              title={`Tour virtual - ${property.name}`}
              className="h-full w-full border-0"
              allow="fullscreen; autoplay; clipboard-write"
            />
          </section>
        ) : images.length > 0 ? (
          <section className="relative h-[50vh] w-full overflow-hidden">
            <img
              src={cloudinaryLarge(images[0])}
              alt={property.name}
              className="h-full w-full object-cover"
            />
          </section>
        ) : null}

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="mb-6 inline-block rounded bg-black px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black">
            {opLabel}
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            {addressStr}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {presentationText}
          </p>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
            {DISCLAIMER}
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <InfoCard
              icon="type"
              label="TIPO"
              value={propType}
              dark={dark}
            />
            {property.ambientes != null && (
              <InfoCard
                icon="rooms"
                label="AMBIENTES"
                value={String(property.ambientes)}
                dark={dark}
              />
            )}
            {property.bedrooms != null && (
              <InfoCard
                icon="bed"
                label="DORMITORIOS"
                value={String(property.bedrooms)}
                dark={dark}
              />
            )}
            {property.bathrooms != null && (
              <InfoCard
                icon="bath"
                label="BAÑOS"
                value={String(property.bathrooms)}
                dark={dark}
              />
            )}
            {property.area_sqm != null && (
              <InfoCard
                icon="area"
                label="SUPERFICIE"
                value={`${property.area_sqm} m²`}
                dark={dark}
              />
            )}
            {property.price != null && (
              <InfoCard
                icon="price"
                label="PRECIO"
                value={`${property.currency || 'USD'} ${property.price.toLocaleString('es-AR')}`}
                dark={dark}
              />
            )}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white transition hover:bg-green-700"
              >
                Consultar por WhatsApp
              </a>
            )}
            {tenant.email && (
              <a
                href={`mailto:${tenant.email}`}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-5 py-2.5 font-medium transition hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                Enviar email
              </a>
            )}
          </div>
        </section>

        {images.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Galería</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setGalleryIndex(i)}
                  className="aspect-[4/3] overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <img
                    src={cloudinaryThumb(url)}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover transition hover:scale-105"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {galleryIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setGalleryIndex(null)}
            onKeyDown={(e) => e.key === 'Escape' && setGalleryIndex(null)}
            role="button"
            tabIndex={0}
          >
            <button
              type="button"
              onClick={() => setGalleryIndex(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={cloudinaryLarge(images[galleryIndex])}
              alt={`Foto ${galleryIndex + 1}`}
              className="max-h-[90vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {property.floor_plan_url && (
          <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Plano</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              <img
                src={property.floor_plan_url}
                alt="Plano de la propiedad"
                className="w-full"
              />
            </div>
          </section>
        )}

        {property.latitude != null && property.longitude != null && (
          <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Ubicación</h2>
            <div className="aspect-video overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
              <iframe
                title="Mapa"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${property.longitude - 0.01}%2C${property.latitude - 0.01}%2C${property.longitude + 0.01}%2C${property.latitude + 0.01}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                className="h-full w-full border-0"
              />
            </div>
            <a
              href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-zinc-600 underline dark:text-zinc-400"
            >
              Ver en Google Maps
            </a>
          </section>
        )}

        {property.video_url && (
          <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Video</h2>
            <div className="aspect-video overflow-hidden rounded-xl">
              <VideoEmbed url={property.video_url} />
            </div>
          </section>
        )}

        {reviews && (reviews.rating != null || reviews.reviews.length > 0) && (
          <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
            <h2 className="mb-6 text-2xl font-bold">Opiniones en Google</h2>
            <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-700">
              {reviews.rating != null && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-2xl font-bold">{reviews.rating.toFixed(1)}</span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i}>{i <= Math.round(reviews.rating!) ? '★' : '☆'}</span>
                    ))}
                  </div>
                  {reviews.user_ratings_total > 0 && (
                    <span className="text-sm text-zinc-500">
                      ({reviews.user_ratings_total} opiniones)
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-4">
                {reviews.reviews.map((r, i) => (
                  <div key={i} className="border-t border-zinc-200 pt-4 dark:border-zinc-700 first:border-0 first:pt-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{r.author_name}</span>
                      {r.rating != null && (
                        <span className="text-amber-400">
                          {'★'.repeat(Math.round(r.rating))}
                          {'☆'.repeat(5 - Math.round(r.rating))}
                        </span>
                      )}
                      {r.relative_time_description && (
                        <span className="text-xs text-zinc-500">{r.relative_time_description}</span>
                      )}
                    </div>
                    {r.text && <p className="text-sm text-zinc-600 dark:text-zinc-400">{r.text}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-700 sm:flex-row sm:items-center">
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="h-16 w-16 rounded-lg object-contain"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold">{tenant.name}</h3>
              {tenant.phone && (
                <a href={`tel:${tenant.phone}`} className="block text-sm text-zinc-600 dark:text-zinc-400">
                  {tenant.phone}
                </a>
              )}
              {tenant.email && (
                <a href={`mailto:${tenant.email}`} className="block text-sm text-zinc-600 dark:text-zinc-400">
                  {tenant.email}
                </a>
              )}
            </div>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white transition hover:bg-green-700"
              >
                WhatsApp
              </a>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  dark,
}: {
  icon: string;
  label: string;
  value: string;
  dark: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        dark ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-200 bg-zinc-50'
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}

function getYouTubeEmbedUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    let id = '';

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      id = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com' ||
      host.endsWith('.youtube-nocookie.com')
    ) {
      if (parsed.pathname === '/watch') {
        id = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        id = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        id = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/live/')) {
        id = parsed.pathname.split('/')[2] || '';
      }
    }

    if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

function VideoEmbed({ url }: { url: string }) {
  const ytEmbedUrl = getYouTubeEmbedUrl(url);
  if (ytEmbedUrl) {
    return (
      <iframe
        src={ytEmbedUrl}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    );
  }

  if (url.includes('iframe.mediadelivery.net')) {
    return (
      <iframe
        src={url}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full border-0"
      />
    );
  }

  if (url.includes('video.bunnycdn.com')) {
    return (
      <video src={url} controls className="h-full w-full">
        Tu navegador no soporta video.
      </video>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block h-full w-full bg-zinc-200 dark:bg-zinc-800">
      Ver video
    </a>
  );
}
