'use client';

import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export type PortfolioTheme = 'dark' | 'soft' | 'light';

type PropertyLike = {
  id: string;
  name: string;
  slug?: string | null;
  property_type?: string | null;
  operation_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  ambientes?: number | null;
  area_sqm?: number | null;
  area_sqm_min?: number | null;
  area_sqm_max?: number | null;
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_on_request?: boolean | null;
  currency?: string | null;
  images?: unknown[];
  address?: Record<string, unknown> | null;
  latitude?: number | null;
  longitude?: number | null;
};

function defaultMapStyle(theme: PortfolioTheme): string {
  if (theme === 'light') return 'mapbox://styles/mapbox/light-v11';
  return 'mapbox://styles/mapbox/dark-v11';
}

function buildPropertyHref(
  tenantSlug: string,
  item: { id: string; slug?: string | null },
  referralCode?: string | null,
  campaignQueryString?: string
): string {
  const baseHref = item.slug ? `/p/${tenantSlug}/${item.slug}` : `/p/${tenantSlug}/${item.id}`;
  const fallbackQuery = referralCode ? `ref=${encodeURIComponent(referralCode)}` : '';
  const query = (campaignQueryString || '').trim() || fallbackQuery;
  return query ? `${baseHref}?${query}` : baseHref;
}

