'use client';

import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type MatchProperty = {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  rank?: number | null;
};

export default function MatchMapBlock({
  accessToken,
  styleUrl,
  properties,
}: {
  accessToken: string;
  styleUrl?: string | null;
  properties: MatchProperty[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const points = useMemo(() => {
    return (properties || [])
      .map((item) => {
        const lat = typeof item.latitude === 'number' ? item.latitude : null;
        const lng = typeof item.longitude === 'number' ? item.longitude : null;
        if (lat == null || lng == null) return null;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { ...item, lat, lng };
      })
      .filter((item): item is MatchProperty & { lat: number; lng: number } => Boolean(item));
  }, [properties]);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: (styleUrl && String(styleUrl).trim()) || 'mapbox://styles/mapbox/dark-v11',
      center: [points[0].lng, points[0].lat],
      zoom: points.length === 1 ? 13 : 11,
      attributionControl: true,
      cooperativeGestures: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');

    const bounds = new mapboxgl.LngLatBounds();
    for (const point of points) {
      bounds.extend([point.lng, point.lat]);
      const wrap = document.createElement('div');
      wrap.className = 'portfolio-map-marker-wrap';
      const dot = document.createElement('div');
      dot.className = 'portfolio-map-marker-dot';
      dot.innerText = String(point.rank || '');
      wrap.appendChild(dot);

      const popup = new mapboxgl.Popup({ offset: 18, maxWidth: '260px' }).setHTML(
        `<div style="padding:4px 2px;font-family:system-ui,sans-serif;font-size:13px;">
          <div style="font-weight:600;margin-bottom:4px;color:#0f172a;">${escapeHtml(point.name)}</div>
          <div style="font-size:12px;color:#334155;">Opción #${point.rank || '-'}</div>
        </div>`
      );
      new mapboxgl.Marker({ element: wrap, anchor: 'center' })
        .setLngLat([point.lng, point.lat])
        .setPopup(popup)
        .addTo(map);
    }

    if (points.length > 1) {
      map.fitBounds(bounds, { padding: 56, maxZoom: 14, duration: 0 });
    }

    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);
    const timer = window.setTimeout(() => map.resize(), 200);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(timer);
      map.remove();
    };
  }, [accessToken, styleUrl, points]);

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-zinc-300">
        No hay propiedades con coordenadas para mostrar en el mapa.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[min(52vh,420px)] w-full min-h-[280px] overflow-hidden rounded-xl border border-white/10"
    />
  );
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

