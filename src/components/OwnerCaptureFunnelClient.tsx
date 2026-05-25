'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type Intent = 'seller' | 'landlord';

type OwnerCaptureConfig = {
  front_title?: string | null;
  front_text?: string | null;
  front_cta?: string | null;
  back_title?: string | null;
  back_text?: string | null;
  back_cta?: string | null;
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

export default function OwnerCaptureFunnelClient({
  backendUrl,
  tenantSlug,
  tenantName,
  logoUrl,
  config,
}: {
  backendUrl: string;
  tenantSlug: string;
  tenantName: string;
  logoUrl?: string | null;
  config?: OwnerCaptureConfig | null;
}) {
  const searchParams = useSearchParams();
  const themeParam = normalizeThemeMode(searchParams.get('theme'));
  const initialIntent = searchParams.get('intent') === 'landlord' ? 'landlord' : 'seller';
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => themeParam || getStoredThemeMode());
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
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
  const featureClass = isLight
    ? 'border-zinc-200 bg-white text-zinc-700'
    : 'border-white/10 bg-white/5 text-zinc-300';
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
              <span className={`block text-xs ${helperTextClass}`}>Captacion de propietarios</span>
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
            <div className={`mt-6 grid gap-3 text-sm ${subtitleTextClass}`}>
              <div className={`rounded-2xl border p-4 ${featureClass}`}>Valoracion y estrategia comercial.</div>
              <div className={`rounded-2xl border p-4 ${featureClass}`}>Registro del lead sin duplicar si ya existe.</div>
              <div className={`rounded-2xl border p-4 ${featureClass}`}>Seguimiento dentro del CRM del tenant.</div>
            </div>
          </div>

          <form onSubmit={submit} className={`rounded-2xl border p-5 sm:p-6 ${formShellClass}`}>
            {done ? (
              <div className="py-8">
                <p className="text-2xl font-semibold">Recibimos tu solicitud.</p>
                <p className={`mt-3 text-sm leading-relaxed ${subtitleTextClass}`}>
                  El equipo de {tenantName} ya tiene tus datos para avanzar con la captacion.
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
    </main>
  );
}
