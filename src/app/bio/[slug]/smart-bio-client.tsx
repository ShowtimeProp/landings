'use client';

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { SocialNetworkIcon, socialLinkEntries, type SocialLinksMap } from '@/components/social-links';
import SellerValuationWizard from '@/components/smart-bio/SellerValuationWizard';
import BuyerCaptureWizard from '@/components/smart-bio/BuyerCaptureWizard';
import RentalCaptureWizard from '@/components/smart-bio/RentalCaptureWizard';
import {
  modeLabel,
  nextMode,
  normalizeMode,
  resolveBioTheme,
  type BioMode,
  type SmartBioThemeConfig,
} from '@/lib/smart-bio-theme';

declare global {
  interface Window {
    initAssistantWidget?: (options: Record<string, unknown>) => void;
  }
}

type CaptureIntent = 'seller_capture' | 'buyer_capture' | 'vacation_rental';

type SmartBioData = {
  profile: {
    id: string;
    slug: string;
    owner_type: 'tenant' | 'seller';
    display_name?: string | null;
    title?: string | null;
    bio?: string | null;
    profile_photo_url?: string | null;
    logo_url?: string | null;
    ref_code?: string | null;
    theme?: SmartBioThemeConfig | null;
    language_config?: Record<string, any>;
    contact_overrides?: Record<string, any>;
    enabled_blocks?: Record<string, boolean>;
    custom_links?: Array<{ label?: string; url?: string }>;
    media?: Record<string, any>;
    cv?: Record<string, any>;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    social_links?: Record<string, string> | null;
    martillero_responsable?: string | null;
    martillero_registro?: string | null;
  };
  seller?: {
    user_id?: string | null;
    full_name?: string | null;
  };
  contact?: Record<string, any>;
  links?: {
    portfolio?: string | null;
    vcard?: string | null;
    blog?: string | null;
  };
  blog?: {
    enabled?: boolean;
    show_link?: boolean;
    href?: string | null;
  } | null;
  properties?: Array<{
    id: string;
    name: string;
    href: string;
    price?: number | null;
    currency?: string | null;
    images?: unknown[];
    property_type?: string | null;
    operation_type?: string | null;
    address?: Record<string, unknown> | string | null;
    ambientes?: number | null;
    bedrooms?: number | null;
    area_sqm?: number | null;
  }>;
  properties_total?: number;
  widget_context?: {
    tenant_id: string;
    seller_ref_code?: string | null;
    seller_user_id?: string | null;
    bio_profile_id: string;
    source: string;
  };
};

type Reviews = {
  rating?: number | null;
  user_ratings_total?: number;
  reviews?: Array<{ author_name?: string; rating?: number; text?: string; relative_time_description?: string }>;
};

const LANGS = ['es', 'en', 'pt'] as const;
const WIDGET_ASSET_VERSION = '20260711-smart-bio';
const THEME_STORAGE_KEY = 'sp_smart_bio_theme_mode';

const OPERATION_LABELS: Record<'es' | 'en' | 'pt', Record<string, string>> = {
  es: {
    sale: 'En Venta',
    rent: 'Alquiler',
    rent_short_term: 'Alquiler temporal',
    rent_long_term: 'Alquiler largo plazo',
    both: 'Venta y alquiler',
  },
  en: {
    sale: 'For Sale',
    rent: 'For Rent',
    rent_short_term: 'Short-term rental',
    rent_long_term: 'Long-term rental',
    both: 'Sale and rent',
  },
  pt: {
    sale: 'À Venda',
    rent: 'Para Alugar',
    rent_short_term: 'Temporada',
    rent_long_term: 'Longa temporada',
    both: 'Venda e aluguel',
  },
};

