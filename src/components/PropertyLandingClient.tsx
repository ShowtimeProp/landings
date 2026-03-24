'use client';

import { useState, useEffect } from 'react';
import { createElement } from 'react';
import Script from 'next/script';
import ShareRail from '@/components/ShareRail';
import { TenantSocialLinks } from '@/components/social-links';
import QRCode from 'qrcode';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';
const WIDGET_ASSET_VERSION = 'livekit-orbs-v3-20260321';

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
  expenses_amount?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  total_units?: number | null;
  price?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  floor_plan_url?: string | null;
  video_url?: string | null;
};

type WidgetConfig = {
  visualizer_type?: string;
  orb_size?: number;
  position?: string;
  tooltip_text?: string;
  primary_color?: string;
  secondary_color?: string;
  auto_disconnect_timeout?: number;
  lang?: string;
  state_styles?: {
    connecting?: { hue?: number; shift?: number };
    listening?: { hue?: number; shift?: number };
    speaking?: { hue?: number; shift?: number };
    thinking?: { hue?: number; shift?: number };
  };
};

type Tenant = {
  id: string;
  name: string;
  slug: string;
  tenant_name?: string | null;
  realtor_name?: string | null;
  phone?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  logo_url?: string | null;
  social_links?: Record<string, string> | null;
  martillero_responsable?: string | null;
  martillero_registro?: string | null;
  vcard_slug?: string | null;
  vcard_url?: string | null;
  vcard_qr_data_url?: string | null;
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
  project: 'Proyecto: Inversión del Pozo',
  proyecto: 'Proyecto: Inversión del Pozo',
  desarrollo: 'Proyecto: Inversión del Pozo',
  inversion_pozo: 'Proyecto: Inversión del Pozo',
  inversion_en_pozo: 'Proyecto: Inversión del Pozo',
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
const LEGAL_DISCLAIMER =
  '📄 Disclaimer Showtime Prop no ejerce el corretaje inmobiliario. El presente sitio web es una plataforma tecnológica de marketing inmobiliario donde inmobiliarias, desarrolladoras y agentes independientes pueden promocionar propiedades y gestionar consultas mediante herramientas digitales y sistemas basados en inteligencia artificial. Cada cliente es de propiedad y gestión independiente, por lo que Showtime Prop: no interviene en los datos de las publicaciones, no participa en operaciones inmobiliarias, no interviene en la negociación, reserva, boleto de compraventa, escritura ni contratos de alquiler. En cumplimiento de la normativa vigente, todas las operaciones inmobiliarias son realizadas exclusivamente por el corredor público inmobiliario matriculado responsable de cada propiedad, cuyos datos deben ser consultados directamente. La información publicada (incluyendo medidas, características, precios, expensas, servicios e impuestos) es provista por terceros, pudiendo estar sujeta a modificaciones y tener carácter orientativo.';

function safeAddressPart(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildAddressLine(address?: Record<string, unknown> | null): string {
  if (!address) return '';

  const street = safeAddressPart(address.street);
  const streetNumber =
    safeAddressPart(address.street_number) ||
    safeAddressPart(address.number) ||
    safeAddressPart(address.streetNumber);
  const city =
    safeAddressPart(address.city) ||
    safeAddressPart(address.locality);
  const state =
    safeAddressPart(address.state) ||
    safeAddressPart(address.province);
  const country = safeAddressPart(address.country);

  const streetLine = [street, streetNumber].filter(Boolean).join(' ');

  return [streetLine, city, state, country].filter(Boolean).join(', ');
}

type ThemeMode = 'light' | 'soft' | 'dark';

function normalizeThemeMode(raw: string | null | undefined): ThemeMode {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'light') return 'light';
  if (value === 'soft' || value === 'neutral' || value === 'mid') return 'soft';
  return 'dark';
}

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const storedMode = window.localStorage.getItem('landing-theme-mode');
    if (storedMode) return normalizeThemeMode(storedMode);
    const legacy = window.localStorage.getItem('landing-theme');
    if (legacy === 'dark') return 'dark';
    if (legacy === 'light') return 'light';
  } catch {
    // ignore localStorage errors
  }
  return 'dark';
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getInitialThemeMode());
  const [scrolled, setScrolled] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({});
  const [reviews, setReviews] = useState<{
    rating: number | null;
    reviews: { author_name?: string; rating?: number; text?: string; relative_time_description?: string }[];
    user_ratings_total: number;
    open_now?: boolean | null;
    opening_hours?: string[];
  } | null>(null);
  const [generatedVcardQrDataUrl, setGeneratedVcardQrDataUrl] = useState('');
  const [isGeneratingVcardQr, setIsGeneratingVcardQr] = useState(false);
  const isLight = themeMode === 'light';
  const isSoft = themeMode === 'soft';
  const isDark = themeMode === 'dark';
  const darkFamilyMode = !isLight;
  const interactiveCardClass =
    themeMode === 'light'
      ? 'border-zinc-200 bg-zinc-50 shadow-[0_10px_26px_rgba(15,23,42,0.06)] hover:border-cyan-400/35 hover:shadow-[0_0_22px_rgba(56,189,248,0.20)]'
      : themeMode === 'soft'
      ? 'border-slate-500/55 bg-slate-800/55 shadow-[0_10px_28px_rgba(2,6,23,0.30)] hover:border-cyan-300/45 hover:shadow-[0_0_26px_rgba(34,211,238,0.22)]'
      : 'border-zinc-700/95 bg-zinc-900/55 shadow-[0_12px_34px_rgba(0,0,0,0.44)] hover:border-cyan-400/45 hover:shadow-[0_0_30px_rgba(34,211,238,0.22)]';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cycleThemeMode = () => {
    const next: ThemeMode = isDark ? 'soft' : isSoft ? 'light' : 'dark';
    setThemeMode(next);
    localStorage.setItem('landing-theme-mode', next);
    localStorage.setItem('landing-theme', next === 'light' ? 'light' : 'dark');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkFamilyMode);
    document.documentElement.setAttribute('data-landing-theme', themeMode);
  }, [darkFamilyMode, themeMode]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal-id]'));
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute('data-reveal-id');
          if (!id) return;
          setRevealedSections((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

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
  const featuredImage = images[0] || null;
  const sideImages = images.slice(1, 3).map((url, offset) => ({ url, index: offset + 1 }));
  const remainingGalleryImages = images.slice(3).map((url, offset) => ({ url, index: offset + 3 }));
  const heroHasMedia = hasTourVirtual || images.length > 0;

  const opLabel =
    OPERATION_LABELS[property.operation_type || ''] ||
    (property.operation_type || '').toUpperCase();
  const rawPropertyType = String(property.property_type || '').trim();
  const propType =
    PROPERTY_TYPE_LABELS[rawPropertyType.toLowerCase()] ||
    rawPropertyType ||
    'Propiedad';

  const addr = property.address as Record<string, string> | undefined;
  const fullAddress = buildAddressLine(addr);
  const addressStr =
    property.name ||
    fullAddress ||
    '';
  const contactName =
    String(tenant.realtor_name || '').trim() ||
    String(tenant.tenant_name || '').trim() ||
    tenant.name;
  const businessName = String(tenant.name || '').trim();
  const martilleroName = String(tenant.martillero_responsable || '').trim();
  const martilleroReg = String(tenant.martillero_registro || '').trim();
  const vcardUrl = String(tenant.vcard_url || '').trim() || (tenant.vcard_slug ? `/vcard/${tenant.vcard_slug}.vcf` : '');
  const vcardQrDataUrl = String(tenant.vcard_qr_data_url || '').trim();
  const effectiveVcardQrDataUrl = vcardQrDataUrl || generatedVcardQrDataUrl;
  const areaSqsMin = typeof property.area_sqm_min === 'number' ? property.area_sqm_min : null;
  const areaSqsMax = typeof property.area_sqm_max === 'number' ? property.area_sqm_max : null;
  const areaRangeLabel =
    areaSqsMin != null && areaSqsMax != null
      ? `${areaSqsMin} - ${areaSqsMax} m²`
      : areaSqsMin != null
      ? `Desde ${areaSqsMin} m²`
      : areaSqsMax != null
      ? `Hasta ${areaSqsMax} m²`
      : null;
  const mapQuery =
    property.latitude != null && property.longitude != null
      ? `${property.latitude},${property.longitude}`
      : fullAddress;
  const googleMapsUrl = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}`
    : '';
  const googleMapsEmbedUrl = mapQuery
    ? `${googleMapsUrl}&z=17&output=embed`
    : '';

  const presentationText = `La oficina virtual de ${tenant.name} comercializa ${propType.toLowerCase()} en ${addr?.city || 'la zona'}. Descubrí cada detalle en su visita virtual y viví una experiencia única.`;
  const revealClass = (id: string) =>
    `transform transition-all duration-700 ease-out ${
      revealedSections[id] ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`;
  const galleryCount = images.length;

  useEffect(() => {
    if (vcardQrDataUrl || !vcardUrl) {
      setGeneratedVcardQrDataUrl('');
      setIsGeneratingVcardQr(false);
      return;
    }

    let cancelled = false;
    setIsGeneratingVcardQr(true);
    QRCode.toDataURL(vcardUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360,
      color: {
        dark: '#0f172a',
        light: '#ffffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setGeneratedVcardQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setGeneratedVcardQrDataUrl('');
      })
      .finally(() => {
        if (!cancelled) setIsGeneratingVcardQr(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vcardQrDataUrl, vcardUrl]);

  const goPrevImage = () => {
    if (galleryCount <= 1 || galleryIndex === null) return;
    setGalleryIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + galleryCount) % galleryCount;
    });
  };

  const goNextImage = () => {
    if (galleryCount <= 1 || galleryIndex === null) return;
    setGalleryIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % galleryCount;
    });
  };

  useEffect(() => {
    if (galleryIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGalleryIndex(null);
      if (e.key === 'ArrowLeft' && galleryCount > 1) {
        setGalleryIndex((prev) => {
          if (prev === null) return null;
          return (prev - 1 + galleryCount) % galleryCount;
        });
      }
      if (e.key === 'ArrowRight' && galleryCount > 1) {
        setGalleryIndex((prev) => {
          if (prev === null) return null;
          return (prev + 1) % galleryCount;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryIndex, galleryCount]);

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
        tokenEndpoint: `${BACKEND_URL}/api/assistant-ia/token`,
        backendApiUrl: BACKEND_URL,
        tenantId: tenant.id,
        propertyId: property.id,
        source: 'landing_page',
        lang: widgetConfig.lang || 'es',
        position: widgetConfig.position || 'bottom-right',
        visualizerType: widgetConfig.visualizer_type || 'grid',
        orbSize: typeof widgetConfig.orb_size === 'number' ? widgetConfig.orb_size : 112,
        tooltipText: widgetConfig.tooltip_text || '¿Necesitás ayuda?',
        primaryColor: widgetConfig.primary_color || '',
        secondaryColor: widgetConfig.secondary_color || '',
        stateStyles: widgetConfig.state_styles || undefined,
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
      css.href = `${BACKEND_URL}/static/widget/assistant-widget.css?v=${WIDGET_ASSET_VERSION}`;
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
      script.src = `${BACKEND_URL}/static/widget/assistant-widget.js?v=${WIDGET_ASSET_VERSION}`;
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
        isLight
          ? 'bg-white text-zinc-900'
          : isSoft
          ? 'bg-slate-900 text-zinc-100'
          : 'bg-zinc-950 text-zinc-100'
        }`}
    >
      <Script
        src="/vendor/lottie-player.js"
        strategy="afterInteractive"
      />
      <ShareRail themeMode={themeMode} shareTitle={`${property.name} | ${tenant.name}`} />

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? isLight
              ? 'bg-white/95 backdrop-blur'
              : isSoft
              ? 'bg-slate-900/88 backdrop-blur'
              : 'bg-zinc-950/95 backdrop-blur'
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
              onClick={cycleThemeMode}
              className="rounded-full p-2 transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Cambiar tema"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isDark ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                ) : isSoft ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v18m9-9H3m13.5-5.5l-9 11M7.5 6.5l9 11"
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
          <section className="relative min-h-[78svh] w-full overflow-hidden sm:min-h-[calc(100svh-3.5rem)]">
            <iframe
              src={property.tour_virtual_url}
              title={`Tour virtual - ${property.name}`}
              className="absolute inset-0 h-full w-full border-0"
              allow="fullscreen; autoplay; clipboard-write"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </section>
        ) : images.length > 0 ? (
          <section className="relative min-h-[78svh] w-full overflow-hidden sm:min-h-[calc(100svh-3.5rem)]">
            <img
              src={cloudinaryLarge(images[0])}
              alt={property.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45" />
          </section>
        ) : null}

        {heroHasMedia && (
          <div className="pointer-events-none relative z-10 -mt-24 flex justify-center px-4 sm:px-6">
            <a
              href="#property-overview"
              className="pointer-events-auto inline-flex min-h-[92px] min-w-[96px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/55 bg-black/32 px-4 py-3 text-white shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/70 hover:shadow-[0_20px_48px_rgba(0,0,0,0.62)]"
              aria-label="Ir al detalle de la propiedad"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/95">
                DESLIZAR
              </span>
              <span className="relative block h-9 w-9">
                {createElement('lottie-player', {
                  src: '/scroll-down.json',
                  background: 'transparent',
                  speed: '1',
                  loop: true,
                  autoplay: true,
                  class: 'h-9 w-9 opacity-95',
                  style: { pointerEvents: 'none' },
                  'aria-hidden': 'true',
                })}
              </span>
            </a>
          </div>
        )}

        <section
          id="property-overview"
          data-reveal-id="overview"
          className={`mx-auto max-w-4xl scroll-mt-24 px-4 py-12 sm:px-6 ${revealClass('overview')}`}
        >
          <div className="mb-6 inline-block rounded bg-black px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black">
            {opLabel}
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            {addressStr}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            {presentationText}
          </p>
          {fullAddress && (
            <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Dirección de referencia: {fullAddress}
            </p>
          )}

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <InfoCard
              icon="type"
              label="TIPO"
              value={propType}
              themeMode={themeMode}
            />
            {property.ambientes != null && (
              <InfoCard
                icon="rooms"
                label="AMBIENTES"
                value={String(property.ambientes)}
                themeMode={themeMode}
              />
            )}
            {property.bedrooms != null && (
              <InfoCard
                icon="bed"
                label="DORMITORIOS"
                value={String(property.bedrooms)}
                themeMode={themeMode}
              />
            )}
            {property.bathrooms != null && (
              <InfoCard
                icon="bath"
                label="BAÑOS"
                value={String(property.bathrooms)}
                themeMode={themeMode}
              />
            )}
            {areaRangeLabel ? (
              <InfoCard
                icon="area"
                label="SUPERFICIE"
                value={areaRangeLabel}
                themeMode={themeMode}
              />
            ) : property.area_sqm != null ? (
              <InfoCard
                icon="area"
                label="SUPERFICIE"
                value={`${property.area_sqm} m²`}
                themeMode={themeMode}
              />
            ) : null}
            {property.total_units != null && property.total_units > 0 && (
              <InfoCard
                icon="rooms"
                label="TOTAL UNIDADES"
                value={String(property.total_units)}
                themeMode={themeMode}
              />
            )}
            {property.expenses_amount != null && (
              <InfoCard
                icon="price"
                label="EXPENSAS"
                value={`${property.currency || 'USD'} ${property.expenses_amount.toLocaleString('es-AR')}`}
                themeMode={themeMode}
              />
            )}
            {(property.price_on_request || property.price != null) && (
              <InfoCard
                icon="price"
                label="PRECIO"
                value={
                  property.price_on_request
                    ? 'Consultar precio'
                    : `${property.currency || 'USD'} ${property.price!.toLocaleString('es-AR')}`
                }
                themeMode={themeMode}
              />
            )}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white shadow-[0_0_18px_rgba(34,197,94,0.30)] transition duration-300 hover:-translate-y-0.5 hover:bg-green-500 hover:shadow-[0_0_28px_rgba(34,197,94,0.50)]"
              >
                Consultar por WhatsApp
              </a>
            )}
            {tenant.email && (
              <a
                href={`mailto:${tenant.email}`}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100/80 px-5 py-2.5 font-medium text-zinc-900 shadow-[0_0_14px_rgba(148,163,184,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-zinc-950 hover:shadow-[0_0_24px_rgba(56,189,248,0.35)] dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
              >
                Enviar email
              </a>
            )}
          </div>
        </section>

        {images.length > 0 && (
          <section
            data-reveal-id="gallery"
            className={`mx-auto max-w-6xl px-4 py-12 sm:px-6 ${revealClass('gallery')}`}
          >
            <h2 className="mb-6 text-2xl font-bold">Galería</h2>
            <div className="space-y-3">
              {featuredImage && (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <button
                    type="button"
                    onClick={() => setGalleryIndex(0)}
                    className="group aspect-[4/3] overflow-hidden rounded-xl border border-transparent shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:hover:border-zinc-700 lg:aspect-auto lg:min-h-[26rem]"
                  >
                    <img
                      src={cloudinaryLarge(featuredImage)}
                      alt="Foto 1"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </button>
                  {sideImages.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      {sideImages.map(({ url, index }) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setGalleryIndex(index)}
                          className="group aspect-[4/3] overflow-hidden rounded-xl border border-transparent shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:hover:border-zinc-700"
                        >
                          <img
                            src={cloudinaryLarge(url)}
                            alt={`Foto ${index + 1}`}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {remainingGalleryImages.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {remainingGalleryImages.map(({ url, index }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setGalleryIndex(index)}
                      className="group aspect-[4/3] overflow-hidden rounded-xl border border-transparent shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:hover:border-zinc-700"
                    >
                      <img
                        src={cloudinaryThumb(url)}
                        alt={`Foto ${index + 1}`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {galleryIndex !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setGalleryIndex(null)}
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
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white transition hover:bg-white/30"
                  aria-label="Imagen anterior"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white transition hover:bg-white/30"
                  aria-label="Imagen siguiente"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            <div className="absolute bottom-5 rounded-full bg-black/55 px-3 py-1 text-sm text-white/90">
              {galleryIndex + 1} / {images.length}
            </div>
          </div>
        )}

        {property.floor_plan_url && (
          <section
            data-reveal-id="plan"
            className={`mx-auto max-w-4xl px-4 py-12 sm:px-6 ${revealClass('plan')}`}
          >
            <h2 className="mb-6 text-2xl font-bold">Plano</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 shadow-sm transition duration-300 hover:shadow-lg dark:border-zinc-700">
              <img
                src={property.floor_plan_url}
                alt="Plano de la propiedad"
                className="w-full"
              />
            </div>
          </section>
        )}

        {googleMapsEmbedUrl && (
          <section
            data-reveal-id="location"
            className={`mx-auto max-w-5xl px-4 py-12 sm:px-6 ${revealClass('location')}`}
          >
            <h2 className="mb-6 text-2xl font-bold">Ubicación</h2>
            <div
              className={`aspect-video overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-0.5 ${interactiveCardClass}`}
            >
              <iframe
                title="Mapa"
                src={googleMapsEmbedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              {fullAddress && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tomá esta dirección como punto de referencia geográfica.
                </p>
              )}
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-zinc-600 underline dark:text-zinc-400"
              >
                Ver en Google Maps
              </a>
            </div>
          </section>
        )}

        {property.video_url && (
          <section
            data-reveal-id="video"
            className={`mx-auto max-w-5xl px-4 py-12 sm:px-6 ${revealClass('video')}`}
          >
            <h2 className="mb-6 text-2xl font-bold">Video</h2>
            <div
              className={`aspect-video overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-0.5 ${interactiveCardClass}`}
            >
              <VideoEmbed url={property.video_url} />
            </div>
          </section>
        )}

        {reviews &&
          (reviews.rating != null ||
            reviews.reviews.length > 0 ||
            (reviews.opening_hours && reviews.opening_hours.length > 0)) && (
          <section
            data-reveal-id="reviews"
            className={`mx-auto max-w-4xl px-4 py-12 sm:px-6 ${revealClass('reviews')}`}
          >
            <h2 className="mb-6 text-2xl font-bold">Opiniones en Google</h2>
            <div className="rounded-xl border border-zinc-200 p-6 shadow-sm transition duration-300 hover:shadow-lg dark:border-zinc-700">
              {reviews.rating != null && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
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
                  {typeof reviews.open_now === 'boolean' && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        reviews.open_now
                          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-500/12 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {reviews.open_now ? 'Abierto ahora' : 'Cerrado ahora'}
                    </span>
                  )}
                </div>
              )}
              {reviews.opening_hours && reviews.opening_hours.length > 0 && (
                <div className="mb-6 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
                  <p className="text-sm font-semibold">Horarios de atención</p>
                  <div className="mt-3 space-y-2">
                    {reviews.opening_hours.map((line, index) => (
                      <p key={index} className="text-sm text-zinc-600 dark:text-zinc-400">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {reviews.reviews.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Reseñas destacadas 4 y 5 estrellas
                  </p>
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
              )}
              {reviews.rating != null && reviews.reviews.length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  La ficha de Google no devolvió reseñas destacadas de 4 o 5 estrellas para mostrar en este momento.
                </p>
              )}
              {!reviews.rating && (!reviews.opening_hours || reviews.opening_hours.length === 0) && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No hay información pública de Google disponible en este momento.
                </p>
              )}
            </div>
          </section>
        )}

        <section
          data-reveal-id="contact"
          className={`mx-auto max-w-5xl px-4 py-12 sm:px-6 ${revealClass('contact')}`}
        >
          <div
            className={`rounded-xl border p-6 transition duration-300 hover:-translate-y-0.5 ${interactiveCardClass}`}
          >
            <div className="grid gap-8 lg:grid-cols-[1.25fr_0.95fr_1fr_auto] lg:items-center">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Tu asesor:
                </p>
                <p className="mt-1 text-lg font-semibold">{contactName}</p>
                <div className="mt-3 flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 ring-2 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                  {tenant.profile_photo_url ? (
                    <img
                      src={tenant.profile_photo_url}
                      alt={contactName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-zinc-500">
                      {contactName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {tenant.phone && (
                  <a href={`tel:${tenant.phone}`} className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {tenant.phone}
                  </a>
                )}
                {tenant.email && (
                  <a href={`mailto:${tenant.email}`} className="text-sm text-zinc-600 dark:text-zinc-400">
                    {tenant.email}
                  </a>
                )}
                <TenantSocialLinks links={tenant.social_links} themeMode={themeMode} className="mt-3" />
              </div>

              {vcardUrl && (
                <div className="flex flex-col items-center text-center">
                  <a
                    href={vcardUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Agenda Mis Datos"
                    className="group inline-flex flex-col items-center rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3 transition hover:border-cyan-300/65 hover:bg-cyan-300/15"
                  >
                    {effectiveVcardQrDataUrl ? (
                      <img
                        src={effectiveVcardQrDataUrl}
                        alt="QR Agenda Mis Datos"
                        className="h-36 w-36 rounded-lg bg-white p-1.5 object-contain shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
                      />
                    ) : (
                      <div className="flex h-36 w-36 items-center justify-center rounded-lg bg-white p-2 text-xs text-zinc-500">
                        {isGeneratingVcardQr ? 'Generando QR...' : 'Agenda Mis Datos'}
                      </div>
                    )}
                    <span className="mt-2 text-xs font-semibold tracking-[0.12em] text-cyan-700 dark:text-cyan-200">
                      Agenda Mis Datos
                    </span>
                  </a>
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                {businessName && (
                  <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">{businessName}</p>
                )}
                {tenant.logo_url && (
                  <div className="mt-3 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                    <img
                      src={tenant.logo_url}
                      alt={tenant.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                {(martilleroName || martilleroReg) && (
                  <p className="mt-3 max-w-[260px] text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">
                    Martillero Responsable: {martilleroName || 'No informado'} {martilleroReg ? `Reg. ${martilleroReg}` : ''}
                  </p>
                )}
              </div>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white shadow-[0_0_18px_rgba(34,197,94,0.30)] transition duration-300 hover:-translate-y-0.5 hover:bg-green-500 hover:shadow-[0_0_28px_rgba(34,197,94,0.50)]"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-4 pb-3 sm:px-6">
          <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-500">
            {LEGAL_DISCLAIMER}
          </p>
        </section>
        <footer className="border-t border-zinc-200 px-4 py-6 dark:border-zinc-800 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
              {DISCLAIMER}
            </p>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              Todos los derechos reservados Showtime Prop - Especialistas en Marketing Inmobiliario e
              Inteligencia Artificial.{' '}
              <a
                href="https://showtimeprop.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                showtimeprop.com
              </a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  themeMode,
}: {
  icon: string;
  label: string;
  value: string;
  themeMode: ThemeMode;
}) {
  const cardClass =
    themeMode === 'light'
      ? 'border-zinc-200 bg-zinc-50 shadow-[0_10px_26px_rgba(15,23,42,0.06)] hover:border-cyan-400/35 hover:shadow-[0_0_22px_rgba(56,189,248,0.20)]'
      : themeMode === 'soft'
      ? 'border-slate-500/55 bg-slate-800/55 shadow-[0_10px_28px_rgba(2,6,23,0.30)] hover:border-cyan-300/45 hover:shadow-[0_0_26px_rgba(34,211,238,0.22)]'
      : 'border-zinc-700/95 bg-zinc-900/55 shadow-[0_12px_34px_rgba(0,0,0,0.44)] hover:border-cyan-400/45 hover:shadow-[0_0_30px_rgba(34,211,238,0.22)]';
  return (
    <div className={`rounded-xl border p-4 transition duration-300 hover:-translate-y-0.5 ${cardClass}`}>
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
