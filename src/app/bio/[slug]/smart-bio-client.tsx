'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

declare global {
  interface Window {
    initAssistantWidget?: (options: Record<string, unknown>) => void;
  }
}

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
  };
  seller?: {
    user_id?: string | null;
    full_name?: string | null;
  };
  contact?: Record<string, any>;
  links?: {
    portfolio?: string | null;
    vcard?: string | null;
  };
  properties?: Array<{
    id: string;
    name: string;
    href: string;
    price?: number | null;
    currency?: string | null;
    images?: unknown[];
    property_type?: string | null;
    operation_type?: string | null;
  }>;
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
const WIDGET_ASSET_VERSION = '20260708-smart-bio';

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

function formatMoney(price?: number | null, currency?: string | null) {
  if (price == null) return null;
  return `${currency || 'USD'} ${Number(price).toLocaleString('es-AR')}`;
}

function buildWhatsappLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
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
  const [lang, setLang] = useState<'es' | 'en' | 'pt'>('es');
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', message: '', intent: 'general' });
  const [formState, setFormState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [formError, setFormError] = useState('');

  const profile = initialData.profile;
  const blocks = profile.enabled_blocks || {};
  const contact = { ...(initialData.contact || {}), ...(profile.contact_overrides || {}) };
  const langConfig = profile.language_config || {};
  const currentText = { ...(langConfig.es || {}), ...(langConfig[lang] || {}) };
  const ref = profile.ref_code || initialData.widget_context?.seller_ref_code || '';
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappText = `Hola, vi tu Smart Bio y quiero consultar. ref=${ref || '-'} source=smart_bio`;
  const whatsappHref = buildWhatsappLink(String(contact.whatsapp || contact.phone || ''), whatsappText);

  const socialLinks = useMemo(() => {
    const keys = ['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'website'];
    return keys
      .map((key) => ({ key, url: String(contact[key] || initialData.tenant.social_links?.[key] || '').trim() }))
      .filter((item) => item.url);
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
    const browserLang = normalizeLang(navigator.language);
    const requestedLang = new URLSearchParams(window.location.search).get('lang');
    setLang(requestedLang ? normalizeLang(requestedLang) : browserLang);
    if (!localStorage.getItem('sp_visitor_id')) {
      localStorage.setItem('sp_visitor_id', crypto.randomUUID ? crypto.randomUUID() : `bio-${Date.now()}`);
    }
    void track('bio_view');
  }, []);

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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormState('sending');
    setFormError('');
    try {
      const res = await fetch(`${backendUrl}/api/smart-bios/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, slug: profile.slug, lang, page_url: pageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'No se pudo enviar la consulta');
      setFormState('sent');
      setForm({ full_name: '', phone: '', email: '', message: '', intent: 'general' });
    } catch (err) {
      setFormState('error');
      setFormError(err instanceof Error ? err.message : 'No se pudo enviar');
    }
  };

  const quickActionClass =
    'flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-emerald-500 hover:text-emerald-700';

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <section className="mx-auto flex w-full max-w-2xl flex-col px-4 pb-24 pt-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          {profile.logo_url || initialData.tenant.logo_url ? (
            <img src={profile.logo_url || initialData.tenant.logo_url || ''} alt={initialData.tenant.name} className="h-10 max-w-36 object-contain" />
          ) : (
            <span className="text-sm font-semibold">{initialData.tenant.name}</span>
          )}
          <div className="flex rounded-lg border border-zinc-200 bg-white p-1">
            {LANGS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLang(item)}
                className={`h-8 rounded-md px-3 text-xs font-semibold uppercase ${lang === item ? 'bg-zinc-950 text-white' : 'text-zinc-500'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <header className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt={profile.display_name || ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-zinc-500">
                  {(profile.display_name || initialData.tenant.name || 'S').slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{profile.title || initialData.tenant.name}</p>
              <h1 className="mt-1 text-2xl font-semibold leading-tight">{profile.display_name || initialData.tenant.name}</h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{profile.bio}</p>
            </div>
          </div>
        </header>

        {blocks.quick_actions && (
          <nav className="mt-4 grid grid-cols-2 gap-2">
            {whatsappHref ? (
              <a className={quickActionClass} href={whatsappHref} onClick={() => track('bio_whatsapp_click', { target: 'whatsapp' })}>
                {currentText.quick_whatsapp || 'WhatsApp'}
              </a>
            ) : null}
            {contact.phone ? <a className={quickActionClass} href={`tel:${contact.phone}`}>{currentText.quick_call || 'Llamar'}</a> : null}
            {contact.email ? <a className={quickActionClass} href={`mailto:${contact.email}`}>{currentText.quick_email || 'Email'}</a> : null}
            {initialData.links?.vcard ? (
              <a className={quickActionClass} href={initialData.links.vcard} onClick={() => track('bio_vcard_download', { target: 'vcard' })}>
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
              onClick={() => {
                setForm((value) => ({ ...value, intent: 'seller_capture' }));
                document.getElementById('smart-bio-contact')?.scrollIntoView({ behavior: 'smooth' });
                void track('bio_card_click', { card: 'seller_capture' });
              }}
            />
          )}
          {blocks.buyer_capture && (
            <FunnelCard
              title={currentText.buyer_capture_title || '¿Buscás comprar o invertir?'}
              text={currentText.buyer_capture_text || 'Contanos qué estás buscando y te mostramos oportunidades.'}
              cta={currentText.buyer_capture_cta || 'Precalificar búsqueda'}
              onClick={() => {
                setForm((value) => ({ ...value, intent: 'buyer_capture' }));
                document.getElementById('smart-bio-contact')?.scrollIntoView({ behavior: 'smooth' });
                void track('bio_card_click', { card: 'buyer_capture' });
              }}
            />
          )}
          {blocks.vacation_rental && (
            <FunnelCard
              title={currentText.vacation_rental_title || '¿Buscás alquiler vacacional?'}
              text={currentText.vacation_rental_text || 'Compartinos fechas, zona y cantidad de huéspedes.'}
              cta={currentText.vacation_rental_cta || 'Consultar disponibilidad'}
              onClick={() => {
                setForm((value) => ({ ...value, intent: 'vacation_rental' }));
                document.getElementById('smart-bio-contact')?.scrollIntoView({ behavior: 'smooth' });
                void track('bio_card_click', { card: 'vacation_rental' });
              }}
            />
          )}
        </div>

        {blocks.portfolio && initialData.links?.portfolio ? (
          <a
            href={initialData.links.portfolio}
            onClick={() => track('bio_card_click', { card: 'portfolio' })}
            className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-950 p-4 text-white shadow-sm"
          >
            <span className="text-sm font-semibold">{currentText.portfolio_title || 'Ver portfolio'}</span>
            <span className="text-sm text-zinc-300">/p/{initialData.tenant.slug}</span>
          </a>
        ) : null}

        {blocks.video && profile.media?.video_url ? (
          <section className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
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
                return (
                  <a key={property.id} href={property.href} className="grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm" onClick={() => track('bio_card_click', { card: 'property', property_id: property.id })}>
                    <div className="h-28 bg-zinc-100">{image ? <img src={image} alt={property.name} className="h-full w-full object-cover" /> : null}</div>
                    <div className="min-w-0 p-3">
                      <p className="truncate text-sm font-semibold">{property.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">{property.operation_type || property.property_type || 'Propiedad'}</p>
                      {formatMoney(property.price, property.currency) ? <p className="mt-2 text-sm font-semibold text-emerald-700">{formatMoney(property.price, property.currency)}</p> : null}
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {blocks.google_reviews && reviews && (reviews.rating || reviews.reviews?.length) ? (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{currentText.reviews_title || 'Opiniones de clientes'}</h2>
            {reviews.rating ? (
              <p className="mt-2 text-sm text-zinc-600">
                <span className="font-semibold text-zinc-950">{reviews.rating.toFixed(1)}</span> / 5 · {reviews.user_ratings_total || 0} opiniones
              </p>
            ) : null}
            <div className="mt-3 space-y-3">
              {(reviews.reviews || []).slice(0, 3).map((review, index) => (
                <blockquote key={`${review.author_name}-${index}`} className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
                  <p>{review.text}</p>
                  <footer className="mt-2 font-semibold text-zinc-900">{review.author_name}</footer>
                </blockquote>
              ))}
            </div>
          </section>
        ) : null}

        {blocks.commercial_cv && (
          <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{currentText.cv_title || 'Perfil comercial'}</h2>
            <div className="mt-3 grid gap-2 text-sm text-zinc-700">
              {['zones', 'specialty', 'languages', 'license', 'closed_operations'].map((key) => (
                profile.cv?.[key] ? <p key={key}><span className="font-semibold text-zinc-950">{key.replace('_', ' ')}:</span> {profile.cv[key]}</p> : null
              ))}
            </div>
          </section>
        )}

        {(blocks.podcast && profile.media?.podcast_url) || (blocks.blogs && profile.media?.blog_url) || profile.custom_links?.length ? (
          <section className="mt-6 grid gap-2">
            {blocks.podcast && profile.media?.podcast_url ? <LinkPill href={profile.media.podcast_url} label={currentText.podcast_title || 'Podcast'} onClick={() => track('bio_card_click', { card: 'podcast' })} /> : null}
            {blocks.blogs && profile.media?.blog_url ? <LinkPill href={profile.media.blog_url} label={currentText.blogs_title || 'Blogs inmobiliarios'} onClick={() => track('bio_card_click', { card: 'blogs' })} /> : null}
            {(profile.custom_links || []).map((link, index) => (
              link.url ? <LinkPill key={`${link.url}-${index}`} href={link.url} label={link.label || link.url} onClick={() => track('bio_card_click', { card: 'custom_link', url: link.url })} /> : null
            ))}
          </section>
        ) : null}

        {blocks.social_links && socialLinks.length ? (
          <section className="mt-6 flex flex-wrap gap-2">
            {socialLinks.map((item) => (
              <a key={item.key} href={item.url} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold capitalize text-zinc-800" onClick={() => track('bio_card_click', { card: 'social', network: item.key })}>
                {item.key}
              </a>
            ))}
          </section>
        ) : null}

        <section id="smart-bio-contact" className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{currentText.form_submit || 'Enviar consulta'}</h2>
          <form onSubmit={submit} className="mt-3 space-y-3">
            <input required value={form.full_name} onChange={(e) => setForm((v) => ({ ...v, full_name: e.target.value }))} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm" placeholder={currentText.form_name || 'Nombre'} />
            <input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm" placeholder={currentText.form_phone || 'WhatsApp'} />
            <input value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm" placeholder={currentText.form_email || 'Email'} />
            <textarea value={form.message} onChange={(e) => setForm((v) => ({ ...v, message: e.target.value }))} className="min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" placeholder={currentText.form_message || 'Mensaje'} />
            <button disabled={formState === 'sending'} className="h-11 w-full rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
              {formState === 'sending' ? 'Enviando...' : currentText.form_submit || 'Enviar consulta'}
            </button>
            {formState === 'sent' ? <p className="text-sm font-medium text-emerald-700">Consulta enviada. Te contactamos a la brevedad.</p> : null}
            {formState === 'error' ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}
          </form>
        </section>

        <footer className="mt-6 border-t border-zinc-200 pt-4 text-center text-xs text-zinc-500">
          <p>{initialData.tenant.name}</p>
          <p className="mt-1">Powered by Showtime Prop</p>
        </footer>
      </section>
    </main>
  );
}

function FunnelCard({ title, text, cta, onClick }: { title: string; text: string; cta: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-500">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-zinc-600">{text}</p>
      <span className="mt-3 inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">{cta}</span>
    </button>
  );
}

function LinkPill({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={onClick} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm">
      <span>{label}</span>
      <span className="text-zinc-400">Abrir</span>
    </a>
  );
}
