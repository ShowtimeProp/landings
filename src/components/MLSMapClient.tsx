'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

type MapPoint = {
  id: string;
  title: string | null;
  zona: string | null;
  property_type: string | null;
  tipo_operacion: string | null;
  price: number | null;
  price_currency: string | null;
  ambientes: number | null;
  bedrooms: number | null;
  area_m2: number | null;
  latitude: number;
  longitude: number;
  image_url: string | null;
};

type SearchResult = MapPoint & { score?: number | null; description?: string | null };

const OPERATIONS = [
  { value: '', label: 'Operación' },
  { value: 'VENTA', label: 'Venta' },
  { value: 'ALQUILER', label: 'Alquiler' },
  { value: 'ALQUILER_TEMPORARIO', label: 'Alq. temporario' },
];

const TYPES = [
  { value: '', label: 'Tipo' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'ph', label: 'PH' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'local', label: 'Local' },
  { value: 'cochera', label: 'Cochera' },
];

function formatPrice(price: number | null, currency: string | null): string {
  if (!price) return 'Consultar';
  const cur = currency === 'USD' ? 'U$S' : '$';
  return `${cur} ${Math.round(price).toLocaleString('es-AR')}`;
}

export default function MLSMapClient({
  backendUrl,
  mapboxToken,
  center,
  zoom,
}: {
  backendUrl: string;
  mapboxToken: string;
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const fetchTimer = useRef<number | null>(null);

  const [operation, setOperation] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const filtersRef = useRef({ operation: '', propertyType: '' });
  filtersRef.current = { operation, propertyType };

  const fetchPoints = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const { operation: op, propertyType: pt } = filtersRef.current;
    const params = new URLSearchParams({
      min_lat: String(b.getSouth()),
      max_lat: String(b.getNorth()),
      min_lng: String(b.getWest()),
      max_lng: String(b.getEast()),
    });
    if (op) params.set('operation', op);
    if (pt) params.set('property_type', pt);
    try {
      const res = await fetch(`${backendUrl}/api/mls/public/map?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { total: number; points: MapPoint[] };
      setTotal(data.total);
      const source = map.getSource('listings') as mapboxgl.GeoJSONSource | undefined;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: data.points.map((p) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
            properties: { ...p },
          })),
        });
      }
    } catch {
      /* red caída: mantener puntos previos */
    }
  }, [backendUrl]);

  const scheduleFetch = useCallback(() => {
    if (fetchTimer.current) window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(fetchPoints, 350);
  }, [fetchPoints]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [center.lng, center.lat],
      zoom,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');

    map.on('load', () => {
      map.addSource('listings', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 46,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'listings',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#38bdf8', 25, '#818cf8', 100, '#f472b6'],
          'circle-radius': ['step', ['get', 'point_count'], 16, 25, 22, 100, 30],
          'circle-opacity': 0.85,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'listings',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#0f172a' },
      });
      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'listings',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#22d3ee',
          'circle-radius': 7,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#0f172a',
        },
      });

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const src = map.getSource('listings') as mapboxgl.GeoJSONSource;
        if (clusterId == null || !src) return;
        src.getClusterExpansionZoom(clusterId, (err, z) => {
          if (err || z == null) return;
          const geom = features[0].geometry;
          if (geom.type === 'Point') {
            map.easeTo({ center: geom.coordinates as [number, number], zoom: z });
          }
        });
      });

      map.on('click', 'unclustered', (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== 'Point') return;
        const p = f.properties as Record<string, string>;
        const coords = f.geometry.coordinates as [number, number];
        popupRef.current?.remove();
        const price = formatPrice(p.price ? Number(p.price) : null, p.price_currency || null);
        const img = p.image_url && p.image_url !== 'null'
          ? `<img src="${p.image_url}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:6px;" alt="" />`
          : '';
        popupRef.current = new mapboxgl.Popup({ offset: 14, maxWidth: '280px' })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:system-ui,sans-serif;font-size:13px;color:#0f172a;">
              ${img}
              <div style="font-weight:700;margin-bottom:2px;">${price}</div>
              <div style="margin-bottom:2px;">${escapeHtml(p.title || 'Propiedad')}</div>
              <div style="font-size:12px;color:#475569;margin-bottom:6px;">${escapeHtml(p.zona || '')}</div>
              <a href="/mapa/listing/${p.id}" style="color:#0284c7;font-weight:600;">Ver ficha completa →</a>
            </div>`
          )
          .addTo(map);
      });

      map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'unclustered', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'unclustered', () => { map.getCanvas().style.cursor = ''; });

      map.on('moveend', scheduleFetch);
      fetchPoints();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scheduleFetch();
  }, [operation, propertyType, scheduleFetch]);

  const runSemanticSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 3) return;
    setSearching(true);
    try {
      const body: Record<string, unknown> = { query: q, max_results: 20 };
      if (operation) body.operation = operation;
      if (propertyType) body.property_type = propertyType;
      const res = await fetch(`${backendUrl}/api/mls/public/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data = (await res.json()) as { results: SearchResult[] };
      setResults(data.results || []);
      const map = mapRef.current;
      if (map && data.results?.length) {
        const bounds = new mapboxgl.LngLatBounds();
        let any = false;
        for (const r of data.results) {
          if (r.latitude && r.longitude) {
            bounds.extend([r.longitude, r.latitude]);
            any = true;
          }
        }
        if (any) map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
      }
    } finally {
      setSearching(false);
    }
  }, [backendUrl, query, operation, propertyType]);

  const flyTo = useCallback((r: SearchResult) => {
    const map = mapRef.current;
    if (!map || !r.latitude || !r.longitude) return;
    map.flyTo({ center: [r.longitude, r.latitude], zoom: 16 });
  }, []);

  const headline = useMemo(() => {
    if (total == null) return 'Cargando propiedades…';
    return `${total.toLocaleString('es-AR')} propiedades en esta zona`;
  }, [total]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Panel superior */}
      <div className="absolute left-0 right-0 top-0 z-10 flex flex-col gap-2 p-3 md:left-4 md:right-auto md:top-4 md:w-[400px] md:p-0">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-3 shadow-xl backdrop-blur">
          <h1 className="mb-0.5 text-base font-bold text-white">
            Propiedades en Mar del Plata
          </h1>
          <p className="mb-2 text-xs text-zinc-400">{headline}</p>

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSemanticSearch()}
              placeholder='Buscá como hablás: "2 ambientes cerca del mar en Güemes"'
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500"
            />
            <button
              onClick={runSemanticSearch}
              disabled={searching || query.trim().length < 3}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-40"
            >
              {searching ? '…' : 'Buscar'}
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-xs text-white outline-none"
            >
              {OPERATIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-xs text-white outline-none"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {results && (
              <button
                onClick={() => { setResults(null); setQuery(''); }}
                className="rounded-lg border border-white/10 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Resultados de búsqueda semántica */}
        {results && (
          <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/90 shadow-xl backdrop-blur">
            {results.length === 0 ? (
              <p className="p-4 text-sm text-zinc-400">Sin resultados para esa búsqueda.</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => flyTo(r)}
                  className="flex w-full gap-3 border-b border-white/5 p-3 text-left transition hover:bg-white/5"
                >
                  {r.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.image_url}
                      alt=""
                      className="h-14 w-20 flex-none rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-20 flex-none rounded-lg bg-zinc-800" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {formatPrice(r.price, r.price_currency)}
                    </div>
                    <div className="truncate text-xs text-zinc-300">{r.title}</div>
                    <div className="text-xs text-zinc-500">{r.zona}</div>
                    <a
                      href={`/mapa/listing/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      Ver ficha →
                    </a>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
