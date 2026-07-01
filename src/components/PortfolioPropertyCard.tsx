'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import LeadPortalAuthClient from '@/components/LeadPortalAuthClient';

const PORTAL_API_BASE = '/api/portal';
const TOKEN_KEY = 'lead_portal_token';
const AUTH_EVENT = 'lead-portal-auth-changed';

type PortfolioTheme = 'dark' | 'soft' | 'light';

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
  expenses_amount?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  total_units?: number | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  tour_virtual_url?: string | null;
  images?: unknown[];
};

function getImageUrl(image: unknown): string | null {
  if (typeof image === 'string') return image;
  if (image && typeof image === 'object' && 'url' in image) {
    return (image as { url?: string }).url ?? null;
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

function FeatureChip({
  label,
  value,
  theme,
}: {
  label: string;
  value: string | number;
  theme: PortfolioTheme;
}) {
  const chipClass =
    theme === 'light'
      ? 'border-zinc-200 bg-zinc-50 text-zinc-700'
      : theme === 'soft'
      ? 'border-white/25 bg-white/10 text-zinc-100'
      : 'border-white/20 bg-white/5 text-white/85';

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${chipClass}`}>
      {label ? `${value} ${label}` : value}
    </span>
  );
}

export default function PortfolioPropertyCard({
  tenantSlug,
  referralCode,
  campaignQueryString,
  item,
  theme,
  isLight,
  cardClass,
  titleTextClass,
  badgeBaseClass,
  propertyType,
  operationType,
}: {
  tenantSlug: string;
  referralCode?: string | null;
  campaignQueryString?: string;
  item: PropertyItem;
  theme: PortfolioTheme;
  isLight: boolean;
  cardClass: string;
  titleTextClass: string;
  badgeBaseClass: string;
  propertyType: string | null;
  operationType: string | null;
}) {
  const baseHref = item.slug ? `/p/${tenantSlug}/${item.slug}` : `/p/${tenantSlug}/${item.id}`;
  const fallbackQuery = referralCode ? `ref=${encodeURIComponent(referralCode)}` : '';
  const query = (campaignQueryString || '').trim() || fallbackQuery;
  const href = query ? `${baseHref}?${query}` : baseHref;
  const favoriteParams = new URLSearchParams({
    tenant_slug: tenantSlug,
    property_id: item.id,
    next: '/perfil-lead/panel',
  });
  if (referralCode) favoriteParams.set('ref', referralCode);
  if (campaignQueryString) {
    const campaignParams = new URLSearchParams(campaignQueryString);
    campaignParams.forEach((value, key) => {
      if (key !== 'theme' && key !== 'property_id') favoriteParams.set(key, value);
    });
  }
  const favoriteQuery = Object.fromEntries(favoriteParams.entries());

  const imageList = useMemo(() => {
    return (item.images || [])
      .map(getImageUrl)
      .filter((url): url is string => Boolean(url))
      .map(cloudinaryCard);
  }, [item.images]);

  const [imageIndex, setImageIndex] = useState(0);
  const [showFavoriteAuth, setShowFavoriteAuth] = useState(false);
  const [hasPortalSession, setHasPortalSession] = useState(false);
  const [favoriteSaved, setFavoriteSaved] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const hasManyImages = imageList.length > 1;
  const tourUrl = (item.tour_virtual_url || '').trim();
  const hasTourPreview = Boolean(tourUrl);

  useEffect(() => {
    const syncSession = () => {
      setHasPortalSession(Boolean(window.localStorage.getItem(TOKEN_KEY)));
    };
    syncSession();
    window.addEventListener(AUTH_EVENT, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(AUTH_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const safeImageIndex = imageList.length ? Math.min(imageIndex, imageList.length - 1) : 0;
  const currentImage = imageList[safeImageIndex] || null;

  const rawPriceMin = typeof item.price_min === 'number' ? item.price_min : null;
  const rawPriceMax = typeof item.price_max === 'number' ? item.price_max : null;
  const priceMin =
    rawPriceMin != null && rawPriceMax != null && rawPriceMin > rawPriceMax ? rawPriceMax : rawPriceMin;
  const priceMax =
    rawPriceMin != null && rawPriceMax != null && rawPriceMin > rawPriceMax ? rawPriceMin : rawPriceMax;
  const price =
    item.price_on_request
      ? 'Consultar precio'
      : priceMin != null && priceMax != null && priceMin !== priceMax
      ? `${formatPrice(priceMin, item.currency)} - ${formatPrice(priceMax, item.currency)}`
      : priceMin != null
      ? formatPrice(priceMin, item.currency)
      : priceMax != null
      ? formatPrice(priceMax, item.currency)
      : formatPrice(item.price, item.currency);
  const areaRangeLabel =
    item.area_sqm_min != null && item.area_sqm_max != null
      ? `${Math.round(item.area_sqm_min)}-${Math.round(item.area_sqm_max)} m²`
      : item.area_sqm_min != null
      ? `desde ${Math.round(item.area_sqm_min)} m²`
      : item.area_sqm_max != null
      ? `hasta ${Math.round(item.area_sqm_max)} m²`
      : null;

  const navButtonClass = isLight
    ? 'border-zinc-200 bg-white/90 text-zinc-700 hover:bg-white'
    : 'border-white/20 bg-black/40 text-zinc-100 hover:bg-black/60';

  const handlePrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasManyImages) return;
    setImageIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasManyImages) return;
    setImageIndex((prev) => (prev + 1) % imageList.length);
  };

  const buildFavoritePayload = () => {
    const campaign: Record<string, string> = {};
    Object.entries(favoriteQuery).forEach(([key, value]) => {
      if (['tenant_slug', 'property_id', 'ref', 'next'].includes(key)) return;
      if (value) campaign[key] = String(value);
    });
    return {
      tenant_slug: tenantSlug,
      property_id: item.id,
      ref: favoriteQuery.ref || null,
      page_url: typeof window !== 'undefined' ? window.location.href : undefined,
      campaign,
    };
  };

  const saveFavorite = async () => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setShowFavoriteAuth(true);
      return;
    }
    setSavingFavorite(true);
    try {
      const response = await fetch(`${PORTAL_API_BASE}/landing/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildFavoritePayload()),
      });
      if (response.status === 401 || response.status === 403) {
        window.localStorage.removeItem(TOKEN_KEY);
        window.dispatchEvent(new Event(AUTH_EVENT));
        setShowFavoriteAuth(true);
        return;
      }
      if (!response.ok) throw new Error('No pudimos guardar el favorito.');
      setFavoriteSaved(true);
    } catch {
      setShowFavoriteAuth(true);
    } finally {
      setSavingFavorite(false);
    }
  };

  return (
    <article
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1.5 ${cardClass}`}
    >
      <Link href={href} aria-label={`Ver detalle de ${item.name}`} className="absolute inset-0 z-10" />
      <div className={`relative aspect-[16/10] overflow-hidden ${isLight ? 'bg-zinc-200' : 'bg-zinc-950'}`}>
        {hasTourPreview ? (
          <>
            <iframe
              src={tourUrl}
              title={`Tour virtual - ${item.name}`}
              className="pointer-events-none h-full w-full scale-[1.01] border-0"
              allow="fullscreen; autoplay; clipboard-write; gyroscope; accelerometer"
              loading="lazy"
              tabIndex={-1}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/10" />
          </>
        ) : currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentImage}
            alt={item.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center text-sm ${isLight ? 'text-zinc-600' : 'text-zinc-500'}`}>
            Sin imagen
          </div>
        )}

        {!hasTourPreview && hasManyImages && (
          <>
            <button
              type="button"
              aria-label="Imagen anterior"
              onClick={handlePrev}
              className={`absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border p-2 backdrop-blur-sm transition ${navButtonClass}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M12.79 4.23a.75.75 0 0 1 0 1.06L8.06 10l4.73 4.71a.75.75 0 1 1-1.06 1.06l-5.25-5.24a.75.75 0 0 1 0-1.06l5.25-5.24a.75.75 0 0 1 1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Imagen siguiente"
              onClick={handleNext}
              className={`absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border p-2 backdrop-blur-sm transition ${navButtonClass}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M7.21 15.77a.75.75 0 0 1 0-1.06L11.94 10 7.21 5.29a.75.75 0 0 1 1.06-1.06l5.25 5.24a.75.75 0 0 1 0 1.06l-5.25 5.24a.75.75 0 0 1-1.06 0Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
              {imageList.map((_, idx) => (
                <span
                  key={`${item.id}-dot-${idx}`}
                  className={`h-1.5 rounded-full transition ${
                    idx === safeImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {!hasTourPreview && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />}
        {hasTourPreview && (
          <span className="absolute left-3 top-3 rounded-full border border-cyan-300/45 bg-cyan-400/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
            Tour 360
          </span>
        )}
        <button
          type="button"
          aria-label="Guardar favorito"
          aria-pressed={favoriteSaved}
          disabled={savingFavorite}
          className={`absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full drop-shadow-[0_2px_7px_rgba(0,0,0,0.55)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 ${
            favoriteSaved ? 'text-red-500' : 'text-white hover:text-red-600'
          }`}
          onClick={(event) => {
            event.stopPropagation();
            if (hasPortalSession) {
              void saveFavorite();
            } else {
              setShowFavoriteAuth(true);
            }
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8" fill={favoriteSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        </button>
      </div>

      {showFavoriteAuth && (
        <LeadPortalAuthClient
          mode="login"
          initialQuery={favoriteQuery}
          presentation="modal"
          theme={isLight ? 'light' : 'dark'}
          onClose={() => setShowFavoriteAuth(false)}
          onAuthenticated={(payload) => {
            if (payload.favorite) setFavoriteSaved(true);
            setShowFavoriteAuth(false);
          }}
        />
      )}

      <div className="relative space-y-3 p-4">
        <h2 className={`line-clamp-2 text-lg font-semibold leading-snug ${titleTextClass}`}>{item.name}</h2>

        <div className="flex flex-wrap gap-2">
          {propertyType && (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] ${badgeBaseClass}`}>
              {propertyType}
            </span>
          )}
          {operationType && (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] ${badgeBaseClass}`}>
              {operationType}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {item.ambientes != null && <FeatureChip label="amb" value={item.ambientes} theme={theme} />}
          {item.bedrooms != null && <FeatureChip label="dorm" value={item.bedrooms} theme={theme} />}
          {item.bathrooms != null && <FeatureChip label="baños" value={item.bathrooms} theme={theme} />}
          {areaRangeLabel ? (
            <FeatureChip label="" value={areaRangeLabel} theme={theme} />
          ) : item.area_sqm != null ? (
            <FeatureChip label="m²" value={Math.round(item.area_sqm)} theme={theme} />
          ) : null}
          {item.total_units != null && item.total_units > 0 && (
            <FeatureChip label="unid" value={item.total_units} theme={theme} />
          )}
          {item.expenses_amount != null && (
            <FeatureChip label="exp." value={`${item.currency || 'USD'} ${item.expenses_amount.toLocaleString('es-AR')}`} theme={theme} />
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className={`text-base font-semibold ${titleTextClass}`}>{price || 'Precio a consultar'}</p>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition group-hover:text-cyan-100">
            Ver detalle
          </span>
        </div>
      </div>
    </article>
  );
}
