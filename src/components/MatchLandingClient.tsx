'use client';

import { useMemo, useState } from 'react';
import MatchMapBlock from './MatchMapBlock';

type TenantMapConfig = {
  enabled: boolean;
  styleUrl?: string | null;
  publicToken: string;
};

type TenantPayload = {
  id: string;
  name: string;
  slug: string;
  realtor_name?: string | null;
  tenant_name?: string | null;
  whatsapp?: string | null;
  logo_url?: string | null;
  profile_photo_url?: string | null;
  map?: TenantMapConfig | null;
};

type MatchProperty = {
  id: string;
  name: string;
  property_type?: string | null;
  operation_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  tour_virtual_url?: string | null;
  images?: unknown[];
  latitude?: number | null;
  longitude?: number | null;
  rank?: number | null;
  is_favorite?: boolean;
};

export type MatchLandingPayload = {
  landing_token: string;
  tenant: TenantPayload;
  profile?: Record<string, unknown>;
  properties: MatchProperty[];
  favorite_property_ids: string[];
  favorites: MatchProperty[];
  expires_at?: string | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agent.showtimeprop.com';

export default function MatchLandingClient({ payload }: { payload: MatchLandingPayload }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
    new Set((payload.favorite_property_ids || []).map((item) => String(item)))
  );
  const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const contactName =
    String(payload.tenant.realtor_name || '').trim() ||
    String(payload.tenant.tenant_name || '').trim() ||
    payload.tenant.name;

  const visibleProperties = (payload.properties || []).slice(0, 10);
  const favoriteCount = favoriteIds.size;

  const propertyById = useMemo(() => {
    const out = new Map<string, MatchProperty>();
    for (const item of payload.properties || []) {
      out.set(String(item.id), item);
    }
    for (const item of payload.favorites || []) {
      out.set(String(item.id), item);
    }
    return out;
  }, [payload.properties, payload.favorites]);

  const favoriteCards = useMemo(() => {
    const ordered = Array.from(favoriteIds.values()).map((id) => propertyById.get(id)).filter(Boolean);
    return ordered as MatchProperty[];
  }, [favoriteIds, propertyById]);

  const whatsappUrl = getWhatsappUrl(payload.tenant.whatsapp, contactName, payload.landing_token);
  const criteria = payload.profile || {};
  const criteriaChips = buildCriteriaChips(criteria);

  const toggleFavorite = async (propertyId: string) => {
    if (!propertyId || savingPropertyId) return;
    setSavingPropertyId(propertyId);
    setError('');
    try {
      const alreadySaved = favoriteIds.has(propertyId);
      const endpoint = `${BACKEND_URL}/api/match/public/landing/${encodeURIComponent(payload.landing_token)}/favorites${
        alreadySaved ? `/${encodeURIComponent(propertyId)}` : ''
      }`;
      const response = await fetch(endpoint, {
        method: alreadySaved ? 'DELETE' : 'POST',
        headers: alreadySaved ? undefined : { 'Content-Type': 'application/json' },
        body: alreadySaved ? undefined : JSON.stringify({ property_id: propertyId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(String((data as { detail?: string }).detail || 'No se pudo actualizar favoritas'));
      }
      const data = (await response.json()) as { favorite_property_ids?: string[] };
      const next = new Set((data.favorite_property_ids || []).map((id) => String(id)));
      setFavoriteIds(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar favoritas');
    } finally {
      setSavingPropertyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_12%,rgba(56,189,248,0.14),transparent_38%),radial-gradient(circle_at_86%_10%,rgba(244,114,182,0.10),transparent_33%),radial-gradient(circle_at_50%_85%,rgba(14,165,233,0.08),transparent_45%)]" />
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
              {payload.tenant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={payload.tenant.logo_url} alt={payload.tenant.name} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-sm font-semibold">{payload.tenant.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Match de propiedades</p>
              <p className="text-sm font-semibold">{payload.tenant.name}</p>
            </div>
          </div>
          <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-zinc-200">
            {visibleProperties.length} sugeridas
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        <section className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-900/95 via-zinc-900/85 to-zinc-950/70 p-6 shadow-[0_20px_65px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
          <div className="relative z-10 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Búsqueda asistida</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Encontramos opciones para vos
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                Seleccioná tus favoritas para priorizar las propiedades que más te interesan.
              </p>
              {criteriaChips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {criteriaChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-200"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
                {payload.tenant.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={payload.tenant.profile_photo_url} alt={contactName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold">{contactName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">Asesor: {contactName}</p>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex rounded-full border border-cyan-300/35 bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
                  >
                    Hablar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {favoriteCards.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-[0_12px_35px_rgba(0,0,0,0.28)] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-100">Tus guardadas ({favoriteCards.length})</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {favoriteCards.map((item) => (
                <PropertyCard
                  key={`saved-${item.id}`}
                  item={item}
                  saved={favoriteIds.has(String(item.id))}
                  saving={savingPropertyId === String(item.id)}
                  onToggleFavorite={() => toggleFavorite(String(item.id))}
                />
              ))}
            </div>
          </section>
        )}

        <section id="match-grid" className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Opciones sugeridas</h2>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-200">
              {favoriteCount} guardadas
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((item) => (
              <PropertyCard
                key={item.id}
                item={item}
                saved={favoriteIds.has(String(item.id))}
                saving={savingPropertyId === String(item.id)}
                onToggleFavorite={() => toggleFavorite(String(item.id))}
              />
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        {payload.tenant.map?.enabled && payload.tenant.map.publicToken?.startsWith('pk.') && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-[0_12px_35px_rgba(0,0,0,0.28)] sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-100">Mapa de coincidencias</h2>
            <p className="mt-1 text-sm text-zinc-300">Hasta 10 propiedades sugeridas según tus preferencias.</p>
            <div className="mt-4">
              <MatchMapBlock
                accessToken={payload.tenant.map.publicToken}
                styleUrl={payload.tenant.map.styleUrl}
                properties={visibleProperties}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PropertyCard({
  item,
  saved,
  saving,
  onToggleFavorite,
}: {
  item: MatchProperty;
  saved: boolean;
  saving: boolean;
  onToggleFavorite: () => void;
}) {
  const imageUrl = getImageUrl(item.images?.[0]) || '';
  const priceLabel = formatPrice(item);

  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 shadow-[0_12px_35px_rgba(0,0,0,0.28)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-950">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">Sin imagen</div>
        )}
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={saving}
          className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${
            saved
              ? 'border-rose-300/45 bg-rose-500/30 text-rose-100'
              : 'border-white/20 bg-black/45 text-zinc-100'
          }`}
        >
          {saving ? 'Guardando...' : saved ? 'Guardada' : 'Guardar'}
        </button>
        {item.rank != null && (
          <span className="absolute left-3 top-3 rounded-full border border-cyan-300/45 bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
            Opción #{item.rank}
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-zinc-100">{item.name}</h3>

        <div className="flex flex-wrap gap-2">
          {item.property_type && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
              {item.property_type}
            </span>
          )}
          {item.operation_type && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
              {item.operation_type}
            </span>
          )}
          {item.bedrooms != null && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
              {item.bedrooms} dorm
            </span>
          )}
          {item.bathrooms != null && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-200">
              {item.bathrooms} baños
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-base font-semibold text-zinc-100">{priceLabel}</p>
          {item.tour_virtual_url ? (
            <a
              href={item.tour_virtual_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 hover:text-cyan-100"
            >
              Ver tour
            </a>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Sin tour</span>
          )}
        </div>
      </div>
    </article>
  );
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

function formatPrice(item: MatchProperty): string {
  if (item.price_on_request) return 'Consultar precio';
  const currency = item.currency || 'USD';
  const hasRange =
    typeof item.price_min === 'number' &&
    typeof item.price_max === 'number' &&
    item.price_min !== item.price_max;
  if (hasRange) {
    return `${currency} ${Math.round(item.price_min || 0).toLocaleString('es-AR')} - ${currency} ${Math.round(
      item.price_max || 0
    ).toLocaleString('es-AR')}`;
  }
  const value = item.price_min ?? item.price_max ?? item.price;
  if (typeof value === 'number') {
    return `${currency} ${Math.round(value).toLocaleString('es-AR')}`;
  }
  return 'Precio a consultar';
}

function getWhatsappUrl(phone?: string | null, contactName?: string, landingToken?: string): string | null {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const text = encodeURIComponent(
    `Hola ${contactName || ''}, vi el match de propiedades (${landingToken || ''}) y me gustaría avanzar.`
  );
  return `https://wa.me/${digits}?text=${text}`;
}

function buildCriteriaChips(profile: Record<string, unknown>): string[] {
  const chips: string[] = [];
  const locations = Array.isArray(profile.locations) ? profile.locations : [];
  if (locations.length) chips.push(`Zonas: ${locations.slice(0, 2).join(', ')}`);
  if (profile.property_type) chips.push(`Tipo: ${String(profile.property_type)}`);
  if (profile.price_min || profile.price_max) {
    const min = typeof profile.price_min === 'number' ? profile.price_min.toLocaleString('es-AR') : null;
    const max = typeof profile.price_max === 'number' ? profile.price_max.toLocaleString('es-AR') : null;
    if (min || max) chips.push(`Precio: ${min || '-'} a ${max || '-'}`);
  }
  if (profile.bedrooms_min) chips.push(`Dormitorios: ${String(profile.bedrooms_min)}+`);
  return chips.slice(0, 4);
}

