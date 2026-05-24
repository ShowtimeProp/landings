'use client';

import { FormEvent, useMemo, useState } from 'react';
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
};

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
  const initialIntent = searchParams.get('intent') === 'landlord' ? 'landlord' : 'seller';
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const accent = /^#[0-9a-fA-F]{6}$/.test(String(config?.accent_color || ''))
    ? String(config?.accent_color)
    : '#22d3ee';

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

  return (
    <main className="min-h-screen bg-[#07090d] text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link href={`/p/${tenantSlug}`} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={tenantName} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-sm font-semibold">{tenantName.charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span>
              <span className="block text-sm font-semibold">{tenantName}</span>
              <span className="block text-xs text-zinc-400">Captacion de propietarios</span>
            </span>
          </Link>
        </header>

        <section className="grid gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setIntent('seller')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  intent === 'seller' ? 'text-zinc-950' : 'text-zinc-300 hover:text-white'
                }`}
                style={intent === 'seller' ? { backgroundColor: accent } : undefined}
              >
                Venta
              </button>
              <button
                type="button"
                onClick={() => setIntent('landlord')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  intent === 'landlord' ? 'text-zinc-950' : 'text-zinc-300 hover:text-white'
                }`}
                style={intent === 'landlord' ? { backgroundColor: accent } : undefined}
              >
                Alquiler
              </button>
            </div>
            <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">{subtitle}</p>
            <div className="mt-6 grid gap-3 text-sm text-zinc-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Valoracion y estrategia comercial.</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Registro del lead sin duplicar si ya existe.</div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Seguimiento dentro del CRM del tenant.</div>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6">
            {done ? (
              <div className="py-8">
                <p className="text-2xl font-semibold">Recibimos tu solicitud.</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  El equipo de {tenantName} ya tiene tus datos para avanzar con la captacion.
                </p>
                <Link
                  href={`/p/${tenantSlug}`}
                  className="mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-zinc-950"
                  style={{ backgroundColor: accent }}
                >
                  Volver al portfolio
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Tipo de propiedad</span>
                    <input className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.property_type} onChange={(e) => update('property_type', e.target.value)} placeholder="Departamento, casa, local" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Zona</span>
                    <input className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Barrio o ciudad" />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-zinc-300">Direccion aproximada</span>
                    <input className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Calle, altura o referencia" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Ambientes</span>
                    <input type="number" min="0" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.ambientes} onChange={(e) => update('ambientes', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Metros cuadrados</span>
                    <input type="number" min="0" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.area_sqm} onChange={(e) => update('area_sqm', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Estado</span>
                    <select className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.condition} onChange={(e) => update('condition', e.target.value)}>
                      <option value="">Seleccionar</option>
                      <option value="excelente">Excelente</option>
                      <option value="muy_bueno">Muy bueno</option>
                      <option value="a_refaccionar">A refaccionar</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Urgencia</span>
                    <select className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.urgency} onChange={(e) => update('urgency', e.target.value)}>
                      <option value="">Seleccionar</option>
                      <option value="ahora">Ahora</option>
                      <option value="30_60_dias">30 a 60 dias</option>
                      <option value="sin_apuro">Sin apuro</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Precio esperado</span>
                    <input type="number" min="0" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.estimated_price} onChange={(e) => update('estimated_price', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Moneda</span>
                    <select className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.price_currency} onChange={(e) => update('price_currency', e.target.value)}>
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-zinc-300">Comentarios</span>
                    <textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.comments} onChange={(e) => update('comments', e.target.value)} placeholder="Detalles importantes, expensas, disponibilidad, preferencias" />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">Nombre completo</span>
                    <input required className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-zinc-300">WhatsApp</span>
                    <input required className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />
                  </label>
                  <label className="space-y-1 text-sm sm:col-span-2">
                    <span className="text-zinc-300">Email opcional</span>
                    <input type="email" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300" value={form.email} onChange={(e) => update('email', e.target.value)} />
                  </label>
                </div>

                {error && <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-5 w-full rounded-full px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: accent }}
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
