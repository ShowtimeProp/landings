'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PortfolioContactActions from '@/components/PortfolioContactActions';
import { TenantSocialLinks } from '@/components/social-links';

type Intent = 'seller' | 'landlord';

type OwnerCaptureConfig = {
  funnel_header_text?: string | null;
  front_title?: string | null;
  front_text?: string | null;
  front_cta?: string | null;
  front_video_url?: string | null;
  front_video_thumbnail_url?: string | null;
  back_title?: string | null;
  back_text?: string | null;
  back_cta?: string | null;
  back_video_url?: string | null;
  back_video_thumbnail_url?: string | null;
  accent_color?: string | null;
  button_text_color?: string | null;
};

type ThemeMode = 'dark' | 'soft' | 'light';

type FormState = {
  property_type: string;
  location: string;
  address: string;
  ambientes: string;
  area_sqm: string;
  condition: string;
  estimated_price: string;
  price_currency: string;
  urgency: string;
  comments: string;
  full_name: string;
  whatsapp: string;
  email: string;
};

const initialForm: FormState = {
  property_type: '',
  location: '',
  address: '',
  ambientes: '',
  area_sqm: '',
  condition: '',
  estimated_price: '',
  price_currency: 'USD',
  urgency: '',
  comments: '',
  full_name: '',
  whatsapp: '',
  email: '',
};

const CAMPAIGN_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'marketing_campaign_id',
  'variant_id',
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
];

function normalizeThemeMode(raw: string | null | undefined): ThemeMode | null {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'light') return 'light';
  if (value === 'soft' || value === 'neutral' || value === 'mid') return 'soft';
  if (value === 'dark') return 'dark';
  return null;
}

function nextThemeMode(theme: ThemeMode): ThemeMode {
  if (theme === 'dark') return 'soft';
  if (theme === 'soft') return 'light';
  return 'dark';
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem('owner-capture-theme-mode');
    const normalized = normalizeThemeMode(stored);
    if (normalized) return normalized;
  } catch {
    // ignore localStorage errors
  }
  return 'dark';
}

function buildBunnyPlayerUrl(rawUrl: string, autoplay = false): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    const isBunnyHost =
      host === 'iframe.mediadelivery.net' ||
      host === 'player.mediadelivery.net' ||
      host.endsWith('.mediadelivery.net');
    if (!isBunnyHost) return null;

    const parts = url.pathname.split('/').filter(Boolean);
    let libraryId = '';
    let videoId = '';

    if (parts[0] === 'play' && parts.length >= 3) {
      libraryId = parts[1] || '';
      videoId = parts[2] || '';
    } else if (parts[0] === 'embed' && parts.length >= 3) {
      libraryId = parts[1] || '';
      videoId = parts[2] || '';
    }

    if (!libraryId || !videoId) return null;

    const params = new URLSearchParams();
    params.set('autoplay', autoplay ? 'true' : 'false');
    params.set('playsinline', 'true');
    params.set('preload', 'true');
    params.set('muted', autoplay ? 'false' : 'true');

    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
  } catch {
    return null;
  }
}

