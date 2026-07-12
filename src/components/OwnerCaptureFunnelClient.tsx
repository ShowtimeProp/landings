'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PortfolioContactActions from '@/components/PortfolioContactActions';
import ShareRail from '@/components/ShareRail';
import { TenantSocialLinks } from '@/components/social-links';
import OwnerValuationWizard, {
  type PersistStepArgs,
} from '@/components/owner-capture/OwnerValuationWizard';

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

function themeLabel(theme: ThemeMode): string {
  if (theme === 'light') return 'Tema claro';
  if (theme === 'soft') return 'Tema suave';
  return 'Tema oscuro';
}

function ThemeIcon({ theme, className = 'h-5 w-5' }: { theme: ThemeMode; className?: string }) {
  if (theme === 'light') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    );
  }
  if (theme === 'soft') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v18m9-9H3m13.5-5.5l-9 11M7.5 6.5l9 11"
        />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
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
  portfolioBio,
  whatsapp,
  logoUrl,
  profilePhotoUrl,
  socialLinks,
  vcardUrl,
  vcardQrDataUrl,
  defaultPropertyId,
  referralCode,
  config,
}: {
  backendUrl: string;
  tenantSlug: string;
  tenantName: string;
  contactName: string;
  portfolioBio?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  profilePhotoUrl?: string | null;
  socialLinks?: Record<string, string> | null;
  vcardUrl?: string | null;
  vcardQrDataUrl?: string | null;
  defaultPropertyId?: string | null;
  referralCode?: string | null;
  config?: OwnerCaptureConfig | null;
}) {
  const searchParams = useSearchParams();
  const themeParam = normalizeThemeMode(searchParams.get('theme'));
  const initialIntent = searchParams.get('intent') === 'landlord' ? 'landlord' : 'seller';
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => themeParam || getStoredThemeMode());
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [companyTrap, setCompanyTrap] = useState('');
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
  const portfolioHeroText =
    String(portfolioBio || '').trim() ||
    `Referente comercial de ${tenantName}. Podés contactar por WhatsApp, email o agendar sus datos con QR. Te atendemos las 24hs los 365 dias del año!`;

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
    return Object.keys(payload).length ? payload : undefined;
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

  const themeHref = (nextTheme: ThemeMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('theme', nextTheme);
    if (intent) params.set('intent', intent);
    return `/captacion/${tenantSlug}?${params.toString()}`;
  };
  const nextTheme = nextThemeMode(themeMode);
  const portfolioHref = (() => {
    const params = new URLSearchParams();
    if (campaignQueryString) {
      new URLSearchParams(campaignQueryString).forEach((value, key) => {
        params.set(key, value);
      });
    }
    if (referralCode) params.set('ref', referralCode);
    params.set('theme', themeMode);
    const qs = params.toString();
    return qs ? `/p/${tenantSlug}?${qs}` : `/p/${tenantSlug}`;
  })();
  const mobileThemeHref = themeHref(nextTheme);

  const persistWizardStep = async ({
    wizardStep,
    formData,
    leadId,
    captureFields,
    priority,
    message,
  }: PersistStepArgs) => {
    setError('');
    if (companyTrap.trim()) {
      throw new Error('No pudimos validar el envio.');
    }
    const payload: Record<string, unknown> = {
      tenant_slug: tenantSlug,
      intent,
      full_name: formData.full_name.trim(),
      whatsapp: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      wizard_step: wizardStep,
      capture_fields: captureFields,
      lead_id: leadId || undefined,
      page_url: typeof window !== 'undefined' ? window.location.href : undefined,
      ref: searchParams.get('ref') || referralCode || undefined,
      campaign,
      company: companyTrap || undefined,
      started_at_ms: formStartedAt,
      message,
    };
    if (wizardStep >= 4) payload.priority = priority;

    const res = await fetch(`${backendUrl}/api/properties/public/owner-capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || 'No pudimos enviar tus datos.');
    }
    return { lead_id: data.lead_id ? String(data.lead_id) : undefined };
  };

  const switchIntent = (next: Intent) => {
    setIntent(next);
    setDone(false);
    setError('');
  };

  const title =
    intent === 'seller'
      ? config?.front_title || 'Queres vender tu propiedad?'
      : config?.back_title || 'Queres alquilar tu propiedad?';
  const subtitle =
    intent === 'seller'
      ? config?.front_text || 'Completá el wizard de valuación (mismos datos que en Smart Bio) y te contactamos.'
      : config?.back_text || 'Completá el wizard con los datos de la propiedad y te ayudamos a publicarla.';
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
  const titleTextClass = isLight ? 'text-zinc-900' : 'text-zinc-100';
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
  const heroClass = isLight
    ? 'border-zinc-200 bg-gradient-to-br from-white via-zinc-100 to-zinc-200 shadow-[0_20px_50px_rgba(15,23,42,0.12)]'
    : isSoft
    ? 'border-white/15 bg-gradient-to-br from-slate-800/95 via-slate-900/88 to-slate-950/80 shadow-[0_20px_60px_rgba(0,0,0,0.35)]'
    : 'border-white/15 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-950/70 shadow-[0_20px_65px_rgba(0,0,0,0.45)]';
  const emailButtonClass = isLight
    ? 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
    : 'border-white/20 bg-white/5 text-zinc-100 hover:bg-white/10';
  const themeToggleClass = isLight
    ? 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-white'
    : 'border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10';

  return (
    <div className={`min-h-screen overflow-x-hidden ${rootClass}`}>
      <ShareRail themeMode={themeMode} shareTitle={`Captación · ${tenantName}`} />
      <div className={`pointer-events-none fixed inset-0 -z-10 ${overlayClass}`} />

      <header className={`border-b backdrop-blur-md ${headerClass}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href={portfolioHref} className="flex min-w-0 items-center justify-center gap-3 sm:justify-start">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${
                isLight ? 'border border-zinc-200 bg-zinc-100' : 'border border-white/20 bg-white/5'
              }`}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={tenantName} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-sm font-semibold">{tenantName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Portfolio
              </p>
              <p className="truncate text-sm font-semibold">{tenantName}</p>
            </div>
          </Link>

          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-end">
            <Link
              href={mobileThemeHref}
              aria-label={`Cambiar a ${themeLabel(nextTheme).toLowerCase()}`}
              title={themeLabel(nextTheme)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${themeToggleClass}`}
            >
              <ThemeIcon theme={nextTheme} />
            </Link>
            <p className={`hidden max-w-xs truncate text-xs sm:block ${subtitleTextClass}`}>
              {funnelHeaderText}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        <section className={`relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden border-y border-x-0 px-4 py-6 sm:px-8 lg:px-10 ${heroClass}`}>
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-6 text-center lg:grid-cols-[1fr_auto] lg:items-center lg:text-left">
            <div className="flex flex-col items-center lg:items-start">
              <p className={`text-xs uppercase tracking-[0.2em] ${isLight ? 'text-cyan-700' : 'text-cyan-200/80'}`}>
                Asesor inmobiliario
              </p>
              <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
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
              <p className={`mx-auto mt-3 max-w-2xl text-sm leading-relaxed lg:mx-0 ${subtitleTextClass}`}>
                {portfolioHeroText}
              </p>
            </div>

            <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-end lg:gap-4">
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
                  className="justify-center lg:justify-start"
                />
                <TenantSocialLinks
                  links={socialLinks}
                  themeMode={themeMode}
                  className="justify-center pt-1 lg:justify-start"
                />
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
                      className="h-28 w-28 rounded-lg bg-white p-1.5 object-contain shadow-[0_8px_20px_rgba(0,0,0,0.16)] sm:h-32 sm:w-32"
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
                onClick={() => switchIntent('seller')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${intent === 'seller' ? chipActiveClass : chipTextClass}`}
                style={intent === 'seller' ? { backgroundColor: accent, color: buttonTextColor } : undefined}
              >
                Venta
              </button>
              <button
                type="button"
                onClick={() => switchIntent('landlord')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${intent === 'landlord' ? chipActiveClass : chipTextClass}`}
                style={intent === 'landlord' ? { backgroundColor: accent, color: buttonTextColor } : undefined}
              >
                Alquileres
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

          <div
            className={`rounded-2xl border p-5 sm:p-6 ${formShellClass}`}
            style={
              {
                '--bio-primary': accent,
                '--bio-primary-fg': buttonTextColor,
                '--bio-text': isLight ? '#18181b' : '#f4f4f5',
                '--bio-muted': isLight ? '#71717a' : '#a1a1aa',
                '--bio-border': isLight ? '#e4e4e7' : 'rgba(255,255,255,0.12)',
                '--bio-surface': isLight ? '#ffffff' : 'rgba(0,0,0,0.2)',
                '--bio-bg': isLight ? '#fafafa' : 'rgba(0,0,0,0.28)',
              } as CSSProperties
            }
          >
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
                  href={portfolioHref}
                  className="mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ backgroundColor: accent, color: buttonTextColor }}
                >
                  Volver al portfolio
                </Link>
              </div>
            ) : (
              <>
                <OwnerValuationWizard
                  key={intent}
                  backendUrl={backendUrl}
                  tenantSlug={tenantSlug}
                  storageKey={`sp_portfolio_valuation_${tenantSlug}_${intent}`}
                  intent={intent}
                  requirePhone
                  funnel={intent === 'seller' ? 'portfolio_seller_valuation' : 'portfolio_landlord_valuation'}
                  thanksMessage={successCopy}
                  onPersist={persistWizardStep}
                  onComplete={() => setDone(true)}
                />
                {error ? (
                  <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>
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
    </div>
  );
}
