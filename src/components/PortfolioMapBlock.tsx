'use client';

import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export type PortfolioTheme = 'dark' | 'soft' | 'light';

type PropertyLike = {
  id: string;
  name: string;
  slug?: string | null;
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
  referralCode,
  campaignQueryString,
  properties,
  theme,
  isLight,
  sectionClass,
  subtleTextClass,
  titleTextClass,
}: {
  accessToken: string;
  styleUrl?: string | null;
  tenantSlug: string;
  referralCode?: string | null;
  campaignQueryString?: string;
  properties: PropertyLike[];
  theme: PortfolioTheme;
  isLight: boolean;
  sectionClass: string;
  subtleTextClass: string;
  titleTextClass: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const points = useMemo(() => {
    const out: { id: string; name: string; slug?: string | null; lat: number; lng: number }[] = [];
    for (const p of properties) {
      const lat = typeof p.latitude === 'number' ? p.latitude : null;
      const lng = typeof p.longitude === 'number' ? p.longitude : null;
      if (lat == null || lng == null) continue;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      out.push({ id: p.id, name: p.name, slug: p.slug, lat, lng });
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
      const el = document.createElement('div');
      el.className = 'portfolio-map-marker';
      el.style.cssText =
        'width:12px;height:12px;border-radius:9999px;background:#22d3ee;border:2px solid rgba(15,23,42,0.85);cursor:pointer;box-shadow:0 0 0 2px rgba(34,211,238,0.35);';
      const popup = new mapboxgl.Popup({ offset: 16, maxWidth: '240px' }).setHTML(
        `<div style="padding:4px 2px;font-family:system-ui,sans-serif;font-size:13px;">
          <div style="font-weight:600;margin-bottom:6px;color:#0f172a;">${escapeHtml(p.name)}</div>
          <a href="${href}" style="color:#0891b2;font-weight:600;text-decoration:underline;">Ver ficha</a>
        </div>`
      );
      new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
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
  }, [accessToken, styleUrl, theme, tenantSlug, referralCode, campaignQueryString, points]);

  const emptyHintClass = isLight ? 'border-zinc-200 bg-zinc-50 text-zinc-600' : 'border-white/15 bg-white/5 text-zinc-300';

  return (
    <section className={`rounded-2xl border p-5 sm:p-6 ${sectionClass}`}>
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
          className="h-[min(52vh,420px)] w-full min-h-[280px] overflow-hidden rounded-xl border border-white/10"
        />
      )}
    </section>
  );
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