const PROPERTY_TYPE_LABELS: Record<'es' | 'en' | 'pt', Record<string, string>> = {
  es: {
    apartment: 'Departamento',
    departamento: 'Departamento',
    house: 'Casa',
    casa: 'Casa',
    ph: 'PH',
    local: 'Local',
    land: 'Terreno',
    terreno: 'Terreno',
    garage: 'Cochera',
    cochera: 'Cochera',
    office: 'Oficina',
    oficina: 'Oficina',
    project: 'Proyecto',
    other: 'Otro',
  },
  en: {
    apartment: 'Apartment',
    departamento: 'Apartment',
    house: 'House',
    casa: 'House',
    ph: 'Townhouse',
    local: 'Retail',
    land: 'Land',
    terreno: 'Land',
    garage: 'Garage',
    cochera: 'Garage',
    office: 'Office',
    oficina: 'Office',
    project: 'Project',
    other: 'Other',
  },
  pt: {
    apartment: 'Apartamento',
    departamento: 'Apartamento',
    house: 'Casa',
    casa: 'Casa',
    ph: 'Sobrado',
    local: 'Loja',
    land: 'Terreno',
    terreno: 'Terreno',
    garage: 'Garagem',
    cochera: 'Garagem',
    office: 'Escritório',
    oficina: 'Escritório',
    project: 'Projeto',
    other: 'Outro',
  },
};

function firstImage(images?: unknown[]): string {
  const first = Array.isArray(images) ? images[0] : null;
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') {
    const obj = first as Record<string, unknown>;
    return String(obj.url || obj.secure_url || obj.src || '');
  }
  return '';
}

function normalizeLang(raw: string | null | undefined): 'es' | 'en' | 'pt' {
  const value = String(raw || '').toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('pt')) return 'pt';
  return 'es';
}

function nextLang(current: 'es' | 'en' | 'pt', enabled: ReadonlyArray<'es' | 'en' | 'pt'>): 'es' | 'en' | 'pt' {
  if (enabled.length <= 1) return current;
  const idx = enabled.indexOf(current);
  return enabled[(idx >= 0 ? idx + 1 : 0) % enabled.length];
}

function langLabel(code: 'es' | 'en' | 'pt', uiLang: 'es' | 'en' | 'pt' = 'es'): string {
  if (uiLang === 'en') {
    if (code === 'es') return 'Spanish';
    if (code === 'en') return 'English';
    return 'Portuguese';
  }
  if (uiLang === 'pt') {
    if (code === 'es') return 'Espanhol';
    if (code === 'en') return 'Inglês';
    return 'Português';
  }
  if (code === 'es') return 'Español';
  if (code === 'en') return 'Inglés';
  return 'Portugués';
}

function formatMoney(price?: number | null, currency?: string | null) {
  if (price == null) return null;
  return `${currency || 'USD'} ${Number(price).toLocaleString('es-AR')}`;
}

function buildWhatsappLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function labelFromDict(raw: string | null | undefined, dict: Record<string, string>) {
  const value = String(raw || '').trim();
  if (!value) return null;
  return dict[value.toLowerCase()] || value;
}

function formatAddress(address?: Record<string, unknown> | string | null): string | null {
  if (!address) return null;
  if (typeof address === 'string') {
    const value = address.trim();
    return value || null;
  }
  const candidates = [
    address.formatted_address,
    address.full_address,
    address.street_address,
    address.line1,
  ];
  for (const item of candidates) {
    const value = String(item || '').trim();
    if (value) return value;
  }
  const street = String(address.street || address.street_name || address.calle || '').trim();
  const number = String(address.street_number || address.numero || '').trim();
  const city = String(address.city || address.locality || address.barrio || '').trim();
  const line = [street && number ? `${street} ${number}` : street || number, city].filter(Boolean).join(', ');
  return line || null;
}

function ThemeModeIcon({ mode, className = 'h-5 w-5' }: { mode: BioMode; className?: string }) {
  if (mode === 'light') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeWidth="1.8" d="M12 2.5v2.2M12 19.3v2.2M4.5 12H2.3M21.7 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
      </svg>
    );
  }
  if (mode === 'soft') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 4a8 8 0 108 8 6 6 0 01-8-8z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 14.5A8.5 8.5 0 1110.5 3a6.8 6.8 0 0010.5 11.5z" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.84c0 1.98.58 3.82 1.58 5.38L2 22l4.95-1.63a9.86 9.86 0 004.99 1.34h.01c5.46 0 9.89-4.4 9.89-9.84C21.84 6.4 17.5 2 12.04 2zm5.74 13.98c-.24.68-1.4 1.25-1.93 1.33-.49.07-1.11.1-1.79-.11-.41-.13-.94-.3-1.62-.59-2.85-1.23-4.7-4.1-4.84-4.29-.14-.19-1.15-1.53-1.15-2.92 0-1.39.73-2.07.99-2.35.26-.28.57-.35.76-.35h.55c.18 0 .41-.07.64.49.24.58.81 2 .88 2.15.07.14.12.31.02.5-.1.19-.14.31-.28.48-.14.16-.3.37-.42.5-.14.14-.28.29-.12.56.16.28.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
    </svg>
  );
}

function PhoneIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.6 3.8h2.4l1.2 4.2-1.8 1.2a12.5 12.5 0 005.4 5.4l1.2-1.8 4.2 1.2v2.4c0 .9-.7 1.6-1.6 1.6A14.6 14.6 0 015 5.4c0-.9.7-1.6 1.6-1.6z" />
    </svg>
  );
}

function MailIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContactIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" strokeWidth="1.8" />
      <path d="M5.5 19.2c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SmartBioClient({
  initialData,
  reviews,
  backendUrl,
}: {
  initialData: SmartBioData;
  reviews: Reviews | null;
  backendUrl: string;
}) {
  const profile = initialData.profile;
  const themeConfig = profile.theme || {};
  const initialMode = normalizeMode(themeConfig.modeDefault || themeConfig.mode || 'light');

  const [lang, setLang] = useState<'es' | 'en' | 'pt'>('es');
  const [mode, setMode] = useState<BioMode>(initialMode);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CaptureIntent>('seller_capture');
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', message: '', intent: 'general' });
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [formError, setFormError] = useState('');

  const blocks = profile.enabled_blocks || {};
  const contact = { ...(initialData.contact || {}), ...(profile.contact_overrides || {}) };
  const langConfig = profile.language_config || {};
  const enabledLangs = useMemo(() => {
    const raw = Array.isArray(langConfig.enabled) ? langConfig.enabled : LANGS;
    const filtered = LANGS.filter((item) => raw.map(String).map((v) => v.toLowerCase()).includes(item));
    return filtered.length ? filtered : [...LANGS];
  }, [langConfig.enabled]);

  const currentText = { ...(langConfig.es || {}), ...(langConfig[lang] || {}) };
  const displayName = String(currentText.display_name || profile.display_name || initialData.tenant.name || '');
  const displayTitle = String(currentText.title || profile.title || initialData.tenant.name || '');
  const displayBio = String(currentText.bio || profile.bio || '');

  const theme = useMemo(() => resolveBioTheme(themeConfig, mode), [themeConfig, mode]);
  const upcomingMode = nextMode(mode);
  const ref = profile.ref_code || initialData.widget_context?.seller_ref_code || '';
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappText = `Hola, vi tu Smart Bio y quiero consultar. ref=${ref || '-'} source=smart_bio`;
  const whatsappHref = buildWhatsappLink(String(contact.whatsapp || contact.phone || ''), whatsappText);
  const martilleroName = String(initialData.tenant.martillero_responsable || '').trim();
  const martilleroReg = String(initialData.tenant.martillero_registro || '').trim();

  const captureTabs = useMemo(() => {
    const tabs: Array<{ intent: CaptureIntent; label: string }> = [];
    if (blocks.seller_capture) tabs.push({ intent: 'seller_capture', label: currentText.tab_seller || 'Vender' });
    if (blocks.buyer_capture) tabs.push({ intent: 'buyer_capture', label: currentText.tab_buyer || 'Comprar' });
    if (blocks.vacation_rental) {
      const rawTab = String(currentText.tab_vacation || '').trim();
      const rentalLabel =
        !rawTab || /vacacional/i.test(rawTab)
          ? lang === 'en'
            ? 'Rentals'
            : lang === 'pt'
              ? 'Aluguéis'
              : 'Alquileres'
          : rawTab;
      tabs.push({ intent: 'vacation_rental', label: rentalLabel });
    }
    return tabs;
  }, [blocks.seller_capture, blocks.buyer_capture, blocks.vacation_rental, currentText.tab_seller, currentText.tab_buyer, currentText.tab_vacation, lang]);

  const socialLinks = useMemo(() => {
    const merged: SocialLinksMap = {};
    const keys = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x', 'telegram', 'website'] as const;
    for (const key of keys) {
      const value = String(contact[key] || initialData.tenant.social_links?.[key] || '').trim();
      if (value) merged[key] = value;
    }
    return socialLinkEntries(merged);
  }, [contact, initialData.tenant.social_links]);

  const track = async (eventType: string, eventData: Record<string, unknown> = {}) => {
    await fetch(`${backendUrl}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        tenant_id: initialData.tenant.id,
        visitor_id: localStorage.getItem('sp_visitor_id') || undefined,
        ref: ref || undefined,
        lang_param: lang,
        lang_device: navigator.language,
        user_agent: navigator.userAgent,
        page_url: window.location.href,
        event_data: {
          smart_bio_profile_id: profile.id,
          smart_bio_slug: profile.slug,
          source: 'smart_bio',
          ...eventData,
        },
      }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (theme.preset !== 'luxury') return;
    if (document.getElementById('smart-bio-luxury-font')) return;
    const link = document.createElement('link');
    link.id = 'smart-bio-luxury-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Josefin+Sans:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }, [theme.preset]);

    useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedLang = params.get('lang');
    // Default siempre ES; solo cambia si el visitante pide ?lang= explícito
    const resolvedLang = requestedLang ? normalizeLang(requestedLang) : 'es';
    setLang(enabledLangs.includes(resolvedLang) ? resolvedLang : 'es');

    const requestedTheme = params.get('theme');
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    setMode(normalizeMode(requestedTheme || storedTheme || themeConfig.modeDefault || themeConfig.mode || 'light'));

    if (!localStorage.getItem('sp_visitor_id')) {
      localStorage.setItem('sp_visitor_id', crypto.randomUUID ? crypto.randomUUID() : `bio-${Date.now()}`);
    }
    void track('bio_view');
  }, []);

  useEffect(() => {
    if (!enabledLangs.includes(lang)) {
      setLang(enabledLangs[0] || 'es');
    }
  }, [enabledLangs, lang]);

  useEffect(() => {
    if (!blocks.ai_chat || !initialData.widget_context?.tenant_id) return;
    const cssId = 'sp-assistant-widget-css';
    const scriptId = 'sp-assistant-widget-script';
    let cancelled = false;

    const initWidget = () => {
      if (cancelled || typeof window.initAssistantWidget !== 'function') return;
      if (document.getElementById('sp-assistant-widget')) return;
      window.initAssistantWidget({
        tokenEndpoint: `${backendUrl}/api/assistant-ia/token`,
        backendApiUrl: backendUrl,
        tenantId: initialData.widget_context?.tenant_id,
        propertyId: null,
        source: 'smart_bio',
        ref: ref || undefined,
        lang,
        bio_profile_id: profile.id,
        seller_ref_code: ref || undefined,
        seller_user_id: initialData.widget_context?.seller_user_id || undefined,
        position: 'bottom-right',
        visualizerType: 'grid',
        orbSize: 96,
        tooltipText: lang === 'en' ? 'Need help?' : lang === 'pt' ? 'Precisa de ajuda?' : '¿Necesitás ayuda?',
        autoDisconnectTimeout: 300000,
      });
      void track('bio_ai_chat_started', { trigger: 'widget_loaded' });
    };

    if (!document.getElementById(cssId)) {
      const css = document.createElement('link');
      css.id = cssId;
      css.rel = 'stylesheet';
      css.href = `${backendUrl}/static/widget/assistant-widget.css?v=${WIDGET_ASSET_VERSION}`;
      document.head.appendChild(css);
    }

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (window.initAssistantWidget) initWidget();
      else existing.addEventListener('load', initWidget, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `${backendUrl}/static/widget/assistant-widget.js?v=${WIDGET_ASSET_VERSION}`;
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [blocks.ai_chat, backendUrl, initialData.widget_context?.tenant_id, initialData.widget_context?.seller_user_id, lang, profile.id, ref]);

  const openCapture = (intent: CaptureIntent) => {
    setActiveTab(intent);
    setForm((value) => ({ ...value, intent }));
    setCaptureOpen(true);
    setFormState('idle');
    setFormError('');
    requestAnimationFrame(() => {
      document.getElementById('smart-bio-contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    void track('bio_card_click', { card: intent });
  };

  const cycleMode = () => {
    const next = nextMode(mode);
    setMode(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set('theme', next);
    window.history.replaceState({}, '', url.toString());
  };

  const upcomingLang = nextLang(lang, enabledLangs);
  const cycleLang = () => {
    if (enabledLangs.length <= 1) return;
    const next = nextLang(lang, enabledLangs);
    setLang(next);
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState({}, '', url.toString());
    void track('bio_card_click', { card: 'lang_cycle', lang: next });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    setFormError('');
    try {
      const res = await fetch(`${backendUrl}/api/smart-bios/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, intent: activeTab || form.intent, slug: profile.slug, lang, page_url: pageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'No se pudo enviar la consulta');
      setFormState('sent');
      setForm({ full_name: '', phone: '', email: '', message: '', intent: activeTab });
    } catch (err) {
      setFormState('error');
      setFormError(err instanceof Error ? err.message : 'No se pudo enviar');
    }
  };

  const glassBtnClass = `bio-glass-btn flex min-h-11 items-center justify-center gap-2 px-3 py-2 text-center text-sm font-semibold ${theme.radiusClass}`;
  const glassIconBtnClass = `bio-glass-btn bio-glass-btn--icon inline-flex h-10 w-10 items-center justify-center text-xs font-semibold uppercase tracking-wide ${theme.radiusClass}`;
  const glassPrimaryBtnClass = `bio-glass-btn bio-glass-btn--primary flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-semibold ${theme.radiusClass}`;
  const inputClass = `h-11 w-full border px-3 text-sm outline-none transition focus:border-[var(--bio-primary)] ${theme.radiusClass} ${theme.borderClass} bg-[var(--bio-bg)] text-[var(--bio-text)]`;
  const primaryButtonStyle: CSSProperties =
    theme.buttonStyle === 'outline'
      ? { borderColor: 'var(--bio-primary)', color: 'var(--bio-primary)', background: 'transparent' }
      : {};

  return (
    <main
      data-bio-mode={mode}
      className={`min-h-screen text-[var(--bio-text)] transition-colors duration-300 ${theme.fontClass}`}
      style={{ ...theme.vars, background: 'var(--bio-bg)' } as CSSProperties}
    >
      <section className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <a
            href={initialData.links?.portfolio || `/p/${initialData.tenant.slug}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`}
            className="flex min-w-0 items-center gap-2.5"
            onClick={() => track('bio_card_click', { card: 'tenant_logo' })}
          >
            {profile.logo_url || initialData.tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo_url || initialData.tenant.logo_url || ''}
                alt={initialData.tenant.name}
                className="h-10 max-w-[7.5rem] object-contain"
              />
            ) : null}
            <span className="min-w-0">
              <span className={`block text-[10px] uppercase tracking-[0.16em] ${theme.mutedTextClass}`}>Inmobiliaria</span>
              <span className="block truncate text-sm font-semibold leading-tight">{initialData.tenant.name}</span>
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            {enabledLangs.length > 1 ? (
              <button
                type="button"
                onClick={cycleLang}
                aria-label={`Cambiar a ${langLabel(upcomingLang, lang)}`}
                title={langLabel(upcomingLang, lang)}
                className={glassIconBtnClass}
              >
                {upcomingLang}
              </button>
            ) : null}
            <button
              type="button"
              onClick={cycleMode}
              aria-label={modeLabel(upcomingMode, lang)}
              title={modeLabel(upcomingMode, lang)}
              className={glassIconBtnClass}
            >
              <ThemeModeIcon mode={upcomingMode} />
            </button>
          </div>
        </div>

        <header className={`p-5 ${theme.cardClass} ${theme.borderClass}`}>
          <div className="flex items-start gap-4">
            <div className={`h-24 w-24 shrink-0 overflow-hidden bg-black/5 ${theme.radiusClass}`}>
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-2xl font-semibold ${theme.mutedTextClass}`}>
                  {(displayName || 'S').slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bio-accent)' }}>
                {displayTitle}
              </p>
              <h1 className={`mt-1 text-2xl font-semibold leading-tight ${theme.preset === 'luxury' ? 'tracking-wide' : ''}`}>
                {displayName}
              </h1>
              {displayBio ? <p className={`mt-2 text-sm leading-relaxed ${theme.mutedTextClass}`}>{displayBio}</p> : null}
            </div>
          </div>
        </header>

        {blocks.quick_actions && (
          <nav className="mt-4 grid grid-cols-2 gap-2">
            {whatsappHref ? (
              <a className={glassBtnClass} href={whatsappHref} onClick={() => track('bio_whatsapp_click', { target: 'whatsapp' })}>
                <WhatsAppIcon />
                {currentText.quick_whatsapp || 'WhatsApp'}
              </a>
            ) : null}
            {contact.phone ? (
              <a className={glassBtnClass} href={`tel:${contact.phone}`}>
                <PhoneIcon />
                {currentText.quick_call || 'Llamar'}
              </a>
            ) : null}
            {contact.email ? (
              <a className={glassBtnClass} href={`mailto:${contact.email}`}>
                <MailIcon />
                {currentText.quick_email || 'Email'}
              </a>
            ) : null}
            {initialData.links?.vcard ? (
              <a className={glassBtnClass} href={initialData.links.vcard} onClick={() => track('bio_vcard_download', { target: 'vcard' })}>
                <ContactIcon />
                {currentText.quick_vcard || 'Guardar contacto'}
              </a>
            ) : null}
          </nav>
        )}

        <div className="mt-4 space-y-3">
          {blocks.seller_capture && (
            <FunnelCard
              title={currentText.seller_capture_title || '¿Pensás en vender?'}
              text={currentText.seller_capture_text || 'Obtené una valuación gratuita de tu propiedad.'}
              cta={currentText.seller_capture_cta || 'Quiero una valuación'}
              theme={theme}
              buttonStyle={primaryButtonStyle}
              active={captureOpen && activeTab === 'seller_capture'}
              onClick={() => openCapture('seller_capture')}
            />
          )}
          {blocks.buyer_capture && (
            <FunnelCard
              title={currentText.buyer_capture_title || '¿Buscás comprar o invertir?'}
              text={currentText.buyer_capture_text || 'Contanos qué estás buscando y te mostramos oportunidades.'}
              cta={currentText.buyer_capture_cta || 'Precalificar búsqueda'}
              theme={theme}
              buttonStyle={primaryButtonStyle}
              active={captureOpen && activeTab === 'buyer_capture'}
              onClick={() => openCapture('buyer_capture')}
            />
          )}
          {blocks.vacation_rental && (
            <FunnelCard
              title={currentText.vacation_rental_title || '¿Buscás alquilar?'}
              text={currentText.vacation_rental_text || 'Vacacional o largo plazo: precalificamos tu búsqueda en minutos.'}
              cta={currentText.vacation_rental_cta || 'Precalificar alquiler'}
              theme={theme}
              buttonStyle={primaryButtonStyle}
              active={captureOpen && activeTab === 'vacation_rental'}
              onClick={() => openCapture('vacation_rental')}
            />
          )}
        </div>

        {captureOpen && captureTabs.length ? (
          <section id="smart-bio-contact" className={`mt-4 p-4 ${theme.cardClass} ${theme.borderClass}`}>
            <div className={`mb-4 flex gap-1 border-b pb-2 ${theme.borderClass}`}>
              {captureTabs.map((tab) => (
                <button
                  key={tab.intent}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.intent);
                    setForm((value) => ({ ...value, intent: tab.intent }));
                  }}
                  className={`min-h-10 flex-1 px-2 text-sm font-semibold transition ${
                    activeTab === tab.intent
                      ? 'border-b-2 border-[var(--bio-primary)] text-[var(--bio-text)]'
                      : theme.mutedTextClass
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'seller_capture' ? (
              <SellerValuationWizard
                backendUrl={backendUrl}
                slug={profile.slug}
                tenantSlug={initialData.tenant.slug}
                lang={lang}
                pageUrl={pageUrl}
                onTrack={(eventType, eventData) => {
                  void track(eventType, eventData);
                }}
              />
            ) : activeTab === 'buyer_capture' ? (
              <BuyerCaptureWizard
                backendUrl={backendUrl}
                slug={profile.slug}
                lang={lang}
                pageUrl={pageUrl}
                onTrack={(eventType, eventData) => {
                  void track(eventType, eventData);
                }}
              />
            ) : activeTab === 'vacation_rental' ? (
              <RentalCaptureWizard
                backendUrl={backendUrl}
                slug={profile.slug}
                lang={lang}
                pageUrl={pageUrl}
                onTrack={(eventType, eventData) => {
                  void track(eventType, eventData);
                }}
              />
            ) : null}
          </section>
        ) : null}

        {blocks.portfolio && initialData.links?.portfolio ? (
          <a
            href={initialData.links.portfolio}
            onClick={() => track('bio_card_click', { card: 'portfolio' })}
            className={`bio-glass-btn bio-glass-btn--primary mt-4 flex items-center justify-between p-4 ${theme.radiusClass}`}
          >
            <span className="text-sm font-semibold">{currentText.portfolio_title || 'Ver portfolio'}</span>
            <span className="text-sm opacity-70">/p/{initialData.tenant.slug}</span>
          </a>
        ) : null}

        {blocks.video && profile.media?.video_url ? (
          <section className={`mt-5 overflow-hidden ${theme.cardClass} ${theme.borderClass}`}>
            <div className="aspect-video w-full">
              <iframe src={profile.media.video_url} title="Video presentación" className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          </section>
        ) : null}

        {blocks.featured_properties && initialData.properties?.length ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">{currentText.properties_title || 'Propiedades destacadas'}</h2>
            <div className="mt-3 grid gap-3">
              {initialData.properties.slice(0, 4).map((property) => {
                const image = firstImage(property.images);
                const operation = labelFromDict(property.operation_type, OPERATION_LABELS[lang]);
                const propertyType = labelFromDict(property.property_type, PROPERTY_TYPE_LABELS[lang]);
                const rooms = property.ambientes ?? property.bedrooms;
                const address = formatAddress(property.address);
                const meta: string[] = [];
                if (propertyType) meta.push(propertyType);
                if (rooms != null) meta.push(`${rooms} amb.`);
                if (property.area_sqm != null) meta.push(`${Number(property.area_sqm)} m²`);
                return (
                  <a
                    key={property.id}
                    href={property.href}
                    className={`grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden transition hover:-translate-y-0.5 ${theme.cardClass} ${theme.borderClass}`}
                    onClick={() => track('bio_card_click', { card: 'property', property_id: property.id })}
                  >
                    <div className="h-28 bg-black/5">{image ? <img src={image} alt={property.name} className="h-full w-full object-cover" /> : null}</div>
                    <div className="min-w-0 p-3">
                      <p className="truncate text-sm font-semibold">{property.name}</p>
                      {operation ? <p className={`mt-1 text-xs font-medium ${theme.mutedTextClass}`}>{operation}</p> : null}
                      {meta.length ? <p className={`mt-1 truncate text-xs ${theme.mutedTextClass}`}>{meta.join(' · ')}</p> : null}
                      {address ? <p className={`mt-1 truncate text-xs ${theme.mutedTextClass}`}>{address}</p> : null}
                      {formatMoney(property.price, property.currency) ? (
                        <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--bio-primary)' }}>
                          {formatMoney(property.price, property.currency)}
                        </p>
                      ) : null}
                    </div>
                  </a>
                );
              })}
            </div>
            {initialData.links?.portfolio ? (
              <a
                href={initialData.links.portfolio}
                onClick={() => track('bio_card_click', { card: 'portfolio_all_properties' })}
                className={`mt-4 ${glassPrimaryBtnClass}`}
              >
                {lang === 'en'
                  ? `View all properties${initialData.properties_total ? ` (${initialData.properties_total})` : ''}`
                  : lang === 'pt'
                    ? `Ver todos os imóveis${initialData.properties_total ? ` (${initialData.properties_total})` : ''}`
                    : `Ver todas las propiedades${initialData.properties_total ? ` (${initialData.properties_total})` : ''}`}
              </a>
            ) : null}
          </section>
        ) : null}

        {blocks.google_reviews && reviews && (reviews.rating || reviews.reviews?.length) ? (
          <section className={`mt-6 p-4 ${theme.cardClass} ${theme.borderClass}`}>
            <h2 className="text-lg font-semibold">{currentText.reviews_title || 'Opiniones de clientes'}</h2>
            {reviews.rating ? (
              <p className={`mt-2 text-sm ${theme.mutedTextClass}`}>
                <span className="font-semibold text-[var(--bio-text)]">{reviews.rating.toFixed(1)}</span> / 5 · {reviews.user_ratings_total || 0} opiniones
              </p>
            ) : null}
            <div className="mt-3 space-y-3">
              {(reviews.reviews || []).slice(0, 3).map((review, index) => (
                <blockquote key={`${review.author_name}-${index}`} className={`p-3 text-sm ${theme.radiusClass}`} style={{ background: 'var(--bio-bg)' }}>
                  <p className={theme.mutedTextClass}>{review.text}</p>
                  <footer className="mt-2 font-semibold">{review.author_name}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}

        {blocks.commercial_cv && (
          <section className={`mt-6 p-4 ${theme.cardClass} ${theme.borderClass}`}>
            <h2 className="text-lg font-semibold">{currentText.cv_title || 'Perfil comercial'}</h2>
            <div className={`mt-3 grid gap-2 text-sm ${theme.mutedTextClass}`}>
              {['zones', 'specialty', 'languages', 'license', 'closed_operations'].map((key) =>
                profile.cv?.[key] ? (
                  <p key={key}>
                    <span className="font-semibold text-[var(--bio-text)]">{key.replace('_', ' ')}:</span> {profile.cv[key]}
                  </p>
                ) : null
              )}
            </div>
          </section>
        )}

        {(blocks.podcast && profile.media?.podcast_url) || initialData.links?.blog || profile.custom_links?.length ? (
          <section className="mt-6 grid gap-2">
            {blocks.podcast && profile.media?.podcast_url ? <LinkPill href={profile.media.podcast_url} label={currentText.podcast_title || 'Podcast'} theme={theme} onClick={() => track('bio_card_click', { card: 'podcast' })} /> : null}
            {initialData.links?.blog ? (
              <LinkPill
                href={initialData.links.blog}
                label={currentText.blogs_title || 'Blog inmobiliario'}
                theme={theme}
                onClick={() => track('bio_card_click', { card: 'blogs' })}
              />
            ) : null}
            {(profile.custom_links || []).map((link, index) =>
              link.url ? <LinkPill key={`${link.url}-${index}`} href={link.url} label={link.label || link.url} theme={theme} onClick={() => track('bio_card_click', { card: 'custom_link', url: link.url })} /> : null
            )}
          </section>
        ) : null}

        {blocks.social_links && socialLinks.length ? (
          <section className="mt-6 flex flex-wrap gap-2">
            {socialLinks.map((item) => (
              <a
                key={item.key}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                title={item.label}
                aria-label={item.label}
                className={`bio-glass-btn bio-glass-btn--icon inline-flex h-11 w-11 items-center justify-center ${theme.radiusClass}`}
                onClick={() => track('bio_card_click', { card: 'social', network: item.key })}
              >
                <SocialNetworkIcon network={item.key} className="h-5 w-5" />
              </a>
            ))}
          </section>
        ) : null}

        <footer className={`mt-6 border-t pt-4 text-center text-xs ${theme.borderClass} ${theme.mutedTextClass}`}>
          <p>{initialData.tenant.name}</p>
          {martilleroName || martilleroReg ? (
            <p className="mt-2 leading-relaxed">
              Martillero / Corredor Público Responsable
              {martilleroName ? `: ${martilleroName}` : ''}
              {martilleroReg ? ` · Reg. ${martilleroReg}` : ''}
            </p>
          ) : null}
          <p className="mt-1">Powered by Showtime Prop</p>
        </footer>
      </section>
    </main>
  );
}

function FunnelCard({
  title,
  text,
  cta,
  onClick,
  theme,
  buttonStyle,
  active,
}: {
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
  theme: ReturnType<typeof resolveBioTheme>;
  buttonStyle: CSSProperties;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 text-left transition hover:border-[var(--bio-primary)] ${theme.cardClass} ${theme.borderClass} ${active ? 'border-[var(--bio-primary)] ring-1 ring-[var(--bio-primary)]' : ''}`}
    >
      <p className="text-base font-semibold">{title}</p>
      <p className={`mt-1 text-sm ${theme.mutedTextClass}`}>{text}</p>
      <span
        className={`bio-glass-btn bio-glass-btn--primary mt-3 inline-flex min-h-10 items-center px-3 py-2 text-sm font-semibold ${theme.radiusClass}`}
        style={theme.buttonStyle === 'outline' ? buttonStyle : undefined}
      >
        {cta}
      </span>
    </button>
  );
}

function LinkPill({
  href,
  label,
  onClick,
  theme,
}: {
  href: string;
  label: string;
  onClick: () => void;
  theme: ReturnType<typeof resolveBioTheme>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      className={`bio-glass-btn flex items-center justify-between px-4 py-3 text-sm font-semibold ${theme.radiusClass}`}
    >
      <span>{label}</span>
      <span className={theme.mutedTextClass}>Abrir</span>
    </a>
  );
}