export default function PortfolioMapBlock({
  accessToken,
  styleUrl,
  tenantSlug,
  tenantName,
  referralCode,
  campaignQueryString,
  properties,
  theme,
  isLight,
  sectionClass,
  subtleTextClass,
  titleTextClass,
  fillViewport,
}: {
  accessToken: string;
  styleUrl?: string | null;
  tenantSlug: string;
  tenantName: string;
  referralCode?: string | null;
  campaignQueryString?: string;
  properties: PropertyLike[];
  theme: PortfolioTheme;
  isLight: boolean;
  sectionClass: string;
  subtleTextClass: string;
  titleTextClass: string;
  fillViewport?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const points = useMemo(() => {
    const out: (PropertyLike & { lat: number; lng: number })[] = [];
    for (const p of properties) {
      const lat = typeof p.latitude === 'number' ? p.latitude : null;
      const lng = typeof p.longitude === 'number' ? p.longitude : null;
      if (lat == null || lng == null) continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      out.push({ ...p, lat, lng });
    }
    return out;
  }, [properties]);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    mapboxgl.accessToken = accessToken;
    const style = (styleUrl && String(styleUrl).trim()) || defaultMapStyle(theme);

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style,
      center: [points[0].lng, points[0].lat],
      zoom: points.length === 1 ? 13 : 11,
      attributionControl: true,
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');

    const bounds = new mapboxgl.LngLatBounds();
    for (const p of points) {
      bounds.extend([p.lng, p.lat]);
    }

    for (const p of points) {
      const href = buildPropertyHref(tenantSlug, p, referralCode, campaignQueryString);
      const wrap = document.createElement('div');
      wrap.className = 'portfolio-map-marker-wrap';
      for (const cls of [
        'portfolio-map-sonar-ring',
        'portfolio-map-sonar-ring portfolio-map-sonar-ring--delay-1',
        'portfolio-map-sonar-ring portfolio-map-sonar-ring--delay-2',
      ]) {
        const ring = document.createElement('div');
        ring.className = cls;
        wrap.appendChild(ring);
      }
      const dot = document.createElement('div');
      dot.className = 'portfolio-map-marker-dot';
      wrap.appendChild(dot);

      const popup = new mapboxgl.Popup({ offset: 22, maxWidth: '360px' }).setHTML(
        buildPopupHtml({ property: p, href, tenantName })
      );
      new mapboxgl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map);
    }

    if (points.length > 1) {
      map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
    }

    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);
    const t = window.setTimeout(() => map.resize(), 200);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
      map.remove();
    };
  }, [accessToken, styleUrl, theme, tenantSlug, tenantName, referralCode, campaignQueryString, points]);

  const emptyHintClass = isLight ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-white/15 bg-white/5 text-zinc-300';

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${fillViewport ? 'lg:flex lg:h-[calc(100vh-2.5rem)] lg:flex-col' : ''} ${sectionClass}`}>
      <div className="mb-4">
        <h2 className={`text-xl font-semibold ${titleTextClass}`}>Mapa del portfolio</h2>
        <p className={`mt-1 text-sm ${subtleTextClass}`}>
          Ubicaciones aproximadas. Tocá un punto para abrir la ficha.
        </p>
      </div>
      {points.length === 0 ? (
        <div className={`rounded-xl border px-4 py-8 text-center text-sm ${emptyHintClass}`}>
          No hay propiedades con coordenadas para mostrar. Agregá latitud y longitud en cada propiedad para verlas
          acá.
        </div>
      ) : (
        <div
          ref={containerRef}
          className={`h-[min(52vh,420px)] w-full min-h-[280px] overflow-hidden rounded-xl border border-white/10 ${fillViewport ? 'lg:flex-1' : ''}`}
        />
      )}
    </section>
  );
}

function getImageUrl(image: unknown): string {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (typeof image === 'object' && image !== null && 'url' in image) {
    const value = (image as { url?: unknown }).url;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

function cloudinaryCard(url: string): string {
  if (!url.includes('cloudinary.com')) return url;
  if (url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/w_720,h_430,c_fill,f_auto,q_auto/');
  }
  return url;
}

function formatPrice(value?: number | null, currency?: string | null): string | null {
  if (value == null) return null;
  return `${currency || 'USD'} ${value.toLocaleString('es-AR')}`;
}

function formatPriceLabel(item: PropertyLike): string {
  if (item.price_on_request) return 'Precio a consultar';
  const rawMin = typeof item.price_min === 'number' ? item.price_min : null;
  const rawMax = typeof item.price_max === 'number' ? item.price_max : null;
  const min = rawMin != null && rawMax != null && rawMin > rawMax ? rawMax : rawMin;
  const max = rawMin != null && rawMax != null && rawMin > rawMax ? rawMin : rawMax;
  if (min != null && max != null && min !== max) {
    return `${formatPrice(min, item.currency)} - ${formatPrice(max, item.currency)}`;
  }
  return formatPrice(min ?? max ?? item.price, item.currency) || 'Precio a consultar';
}

function labelize(raw?: string | null): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  const dictionary: Record<string, string> = {
    apartment: 'Departamento',
    house: 'Casa',
    ph: 'PH',
    local: 'Local',
    land: 'Terreno',
    project: 'Proyecto',
    proyecto: 'Proyecto',
    sale: 'Venta',
    rent: 'Alquiler',
    rent_short_term: 'Alquiler temporal',
    rent_long_term: 'Alquiler largo plazo',
    both: 'Venta y alquiler',
  };
  return dictionary[value.toLowerCase()] || value;
}

function formatArea(item: PropertyLike): string | null {
  if (item.area_sqm_min != null && item.area_sqm_max != null) {
    return `${Math.round(item.area_sqm_min)}-${Math.round(item.area_sqm_max)} m²`;
  }
  if (item.area_sqm_min != null) return `desde ${Math.round(item.area_sqm_min)} m²`;
  if (item.area_sqm_max != null) return `hasta ${Math.round(item.area_sqm_max)} m²`;
  if (item.area_sqm != null) return `${Math.round(item.area_sqm)} m²`;
  return null;
}

function formatAddress(address?: Record<string, unknown> | null): string | null {
  if (!address || typeof address !== 'object') return null;
  const candidates = [
    address.formatted_address,
    address.full_address,
    address.address,
    address.street_address,
    address.street,
    address.line1,
  ];
  for (const value of candidates) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  const street = String(address.street_name || address.calle || '').trim();
  const number = String(address.street_number || address.numero || '').trim();
  const city = String(address.city || address.locality || address.barrio || '').trim();
  return [street && number ? `${street} ${number}` : street || number, city].filter(Boolean).join(', ') || null;
}

function chip(label: string | number | null | undefined): string {
  if (label == null || label === '') return '';
  return `<span class="sp-map-chip">${escapeHtml(String(label))}</span>`;
}

function buildPopupHtml({
  property,
  href,
  tenantName,
}: {
  property: PropertyLike;
  href: string;
  tenantName: string;
}): string {
  const images = (property.images || []).map(getImageUrl).filter(Boolean).slice(0, 6).map(cloudinaryCard);
  const imageHtml = images.length
    ? `<div class="sp-map-gallery">${images
        .map((url, idx) => `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(property.name)} ${idx + 1}" loading="lazy" />`)
        .join('')}</div>`
    : `<div class="sp-map-gallery-empty">Sin imagen</div>`;
  const dots = images.length > 1
    ? `<div class="sp-map-dots">${images.map(() => '<span></span>').join('')}</div>`
    : '';
  const address = formatAddress(property.address);
  const chips = [
    labelize(property.property_type),
    labelize(property.operation_type),
    property.ambientes ? `${property.ambientes} amb` : null,
    property.bedrooms ? `${property.bedrooms} dorm` : null,
    property.bathrooms ? `${property.bathrooms} baños` : null,
    formatArea(property),
  ].map(chip).join('');

  return `
    <div class="sp-map-popup">
      <style>
        .mapboxgl-popup-content{padding:0;border-radius:14px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.22);}
        .sp-map-popup{width:330px;background:#fff;color:#111827;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}
        .sp-map-gallery{height:174px;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;background:#111827;scrollbar-width:none;}
        .sp-map-gallery::-webkit-scrollbar{display:none;}
        .sp-map-gallery img{width:100%;height:174px;flex:0 0 100%;object-fit:cover;scroll-snap-align:start;}
        .sp-map-gallery-empty{height:154px;display:flex;align-items:center;justify-content:center;background:#111827;color:#9ca3af;font-size:13px;}
        .sp-map-dots{height:0;position:relative;top:-20px;display:flex;justify-content:center;gap:5px;}
        .sp-map-dots span{width:7px;height:7px;border-radius:999px;background:rgba(255,255,255,.82);box-shadow:0 1px 3px rgba(0,0,0,.25);}
        .sp-map-body{padding:14px 16px 15px;}
        .sp-map-price{font-size:20px;line-height:1.2;font-weight:750;letter-spacing:0;color:#111827;}
        .sp-map-title{margin-top:5px;font-size:14px;font-weight:700;color:#111827;}
        .sp-map-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;}
        .sp-map-chip{border:1px solid #e5e7eb;background:#f8fafc;border-radius:999px;padding:4px 8px;font-size:12px;color:#374151;}
        .sp-map-address{margin-top:9px;font-size:13px;line-height:1.35;color:#4b5563;}
        .sp-map-tenant{margin-top:7px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;}
        .sp-map-link{display:inline-flex;margin-top:12px;color:#0891b2;font-weight:700;text-decoration:none;font-size:13px;}
        .sp-map-link:hover{text-decoration:underline;}
      </style>
      ${imageHtml}
      ${dots}
      <div class="sp-map-body">
        <div class="sp-map-price">${escapeHtml(formatPriceLabel(property))}</div>
        <div class="sp-map-title">${escapeHtml(property.name)}</div>
        ${chips ? `<div class="sp-map-chips">${chips}</div>` : ''}
        ${address ? `<div class="sp-map-address">${escapeHtml(address)}</div>` : ''}
        <div class="sp-map-tenant">${escapeHtml(tenantName)}</div>
        <a class="sp-map-link" href="${escapeAttribute(href)}">Ver ficha</a>
      </div>
    </div>
  `;
}

function escapeAttribute(raw: string): string {
  return escapeHtml(raw).replace(/'/g, '&#39;');
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