export default function OwnerCaptureFunnelClient({
  backendUrl,
  tenantSlug,
  tenantName,
  contactName,
  whatsapp,
  logoUrl,
  profilePhotoUrl,
  socialLinks,
  vcardUrl,
  vcardQrDataUrl,
  defaultPropertyId,
  referralCode,
  propertiesCount,
  toursCount,
  config,
}: {
  backendUrl: string;
  tenantSlug: string;
  tenantName: string;
  contactName: string;
  whatsapp?: string | null;
  logoUrl?: string | null;
  profilePhotoUrl?: string | null;
  socialLinks?: Record<string, string> | null;
  vcardUrl?: string | null;
  vcardQrDataUrl?: string | null;
  defaultPropertyId?: string | null;
  referralCode?: string | null;
  propertiesCount?: number;
  toursCount?: number;
  config?: OwnerCaptureConfig | null;
}) {
  const searchParams = useSearchParams();
  const themeParam = normalizeThemeMode(searchParams.get('theme'));
  const initialIntent = searchParams.get('intent') === 'landlord' ? 'landlord' : 'seller';
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => themeParam || getStoredThemeMode());
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [form, setForm] = useState<FormState>(initialForm);
  const [companyTrap, setCompanyTrap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [formStartedAt] = useState<number>(() => Date.now());
  const isLight = themeMode === 'light';
  const isSoft = themeMode === 'soft';
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(config?.accent_color || ''))
    ? String(config?.accent_color)
    : '#22d3ee';
  const buttonTextColor = /^#[0-9a-fA-F]{6}$/.test(String(config?.button_text_color || ''))
    ? String(config?.button_text_color)
    : '#111827';

  useEffect(() => {
    const normalized = themeParam || getStoredThemeMode();
    setThemeMode((current) => (current === normalized ? current : normalized));
  }, [themeParam]);

  useEffect(() => {
    try {
      window.localStorage.setItem('owner-capture-theme-mode', themeMode);
    } catch {
      // ignore localStorage errors
    }
    document.documentElement.classList.toggle('dark', !isLight);
    document.documentElement.setAttribute('data-landing-theme', themeMode);
  }, [isLight, themeMode]);

  const campaign = useMemo(() => {
    const payload: Record<string, string> = {};
    for (const key of CAMPAIGN_KEYS) {
      const value = String(searchParams.get(key) || '').trim();
      if (value) payload[key] = value;
    }
    return payload;
  }, [searchParams]);

  const campaignQueryString = useMemo(() => {
    const params = new URLSearchParams();
    if (referralCode) params.set('ref', referralCode);
    for (const key of CAMPAIGN_KEYS) {
      const value = String(searchParams.get(key) || '').trim();
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [referralCode, searchParams]);

  const whatsappUrl = useMemo(() => {
    const digits = String(whatsapp || '').replace(/[^\d]/g, '');
    if (!digits) return null;
    const baseMessage = `Hola ${tenantName || ''}, quiero consultar por la captación de mi propiedad.`;
    const messageWithTracking = campaignQueryString
      ? `${baseMessage} source=owner_capture ${campaignQueryString.replace(/&/g, ' ')}`
      : `${baseMessage} source=owner_capture`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(messageWithTracking)}`;
  }, [campaignQueryString, tenantName, whatsapp]);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const themeHref = (nextTheme: ThemeMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('theme', nextTheme);
    if (intent) params.set('intent', intent);
    return `/captacion/${tenantSlug}?${params.toString()}`;
  };
  const mobileThemeHref = themeHref(nextThemeMode(themeMode));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        tenant_slug: tenantSlug,
        intent,
        full_name: form.full_name,
        whatsapp: form.whatsapp,
        email: form.email || undefined,
        property_type: form.property_type || undefined,
        location: form.location || undefined,
        address: form.address || undefined,
        ambientes: form.ambientes ? Number(form.ambientes) : undefined,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : undefined,
        condition: form.condition || undefined,
        estimated_price: form.estimated_price ? Number(form.estimated_price) : undefined,
        price_currency: form.price_currency || undefined,
        urgency: form.urgency || undefined,
        comments: form.comments || undefined,
        page_url: window.location.href,
        ref: searchParams.get('ref') || undefined,
        campaign,
        company: companyTrap || undefined,
        started_at_ms: formStartedAt,
      };
      const res = await fetch(`${backendUrl}/api/properties/public/owner-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || 'No pudimos enviar tus datos.');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tus datos.');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    intent === 'seller'
      ? config?.front_title || 'Queres vender tu propiedad?'
      : config?.back_title || 'Queres alquilar tu propiedad?';
  const subtitle =
    intent === 'seller'
      ? config?.front_text || 'Contanos los datos basicos y coordinamos una valoracion.'
      : config?.back_text || 'Contanos los datos basicos para publicarla y organizar visitas.';
  const funnelHeaderText =
    config?.funnel_header_text || 'Gestión comercial inteligente para vender o alquilar mejor.';
  const activeVideoUrl =
    intent === 'seller' ? config?.front_video_url || null : config?.back_video_url || null;
  const activeVideoThumbnailUrl =
    intent === 'seller'
      ? config?.front_video_thumbnail_url || null
      : config?.back_video_thumbnail_url || null;
  const modalEmbedUrl = activeVideoUrl ? buildBunnyPlayerUrl(activeVideoUrl, true) : null;
  const successCopy =
    intent === 'seller'
      ? `El equipo de ${tenantName} ya tiene tus datos para avanzar con la valuación y te vamos a estar contactando a la brevedad. Gracias por elegirnos!`
      : `El equipo de ${tenantName} ya tiene tus datos para avanzar con la publicación y te vamos a estar contactando a la brevedad. Gracias por elegirnos!`;
  const rootClass = isLight
    ? 'bg-[#f4f7fb] text-zinc-900'
    : isSoft
    ? 'bg-[#0d1422] text-zinc-100'
    : 'bg-[#07090d] text-zinc-100';
  const headerBorderClass = isLight ? 'border-zinc-200' : 'border-white/10';
  const titleTextClass = isLight ? 'text-zinc-900' : 'text-zinc-50';
  const subtitleTextClass = isLight ? 'text-zinc-600' : 'text-zinc-300';
  const chipOuterClass = isLight ? 'border-zinc-200 bg-white' : 'border-white/15 bg-white/5';
  const chipTextClass = isLight ? 'text-zinc-600 hover:text-zinc-900' : 'text-zinc-300 hover:text-white';
  const chipActiveClass = isLight ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-800 shadow-sm';
  const videoCardClass = isLight
    ? 'border-zinc-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
    : 'border-white/10 bg-white/5 shadow-[0_16px_40px_rgba(0,0,0,0.24)]';
  const formShellClass = isLight
    ? 'border-zinc-200 bg-white/95 text-zinc-900 shadow-[0_20px_60px_rgba(15,23,42,0.10)]'
    : isSoft
    ? 'border-white/10 bg-slate-900/72 text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.28)]'
    : 'border-white/10 bg-zinc-950/72 text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)]';
  const fieldClass = isLight
    ? 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-cyan-500'
    : 'border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300';
  const selectFieldClass = isLight
    ? 'border-zinc-200 bg-white text-zinc-900 focus:border-cyan-500'
    : 'border-white/12 bg-zinc-950 text-zinc-100 focus:border-cyan-300';
  const labelTextClass = isLight ? 'text-zinc-700' : 'text-zinc-300';
  const helperTextClass = isLight ? 'text-zinc-500' : 'text-zinc-400';
  const themeNavItemClass = isLight
    ? 'text-zinc-600 hover:text-zinc-900'
    : 'text-zinc-300 hover:text-white';
  const heroClass = isLight
    ? 'bg-[linear-gradient(135deg,#ecfeff_0%,#ffffff_48%,#fff7ed_100%)] text-zinc-950'
    : isSoft
    ? 'bg-[linear-gradient(135deg,#102235_0%,#1e1b4b_55%,#312e81_100%)] text-zinc-50'
    : 'bg-[linear-gradient(135deg,#0b1d26_0%,#16181d_55%,#241436_100%)] text-zinc-50';
  const badgeBaseClass = isLight
    ? 'border-zinc-200 bg-white/85 text-zinc-700'
    : 'border-white/20 bg-black/15 text-white/80';
  const emailButtonClass = isLight
    ? 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100'
    : 'border-white/15 bg-white/6 text-zinc-100 hover:border-white/30 hover:bg-white/10';

  return (
    <main className={`min-h-screen ${rootClass}`}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className={`flex items-center justify-between gap-4 border-b pb-5 ${headerBorderClass}`}>
          <Link href={`/p/${tenantSlug}`} className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border ${headerBorderClass} bg-white/5`}>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={tenantName} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-sm font-semibold">{tenantName.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold">{tenantName}</span>
              <span className={`block text-xs ${helperTextClass}`}>{funnelHeaderText}</span>
            </span>
          </Link>
          <Link
            href={mobileThemeHref}
            aria-label="Cambiar tema"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full sm:hidden ${chipOuterClass}`}
          >
            {themeMode === 'dark' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : themeMode === 'soft' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v18m9-9H3m13.5-5.5l-9 11M7.5 6.5l9 11"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </Link>
          <nav className={`hidden rounded-full border p-1 sm:inline-flex ${chipOuterClass}`}>
            {(['light', 'soft', 'dark'] as ThemeMode[]).map((mode) => (
              <Link
                key={mode}
                href={themeHref(mode)}
                className={`rounded-full px-2.5 py-1 text-sm transition ${
                  themeMode === mode ? chipActiveClass : themeNavItemClass
                }`}
              >
                {mode === 'light' ? 'Light' : mode === 'soft' ? 'Soft' : 'Dark'}
              </Link>
            ))}
          </nav>
        </header>

        <section className={`relative mt-8 overflow-hidden border-y border-x-0 px-4 py-6 sm:px-8 lg:px-10 ${heroClass}`}>
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-cyan-700' : 'text-cyan-200/80'}`}>Asesor de ventas</p>
              <div className="mt-3 flex items-center gap-4 sm:gap-5">
                <div
                  className={`flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full sm:h-32 sm:w-32 ${
                    isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/20 bg-white/5'
                  }`}
                >
                  {profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profilePhotoUrl} alt={contactName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-semibold">{contactName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{contactName}</h2>
              </div>
              <p className={`mt-3 max-w-2xl text-sm leading-relaxed ${subtitleTextClass}`}>
                Referente comercial de {tenantName}. Podés contactar por WhatsApp, email o agendar sus datos con QR. Te atendemos las 24hs los 365 dias del año!
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeBaseClass}`}>
                  {propertiesCount || 0} propiedades
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeBaseClass}`}>
                  {toursCount || 0} tours virtuales
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-2">
                <PortfolioContactActions
                  backendUrl={backendUrl}
                  tenantSlug={tenantSlug}
                  defaultPropertyId={defaultPropertyId ?? null}
                  whatsappUrl={whatsappUrl}
                  referralCode={referralCode}
                  campaignQueryString={campaignQueryString}
                  emailButtonClass={emailButtonClass}
                  themeMode={themeMode}
                />
                <TenantSocialLinks links={socialLinks} themeMode={themeMode} className="pt-1" />
              </div>
              {vcardUrl ? (
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
                  {vcardQrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vcardQrDataUrl}
                      alt={`QR de ${contactName}`}
                      className="h-28 w-28 rounded-lg bg-white p-1.5 sm:h-32 sm:w-32"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-white/80 text-xs font-medium text-zinc-600 sm:h-32 sm:w-32">
                      QR
                    </div>
                  )}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className={`inline-flex rounded-full border p-1 ${chipOuterClass}`}>
              <button
                type="button"
                onClick={() => setIntent('seller')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${intent === 'seller' ? chipActiveClass : chipTextClass}`}
                style={intent === 'seller' ? { backgroundColor: accent, color: buttonTextColor } : undefined}
              >
                Venta
              </button>
              <button
                type="button"
                onClick={() => setIntent('landlord')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${intent === 'landlord' ? chipActiveClass : chipTextClass}`}
                style={intent === 'landlord' ? { backgroundColor: accent, color: buttonTextColor } : undefined}
              >
                Alquiler
              </button>
            </div>
            <h1 className={`mt-5 text-3xl font-semibold leading-tight sm:text-4xl ${titleTextClass}`}>{title}</h1>
            <p className={`mt-4 max-w-xl text-sm leading-relaxed ${subtitleTextClass}`}>{subtitle}</p>
            {(activeVideoThumbnailUrl || activeVideoUrl) && (
              <button
                type="button"
                onClick={() => setVideoModalOpen(true)}
                className={`mt-6 block w-full max-w-xl overflow-hidden rounded-3xl border text-left transition hover:-translate-y-0.5 ${videoCardClass}`}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  {activeVideoThumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeVideoThumbnailUrl}
                      alt={intent === 'seller' ? 'Video para captacion de venta' : 'Video para captacion de alquiler'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full ${
                        isLight
                          ? 'bg-[linear-gradient(135deg,#ecfeff,#f8fafc_50%,#fff7ed)]'
                          : 'bg-[linear-gradient(135deg,#083344,#111827_52%,#3b0764)]'
                      }`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/10" />
                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {intent === 'seller' ? 'Ver video de valuacion' : 'Ver video de alquiler'}
                      </p>
                      <p className="mt-1 text-sm text-white/80">
                        {intent === 'seller'
                          ? 'Te contamos como trabajamos la valuacion y la estrategia comercial.'
                          : 'Te mostramos como preparamos la publicacion y organizamos las visitas.'}
                      </p>
                    </div>
                    <span
                      className="inline-flex h-14 w-14 items-center justify-center rounded-full shadow-[0_16px_32px_rgba(0,0,0,0.28)]"
                      style={{ backgroundColor: accent, color: buttonTextColor }}
                    >
                      <svg className="ml-1 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.14v13.72c0 .8.87 1.28 1.54.86l10.8-6.86a1 1 0 000-1.72L9.54 4.28A1 1 0 008 5.14z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>

          <form onSubmit={submit} className={`rounded-2xl border p-5 sm:p-6 ${formShellClass}`}>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={companyTrap}
              onChange={(e) => setCompanyTrap(e.target.value)}
              className="hidden"
              name="company"
            />
            {done ? (
              <div className="py-8">
                <p className="text-2xl font-semibold">Recibimos tu solicitud.</p>
                <p className={`mt-3 text-sm leading-relaxed ${subtitleTextClass}`}>
                  {successCopy}
                </p>
                <Link
                  href={`/p/${tenantSlug}`}
                  className="mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: accent, color: buttonTextColor }}
                >
                  Volver al portfolio
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Tipo de propiedad</span>
                    <input className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.property_type} onChange={(e) => update('property_type', e.target.value)} placeholder="Departamento, casa, local" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Zona</span>
                    <input className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Barrio o ciudad" />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className={labelTextClass}>Direccion aproximada</span>
                    <input className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Calle, altura o referencia" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Ambientes</span>
                    <input type="number" min="0" className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.ambientes} onChange={(e) => update('ambientes', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Metros cuadrados</span>
                    <input type="number" min="0" className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.area_sqm} onChange={(e) => update('area_sqm', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Estado</span>
                    <select
                      className={`w-full rounded-xl border px-3 py-2 outline-none ${selectFieldClass}`}
                      style={{ colorScheme: isLight ? 'light' : 'dark' }}
                      value={form.condition}
                      onChange={(e) => update('condition', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="excelente">Excelente</option>
                      <option value="muy_bueno">Muy bueno</option>
                      <option value="a_refaccionar">A refaccionar</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Urgencia</span>
                    <select
                      className={`w-full rounded-xl border px-3 py-2 outline-none ${selectFieldClass}`}
                      style={{ colorScheme: isLight ? 'light' : 'dark' }}
                      value={form.urgency}
                      onChange={(e) => update('urgency', e.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="ahora">Ahora</option>
                      <option value="30_60_dias">30 a 60 dias</option>
                      <option value="sin_apuro">Sin apuro</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Precio esperado</span>
                    <input type="number" min="0" className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.estimated_price} onChange={(e) => update('estimated_price', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Moneda</span>
                    <select
                      className={`w-full rounded-xl border px-3 py-2 outline-none ${selectFieldClass}`}
                      style={{ colorScheme: isLight ? 'light' : 'dark' }}
                      value={form.price_currency}
                      onChange={(e) => update('price_currency', e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className={labelTextClass}>Comentarios</span>
                    <textarea className={`min-h-24 w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.comments} onChange={(e) => update('comments', e.target.value)} placeholder="Detalles importantes, expensas, disponibilidad, preferencias" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>Nombre completo</span>
                    <input required className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className={labelTextClass}>WhatsApp</span>
                    <input required className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className={labelTextClass}>Email opcional</span>
                    <input type="email" className={`w-full rounded-xl border px-3 py-2 outline-none ${fieldClass}`} value={form.email} onChange={(e) => update('email', e.target.value)} />
                  </label>
                </div>

                {error && <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: accent, color: buttonTextColor }}
                >
                  {submitting ? 'Enviando...' : intent === 'seller' ? 'Solicitar valoracion' : 'Publicarla en alquiler'}
                </button>
              </>
            )}
          </form>
        </section>
      </div>
      {videoModalOpen && (activeVideoUrl || modalEmbedUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 px-4 py-8">
          <button
            type="button"
            aria-label="Cerrar video"
            onClick={() => setVideoModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className={`relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border ${formShellClass}`}>
            <button
              type="button"
              onClick={() => setVideoModalOpen(false)}
              className={`absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm ${chipOuterClass} ${chipTextClass}`}
              aria-label="Cerrar"
            >
              ✕
            </button>
            <div className="aspect-video w-full bg-black">
              {modalEmbedUrl ? (
                <iframe
                  title={intent === 'seller' ? 'Video de captacion de venta' : 'Video de captacion de alquiler'}
                  src={modalEmbedUrl}
                  className="h-full w-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video
                  className="h-full w-full"
                  src={activeVideoUrl || undefined}
                  controls
                  autoPlay
                  playsInline
                />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
